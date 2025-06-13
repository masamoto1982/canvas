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
    maxStrokes: 3
  }
};

// ビット値（2のべき乗）を使用
const dotValues = [
    1, 2, 4, 8, 16,
    32, 64, 128, 256, 512,
    1024, 2048, 4096, 8192, 16384,
    32768, 65536, 131072, 262144, 524288,
    1048576, 2097152, 4194304, 8388608, 16777216
];

// 数字の位置（十字配置）
const numericPositions = {
  0: '1',   // 左上
  2: '2',   // 上中央
  4: '3',   // 右上
  10: '4',  // 左中央
  12: '5',  // 中央
  14: '6',  // 右中央
  20: '7',  // 左下
  22: '8',  // 下中央
  24: '9'   // 右下
};

// 記号の位置と値のマッピング
const symbolPositions = {
  1: '(',    // 位置1
  3: ')',    // 位置3
  5: '+',    // 位置5
  6: '-',    // 位置6
  7: '*',    // 位置7
  8: '/',    // 位置8
  9: '=',    // 位置9
  11: '<',   // 位置11
  13: '>',   // 位置13
  15: '[',   // 位置15
  16: ']',   // 位置16
  17: '{',   // 位置17
  18: '}',   // 位置18
  19: '|',   // 位置19
  21: '.',   // 位置21
  23: ','    // 位置23
};

// アルファベットパターン（ストローク数別）
const letterPatterns = {
  // 1ストローク（一筆書き）
  1: {
    17836036: 'A',
    28611899: 'B',
    32539711: 'C',
    1224985: 'D',
    32567296: 'E',
    1113151: 'F',
    33092671: 'G',
    32641183: 'L',
    33080895: 'O',
    33061951: 'S',
    33080881: 'U',
    4204561: 'V',
    18732593: 'W',
    18405233: 'M',
    18667121: 'N',
    4329809: 'Z'
  },
  // 2ストローク
  2: {
    '1023,1054720': 'J',
    '31,32736': 'P',
    '31,1015808': 'Q',
    '1054720,31': 'T',
    '17043521,1118480': 'X',
    '31,1081856': 'R',
    '1118465,16': 'Y'
  },
  // 3ストローク
  3: {
    '1,16,1048576': 'I',
    '31,1024,32736': 'H',
    '31,17043456,1064960': 'K',
    '31,1,1024': 'F'
  }
};

// complexPatternsは空のまま維持
const complexPatterns = {};