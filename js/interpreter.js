const interpreter = (() => {
  const environment = { variables: {}, functions: {} };
  const NIL = { type: Types.NIL, value: null };
  const isNil = (value) => {
    return value && value.type === Types.NIL;
  };
  const getShape = (vector) => {
    if (!Array.isArray(vector)) return [];
    const shape = [vector.length];
    let firstNonNil = null;
    for (let i = 0; i < vector.length; i++) {
      if (!isNil(vector[i])) {
        firstNonNil = vector[i];
        break;
      }
    }
    if (firstNonNil && Array.isArray(firstNonNil)) {
      const innerShape = getShape(firstNonNil);
      shape.push(...innerShape);
    }
    return shape;
  };
  const flatten = (vector) => {
    if (!Array.isArray(vector)) return [vector];
    return vector.reduce((flat, item) => {
      if (isNil(item)) {
        return flat.concat(item);
      } else if (Array.isArray(item)) {
        return flat.concat(flatten(item));
      } else {
        return flat.concat(item);
      }
    }, []);
  };
  const evaluate = (ast, env = environment, localEnv = {}) => {
    if (!ast) return null;
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }
    if (ast.type === Types.NIL) {
      return NIL;
    }
    if (ast.type === 'operator') {
      return ast.value;
    }
    if (ast.type === Types.VECTOR) {
      return ast.elements.map(elem => evaluate(elem, env, localEnv));
    }
    if (ast.type === 'variable') {
      if (ast.name === 'NIL') {
        return NIL;
      }
      if (ast.name in localEnv) {
        return localEnv[ast.name];
      }
      if (!(ast.name in env.variables)) {
        throw new Error(`Undefined variable: ${ast.name}`);
      }
      return env.variables[ast.name];
    }
    if (ast.type === 'assignment') {
      const value = evaluate(ast.value, env, localEnv);
      env.variables[ast.variable] = value;
      return value;
    }
    if (ast.type === 'function_definition') {
      env.functions[ast.name] = {
        params: ast.params,
        body: ast.body
      };
      return `Function ${ast.name} defined`;
    }
    if (ast.type === 'function_call') {
      if (!(ast.name in env.functions)) {
        throw new Error(`Undefined function: ${ast.name}`);
      }
      const func = env.functions[ast.name];
      if (ast.args.length !== func.params.length) {
        throw new Error(`Function ${ast.name} expects ${func.params.length} arguments, but got ${ast.args.length}`);
      }
      const newLocalEnv = {};
      for (let i = 0; i < func.params.length; i++) {
        newLocalEnv[func.params[i]] = evaluate(ast.args[i], env, localEnv);
      }
      return evaluate(func.body, env, newLocalEnv);
    }
    if (ast.type === 'builtin_call') {
      const args = ast.args.map(arg => evaluate(arg, env, localEnv));
      switch (ast.name) {
        case '@': {
          const [vector, index] = args;
          if (!Array.isArray(vector)) {
            throw new Error('@ expects a vector as first argument');
          }
          let idx;
          if (Fraction.isValidNumber(index)) {
            idx = Math.floor(index.valueOf());
          } else if (typeof index === 'number') {
            idx = Math.floor(index);
          } else {
            throw new Error('@ expects a numeric index as second argument');
          }
          if (idx < 0) {
            idx = vector.length + idx;
          }
          if (idx < 0 || idx >= vector.length) {
            throw new Error(`Index ${index} out of bounds for vector of length ${vector.length}`);
          }
          return vector[idx];
        }
        case 'LEN': {
          const [vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('LEN expects a vector as argument');
          }
          return Fraction(vector.length, 1);
        }
        case 'TAKE': {
          const [n, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('TAKE expects a vector as second argument');
          }
          const count = Fraction.isValidNumber(n) ? n.valueOf() : n;
          if (count < 0) {
            return vector.slice(count);
          }
          return vector.slice(0, count);
        }
        case 'DROP': {
          const [n, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('DROP expects a vector as second argument');
          }
          const count = Fraction.isValidNumber(n) ? n.valueOf() : n;
          if (count < 0) {
            return vector.slice(0, count);
          }
          return vector.slice(count);
        }
        case 'FOLD': {
          const [op, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('FOLD expects a vector as second argument');
          }
          let operator;
          if (typeof op === 'string') {
            operator = op;
          } else if (typeof op === 'object' && op.type === 'operator') {
            operator = op.value;
          } else {
            operator = op;
          }
          const nonNilValues = vector.filter(v => !isNil(v));
          if (nonNilValues.length === 0) {
            throw new Error('Cannot fold empty vector or vector with only nil values');
          }
          let result = nonNilValues[0];
          for (let i = 1; i < nonNilValues.length; i++) {
            if (operator === '+') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(nonNilValues[i])) {
                throw new Error('FOLD with + requires numeric vector');
              }
              result = result.add(nonNilValues[i], false);
            } else if (operator === '-') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(nonNilValues[i])) {
                throw new Error('FOLD with - requires numeric vector');
              }
              result = result.subtract(nonNilValues[i], false);
            } else if (operator === '*') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(nonNilValues[i])) {
                throw new Error('FOLD with * requires numeric vector');
              }
              result = result.multiply(nonNilValues[i], false);
            } else if (operator === '/') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(nonNilValues[i])) {
                throw new Error('FOLD with / requires numeric vector');
              }
              if (nonNilValues[i].numerator === 0) throw new Error('Division by zero');
              result = result.divide(nonNilValues[i], false);
            } else {
              throw new Error(`FOLD: Unknown operator ${operator}`);
            }
          }
          return result;
        }
        case 'MAP': {
  const [funcName, vector] = args;
  console.log('MAP called with:', funcName, vector);
  if (!Array.isArray(vector)) {
    throw new Error('MAP expects a vector as second argument');
  }
  console.log('funcName type:', typeof funcName);
  console.log('funcName value:', funcName);
  console.log('Available functions:', Object.keys(env.functions));
  if (typeof funcName === 'string' && funcName in env.functions) {
    const func = env.functions[funcName];
    console.log('Function found:', func);
    const result = vector.map((item, index) => {
      console.log(`Processing item ${index}:`, item);
      if (isNil(item)) {
        console.log('Item is nil, returning NIL');
        return NIL;
      }
      const newLocalEnv = {};
      newLocalEnv[func.params[0]] = item;
      console.log('Local environment:', newLocalEnv);
      const evalResult = evaluate(func.body, env, newLocalEnv);
      console.log('Evaluation result:', evalResult);
      return evalResult;
    });
    console.log('MAP result:', result);
    return result;
  } else {
    throw new Error(`MAP: Undefined function ${funcName}`);
  }
}
        case 'FILTER': {
          const [pred, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('FILTER expects a vector as second argument');
          }
          return vector.filter(item => {
            if (typeof pred === 'string' && pred in env.functions) {
              const callAst = {
                type: 'function_call',
                name: pred,
                args: [{ type: 'value', value: item }]
              };
              const result = evaluate(callAst, env, localEnv);
              return result === true;
            } else {
              throw new Error('FILTER expects a predicate function as first argument');
            }
          });
        }
        case 'DOT': {
          const [v1, v2] = args;
          if (!Array.isArray(v1) || !Array.isArray(v2)) {
            throw new Error('DOT expects two vectors as arguments');
          }
          if (v1.length !== v2.length) {
            throw new Error('DOT product requires vectors of same length');
          }
          let result = Fraction(0, 1);
          for (let i = 0; i < v1.length; i++) {
            if (isNil(v1[i]) || isNil(v2[i])) continue;
            if (!Fraction.isValidNumber(v1[i]) || !Fraction.isValidNumber(v2[i])) {
              throw new Error('DOT product requires numeric vectors');
            }
            result = result.add(v1[i].multiply(v2[i]));
          }
          return result;
        }
        case 'SHAPE': {
          const [vector] = args;
          if (!Array.isArray(vector)) {
            return [];
          }
          return getShape(vector).map(n => Fraction(n, 1));
        }
        case 'RESHAPE': {
          const [shape, vector] = args;
          if (!Array.isArray(shape)) {
            throw new Error('RESHAPE expects a shape vector as first argument');
          }
          const flat = Array.isArray(vector) ? flatten(vector) : [vector];
          const dims = shape.map(d => Fraction.isValidNumber(d) ? d.valueOf() : d);
          if (dims.length === 1) {
            const size = dims[0];
            const result = [];
            for (let i = 0; i < size; i++) {
              result.push(flat[i % flat.length]);
            }
            return result;
          }
          if (dims.length === 2) {
            const [rows, cols] = dims;
            const result = [];
            let idx = 0;
            for (let i = 0; i < rows; i++) {
              const row = [];
              for (let j = 0; j < cols; j++) {
                row.push(flat[idx % flat.length]);
                idx++;
              }
              result.push(row);
            }
            return result;
          }
          throw new Error('RESHAPE currently supports up to 2 dimensions');
        }
        default:
          throw new Error(`Unknown builtin function: ${ast.name}`);
      }
    }
    if (ast.type === 'operation') {
      const left = evaluate(ast.left, env, localEnv);
      const right = evaluate(ast.right, env, localEnv);
      if (isNil(left) || isNil(right)) {
        return NIL;
      }
      if (Array.isArray(left) && Array.isArray(right)) {
        if (['+', '-', '*', '/'].includes(ast.operator)) {
          if (left.length !== right.length) {
            throw new Error(`Vector operation requires vectors of same length`);
          }
          return left.map((l, i) => {
            if (isNil(l) || isNil(right[i])) {
              return NIL;
            }
            const operation = {
              type: 'operation',
              operator: ast.operator,
              left: { type: 'value', value: l },
              right: { type: 'value', value: right[i] }
            };
            return evaluate(operation, env, localEnv);
          });
        }
      }
      if (Fraction.isValidNumber(left) && Array.isArray(right)) {
        if (['*', '/'].includes(ast.operator)) {
          return right.map(r => {
            if (isNil(r)) return NIL;
            const operation = {
              type: 'operation',
              operator: ast.operator,
              left: { type: 'value', value: left },
              right: { type: 'value', value: r }
            };
            return evaluate(operation, env, localEnv);
          });
        }
      }
      if (Array.isArray(left) && Fraction.isValidNumber(right)) {
        if (['*', '/'].includes(ast.operator)) {
          return left.map(l => {
            if (isNil(l)) return NIL;
            const operation = {
              type: 'operation',
              operator: ast.operator,
              left: { type: 'value', value: l },
              right: { type: 'value', value: right }
            };
            return evaluate(operation, env, localEnv);
          });
        }
      }
      if (['+', '-', '*', '/'].includes(ast.operator)) {
        if (!Fraction.isValidNumber(left) || !Fraction.isValidNumber(right)) {
          throw new Error(`Type Error: Operator '${ast.operator}' requires Number type (green) operands`);
        }
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
        const leftType = leftIsNumber ? Types.NUMBER :
                        Array.isArray(left) ? Types.VECTOR : typeof left;
        const rightType = rightIsNumber ? Types.NUMBER :
                         Array.isArray(right) ? Types.VECTOR : typeof right;
        if (leftType !== rightType) {
          throw new Error(`Type Error: Cannot compare values of different types (${leftType} vs ${rightType})`);
        }
        if (leftIsNumber && rightIsNumber) {
          switch (ast.operator) {
            case '>': return left.greaterThan(right);
            case '>=': return left.greaterThanOrEqual(right);
            case '==': return left.equals(right);
          }
        }
        if (leftType === Types.STRING || leftType === Types.BOOLEAN) {
          switch (ast.operator) {
            case '==': return left === right;
            case '>': return left > right;
            case '>=': return left >= right;
          }
        }
      }
      throw new Error(`Unknown operator: ${ast.operator}`);
    }
    if (ast.type === 'value') {
      return ast.value;
    }
    throw new Error(`Unknown AST node type: ${ast.type}`);
  };
  const formatValue = (value) => {
    if (isNil(value)) {
      return "nil";
    } else if (Fraction.isValidNumber(value)) {
      return value.toString();
    } else if (Array.isArray(value)) {
      return '[ ' + value.map(formatValue).join(' ') + ' ]';
    } else if (value === null || value === undefined) {
      return "undefined";
    } else {
      return String(value);
    }
  };
  const executeProgram = (program) => {
    let result;
    program.forEach(expr => {
      result = evaluate(expr);
    });
    return result;
  };
  const resetEnvironment = () => {
    environment.variables = {};
    environment.functions = {};
  };
  return {
    execute: (editor) => {
      try {
        const tokens = tokenize(editor);
        if (tokens.length === 0) return "Empty input";
        tokens.forEach(token => {
          if (['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value)) {
            return;
          }
          if (token.value === 'NIL') {
            return;
          }
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green' && !token.value.includes('/')) {
            if (!tokens.some(t => t.value.includes('/') && t.value.includes(token.value))) {
              if (token.color !== 'green'){
                throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
              }
            }
          }
          if (/^[A-Z@][A-Z0-9_]*$/.test(token.value) &&
              !['@', 'LEN', 'TAKE', 'DROP', 'FOLD', 'MAP', 'FILTER', 'DOT', 'SHAPE', 'RESHAPE'].includes(token.value) &&
              token.color !== 'red') {
            throw new Error(`Type Error: Variable names must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          if (['(', ')'].includes(token.value) && token.color !== 'red') {
            throw new Error(`Type Error: Parentheses must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          if (['[', ']'].includes(token.value) && token.color !== 'purple') {
            throw new Error(`Type Error: Vector brackets must be Vector type (purple), found ${token.color} for '${token.value}'`);
          }
        });
        const ast = parse(tokens);
        const result = executeProgram(ast);
        return formatValue(result);
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
    reset: resetEnvironment,
    getEnvironment: () => ({ ...environment })
  };
})();