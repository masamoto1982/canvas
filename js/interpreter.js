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
    // 型注釈のような :type 表記を削除 (canvas言語の仕様による)
    // code = code.replace(/\s*:\s*[a-zA-Z_]+\b/g, ''); // この行はcanvasの仕様に応じて要否を判断
    code = code.replace(/(\d+)\/(\d+)/g, '$1_FRAC_$2');

    const tokens = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    let tokenStartPos = 0; // トークンの開始位置を追跡 (今回は未使用だが将来的に有用)
    
    for (let i = 0; i < code.length; i++) {
      let consumedByMarker = false;
      // 色マーカーのチェック
      for (const marker of colorPositions) {
        if (i === marker.position) {
          if (current.trim()) { // マーカーの前にトークンがあれば確定
            tokens.push({
              value: current.trim(),
              type: ColorToType[currentColor] || Types.UNDEFINED, // 不明な色はUNDEFINED
              color: currentColor
            });
            current = '';
          }
          currentColor = marker.color;
          i += marker.length -1; // マーカー部分をスキップ
          consumedByMarker = true;
          tokenStartPos = i + 1;
          break; 
        }
      }
      if (consumedByMarker) continue;
      
      const char = code[i];
      
      if (inString) {
        if (char === stringChar && (i === 0 || code[i - 1] !== '\\')) { // エスケープ文字を考慮
          inString = false;
          current += char;
          tokens.push({
            value: current, // 文字列リテラルはtrimしない
            type: ColorToType[currentColor] || Types.STRING, // 文字列は通常青だが、マーカーによる
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
      } else if (['(', ')', ',', ';', ':'].includes(char)) { // ':' も区切り文字として扱う
        if (current.trim()) {
          tokens.push({
            value: current.trim(),
            type: ColorToType[currentColor] || Types.UNDEFINED,
            color: currentColor
          });
          current = '';
        }
        // ':' はトークンとしては現時点では不要かもしれないが、区切り文字として認識
        // if (char !== ':') { 
        tokens.push({
          value: char,
          type: ColorToType[currentColor] || Types.UNDEFINED, // 記号も色を持つ可能性がある
          color: currentColor
        });
        // }
        tokenStartPos = i + 1;
      } else {
        // 他の文字種（演算子など）もcurrentに追加していく
        // 演算子とオペランドが連続している場合（例: A+B）、ここで区切る必要がある
        const operators = ['+', '-', '*', '/', '>', '>=', '<=', '<', '==', '=']; // '<', '<=' を追加
        if (operators.includes(char.toString()) || (current.length > 0 && operators.includes(current[current.length-1]+char.toString())) ) { // 2文字演算子対応
             // 直前が演算子の一部でなく、かつcurrentが空でない場合、currentをトークン化
            if (current.trim() && !operators.includes(current.trim())) {
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = '';
            }
        }
         // 演算子自体もトークンとしてプッシュ、またはcurrentに追加して後でまとめて処理
        if (operators.includes(char.toString())) {
            if(current.trim() && !operators.includes(current.trim())) { // currentに識別子などがあれば先に処理
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED,
                    color: currentColor
                });
                current = '';
            }
            // 演算子が続く場合 (例: >=)
            if(current.length > 0 && operators.includes(current + char.toString())) {
                current += char; // >= のような2文字演算子のため
            } else if (current.length > 0 && operators.includes(current)) { // currentが既に演算子
                 tokens.push({
                    value: current.trim(),
                    type: ColorToType[currentColor] || Types.UNDEFINED, // 演算子の色も保持
                    color: currentColor
                });
                current = char.toString(); // 新しい演算子の開始
            }
             else { // currentが空か、演算子ではない
                current += char;
            }
        } else {
            // 演算子以外の文字で、かつcurrentの末尾が演算子だったら、その演算子をトークン化
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
        
        // 演算子はUNDEFINED型（黒色）として扱うというルールは維持しつつ、
        // トークン自体の色は保持しておく（デバッグや将来の拡張のため）
        if (['+', '-', '*', '/', '>', '>=', '<=', '<', '==', '='].includes(t.value)) {
          // t.type = Types.UNDEFINED; // 構文解析時に判断するため、ここでは元の色に基づく型を維持
          // t.color = 'black'; // 演算子のデフォルト色も維持
        }
        
        if (t.value === 'TRUE' || t.value === 'FALSE') {
          // 色情報とリテラルの整合性チェック（警告）
          if (t.type !== Types.BOOLEAN && t.type !== Types.UNDEFINED) { // UNDEFINEDは許容（黒字のTRUEなど）
            console.warn(`Warning: Boolean literal ${t.value} has color ${t.color} (type ${t.type}), expected boolean (red) or undefined (black).`);
          }
          t.literalType = Types.BOOLEAN; // リテラルとしての型情報を付与
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

  // 構文解析処理 - 色による型情報を活用
  const parse = (tokens) => {
    const parseExpression = (index) => {
      if (index >= tokens.length) throw new Error('Unexpected end of input at parseExpression start');
      const token = tokens[index];
      
      // 論理値リテラルの処理
      if (token.value === 'TRUE' || token.value === 'FALSE') {
        return { 
          type: 'boolean', 
          value: token.value === 'TRUE', 
          nextIndex: index + 1,
          dataType: token.literalType || Types.BOOLEAN // トークン化時に付与したリテラル型を使用
        };
      }
      
      // 数値の処理
      if (token.literalType === Types.NUMBER) { // リテラル型で判断
        let value;
        const isFraction = token.value.includes('/');
        if (isFraction) {
          const [n, d] = token.value.split('/').map(Number);
          value = Fraction(n, d, true); // isFractionOperation = true で simplify しない
        } else {
          value = Fraction(parseFloat(token.value), 1, false); // こちらは simplify する
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
      if (token.literalType === Types.STRING) { // リテラル型で判断
        return { 
          type: 'string', 
          value: token.value.slice(1, -1), // クォートを除去
          nextIndex: index + 1,
          dataType: Types.STRING
        };
      }
      
      // 変数・関数・代入の処理
      if (/^[A-Z][A-Z0-9_]*$/.test(token.value)) { // 識別子
        const currentIdentifierToken = token;

        // 代入文のチェック: IDENTIFIER = EXPRESSION
        if (index + 1 < tokens.length && tokens[index + 1].value === '=') {
          const varToken = currentIdentifierToken;
          const varName = varToken.value;

          if (index + 2 >= tokens.length) {
            throw new Error(`Invalid assignment: missing value for variable ${varName} after '='`);
          }

          const valueExpr = parseExpression(index + 2); // '=' の後の式を解析

          // 変数の型チェックと設定
          const assignedVarType = varToken.type !== Types.UNDEFINED ? varToken.type : valueExpr.dataType;
          if (state.variables[varName] && state.variables[varName].type !== Types.UNDEFINED && assignedVarType !== Types.UNDEFINED) {
            if (state.variables[varName].type !== assignedVarType) {
              throw new Error(`Type error: Cannot assign ${valueExpr.dataType} to variable ${varName} of type ${state.variables[varName].type}. It was declared with color ${varToken.color} (type ${varToken.type}).`);
            }
          }
          
          state.variables[varName] = {
            type: assignedVarType,
            value: null // 評価時に設定
          };
          
          return { 
            type: 'assignment', 
            variable: varName,
            variableDataType: varToken.type, // 変数宣言時の型(色)
            value: valueExpr, 
            nextIndex: valueExpr.nextIndex,
            dataType: valueExpr.dataType // 代入式自体の型は右辺の型
          };
        } 
        // 関数呼び出しの処理
        else if (index + 1 < tokens.length && tokens[index + 1].value === '(') {
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
          
          const funcDef = state.functions[currentIdentifierToken.value];
          if (funcDef) {
            if (funcDef.params.length !== args.length) {
              throw new Error(`Function ${currentIdentifierToken.value} expects ${funcDef.params.length} arguments, got ${args.length}`);
            }
            for (let i = 0; i < args.length; i++) {
              if (funcDef.params[i].type !== Types.UNDEFINED && 
                  args[i].dataType !== Types.UNDEFINED && 
                  funcDef.params[i].type !== args[i].dataType) {
                throw new Error(`Type error: Parameter ${i+1} ('${funcDef.params[i].name}') of function ${currentIdentifierToken.value} expects ${funcDef.params[i].type}, got ${args[i].dataType}`);
              }
            }
          }
          
          return { 
            type: 'function_call', 
            name: currentIdentifierToken.value, 
            arguments: args, 
            nextIndex: paramIndex + 1,
            dataType: funcDef?.returnType || currentIdentifierToken.type // 関数の戻り値の型、または識別子の色に基づく型
          };
        }
        // 通常の変数参照
        else {
          const varInfo = state.variables[currentIdentifierToken.value];
          // 変数参照時に、宣言された型と使用時の色が異なる場合は警告またはエラー
          if (varInfo && varInfo.type !== Types.UNDEFINED && 
              currentIdentifierToken.type !== Types.UNDEFINED && 
              varInfo.type !== currentIdentifierToken.type) {
            console.warn(`Warning: Variable ${currentIdentifierToken.value} (type ${varInfo.type}) used with color ${currentIdentifierToken.color} (type ${currentIdentifierToken.type}).`);
          }
          
          return { 
            type: 'variable', 
            name: currentIdentifierToken.value, 
            nextIndex: index + 1,
            dataType: varInfo?.type || currentIdentifierToken.type // 変数に格納された型、または識別子の色に基づく型
          };
        }
      }
      
      // 演算子の処理 (関数定義もここで処理する可能性がある)
      // 注意: ここでの '=' の扱いは、上記の識別子主導の代入処理があるため、
      // 通常の `VAR = VAL` 形式では到達しない。
      // もし `FUNC(PARAMS) = BODY` のような関数定義構文をこのパスで処理する場合、そのためのロジックが必要。
      if (['+', '-', '*', '/', '>', '>=', '<=', '<', '==', '='].includes(token.value)) {
        // 関数定義構文のチェック: IDENTIFIER (PARAMS) = BODY
        // これは現状のトークン列では IDENTIFIER が先頭に来るため、ここではなく識別子の処理ブロックで
        // '(' の次が '=' かどうかなどで判断する必要がある。
        // ここでは '=' が単独の演算子として現れる場合のみを想定するが、それは通常エラー。

        if (token.value === '=') {
          // `IDENTIFIER = EXPRESSION` は上で処理されるため、ここに到達する場合、
          // 通常は構文エラー。例えば `= TRUE` や `1 = 2` など。
          // もし `MY_FUNC(A) = A + 1` のような関数定義をここで処理するなら、
          // `token` の前に識別子とパラメータリストが解析済みである必要がある。
          // 現在の `parseExpression` の構造では、そのような前方参照は難しい。
          // 関数定義はキーワード (例: `DEF MY_FUNC(...) = ...`) を使うか、
          // より複雑なパーサー (例: Pratt) が必要。
          // ここでは、到達したらエラーとする。
          throw new Error(`Parser Error: Unexpected '=' operator. Assignments should be 'IDENTIFIER = EXPRESSION'. Function definitions might need a 'DEF' keyword or different parsing strategy.`);
        }

        // 二項演算の処理 (例: A + B, ここでは + A B のように前置演算子として解釈しようとしている)
        // この部分は中置演算子 (`A + B`) を正しく扱うためには、Prattパーサーのような
        // 演算子の優先順位を考慮した手法への変更が必要。
        // 現状は、`operator leftExpr rightExpr` のような構造を期待している。
        // 例: `+ X Y`
        // 簡易的な対応として、もしこれが式の先頭 (index=0) ならエラーとするか、
        // または、左辺が必須であると明確化する。
        // ここでは、このロジックが呼ばれるのは、主に `parse` のメインループから
        // `expressions.push(parseExpression(i))` で、`i` が演算子を指している場合。
        // これは中置演算のパーサーとしては不完全。

        if (index === 0 || !(['variable', 'number', 'string', 'boolean', 'function_call', 'operation'].includes(tokens[index-1]?.nodeType))) {
             // 左辺がない場合の前置演算子、または不正な演算子の使用
             // 単項演算子（例： -X）をサポートする場合は別途考慮
            if (token.value === '-' && (index + 1 < tokens.length && tokens[index+1].literalType === Types.NUMBER)) {
                // 単項マイナス演算子
                const operand = parseExpression(index + 1);
                 return {
                    type: 'operation',
                    operator: 'unary-',
                    operand: operand,
                    nextIndex: operand.nextIndex,
                    dataType: Types.NUMBER
                };
            }
            // throw new Error(`Operator '${token.value}' requires a left-hand side expression or is misplaced.`);
            // 現状のまま、OPERATOR LEFT RIGHT で進めてみる。
        }


        // このブロックは、`operator operand1 operand2` のような前置演算の解析を試みている。
        // `VALID = TRUE` のようなケースでは、ここには到達しないはず。
        // `A + B` のような中置演算の場合、現在のパーサーでは `A` `+` `B` と個別に解析され、
        // `+` がこのブロックに入り、`left = parseExpression(index + 1)` で `B` を取ろうとするなど、
        // 意図通りに動作しない。
        // **中置演算の完全なサポートには大幅なパーサーの再設計が必要**
        // ここでは、`VALID = TRUE` の修正に集中するため、このブロックの根本的な修正は見送る。

        const left = parseExpression(index + 1); // 左オペランド (実際には演算子の次の要素)
        const right = parseExpression(left.nextIndex); // 右オペランド

        let resultType;
        if (['>', '>=', '<=', '<', '=='].includes(token.value)) { // '<', '<='追加
          resultType = Types.BOOLEAN;
        } else if (token.value === '+' && (left.dataType === Types.STRING || right.dataType === Types.STRING)) {
          resultType = Types.STRING;
        } else if ([ '+', '-', '*', '/'].includes(token.value) && (left.dataType === Types.NUMBER && right.dataType === Types.NUMBER)) {
          resultType = Types.NUMBER;
        } else {
          // 型が一致しない、または未定義の演算の場合
          // throw new Error(`Type mismatch or invalid operation '${token.value}' between ${left.dataType} and ${right.dataType}`);
          resultType = Types.UNDEFINED; // 不明な場合はUNDEFINED
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
      
      throw new Error(`Unexpected token: '${token.value}' (type: ${token.type}, color: ${token.color}) at index ${index}`);
    };

    const expressions = [];
    let i = 0;
    while (i < tokens.length) {
      // セミコロンをステートメント区切りとして無視する (あるいはステートメントノードを作る)
      if (tokens[i].value === ';') {
        i++;
        continue;
      }
      try {
        const expr = parseExpression(i);
        expressions.push(expr);
        i = expr.nextIndex;
      } catch (e) {
        // parseExpression内でエラーが投げられた場合、ここでキャッチして情報を追加できる
        throw new Error(`Parsing error near token '${tokens[i]?.value || 'end of input'}': ${e.message}`);
      }
      // 次のトークンがセミコロンならスキップ (任意対応)
      if (i < tokens.length && tokens[i].value === ';') {
        i++;
      }
    }
    return expressions;
  };

  // 評価処理 - 型情報を維持しながら評価
  const evaluate = (ast, env = { variables: { ...state.variables }, functions: { ...state.functions } }) => {
    const evaluateNode = (node, currentScope = env) => {
      if (!node || typeof node.type === 'undefined') { // ノードが不正な場合はエラー
          throw new Error(`Evaluation error: Invalid AST node encountered: ${JSON.stringify(node)}`);
      }

      const evalNumber = () => ({ value: node.value, type: Types.NUMBER });
      const evalBoolean = () => ({ value: node.value, type: Types.BOOLEAN });
      const evalString = () => ({ value: node.value, type: Types.STRING });
      
      const evalVariable = () => {
        if (!currentScope.variables.hasOwnProperty(node.name)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        // 変数アクセス時に、その時点での型と値を返す
        return {
          value: currentScope.variables[node.name].value,
          type: currentScope.variables[node.name].type 
        };
      };
      
      const evalOperation = () => {
        let leftResult, rightResult;
        if (node.operator === 'unary-') {
            leftResult = { value: Fraction(0), type: Types.NUMBER }; // 単項マイナスは0から引くと見なす
            rightResult = evaluateNode(node.operand, currentScope);
        } else {
            leftResult = evaluateNode(node.left, currentScope);
            rightResult = evaluateNode(node.right, currentScope);
        }

        // 型チェックの強化
        const checkTypes = (expectedLeft, expectedRight = expectedLeft) => {
            if (leftResult.type !== expectedLeft || (node.operator !== 'unary-' && rightResult.type !== expectedRight)) {
                if(node.operator === '+' && (leftResult.type === Types.STRING || rightResult.type === Types.STRING)) {
                    // 文字列結合は許容
                } else {
                    throw new Error(`Type error for operator '${node.operator}': Expected ${expectedLeft}/${expectedRight}, got ${leftResult.type}/${rightResult?.type}`);
                }
            }
        };

        switch (node.operator) {
          case '+':
            if (leftResult.type === Types.STRING || rightResult.type === Types.STRING) {
              return { value: String(leftResult.value.toString()) + String(rightResult.value.toString()), type: Types.STRING };
            }
            checkTypes(Types.NUMBER);
            return { value: leftResult.value.add(rightResult.value), type: Types.NUMBER };
          case '-':
             if (node.operator === 'unary-') { // 単項マイナス
                checkTypes(Types.NUMBER, Types.NUMBER); // rightResult (operand) の型をチェック
                return { value: Fraction(0).subtract(rightResult.value), type: Types.NUMBER };
            }
            checkTypes(Types.NUMBER);
            return { value: leftResult.value.subtract(rightResult.value), type: Types.NUMBER };
          case '*':
            checkTypes(Types.NUMBER);
            return { value: leftResult.value.multiply(rightResult.value), type: Types.NUMBER };
          case '/':
            checkTypes(Types.NUMBER);
            if (rightResult.value.valueOf() === 0) throw new Error("Division by zero in evaluation.");
            return { value: leftResult.value.divide(rightResult.value), type: Types.NUMBER };
          case '>':
            checkTypes(Types.NUMBER);
            return { value: leftResult.value.greaterThan(rightResult.value), type: Types.BOOLEAN };
          case '>=':
            checkTypes(Types.NUMBER);
            return { value: leftResult.value.greaterThanOrEqual(rightResult.value), type: Types.BOOLEAN };
          case '<': // 追加
            checkTypes(Types.NUMBER);
            return { value: rightResult.value.greaterThan(leftResult.value), type: Types.BOOLEAN };
          case '<=': // 追加
            checkTypes(Types.NUMBER);
            return { value: rightResult.value.greaterThanOrEqual(leftResult.value), type: Types.BOOLEAN };
          case '==':
            // 異なる型同士の比較は基本的に false (またはエラーだが、ここでは JS のように振る舞う)
            if (leftResult.type !== rightResult.type) return { value: false, type: Types.BOOLEAN };
            if (leftResult.type === Types.NUMBER) {
                return { value: leftResult.value.equals(rightResult.value), type: Types.BOOLEAN };
            }
            return { value: leftResult.value === rightResult.value, type: Types.BOOLEAN };
          default:
            throw new Error(`Unknown operator: ${node.operator}`);
        }
      };
      
      const evalAssignment = () => {
        const valueToAssign = evaluateNode(node.value, currentScope); // 右辺を評価
        
        // 代入時の型チェック: 変数宣言時の色（型）と代入される値の型が一致するか
        const varDeclaredType = node.variableDataType; // 解析時に設定した変数の宣言型
        if (varDeclaredType && varDeclaredType !== Types.UNDEFINED && 
            valueToAssign.type !== Types.UNDEFINED && 
            varDeclaredType !== valueToAssign.type) {
          throw new Error(`Type error: Cannot assign value of type ${valueToAssign.type} to variable '${node.variable}' declared as type ${varDeclaredType}.`);
        }

        // 変数スコープに値を設定
        if (!currentScope.variables[node.variable]) { // もし未宣言ならグローバルstateにも反映(parseで既にやってるはず)
            state.variables[node.variable] = { type: valueToAssign.type, value: valueToAssign.value };
        }
        currentScope.variables[node.variable] = { 
            type: valueToAssign.type, // 値の型で変数の型を更新 (または宣言型を維持するポリシーも有り得る)
            value: valueToAssign.value 
        };
        
        return valueToAssign; // 代入式の結果は代入された値
      };
      
      const evalFunctionDefinition = () => {
        // 関数定義は state.functions に格納される (parse時に行われる想定)
        // ここでは特に何もしないか、成功メッセージを返す
        // currentScope.functions[node.name] = { ... } は parse 時
        return {
          value: `Function ${node.name} defined.`, // 評価時の結果としては文字列を返す
          type: Types.STRING 
        };
      };
      
      const evalFunctionCall = () => {
        if (!currentScope.functions.hasOwnProperty(node.name)) {
            // グローバル関数もチェック (もしあれば)
            if (!state.functions.hasOwnProperty(node.name)) {
                 throw new Error(`Undefined function: ${node.name}`);
            }
        }
        
        const func = currentScope.functions[node.name] || state.functions[node.name];
        if (func.params.length !== node.arguments.length) {
          throw new Error(`Function ${node.name} expects ${func.params.length} arguments, got ${node.arguments.length}`);
        }
        
        // 新しいスコープを作成して関数を実行
        const fnScope = { 
          variables: { ...currentScope.variables }, // 親スコープの変数を引き継ぐ (レキシカルスコープ)
          functions: { ...currentScope.functions, ...state.functions } // 関数も引き継ぐ
        };
        
        node.arguments.forEach((argNode, idx) => {
          const argResult = evaluateNode(argNode, currentScope); // 引数は現在のスコープで評価
          const paramDef = func.params[idx];
          
          // 引数の型チェック
          if (paramDef.type !== Types.UNDEFINED && argResult.type !== Types.UNDEFINED && paramDef.type !== argResult.type) {
            throw new Error(`Type error for argument ${idx+1} ('${paramDef.name}') of function ${node.name}: Expected ${paramDef.type}, got ${argResult.type}`);
          }
          
          fnScope.variables[paramDef.name] = { // 新しいスコープに仮引数を設定
            value: argResult.value,
            type: argResult.type // 引数の実際の型を使用
          };
        });
        
        const result = evaluateNode(func.body, fnScope); // 関数本体を新しいスコープで評価
        
        if (func.returnType !== Types.UNDEFINED && result.type !== Types.UNDEFINED && 
            func.returnType !== result.type) {
          throw new Error(`Type error: Function ${node.name} should return ${func.returnType}, but returned ${result.type}`);
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
        function_definition: evalFunctionDefinition, // 構文解析時に処理済みで、評価時はほぼ何もしない想定
        function_call: evalFunctionCall,
      };
      
      if (!table[node.type]) {
        throw new Error(`Unknown AST node type during evaluation: ${node.type}`);
      }
      
      return table[node.type]();
    };
    
    let lastResult;
    if (!Array.isArray(ast)) {
        throw new Error("Evaluation error: AST is not an array of expressions.");
    }
    ast.forEach((expressionNode) => {
      lastResult = evaluateNode(expressionNode, env);
    });
    
    return lastResult?.value; // 最後の式の評価結果を返す
  };

  const execute = (code) => {
    // 実行前にstateをリセット（オプション：毎回クリーンな状態から始める場合）
    // state.variables = {};
    // state.functions = {};
    // ただし、インタプリタインスタンスが再利用される場合、
    // このリセットは createInterpreter が返す execute の外側で行うか、
    // execute のオプションにするべき。現状はインスタンスが保持するstateを継続使用。

    try {
      console.log("Executing code:", code); // 渡された生のコードを表示
      
      const tokens = tokenize(code);
      console.log("Tokens:", JSON.parse(JSON.stringify(tokens))); // 循環参照を避けるためディープコピーしてログ出力
      
      const ast = parse(tokens);
      console.log("AST:", JSON.parse(JSON.stringify(ast))); // 同上
      
      const result = evaluate(ast); // evaluate は state.variables を直接変更する
      console.log("Result:", result);
      console.log("Final state.variables:", JSON.parse(JSON.stringify(state.variables)));
      
      return result?.toString ? result.toString() : (result === undefined ? "実行完了" : result) ;
    } catch (err) {
      console.error("Execution error details:", err);
      return `エラー: ${err.message}`; // スタックトレースはコンソールに出力
    }
  };

  // インタプリタの状態を外部からクリアするメソッド（オプション）
  const resetState = () => {
    state.variables = {};
    state.functions = {};
    console.log("Interpreter state reset.");
  };

  return { ...state, tokenize, parse, evaluate, execute, resetState /* オプションで追加 */ };
};

// インタープリタのインスタンスを作成 (シングルトンとしてエクスポート)
export const interpreter = createInterpreter();