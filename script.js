// --- 分数計算をサポートするクラス ---
const Fraction = (() => {
  const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      const aDecimals = (a.toString().split('.')[1] || '').length;
      const bDecimals = (b.toString().split('.')[1] || '').length;
      const factor = Math.pow(10, Math.max(aDecimals, bDecimals));
      a = Math.round(a * factor);
      b = Math.round(b * factor);
    }
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  const constructor = (numerator, denominator = 1, isFractionOperation = false) => {
    if (denominator === 0) throw new Error("Division by zero");
    const fraction = {};
    fraction.numerator = Number(numerator);
    fraction.denominator = Number(denominator);
    if (fraction.denominator < 0) {
      fraction.numerator *= -1;
      fraction.denominator *= -1;
    }
    if (!isFractionOperation) {
      const divisor = gcd(fraction.numerator, fraction.denominator);
      fraction.numerator /= divisor;
      fraction.denominator /= divisor;
    }
    fraction.add = (other, isFractionOp = true) => {
      const a = fraction;
      const b = other;
      const numerator = a.numerator * b.denominator + b.numerator * a.denominator;
      const denominator = a.denominator * b.denominator;
      return Fraction(numerator, denominator, isFractionOp);
    };
    fraction.subtract = (other, isFractionOp = true) => {
      const a = fraction;
      const b = other;
      const numerator = a.numerator * b.denominator - b.numerator * a.denominator;
      const denominator = a.denominator * b.denominator;
      return Fraction(numerator, denominator, isFractionOp);
    };
    fraction.multiply = (other, isFractionOp = true) => {
      const numerator = fraction.numerator * other.numerator;
      const denominator = fraction.denominator * other.denominator;
      return Fraction(numerator, denominator, isFractionOp);
    };
    fraction.divide = (other, isFractionOp = true) => {
      if (other.numerator === 0) throw new Error("Division by zero");
      const numerator = fraction.numerator * other.denominator;
      const denominator = fraction.denominator * other.numerator;
      return Fraction(numerator, denominator, isFractionOp);
    };
    fraction.equals = (other) => fraction.numerator * other.denominator === other.numerator * fraction.denominator;
    fraction.greaterThan = (other) => fraction.numerator * other.denominator > other.numerator * fraction.denominator;
    fraction.greaterThanOrEqual = (other) => fraction.numerator * other.denominator >= other.numerator * fraction.denominator;
    fraction.toString = () => (fraction.denominator === 1 ? String(fraction.numerator) : `${fraction.numerator}/${fraction.denominator}`);
    fraction.valueOf = () => fraction.numerator / fraction.denominator;
    return fraction;
  };

  constructor.fromString = (str, isFractionOp = false) => {
    if (str.includes('/')) {
      const [numerator, denominator] = str.split('/').map((s) => parseFloat(s.trim()));
      return constructor(numerator, denominator, true);
    }
    return constructor(parseFloat(str), 1, isFractionOp);
  };
  
  // 型チェックを追加
  constructor.isValidNumber = (value) => {
    return typeof value === 'object' && 
           value !== null && 
           'numerator' in value && 
           'denominator' in value;
  };
  
  return constructor;
})();

// 型の定義
const Types = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  SYMBOL: 'symbol',
  UNDEFINED: 'undefined'
};

// 色と型のマッピング
const ColorTypes = {
  'green': Types.NUMBER,
  'red': Types.BOOLEAN,
  'blue': Types.STRING,
  'black': Types.SYMBOL
};

// RGB値を色名に変換する関数
// RGB値を色名に変換する関数
const rgbToColorName = (rgb) => {
  // 特定のカラーコードを直接マッピング
  const exactColors = {
    '#FF4B00': 'red',    // 赤色 (Boolean型)
    '#03AF7A': 'green',  // 緑色 (Number型)
    '#005AFF': 'blue',   // 青色 (String型)
    // 必要に応じて他の色も追加
  };
  
  // 正確な16進カラーコードの場合は直接マッピング
  if (exactColors[rgb]) {
    return exactColors[rgb];
  }
  
  // RGB値の解析
  let r, g, b;
  
  if (rgb.startsWith('rgb')) {
    const matches = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (matches) {
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    }
  } else if (rgb.startsWith('#')) {
    const hex = rgb.substring(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }
  
  // 色覚障碍者に配慮した色の範囲判定
  // 赤系 (#FF4B00)
  if (r > 200 && g < 150 && b < 100) {
    return 'red';
  }
  // 緑系 (#03AF7A)
  else if (r < 100 && g > 100 && b < 150) {
    return 'green';
  }
  // 青系 (#005AFF)
  else if (r < 100 && g < 150 && b > 150) {
    return 'blue';
  }
  
  return 'black';
};

// トークナイザー - エディタのDOM内容から色情報付きトークンを抽出
const tokenize = (editor) => {
  if (!editor) return [];
  
  const tokens = [];
  
  // エディタのDOM内容を走査して色情報付きトークンを抽出
  const extractTokens = (node, currentColor = 'black') => {
    if (node.nodeType === Node.TEXT_NODE) {
      // テキストノードからトークンを抽出
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color
        ? rgbToColorName(node.parentNode.style.color)
        : currentColor;
      
      // 空白で区切ってトークンを抽出
      const parts = text.trim().split(/\s+/);
      for (const part of parts) {
        if (part) {
          tokens.push({
            value: part,
            color: color,
            type: ColorTypes[color] || Types.UNDEFINED
          });
        }
      }
    } else if (node.nodeName === 'BR') {
      // 改行は無視
    } else if (node.childNodes && node.childNodes.length > 0) {
      // 子ノードを再帰的に処理
      Array.from(node.childNodes).forEach(child => {
        const nodeColor = node.style && node.style.color 
          ? rgbToColorName(node.style.color) 
          : currentColor;
        extractTokens(child, nodeColor);
      });
    }
  };
  
  // エディタのルート要素から走査を開始
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });
  
  // コメントの削除（#から行末まで）
  const filteredTokens = [];
  let skipRestOfLine = false;
  
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value === '#') {
      skipRestOfLine = true;
    } else if (tokens[i].value.includes('\n')) {
      skipRestOfLine = false;
    }
    
    if (!skipRestOfLine) {
      filteredTokens.push(tokens[i]);
    }
  }
  
  return filteredTokens;
};

