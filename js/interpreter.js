// js/interpreter.js
const interpreter = (() => {
  // データスタック
  const stack = [];
  
  // レジスタ（1つ）
  let register = null;
  
  // 環境（カスタムワード定義を格納）
  const environment = {};
  
  // 組み込みワード
  const builtinWords = {
    // スタック操作
    'DUP': () => {
      if (stack.length < 1) throw new Error("Stack underflow in DUP");
      const top = stack[stack.length - 1];
      stack.push({ ...top });
    },
    
    'DROP': () => {
      if (stack.length < 1) throw new Error("Stack underflow in DROP");
      stack.pop();
    },
    
    'SWAP': () => {
      if (stack.length < 2) throw new Error("Stack underflow in SWAP");
      const a = stack.pop();
      const b = stack.pop();
      stack.push(a);
      stack.push(b);
    },
    
    'ROT': () => {
      if (stack.length < 3) throw new Error("Stack underflow in ROT");
      const c = stack.pop();
      const b = stack.pop();
      const a = stack.pop();
      stack.push(b);
      stack.push(c);
      stack.push(a);
    },
    
    // レジスタ操作
    '>R': () => {
      if (stack.length < 1) throw new Error("Stack underflow in >R");
      register = stack.pop();
    },
    
    'R>': () => {
      if (register === null) throw new Error("Register is empty in R>");
      stack.push(register);
      register = null;
    },
    
    'R@': () => {
      if (register === null) throw new Error("Register is empty in R@");
      stack.push({ ...register }); // コピーを作成
    },
    
    // 四則演算
    '+': () => {
      if (stack.length < 2) throw new Error("Stack underflow in +");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in +: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      stack.push({
        value: a.value.add(b.value, false),
        type: Types.NUMBER,
        color: 'green'
      });
    },
    
    '-': () => {
      if (stack.length < 2) throw new Error("Stack underflow in -");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in -: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      stack.push({
        value: a.value.subtract(b.value, false),
        type: Types.NUMBER,
        color: 'green'
      });
    },
    
    '*': () => {
      if (stack.length < 2) throw new Error("Stack underflow in *");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in *: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      stack.push({
        value: a.value.multiply(b.value, false),
        type: Types.NUMBER,
        color: 'green'
      });
    },
    
    '/': () => {
      if (stack.length < 2) throw new Error("Stack underflow in /");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in /: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      if (b.value.numerator === 0) {
        throw new Error("Division by zero");
      }
      
      stack.push({
        value: a.value.divide(b.value, false),
        type: Types.NUMBER,
        color: 'green'
      });
    },
    
    // 比較演算
    '>': () => {
      if (stack.length < 2) throw new Error("Stack underflow in >");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in >: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      stack.push({
        value: a.value.greaterThan(b.value),
        type: Types.BOOLEAN,
        color: 'cyan'
      });
    },
    
    '>=': () => {
      if (stack.length < 2) throw new Error("Stack underflow in >=");
      const b = stack.pop();
      const a = stack.pop();
      
      if (a.type !== Types.NUMBER || b.type !== Types.NUMBER) {
        throw new Error(`Type error in >=: expected NUMBER (green), got ${a.type} and ${b.type}`);
      }
      
      stack.push({
        value: a.value.greaterThanOrEqual(b.value),
        type: Types.BOOLEAN,
        color: 'cyan'
      });
    },
    
    '=': () => {
      if (stack.length < 2) throw new Error("Stack underflow in =");
      const b = stack.pop();
      const a = stack.pop();
      
      // 同じ型であることを要求
      if (a.type !== b.type) {
        throw new Error(`Type error in =: cannot compare ${a.type} with ${b.type}`);
      }
      
      let result;
      if (a.type === Types.NUMBER) {
        result = a.value.equals(b.value);
      } else if (a.type === Types.STRING) {
        result = a.value === b.value;
      } else if (a.type === Types.BOOLEAN) {
        result = a.value === b.value;
      } else if (a.type === Types.NIL) {
        result = true; // nil同士は常に等しい
      } else if (a.type === Types.VECTOR) {
        // ベクトルの比較（要素ごとに比較）
        result = compareVectors(a.value, b.value);
      } else {
        result = a.value === b.value;
      }
      
      stack.push({
        value: result,
        type: Types.BOOLEAN,
        color: 'cyan'
      });
    },
    
    // 分岐
    'IF': () => {
      if (stack.length < 3) throw new Error("Stack underflow in IF");
      const falseBranch = stack.pop();
      const trueBranch = stack.pop();
      const condition = stack.pop();
      
      if (condition.type !== Types.BOOLEAN) {
        throw new Error(`Type error in IF: condition must be BOOLEAN (cyan), got ${condition.type}`);
      }
      
      if (trueBranch.type !== Types.VECTOR || falseBranch.type !== Types.VECTOR) {
        throw new Error("Type error in IF: branches must be VECTOR (purple)");
      }
      
      const branch = condition.value ? trueBranch : falseBranch;
      // ベクトルの内容を実行
      for (const token of branch.value) {
        evaluateToken(token);
      }
    },
    
    // カスタムワード定義
    'DEF': () => {
      if (stack.length < 2) throw new Error("Stack underflow in DEF");
      const name = stack.pop();
      const body = stack.pop();
      
      if (name.type !== Types.STRING) {
        throw new Error(`Type error in DEF: word name must be STRING (blue), got ${name.type}`);
      }
      
      if (body.type !== Types.VECTOR) {
        throw new Error(`Type error in DEF: word body must be VECTOR (purple), got ${body.type}`);
      }
      
      // ワード名の検証（英数字は大文字のみ）
      const wordName = name.value;
      if (!/^[A-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/u.test(wordName)) {
        throw new Error(`Invalid word name: "${wordName}". English symbols must be uppercase.`);
      }
      
      environment[wordName] = body.value; // ベクトルの中身（トークン配列）を保存
    },
    
    // カスタムワード削除
    'DEL': () => {
      if (stack.length < 1) throw new Error("Stack underflow in DEL");
      const name = stack.pop();
      
      if (name.type !== Types.STRING) {
        throw new Error(`Type error in DEL: word name must be STRING (blue), got ${name.type}`);
      }
      
      const wordName = name.value;
      if (!(wordName in environment)) {
        throw new Error(`Word not found: "${wordName}"`);
      }
      
      delete environment[wordName];
    },
    
    // ベクトル操作
    'CONS': () => {
      if (stack.length < 2) throw new Error("Stack underflow in CONS");
      const vector = stack.pop();
      const element = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in CONS: expected VECTOR (purple), got ${vector.type}`);
      }
      
      stack.push({
        value: [element, ...vector.value],
        type: Types.VECTOR,
        color: 'purple'
      });
    },
    
    'HEAD': () => {
      if (stack.length < 1) throw new Error("Stack underflow in HEAD");
      const vector = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in HEAD: expected VECTOR (purple), got ${vector.type}`);
      }
      
      if (vector.value.length === 0) {
        throw new Error("HEAD of empty vector");
      }
      
      stack.push(vector.value[0]);
    },
    
    'TAIL': () => {
      if (stack.length < 1) throw new Error("Stack underflow in TAIL");
      const vector = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in TAIL: expected VECTOR (purple), got ${vector.type}`);
      }
      
      if (vector.value.length === 0) {
        throw new Error("TAIL of empty vector");
      }
      
      stack.push({
        value: vector.value.slice(1),
        type: Types.VECTOR,
        color: 'purple'
      });
    },
    
    'LENGTH': () => {
      if (stack.length < 1) throw new Error("Stack underflow in LENGTH");
      const vector = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in LENGTH: expected VECTOR (purple), got ${vector.type}`);
      }
      
      stack.push({
        value: Fraction(vector.value.length),
        type: Types.NUMBER,
        color: 'green'
      });
    },
    
    'REVERSE': () => {
      if (stack.length < 1) throw new Error("Stack underflow in REVERSE");
      const vector = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in REVERSE: expected VECTOR (purple), got ${vector.type}`);
      }
      
      stack.push({
        value: [...vector.value].reverse(),
        type: Types.VECTOR,
        color: 'purple'
      });
    },
    
    'CALL': () => {
      if (stack.length < 1) throw new Error("Stack underflow in CALL");
      const vector = stack.pop();
      
      if (vector.type !== Types.VECTOR) {
        throw new Error(`Type error in CALL: expected VECTOR (purple), got ${vector.type}`);
      }
      
      // ベクトルの内容を実行
      for (const token of vector.value) {
        evaluateToken(token);
      }
    },
    
    // 辞書検索
    'WORDS': () => {
      // 組み込みワードとカスタムワードを結合
      const allWords = [
        ...Object.keys(builtinWords),
        ...Object.keys(environment)
      ].sort();
      
      // 各ワード名を文字列型としてスタックに積む
      allWords.forEach(word => {
        stack.push({
          value: word,
          type: Types.STRING,
          color: 'blue'
        });
      });
    },
    
    'WORDS?': () => {
      if (stack.length < 1) throw new Error("Stack underflow in WORDS?");
      const filter = stack.pop();
      
      if (filter.type !== Types.STRING) {
        throw new Error("Type error in WORDS?: expected STRING (blue)");
      }
      
      const pattern = filter.value;
      const allWords = [
        ...Object.keys(builtinWords),
        ...Object.keys(environment)
      ].filter(word => word.includes(pattern)).sort();
      
      allWords.forEach(word => {
        stack.push({
          value: word,
          type: Types.STRING,
          color: 'blue'
        });
      });
    }
  };
  
  // ベクトルの比較
  const compareVectors = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].type !== b[i].type) return false;
      if (a[i].type === Types.NUMBER) {
        if (!a[i].value.equals(b[i].value)) return false;
      } else if (a[i].type === Types.VECTOR) {
        if (!compareVectors(a[i].value, b[i].value)) return false;
      } else {
        if (a[i].value !== b[i].value) return false;
      }
    }
    return true;
  };
  
  // トークンの評価
  const evaluateToken = (token) => {
    // 数値
    if (token.type === Types.NUMBER) {
      const fraction = Fraction.fromString(token.value);
      stack.push({
        value: fraction,
        type: Types.NUMBER,
        color: 'green'
      });
      return;
    }
    
    // ブール値
    if (token.type === Types.BOOLEAN) {
      stack.push({
        value: token.value === 'TRUE',  // 大文字で比較
        type: Types.BOOLEAN,
        color: 'cyan'
      });
      return;
    }
    
    // 文字列
    if (token.type === Types.STRING) {
      stack.push({
        value: token.value,
        type: Types.STRING,
        color: 'blue'
      });
      return;
    }
    
    // nil
    if (token.type === Types.NIL) {
      stack.push({
        value: null,
        type: Types.NIL,
        color: 'orange'
      });
      return;
    }
    
    // ベクトル
    if (token.type === Types.VECTOR) {
      stack.push({
        value: token.value,
        type: Types.VECTOR,
        color: 'purple'
      });
      return;
    }
    
    // シンボル（ワード）
    if (token.type === Types.SYMBOL) {
      const word = token.value;
      
      // 組み込みワード
      if (word in builtinWords) {
        builtinWords[word]();
        return;
      }
      
      // カスタムワード
      if (word in environment) {
        // 遅延評価：定義されたトークン配列を実行
        const definition = environment[word];
        for (const defToken of definition) {
          evaluateToken(defToken);
        }
        return;
      }
      
      throw new Error(`Unknown word: "${word}"`);
    }
  };
  
  // スタックの値をフォーマット
  const formatStackValue = (item) => {
    if (item.type === Types.NUMBER) {
      return item.value.toString();
    } else if (item.type === Types.STRING) {
      return item.value;
    } else if (item.type === Types.BOOLEAN) {
      return item.value ? 'true' : 'false';
    } else if (item.type === Types.NIL) {
      return 'nil';
    } else if (item.type === Types.VECTOR) {
      // ベクトル内のトークンを再帰的にフォーマット
      const formattedElements = item.value.map(element => {
        if (element.type !== undefined) {
          return formatStackValue(element);
        } else {
          // 生のトークンの場合
          return element.value;
        }
      });
      return '[ ' + formattedElements.join(' ') + ' ]';
    } else {
      return String(item.value);
    }
  };
  
  // 実行メソッド
  const execute = (editor) => {
    try {
      const tokens = tokenize(editor);
      if (tokens.length === 0) return "Empty input";
      
      // スタックをクリア
      stack.length = 0;
      
      // 各トークンを順次評価
      for (const token of tokens) {
        evaluateToken(token);
      }
      
      // スタックの内容を表示
      if (stack.length === 0) {
        return "Stack empty";
      } else {
        return stack.map(formatStackValue).join('\n');
      }
      
    } catch (err) {
      return `Error: ${err.message}`;
    }
  };
  
  // 環境のリセット
  const resetEnvironment = () => {
    stack.length = 0;
    register = null;
    Object.keys(environment).forEach(key => delete environment[key]);
  };
  
  return {
    execute: execute,
    reset: resetEnvironment,
    getEnvironment: () => ({ ...environment }),
    getStack: () => [...stack],
    getRegister: () => register ? { ...register } : null
  };
})();