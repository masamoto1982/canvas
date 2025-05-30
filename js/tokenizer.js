const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  
  const extractTokens = (node, currentColor = 'red') => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;
      
      // テキストをトークンに分割する際、[ と ] を個別のトークンとして扱う
      const regex = /(\[|\]|\s+)/;
      const parts = text.split(regex).filter(part => part && part.trim());
      
      for (const part of parts) {
        if (part.trim()) {
          // [ と ] は常に紫色のトークンとして扱う
          if (part === '[' || part === ']') {
            tokens.push({
              value: part,
              color: 'purple',
              type: Types.LIST
            });
          } else {
            const prefixMatch = part.match(/^(number|boolean|string|symbol|list):(.+)$/);
            if (prefixMatch) {
              const [, type, value] = prefixMatch;
              const prefixColor = {
                'number': 'green',
                'boolean': 'yellow',
                'string': 'blue',
                'symbol': 'red',
                'list': 'purple'
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