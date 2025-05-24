// アプリケーション全体で使用する定数
const CONSTANTS = {
  // エディターの色設定
  EDITOR_COLORS: {
    red: '#e74c3c',
    yellow: '#f39c12',
    green: '#27ae60',
    blue: '#3498db'
  },
  
  // トークンタイプ
  TOKEN_TYPES: {
    NUMBER: 'number',
    STRING: 'string',
    VARIABLE: 'variable',
    SYMBOL: 'symbol',
    SPECIAL: 'special'
  },
  
  // 色とタイプのマッピング
  COLOR_TO_TYPE: {
    'red': 'number',
    'yellow': 'string',
    'green': 'variable',
    'blue': 'symbol'
  },
  
  TYPE_TO_COLOR: {
    'number': 'red',
    'string': 'yellow',
    'variable': 'green',
    'symbol': 'blue',
    'special': 'blue'
  },
  
  // D2D入力の設定
  D2D: {
    GRID_SIZE: { rows: 3, cols: 3 },
    DOT_VALUES: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    MIN_SWIPE_DISTANCE: 10,
    DOT_HIT_RADIUS: 25
  },
  
  // 文字パターン（簡略版）
  LETTER_PATTERNS: {
    // 基本的なパターン
    2: '0', 3: '1', 4: '2', 5: '3', 6: '4',
    7: '5', 8: '6', 9: '7', 10: '8', 11: '9',
    
    // アルファベット（シンプルなパターン）
    12: 'A',    // 3×4
    14: 'B',    // 2×7
    15: 'C',    // 3×5
    18: 'D',    // 2×9
    20: 'E',    // 4×5
    21: 'F',    // 3×7
    24: 'G',    // 3×8
    28: 'H',    // 4×7
    30: 'I',    // 5×6
    35: 'J',    // 5×7
    36: 'K',    // 4×9
    40: 'L',    // 5×8
    42: 'M',    // 6×7
    45: 'N',    // 5×9
    48: 'O',    // 6×8
    54: 'P',    // 6×9
    56: 'Q',    // 7×8
    60: 'R',    // 4×15
    63: 'S',    // 7×9
    70: 'T',    // 7×10
    72: 'U',    // 8×9
    80: 'V',    // 8×10
    84: 'W',    // 7×12
    90: 'X',    // 9×10
    96: 'Y',    // 8×12
    100: 'Z',   // 10×10
    
    // 記号
    120: '+',   // 3×4×10
    144: '-',   // 12×12
    168: '*',   // 7×24
    180: '/',   // 9×20
    200: '=',   // 8×25
    210: '(',   // 7×30
    240: ')',   // 8×30
    252: ' ',   // 空白
    280: '.',   // ピリオド
    315: ',',   // カンマ
    336: ':',   // コロン
    360: ';',   // セミコロン
    420: '!',   // 感嘆符
    504: '?',   // 疑問符
  }
};

// グローバルに公開
window.CONSTANTS = CONSTANTS;