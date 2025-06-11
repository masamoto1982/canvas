// js/tokenizer.js
const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  
  // js/tokenizer.js の extractTokens 関数内の該当部分
const extractTokens = (node, currentColor = 'red') => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
      rgbToColorName(node.parentNode.style.color) :
      currentColor;
    
    // デバッグログ
    if (text.includes('NIL')) {
      console.log('Found NIL text:', text, 'with color:', color);
    }
    
    const regex = /(\[|\]|@|\s+)/;
    const parts = text.split(regex).filter(part => part && part.trim());
    for (const part of parts) {
      if (part.trim()) {
        if (part === '[' || part === ']') {
          tokens.push({
            value: part,
            color: color,
            type: color === 'purple' ? Types.VECTOR : Types.UNDEFINED
          });
        }
        else if (part === '@') {
          tokens.push({
            value: part,
            color: color,
            type: Types.SYMBOL
          });
        } else if (part === 'NIL') {
          // NILの特別処理
          console.log('Creating NIL token with color:', color);
          tokens.push({
            value: part,
            color: color,
            type: color === 'orange' ? Types.NIL : Types.UNDEFINED
          });
        } else {
          const prefixMatch = part.match(/^(number|boolean|string|symbol|vector|nil|comment):(.+)$/);
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
            // nil:NILの場合の特別処理
            if (type === 'nil' && value === 'NIL') {
              tokens.push({
                value: 'NIL',
                color: 'orange',
                type: Types.NIL
              });
            } else {
              tokens.push({
                value: value,
                color: prefixColor || color,
                type: ColorTypes[prefixColor] || Types.UNDEFINED
              });
            }
          } else {
            tokens.push({
              value: part,
              color: color,
              type: ColorTypes[color] || Types.UNDEFINED
            });
          }
        }
      }
    }
  } else if (node.nodeName === 'BR') {
  } else if (node.childNodes && node.childNodes.length > 0) {
    Array.from(node.childNodes).forEach(child => {
      const nodeColor = node.style && node.style.color ?
        rgbToColorName(node.style.color) :
        currentColor;
      extractTokens(child, nodeColor);
    });
  }
};
  
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });
  
  // コメント色（黄色）のトークンをフィルタリング
  const filteredTokens = tokens.filter(token => token.color !== 'yellow');
  
  return filteredTokens;
};