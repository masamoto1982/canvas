// interpreter.js

// Potentially export interpreter
// export const interpreter = (() => { ... })();

const interpreter = (() => { //
  const environment = { variables: {}, functions: {} };

  const evaluate = (ast, env = environment) => {
    if (!ast) return null;
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) { // Needs Types
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
        if (!Fraction.isValidNumber(left) || !Fraction.isValidNumber(right)) { // Needs Fraction
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
        const leftIsNumber = Fraction.isValidNumber(left); // Needs Fraction
        const rightIsNumber = Fraction.isValidNumber(right); // Needs Fraction
        const leftType = leftIsNumber ? Types.NUMBER : typeof left; // Needs Types
        const rightType = rightIsNumber ? Types.NUMBER : typeof right; // Needs Types
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
        if (leftType === Types.STRING || leftType === Types.BOOLEAN) { // Needs Types
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

  const executeProgram = (program) => { // Renamed from 'execute' to avoid conflict
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
        const tokens = tokenize(editor); // Needs tokenize
        if (tokens.length === 0) return "Empty input";
        tokens.forEach(token => {
          if (['+', '-', '*', '/'].includes(token.value) && token.color !== 'green' && token.color !== 'cyan') {
            throw new Error(`Type Error: Arithmetic operators must be Number type (green) or Symbol type (cyan), found ${token.color} for '${token.value}'`);
          }
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green' && !token.value.includes('/')) { // Allow fractions to be other colors initially before parsing
             // Check if it's part of a fraction string; if so, specific color check is less strict here.
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
        const ast = parse(tokens); // Needs parse
        const result = executeProgram(ast); // Use renamed function
        if (Fraction.isValidNumber(result)) return result.toString(); // Needs Fraction
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