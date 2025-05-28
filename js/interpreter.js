const interpreter = (() => {
  const environment = { variables: {}, functions: {} };
  const evaluate = (ast, env = environment) => {
    if (!ast) return null;
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }
    if (ast.type === 'variable') {
      if (!(ast.name in env.variables)) {
        throw new Error(`Undefined variable: ${ast.name}`);
      }
      return env.variables[ast.name];
    }
    if (ast.type === 'assignment') {
      const value = evaluate(ast.value, env);
      env.variables[ast.variable] = value;
      return value;
    }
    if (ast.type === 'operation') {
      const left = evaluate(ast.left, env);
      const right = evaluate(ast.right, env);
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
        const leftType = leftIsNumber ? Types.NUMBER : typeof left;
        const rightType = rightIsNumber ? Types.NUMBER : typeof right;
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
          if (['+', '-', '*', '/'].includes(token.value) && token.color !== 'green' && token.color !== 'cyan') {
            throw new Error(`Type Error: Arithmetic operators must be Number type (green) or Symbol type (cyan), found ${token.color} for '${token.value}'`);
          }
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green' && !token.value.includes('/')) {
            if (!tokens.some(t => t.value.includes('/') && t.value.includes(token.value))) {
                 if (token.color !== 'green'){
                    throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
                 }
            }
          }
          if (/^[A-Z][A-Z0-9_]*$/.test(token.value) && token.color !== 'cyan') {
            throw new Error(`Type Error: Variable names must be Symbol type (cyan), found ${token.color} for '${token.value}'`);
          }
          if (token.value === '=' && token.color !== 'green' && token.color !== 'cyan') {
            throw new Error(`Type Error: Assignment operator '=' must be Number type (green) or Symbol type (cyan), found ${token.color}`);
          }
        });
        const ast = parse(tokens);
        const result = executeProgram(ast);
        if (Fraction.isValidNumber(result)) return result.toString();
        else if (result === null || result === undefined) return "undefined";
        else return String(result);
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
    reset: resetEnvironment,
    getEnvironment: () => ({ ...environment })
  };
})();