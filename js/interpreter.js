import { Fraction } from './fraction.js';

// インタープリタの作成と設定
export const createInterpreter = () => {
  const state = {
    variables: {},
    functions: {},
  };

  const tokenize = (code) => {
    code = code.replace(/#.*$/gm, '');
    code = code.replace(/\s*:\s*[a-zA-Z_]+\b/g, '');
    code = code.replace(/(\d+)\/(\d+)/g, '$1_FRAC_$2');

    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (inString) {
        if (char === stringChar && code[i - 1] !== '\\') {
          inString = false;
          current += char;
          tokens.push(current);
          current = '';
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        inString = true;
        stringChar = char;
        current = char;
      } else if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else if (['(', ')', ',', ';', ':'].includes(char)) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        if (char !== ':') tokens.push(char);
      } else {
        current += char;
      }
    }
    if (current.trim()) tokens.push(current.trim());

    return tokens.map((t) => (t.includes('_FRAC_') ? t.replace('_FRAC_', '/') : t)).filter((t) => t.trim() !== '');
  };

  const parse = (tokens) => {
    const parseExpression = (index) => {
      if (index >= tokens.length) throw new Error('Unexpected end of input');
      const token = tokens[index];
      if (/^-?\d+(\.\d+)?$/.test(token) || /^-?\d+\/\d+$/.test(token)) {
        let value;
        const isFraction = token.includes('/');
        if (isFraction) {
          const [n, d] = token.split('/').map(Number);
          value = Fraction(n, d, true);
        } else {
          value = Fraction(parseFloat(token), 1, false);
        }
        return { type: 'number', value, isFraction, nextIndex: index + 1 };
      }
      if (/^["'].*["']$/.test(token)) {
        return { type: 'string', value: token.slice(1, -1), nextIndex: index + 1 };
      }
      if (/^[A-Z][A-Z0-9_]*$/.test(token)) {
        if (tokens[index + 1] === '(') {
          let paramIndex = index + 2;
          const args = [];
          while (paramIndex < tokens.length && tokens[paramIndex] !== ')') {
            const arg = parseExpression(paramIndex);
            args.push(arg);
            paramIndex = arg.nextIndex;
            if (tokens[paramIndex] === ',') paramIndex++;
          }
          if (tokens[paramIndex] !== ')') throw new Error('Expected ) after function arguments');
          return { type: 'function_call', name: token, arguments: args, nextIndex: paramIndex + 1 };
        }
        if (state.functions[token] && index + 1 < tokens.length) {
          const { params } = state.functions[token];
          if (params.length) {
            const args = [];
            let argIndex = index + 1;
            for (let i = 0; i < params.length; i++) {
              const argExpr = parseExpression(argIndex);
              args.push(argExpr);
              argIndex = argExpr.nextIndex;
            }
            return { type: 'function_call', name: token, arguments: args, nextIndex: argIndex };
          }
        }
        return { type: 'variable', name: token, nextIndex: index + 1 };
      }
      if (['+', '-', '*', '/', '>', '>=', '==', '='].includes(token)) {
        if (token === '=') {
          if (index + 2 >= tokens.length) throw new Error('Invalid assignment expression');
          const varName = tokens[index + 1];

          if (tokens[index + 2] === '(' && /^[A-Z][A-Z0-9_]*$/.test(varName)) {
            let paramIndex = index + 3;
            const params = [];
            while (paramIndex < tokens.length && tokens[paramIndex] !== ')') {
              if (!/^[A-Z][A-Z0-9_]*$/.test(tokens[paramIndex])) throw new Error(`Invalid parameter name: ${tokens[paramIndex]}`);
              params.push(tokens[paramIndex]);
              paramIndex++;
              if (tokens[paramIndex] === ',') paramIndex++;
            }
            if (tokens[paramIndex] !== ')') throw new Error('Expected ) after function parameters');
            const bodyExpr = parseExpression(paramIndex + 1);
            state.functions[varName] = { params, body: bodyExpr };
            return { type: 'function_definition', name: varName, params, body: bodyExpr, nextIndex: bodyExpr.nextIndex };
          }
          const valueExpr = parseExpression(index + 2);
          return { type: 'assignment', variable: varName, value: valueExpr, nextIndex: valueExpr.nextIndex };
        }
        const left = parseExpression(index + 1);
        const right = parseExpression(left.nextIndex);
        return { type: 'operation', operator: token, left, right, nextIndex: right.nextIndex };
      }
      throw new Error(`Unexpected token: ${token}`);
    };

    const expressions = [];
    let i = 0;
    while (i < tokens.length) {
      const expr = parseExpression(i);
      expressions.push(expr);
      i = expr.nextIndex;
      if (tokens[i] === ';') i++;
    }
    return expressions;
  };

  const evaluate = (ast, env = { variables: state.variables, functions: state.functions }) => {
    const evaluateNode = (node, scope = env) => {
      const evalNumber = () => node.value;
      const evalVariable = () => {
        if (scope.variables.hasOwnProperty(node.name)) return scope.variables[node.name];
        throw new Error(`Undefined variable: ${node.name}`);
      };
      const evalOperation = () => {
        const left = evaluateNode(node.left, scope);
        const right = evaluateNode(node.right, scope);
        if (typeof left === 'string' || typeof right === 'string') {
          if (node.operator === '+') return String(left) + String(right);
          throw new Error(`Cannot apply operator ${node.operator} to strings`);
        }
        const ops = {
          '+': (a, b) => a.add(b, false),
          '-': (a, b) => a.subtract(b, false),
          '*': (a, b) => a.multiply(b, false),
          '/': (a, b) => a.divide(b, true),
          '>': (a, b) => a.greaterThan(b),
          '>=': (a, b) => a.greaterThanOrEqual(b),
          '==': (a, b) => a.equals(b),
        };
        if (ops[node.operator]) return ops[node.operator](left, right);
        throw new Error(`Unknown operator: ${node.operator}`);
      };
      const evalAssignment = () => {
        const val = evaluateNode(node.value, scope);
        scope.variables[node.variable] = val;
        return val;
      };
      const evalFunctionDefinition = () => {
        scope.functions[node.name] = { params: node.params, body: node.body };
        return `Function ${node.name} defined`;
      };
      const evalFunctionCall = () => {
        if (!scope.functions.hasOwnProperty(node.name)) throw new Error(`Undefined function: ${node.name}`);
        const func = scope.functions[node.name];
        if (func.params.length !== node.arguments.length) throw new Error(`Expected ${func.params.length} arguments, got ${node.arguments.length}`);
        const fnScope = { variables: { ...scope.variables }, functions: scope.functions };
        node.arguments.forEach((arg, idx) => {
          fnScope.variables[func.params[idx]] = evaluateNode(arg, scope);
        });
        return evaluateNode(func.body, fnScope);
      };
      const table = {
        number: evalNumber,
        string: () => node.value,
        variable: evalVariable,
        operation: evalOperation,
        assignment: evalAssignment,
        function_definition: evalFunctionDefinition,
        function_call: evalFunctionCall,
      };
      if (table[node.type]) return table[node.type]();
      throw new Error(`Unknown node type: ${node.type}`);
    };
    let result;
    ast.forEach((ex) => {
      result = evaluateNode(ex, env);
    });
    return result;
  };

  const execute = (code) => {
    try {
      code = code.replace(/\u200B\[(black|red|green|blue)\]/g, '');
      
      const tokens = tokenize(code);
      const ast = parse(tokens);
      const result = evaluate(ast);
      return result.toString ? result.toString() : result;
    } catch (err) {
      return `Error: ${err.message}`;
    }
  };

  return { ...state, tokenize, parse, evaluate, execute };
};

// インタープリタのインスタンスを作成
export const interpreter = createInterpreter();