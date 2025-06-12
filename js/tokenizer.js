const tokenize = (editor) => {
  if (!editor) return [];
  const tokens = [];

  const extractTokens = (node, currentColor = 'red') => {
    // この関数は、エディタのDOMノードを再帰的に走査します。
    
    // ケース1: ノードがプレーンなテキストノードの場合
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      // 親要素の色（型）を取得、または親から継承した色を使用します。
      const color = node.parentNode && node.parentNode.style && node.parentNode.style.color ?
        rgbToColorName(node.parentNode.style.color) :
        currentColor;

      // この正規表現は、特殊文字（{}、[]、@）を区切り文字としてテキストを分割しますが、区切り文字自体はトークンとして保持します。
      const specialCharRegex = /([\[\]@{}])/g;
      const mainParts = text.split(specialCharRegex).filter(Boolean); // .filter(Boolean) は空文字列を削除します。

      for (const part of mainParts) {
        // partが特殊文字そのものである場合、直接トークンを作成します。
        if (['[', ']', '@', '{', '}'].includes(part)) {
          let type = Types.SYMBOL; // {} と @ はデフォルトでシンボル
          if (part === '[' || part === ']') type = Types.VECTOR; // [] はベクターのヒント
          tokens.push({ value: part, color: color, type: type });
        } else {
          // 特殊文字でない場合、このpartは通常のワードと空白の混在です。
          // 以下の正規表現は、空白の連続か、非空白文字の連続にマッチします。
          const subParts = part.match(/\s+|\S+/g) || [];
          for (const word of subParts) {
            // 空白文字の場合は特別な処理
            if (/^\s+$/.test(word)) {
              tokens.push({
                value: word,
                color: color,
                type: Types.WHITESPACE  // 空白文字専用の型を設定
              });
            } else {
              // 非空白文字の場合は色に基づいて型を決定
              tokens.push({
                value: word,
                color: color,
                type: ColorTypes[color] || Types.SYMBOL  // UNDEFINEDではなくSYMBOLをデフォルトに
              });
            }
          }
        }
      }
    } 
    // ケース2: ノードがBRタグ（改行）の場合。トークン化では無視します。
    else if (node.nodeName === 'BR') {
      // 意図的に空
    } 
    // ケース3: ノードが子を持つ要素（<span>や<font>など）の場合。再帰的に処理します。
    else if (node.childNodes && node.childNodes.length > 0) {
      Array.from(node.childNodes).forEach(child => {
        const nodeColor = node.style && node.style.color ?
          rgbToColorName(node.style.color) :
          currentColor;
        extractTokens(child, nodeColor);
      });
    }
  };

  // トップレベルのエディタ要素から処理を開始します。
  Array.from(editor.childNodes).forEach(node => {
    extractTokens(node);
  });

  // 最後に、コメント（黄色）としてマークされたトークンをすべて除外します。
  const filteredTokens = tokens.filter(token => token.color !== 'yellow');

  console.log("[DEBUG] Tokens:", filteredTokens);
  return filteredTokens;
};