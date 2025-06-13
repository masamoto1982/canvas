// js/parser.js
const parse = (tokens) => {
  // 新しい計算モデル用のパーサーをここに実装
  // 現在は単純にトークンをそのまま返す
  return tokens.map(token => ({
    type: 'token',
    value: token.value,
    color: token.color,
    tokenType: token.type
  }));
};