// パーサー - トークンからASTを構築
const parse = (tokens) => {
  let position = 0;
  
  const peek = () => tokens[position] || null;
  const consume = () => tokens[position++];
  const isAtEnd = () => position >= tokens.length;
  
  // 式をパース
  const parseExpression = () => {
    if (isAtEnd()) return null;
    
    const token = peek();
    
    // 演算子（前置記法）
    if (['+', '-', '*', '/', '>', '>=', '=='].includes(token.value)) {
      if (token.color !== 'green' && token.type !== Types.SYMBOL) {
        throw new Error(`Type Error: Operator '${token.value}' must be a Number type (green) or Symbol type (black), found ${token.color}`);
      }
      
      const operator = consume().value;
      const left = parseExpression();
      const right = parseExpression();
      
      if (!left || !right) {
        throw new Error(`Syntax Error: Operator '${operator}' requires two operands`);
      }
      
      return {
        type: 'operation',
        operator: operator,
        left: left,
        right: right
      };
    }
    
    // 代入（前置記法）
    if (token.value === '=') {
      consume(); // '='を消費
      
      const variableToken = peek();
      if (!variableToken || variableToken.color !== 'black' || !/^[A-Z][A-Z0-9_]*$/.test(variableToken.value)) {
        throw new Error(`Syntax Error: Expected variable name after '=', found ${variableToken ? variableToken.value : 'end of input'}`);
      }
      
      const variable = consume().value;
      const value = parseExpression();
      
      if (!value) {
        throw new Error(`Syntax Error: Expected value after variable name in assignment`);
      }
      
      return {
        type: 'assignment',
        variable: variable,
        value: value
      };
    }
    
    // 変数参照
    if (token.color === 'black' && /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
      return {
        type: 'variable',
        name: consume().value
      };
    }
    
    // リテラル値
    if (token.type === Types.NUMBER) {
      const value = consume().value;
      // 分数表記のチェック
      if (value.includes('/')) {
        const [numerator, denominator] = value.split('/').map(Number);
        if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
          throw new Error(`Invalid fraction: ${value}`);
        }
        return {
          type: Types.NUMBER,
          value: Fraction(numerator, denominator, true)
        };
      } else {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return {
          type: Types.NUMBER,
          value: Fraction(numValue, 1, false)
        };
      }
    }
    
    if (token.type === Types.BOOLEAN) {
      const value = consume().value.toLowerCase();
      return {
        type: Types.BOOLEAN,
        value: value === 'true'
      };
    }
    
    if (token.type === Types.STRING) {
      let value = consume().value;
      // 引用符があれば取り除く
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      return {
        type: Types.STRING,
        value: value
      };
    }
    
    throw new Error(`Unexpected token: ${token.value} with color ${token.color}`);
  };
  
  // プログラム全体のパース
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

