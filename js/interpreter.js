const interpreter = (() => {
  const environment = { variables: {}, functions: {} };
  
  // ベクトルの形状を取得
  const getShape = (vector) => {
    if (!Array.isArray(vector)) return [];
    const shape = [vector.length];
    if (vector.length > 0 && Array.isArray(vector[0])) {
      const innerShape = getShape(vector[0]);
      shape.push(...innerShape);
    }
    return shape;
  };
  
  // ベクトルをフラット化
  const flatten = (vector) => {
    if (!Array.isArray(vector)) return [vector];
    return vector.reduce((flat, item) => {
      return flat.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
  };
  
  const evaluate = (ast, env = environment, localEnv = {}) => {
    if (!ast) return null;
    
    // リテラル値
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }
    
    // ベクトル
    if (ast.type === Types.VECTOR) {
      return ast.elements.map(elem => evaluate(elem, env, localEnv));
    }
    
    // 変数参照
    if (ast.type === 'variable') {
      if (ast.name in localEnv) {
        return localEnv[ast.name];
      }
      if (!(ast.name in env.variables)) {
        throw new Error(`Undefined variable: ${ast.name}`);
      }
      return env.variables[ast.name];
    }
    
    // 変数代入
    if (ast.type === 'assignment') {
      const value = evaluate(ast.value, env, localEnv);
      env.variables[ast.variable] = value;
      return value;
    }
    
    // 関数定義
    if (ast.type === 'function_definition') {
      env.functions[ast.name] = {
        params: ast.params,
        body: ast.body
      };
      return `Function ${ast.name} defined`;
    }
    
    // ユーザー定義関数呼び出し
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
    
    // 組み込み関数呼び出し
    if (ast.type === 'builtin_call') {
      const args = ast.args.map(arg => evaluate(arg, env, localEnv));
      
      switch (ast.name) {
        case '@': {
          const [vector, index] = args;
          if (!Array.isArray(vector)) {
            throw new Error('@ expects a vector as first argument');
          }
          const idx = Fraction.isValidNumber(index) ? index.valueOf() - 1 : index - 1;
          if (idx < 0 || idx >= vector.length) {
            throw new Error('Index out of bounds');
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
          return vector.slice(0, count);
        }
        
        case 'DROP': {
          const [n, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('DROP expects a vector as second argument');
          }
          const count = Fraction.isValidNumber(n) ? n.valueOf() : n;
          return vector.slice(count);
        }
        
        case 'FOLD': {
          const [op, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('FOLD expects a vector as second argument');
          }
          if (vector.length === 0) {
            throw new Error('Cannot fold empty vector');
          }
          
          // 最初の引数が演算子シンボルの場合
          let result = vector[0];
          for (let i = 1; i < vector.length; i++) {
            // 演算を直接評価
            if (op === '+') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(vector[i])) {
                throw new Error('FOLD with + requires numeric vector');
              }
              result = result.add(vector[i], false);
            } else if (op === '-') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(vector[i])) {
                throw new Error('FOLD with - requires numeric vector');
              }
              result = result.subtract(vector[i], false);
            } else if (op === '*') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(vector[i])) {
                throw new Error('FOLD with * requires numeric vector');
              }
              result = result.multiply(vector[i], false);
            } else if (op === '/') {
              if (!Fraction.isValidNumber(result) || !Fraction.isValidNumber(vector[i])) {
                throw new Error('FOLD with / requires numeric vector');
              }
              if (vector[i].numerator === 0) throw new Error('Division by zero');
              result = result.divide(vector[i], false);
            } else {
              throw new Error(`FOLD: Unknown operator ${op}`);
            }
          }
          return result;
        }
        
        case 'MAP': {
          const [funcName, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('MAP expects a vector as second argument');
          }
          
          // 関数名がユーザー定義関数の場合
          if (funcName in env.functions) {
            const func = env.functions[funcName];
            return vector.map(item => {
              const newLocalEnv = {};
              newLocalEnv[func.params[0]] = item;
              return evaluate(func.body, env, newLocalEnv);
            });
          } else {
            throw new Error(`MAP: Undefined function ${funcName}`);
          }
        }
        
        case 'FILTER': {
          const [pred, vector] = args;
          if (!Array.isArray(vector)) {
            throw new Error('FILTER expects a vector as second argument');
          }
          
          // 条件関数の適用
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
            return [];  // スカラーの形状は空ベクトル
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
          
          // 1次元の場合
          if (dims.length === 1) {
            const size = dims[0];
            const result = [];
            for (let i = 0; i < size; i++) {
              result.push(flat[i % flat.length]);
            }
            return result;
          }
          
          // 多次元の場合（簡略化のため2次元まで）
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
    
    // 演算（ベクトル演算を含む）
    if (ast.type === 'operation') {
      const left = evaluate(ast.left, env, localEnv);
      const right = evaluate(ast.right, env, localEnv);
      
      // ベクトル演算
      if (Array.isArray(left) && Array.isArray(right)) {
        if (['+', '-', '*', '/'].includes(ast.operator)) {
          if (left.length !== right.length) {
            throw new Error(`Vector operation requires vectors of same length`);
          }
          return left.map((l, i) => {
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
      
      // スカラー・ベクトル演算
      if (Fraction.isValidNumber(left) && Array.isArray(right)) {
        if (['*', '/'].includes(ast.operator)) {
          return right.map(r => {
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
      
      // ベクトル・スカラー演算
      if (Array.isArray(left) && Fraction.isValidNumber(right)) {
        if (['*', '/'].includes(ast.operator)) {
          return left.map(l => {
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
      
      // スカラー演算
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
    
    // value ノード（内部使用）
    if (ast.type === 'value') {
      return ast.value;
    }
    
    throw new Error(`Unknown AST node type: ${ast.type}`);
  };
  
  const formatValue = (value) => {
    if (Fraction.isValidNumber(value)) {
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
        
        // トークンの型チェック（演算子は色に関係なく許可）
        tokens.forEach(token => {
          // 演算子は任意の色で入力可能
          if (['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value)) {
            return; // 演算子は型チェックをスキップ
          }
          
          // 数値リテラルのチェック
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green' && !token.value.includes('/')) {
            if (!tokens.some(t => t.value.includes('/') && t.value.includes(token.value))) {
              if (token.color !== 'green'){
                throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
              }
            }
          }
          
          // 変数名と組み込み関数のチェック（@も含む）
          if (/^[A-Z@][A-Z0-9_]*$/.test(token.value) && 
              !['@', 'LEN', 'TAKE', 'DROP', 'FOLD', 'MAP', 'FILTER', 'DOT', 'SHAPE', 'RESHAPE'].includes(token.value) &&
              token.color !== 'red') {
            throw new Error(`Type Error: Variable names must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          
          // 括弧のチェック
          if (['(', ')'].includes(token.value) && token.color !== 'red') {
            throw new Error(`Type Error: Parentheses must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          
          // ベクトル括弧のチェック
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