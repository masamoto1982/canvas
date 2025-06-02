const parse = (tokens) => {
  let position = 0;
  const peek = () => tokens[position] || null;
  const consume = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length;
  
  console.log("=== PARSING START ===");
  console.log("Tokens:", tokens.map(t => `${t.value}(${t.color})`).join(" "));
  
  // 演算子かどうかをチェック（色に関係なく）
  const isOperator = (token) => {
    return token && ['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value);
  };
  
  // 演算子トークンかどうかをチェック（値のみで判定）
  const isOperatorToken = (token) => {
    return token && ['+', '-', '*', '/', '>', '>=', '=='].includes(token.value);
  };
  
  // 組み込み関数かどうかをチェック
  const isBuiltinFunction = (name) => {
    return ['@', 'LEN', 'TAKE', 'DROP', 'FOLD', 'MAP', 'FILTER', 'DOT', 'SHAPE', 'RESHAPE'].includes(name);
  };
  
  // 組み込み関数の引数の数
  const builtinArity = {
    '@': 2,       // ベクトル、インデックス
    'LEN': 1,     // ベクトル
    'TAKE': 2,    // 数、ベクトル
    'DROP': 2,    // 数、ベクトル
    'FOLD': 2,    // 演算子、ベクトル
    'MAP': 2,     // 関数、ベクトル
    'FILTER': 2,  // 条件、ベクトル
    'DOT': 2,     // ベクトル、ベクトル（内積）
    'SHAPE': 1,   // ベクトル（形状を返す）
    'RESHAPE': 2  // 形状、ベクトル
  };
  
  // 組み込み関数専用の引数パーサー
  const parseBuiltinArgs = (funcName, expectedCount) => {
    const args = [];
    for (let i = 0; i < expectedCount; i++) {
      if (isAtEnd()) {
        throw new Error(`Builtin function ${funcName} expects ${expectedCount} arguments, but got ${i}`);
      }
      
      console.log(`Parsing argument ${i + 1} for builtin ${funcName}...`);
      
      // 各引数を独立して解析
      const token = peek();
      let arg;
      
      // 変数名の場合は変数参照として扱う
      if (token.color === 'red' && /^[A-Z][A-Z0-9_]*$/.test(token.value) && !isBuiltinFunction(token.value)) {
        arg = { type: 'variable', name: consume().value };
        console.log(`Parsed as variable: ${arg.name}`);
      } else {
        // それ以外は通常の式として解析
        arg = parseExpression(true); // inOperatorContext = true
      }
      
      if (!arg) {
        throw new Error(`Builtin function ${funcName} expects ${expectedCount} arguments`);
      }
      args.push(arg);
    }
    return args;
  };
  
  // parseExpression に文脈フラグを追加
  const parseExpression = (inOperatorContext = false) => {
    if (isAtEnd()) {
      console.log("Parse: End of tokens");
      return null;
    }
    
    const token = peek();
    console.log(`Parse expression at position ${position}: ${token.value}(${token.color})`);
    
    // ベクトルの処理
    if (token.value === '[' && token.color === 'purple') {
      consume(); // '[' を消費
      console.log("Parse vector");
      const elements = [];
      
      while (!isAtEnd() && peek().value !== ']') {
        const elem = parseExpression();
        if (elem) {
          elements.push(elem);
          console.log(`Added vector element:`, elem);
        }
      }
      
      if (isAtEnd() || peek().value !== ']') {
        throw new Error(`Syntax Error: Expected ']' to close vector`);
      }
      consume(); // ']' を消費
      
      return { type: Types.VECTOR, elements: elements };
    }
	
	// NIL の処理（ここに追加）
  if (token.value === 'NIL') {
    consume();
    console.log(`Parse nil`);
    return { type: Types.NIL, value: null };
  }
    
    // 演算子の処理（ベクトル演算を含む）
    if (isOperatorToken(token)) {
      const operator = consume().value;
      console.log(`Parse operator: ${operator}`);
      
      console.log(`Parsing left operand for ${operator}...`);
      const left = parseExpression(true); // 演算子の文脈で解析
      console.log(`Left operand:`, left);
      
      console.log(`Parsing right operand for ${operator}...`);
      const right = parseExpression(true); // 演算子の文脈で解析
      console.log(`Right operand:`, right);
      
      if (!left || !right) {
        throw new Error(`Syntax Error: Operator '${operator}' requires two operands`);
      }
      return { type: 'operation', operator: operator, left: left, right: right };
    }
    
    // 代入の処理
    if (token.value === '=') {
      consume();
      console.log(`Parse assignment`);
      
      const nameToken = peek();
      if (!nameToken || nameToken.color !== 'red' || !/^[A-Z][A-Z0-9_]*$/.test(nameToken.value)) {
        throw new Error(`Syntax Error: Expected variable or function name (uppercase symbol in red) after '=', found ${nameToken ? nameToken.value : 'end of input'}`);
      }
      const name = consume().value;
      console.log(`Assignment/Function name: ${name}`);
      
      // 関数定義かどうかチェック
      if (peek() && peek().value === '(' && peek().color === 'red') {
        console.log(`Function definition detected for ${name}`);
        consume(); // '(' を消費
        const params = [];
        
        while (!isAtEnd() && peek().value !== ')') {
          const paramToken = peek();
          if (paramToken.color !== 'red' || !/^[A-Z][A-Z0-9_]*$/.test(paramToken.value)) {
            throw new Error(`Syntax Error: Expected parameter name (uppercase symbol in red), found ${paramToken.value}`);
          }
          params.push(consume().value);
          console.log(`Added parameter: ${params[params.length - 1]}`);
        }
        
        if (isAtEnd() || peek().value !== ')') {
          throw new Error(`Syntax Error: Expected ')' after parameter list`);
        }
        consume(); // ')' を消費
        console.log(`Function ${name} parameters: [${params.join(', ')}]`);
        
        console.log(`Parsing function body...`);
        const body = parseExpression();
        console.log(`Function body:`, body);
        
        if (!body) {
          throw new Error(`Syntax Error: Expected function body after parameter list`);
        }
        
        return { type: 'function_definition', name: name, params: params, body: body };
      } else {
        // 変数代入
        console.log(`Variable assignment for ${name}`);
        const value = parseExpression();
        if (!value) {
          throw new Error(`Syntax Error: Expected value after variable name in assignment`);
        }
        return { type: 'assignment', variable: name, value: value };
      }
    }
    
    // シンボル（変数参照、関数呼び出し、または組み込み関数）
    if (token.color === 'red' && /^[A-Z@][A-Z0-9_]*$/.test(token.value)) {
      const name = consume().value;
      console.log(`Parse symbol: ${name}`);
      
      // 組み込み関数の場合
      if (isBuiltinFunction(name)) {
        console.log(`${name} is a builtin function`);
        const expectedArgs = builtinArity[name];
        const args = parseBuiltinArgs(name, expectedArgs);
        return { type: 'builtin_call', name: name, args: args };
      }
      
      // 次のトークンをチェック
      const nextToken = peek();
      console.log(`Next token after ${name}:`, nextToken ? `${nextToken.value}(${nextToken.color})` : 'none');
      
      // 演算子の文脈内では、常に変数参照として扱う
      if (inOperatorContext) {
        console.log(`In operator context, ${name} is a variable reference`);
        return { type: 'variable', name: name };
      }
      
      // 次が演算子、括弧、ベクトル閉じ、または終端なら変数参照
      if (!nextToken || isOperator(nextToken) || nextToken.value === ')' || nextToken.value === ']') {
        console.log(`${name} is a variable reference`);
        return { type: 'variable', name: name };
      }
      
      // ユーザー定義関数の呼び出しを試みる
      console.log(`Trying to parse as user function call ${name}`);
      
      const args = [];
      const savedPosition = position;
      
      // 最初の引数を試行的に読む
      const firstArg = parseExpression();
      if (!firstArg) {
        console.log(`No arguments, ${name} is a variable`);
        position = savedPosition;
        return { type: 'variable', name: name };
      }
      
      args.push(firstArg);
      console.log(`First argument for ${name}:`, firstArg);
      
      // 2番目の引数があるかチェック
      const afterFirst = peek();
      if (afterFirst && !isOperator(afterFirst) && afterFirst.value !== ')' && afterFirst.value !== ']') {
        const secondArg = parseExpression();
        if (secondArg) {
          args.push(secondArg);
          console.log(`Second argument for ${name}:`, secondArg);
        }
      }
      
      console.log(`${name} is a function call with ${args.length} arguments`);
      return { type: 'function_call', name: name, args: args };
    }
    
    // 括弧の処理
    if (token.value === '(' && token.color === 'red') {
      throw new Error(`Syntax Error: Unexpected '(' - parentheses are only allowed in function definitions`);
    }
    
    // リテラル値の処理
    if (token.type === Types.NUMBER) {
      const value = consume().value;
      console.log(`Parse number: ${value}`);
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
      console.log(`Parse boolean: ${value}`);
      return { type: Types.BOOLEAN, value: value === 'true' };
    }
    
    if (token.type === Types.STRING) {
      let value = consume().value;
      console.log(`Parse string: ${value}`);
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
      console.log(`\n--- Parsing expression ${expressions.length + 1} ---`);
      const expr = parseExpression();
      if (expr) {
        expressions.push(expr);
        console.log(`Expression ${expressions.length} result:`, expr);
      }
    }
    console.log("\n=== PARSING COMPLETE ===");
    console.log("AST:", JSON.stringify(expressions, null, 2));
    return expressions;
  };
  
  return parseProgram();
};