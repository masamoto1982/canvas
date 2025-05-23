// Canvas言語のコア実装（トークナイザー、パーサー、インタープリター）

// トークナイザー
class Tokenizer {
  constructor() {
    this.tokens = [];
  }
  
  tokenize(editorElement) {
    this.tokens = [];
    this._extractTokens(editorElement);
    return this.tokens;
  }
  
  _extractTokens(node, currentColor = 'blue') {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (!text) return;
      
      const color = this._getNodeColor(node) || currentColor;
      const words = text.split(/\s+/);
      
      for (const word of words) {
        if (word) {
          this.tokens.push({
            value: word,
            color: color,
            type: ColorTypeMap[color] || Types.UNDEFINED
          });
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
      const nodeColor = this._getElementColor(node) || currentColor;
      for (const child of node.childNodes) {
        this._extractTokens(child, nodeColor);
      }
    }
  }
  
  _getNodeColor(node) {
    const parent = node.parentElement;
    return parent ? this._getElementColor(parent) : null;
  }
  
  _getElementColor(element) {
    const style = element.style.color;
    if (!style) return null;
    
    // RGB値から色名に変換
    for (const [name, hex] of Object.entries(CONSTANTS.EDITOR_COLORS)) {
      if (this._colorMatches(style, hex)) return name;
    }
    return null;
  }
  
  _colorMatches(color1, color2) {
    // 簡単な色比較（実際はより厳密な実装が必要）
    const normalize = (c) => c.toLowerCase().replace(/\s/g, '');
    return normalize(color1) === normalize(color2) || 
           this._rgbToHex(color1) === color2.toLowerCase();
  }
  
  _rgbToHex(rgb) {
    if (!rgb.startsWith('rgb')) return rgb;
    const match = rgb.match(/\d+/g);
    if (!match) return rgb;
    
    const [r, g, b] = match.map(Number);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
}

// パーサー
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }
  
  parse() {
    const expressions = [];
    while (!this.isAtEnd()) {
      const expr = this.parseExpression();
      if (expr) expressions.push(expr);
    }
    return expressions;
  }
  
  parseExpression() {
    const token = this.peek();
    if (!token) return null;
    
    // 演算子の処理（前置記法）
    if (this.isOperator(token.value)) {
      return this.parseOperation();
    }
    
    // 代入の処理
    if (token.value === '=') {
      return this.parseAssignment();
    }
    
    // リテラル値の処理
    return this.parseLiteral();
  }
  
  parseOperation() {
    const operator = this.consume();
    const left = this.parseExpression();
    const right = this.parseExpression();
    
    if (!left || !right) {
      throw new Error(`Syntax Error: Operator '${operator.value}' requires two operands`);
    }
    
    return {
      type: 'operation',
      operator: operator.value,
      left: left,
      right: right
    };
  }
  
  parseAssignment() {
    this.consume(); // '='を消費
    const varToken = this.peek();
    
    if (!varToken || varToken.type !== Types.SYMBOL) {
      throw new Error('Syntax Error: Expected variable name after "="');
    }
    
    const variable = this.consume();
    const value = this.parseExpression();
    
    if (!value) {
      throw new Error('Syntax Error: Expected value in assignment');
    }
    
    return {
      type: 'assignment',
      variable: variable.value,
      value: value
    };
  }
  
  parseLiteral() {
    const token = this.consume();
    
    switch (token.type) {
      case Types.NUMBER:
        return {
          type: 'literal',
          dataType: Types.NUMBER,
          value: Fraction.fromString(token.value)
        };
        
      case Types.BOOLEAN:
        return {
          type: 'literal',
          dataType: Types.BOOLEAN,
          value: token.value.toLowerCase() === 'true'
        };
        
      case Types.STRING:
        let value = token.value;
        // クォートの除去
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return {
          type: 'literal',
          dataType: Types.STRING,
          value: value
        };
        
      case Types.SYMBOL:
        return {
          type: 'variable',
          name: token.value
        };
        
      default:
        throw new Error(`Unknown token type: ${token.type}`);
    }
  }
  
