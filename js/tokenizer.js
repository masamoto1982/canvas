// tokenizer.js

// Potentially export tokenize
// export const tokenize = (editor) => { ... };

const tokenize = (editor) => { //
  if (!editor) return [];

  const tokens = [];

  const extractTokens = (node, currentColor = 'cyan') => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) : // Needs rgbToColorName
        currentColor;
      const parts = text.trim().split(/\s+/);
      for (const part of parts) {
        if (part) {
          tokens.push({
            value: part,
            color: color,
            type: ColorTypes[color] || Types.UNDEFINED // Needs ColorTypes, Types
          });
        }
      }
    } else if (node.nodeName === 'BR') {
      // Ignore newlines
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