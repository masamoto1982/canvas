// Canvas言語の処理系
class CanvasLanguage {
  constructor() {
    this.environment = {
      variables: {}
    };
  }
  
  // コードを実行
  execute(code) {
    try {
      // トークンを抽出
      const tokens = this.tokenize(code);
      if (tokens.length === 0) {
        return { success: true, result: '' };
      }
      
      // パース
      const ast = this.parse(tokens);
      
      // 評価
      const result = this.evaluate(ast);
      
      return {
        success: true,
        result: this.formatResult(result)
      };
      
    } catch (error) {
      return {
        success: false,
        result: error.message
      };
    }
  }
  
  // トークン化（型付きトークンを処理）
  tokenize(code) {
    const tokens = [];
    const parts = code.trim().split(/\s+/);
    
    for (const part of parts) {
      const match = part.match(/^(number|string|variable|symbol|special):(.+)$/);
      if (match) {
        const [, type, value] = match;
        tokens.push({
          type,
          value: value === '\\n' ? '\n' : value,
          originalType: type
        });
      }
    }
    
    return tokens;
  }
  
  // パース（前置記法）
  parse(tokens) {
    const expressions = [];
    let position = 0;
    
    const parseExpression = () => {
      if (position >= tokens.length) return null;
      
      const token = tokens[position++];
      
      // 演算子の場合
      if (this.isOperator(token.value)) {
        const operator = token.value;
        const left = parseExpression();
        const right = parseExpression();
        
        if (!left || !right) {
          throw new Error(`演算子 '${operator}' には2つのオペランドが必要です`);
        }
        
        return {
          type: 'operation',
          operator,
          left,
          right
        };
      }
      
      // 代入の場合
      if (token.value === '=') {
        const variable = parseExpression();
        const value = parseExpression();
        
        if (!variable || variable.type !== 'identifier') {
          throw new Error('代入の左辺は変数である必要があります');
        }
        
        if (!value) {
          throw new Error('代入の右辺に値が必要です');
        }
        
        return {
          type: 'assignment',
          variable: variable.name,
          value
        };
      }
      
      // リテラル値
      return this.parseLiteral(token);
    };
    
    while (position < tokens.length) {
      const expr = parseExpression();
      if (expr) expressions.push(expr);
    }
    
    return expressions;
  }
  
  // リテラルをパース
  parseLiteral(token) {
    // 変数（大文字で始まる）
    if (token.originalType === 'variable' || /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
      return {
        type: 'identifier',
        name: token.value
      };
    }
    
    // 数値
    if (token.originalType === 'number' || /^-?\d+(\.\d+)?$/.test(token.value)) {
      const num = parseFloat(token.value);
      if (!isNaN(num)) {
        return {
          type: 'number',
          value: num
        };
      }
    }
    
    // 真偽値
    if (token.value === 'true' || token.value === 'false') {
      return {
        type: 'boolean',
        value: token.value === 'true'
      };
    }
    
    // 文字列
    if (token.originalType === 'string') {
      return {
        type: 'string',
        value: token.value
      };
    }
    
    // その他は文字列として扱う
    return {
      type: 'string',
      value: token.value
    };
  }
  
  // 評価
  evaluate(expressions) {
    let result = null;
    
    for (const expr of expressions) {
      result = this.evaluateExpression(expr);
    }
    
    return result;
  }
  
  // 式を評価
  evaluateExpression(expr) {
    switch (expr.type) {
      case 'number':
      case 'boolean':
      case 'string':
        return expr.value;
        
      case 'identifier':
        if (!(expr.name in this.environment.variables)) {
          throw new Error(`未定義の変数: ${expr.name}`);
        }
        return this.environment.variables[expr.name];
        
      case 'assignment':
        const value = this.evaluateExpression(expr.value);
        this.environment.variables[expr.variable] = value;
        return value;
        
      case 'operation':
        return this.evaluateOperation(expr);
        
      default:
        throw new Error(`不明な式のタイプ: ${expr.type}`);
    }
  }
  
  // 演算を評価
  evaluateOperation(expr) {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);
    
    switch (expr.operator) {
      // 算術演算
      case '+':
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        }
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        throw new Error(`型エラー: '+' 演算子は数値または文字列に使用します`);
        
      case '-':
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error(`型エラー: '-' 演算子は数値に使用します`);
        }
        return left - right;
        
      case '*':
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error(`型エラー: '*' 演算子は数値に使用します`);
        }
        return left * right;
        
      case '/':
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error(`型エラー: '/' 演算子は数値に使用します`);
        }
        if (right === 0) {
          throw new Error('ゼロ除算エラー');
        }
        return left / right;
        
      // 比較演算
      case '>':
        return left > right;
        
      case '>=':
        return left >= right;
        
      case '<':
        return left < right;
        
      case '<=':
        return left <= right;
        
      case '==':
        return left === right;
        
      case '!=':
        return left !== right;
        
      default:
        throw new Error(`不明な演算子: ${expr.operator}`);
    }
  }
  
  // 演算子かどうか判定
  isOperator(value) {
    return ['+', '-', '*', '/', '>', '>=', '<', '<=', '==', '!='].includes(value);
  }
  
  // 結果を整形
  formatResult(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') {
      // 整数の場合は小数点を表示しない
      return value % 1 === 0 ? value.toString() : value.toFixed(6).replace(/\.?0+$/, '');
    }
    return String(value);
  }
  
  // 環境をリセット
  reset() {
    this.environment.variables = {};
  }
  
  // デバッグ情報を取得
  getDebugInfo() {
    return {
      variables: { ...this.environment.variables }
    };
  }
}

// グローバルに公開
window.CanvasLanguage = CanvasLanguage;