// constants.js

// Potentially export these if using ES6 modules
// export const Types = { ... };
// export const ColorTypes = { ... };
// export const colorCodes = { ... };
// export const CONFIG = { ... };
// export const letterPatterns = { ... };
// export const complexPatterns = { ... };
// export const dotValues = [ ... ];


const Types = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  SYMBOL: 'symbol',
  UNDEFINED: 'undefined'
};

const ColorTypes = {
  'green': Types.NUMBER,
  'red': Types.BOOLEAN,
  'blue': Types.STRING,
  'cyan': Types.SYMBOL
};

const colorCodes = {
  'red': '#FF4B00',
  'green': '#03AF7A',
  'blue': '#005AFF',
  'cyan': '#4DC4FF'
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

// 3×3のドット配置で使用する素数
const dotValues = [2, 3, 5, 7, 11, 13, 17, 19, 23]; //

// 素数の積に基づく文字パターン定義
const letterPatterns = { //
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
const complexPatterns = { //
  // 必要に応じて追加...
};