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

  // トークン化処理 - 色情報を保持するよう修正
  const tokenize = (code) => {
    // 色のマーカーを探す (\u200B[color])
    const colorMarkerRegex = /\u200B\[(black|red|green|blue)\]/g;
    let currentColor = 'black'; // デフォルトの色
    
    // 色マーカー位置を記録
    const colorPositions = [];
    let match;
    while ((match = colorMarkerRegex.exec(code)) !== null) {
      colorPositions.push({
        position: match.index,
        color: match[1],
        length: match[0].length
      });
    }
    
    // コメントと特殊記法の処理
    code = code.replace(/#.*$/gm, '');
    code = code.replace(/\s*:\s*[a-zA-Z_]+\b/g, '');
    code = code.replace(/(\d+)\/(\d+)/g, '$1_FRAC_$2');

    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    // トークンごとに色情報を記録
    let tokenStartPos = 0;
    
    for (let i = 0; i < code.length; i++) {
      // 色マーカーのチェック
      for (const marker of colorPositions) {
        if (i === marker.position) {
          currentColor = marker.color;
          i += marker.length - 1; // マーカー部分をスキップ
          continue;
        }
      }
      
      const char = code[i];
      
      if (inString) {
        if (char === stringChar && code[i - 1] !== '\\') {
          inString = false;
          current += char;
          tokens.push({
            value: current,
            type: ColorToType[currentColor],
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
            type: ColorToType[currentColor],
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
            type: ColorToType[currentColor],
            color: currentColor
          });
          current = '';
        }
        tokenStartPos = i + 1;
      } else if (['(', ')', ',', ';', ':'].includes(char)) {
        if (current.trim()) {
          tokens.push({
            value: current.trim(),
            type: ColorToType[currentColor],
            color: currentColor
          });
          current = '';
        }
        if (char !== ':') {
          tokens.push({
            value: char,
            type: ColorToType[currentColor],
            color: currentColor
          });
        }
        tokenStartPos = i + 1;
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push({
        value: current.trim(),
        type: ColorToType[currentColor],
        color: currentColor
      });
    }

    // 特殊演算子と論理値の処理
    return tokens
      .filter(t => t.value.trim() !== '')
      .map(t => {
        // 分数表記の処理
        if (t.value.includes('_FRAC_')) {
          t.value = t.value.replace('_FRAC_', '/');
        }
        
        // 演算子は常に黒色（UNDEFINED型）として扱う
        if (['+', '-', '*', '/', '>', '>=', '==', '='].includes(t.value)) {
          t.type = Types.UNDEFINED;
          t.color = 'black';
        }
        
        // TRUE/FALSE リテラルの処理
        if (t.value === 'TRUE' || t.value === 'FALSE') {
          if (t.type !== Types.BOOLEAN && t.type !== Types.UNDEFINED) {
            console.warn(`Warning: Boolean literal ${t.value} should be marked as boolean type`);
          }
          t.literalType = 'boolean';
        }
        
        return t;
      });
  };

  // 構文解析処理 - 色による型情報を活用
  const parse = (tokens) => {
    const parseExpression = (index) => {
      if (index >= tokens.length) throw new Error('Unexpected end of input');
      const token = tokens[index];
      
      // 論理値リテラルの処理
      if (token.value === 'TRUE' || token.value === 'FALSE') {
        return { 
          type: 'boolean', 
          value: token.value === 'TRUE', 
          nextIndex: index + 1,
          dataType: Types.BOOLEAN
        };
      }
      
      // 数値の処理
      if (/^-?\d+(\.\d+)?$/.test(token.value) || /^-?\d+\/\d+$/.test(token.value)) {
        // 数値リテラルの型チェック
        if (token.type !== Types.NUMBER && token.type !== Types.UNDEFINED) {
          throw new Error(`Type error: Number literal ${token.value} is marked as ${token.type}`);
        }
        
        let value;
        const isFraction = token.value.includes('/');
        if (isFraction) {
          const [n, d] = token.value.split('/').map(Number);
          value = Fraction(n, d, true);
        } else {
          value = Fraction(parseFloat(token.value), 1, false);
        }
        return { 
          type: 'number', 
          value, 
          isFraction, 
          nextIndex: index + 1,
          dataType: Types.NUMBER
        };
      }
      
      // 文字列の処理
      if (/^["'].*["']$/.test(token.value)) {
        // 文字列リテラルの型チェック
        if (token.type !== Types.STRING && token.type !== Types.UNDEFINED) {
          throw new Error(`Type error: String literal ${token.value} is marked as ${token.type}`);
        }
        
        return { 
          type: 'string', 
          value: token.value.slice(1, -1), 
          nextIndex: index + 1,
          dataType: Types.STRING
        };
      }
      
      // 変数・関数の処理
      if (/^[A-Z][A-Z0-9_]*$/.test(token.value)) {
        // 関数呼び出しの処理
        if (index + 1 < tokens.length && tokens[index + 1].value === '(') {
          let paramIndex = index + 2;
          const args = [];
          while (paramIndex < tokens.length && tokens[paramIndex].value !== ')') {
            const arg = parseExpression(paramIndex);
            args.push(arg);
            paramIndex = arg.nextIndex;
            if (paramIndex < tokens.length && tokens[paramIndex].value === ',') paramIndex++;
          }
          
          if (paramIndex >= tokens.length || tokens[paramIndex].value !== ')') {
            throw new Error('Expected ) after function arguments');
          }
          
          // 関数呼び出し時の型チェック
          if (state.functions[token.value]) {
            const func = state.functions[token.value];
            // パラメータ数チェック
            if (func.params.length !== args.length) {
              throw new Error(`Function ${token.value} expects ${func.params.length} arguments, got ${args.length}`);
            }
            
            // パラメータの型チェック
            for (let i = 0; i < args.length; i++) {
              if (func.params[i].type !== Types.UNDEFINED && 
                  args[i].dataType !== Types.UNDEFINED && 
                  func.params[i].type !== args[i].dataType) {
                throw new Error(`Type error: Parameter ${i+1} of function ${token.value} expects ${func.params[i].type}, got ${args[i].dataType}`);
              }
            }
          }
          
          return { 
            type: 'function_call', 
            name: token.value, 
            arguments: args, 
            nextIndex: paramIndex + 1,
            dataType: state.functions[token.value]?.returnType || token.type
          };
        }
        
        // 変数の処理
        if (state.variables[token.value]) {
          // 変数の型チェック
          const varType = state.variables[token.value].type;
          if (varType !== Types.UNDEFINED && token.type !== Types.UNDEFINED && varType !== token.type) {
            throw new Error(`Type error: Variable ${token.value} is of type ${varType}, but used as ${token.type}`);
          }
        }
        
        return { 
          type: 'variable', 
          name: token.value, 
          nextIndex: index + 1,
          dataType: state.variables[token.value]?.type || token.type
        };
      }
      
      // 演算子の処理
      if (['+', '-', '*', '/', '>', '>=', '==', '='].includes(token.value)) {
        if (token.value === '=') {
          // 代入の処理
          if (index + 1 >= tokens.length) throw new Error('Invalid assignment expression: missing variable name');
          if (index + 2 >= tokens.length) throw new Error('Invalid assignment expression: missing value');
          
          const varToken = tokens[index + 1];
          const varName = varToken.value;
          
          // 関数定義の処理
          if (index + 2 < tokens.length && tokens[index + 2].value === '(' && 
              /^[A-Z][A-Z0-9_]*$/.test(varName)) {
            let paramIndex = index + 3;
            const params = [];
            
            while (paramIndex < tokens.length && tokens[paramIndex].value !== ')') {
              if (!/^[A-Z][A-Z0-9_]*$/.test(tokens[paramIndex].value)) {
                throw new Error(`Invalid parameter name: ${tokens[paramIndex].value}`);
              }
              
              params.push({
                name: tokens[paramIndex].value,
                type: tokens[paramIndex].type
              });
              
              paramIndex++;
              if (paramIndex < tokens.length && tokens[paramIndex].value === ',') paramIndex++;
            }
            
            if (paramIndex >= tokens.length || tokens[paramIndex].value !== ')') {
              throw new Error('Expected ) after function parameters');
            }
            
            const bodyExpr = parseExpression(paramIndex + 1);
            
            // 関数の戻り値の型を設定
            state.functions[varName] = { 
              params, 
              body: bodyExpr,
              returnType: varToken.type
            };
            
            return { 
              type: 'function_definition', 
              name: varName, 
              params, 
              body: bodyExpr, 
              nextIndex: bodyExpr.nextIndex,
              dataType: Types.UNDEFINED
            };
          }
          
          // 変数代入の処理
          const valueExpr = parseExpression(index + 2);
          
          // 変数の型チェック
          if (state.variables[varName]) {
            const existingType = state.variables[varName].type;
            if (existingType !== Types.UNDEFINED && 
                valueExpr.dataType !== Types.UNDEFINED && 
                existingType !== valueExpr.dataType) {
              throw new Error(`Type error: Cannot assign ${valueExpr.dataType} to variable ${varName} of type ${existingType}`);
            }
          }
          
          // 変数の型を設定/更新 - 変数名の色による型を優先
          state.variables[varName] = {
            type: varToken.type !== Types.UNDEFINED ? varToken.type : valueExpr.dataType,
            value: null // 評価時に設定
          };
          
          return { 
            type: 'assignment', 
            variable: varName, 
            value: valueExpr, 
            nextIndex: valueExpr.nextIndex,
            dataType: valueExpr.dataType
          };
        }
        
        // 二項演算の処理
        const left = parseExpression(index + 1);
        const right = parseExpression(left.nextIndex);
        
        // 演算子に応じた型チェック
        if (['+', '-', '*', '/'].includes(token.value)) {
          // 数値演算の場合
          if (token.value !== '+' && (left.dataType === Types.STRING || right.dataType === Types.STRING)) {
            throw new Error(`Type error: Cannot perform ${token.value} operation on string types`);
          }
          
          // '+'で文字列連結の場合を除いて型の一致を確認
          if (token.value !== '+' || (left.dataType !== Types.STRING && right.dataType !== Types.STRING)) {
            if (left.dataType !== right.dataType && 
                left.dataType !== Types.UNDEFINED && 
                right.dataType !== Types.UNDEFINED) {
              throw new Error(`Type error: Cannot perform ${token.value} operation on mixed types ${left.dataType} and ${right.dataType}`);
            }
          }
        } else if (['>', '>='].includes(token.value)) {
          // 比較演算子は数値型のみ
          if ((left.dataType !== Types.NUMBER && left.dataType !== Types.UNDEFINED) || 
              (right.dataType !== Types.NUMBER && right.dataType !== Types.UNDEFINED)) {
            throw new Error(`Type error: Comparison ${token.value} requires number types`);
          }
        }
        
        let resultType;
        if (['>', '>=', '=='].includes(token.value)) {
          resultType = Types.BOOLEAN;
        } else if (token.value === '+' && (left.dataType === Types.STRING || right.dataType === Types.STRING)) {
          resultType = Types.STRING;
        } else {
          resultType = left.dataType !== Types.UNDEFINED ? left.dataType : right.dataType;
        }
        
        return { 
          type: 'operation', 
          operator: token.value, 
          left, 
          right, 
          nextIndex: right.nextIndex,
          dataType: resultType
        };
      }
      
      throw new Error(`Unexpected token: ${token.value}`);
    };

    const expressions = [];
    let i = 0;
    while (i < tokens.length) {
      const expr = parseExpression(i);
      expressions.push(expr);
      i = expr.nextIndex;
      if (i < tokens.length && tokens[i].value === ';') i++;
    }
    return expressions;
  };

  // 評価処理 - 型情報を維持しながら評価
  const evaluate = (ast, env = { variables: state.variables, functions: state.functions }) => {
    const evaluateNode = (node, scope = env) => {
      const evalNumber = () => {
        // 数値ノードの評価
        return {
          value: node.value,
          type: Types.NUMBER
        };
      };
      
      const evalBoolean = () => {
        // 論理値ノードの評価
        return {
          value: node.value,
          type: Types.BOOLEAN
        };
      };
      
      const evalString = () => {
        // 文字列ノードの評価
        return {
          value: node.value,
          type: Types.STRING
        };
      };
      
      const evalVariable = () => {
        // 変数の評価
        if (!scope.variables.hasOwnProperty(node.name)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return {
          value: scope.variables[node.name].value,
          type: scope.variables[node.name].type
        };
      };
      
      const evalOperation = () => {
        // 演算の評価
        const leftResult = evaluateNode(node.left, scope);
        const rightResult = evaluateNode(node.right, scope);
        
        // 文字列連結の特別処理
        if (node.operator === '+' && (leftResult.type === Types.STRING || rightResult.type === Types.STRING)) {
          return {
            value: String(leftResult.value) + String(rightResult.value),
            type: Types.STRING
          };
        }
        
        // 論理演算の特別処理
        if (['&&', '||'].includes(node.operator) && 
            leftResult.type === Types.BOOLEAN && rightResult.type === Types.BOOLEAN) {
          let result;
          if (node.operator === '&&') {
            result = leftResult.value && rightResult.value;
          } else {
            result = leftResult.value || rightResult.value;
          }
          return {
            value: result,
            type: Types.BOOLEAN
          };
        }
        
        // 数値演算
        if (typeof leftResult.value === 'string' || typeof rightResult.value === 'string') {
          if (node.operator !== '+') {
            throw new Error(`Cannot apply operator ${node.operator} to strings`);
          }
          return {
            value: String(leftResult.value) + String(rightResult.value),
            type: Types.STRING
          };
        }
        
        // 分数演算
        const ops = {
          '+': (a, b) => a.add(b, false),
          '-': (a, b) => a.subtract(b, false),
          '*': (a, b) => a.multiply(b, false),
          '/': (a, b) => a.divide(b, true),
          '>': (a, b) => a.greaterThan(b),
          '>=': (a, b) => a.greaterThanOrEqual(b),
          '==': (a, b) => a.equals(b),
        };
        
        if (!ops[node.operator]) {
          throw new Error(`Unknown operator: ${node.operator}`);
        }
        
        try {
          const result = ops[node.operator](leftResult.value, rightResult.value);
          
          // 比較演算子は論理型を返す
          if (['>', '>=', '=='].includes(node.operator)) {
            return {
              value: result,
              type: Types.BOOLEAN
            };
          }
          
          return {
            value: result,
            type: Types.NUMBER
          };
        } catch (err) {
          throw new Error(`Operation error: ${err.message}`);
        }
      };
      
      const evalAssignment = () => {
        // 代入の評価
        const result = evaluateNode(node.value, scope);
        scope.variables[node.variable].value = result.value;
        
        // 変数の型を設定/更新
        if (scope.variables[node.variable].type === Types.UNDEFINED) {
          scope.variables[node.variable].type = result.type;
        }
        
        return result;
      };
      
      const evalFunctionDefinition = () => {
        // 関数定義の評価
        return {
          value: `Function ${node.name} defined`,
          type: Types.STRING
        };
      };
      
      const evalFunctionCall = () => {
        // 関数呼び出しの評価
        if (!scope.functions.hasOwnProperty(node.name)) {
          throw new Error(`Undefined function: ${node.name}`);
        }
        
        const func = scope.functions[node.name];
        if (func.params.length !== node.arguments.length) {
          throw new Error(`Expected ${func.params.length} arguments, got ${node.arguments.length}`);
        }
        
        const fnScope = { 
          variables: { ...scope.variables }, 
          functions: scope.functions 
        };
        
        // 引数を評価して関数スコープに設定
        node.arguments.forEach((arg, idx) => {
          const argResult = evaluateNode(arg, scope);
          fnScope.variables[func.params[idx].name] = {
            value: argResult.value,
            type: func.params[idx].type !== Types.UNDEFINED ? func.params[idx].type : argResult.type
          };
        });
        
        // 関数本体を評価
        const result = evaluateNode(func.body, fnScope);
        
        // 関数の戻り値の型チェック
        if (func.returnType !== Types.UNDEFINED && result.type !== Types.UNDEFINED && 
            func.returnType !== result.type) {
          throw new Error(`Type error: Function ${node.name} returns ${result.type}, expected ${func.returnType}`);
        }
        
        return result;
      };
      
      const table = {
        number: evalNumber,
        boolean: evalBoolean,
        string: evalString,
        variable: evalVariable,
        operation: evalOperation,
        assignment: evalAssignment,
        function_definition: evalFunctionDefinition,
        function_call: evalFunctionCall,
      };
      
      if (!table[node.type]) {
        throw new Error(`Unknown node type: ${node.type}`);
      }
      
      return table[node.type]();
    };
    
    let result;
    ast.forEach((ex) => {
      result = evaluateNode(ex, env);
    });
    
    return result?.value;
  };

  const execute = (code) => {
    try {
      // デバッグ情報の出力
      console.log("Executing code:", code.trim());
      
      // トークン化と構文解析
      const tokens = tokenize(code);
      console.log("Tokens:", tokens);
      
      const ast = parse(tokens);
      console.log("AST:", ast);
      
      const result = evaluate(ast);
      console.log("Result:", result);
      
      return result?.toString ? result.toString() : result;
    } catch (err) {
      console.error("Execution error:", err);
      return `Error: ${err.message}`;
    }
  };

  return { ...state, tokenize, parse, evaluate, execute };
};

// インタープリタのインスタンスを作成
export const interpreter = createInterpreter();