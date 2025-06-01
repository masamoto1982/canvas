const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  
  // @ を個別のトークンとして扱うように修正
const extractTokens = (node, currentColor = 'red') => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
      rgbToColorName(node.parentNode.style.color) :
      currentColor;
    
    // @ を個別に分割するように正規表現を修正
    const regex = /(\[|\]|@|\s+)/;
    const parts = text.split(regex).filter(part => part && part.trim());
    
    for (const part of parts) {
      if (part.trim()) {
        // [ と ] は紫色
        if (part === '[' || part === ']') {
          tokens.push({
            value: part,
            color: 'purple',
            type: Types.VECTOR
          });
        } 
        // @ は赤色（シンボル）
        else if (part === '@') {
          tokens.push({
            value: part,
            color: 'red',
            type: Types.SYMBOL
          });
        } else {
          // 既存の処理
          const prefixMatch = part.match(/^(number|boolean|string|symbol|vector):(.+)$/);
          if (prefixMatch) {
            const [, type, value] = prefixMatch;
            const prefixColor = {
              'number': 'green',
              'boolean': 'yellow',
              'string': 'blue',
              'symbol': 'red',
              'vector': 'purple'
            }[type];
            tokens.push({
              value: value,
              color: prefixColor || color,
              type: ColorTypes[prefixColor] || Types.UNDEFINED
            });
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
    // 改行は無視
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
  
  const filteredTokens = [];
  let skipRestOfLine = false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].value === '#') {
      skipRestOfLine = true;
    } else if (tokens[i].value.includes('\n')) {
      skipRestOfLine = false;
    }
    if (!skipRestOfLine) {
      filteredTokens.push(tokens[i]);
    }
  }
  
  return filteredTokens;
};