// インタプリタ - ASTを評価
const interpreter = (() => {
  const environment = {
    variables: {},
    functions: {}
  };
  
  // 式の評価
  const evaluate = (ast) => {
    if (!ast) return null;
    
    // リテラル値
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }
    
    // 変数参照
    if (ast.type === 'variable') {
      if (!(ast.name in environment.variables)) {
        throw new Error(`Undefined variable: ${ast.name}`);
      }
      return environment.variables[ast.name];
    }
    
    // 代入
    if (ast.type === 'assignment') {
      const value = evaluate(ast.value);
      environment.variables[ast.variable] = value;
      return value;
    }
    
    // 演算
    if (ast.type === 'operation') {
      const left = evaluate(ast.left);
      const right = evaluate(ast.right);
      
      // 型チェック
      if (['+', '-', '*', '/'].includes(ast.operator)) {
        // 数値演算子の場合、両方のオペランドが数値型であることを確認
        if (!Fraction.isValidNumber(left) || !Fraction.isValidNumber(right)) {
          throw new Error(`Type Error: Operator '${ast.operator}' requires Number type (green) operands`);
        }
        
        // 演算の実行
        switch (ast.operator) {
          case '+': return left.add(right, false);
          case '-': return left.subtract(right, false);
          case '*': return left.multiply(right, false);
          case '/': 
            if (right.numerator === 0) {
              throw new Error('Division by zero');
            }
            return left.divide(right, true);
        }
      }
      
      // 比較演算子
      if (['>', '>=', '=='].includes(ast.operator)) {
        // 型の一致を確認
        const leftIsNumber = Fraction.isValidNumber(left);
        const rightIsNumber = Fraction.isValidNumber(right);
        const leftType = leftIsNumber ? Types.NUMBER : typeof left;
        const rightType = rightIsNumber ? Types.NUMBER : typeof right;
        
        if (leftType !== rightType) {
          throw new Error(`Type Error: Cannot compare values of different types (${leftType} vs ${rightType})`);
        }
        
        // 数値比較
        if (leftIsNumber && rightIsNumber) {
          switch (ast.operator) {
            case '>': return left.greaterThan(right);
            case '>=': return left.greaterThanOrEqual(right);
            case '==': return left.equals(right);
          }
        }
        
        // 文字列またはブール値の比較
        if (leftType === Types.STRING || leftType === Types.BOOLEAN) {
          switch (ast.operator) {
            case '==': return left === right;
            case '>': return left > right;
            case '>=': return left >= right;
          }
        }
      }
      
      throw new Error(`Unknown operator: ${ast.operator}`);
    }
    
    throw new Error(`Unknown AST node type: ${ast.type}`);
  };
  
  // プログラムの実行
  const execute = (program) => {
    let result;
    program.forEach(expr => {
      result = evaluate(expr);
    });
    return result;
  };
  
  // インタプリタの公開インターフェース
  return {
    execute: (editor) => {
      try {
        // エディタからトークンを抽出
        const tokens = tokenize(editor);
        if (tokens.length === 0) {
          return "Empty input";
        }
        
        // 厳格な型チェック - 演算子と数値の色をチェック
        tokens.forEach(token => {
          if (['+', '-', '*', '/'].includes(token.value) && token.color !== 'green') {
            throw new Error(`Type Error: Arithmetic operators must be Number type (green), found ${token.color} for '${token.value}'`);
          }
          
          if (!isNaN(parseFloat(token.value)) && token.color !== 'green') {
            throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
          }
        });
        
        // トークンからASTを構築
        const ast = parse(tokens);
        
        // ASTを評価
        const result = execute(ast);
        
        // 結果を文字列に変換して返す
        if (Fraction.isValidNumber(result)) {
          return result.toString();
        } else if (result === null || result === undefined) {
          return "undefined";
        } else {
          return String(result);
        }
      } catch (err) {
        return `Error: ${err.message}`;
      }
    },
    
    // 環境へのアクセスを提供（デバッグ用）
    getEnvironment: () => ({ ...environment })
  };
})();

// 以下は既存のUI関連関数
const CONFIG = {
    sensitivity: {
        hitRadius: 15,
        minSwipeDistance: 5,
        debounceTime: 50
    },
    timing: {
        multiStrokeTimeout: 500,
        doubleTapDelay: 300
    },
    layout: {
        dotSize: 40,
        dotGap: 20,
        gridRows: 5,
        gridCols: 5
    },
    visual: {
        detectedColor: '#fca5a5',
        feedbackSize: 120,
        feedbackTextSize: 60
    },
    behavior: {
        autoFocus: true,
    },
    recognition: {
        tolerance: 1
    }
};

const elements = {
    dotGrid: document.getElementById('dot-grid'),
    specialRow: document.getElementById('special-row'),
    lineCanvas: document.getElementById('line-canvas'),
    input: document.getElementById('txt-input'),
    d2dArea: document.getElementById('d2d-input'),
    output: document.getElementById('output'),
    executeButton: document.getElementById('execute-button'),
    clearButton: document.getElementById('clear-button'),
    outputSection: document.getElementById('output-section'),
    textSection: document.getElementById('text-section')
};

const drawState = {
    isActive: false,
    detectedDots: new Set(),
    totalValue: 0,
    startX: 0,
    startY: 0,
    lastStrokeTime: 0,
    lastDetectionTime: 0,
    currentStrokeDetected: false,
    strokeTimer: null,
    currentTouchId: null,
    pointerStartTime: 0,
    pointerStartX: 0,
    pointerStartY: 0,
    hasMoved: false,
    isDrawingMode: false,
    tapCheckTimer: null
};

const specialButtonState = {
    lastClickTime: 0,
    clickCount: 0,
    clickTarget: null,
    clickTimer: null,
    doubleClickDelay: CONFIG.timing.doubleTapDelay
};

const keyState = {
    deletePressed: false,
    spacePressed: false,
    lastPressTime: 0,
    maxTimeDiff: 300
};

const isMobileDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android/i.test(navigator.userAgent);
};

const focusOnInput = () => {
    if (elements.input) {
        elements.input.focus();
    }
};

const getColorCommand = (color) => {
    return `\u200B[${color}]`;
};

// カーソル位置を取得するヘルパー関数
const getCursorPosition = (element) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
};

// カーソル位置を設定するヘルパー関数
const setCursorPosition = (element, position) => {
    let charIndex = 0;
    let foundPosition = false;
    
    const traverseNodes = (node) => {
        if (foundPosition) return;
        
        if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.length;
            if (charIndex + nodeLength >= position) {
                const range = document.createRange();
                const selection = window.getSelection();
                
                range.setStart(node, position - charIndex);
                range.collapse(true);
                
                selection.removeAllRanges();
                selection.addRange(range);
                
                foundPosition = true;
            }
            charIndex += nodeLength;
        } else {
            for (let i = 0; i < node.childNodes.length && !foundPosition; i++) {
                traverseNodes(node.childNodes[i]);
            }
        }
    };
    
    traverseNodes(element);
    
    // 位置が見つからなかった場合はエディタの最後にカーソルを設定
    if (!foundPosition) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (element.lastChild) {
            if (element.lastChild.nodeType === Node.TEXT_NODE) {
                range.setStart(element.lastChild, element.lastChild.length);
            } else {
                range.setStartAfter(element.lastChild);
            }
        } else {
            range.setStart(element, 0);
        }
        
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};

