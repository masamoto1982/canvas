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
  'cyan': Types.SYMBOL
};

// 色とカラーコードのマッピング - グローバル変数として定義
const colorCodes = {
  'red': '#FF4B00',
  'green': '#03AF7A',
  'blue': '#005AFF',
  'cyan': '#4DC4FF'
};

// RGB値を色名に変換する関数
const rgbToColorName = (rgb) => {
  // 特定のカラーコードを直接マッピング
  const exactColors = {
    '#FF4B00': 'red', // 赤色 (Boolean型)
    '#03AF7A': 'green', // 緑色 (Number型)
    '#005AFF': 'blue', // 青色 (String型)
    '#4DC4FF': 'cyan', // シアン (Symbol型)
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
  // シアン系 (#4DC4FF)
  else if (r < 150 && g > 150 && b > 200) {
    return 'cyan';
  }

  return 'cyan'; // デフォルトをcyanに変更
};

// 現在選択されている色を取得する関数
const getCurrentColor = () => {
  // アクティブな色ボタンを取得
  const activeColorBtn = document.querySelector('.color-btn.active');
  // デフォルトは'cyan'
  return activeColorBtn ? activeColorBtn.dataset.color : 'cyan';
};

// トークナイザー - エディタのDOM内容から色情報付きトークンを抽出
const tokenize = (editor) => {
  if (!editor) return [];

  const tokens = [];

  // エディタのDOM内容を走査して色情報付きトークンを抽出
  const extractTokens = (node, currentColor = 'cyan') => {
    if (node.nodeType === Node.TEXT_NODE) {
      // テキストノードからトークンを抽出
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;

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
        const nodeColor = node.style && node.style.color ?
          rgbToColorName(node.style.color) :
          currentColor;
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
      if (!variableToken || variableToken.color !== 'cyan' || !/^[A-Z][A-Z0-9_]*$/.test(variableToken.value)) {
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
    if (token.color === 'cyan' && /^[A-Z][A-Z0-9_]*$/.test(token.value)) {
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

// グローバル状態の定義
const state = {
  variables: {},
  functions: {}
};

// インタプリタ - ASTを評価
const interpreter = (() => {
  const environment = {
    variables: {},
    functions: {}
  };

  // 式の評価
  const evaluate = (ast, env = {
    variables: state.variables,
    functions: state.functions
  }) => {
    if (!ast) return null;

    // リテラル値
    if (ast.type === Types.NUMBER || ast.type === Types.BOOLEAN || ast.type === Types.STRING) {
      return ast.value;
    }

    // 変数参照
    if (ast.type === 'variable') {
      if (!(ast.name in env.variables)) {
        throw new Error(`Undefined variable: ${ast.name}`);
      }
      return env.variables[ast.name];
    }

    // 代入
    if (ast.type === 'assignment') {
      const value = evaluate(ast.value, env);
      env.variables[ast.variable] = value;
      return value;
    }

    // 演算
    if (ast.type === 'operation') {
      const left = evaluate(ast.left, env);
      const right = evaluate(ast.right, env);

      // 型チェック
      if (['+', '-', '*', '/'].includes(ast.operator)) {
        // 数値演算子の場合、両方のオペランドが数値型であることを確認
        if (!Fraction.isValidNumber(left) || !Fraction.isValidNumber(right)) {
          throw new Error(`Type Error: Operator '${ast.operator}' requires Number type (green) operands`);
        }

        // 演算の実行
        switch (ast.operator) {
          case '+':
            return left.add(right, false);
          case '-':
            return left.subtract(right, false);
          case '*':
            return left.multiply(right, false);
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
            case '>':
              return left.greaterThan(right);
            case '>=':
              return left.greaterThanOrEqual(right);
            case '==':
              return left.equals(right);
          }
        }

        // 文字列またはブール値の比較
        if (leftType === Types.STRING || leftType === Types.BOOLEAN) {
          switch (ast.operator) {
            case '==':
              return left === right;
            case '>':
              return left > right;
            case '>=':
              return left >= right;
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
    getEnvironment: () => ({
      ...environment
    })
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
    gridRows: 3, // 3x3グリッドに変更
    gridCols: 3 // 3x3グリッドに変更
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
  detectedDotsList: [], // 検出順序を保持する配列
  totalValue: 1, // 初期値を1に（素数の積として）
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
  tapCheckTimer: null,
  lastDetectedDot: null,  // 最後に検出されたドット要素
  lastDotX: 0,            // 最後のドットのX座標
  lastDotY: 0,            // 最後のドットのY座標
  currentLineColor: null  // 現在の線の色
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

// ドット間に線を描画する関数
const drawLineBetweenDots = (fromX, fromY, toX, toY, color) => {
  const lineCanvas = elements.lineCanvas;
  if (!lineCanvas) return;
  
  const ctx = lineCanvas.getContext('2d');
  if (!ctx) return;
  
  // 線のスタイル設定
  ctx.strokeStyle = colorCodes[color] || colorCodes['cyan'];
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  
  // 線を描画
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
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

  // エディタにフォーカスを当てる
  editor.focus();

  // 改行の場合は専用関数を使用
  if (text === '\n') {
    insertNewline();
    return;
  }

  // 正確なカラーコードを使用
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);

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
    br.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  } else {
    // 選択範囲がない場合はHTML挿入
    document.execCommand('insertHTML', false, '<br><br>');
  }
};

const insertAtCursor = (text) => {
  const editor = elements.input;
  if (!editor) return;

  // 現在の文字色を維持したまま挿入
  const currentActiveColor = document.querySelector('.color-btn.active')?.dataset.color || 'cyan';
  insertColoredText(text, currentActiveColor);

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
  drawState.totalValue = 1; // 素数の積なので初期値は1
  drawState.currentStrokeDetected = false;
  drawState.hasMoved = false;
  drawState.isDrawingMode = false;
  drawState.detectedDotsList = []; // 検出順序リストをクリア
  drawState.lastDetectedDot = null; // 前回のドット情報をリセット
  drawState.lastDotX = 0;
  drawState.lastDotY = 0;
  drawState.currentLineColor = null;
  if (!keepActive) drawState.lastStrokeTime = 0;
  clearTimeout(drawState.strokeTimer);
  drawState.strokeTimer = null;
};

// 素因数分解
const getPrimeFactors = (num) => {
  const factors = [];
  let divisor = 2;

  while (num > 1) {
    while (num % divisor === 0) {
      factors.push(divisor);
      num /= divisor;
    }
    divisor++;

    // 効率化のため、sqrt(num)までチェックすれば十分
    if (divisor * divisor > num) {
      if (num > 1) factors.push(num);
      break;
    }
  }

  return factors;
};

// 素因数の部分集合による可能なパターンを見つける
const findSubsetProductMatches = (factors, dotValues) => {
  const candidates = [];
  const maxSubsets = Math.min(10, Math.pow(2, factors.length)); // 制限を設ける

  // 部分集合を生成
  for (let i = 1; i < maxSubsets; i++) {
    const subset = [];
    for (let j = 0; j < factors.length; j++) {
      if (i & (1 << j)) {
        subset.push(factors[j]);
      }
    }

    // 部分集合の積を計算
    const product = subset.reduce((a, b) => a * b, 1);

    // この積に対応する文字があれば候補に追加
   if (letterPatterns[product]) {
     candidates.push({
       letter: letterPatterns[product],
       product: product,
       distance: Math.abs(product - factors.reduce((a, b) => a * b, 1))
     });
   }
 }

 // 元の値に最も近い候補をソート
 return candidates.sort((a, b) => a.distance - b.distance);
};

// 強化された認識関数 - 素数の特性を活用
const recognizeLetterWithErrorCorrection = (totalValue) => {
 // ドット値の配列
 const dotValues = [2, 3, 5, 7, 11, 13, 17, 19, 23];

 // 直接パターンマッチ
 if (letterPatterns[totalValue]) {
   console.log(`完全一致: ${totalValue} → ${letterPatterns[totalValue]}`);
   return letterPatterns[totalValue];
 }

 if (complexPatterns && complexPatterns[totalValue]) {
   console.log(`複合パターン一致: ${totalValue} → ${complexPatterns[totalValue]}`);
   return complexPatterns[totalValue];
 }

 // 誤り訂正パート
 // 1. まず素因数分解する
 const factors = getPrimeFactors(totalValue);

 // 2. 主要な素因数のみを見る（誤検出の除外）
 const validFactors = factors.filter(f => dotValues.includes(f));

 // 3. もし有効な素因数が見つかったら、それらの積を計算
 if (validFactors.length > 0) {
   const correctedValue = validFactors.reduce((a, b) => a * b, 1);

   // 4. 修正された値で再度パターンマッチを試みる
   if (letterPatterns[correctedValue]) {
     console.log(`誤り訂正成功: ${totalValue} → ${correctedValue} → ${letterPatterns[correctedValue]}`);
     return letterPatterns[correctedValue];
   }
 }

 // 5. 最も可能性の高い文字を推測（素因数の部分集合を試す）
 const candidatePatterns = findSubsetProductMatches(validFactors, dotValues);
 if (candidatePatterns.length > 0) {
   console.log(`部分一致推測: ${totalValue} → ${candidatePatterns[0].letter}`);
   return candidatePatterns[0].letter;
 }

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
     if (drawState.detectedDots.size > 0 && drawState.totalValue > 1) {
       // 誤り訂正付きの認識関数を使用
       const rec = recognizeLetterWithErrorCorrection(drawState.totalValue);
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
 
 // ドットを検出状態に
 dot.classList.add('detected');
 drawState.detectedDots.add(dot);
 drawState.detectedDotsList.push(dot); // 検出順序を記録
 drawState.currentStrokeDetected = true;
 
 // ドットの値を乗算
 const v = parseInt(dot.dataset.value, 10);
 if (!isNaN(v)) {
   drawState.totalValue *= v;
 }
 
 // ドットの中心座標を取得
 const rect = dot.getBoundingClientRect();
 const dotX = rect.left + rect.width / 2;
 const dotY = rect.top + rect.height / 2;
 
 // 前回のドットが存在する場合、線を描画
 if (drawState.lastDetectedDot) {
   // 現在の文字色を取得
   const currentColor = getCurrentColor();
   
   // ドット間に線を描画
   drawLineBetweenDots(
     drawState.lastDotX - elements.d2dArea.getBoundingClientRect().left,
     drawState.lastDotY - elements.d2dArea.getBoundingClientRect().top,
     dotX - elements.d2dArea.getBoundingClientRect().left,
     dotY - elements.d2dArea.getBoundingClientRect().top,
     currentColor
   );
   
   drawState.currentLineColor = currentColor;
 }
 
 // 現在のドットを前回のドットとして記録
 drawState.lastDetectedDot = dot;
 drawState.lastDotX = dotX;
 drawState.lastDotY = dotY;
 
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

   if (drawState.isDrawingMode && drawState.lastDetectedDot) {
     // 最後に検出されたドットから現在のポインター位置まで一時的な線を描画（吸着効果）
     const currentColor = getCurrentColor();
     const lineCanvas = elements.lineCanvas;
     if (lineCanvas) {
       const ctx = lineCanvas.getContext('2d');
       if (ctx) {
         // 既存の線は残したまま、最後のドットから現在位置までの線のみ更新
         clearCanvas(); // いったんキャンバスをクリア
         
         // 既存のドット間の線を再描画
         redrawExistingLines(currentColor);
         
         // 最後のドットから現在位置までの線を描画
         ctx.strokeStyle = colorCodes[currentColor] || colorCodes['cyan'];
         ctx.lineWidth = 5;
         ctx.lineCap = 'round';
         
         ctx.beginPath();
         ctx.moveTo(
           drawState.lastDotX - elements.d2dArea.getBoundingClientRect().left,
           drawState.lastDotY - elements.d2dArea.getBoundingClientRect().top
         );
         ctx.lineTo(
           e.clientX - elements.d2dArea.getBoundingClientRect().left,
           e.clientY - elements.d2dArea.getBoundingClientRect().top
         );
         ctx.stroke();
       }
     }
   }

   detectDot(e.clientX, e.clientY);
 }
};

// 既存のドット間の線を再描画する関数
const redrawExistingLines = (currentColor) => {
 if (drawState.detectedDotsList.length <= 1) return;
 
 // Setではなく順序付きリストを使用
 const dots = drawState.detectedDotsList;
 
 for (let i = 1; i < dots.length; i++) {
   const prevDot = dots[i-1];
   const currDot = dots[i];
   
   const prevRect = prevDot.getBoundingClientRect();
   const currRect = currDot.getBoundingClientRect();
   
   const prevX = prevRect.left + prevRect.width / 2 - elements.d2dArea.getBoundingClientRect().left;
   const prevY = prevRect.top + prevRect.height / 2 - elements.d2dArea.getBoundingClientRect().top;
   const currX = currRect.left + currRect.width / 2 - elements.d2dArea.getBoundingClientRect().left;
   const currY = currRect.top + currRect.height / 2 - elements.d2dArea.getBoundingClientRect().top;
   
   drawLineBetweenDots(prevX, prevY, currX, currY, currentColor);
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
   elements.d2dArea.addEventListener('touchstart', (e) => e.preventDefault(), {
     passive: false
   });
   elements.d2dArea.addEventListener('touchmove', (e) => e.preventDefault(), {
     passive: false
   });
 }
};

const setupDotEventListeners = () => {
 if (!elements.d2dArea) return;
 console.log("Setting up dot event listeners for:", elements.d2dArea);
 elements.d2dArea.addEventListener('pointerdown', (e) => {
   if (e.target.classList.contains('dot')) {
     handlePointerDown(e, e.target);
   }
 }, {
   passive: false
 });
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
       // シングルクリック: 空白挿入（文字色を維持）
       const editor = elements.input;
       if (editor) {
         // 現在の文字色を維持したまま空白を挿入
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
 document.addEventListener('pointermove', handlePointerMove, {
   passive: false
 });
 document.addEventListener('pointerup', handlePointerUp, {
   passive: false
 });
 document.addEventListener('pointercancel', handlePointerUp, {
   passive: false
 });
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

// 3×3のドット配置で使用する素数
const dotValues = [2, 3, 5, 7, 11, 13, 17, 19, 23];

// 素数の積に基づく文字パターン定義
const letterPatterns = {
 // 単一の素数
 2: '1',
 3: '2',
 5: '3',
 7: '4',
 11: '5',
 13: '6',
 17: '7',
 19: '8',
 23: '9',

 // 2つの素数の積
 6: 'A', // 2×3
 10: 'B', // 2×5
 14: 'C', // 2×7
 22: 'D', // 2×11
 26: 'E', // 2×13
 34: 'F', // 2×17
 38: 'G', // 2×19
 46: 'H', // 2×23
 15: 'I', // 3×5
 21: 'J', // 3×7
 33: 'K', // 3×11
 39: 'L', // 3×13
 51: 'M', // 3×17
 57: 'N', // 3×19
 69: 'O', // 3×23
 35: 'P', // 5×7
 55: 'Q', // 5×11
 65: 'R', // 5×13
 85: 'S', // 5×17
 95: 'T', // 5×19
 115: 'U', // 5×23
 77: 'V', // 7×11
 91: 'W', // 7×13
 119: 'X', // 7×17
 133: 'Y', // 7×19
 161: 'Z', // 7×23

 // 記号や特殊文字用の追加パターン
 143: '.', // 11×13
 187: ',', // 11×17
 209: '!', // 11×19
 253: '?', // 11×23
 221: '+', // 13×17
 247: '-', // 13×19
 299: '*', // 13×23
 323: '/', // 17×19
 391: '=', // 17×23
 437: '(', // 19×23

 // 3つの素数の組み合わせ（複雑なパターン用）
 30: '0', // 2×3×5
 42: ':', // 2×3×7
 66: ';', // 2×3×11
 78: '@', // 2×3×13
 102: '#', // 2×3×17
 114: '$', // 2×3×19
 138: '%', // 2×3×23
 70: '^', // 2×5×7
 110: '&', // 2×5×11
 130: '_', // 2×5×13
 170: '{', // 2×5×17
 190: '}', // 2×5×19
 230: '<', // 2×5×23
 154: '>', // 2×7×11
 182: '[', // 2×7×13
 238: ']', // 2×7×17
 266: '|', // 2×7×19
 322: '~', // 2×7×23
};

// 3つ以上の素数を使った複雑なパターン（オプション）
const complexPatterns = {
 // 必要に応じて追加...
};

function initKeypad() {
 if (!elements.dotGrid || !elements.specialRow) {
   console.error("Required grid elements not found! dotGrid:", elements.dotGrid, "specialRow:", elements.specialRow);
   return;
 }

 elements.dotGrid.innerHTML = '';
 elements.specialRow.innerHTML = '';

 // 3×3のグリッドレイアウト
 CONFIG.layout.gridRows = 3;
 CONFIG.layout.gridCols = 3;

 // 素数値のドット配置
 const primeValues = [2, 3, 5, 7, 11, 13, 17, 19, 23];

 for (let r = 0; r < CONFIG.layout.gridRows; r++) {
   const row = document.createElement('div');
   row.className = 'dot-row';

   for (let c = 0; c < CONFIG.layout.gridCols; c++) {
     const idx = r * CONFIG.layout.gridCols + c;
     if (idx >= primeValues.length) continue;

     const value = primeValues[idx];
     const dot = document.createElement('div');
     dot.className = 'dot';
     dot.dataset.index = idx;
     dot.dataset.value = value;

     // ドットの表示をカスタマイズ
     const position = idx + 1; // 1-9の位置番号
     dot.textContent = position.toString();
     dot.classList.add('numeric');
     dot.dataset.digit = position.toString();

     row.appendChild(dot);
   }

   elements.dotGrid.appendChild(row);
 }

 // 特殊ボタンの配置
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
 zeroBtn.dataset.value = '1'; // 素数ではないが、乗算に影響しない値として1を設定
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
   // スマートフォンでのキーボード表示を最終的に防止
if (isMobileDevice()) {
  // d2d-input領域のフォーカス処理を完全に無効化
  const preventKeyboard = () => {
    if (elements.d2dArea) {
      elements.d2dArea.addEventListener('touchstart', (e) => {
        // アクティブな要素からフォーカスを外す
        if (document.activeElement && document.activeElement !== elements.input) {
          document.activeElement.blur();
        }
        // キーボード表示を防止
        e.preventDefault();
      }, { passive: false, capture: true });
      
      // 以下のイベントに対しても同様の処理
      ['touchstart', 'mousedown', 'pointerdown', 'MSPointerDown'].forEach(eventType => {
        elements.d2dArea.addEventListener(eventType, (e) => {
          if (e.target !== elements.input) {
            e.preventDefault();
            if (document.activeElement) document.activeElement.blur();
          }
        }, { passive: false, capture: true });
      });
    }
  };
  
  // DOMContentLoaded時とウィンドウロード時の両方で実行
  window.addEventListener('DOMContentLoaded', preventKeyboard);
  window.addEventListener('load', preventKeyboard);
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

 // デフォルトの色をcyanに変更
 let currentColor = 'cyan';

 const colorButtons = document.querySelectorAll('.color-btn');

 editor.style.caretColor = colorCodes[currentColor];

 // 初期状態ではcyanボタンをアクティブに
 const cyanBtn = document.querySelector('#color-cyan');
 if (cyanBtn) {
   cyanBtn.classList.add('active');
 }

 // 1. 色ボタンのクリックハンドラーを修正（フォーカスを設定しない）
const applyColor = (color) => {
  currentColor = color;

  colorButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === color);
  });

  // カーソルの色のみ変更し、フォーカスは設定しない
  if (editor) {
    editor.style.caretColor = colorCodes[color] || color;
    
    // すでにフォーカスがあるなら、選択範囲の色を更新
    if (document.activeElement === editor) {
      // 選択範囲があれば、その色を更新
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
    }
  }
};

// 2. txt-input へのイベントハンドラーを追加/修正
const initRichTextEditor = () => {
  const editor = document.getElementById('txt-input');

  if (!editor) return;

  // デフォルトの色をcyanに変更
  let currentColor = 'cyan';

  const colorButtons = document.querySelectorAll('.color-btn');

  editor.style.caretColor = colorCodes[currentColor];

  // 初期状態ではcyanボタンをアクティブに
  const cyanBtn = document.querySelector('#color-cyan');
  if (cyanBtn) {
    cyanBtn.classList.add('active');
  }

  // Android のネイティブ入力をサポートするための処理
  editor.addEventListener('input', (e) => {
    // 入力イベントが発生したときに、現在の文字色を反映
    // ただし、これは単純な解決策ではなく、選択範囲内のテキストに対しては
    // 直接適用できない場合がある
    
    // 現在アクティブな色を取得
    const activeColor = getCurrentColor();
    
    // 現在のテキストを保存
    const text = editor.innerHTML;
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // カーソル位置を保存
    const cursorPosition = getCursorPosition(editor);
    
    // 非効率ですが、全体を選択して色を適用
    // これは編集モードでの対応策です
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, colorCodes[activeColor] || colorCodes['cyan']);
    
    // カーソル位置を復元（必要に応じて）
    setCursorPosition(editor, cursorPosition);
  });

  // 残りのコードは変更なし...
};

// モバイルでのフォーカス管理のための追加関数
const focusWithoutKeyboard = (element) => {
  if (!element) return;
  
  // 現在のスクロール位置を保存
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  
  // 一時的にreadonly属性を追加（キーボード表示を防ぐ）
  const originalReadOnly = element.getAttribute('readonly');
  const originalContentEditable = element.getAttribute('contenteditable');
  
  if (element.tagName.toLowerCase() === 'div' && originalContentEditable === 'true') {
    element.setAttribute('contenteditable', 'false');
  } else {
    element.setAttribute('readonly', 'readonly');
  }
  
  // フォーカスを設定
  element.focus();
  
  // 属性を元に戻す
  if (element.tagName.toLowerCase() === 'div' && originalContentEditable === 'true') {
    element.setAttribute('contenteditable', 'true');
  } else {
    if (originalReadOnly) {
      element.setAttribute('readonly', originalReadOnly);
    } else {
      element.removeAttribute('readonly');
    }
  }
  
  // スクロール位置を復元
  window.scrollTo(scrollX, scrollY);
};

// 文字色ボタンクリック時のイベントハンドラー
colorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // 色を適用
    applyColor(btn.dataset.color);
    
    // d2d-inputセクションでの操作に戻る（オプション）
    if (isMobileDevice() && elements.d2dArea) {
      // d2d-inputへの視覚的なフォーカス（キーボードは表示しない）
      focusWithoutKeyboard(elements.d2dArea);
    }
  });
});

 colorButtons.forEach(btn => {
   btn.addEventListener('click', () => {
     applyColor(btn.dataset.color);
   });
 });

 // Ctrl+キーの組み合わせでの色変更に'c'を追加
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
     } else if (e.key === 'c' || e.key === 'C') {
       e.preventDefault();
       applyColor('cyan');
       return;
     }
     // その他のCtrl+キーの場合は通常処理を継続
     return;
   }

   // スペースキーが押されても文字色は変更しない

   // 通常のキー入力
   if (e.key.length === 1) { // 単一文字の入力
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

// カラーボタン用CSSの追加
const addColorButtonStyles = () => {
 const styleElem = document.createElement('style');
 styleElem.textContent = `
       #color-cyan, #color-cyan.active {
           background-color: #f0faff;
           color: #4DC4FF;
           border: 1px solid #b3e5fc;
       }

       #color-cyan.active {
           background-color: #b3e5fc;
       }
       
       #clear-button {
           background-color: #F6AA00;
       }
       
       #clear-button:hover {
           background-color: #D49000;
       }
       
       #clear-button:active {
           background-color: #B37800;
       }
       
       #execute-button {
           background-color: #4DC4FF;
       }
       
       #execute-button:hover {
           background-color: #3AA7E2;
       }
       
       #execute-button:active {
           background-color: #2A8AC0;
       }
   `;
 document.head.appendChild(styleElem);
};

// ページ読み込み時の初期化
window.addEventListener('DOMContentLoaded', () => {
 // デバッグ情報
 console.log("DOM Content Loaded");
 console.log("d2d-input element:", document.getElementById('d2d-input'));
 console.log("dot-grid element:", document.getElementById('dot-grid'));
 console.log("special-row element:", document.getElementById('special-row'));
 console.log("line-canvas element:", document.getElementById('line-canvas'));
 
 // elements オブジェクトの再初期化
 elements.dotGrid = document.getElementById('dot-grid');
 elements.specialRow = document.getElementById('special-row');
 elements.lineCanvas = document.getElementById('line-canvas');
 elements.input = document.getElementById('txt-input');
 elements.d2dArea = document.getElementById('d2d-input');
 elements.output = document.getElementById('output');
 elements.executeButton = document.getElementById('execute-button');
 elements.clearButton = document.getElementById('clear-button');
 elements.outputSection = document.getElementById('output-section');
 elements.textSection = document.getElementById('text-section');
 
 // 初期化の順序を変更
 addColorButtonStyles();
 
 // d2d-inputが存在することを確認してから初期化
 if (elements.d2dArea) {
   console.log("Initializing d2d-input");
   initKeypad();
   resizeCanvas();
 } else {
   console.error("d2d-input element not found!");
 }
 
 initResponsiveLayout();
 setupExecuteButtonListener();
 setupClearButtonListener();
 setupKeyboardHandlers();
 initRichTextEditor();
 focusOnInput();
});