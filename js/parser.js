const parse = (tokens) => {
  let position = 0;
  const peek = () => tokens[position] || null;
  const consume = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length;
  
  console.log("=== PARSING START ===");
  console.log("Tokens:", tokens.map(t => `${t.value}(${t.color})`).join(" "));
  
  // 演算子かどうかをチェック
  const isOperator = (token) => {
    return token && ['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value);
  };
  
  // 組み込み関数かどうかをチェック
  const isBuiltinFunction = (name) => {
    return ['AT', 'ROW', 'COL', 'MAP', 'FILTER', 'SUM', 'AVG', 'MAX', 'MIN'].includes(name);
  };
  
  // 組み込み関数の引数の数
  const builtinArity = {
    'AT': 3,     // テーブル、行、列
    'ROW': 2,    // テーブル、行番号
    'COL': 2,    // テーブル、列番号
    'MAP': 2,    // リスト、関数
    'FILTER': 2, // リスト、条件
    'SUM': 1,    // リスト
    'AVG': 1,    // リスト
    'MAX': 1,    // リスト
    'MIN': 1     // リスト
  };
  
  const parseExpression = () => {
    if (isAtEnd()) {
      console.log("Parse: End of tokens");
      return null;
    }
    
    const token = peek();
    console.log(`Parse expression at position ${position}: ${token.value}(${token.color})`);
    
    // リストの処理
    if (token.value === '[' && token.color === 'purple') {
      consume(); // '[' を消費
      console.log("Parse list");
      const elements = [];
      
      while (!isAtEnd() && peek().value !== ']') {
        const elem = parseExpression();
        if (elem) {
          elements.push(elem);
          console.log(`Added list element:`, elem);
        }
      }
      
      if (isAtEnd() || peek().value !== ']') {
        throw new Error(`Syntax Error: Expected ']' to close list`);
      }
      consume(); // ']' を消費
      
      return { type: Types.LIST, elements: elements };
    }
    
    // 演算子の処理
    if (['+', '-', '*', '/', '>', '>=', '=='].includes(token.value)) {
      const operator = consume().value;
      console.log(`Parse operator: ${operator}`);
      
      console.log(`Parsing left operand for ${operator}...`);
      const left = parseExpression();
      console.log(`Left operand:`, left);
      
      console.log(`Parsing right operand for ${operator}...`);
      const right = parseExpression();
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
    if (token.color === 'red' && /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
      const name = consume().value;
      console.log(`Parse symbol: ${name}`);
      
      // 組み込み関数の場合
      if (isBuiltinFunction(name)) {
        console.log(`${name} is a builtin function`);
        const expectedArgs = builtinArity[name];
        const args = [];
        
        for (let i = 0; i < expectedArgs; i++) {
          if (isAtEnd()) {
            throw new Error(`Builtin function ${name} expects ${expectedArgs} arguments, but got ${i}`);
          }
          console.log(`Parsing argument ${i + 1} for builtin ${name}...`);
          const arg = parseExpression();
          if (!arg) {
            throw new Error(`Builtin function ${name} expects ${expectedArgs} arguments, but got ${i}`);
          }
          args.push(arg);
        }
        
        return { type: 'builtin_call', name: name, args: args };
      }
      
      // 次のトークンをチェック
      const nextToken = peek();
      console.log(`Next token after ${name}:`, nextToken ? `${nextToken.value}(${nextToken.color})` : 'none');
      
      // 次が演算子、括弧、リスト閉じ、または終端なら変数参照
      if (!nextToken || isOperator(nextToken) || nextToken.value === ')' || nextToken.value === ']') {
        console.log(`${name} is a variable reference`);
        return { type: 'variable', name: name };
      }
      
      // ユーザー定義関数の呼び出しを試みる
      console.log(`Trying to parse as user function call ${name}`);
      
      // 関数呼び出しの場合、引数の数は事前に分からないので
      // 演算子や他の区切り文字が来るまで引数を読む
      const args = [];
      const savedPosition = position;
      
      // 最初の引数を試行的に読む
      const firstArg = parseExpression();
      if (!firstArg) {
        // 引数がない場合は変数参照
        console.log(`No arguments, ${name} is a variable`);
        position = savedPosition;
        return { type: 'variable', name: name };
      }
      
      args.push(firstArg);
      console.log(`First argument for ${name}:`, firstArg);
      
      // 2番目の引数があるかチェック
      // 次が演算子でなく、他の式が続く場合のみ
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