const insertColoredText = (text, color) => {
    const editor = elements.input;
    if (!editor) return;
    
    // カラーコードのマッピング
    const colorCodes = {
      'red': '#FF4B00',
      'green': '#03AF7A',
      'blue': '#005AFF',
      'black': '#000000'
    };
    
    // エディタにフォーカスを当てる
    editor.focus();
    
    // 改行の場合は専用関数を使用
    if (text === '\n') {
        insertNewline();
        return;
    }
    
    // 正確なカラーコードを使用
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, colorCodes[color] || color);
    
    // テキストを挿入
    document.execCommand('insertText', false, text);
};

// 改行を挿入する専用関数
const insertNewline = () => {
    const editor = elements.input;
    if (!editor) return;
    
    // エディタにフォーカスを当てる
    editor.focus();
    
    // Range APIを使用して改行を挿入
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br = document.createElement('br');
        
        // 範囲を維持して改行を挿入
        range.deleteContents();
        range.insertNode(br);
        
        // カーソルを改行の後ろに移動
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // カーソルが見えるようにスクロール
        br.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // 選択範囲がない場合はHTML挿入
        document.execCommand('insertHTML', false, '<br><br>');
    }
};

const insertColorChange = (color) => {
    const editor = elements.input;
    if (!editor) return;
    
    // 色を変更し、空白を挿入
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    document.execCommand('insertText', false, ' ');
};

const insertAtCursor = (text) => {
    const editor = elements.input;
    if (!editor) return;
    
    // 空白文字の場合は色を黒に変更
    if (text === ' ') {
        const currentColorBtn = document.querySelector('.color-btn.active');
        if (currentColorBtn) {
            currentColorBtn.classList.remove('active');
        }
        editor.style.caretColor = 'black';
        insertColoredText(text, 'black');
    } else {
        const currentActiveColor = document.querySelector('.color-btn.active')?.dataset.color || 'black';
        insertColoredText(text, currentActiveColor);
    }
    
    if (isMobileDevice()) showTextSection();
    focusOnInput();
};

const clearInput = () => {
    if (elements.input) {
        elements.input.innerHTML = '';
        focusOnInput();
    }
};

const showTextSection = () => {
    if (isMobileDevice() && elements.textSection && elements.outputSection) {
        elements.outputSection.classList.add('hide');
        elements.textSection.classList.remove('hide');
        focusOnInput();
    }
};

const showOutputSection = () => {
    if (isMobileDevice() && elements.textSection && elements.outputSection) {
        elements.textSection.classList.add('hide');
        elements.outputSection.classList.remove('hide');
    }
};

const clearCanvas = () => {
    const lineCtx = elements.lineCanvas ? elements.lineCanvas.getContext('2d') : null;
    if (lineCtx && elements.lineCanvas) {
        lineCtx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);
    }
};

const resetDrawState = (keepActive = false) => {
    drawState.isActive = keepActive;
    if (drawState.detectedDots.size > 0) {
        drawState.detectedDots.forEach(dot => dot.classList.remove('detected'));
        drawState.detectedDots.clear();
    }
    drawState.totalValue = 0;
    drawState.currentStrokeDetected = false;
    drawState.hasMoved = false;
    drawState.isDrawingMode = false;
    if (!keepActive) drawState.lastStrokeTime = 0;
    clearTimeout(drawState.strokeTimer);
    drawState.strokeTimer = null;
};

const recognizeLetter = (totalValue) => {
    if (letterPatterns.hasOwnProperty(totalValue)) {
        console.log(`認識成功 (完全一致): 値=${totalValue}, 文字=${letterPatterns[totalValue]}`);
        return letterPatterns[totalValue];
    }

    if (CONFIG.recognition.tolerance > 0 && totalValue > 0) {
        let bestMatch = null;

        for (const patternValueStr in letterPatterns) {
            const patternValue = parseInt(patternValueStr, 10);
            const diff = totalValue ^ patternValue;

            const isPowerOfTwo = (diff > 0) && ((diff & (diff - 1)) === 0);

            if (isPowerOfTwo) {
                if (CONFIG.recognition.tolerance === 1) {
                    console.log(`認識成功 (寛容性): 入力=${totalValue}, パターン=${patternValue}, 文字=${letterPatterns[patternValue]}, 差分=${diff}`);
                    bestMatch = letterPatterns[patternValue];
                    break;
                }
            }
        }
        if (bestMatch) {
            return bestMatch;
        }
    }

    console.log(`認識失敗: 値=${totalValue}`);
    return null;
};

const showRecognitionFeedback = (character) => {
    if (!elements.d2dArea || !character) return;
    const fb = document.createElement('div');
    fb.className = 'recognition-feedback';
    fb.textContent = character;
    elements.d2dArea.appendChild(fb);
    setTimeout(() => fb.remove(), 800);
};

