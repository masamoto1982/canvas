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

      // 正規表現を修正: 演算子も分割の対象にする
      const regex = /(\s+|[\[\]{}@+\-*\/=]|==|>=|>)/;
      const parts = text.split(regex).filter(part => part && part.trim());

      for (const part of parts) {
        if (part.trim()) {
            // '==' と '=' のような複数文字の演算子を正しく処理
            if (['[', ']', '{', '}', '@', '+', '-', '*', '/', '>', '>=', '==', '='].includes(part)) {
                 tokens.push({
                     value: part,
                     color: 'red', // 演算子はsymbolとして扱う
                     type: Types.SYMBOL
                 });
            } else if (part === 'NIL') {
                tokens.push({
                    value: part,
                    color: color,
                    type: color === 'orange' ? Types.NIL : Types.UNDEFINED
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
      // BRタグは無視
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

  // トークン結合のロジックを簡略化（>=, == のような複数文字演算子のため）
  const finalTokens = [];
  for (let i = 0; i < filteredTokens.length; i++) {
      const current = filteredTokens[i];
      const next = filteredTokens[i+1];
      if (next && (current.value === '>' || current.value === '=') && next.value === '=') {
          finalTokens.push({ value: current.value + next.value, color: 'red', type: Types.SYMBOL });
          i++; // 次のトークンをスキップ
      } else {
          finalTokens.push(current);
      }
  }

  return finalTokens;
};