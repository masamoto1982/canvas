const parse = (tokens) => {
  let position = 0;
  const peek = () => tokens[position] || null;
  const consume = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length;
  const parseExpression = () => {
    if (isAtEnd()) return null;
    const token = peek();
    if (['+', '-', '*', '/', '>', '>=', '=='].includes(token.value)) {
      const operator = consume().value;
      const left = parseExpression();
      const right = parseExpression();
      if (!left || !right) {
        throw new Error(`Syntax Error: Operator '${operator}' requires two operands`);
      }
      return { type: 'operation', operator: operator, left: left, right: right };
    }
    if (token.value === '=') {
      consume();
      const variableToken = peek();
      if (!variableToken || variableToken.color !== 'cyan' || !/^[A-Z][A-Z0-9_]*$/.test(variableToken.value)) {
        throw new Error(`Syntax Error: Expected variable name (uppercase) after '=', found ${variableToken ? variableToken.value : 'end of input'}`);
      }
      const variable = consume().value;
      const value = parseExpression();
      if (!value) {
        throw new Error(`Syntax Error: Expected value after variable name in assignment`);
      }
      return { type: 'assignment', variable: variable, value: value };
    }
    if (token.color === 'cyan' && /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
      return { type: 'variable', name: consume().value };
    }
    if (token.type === Types.NUMBER) {
      const value = consume().value;
      if (value.includes('/')) {
        const [numerator, denominator] = value.split('/').map(Number);
        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
          throw new Error(`Invalid fraction: ${value}`);
        }
        return { type: Types.NUMBER, value: Fraction(numerator, denominator, true) };
      } else {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return { type: Types.NUMBER, value: Fraction(numValue, 1, false) };
      }
    }
    if (token.type === Types.BOOLEAN) {
      const value = consume().value.toLowerCase();
      return { type: Types.BOOLEAN, value: value === 'true' };
    }
    if (token.type === Types.STRING) {
      let value = consume().value;
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      return { type: Types.STRING, value: value };
    }
    throw new Error(`Unexpected token: ${token.value} with color ${token.color}`);
  };
  const parseProgram = () => {
    const expressions = [];
    while (!isAtEnd()) {
      const expr = parseExpression();
      if (expr) {
        expressions.push(expr);
      }
    }
    return expressions;
  };
  return parseProgram();
};