const endDrawing = () => {
    if (!drawState.isActive) return;
    const now = Date.now();

    if (drawState.currentStrokeDetected) {
        clearTimeout(drawState.strokeTimer);

        drawState.strokeTimer = setTimeout(() => {
            if (drawState.detectedDots.size > 0 && drawState.totalValue > 0) {
                const rec = recognizeLetter(drawState.totalValue);
                if (rec) {
                    insertAtCursor(rec);
                    showRecognitionFeedback(rec);
                }
                resetDrawState();
                clearCanvas();
                drawState.lastStrokeTime = 0;
            } else {
                 resetDrawState();
                 clearCanvas();
                 drawState.lastStrokeTime = 0;
            }
            drawState.strokeTimer = null;
        }, CONFIG.timing.multiStrokeTimeout);
    } else if (!drawState.strokeTimer) {
         resetDrawState();
         clearCanvas();
         drawState.lastStrokeTime = 0;
    }
     drawState.lastStrokeTime = now;
};

const addDetectedDot = (dot) => {
    if (!dot || drawState.detectedDots.has(dot)) return;
    dot.classList.add('detected');
    drawState.detectedDots.add(dot);
    drawState.currentStrokeDetected = true;
    const v = parseInt(dot.dataset.value, 10);
    if (!isNaN(v)) {
        drawState.totalValue += v;
    }
    clearTimeout(drawState.strokeTimer);
    drawState.strokeTimer = null;
};

const detectDot = (x, y) => {
    if (!drawState.isActive || !elements.dotGrid) return;
    const now = Date.now();
    if (now - drawState.lastDetectionTime < CONFIG.sensitivity.debounceTime) return;
    drawState.lastDetectionTime = now;

    const hitRadius = CONFIG.sensitivity.hitRadius;
    elements.d2dArea.querySelectorAll('.dot').forEach(dot => {
        if (drawState.detectedDots.has(dot)) return;
        const r = dot.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(x - cx, y - cy);

        if (dist <= hitRadius) {
            addDetectedDot(dot);
            clearTimeout(drawState.strokeTimer);
            drawState.strokeTimer = null;
            drawState.lastStrokeTime = Date.now();
        }
    });
};

const startDrawing = (dotEl, x, y) => {
    const isGridDot = dotEl.closest('#dot-grid');
    const isZeroDot = dotEl.closest('#special-row') && dotEl.dataset.digit === '0';
    if (!dotEl || !dotEl.classList.contains('dot') || (!isGridDot && !isZeroDot)) return;

    const now = Date.now();
    if (!drawState.isActive || now - drawState.lastStrokeTime > CONFIG.timing.multiStrokeTimeout) {
        resetDrawState(true);
    }
    drawState.isActive = true;
    drawState.isDrawingMode = true;
    drawState.startX = x;
    drawState.startY = y;
    drawState.lastDetectionTime = now;
    drawState.lastStrokeTime = now;

    addDetectedDot(dotEl);
    
    clearTimeout(drawState.strokeTimer);
    drawState.strokeTimer = null;
};

// 削除処理 - 単純化版
const handleDeleteAction = (deleteToken = false) => {
    const editor = elements.input;
    if (!editor) return;
    
    if (deleteToken) {
        // トークン削除モード
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // 現在のカーソル位置を取得
        const cursorPosition = getCursorPosition(editor);
        if (cursorPosition === 0) return;
        
        // テキスト全体を取得
        const fullText = editor.textContent || '';
        
        // トークンの範囲を見つける
        let tokenStart = cursorPosition;
        let foundWord = false;
        
        while (tokenStart > 0) {
            const char = fullText.charAt(tokenStart - 1);
            if (char === ' ' || char === '\n') {
                if (foundWord) break;
            } else {
                foundWord = true;
            }
            tokenStart--;
        }
        
        // 直前の空白も削除
        let spaceStart = tokenStart;
        while (spaceStart > 0) {
            const char = fullText.charAt(spaceStart - 1);
            if (char === ' ' || char === '\n') {
                spaceStart--;
            } else {
                break;
            }
        }
        
        // 削除範囲の選択
        const range = selection.getRangeAt(0);
        const startNode = editor.firstChild;
        
        if (startNode) {
            // カーソル位置から削除範囲の分だけ戻る
            const selection = window.getSelection();
            selection.removeAllRanges();
            
            // テキストノードを探索して範囲を設定
            let currentPos = 0;
            const setRange = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const nodeLength = node.length;
                    if (currentPos <= spaceStart && spaceStart < currentPos + nodeLength) {
                        // 削除開始位置
                        range.setStart(node, spaceStart - currentPos);
                    }
                    if (currentPos <= cursorPosition && cursorPosition <= currentPos + nodeLength) {
                        // 削除終了位置
                        range.setEnd(node, cursorPosition - currentPos);
                        return true;
                    }
                    currentPos += nodeLength;
                } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        if (setRange(node.childNodes[i])) return true;
                    }
                }
                return false;
            };
            
            setRange(editor);
            selection.addRange(range);
            document.execCommand('delete', false);
        }
    } else {
        // 一文字削除 - シンプルにdomの削除機能を使用
        document.execCommand('delete', false);
    }
    
    focusOnInput();
    if (isMobileDevice()) showTextSection();
};

const findLastTextNode = (element) => {
    if (element.nodeType === Node.TEXT_NODE) return element;
    
    for (let i = element.childNodes.length - 1; i >= 0; i--) {
        const lastNode = findLastTextNode(element.childNodes[i]);
        if (lastNode) return lastNode;
    }
    
    return null;
};

