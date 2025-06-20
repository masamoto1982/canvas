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