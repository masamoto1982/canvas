// 分数計算クラス
class Fraction {
  constructor(numerator, denominator = 1) {
    if (denominator === 0) throw new Error("Division by zero");
    
    // 負の数の処理
    if (denominator < 0) {
      numerator = -numerator;
      denominator = -denominator;
    }
    
    // 最大公約数で約分
    const g = this._gcd(Math.abs(numerator), Math.abs(denominator));
    this.numerator = numerator / g;
    this.denominator = denominator / g;
  }
  
  _gcd(a, b) {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
  
  add(other) {
    const num = this.numerator * other.denominator + other.numerator * this.denominator;
    const den = this.denominator * other.denominator;
    return new Fraction(num, den);
  }
  
  subtract(other) {
    const num = this.numerator * other.denominator - other.numerator * this.denominator;
    const den = this.denominator * other.denominator;
    return new Fraction(num, den);
  }
  
  multiply(other) {
    return new Fraction(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }
  
  divide(other) {
    if (other.numerator === 0) throw new Error("Division by zero");
    return new Fraction(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }
  
  equals(other) {
    return this.numerator * other.denominator === other.numerator * this.denominator;
  }
  
  greaterThan(other) {
    return this.numerator * other.denominator > other.numerator * this.denominator;
  }
  
  greaterThanOrEqual(other) {
    return this.numerator * other.denominator >= other.numerator * this.denominator;
  }
  
  toString() {
    return this.denominator === 1 
      ? String(this.numerator) 
      : `${this.numerator}/${this.denominator}`;
  }
  
  valueOf() {
    return this.numerator / this.denominator;
  }
  
  static fromString(str) {
    if (str.includes('/')) {
      const [num, den] = str.split('/').map(Number);
      return new Fraction(num, den);
    }
    return new Fraction(Number(str));
  }
  
  static isValid(value) {
    return value instanceof Fraction;
  }
}