// 新しいexecuteCode関数 - インタプリタを使用
const executeCode = () => {
    const editor = elements.input;
    if (!editor) return;
    
    // インタプリタを使って実行
    const result = interpreter.execute(editor);
    
    if (elements.output) {
        elements.output.value = result;
        
        // エラーが発生しなかった場合
        if (!result.startsWith('Error:')) {
            // 出力に成功の視覚的フィードバックを適用
            elements.output.classList.add('executed');
            setTimeout(() => elements.output.classList.remove('executed'), 300);
            
            // 実行成功時にエディタを初期化
            editor.innerHTML = '';
        }
    }
    
    showOutputSection();
    focusOnInput();
};

// 特殊ボタンのイベントリスナー設定 - シンプル化
const handleSpecialButtonClick = (e, type, actions) => {
    if (e && e.preventDefault) e.preventDefault();
    const now = Date.now();
    
    // ダブルクリック検出
    if (specialButtonState.clickTarget === type &&
        now - specialButtonState.lastClickTime < specialButtonState.doubleClickDelay) {
        clearTimeout(specialButtonState.clickTimer);
        specialButtonState.clickCount = 0;
        specialButtonState.clickTarget = null;
        specialButtonState.clickTimer = null;
        
        // ダブルクリックアクション
        if (actions.double) {
            actions.double();
            // 視覚的フィードバック
            if (e.target) {
                e.target.classList.add('double-clicked');
                setTimeout(() => e.target.classList.remove('double-clicked'), 200);
            }
        }
    } else {
        // シングルクリック処理
        specialButtonState.clickCount = 1;
        specialButtonState.lastClickTime = now;
        specialButtonState.clickTarget = type;
        
        clearTimeout(specialButtonState.clickTimer);
        specialButtonState.clickTimer = setTimeout(() => {
            if (specialButtonState.clickCount === 1 && specialButtonState.clickTarget === type) {
                if (actions.single) {
                    actions.single();
                    // 視覚的フィードバック
                    if (e.target) {
                        e.target.classList.add('clicked');
                        setTimeout(() => e.target.classList.remove('clicked'), 200);
                    }
                }
            }
            specialButtonState.clickCount = 0;
            specialButtonState.clickTarget = null;
            specialButtonState.clickTimer = null;
        }, specialButtonState.doubleClickDelay);
    }
};

const setupKeyboardHandlers = () => {
    document.addEventListener('keydown', (e) => {
        if (e.target === elements.input || e.target === elements.output) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handleDeleteAction(e.ctrlKey || e.metaKey);
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            insertAtCursor(' ');
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                executeCode();
            } else {
                insertAtCursor('\n');
            }
        }
    });
};

const handlePointerDown = (e, el) => {
    if (!e || !el) return;
    if (e.target !== elements.input && e.target !== elements.output) {
        if (e.preventDefault) e.preventDefault();
    }

    drawState.currentTouchId = e.pointerId;
    drawState.pointerStartX = e.clientX;
    drawState.pointerStartY = e.clientY;
    drawState.hasMoved = false;

    try {
        if (el.setPointerCapture && !el.hasPointerCapture(e.pointerId)) {
            el.setPointerCapture(e.pointerId);
        }
    } catch (err) {
        console.log("Pointer capture not supported or failed:", err);
    }

    if (isMobileDevice()) showTextSection();

    const isDot = el.classList.contains('dot');
    const isSpecialButton = el.classList.contains('special-button') && !isDot;
   
    clearTimeout(drawState.tapCheckTimer);
    drawState.tapCheckTimer = setTimeout(() => {
        if (!drawState.hasMoved) {
            const digit = el.dataset.digit;
            const word = el.dataset.word;

            if (digit || word) {
                insertAtCursor(digit || word);
                el.classList.add('tapped-feedback');
                setTimeout(() => el.classList.remove('tapped-feedback'), 200);
                resetDrawState();
                clearCanvas();
            } else if (isDot) {
                resetDrawState();
                clearCanvas();
            }
        }
        drawState.tapCheckTimer = null;
    }, 200);

    if (isDot) {
        const now = Date.now();
        if (!drawState.isActive || now - drawState.lastStrokeTime > CONFIG.timing.multiStrokeTimeout) {
            resetDrawState(true);
        }
        drawState.isActive = true;
        drawState.startX = e.clientX;
        drawState.startY = e.clientY;
        drawState.lastDetectionTime = now;
        drawState.lastStrokeTime = now;
         
        addDetectedDot(el);
         
        clearTimeout(drawState.strokeTimer);
        drawState.strokeTimer = null;
    } else {
        resetDrawState();
        clearCanvas();
    }
};

const handlePointerMove = (e) => {
    if (!drawState.isActive || e.pointerId !== drawState.currentTouchId) return;

    const dx = e.clientX - drawState.pointerStartX;
    const dy = e.clientY - drawState.pointerStartY;
    const distance = Math.hypot(dx, dy);

    if (distance >= CONFIG.sensitivity.minSwipeDistance) {
        if (!drawState.hasMoved) {
            drawState.hasMoved = true;
            clearTimeout(drawState.tapCheckTimer);
            drawState.tapCheckTimer = null;
            const startElement = document.elementFromPoint(drawState.pointerStartX, drawState.pointerStartY);
            if (startElement && startElement.classList.contains('dot')) {
                drawState.isDrawingMode = true;
            }
        }
        
        if (drawState.isDrawingMode) {
            detectDot(e.clientX, e.clientY);
        }
    }
};

