// js/tokenizer.js
const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  let vectorDepth = 0;
  let currentVector = [];
  let vectorStack = [];
  
  const extractTokens = (node, currentColor = 'red') => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;
      
      // テキストを文字単位で処理（ベクトルの開始・終了を検出するため）
      let currentWord = '';
      let i = 0;
      
      while (i < text.length) {
        const char = text[i];
        
        // ベクトルの開始
        if (char === '[') {
          // 現在の単語を処理
          if (currentWord.trim()) {
            processWord(currentWord.trim(), color);
          }
          currentWord = '';
          
          vectorDepth++;
          if (vectorDepth > 1) {
            vectorStack.push(currentVector);
            currentVector = [];
          }
          i++;
          continue;
        }
        
        // ベクトルの終了
        if (char === ']') {
          // 現在の単語を処理
          if (currentWord.trim()) {
            processWord(currentWord.trim(), color);
          }
          currentWord = '';
          
          if (vectorDepth > 0) {
            vectorDepth--;
            const completedVector = currentVector;
            
            if (vectorDepth > 0) {
              currentVector = vectorStack.pop();
              currentVector.push({
                value: completedVector,
                color: 'purple',
                type: Types.VECTOR
              });
            } else {
              tokens.push({
                value: completedVector,
                color: 'purple',
                type: Types.VECTOR
              });
              currentVector = [];
            }
          }
          i++;
          continue;
        }
        
        // 空白文字
        if (/\s/.test(char)) {
          if (currentWord.trim()) {
            processWord(currentWord.trim(), color);
          }
          currentWord = '';
          i++;
          continue;
        }
        
        // 通常の文字
        currentWord += char;
        i++;
      }
      
      // 最後の単語を処理
      if (currentWord.trim()) {
        processWord(currentWord.trim(), color);
      }
    } else if (node.nodeName === 'BR') {
      // 改行の処理
    } else if (node.childNodes && node.childNodes.length > 0) {
      Array.from(node.childNodes).forEach(child => {
        const nodeColor = node.style && node.style.color ?
          rgbToColorName(node.style.color) :
          currentColor;
        extractTokens(child, nodeColor);
      });
    }
  };
  
  const processWord = (word, color) => {
    // コメント色（黄色）は無視
    if (color === 'yellow') return;
    
    // 型プレフィックスの処理
    const prefixMatch = word.match(/^(number|boolean|string|symbol|vector|nil|comment):(.+)$/);
    if (prefixMatch) {
      const [, type, value] = prefixMatch;
      const prefixColor = {
        'number': 'green',
        'boolean': 'cyan',
        'string': 'blue',
        'symbol': 'red',
        'vector': 'purple',
        'nil': 'orange',
        'comment': 'yellow'
      }[type];
      
      if (prefixColor === 'yellow') return; // コメントは無視
      
      processTypedWord(value, prefixColor || color);
      return;
    }
    
    processTypedWord(word, color);
  };
  
// js/tokenizer.js の processTypedWord 関数を修正
const processTypedWord = (word, color) => {
    let token = {
      value: word,
      color: color,
      type: ColorTypes[color] || Types.UNDEFINED
    };
    
    // 型に応じた検証
    if (color === 'green') {
      // 数値型の検証
      if (isNaN(parseFloat(word)) && word !== 'nil') {
        throw new Error(`Type Error: Invalid number literal '${word}'`);
      }
    } else if (color === 'cyan') {
      // ブール型の検証（大文字のみ許可）
      if (!['TRUE', 'FALSE'].includes(word)) {
        throw new Error(`Type Error: Boolean literals must be TRUE or FALSE (uppercase): '${word}'`);
      }
    } else if (color === 'blue') {
      // 文字列型：そのまま受け入れる
    } else if (color === 'red') {
      // シンボル型の検証（英数字は大文字のみ）
      if (/[a-z]/.test(word)) {
        throw new Error(`Type Error: English symbols must be uppercase: '${word}'`);
      }
    } else if (color === 'orange') {
      // nil型の検証（大文字のみ）
      if (word !== 'NIL') {
        throw new Error(`Type Error: Nil literal must be NIL (uppercase): '${word}'`);
      }
    }
    
    // ベクトル内にいる場合は現在のベクトルに追加
    if (vectorDepth > 0) {
      currentVector.push(token);
    } else {
      tokens.push(token);
    }
  };
  
  // エディタの内容を処理
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });
  
  // 未完了のベクトルがある場合はエラー
  if (vectorDepth > 0) {
    throw new Error(`Unclosed vector: missing ${vectorDepth} closing bracket(s)`);
  }
  
  return tokens;
};