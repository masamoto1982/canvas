const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  // tokenizer.js - extractTokens 関数内の修正
const extractTokens = (node, currentColor = 'red') => {  // デフォルトを 'cyan' から 'red' に変更
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
      rgbToColorName(node.parentNode.style.color) :
      currentColor;
    const parts = text.trim().split(/\s+/);
    for (const part of parts) {
      if (part) {
        const prefixMatch = part.match(/^(number|boolean|string|symbol):(.+)$/);
        if (prefixMatch) {
          const [, type, value] = prefixMatch;
          const prefixColor = {
            'number': 'green',
            'boolean': 'red',
            'string': 'blue',
            'symbol': 'red'  // 'cyan' から 'red' に変更
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