const handlePointerUp = (e) => {
    if (e.pointerId !== drawState.currentTouchId) return;
    
    try {
        const el = e.target;
        if (el && el.releasePointerCapture && el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
    } catch (err) {
        console.log("Error releasing pointer capture:", err);
    }
    
    if (drawState.tapCheckTimer) {
        clearTimeout(drawState.tapCheckTimer);
        drawState.tapCheckTimer = null;
        
        const el = e.target;
        if (el && el.classList.contains('dot') && !el.dataset.digit && !el.dataset.word) {
            resetDrawState();
            clearCanvas();
        }
    }
   
    if (drawState.isActive && (drawState.isDrawingMode || drawState.currentStrokeDetected)) {
        endDrawing();
    } else {
        resetDrawState();
        clearCanvas();
    }
    
    drawState.currentTouchId = null;
    focusOnInput();
};

const setupMultiTouchSupport = () => {
    if (isMobileDevice() && elements.d2dArea) {
        elements.d2dArea.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        elements.d2dArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
};

const setupDotEventListeners = () => {
    if (!elements.d2dArea) return;
    elements.d2dArea.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('dot')) {
            handlePointerDown(e, e.target);
        }
    }, { passive: false });
};

// 空白/改行ボタンのイベントリスナー修正
const setupSpecialButtonListeners = () => {
    const deleteBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="delete"]') : null;
    const spaceBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="space"]') : null;

    if (deleteBtn) {
        // 削除ボタンの処理
        deleteBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'delete', {
            single: () => handleDeleteAction(false),
            double: () => handleDeleteAction(true)
        }));
        deleteBtn.addEventListener('pointerdown', e => e.preventDefault());
    }

    if (spaceBtn) {
        // 空白/改行ボタンの処理
        spaceBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'space', {
            single: () => {
                // シングルクリック: 空白挿入（黒色に変更）
                const editor = elements.input;
                if (editor) {
                    const currentActiveColorBtn = document.querySelector('.color-btn.active');
                    if (currentActiveColorBtn) {
                        currentActiveColorBtn.classList.remove('active');
                    }
                    // 黒色に切り替え
                    editor.style.caretColor = 'black';
                    insertAtCursor(' ');
                }
            },
            double: () => {
                // ダブルクリック: 改行挿入
                insertNewline();
            }
        }));
        spaceBtn.addEventListener('pointerdown', e => e.preventDefault());
    }
};

const setupExecuteButtonListener = () => {
    if (elements.executeButton) {
        elements.executeButton.addEventListener('click', executeCode);
    }
};

const setupClearButtonListener = () => {
    if (elements.clearButton) {
        elements.clearButton.addEventListener('click', clearInput);
    }
};

const resizeCanvas = () => {
    const d2dArea = elements.d2dArea;
    const canvas = elements.lineCanvas;
    if (!d2dArea || !canvas) return;
    const rect = d2dArea.getBoundingClientRect();
    const style = window.getComputedStyle(d2dArea);
    const pl = parseFloat(style.paddingLeft) || 0;
    const pr = parseFloat(style.paddingRight) || 0;
    const pt = parseFloat(style.paddingTop) || 0;
    const pb = parseFloat(style.paddingBottom) || 0;
    
    canvas.width = d2dArea.clientWidth - pl - pr;
    canvas.height = d2dArea.clientHeight - pt - pb;
    canvas.style.left = `${pl}px`;
    canvas.style.top = `${pt}px`;

    clearCanvas();
};

const setupGestureListeners = () => {
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
};

const updateConfigStyles = () => {
    const existing = document.getElementById('dynamic-config-styles');
    if (existing) existing.remove();
    const s = document.createElement('style');
    s.id = 'dynamic-config-styles';
    s.textContent = `
        #dot-grid {
             gap: ${CONFIG.layout.dotGap}px;
        }
        .dot-row {
            gap: ${CONFIG.layout.dotGap}px;
        }
        .dot {
            width: ${CONFIG.layout.dotSize}px;
            height: ${CONFIG.layout.dotSize}px;
            font-size: ${CONFIG.layout.dotSize * 0.4}px;
        }
        .dot.detected {
            background-color: ${CONFIG.visual.detectedColor};
            border-color: ${CONFIG.visual.detectedColor};
        }
        .special-button {
             padding: 0 ${CONFIG.layout.dotSize * 0.3}px;
             height: ${CONFIG.layout.dotSize}px;
             font-size: ${CONFIG.layout.dotSize * 0.3}px;
        }
        #special-row {
            gap: ${CONFIG.layout.dotGap}px;
            margin-top: ${CONFIG.layout.dotGap}px;
        }
        .recognition-feedback {
            width: ${CONFIG.visual.feedbackSize}px;
            height: ${CONFIG.visual.feedbackSize}px;
            font-size: ${CONFIG.visual.feedbackTextSize}px;
        }
    `;
    document.head.appendChild(s);
};

const dotValues = [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512,
    1024, 2048, 4096, 8192, 16384, 32768,
    65536, 131072, 262144, 524288, 1048576,
    2097152, 4194304, 8388608, 16777216
];

const letterPatterns = {
    17836036: 'A', 28611899: 'B', 32539711: 'C', 1224985: 'D',
    32567296: 'E', 1113151: 'F', 33092671: 'G', 18415153: 'H',
    32641183: 'I', 7475359: 'J', 17990833: 'K', 32539681: 'L',
    18405233: 'M', 18667121: 'N', 33080895: 'O', 1113663: 'P',
    33347135: 'Q', 18153023: 'R', 33061951: 'S', 4329631:  'T',
    33080881: 'U', 4204561: 'V', 18732593: 'W', 18157905: 'X',
    4329809:  'Y', 32575775: 'Z'
};

