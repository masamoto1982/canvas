// js/interpreter.js
const interpreter = (() => {
  // 環境（将来の変数や関数の格納用）
  const environment = {};
  
  // 値のフォーマット（分数表示は維持）
  const formatValue = (value) => {
    if (Fraction.isValidNumber(value)) {
      return value.toString();
    } else if (Array.isArray(value)) {
      return '[ ' + value.map(formatValue).join(' ') + ' ]';
    } else if (value === null || value === undefined) {
      return "undefined";
    } else {
      return String(value);
    }
  };
  
  // 実行メソッド（型チェックは維持）
  const execute = (editor) => {
    try {
      const tokens = tokenize(editor);
      if (tokens.length === 0) return "Empty input";
      
      // 型チェック（色彩型システムの維持）
      tokens.forEach(token => {
        // 数値は緑色
        if (!isNaN(parseFloat(token.value)) && token.color !== 'green') {
          throw new Error(`Type Error: Numeric literals must be Number type (green), found ${token.color} for '${token.value}'`);
        }
        
        // ブール値はシアン色
        if (['true', 'false'].includes(token.value.toLowerCase()) && token.color !== 'cyan') {
          throw new Error(`Type Error: Boolean literals must be Boolean type (cyan), found ${token.color} for '${token.value}'`);
        }
        
        // 文字列は青色（クォートで囲まれている場合）
        if ((token.value.startsWith('"') && token.value.endsWith('"')) && token.color !== 'blue') {
          throw new Error(`Type Error: String literals must be String type (blue), found ${token.color} for '${token.value}'`);
        }
      });
      
      // 新しい計算モデルの評価をここに実装
      // 現在は単純にトークンを文字列として結合
      const result = tokens.map(t => t.value).join(' ');
      
      return result || "No evaluation implemented yet";
      
    } catch (err) {
      return `Error: ${err.message}`;
    }
  };
  
  // 環境のリセット
  const resetEnvironment = () => {
    // 環境をクリア
    Object.keys(environment).forEach(key => delete environment[key]);
  };
  
  return {
    execute: execute,
    reset: resetEnvironment,
    getEnvironment: () => ({ ...environment })
  };
})();