// 型システムの定義
const Types = {
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  STRING: 'string',
  SYMBOL: 'symbol',
  UNDEFINED: 'undefined'
};

// 色と型のマッピング（心理四原色）
const ColorTypeMap = {
  'red': Types.BOOLEAN,
  'yellow': Types.NUMBER,
  'green': Types.STRING,
  'blue': Types.SYMBOL
};

// 型チェック関数
const TypeChecker = {
  isBoolean: (value) => typeof value === 'boolean',
  isNumber: (value) => Fraction.isValid(value),
  isString: (value) => typeof value === 'string',
  isSymbol: (value) => typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value),
  
  getType: (value) => {
    if (TypeChecker.isBoolean(value)) return Types.BOOLEAN;
    if (TypeChecker.isNumber(value)) return Types.NUMBER;
    if (TypeChecker.isString(value)) return Types.STRING;
    if (TypeChecker.isSymbol(value)) return Types.SYMBOL;
    return Types.UNDEFINED;
  },
  
  assertType: (value, expectedType, context = '') => {
    const actualType = TypeChecker.getType(value);
    if (actualType !== expectedType) {
      throw new Error(`Type Error${context ? ' in ' + context : ''}: Expected ${expectedType}, got ${actualType}`);
    }
    return true;
  }
};