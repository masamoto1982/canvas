const parse = (tokens) => {
  let position = 0;
  const peek = () => tokens[position] || null;
  const consume = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length;

  // デバッグ用のスタックトレース
  const debugStack = [];
  const pushDebug = (context) => {
    debugStack.push(context);
    // console.log(`${'  '.repeat(debugStack.length)}>> Entering ${context}`);
  };
  const popDebug = (result) => {
    const context = debugStack.pop();
    // console.log(`${'  '.repeat(debugStack.length + 1)}<< Exiting ${context} with:`, result);
    return result;
  };

  // console.log("=== PARSING START ===");
  // console.log("Tokens:", tokens.map(t => `${t.value}(${t.color})`).join(" "));
  // console.log("Token details:");
  // tokens.forEach((t, i) => {
  //   console.log(`  [${i}] value: "${t.value}", color: ${t.color}, type: ${t.type}`);
  // });

  const isOperator = (token) => {
    return token && ['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value);
  };
  const isOperatorToken = (token) => {
    return token && ['+', '-', '*', '/', '>', '>=', '=='].includes(token.value);
  };
  const isBuiltinFunction = (name) => {
    // 'FORCE' をビルトイン関数リストに追加
    return ['@', 'LEN', 'TAKE', 'DROP', 'FOLD', 'MAP', 'FILTER', 'DOT', 'SHAPE', 'RESHAPE',
            'IF', 'IS_EMPTY', 'IS_NIL', 'AND', 'OR', 'NOT', 'FORCE'].includes(name);
  };
  const builtinArity = {
    '@': 2,
    'LEN': 1,
    'TAKE': 2,
    'DROP': 2,
    'FOLD': 2,
    'MAP': 2,
    'FILTER': 2,
    'DOT': 2,
    'SHAPE': 1,
    'RESHAPE': 2,
    'IF': 3,
    'IS_EMPTY': 1,
    'IS_NIL': 1,
    'AND': 2,
    'OR': 2,
    'NOT': 1,
    'FORCE': 1 // 'FORCE' の引数は1つ
  };

const parseBuiltinArgs = (funcName, expectedCount) => {
  pushDebug(`parseBuiltinArgs(${funcName}, ${expectedCount})`);
  const args = [];
  for (let i = 0; i < expectedCount; i++) {
    if (isAtEnd()) {
      throw new Error(`Builtin function ${funcName} expects ${expectedCount} arguments, but got ${i}`);
    }
    // console.log(`${'  '.repeat(debugStack.length + 1)}Parsing argument ${i + 1} for builtin ${funcName}...`);
    const token = peek();
    // console.log(`${'  '.repeat(debugStack.length + 1)}Current token: ${token.value}(${token.color})`);
    let arg;
    if (funcName === 'FOLD' && i === 0 && isOperatorToken(token)) {
      arg = { type: 'operator', value: consume().value };
      // console.log(`${'  '.repeat(debugStack.length + 1)}Parsed as operator: ${arg.value}`);
    }
    else if ((funcName === 'MAP' || funcName === 'FILTER') && i === 0 &&
             token.color === 'red' && /^[A-Z][A-Z0-9_]*$/.test(token.value) &&
             !isBuiltinFunction(token.value)) {
      arg = consume().value;
      // console.log(`${'  '.repeat(debugStack.length + 1)}Parsed as function name: ${arg}`);
    }
    else {
      arg = parseExpression(false);
    }
    if (!arg) {
      throw new Error(`Builtin function ${funcName} expects ${expectedCount} arguments`);
    }
    args.push(arg);
  }
  return popDebug(args);
};

  const parseExpression = (inOperatorContext = false) => {
    pushDebug(`parseExpression(inOperatorContext=${inOperatorContext})`);

 if (isAtEnd()) {
   // console.log("Parse: End of tokens");
   return popDebug(null);
 }
 const token = peek();
 // console.log(`${'  '.repeat(debugStack.length)}Parse expression at position ${position}: ${token.value}(${token.color})`);

 if (token.value === '[' && token.color === 'purple') {
   consume();
   // console.log(`${'  '.repeat(debugStack.length)}Parse vector`);
   const elements = [];
   while (!isAtEnd() && peek().value !== ']') {
     const elem = parseExpression();
     if (elem) {
       elements.push(elem);
       // console.log(`${'  '.repeat(debugStack.length)}Added vector element:`, elem);
     }
   }
   if (isAtEnd() || peek().value !== ']') {
     throw new Error(`Syntax Error: Expected ']' to close vector`);
   }
   consume();
   return popDebug({ type: Types.VECTOR, elements: elements });
 }

 if (token.value === 'NIL' && token.color === 'orange') {
   consume();
   // console.log(`${'  '.repeat(debugStack.length)}Parse nil`);
   return popDebug({ type: Types.NIL, value: null });
 }

 if (isOperatorToken(token)) {
   const operator = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse operator: ${operator}`);
   // console.log(`${'  '.repeat(debugStack.length)}Parsing left operand for ${operator}...`);
   const left = parseExpression(true);
   // console.log(`${'  '.repeat(debugStack.length)}Left operand:`, left);
   // console.log(`${'  '.repeat(debugStack.length)}Parsing right operand for ${operator}...`);
   const right = parseExpression(false);
   // console.log(`${'  '.repeat(debugStack.length)}Right operand:`, right);
   if (!left || !right) {
     throw new Error(`Syntax Error: Operator '${operator}' requires two operands`);
   }
   return popDebug({ type: 'operation', operator: operator, left: left, right: right });
 }

 if (token.value === '=') {
   consume();
   // console.log(`${'  '.repeat(debugStack.length)}Parse assignment`);
   const nameToken = peek();
   if (!nameToken || nameToken.color !== 'red' || !/^[A-Z][A-Z0-9_]*$/.test(nameToken.value)) {
     throw new Error(`Syntax Error: Expected variable or function name (uppercase symbol in red) after '=', found ${nameToken ? nameToken.value : 'end of input'}`);
   }
   const name = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Assignment/Function name: ${name}`);
   if (peek() && peek().value === '(' && peek().color === 'red') {
     // console.log(`${'  '.repeat(debugStack.length)}Function definition detected for ${name}`);
     consume();
     const params = [];
     while (!isAtEnd() && peek().value !== ')') {
       const paramToken = peek();
       // console.log(`${'  '.repeat(debugStack.length)}Checking parameter token: ${paramToken.value}(${paramToken.color})`);
       if (paramToken.color !== 'red' || !/^[A-Z][A-Z0-9_]*$/.test(paramToken.value)) {
         throw new Error(`Syntax Error: Expected parameter name (uppercase symbol in red), found ${paramToken.value}(${paramToken.color})`);
       }
       params.push(consume().value);
       // console.log(`${'  '.repeat(debugStack.length)}Added parameter: ${params[params.length - 1]}`);
     }
     if (isAtEnd() || peek().value !== ')') {
       throw new Error(`Syntax Error: Expected ')' after parameter list`);
     }
     consume();
     // console.log(`${'  '.repeat(debugStack.length)}Function ${name} parameters: [${params.join(', ')}]`);
     // console.log(`${'  '.repeat(debugStack.length)}Parsing function body...`);
     const body = parseExpression();
     // console.log(`${'  '.repeat(debugStack.length)}Function body:`, body);
     if (!body) {
       throw new Error(`Syntax Error: Expected function body after parameter list`);
     }
     return popDebug({ type: 'function_definition', name: name, params: params, body: body });
   } else {
     // console.log(`${'  '.repeat(debugStack.length)}Variable assignment for ${name}`);
     const value = parseExpression();
     if (!value) {
       throw new Error(`Syntax Error: Expected value after variable name in assignment`);
     }
     return popDebug({ type: 'assignment', variable: name, value: value });
   }
 }

 if (token.color === 'red' && /^[A-Z@][A-Z0-9_]*$/.test(token.value)) {
   const name = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse symbol: ${name}`);
   if (isBuiltinFunction(name)) {
     // console.log(`${'  '.repeat(debugStack.length)}${name} is a builtin function`);
     const expectedArgs = builtinArity[name];
     const args = parseBuiltinArgs(name, expectedArgs);
     return popDebug({ type: 'builtin_call', name: name, args: args });
   }
   const nextToken = peek();
   // console.log(`${'  '.repeat(debugStack.length)}Next token after ${name}:`, nextToken ? `${nextToken.value}(${nextToken.color})` : 'none');

   // 演算子コンテキストでは、基本的に変数として扱う
   if (inOperatorContext) {
     // console.log(`${'  '.repeat(debugStack.length)}In operator context, ${name} is a variable reference`);
     return popDebug({ type: 'variable', name: name });
   }

   // 非演算子コンテキストでの処理
   if (!nextToken || isOperator(nextToken) || nextToken.value === ')' || nextToken.value === ']') {
     // console.log(`${'  '.repeat(debugStack.length)}${name} is a variable reference`);
     return popDebug({ type: 'variable', name: name });
   }

   // console.log(`${'  '.repeat(debugStack.length)}Trying to parse as user function call ${name}`);
   const args = [];
   const savedPosition = position;
   const firstArg = parseExpression();
   if (!firstArg) {
     // console.log(`${'  '.repeat(debugStack.length)}No arguments, ${name} is a variable`);
     position = savedPosition;
     return popDebug({ type: 'variable', name: name });
   }
   args.push(firstArg);
   // console.log(`${'  '.repeat(debugStack.length)}First argument for ${name}:`, firstArg);
   const afterFirst = peek();
   if (afterFirst && !isOperator(afterFirst) && afterFirst.value !== ')' && afterFirst.value !== ']') {
     const secondArg = parseExpression();
     if (secondArg) {
       args.push(secondArg);
       // console.log(`${'  '.repeat(debugStack.length)}Second argument for ${name}:`, secondArg);
     }
   }
   // console.log(`${'  '.repeat(debugStack.length)}${name} is a function call with ${args.length} arguments`);
   return popDebug({ type: 'function_call', name: name, args: args });
 }

 if (token.value === '(' && token.color === 'red') {
   throw new Error(`Syntax Error: Unexpected '(' - parentheses are only allowed in function definitions`);
 }

 if (token.value === '[' && token.color === 'purple') {
   throw new Error(`Syntax Error: Unexpected '[' - square brackets must be purple for vectors`);
 }

 if (token.value === 'TRUE' || token.value === 'FALSE') {
   if (token.color !== 'cyan') {
     throw new Error(`Type Error: Boolean literals must be Boolean type (cyan), found ${token.color} for '${token.value}'`);
   }
   const value = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse boolean: ${value}`);
   return popDebug({ type: Types.BOOLEAN, value: value === 'TRUE' });
 }

 if (token.type === Types.NUMBER) {
   const value = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse number: ${value}`);
   if (value.includes('/')) {
     const [numerator, denominator] = value.split('/').map(Number);
     if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
       throw new Error(`Invalid fraction: ${value}`);
     }
     return popDebug({ type: Types.NUMBER, value: Fraction(numerator, denominator, true) });
   } else {
     const numValue = parseFloat(value);
     if (isNaN(numValue)) {
       throw new Error(`Invalid number: ${value}`);
     }
     return popDebug({ type: Types.NUMBER, value: Fraction(numValue, 1, false) });
   }
 }

 if (token.type === Types.BOOLEAN) {
   const value = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse boolean: ${value}`);
   return popDebug({ type: Types.BOOLEAN, value: value === 'TRUE' });
 }

 if (token.type === Types.STRING) {
   let value = consume().value;
   // console.log(`${'  '.repeat(debugStack.length)}Parse string: ${value}`);
   if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
     value = value.substring(1, value.length - 1);
   }
   return popDebug({ type: Types.STRING, value: value });
 }

 throw new Error(`Unexpected token: ${token.value} with color ${token.color}`);
};
  const parseProgram = () => {
    const expressions = [];
    while (!isAtEnd()) {
      // console.log(`\n--- Parsing expression ${expressions.length + 1} ---`);
      const expr = parseExpression();
      if (expr) {
        expressions.push(expr);
        // console.log(`Expression ${expressions.length} result:`, expr);
      }
    }
    // console.log("\n=== PARSING COMPLETE ===");
    // console.log("AST:", JSON.stringify(expressions, null, 2));
    return expressions;
  };
  return parseProgram();
};