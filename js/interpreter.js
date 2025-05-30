const interpreter = (() => {
  const environment = { variables: {}, functions: {} };
  
  const evaluate = (ast, env = environment, localEnv = {}) => {
    if (!ast) return null;
    
    // リテラル値
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }
    
    // リスト
    if (ast.type === Types.LIST) {
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
        case 'AT': {
          const [table, row, col] = args;
          if (!Array.isArray(table) || !Array.isArray(table[0])) {
            throw new Error('AT expects a table (list of lists) as first argument');
          }
          const rowIdx = Fraction.isValidNumber(row) ? row.valueOf() - 1 : row - 1;
          const colIdx = Fraction.isValidNumber(col) ? col.valueOf() - 1 : col - 1;
          if (rowIdx < 0 || rowIdx >= table.length || colIdx < 0 || colIdx >= table[rowIdx].length) {
            throw new Error('Index out of bounds');
          }
          return table[rowIdx][colIdx];
        }
        
        case 'ROW': {
          const [table, row] = args;
          if (!Array.isArray(table) || !Array.isArray(table[0])) {
            throw new Error('ROW expects a table (list of lists) as first argument');
          }
          const rowIdx = Fraction.isValidNumber(row) ? row.valueOf() - 1 : row - 1;
          if (rowIdx < 0 || rowIdx >= table.length) {
            throw new Error('Row index out of bounds');
          }
          return table[rowIdx];
        }
        
        case 'COL': {
          const [table, col] = args;
          if (!Array.isArray(table) || !Array.isArray(table[0])) {
            throw new Error('COL expects a table (list of lists) as first argument');
          }
          const colIdx = Fraction.isValidNumber(col) ? col.valueOf() - 1 : col - 1;
          const column = [];
          for (let i = 0; i < table.length; i++) {
            if (colIdx < 0 || colIdx >= table[i].length) {
              throw new Error('Column index out of bounds');
            }
            column.push(table[i][colIdx]);
          }
          return column;
        }
        
        case 'SUM': {
          const [list] = args;
          if (!Array.isArray(list)) {
            throw new Error('SUM expects a list as argument');
          }
          let sum = Fraction(0, 1);
          for (const item of list) {
            if (!Fraction.isValidNumber(item)) {
              throw new Error('SUM can only sum numbers');
            }
            sum = sum.add(item);
          }
          return sum;
        }
        
        case 'AVG': {
          const [list] = args;
          if (!Array.isArray(list)) {
            throw new Error('AVG expects a list as argument');
          }
          if (list.length === 0) {
            throw new Error('Cannot calculate average of empty list');
          }
          let sum = Fraction(0, 1);
          for (const item of list) {
            if (!Fraction.isValidNumber(item)) {
              throw new Error('AVG can only average numbers');
            }
            sum = sum.add(item);
          }
          return sum.divide(Fraction(list.length, 1));
        }
        
        case 'MAX': {
          const [list] = args;
          if (!Array.isArray(list)) {
            throw new Error('MAX expects a list as argument');
          }
          if (list.length === 0) {
            throw new Error('Cannot find max of empty list');
          }
          let max = list[0];
          for (let i = 1; i < list.length; i++) {
            if (!Fraction.isValidNumber(list[i])) {
              throw new Error('MAX can only compare numbers');
            }
            if (list[i].greaterThan(max)) {
              max = list[i];
            }
          }
          return max;
        }
        
        case 'MIN': {
          const [list] = args;
          if (!Array.isArray(list)) {
            throw new Error('MIN expects a list as argument');
          }
          if (list.length === 0) {
            throw new Error('Cannot find min of empty list');
          }
          let min = list[0];
          for (let i = 1; i < list.length; i++) {
            if (!Fraction.isValidNumber(list[i])) {
              throw new Error('MIN can only compare numbers');
            }
            if (max.greaterThan(list[i])) {
              min = list[i];
            }
          }
          return min;
        }
        
        // MAP と FILTER は後で実装
        default:
          throw new Error(`Unknown builtin function: ${ast.name}`);
      }
    }
    
    // 演算
    if (ast.type === 'operation') {
      const left = evaluate(ast.left, env, localEnv);
      const right = evaluate(ast.right, env, localEnv);
      
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
                        Array.isArray(left) ? Types.LIST : typeof left;
        const rightType = rightIsNumber ? Types.NUMBER : 
                         Array.isArray(right) ? Types.LIST : typeof right;
        
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
        
        // トークンの型チェック
        tokens.forEach(token => {
          if (['+', '-', '*', '/'].includes(token.value) && token.color !== 'green' && token.color !== 'red') {
            throw new Error(`Type Error: Arithmetic operators must be Number type (green) or Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green' && !token.value.includes('/')) {
            if (!tokens.some(t => t.value.includes('/') && t.value.includes(token.value))) {
              if (token.color !== 'green'){
                throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
              }
            }
          }
          if (/^[A-Z][A-Z0-9_]*$/.test(token.value) && token.color !== 'red') {
            throw new Error(`Type Error: Variable names must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          if (token.value === '=' && token.color !== 'green' && token.color !== 'red') {
            throw new Error(`Type Error: Assignment operator '=' must be Number type (green) or Symbol type (red), found ${token.color}`);
          }
          if (['(', ')'].includes(token.value) && token.color !== 'red') {
            throw new Error(`Type Error: Parentheses must be Symbol type (red), found ${token.color} for '${token.value}'`);
          }
          if (['[', ']'].includes(token.value) && token.color !== 'purple') {
            throw new Error(`Type Error: List brackets must be List type (purple), found ${token.color} for '${token.value}'`);
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