  isOperator(value) {
    return ['+', '-', '*', '/', '>', '>=', '=='].includes(value);
  }
  
  peek() {
    return this.tokens[this.position] || null;
  }
  
  consume() {
    return this.tokens[this.position++];
  }
  
  isAtEnd() {
    return this.position >= this.tokens.length;
  }
}

// インタープリター
class Interpreter {
  constructor() {
    this.environment = {
      variables: {}
    };
  }
  
  execute(expressions) {
    let result;
    for (const expr of expressions) {
      result = this.evaluate(expr);
    }
    return result;
  }
  
  evaluate(node) {
    switch (node.type) {
      case 'literal':
        return node.value;
        
      case 'variable':
        if (!(node.name in this.environment.variables)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return this.environment.variables[node.name];
        
      case 'assignment':
        const value = this.evaluate(node.value);
        this.environment.variables[node.variable] = value;
        return value;
        
      case 'operation':
        return this.evaluateOperation(node);
        
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }
  
  evaluateOperation(node) {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);
    
    switch (node.operator) {
      // 算術演算
      case '+':
      case '-':
      case '*':
      case '/':
        if (!Fraction.isValid(left) || !Fraction.isValid(right)) {
          throw new Error(`Type Error: Arithmetic operations require numbers`);
        }
        
        switch (node.operator) {
          case '+': return left.add(right);
          case '-': return left.subtract(right);
          case '*': return left.multiply(right);
          case '/': return left.divide(right);
        }
        break;
        
      // 比較演算
      case '>':
      case '>=':
      case '==':
        // 型チェック
        const leftType = TypeChecker.getType(left);
        const rightType = TypeChecker.getType(right);
        
        if (leftType !== rightType) {
          throw new Error(`Type Error: Cannot compare different types`);
        }
        
        if (Fraction.isValid(left)) {
          switch (node.operator) {
            case '>': return left.greaterThan(right);
            case '>=': return left.greaterThanOrEqual(right);
            case '==': return left.equals(right);
          }
        } else {
          switch (node.operator) {
            case '>': return left > right;
            case '>=': return left >= right;
            case '==': return left === right;
          }
        }
        break;
        
      default:
        throw new Error(`Unknown operator: ${node.operator}`);
    }
  }
  
  reset() {
    this.environment.variables = {};
  }
  
  formatResult(value) {
    if (Fraction.isValid(value)) return value.toString();
    if (value === null || value === undefined) return 'undefined';
    return String(value);
  }
}

// 言語プロセッサー（統合インターフェース）
class CanvasLanguage {
  constructor() {
    this.tokenizer = new Tokenizer();
    this.interpreter = new Interpreter();
  }
  
  execute(editorElement) {
    try {
      // トークン化
      const tokens = this.tokenizer.tokenize(editorElement);
      if (tokens.length === 0) return "Empty input";
      
      // 型チェック
      this.validateTypes(tokens);
      
      // パース
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      // 実行
      const result = this.interpreter.execute(ast);
      
      // 結果のフォーマット
      return this.interpreter.formatResult(result);
      
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
  
  validateTypes(tokens) {
    for (const token of tokens) {
      // 演算子の型チェック
      if (['+', '-', '*', '/', '='].includes(token.value)) {
        if (token.type !== Types.NUMBER && token.type !== Types.SYMBOL) {
          throw new Error(`Type Error: Operator '${token.value}' must be Number (yellow) or Symbol (blue)`);
        }
      }
      
      // 数値リテラルの型チェック
      if (/^\d+(\.\d+)?$/.test(token.value) && token.type !== Types.NUMBER) {
        throw new Error(`Type Error: Numeric literal '${token.value}' must be Number type (yellow)`);
      }
      
      // 変数名の型チェック
      if (/^[A-Z][A-Z0-9_]*$/.test(token.value) && 
          token.type !== Types.SYMBOL &&
          !['true', 'false'].includes(token.value.toLowerCase())) {
        throw new Error(`Type Error: Variable name '${token.value}' must be Symbol type (blue)`);
      }
    }
  }
  
  reset() {
    this.interpreter.reset();
  }
}