const numericPositions = {
    0: '1', 2: '2', 4: '3',
    10: '4', 12: '5', 14: '6',
    20: '7', 22: '8', 24: '9'
};

const dotWordMapping = {
    32: '(', 64: ')', 128: '+', 256: '{', 512: '}',
    2048: '*', 8192: '/',
    131072: '-',
    2097152: '>', 8388608: '='
};

function initKeypad() {
    if (!elements.dotGrid || !elements.specialRow) {
        console.error("Required grid elements not found!");
        return;
    }

    elements.dotGrid.innerHTML = '';
    elements.specialRow.innerHTML = '';

    for (let r = 0; r < CONFIG.layout.gridRows; r++) {
        const row = document.createElement('div');
        row.className = 'dot-row';
        for (let c = 0; c < CONFIG.layout.gridCols; c++) {
            const idx = r * CONFIG.layout.gridCols + c;
            if (idx >= dotValues.length) continue;

            const value = dotValues[idx];
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.index = idx;
            dot.dataset.value = value;

            const digit = numericPositions[idx];
            const word = dotWordMapping[value];

            if (digit) {
                dot.classList.add('numeric');
                dot.textContent = digit;
                dot.dataset.digit = digit;
            } else if (word) {
                dot.classList.add('word-dot');
                dot.textContent = word;
                dot.dataset.word = word;
            } else {
                dot.classList.add('placeholder-dot');
            }
            row.appendChild(dot);
        }
        elements.dotGrid.appendChild(row);
    }

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'special-button delete';
    deleteBtn.textContent = '削除';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.title = '削除 (ダブルタップで単語削除)';
    elements.specialRow.appendChild(deleteBtn);

    const zeroBtn = document.createElement('div');
    zeroBtn.className = 'dot numeric';
    zeroBtn.textContent = '0';
    zeroBtn.dataset.digit = '0';
    zeroBtn.dataset.index = 'special_0';
    zeroBtn.dataset.value = '0';
    elements.specialRow.appendChild(zeroBtn);

    // 空白/改行ボタン
    const spaceBtn = document.createElement('div');
    spaceBtn.className = 'special-button space';
    spaceBtn.textContent = '空白/改行';
    spaceBtn.dataset.action = 'space';
    spaceBtn.title = 'シングルクリック: 空白挿入\nダブルクリック: 改行';
    elements.specialRow.appendChild(spaceBtn);

    if (elements.d2dArea) elements.d2dArea.tabIndex = -1;

    updateConfigStyles();
    resizeCanvas();
	
    setupDotEventListeners();
    setupSpecialButtonListeners();
    setupGestureListeners();
    setupMultiTouchSupport();
}

const initResponsiveLayout = () => {
    const checkLayout = () => {
        resizeCanvas();
        if (isMobileDevice()) {
            if (elements.textSection && elements.outputSection) {
                elements.outputSection.classList.add('hide');
                elements.textSection.classList.remove('hide');
            }
        } else {
            if (elements.outputSection) elements.outputSection.classList.remove('hide');
            if (elements.textSection) elements.textSection.classList.remove('hide');
        }
        focusOnInput();
    };
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    checkLayout();
};

const initRichTextEditor = () => {
    const editor = document.getElementById('txt-input');
    
    if (!editor) return;
    
    let currentColor = 'black';
    
    // 色とカラーコードのマッピング
    const colorCodes = {
      'red': '#FF4B00',
      'green': '#03AF7A',
      'blue': '#005AFF',
      'black': '#000000'
    };
    
    const colorButtons = document.querySelectorAll('.color-btn');
    
    editor.style.caretColor = currentColor;
    
    const applyColor = (color) => {
        currentColor = color;
        
        colorButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
        
        editor.style.caretColor = colorCodes[color] || color;
        editor.focus();
    };
    
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            applyColor(btn.dataset.color);
        });
    });
    
    // キーボードイベントの処理
    editor.addEventListener('keydown', (e) => {
        // Shift+Enterでプログラム実行
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            executeCode();
            return;
        }
        
        // 通常のEnterキーで改行
        if (e.key === 'Enter') {
            e.preventDefault();
            insertNewline();
            return;
        }
        
        // Ctrl+キーの組み合わせでの色変更
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                applyColor('red');
                return;
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                applyColor('blue');
                return;
            } else if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                applyColor('green');
                return;
            }
            // その他のCtrl+キーの場合は通常処理を継続
            return;
        }
        
        // スペースキーが押されたら黒色に戻す
        if (e.key === ' ' || e.key === 'Spacebar') {
            currentColor = 'black';
            editor.style.caretColor = 'black';
            colorButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            // スペースは文字として挿入する処理を継続
        }
        
        // 通常のキー入力
        if (e.key.length === 1) {  // 単一文字の入力
            e.preventDefault();
            insertColoredText(e.key, currentColor);
            return;
        }
        
        // Tabキーの処理
        if (e.key === 'Tab') {
            e.preventDefault();
            insertColoredText('    ', currentColor);
            return;
        }
    });
    
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        insertColoredText(text, currentColor);
    });
    
    focusOnInput();
};

window.addEventListener('DOMContentLoaded', () => {
    initKeypad();
    initResponsiveLayout();
    setupExecuteButtonListener();
    setupClearButtonListener();
    setupKeyboardHandlers();
    initRichTextEditor();
    focusOnInput();
});