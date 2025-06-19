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
const dotValues = [2, 3, 5, 7, 11, 13, 17, 19, 23];
const letterPatterns = {
  2: '1',
  3: '2',
  5: '3',
  7: '4',
  11: '5',
  13: '6',
  17: '7',
  19: '8',
  23: '9',
  6: 'A',
  10: 'B',
  14: 'C',
  22: 'D',
  26: 'E',
  34: 'F',
  38: 'G',
  46: 'H',
  15: 'I',
  21: 'J',
  33: 'K',
  39: 'L',
  51: 'M',
  57: 'N',
  69: 'O',
  35: 'P',
  55: 'Q',
  65: 'R',
  85: 'S',
  95: 'T',
  115: 'U',
  77: 'V',
  91: 'W',
  119: 'X',
  133: 'Y',
  161: 'Z',
  143: '.',
  187: ',',
  209: '!',
  253: '?',
  221: '+',
  247: '-',
  299: '*',
  323: '/',
  391: '=',
  437: '(',
  30: '0',
  42: ':',
  66: ';',
  78: '@',
  102: '#',
  114: '$',
  138: '%',
  70: '^',
  110: '&',
  130: '_',
  170: '{',
  190: '}',
  230: '<',
  154: '>',
  182: '[',
  238: ']',
  266: '|',
  322: '~',
};
const complexPatterns = {
};