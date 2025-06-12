const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];

  // 最長一致でDictionary内のワードを検索する関数
  const findLongestMatch = (text, startPos) => {
    const dictionary = interpreter.getDictionary();
    let longestMatch = null;
    let longestLength = 0;

    // Dictionary内の全ワードをチェック（長い順にソート済み）
    for (const word of dictionary) {
      if (text.substr(startPos).startsWith(word) && word.length > longestLength) {
        longestMatch = word;
        longestLength = word.length;
      }
    }

    return longestMatch;
  };

  // テキストをトークンに分解する関数
  const tokenizeText = (text, color) => {
    const localTokens = [];
    let position = 0;

    while (position < text.length) {
      // 1. まず空白文字をチェック
      if (/\s/.test(text[position])) {
        let whitespaceEnd = position;
        while (whitespaceEnd < text.length && /\s/.test(text[whitespaceEnd])) {
          whitespaceEnd++;
        }
        localTokens.push({
          value: text.substring(position, whitespaceEnd),
          color: color,
          type: Types.WHITESPACE
        });
        position = whitespaceEnd;
        continue;
      }

      // 2. Dictionary内のワードを最長一致で検索
      const dictMatch = findLongestMatch(text, position);
      if (dictMatch) {
        localTokens.push({
          value: dictMatch,
          color: color,
          type: ColorTypes[color] || Types.SYMBOL
        });
        position += dictMatch.length;
        continue;
      }

      // 3. 数値をチェック（小数点やスラッシュも含む）
      if (/[0-9]/.test(text[position])) {
        let numEnd = position;
        while (numEnd < text.length && /[0-9./]/.test(text[numEnd])) {
          numEnd++;
        }
        localTokens.push({
          value: text.substring(position, numEnd),
          color: color,
          type: ColorTypes[color] || Types.SYMBOL
        });
        position = numEnd;
        continue;
      }

      // 4. 演算子や特殊記号をチェック
      const operators = ['+', '-', '*', '/', '>', '>=', '==', '='];
      let operatorMatched = false;
      for (const op of operators.sort((a, b) => b.length - a.length)) {
        if (text.substr(position).startsWith(op)) {
          localTokens.push({
            value: op,
            color: color,
            type: ColorTypes[color] || Types.SYMBOL
          });
          position += op.length;
          operatorMatched = true;
          break;
        }
      }
      if (operatorMatched) continue;

      // 5. それ以外の文字を収集（次の境界まで）
      let wordEnd = position + 1;
      while (wordEnd < text.length) {
        // 次の位置が空白、数字の開始、演算子、またはDictionary内のワードの開始なら停止
        if (/\s/.test(text[wordEnd]) || 
            /[0-9]/.test(text[wordEnd]) ||
            operators.some(op => text.substr(wordEnd).startsWith(op)) ||
            findLongestMatch(text, wordEnd)) {
          break;
        }
        wordEnd++;
      }

      localTokens.push({
        value: text.substring(position, wordEnd),
        color: color,
        type: ColorTypes[color] || Types.SYMBOL
      });
      position = wordEnd;
    }

    return localTokens;
  };

  const extractTokens = (node, currentColor = 'red') => {
    // ケース1: テキストノード
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;

      // 特殊文字で分割
      const specialCharRegex = /([\[\]@{}])/g;
      const mainParts = text.split(specialCharRegex).filter(Boolean);

      for (const part of mainParts) {
        if (['[', ']', '@', '{', '}'].includes(part)) {
          let type = Types.SYMBOL;
          if (part === '[' || part === ']') type = Types.VECTOR;
          tokens.push({ value: part, color: color, type: type });
        } else {
          // テキスト部分をトークン化
          const partTokens = tokenizeText(part, color);
          tokens.push(...partTokens);
        }
      }
    }
    // ケース2: BR要素（無視）
    else if (node.nodeName === 'BR') {
      // 意図的に空
    }
    // ケース3: 子要素を持つノード
    else if (node.childNodes && node.childNodes.length > 0) {
      Array.from(node.childNodes).forEach(child => {
        const nodeColor = node.style && node.style.color ?
          rgbToColorName(node.style.color) :
          currentColor;
        extractTokens(child, nodeColor);
      });
    }
  };

  // メイン処理
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });

  // コメント（黄色）を除外
  const filteredTokens = tokens.filter(token => token.color !== 'yellow');

  console.log("[DEBUG] Tokens:", filteredTokens.map(t => `"${t.value}"`));
  console.log("[DEBUG] Dictionary:", interpreter.getDictionary());
  
  return filteredTokens;
};