// js/tokenizer.js
const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];
  
  const extractTokens = (node, currentColor = 'red') => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;
      
      // スペースで分割してトークン化（基本的な処理のみ）
      const parts = text.split(/(\s+)/).filter(part => part && part.trim());
      
      for (const part of parts) {
        if (part.trim()) {
          // 型プレフィックスの処理は維持
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
  
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });
  
  // コメント色（黄色）のトークンをフィルタリング
  const filteredTokens = tokens.filter(token => token.color !== 'yellow');
  
  return filteredTokens;
};