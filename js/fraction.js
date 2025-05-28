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
  constructor.isValidNumber = (value) => {
    return typeof value === 'object' &&
      value !== null &&
      'numerator' in value &&
      'denominator' in value;
  };
  return constructor;
})();