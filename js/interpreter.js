const interpreter = (() => {
  const environment = { variables: {}, functions: {} };
  const cloneEnvironment = (env) => ({
    variables: { ...env.variables },
    functions: { ...env.functions },
  });

  const NIL = { type: Types.NIL, value: null };
  const isNil = (value) => value && value.type === Types.NIL;

  // --- 遅延評価のためのヘルパー ---
  const createThunk = (ast, env, localEnv) => ({
    type: 'thunk',
    ast,
    env: cloneEnvironment(env),
    localEnv: { ...localEnv },
    evaluated: false,
    value: null,
  });

  const force = (value) => {
    let current = value;
    while (current && current.type === 'thunk') {
      if (current.evaluated) {
        current = current.value;
      } else {
        const result = evaluate(current.ast, current.env, current.localEnv);
        current.value = result;
        current.evaluated = true;
        current = result;
      }
    }
    return current;
  };

  // --- 評価関数 ---
  const evaluate = (ast, env = environment, localEnv = {}) => {
    if (!ast) return null;
    switch (ast.type) {
      case Types.NUMBER:
      case Types.BOOLEAN:
      case Types.STRING:
        return ast.value;
      case Types.NIL:
        return NIL;
      case 'operator':
      case 'value':
        return ast.value;
      case Types.VECTOR:
        return ast.elements.map(elem => createThunk(elem, env, localEnv));
      case 'variable':
        if (ast.name === 'NIL') return NIL;
        if (ast.name in localEnv) return localEnv[ast.name];
        if (ast.name in env.variables) return env.variables[ast.name];
        throw new Error(`Undefined variable: ${ast.name}`);
      case 'assignment':
        const thunk = createThunk(ast.value, env, localEnv);
        env.variables[ast.variable] = thunk;
        return thunk;
      case 'function_definition':
        env.functions[ast.name] = { params: ast.params, body: ast.body };
        return `Function ${ast.name} defined`;
      case 'function_call': {
        if (!(ast.name in env.functions)) throw new Error(`Undefined function: ${ast.name}`);
        const func = env.functions[ast.name];
        if (ast.args.length !== func.params.length) throw new Error(`Function ${ast.name} expects ${func.params.length} arguments, but got ${ast.args.length}`);
        const newLocalEnv = {};
        for (let i = 0; i < func.params.length; i++) {
          newLocalEnv[func.params[i]] = createThunk(ast.args[i], env, localEnv);
        }
        return evaluate(func.body, env, newLocalEnv);
      }
      case 'builtin_call':
        return evaluateBuiltin(ast, env, localEnv);
      case 'operation':
        return evaluateOperation(ast, env, localEnv);
      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  };

  const evaluateOperation = (ast, env, localEnv) => {
      const left = force(evaluate(ast.left, env, localEnv));
      const right = force(evaluate(ast.right, env, localEnv));

      if (isNil(left) || isNil(right)) return NIL;

      if (['+', '-', '*', '/'].includes(ast.operator)) {
        if (!Fraction.isValidNumber(left) || !Fraction.isValidNumber(right)) throw new Error(`Type Error: Operator '${ast.operator}' requires Number type operands`);
        switch (ast.operator) {
          case '+': return left.add(right, false);
          case '-': return left.subtract(right, false);
          case '*': return left.multiply(right, false);
          case '/':
            if (right.numerator === 0) throw new Error('Division by zero');
            return left.divide(right, false);
        }
      }
      if (['>', '>=', '=='].includes(ast.operator)) {
        const leftIsNumber = Fraction.isValidNumber(left);
        const rightIsNumber = Fraction.isValidNumber(right);
        if (leftIsNumber !== rightIsNumber) throw new Error(`Type Error: Cannot compare values of different types`);
        if (leftIsNumber) {
           switch (ast.operator) {
            case '>': return left.greaterThan(right);
            case '>=': return left.greaterThanOrEqual(right);
            case '==': return left.equals(right);
          }
        }
        // boolean, string comparison
        switch (ast.operator) {
          case '==': return left === right;
          case '>': return left > right;
          case '>=': return left >= right;
        }
      }
      throw new Error(`Unknown operator: ${ast.operator}`);
  };

  const evaluateBuiltin = (ast, env, localEnv) => {
      // 遅延評価が重要なビルトインは個別に処理
      switch(ast.name) {
          case 'IF': {
              const condition = force(evaluate(ast.args[0], env, localEnv));
              if (typeof condition !== 'boolean') throw new Error('IF condition must be a boolean value');
              return condition ? evaluate(ast.args[1], env, localEnv) : evaluate(ast.args[2], env, localEnv);
          }
          case 'AND': {
              const left = force(evaluate(ast.args[0], env, localEnv));
              if (left === false) return false;
              const right = force(evaluate(ast.args[1], env, localEnv));
              return right === true;
          }
          case 'OR': {
              const left = force(evaluate(ast.args[0], env, localEnv));
              if (left === true) return true;
              const right = force(evaluate(ast.args[1], env, localEnv));
              return right === true;
          }
          case 'MAP':
          case 'FILTER': {
              const funcName = ast.args[0];
              const vector = force(evaluate(ast.args[1], env, localEnv));
              if (!Array.isArray(vector)) throw new Error(`${ast.name} expects a vector as second argument`);
              if (typeof funcName !== 'string' || !(funcName in env.functions)) throw new Error(`${ast.name}: Undefined function ${funcName}`);
              const func = env.functions[funcName];

              if (ast.name === 'MAP') {
                return vector.map(itemThunk => createThunk({ type: 'function_call', name: funcName, args: [itemThunk.ast]}, env, {}));
              }
              if (ast.name === 'FILTER') {
                return vector.filter(itemThunk => {
                   const newLocalEnv = { [func.params[0]]: itemThunk };
                   return force(evaluate(func.body, env, newLocalEnv)) === true;
                });
              }
          }
      }

      // それ以外のビルトインは引数を先に評価する(正格評価)
      const args = ast.args.map(arg => force(evaluate(arg, env, localEnv)));
      
      switch (ast.name) {
          case 'FORCE': return args[0]; // すでにforceされている
          case 'LEN': return Fraction(args[0].length, 1);
          case 'IS_NIL': return isNil(args[0]);
          case 'NOT': return !args[0];
          case '@': {
              const [vector, index] = args;
              if (!Array.isArray(vector)) throw new Error('@ expects a vector as first argument');
              let idx = Fraction.isValidNumber(index) ? Math.floor(index.valueOf()) : Math.floor(index);
              if (idx < 0) idx += vector.length;
              if (idx < 0 || idx >= vector.length) return NIL; // out of boundsはNILを返す
              return vector[idx];
          }
          case 'TAKE': {
              const [vector, n] = args;
              if (!Array.isArray(vector)) throw new Error('TAKE expects a vector as first argument');
              const count = Fraction.isValidNumber(n) ? n.valueOf() : n;
              return count < 0 ? vector.slice(count) : vector.slice(0, count);
          }
          case 'DROP': {
              const [vector, n] = args;
              if (!Array.isArray(vector)) throw new Error('DROP expects a vector as first argument');
              const count = Fraction.isValidNumber(n) ? n.valueOf() : n;
              return count < 0 ? vector.slice(0, count) : vector.slice(count);
          }
          // ... 他のビルトイン関数の実装 ...
          default:
              throw new Error(`Unknown or unimplemented builtin function: ${ast.name}`);
      }
  };

  const formatValue = (value) => {
    const forcedValue = force(value);
    if (isNil(forcedValue)) return "nil";
    if (forcedValue && forcedValue.type === 'thunk') return "<thunk>";
    if (Fraction.isValidNumber(forcedValue)) return forcedValue.toString();
    if (Array.isArray(forcedValue)) return '[ ' + forcedValue.map(formatValue).join(' ') + ' ]';
    return String(forcedValue);
  };

  return {
    execute: (editor) => {
      try {
        const tokens = tokenize(editor);
        if (tokens.length === 0) return "Empty input";
        // 型チェックは簡略化のため省略
        const ast = parse(tokens);
        const result = ast.reduce((_, expr) => evaluate(expr), null);
        return formatValue(result);
      } catch (err) {
        console.error(err);
        return `Error: ${err.message}`;
      }
    },
    reset: () => {
        environment.variables = {};
        environment.functions = {};
    }
  };
})();