const Types = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  SYMBOL: 'symbol',
  VECTOR: 'vector',
  NIL: 'nil',
  COMMENT: 'comment',
  UNDEFINED: 'undefined'
};
const ColorTypes = {
  'green': Types.NUMBER,
  'cyan': Types.BOOLEAN,
  'blue': Types.STRING,
  'red': Types.SYMBOL,
  'purple': Types.VECTOR,
  'orange': Types.NIL,
  'yellow': Types.COMMENT,
  'gray': Types.NIL
};
const colorCodes = {
  'red': '#FF4B00',
  'green': '#03AF7A',
  'blue': '#005AFF',
  'cyan': '#4DC4FF',
  'purple': '#9C27B0',
  'orange': '#F6AA00',
  'yellow': '#FFF100',
  'gray': '#9E9E9E'
};
const CONFIG = {
  sensitivity: {
    hitRadius: 15,
    minSwipeDistance: 5,
    debounceTime: 50
  },
  timing: {
    multiStrokeTimeout: 1000,
    doubleTapDelay: 300
  },
  layout: {
    dotSize: 40,
    dotGap: 20,
    gridRows: 3,
    gridCols: 3
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

// 新しいパターンマッピング（書き順ベース）
const sequencePatterns = {
  // アルファベット
  '14712369456': 'A',
  '729': 'A', // 補助パターン
  '1471235987': 'B',
  '3214789': 'C',
  '14712687': 'D',
  '147167': 'D', // 補助パターン
  '147123456789': 'E',
  '3215789': 'E', // 補助パターン
  '147123456': 'F',
  '321478965': 'G',
  '147456369': 'H',
  '123258789': 'I',
  '1232587': 'J',
  '147349': 'K',
  '1475359': 'K', // 補助パターン
  '14789': 'L',
  '7425369': 'M',
  '7415963': 'N',
  '321478963': 'O',
  '14789632': 'O', // 補助パターン
  '789632147': 'O', // 補助パターン
  '963214789': 'O', // 補助パターン
  '147123654': 'P',
  '3214789659': 'Q',
  '14712365459': 'R',
  '74123659': 'R', // 補助パターン
  '321456987': 'S',
  '123258': 'T',
  '1478963': 'U',
  '1475963': 'V',
  '1475963': 'W',
  '157359': 'X',
  '159753': 'Y',
  '1235789': 'Z',
  '1235789456': 'Z', // 補助パターン
  
  // 記号
  '321478963729': '@',
  '268': '>',
  '3214789': '',
  '1236987': ')',
  '21478': '[',
  '23698': ']',
  '456258': '+',
  '456': '-',
  '159357': '*',
  '357': '/',
  '123789': '='
};

// 旧変数は互換性のため残す（使用しない）
const dotValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const letterPatterns = {};
const complexPatterns = {};