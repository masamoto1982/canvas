// データモデル：トークンベースの内部表現
class CanvasDataModel {
  constructor() {
    this.tokens = [];
    this.cursorPosition = 0;
  }
  
  // トークンを追加
  addToken(type, value, position = null) {
    const token = { type, value, id: this.generateId() };
    
    if (position !== null) {
      this.tokens.splice(position, 0, token);
      if (position <= this.cursorPosition) {
        this.cursorPosition++;
      }
    } else {
      this.tokens.splice(this.cursorPosition, 0, token);
      this.cursorPosition++;
    }
    
    return token;
  }
  
  // 複数文字を一度に追加
  addText(text, type) {
    const chars = Array.from(text); // Unicode対応
    for (const char of chars) {
      if (char === '\n') {
        this.addToken(CONSTANTS.TOKEN_TYPES.SPECIAL, char);
      } else if (char === ' ') {
        this.addToken(CONSTANTS.TOKEN_TYPES.SPECIAL, char);
      } else {
        this.addToken(type, char);
      }
    }
  }
  
  // カーソル位置の前のトークンを削除
  deleteToken() {
    if (this.cursorPosition > 0) {
      this.tokens.splice(this.cursorPosition - 1, 1);
      this.cursorPosition--;
      return true;
    }
    return false;
  }
  
  // 単語単位で削除
  deleteWord() {
    if (this.cursorPosition === 0) return 0;
    
    let deleteCount = 0;
    let i = this.cursorPosition - 1;
    
    // 空白をスキップ
    while (i >= 0 && (this.tokens[i].value === ' ' || this.tokens[i].value === '\n')) {
      deleteCount++;
      i--;
    }
    
    // 単語を削除
    while (i >= 0 && this.tokens[i].value !== ' ' && this.tokens[i].value !== '\n') {
      deleteCount++;
      i--;
    }
    
    if (deleteCount > 0) {
      this.tokens.splice(this.cursorPosition - deleteCount, deleteCount);
      this.cursorPosition -= deleteCount;
    }
    
    return deleteCount;
  }
  
  // カーソルを移動
  moveCursor(direction, amount = 1) {
    if (direction === 'left') {
      this.cursorPosition = Math.max(0, this.cursorPosition - amount);
    } else if (direction === 'right') {
      this.cursorPosition = Math.min(this.tokens.length, this.cursorPosition + amount);
    } else if (direction === 'home') {
      this.cursorPosition = 0;
    } else if (direction === 'end') {
      this.cursorPosition = this.tokens.length;
    }
  }
  
  // 行の開始位置に移動
  moveCursorToLineStart() {
    let pos = this.cursorPosition - 1;
    while (pos >= 0 && this.tokens[pos].value !== '\n') {
      pos--;
    }
    this.cursorPosition = pos + 1;
  }
  
  // 行の終了位置に移動
  moveCursorToLineEnd() {
    let pos = this.cursorPosition;
    while (pos < this.tokens.length && this.tokens[pos].value !== '\n') {
      pos++;
    }
    this.cursorPosition = pos;
  }
  
  // プレーンテキスト形式でエクスポート
  toPlainText() {
    return this.tokens
      .map(token => `${token.type}:${token.value}`)
      .join(' ');
  }
  
  // プレーンテキストからインポート
  fromPlainText(text) {
    this.tokens = [];
    this.cursorPosition = 0;
    
    const parts = text.trim().split(' ');
    for (const part of parts) {
      const match = part.match(/^(number|string|variable|symbol|special):(.+)$/);
      if (match) {
        const [, type, value] = match;
        this.tokens.push({
          type,
          value: value === '\\n' ? '\n' : value,
          id: this.generateId()
        });
      }
    }
    
    this.cursorPosition = this.tokens.length;
  }
  
  // 実行用のテキストを取得（型情報なし）
  getExecutableText() {
    return this.tokens.map(token => token.value).join('');
  }
  
  // レンダリング用データを取得
  getRenderData() {
    return {
      tokens: this.tokens.slice(),
      cursorPosition: this.cursorPosition
    };
  }
  
  // モデルをクリア
  clear() {
    this.tokens = [];
    this.cursorPosition = 0;
  }
  
  // ユニークIDを生成
  generateId() {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 範囲選択用のメソッド（将来の拡張用）
  getTokensInRange(start, end) {
    return this.tokens.slice(start, end);
  }
  
  // デバッグ用
  debug() {
    console.log('Tokens:', this.tokens);
    console.log('Cursor Position:', this.cursorPosition);
    console.log('Executable:', this.getExecutableText());
  }
}

// グローバルに公開
window.CanvasDataModel = CanvasDataModel;