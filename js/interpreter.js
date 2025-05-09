import { Fraction } from './fraction.js';

// インタープリタの作成と設定
export const createInterpreter = () => {
  // 型の定義
  const Types = {
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    STRING: 'string',
    UNDEFINED: 'undefined'
  };

  // 色と型のマッピング
  const ColorToType = {
    'green': Types.NUMBER,
    'red': Types.BOOLEAN,
    'blue': Types.STRING,
    'black': Types.UNDEFINED
  };

  const state = {
    variables: {},  // 変数 -> {type: 型, value: 値}
    functions: {},  // 関数 -> {params: [{name: 名前, type: 型}], body: ボディ, returnType: 戻り値の型}
  };

  // トークン化処理 (前回の修正を維持)
  const tokenize = (code) => {
    const colorMarkerRegex = /\u200B\[(black|red|green|blue)\]/g;
    let currentColor = 'black';
    const colorPositions = [];
    let match;
    while ((match = colorMarkerRegex.exec(code)) !== null) {
      colorPositions.push({
        position: match.index,
        color: match[1],
        length: match[0].length
      });
    }
    code = code.replace(/#.*$/gm, '');
    code = code.replace(/(\d+)\/(\d+)/g, '$1_FRAC_$2');

    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let tokenStartPos = 0;
    
    for (let i = 0; i < code.length; i++) {
      let consumedByMarker = false;
      for (const marker of colorPositions) {
        if (i === marker.position) {
          if (current.trim()) {
            tokens.push({
              value: current.trim(),
              type: ColorToType[currentColor] || Types.UNDEFINED,
              color: currentColor
            });
            current = '';
          }
          currentColor = marker.color;
          i += marker.length -1;
          consumedByMarker = true;
          tokenStartPos = i + 1;
          break; 
        }
      }
      if (consumedByMarker) continue;
      
      const char = code[i];
      
      if (inString) {
        if (char === stringChar && (i === 0 || code[i - 1] !== '\\')) {
          inString = false;
          current += char;
          tokens.push({
            value: current,
            type: ColorToType[currentColor] || Types.STRING,
            color: currentColor
          });
          current = '';
          tokenStartPos = i + 1;
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        if (current.trim()) {
          tokens.push({
            value: current.trim(),
            type: ColorToType[currentColor] || Types.UNDEFINED,
            color: currentColor
          });
          current = '';
        }
        inString = true;
        stringChar = char;
        current = char;
        tokenStartPos = i;
      } else if (/\s/.test(char)) {
        if (current.trim()) {
          tokens.push({
            value: current.trim(),
            type: ColorToType[currentColor] || Types.UNDEFINED,
            color: currentColor
          });
          current = '';
        }
        tokenStartPos = i + 1;
      } else if (['(', ')', ',', ';', ':'].includes(char)) {
        if (current.trim()) {
          tokens.push({
            value: current.trim(),
            type: ColorToType[currentColor] || Types.UNDEFINED,
            color: currentColor
          });
          current = '';
        }
        tokens.push({
          value: char,
          type: ColorToType[currentColor] || Types.UNDEFINED,
          color: currentColor
        });
        tokenStartPos = i + 1;
      } else {
        const operators = ['+', '-', '*', '/', '>', '>=', '<=', '<', '==', '='];
        if (operators.includes(char.toString()) || (current.length > 0 && operators.includes(current[current.length-1]+char.toString())) ) {
            if (current.trim() && !operators.includes(current.trim())) {
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = '';
            }
        }
        if (operators.includes(char.toString())) {
            if(current.trim() && !operators.includes(current.trim())) {
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = '';
            }
            if(current.length > 0 && operators.includes(current + char.toString())) {
                current += char;
            } else if (current.length > 0 && operators.includes(current)) {
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = char.toString();
            }
             else {
                current += char;
            }
        } else {
            if(current.length > 0 && operators.includes(current.trim())) {
                tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = '';
            }
            current += char;
        }
      }
    }
    
    if (current.trim()) {
      tokens.push({
        value: current.trim(),
        type: ColorToType[currentColor] || Types.UNDEFINED,
        color: currentColor
      });
    }

    return tokens
      .filter(t => t.value.trim() !== '')
      .map(t => {
        if (t.value.includes('_FRAC_')) {
          t.value = t.value.replace('_FRAC_', '/');
        }
        if (t.value === 'TRUE' || t.value === 'FALSE') {
          if (t.type !== Types.BOOLEAN && t.type !== Types.UNDEFINED) {
            console.warn(`Warning: Boolean literal ${t.value} has color ${t.color} (type ${t.type}), expected boolean (red) or undefined (black).`);
          }
          t.literalType = Types.BOOLEAN;
        } else if (/^-?\d+(\.\d+)?$/.test(t.value) || /^-?\d+\/\d+$/.test(t.value)) {
            if (t.type !== Types.NUMBER && t.type !== Types.UNDEFINED) {
                console.warn(`Warning: Number literal ${t.value} has color ${t.color} (type ${t.type}), expected number (green) or undefined (black).`);
            }
            t.literalType = Types.NUMBER;
        } else if (/^["'].*["']$/.test(t.value)) {
             if (t.type !== Types.STRING && t.type !== Types.UNDEFINED) {
                console.warn(`Warning: String literal ${t.value} has color ${t.color} (type ${t.type}), expected string (blue) or undefined (black).`);
            }
            t.literalType = Types.STRING;
        }
        return t;
      });
  };

  // 構文解析処理 (前回の修正を維持)
  const parse = (tokens) => {
    const parseExpression = (index) => {
      if (index >= tokens.length) throw new Error('Unexpected end of input at parseExpression start');
      const token = tokens[index];
      
      if (token.value === 'TRUE' || token.value === 'FALSE') {
        return { 
          type: 'boolean', value: token.value === 'TRUE', nextIndex: index + 1,
          dataType: token.literalType || Types.BOOLEAN
        };
      }
      if (token.literalType === Types.NUMBER) {
        let value;
        const isFraction = token.value.includes('/');
        if (isFraction) {
          const [n, d] = token.value.split('/').map(Number);
          value = Fraction(n, d, true);
        } else {
          value = Fraction(parseFloat(token.value), 1, false);
        }
        return { type: 'number', value, isFraction, nextIndex: index + 1, dataType: Types.NUMBER };
      }
      if (token.literalType === Types.STRING) {
        return { type: 'string', value: token.value.slice(1, -1), nextIndex: index + 1, dataType: Types.STRING };
      }
      
      if (/^[A-Z][A-Z0-9_]*$/.test(token.value)) {
        const currentIdentifierToken = token;
        if (index + 1 < tokens.length && tokens[index + 1].value === '=') {
          const varToken = currentIdentifierToken;
          const varName = varToken.value;
          if (index + 2 >= tokens.length) {
            throw new Error(`Invalid assignment: missing value for variable ${varName} after '='`);
          }
          const valueExpr = parseExpression(index + 2);
          const assignedVarType = varToken.type !== Types.UNDEFINED ? varToken.type : valueExpr.dataType;
          if (state.variables[varName] && state.variables[varName].type !== Types.UNDEFINED && assignedVarType !== Types.UNDEFINED) {
            if (state.variables[varName].type !== assignedVarType && varToken.type !== Types.UNDEFINED /*色が指定されていれば厳密にチェック*/) {
              // ここでのエラーは、再宣言に近い形での型変更を防ぐ意図。代入時の値との型チェックは評価時に行う。
              // console.warn(`Warning: Variable ${varName} (type ${state.variables[varName].type}) is being assigned a value that might lead to effective type ${assignedVarType}, while its color suggests ${varToken.type}.`);
            }
          }
          state.variables[varName] = { type: assignedVarType, value: null };
          return { 
            type: 'assignment', variable: varName, variableDataType: varToken.type,
            value: valueExpr, nextIndex: valueExpr.nextIndex, dataType: valueExpr.dataType
          };
        } 
        else if (index + 1 < tokens.length && tokens[index + 1].value === '(') {
          let paramIndex = index + 2; const args = [];
          while (paramIndex < tokens.length && tokens[paramIndex].value !== ')') {
            const arg = parseExpression(paramIndex); args.push(arg); paramIndex = arg.nextIndex;
            if (paramIndex < tokens.length && tokens[paramIndex].value === ',') paramIndex++;
          }
          if (paramIndex >= tokens.length || tokens[paramIndex].value !== ')') throw new Error('Expected )');
          const funcDef = state.functions[currentIdentifierToken.value];
          if (funcDef) { /* ...型チェックなど... */ }
          return { type: 'function_call', name: currentIdentifierToken.value, arguments: args, nextIndex: paramIndex + 1,
            dataType: funcDef?.returnType || currentIdentifierToken.type };
        }
        else {
          const varInfo = state.variables[currentIdentifierToken.value];
          if (varInfo && varInfo.type !== Types.UNDEFINED && currentIdentifierToken.type !== Types.UNDEFINED && varInfo.type !== currentIdentifierToken.type) {
            console.warn(`Warning: Variable ${currentIdentifierToken.value} (type ${varInfo.type}) used with color ${currentIdentifierToken.color} (type ${currentIdentifierToken.type}).`);
          }
          return { type: 'variable', name: currentIdentifierToken.value, nextIndex: index + 1,
            dataType: varInfo?.type || currentIdentifierToken.type };
        }
      }
      
      if (['+', '-', '*', '/', '>', '>=', '<=', '<', '==', '='].includes(token.value)) {
        if (token.value === '=') {
          throw new Error(`Parser Error: Unexpected '=' operator. Assignments should be 'IDENTIFIER = EXPRESSION'.`);
        }
        if (token.value === '-' && (index + 1 < tokens.length && tokens[index+1].literalType === Types.NUMBER)) {
            const operand = parseExpression(index + 1);
            return { type: 'operation', operator: 'unary-', operand: operand, nextIndex: operand.nextIndex, dataType: Types.NUMBER };
        }
        // 中置演算子の不完全な処理 (前述の通り、大幅な再設計が必要)
        const left = parseExpression(index + 1); 
        const right = parseExpression(left.nextIndex);
        let resultType;
        if (['>', '>=', '<=', '<', '=='].includes(token.value)) { resultType = Types.BOOLEAN; }
        else if (token.value === '+' && (left.dataType === Types.STRING || right.dataType === Types.STRING)) { resultType = Types.STRING; }
        else if ([ '+', '-', '*', '/'].includes(token.value) && (left.dataType === Types.NUMBER && right.dataType === Types.NUMBER)) { resultType = Types.NUMBER; }
        else { resultType = Types.UNDEFINED; }
        return { type: 'operation', operator: token.value, left, right, nextIndex: right.nextIndex, dataType: resultType };
      }
      throw new Error(`Unexpected token: '${token.value}' (type: ${token.type}, color: ${token.color}) at index ${index}`);
    };

    const expressions = []; let i = 0;
    while (i < tokens.length) {
      if (tokens[i].value === ';') { i++; continue; }
      try {
        const expr = parseExpression(i); expressions.push(expr); i = expr.nextIndex;
      } catch (e) {
        throw new Error(`Parsing error near token '${tokens[i]?.value || 'end of input'}': ${e.message}`);
      }
      if (i < tokens.length && tokens[i].value === ';') i++;
    }
    return expressions;
  };

  // 評価処理
  const evaluate = (ast, env = { variables: { ...state.variables }, functions: { ...state.functions } }) => {
    const evaluateNode = (node, currentScope = env) => {
      if (!node || typeof node.type === 'undefined') {
          throw new Error(`Evaluation error: Invalid AST node encountered: ${JSON.stringify(node)}`);
      }
      const evalNumber = () => ({ value: node.value, type: Types.NUMBER });
      const evalBoolean = () => ({ value: node.value, type: Types.BOOLEAN });
      const evalString = () => ({ value: node.value, type: Types.STRING });
      const evalVariable = () => {
        if (!currentScope.variables.hasOwnProperty(node.name)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return { value: currentScope.variables[node.name].value, type: currentScope.variables[node.name].type };
      };
      
      const evalOperation = () => { /* ... (前回の演算処理を維持、単項マイナス含む) ... */
        let leftResult, rightResult;
        if (node.operator === 'unary-') {
            leftResult = { value: Fraction(0), type: Types.NUMBER };
            rightResult = evaluateNode(node.operand, currentScope);
        } else {
            leftResult = evaluateNode(node.left, currentScope);
            rightResult = evaluateNode(node.right, currentScope);
        }
        const checkTypes = (expectedLeft, expectedRight = expectedLeft) => {
            if (leftResult.type !== expectedLeft || (node.operator !== 'unary-' && rightResult.type !== expectedRight)) {
                if(node.operator === '+' && (leftResult.type === Types.STRING || rightResult.type === Types.STRING)) { /* 文字列結合は許容 */ }
                else { throw new Error(`Type error for operator '${node.operator}': Expected ${expectedLeft}/${expectedRight}, got ${leftResult.type}/${rightResult?.type}`); }
            }
        };
        switch (node.operator) {
          case '+':
            if (leftResult.type === Types.STRING || rightResult.type === Types.STRING) { return { value: String(leftResult.value.toString()) + String(rightResult.value.toString()), type: Types.STRING }; }
            checkTypes(Types.NUMBER); return { value: leftResult.value.add(rightResult.value), type: Types.NUMBER };
          case '-':
            if (node.operator === 'unary-') { checkTypes(Types.NUMBER, Types.NUMBER); return { value: Fraction(0).subtract(rightResult.value), type: Types.NUMBER }; }
            checkTypes(Types.NUMBER); return { value: leftResult.value.subtract(rightResult.value), type: Types.NUMBER };
          case '*': checkTypes(Types.NUMBER); return { value: leftResult.value.multiply(rightResult.value), type: Types.NUMBER };
          case '/':
            checkTypes(Types.NUMBER); if (rightResult.value.valueOf() === 0) throw new Error("Division by zero in evaluation.");
            return { value: leftResult.value.divide(rightResult.value), type: Types.NUMBER };
          case '>': checkTypes(Types.NUMBER); return { value: leftResult.value.greaterThan(rightResult.value), type: Types.BOOLEAN };
          case '>=': checkTypes(Types.NUMBER); return { value: leftResult.value.greaterThanOrEqual(rightResult.value), type: Types.BOOLEAN };
          case '<': checkTypes(Types.NUMBER); return { value: rightResult.value.greaterThan(leftResult.value), type: Types.BOOLEAN };
          case '<=': checkTypes(Types.NUMBER); return { value: rightResult.value.greaterThanOrEqual(leftResult.value), type: Types.BOOLEAN };
          case '==':
            if (leftResult.type !== rightResult.type) return { value: false, type: Types.BOOLEAN };
            if (leftResult.type === Types.NUMBER) { return { value: leftResult.value.equals(rightResult.value), type: Types.BOOLEAN }; }
            return { value: leftResult.value === rightResult.value, type: Types.BOOLEAN };
          default: throw new Error(`Unknown operator: ${node.operator}`);
        }
      };
      
      const evalAssignment = () => {
        const valueToAssign = evaluateNode(node.value, currentScope); // 右辺を評価
        const varDeclaredType = node.variableDataType; // 変数宣言時の型 (色に基づく)

        // --- デバッグログ追加 ---
        console.log(`[evalAssignment] Variable: '${node.variable}'`);
        console.log(`[evalAssignment] Declared Type (varDeclaredType from color): '${varDeclaredType}'`);
        console.log(`[evalAssignment] Value to Assign Type (valueToAssign.type): '${valueToAssign.type}'`);
        console.log(`[evalAssignment] Is varDeclaredType defined? ${varDeclaredType && varDeclaredType !== Types.UNDEFINED}`);
        console.log(`[evalAssignment] Is valueToAssign.type defined? ${valueToAssign.type !== Types.UNDEFINED}`);
        console.log(`[evalAssignment] Is varDeclaredType !== valueToAssign.type? ${varDeclaredType !== valueToAssign.type}`);
        // --- デバッグログここまで ---

        if (varDeclaredType && varDeclaredType !== Types.UNDEFINED && 
            valueToAssign.type !== Types.UNDEFINED && 
            varDeclaredType !== valueToAssign.type) {
          console.error(`[evalAssignment] Type mismatch! Throwing error.`); // エラー発生直前のログ
          throw new Error(`Type error: Cannot assign value of type ${valueToAssign.type} to variable '${node.variable}' which is declared as type ${varDeclaredType} (color).`);
        }

        // 変数スコープに値を設定。変数の型は宣言時の型(varDeclaredType)を維持する。
        currentScope.variables[node.variable] = { 
            type: varDeclaredType || valueToAssign.type, // 基本は宣言型。宣言型がUNDEFINEDなら値の型。
            value: valueToAssign.value 
        };
        if (!currentScope.variables[node.variable].type && node.variableDataType) { // もしvarDeclaredTypeが設定されていればそれを優先
            currentScope.variables[node.variable].type = node.variableDataType;
        }
        
        console.log(`[evalAssignment] Variable '${node.variable}' in scope after assignment:`, JSON.parse(JSON.stringify(currentScope.variables[node.variable])));
        return valueToAssign; // 代入式の結果は代入された値
      };
      
      const evalFunctionDefinition = () => ({ value: `Function ${node.name} defined.`, type: Types.STRING });
      const evalFunctionCall = () => { /* ... (前回の関数呼び出し処理を維持) ... */
        if (!currentScope.functions.hasOwnProperty(node.name) && !state.functions.hasOwnProperty(node.name)) {
            throw new Error(`Undefined function: ${node.name}`);
        }
        const func = currentScope.functions[node.name] || state.functions[node.name];
        if (func.params.length !== node.arguments.length) {
            throw new Error(`Function ${node.name} expects ${func.params.length} arguments, got ${node.arguments.length}`);
        }
        const fnScope = { variables: { ...currentScope.variables }, functions: { ...currentScope.functions, ...state.functions }};
        node.arguments.forEach((argNode, idx) => {
          const argResult = evaluateNode(argNode, currentScope);
          const paramDef = func.params[idx];
          if (paramDef.type !== Types.UNDEFINED && argResult.type !== Types.UNDEFINED && paramDef.type !== argResult.type) {
            throw new Error(`Type error for argument ${idx+1} ('${paramDef.name}') of function ${node.name}: Expected ${paramDef.type}, got ${argResult.type}`);
          }
          fnScope.variables[paramDef.name] = { value: argResult.value, type: argResult.type };
        });
        const result = evaluateNode(func.body, fnScope);
        if (func.returnType !== Types.UNDEFINED && result.type !== Types.UNDEFINED && func.returnType !== result.type) {
          throw new Error(`Type error: Function ${node.name} should return ${func.returnType}, but returned ${result.type}`);
        }
        return result;
      };
      
      const table = {
        number: evalNumber, boolean: evalBoolean, string: evalString, variable: evalVariable,
        operation: evalOperation, assignment: evalAssignment,
        function_definition: evalFunctionDefinition, function_call: evalFunctionCall,
      };
      if (!table[node.type]) throw new Error(`Unknown AST node type: ${node.type}`);
      return table[node.type]();
    };
    
    let lastResult;
    if (!Array.isArray(ast)) throw new Error("Evaluation error: AST is not an array.");
    ast.forEach((expressionNode) => { lastResult = evaluateNode(expressionNode, env); });
    return lastResult?.value;
  };

  const execute = (code) => {
    try {
      console.log("Executing code:", code);
      const tokens = tokenize(code);
      console.log("Tokens:", JSON.parse(JSON.stringify(tokens)));
      const ast = parse(tokens);
      console.log("AST:", JSON.parse(JSON.stringify(ast)));
      const result = evaluate(ast);
      console.log("Result:", result);
      console.log("Final state.variables:", JSON.parse(JSON.stringify(state.variables)));
      return result?.toString ? result.toString() : (result === undefined ? "実行完了" : result) ;
    } catch (err) {
      console.error("Execution error details:", err, err.stack); // スタックトレースも出力
      return `エラー: ${err.message}`;
    }
  };

  const resetState = () => { state.variables = {}; state.functions = {}; console.log("Interpreter state reset."); };
  return { ...state, tokenize, parse, evaluate, execute, resetState };
};

export const interpreter = createInterpreter();