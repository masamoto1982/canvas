// テキスト入力の管理
class TextInput {
  constructor(editorElement, model) {
    this.editor = editorElement;
    this.model = model;
    this.currentType = CONSTANTS.TOKEN_TYPES.SYMBOL; // デフォルト
    this.isComposing = false;
    
    this.setupEditor();
    this.setupEventListeners();
    this.render();
  }
  
  setupEditor() {
    this.editor.contentEditable = true;
    this.editor.spellcheck = false;
    this.editor.autocapitalize = 'off';
    this.editor.autocomplete = 'off';
    this.editor.autocorrect = 'off';
    
    // 初期のキャレット色設定
    this.updateCaretColor();
  }
  
  setupEventListeners() {
    // キーボードイベント
    this.editor.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.editor.addEventListener('beforeinput', this.handleBeforeInput.bind(this));
    this.editor.addEventListener('compositionstart', () => this.isComposing = true);
    this.editor.addEventListener('compositionend', () => this.isComposing = false);
    this.editor.addEventListener('paste', this.handlePaste.bind(this));
    
    // 色ボタンのイベント
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.setCurrentType(type);
      });
    });
  }
  
  handleKeyDown(e) {
    // コンポジション中は処理しない
    if (this.isComposing) return;
    
    // Shift + Enter で実行
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.getElementById('execute-btn').click();
      return;
    }
    
    // Enter で改行
    if (e.key === 'Enter') {
      e.preventDefault();
      this.insertNewline();
      return;
    }
    
    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        this.model.deleteWord();
      } else {
        this.model.deleteToken();
      }
      this.render();
      return;
    }
    
    // カーソル移動
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.model.moveCursor('left');
      this.render();
      return;
    }
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.model.moveCursor('right');
      this.render();
      return;
    }
    
    if (e.key === 'Home') {
      e.preventDefault();
      this.model.moveCursorToLineStart();
      this.render();
      return;
    }
    
    if (e.key === 'End') {
      e.preventDefault();
      this.model.moveCursorToLineEnd();
      this.render();
      return;
    }
    
    // Ctrl/Cmd + 色切り替え
    if (e.ctrlKey || e.metaKey) {
      const typeMap = {
        'r': CONSTANTS.TOKEN_TYPES.NUMBER,
        'y': CONSTANTS.TOKEN_TYPES.STRING,
        'g': CONSTANTS.TOKEN_TYPES.VARIABLE,
        'b': CONSTANTS.TOKEN_TYPES.SYMBOL
      };
      
      const type = typeMap[e.key.toLowerCase()];
      if (type) {
        e.preventDefault();
        this.setCurrentType(type);
        return;
      }
    }
    
    // Tab でスペース4つ
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertText('    ');
      return;
    }
  }
  
  handleBeforeInput(e) {
    if (this.isComposing) return;
    
    if (e.inputType === 'insertText' && e.data) {
      e.preventDefault();
      this.insertText(e.data);
    }
  }
  
  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    this.insertText(text);
  }
  
  insertText(text) {
    this.model.addText(text, this.currentType);
    this.render();
  }
  
  insertNewline() {
    this.model.addToken(CONSTANTS.TOKEN_TYPES.SPECIAL, '\n');
    this.render();
  }
  
  setCurrentType(type) {
    this.currentType = type;
    this.updateCaretColor();
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }
  
  updateCaretColor() {
    const color = CONSTANTS.TYPE_TO_COLOR[this.currentType];
    this.editor.style.caretColor = CONSTANTS.EDITOR_COLORS[color];
  }
  
  render() {
    const renderData = this.model.getRenderData();
    this.editor.innerHTML = '';
    
    renderData.tokens.forEach((token, index) => {
      // カーソル位置の処理
      if (index === renderData.cursorPosition) {
        const cursor = document.createElement('span');
        cursor.className = 'token-cursor';
        cursor.style.color = this.editor.style.caretColor;
        this.editor.appendChild(cursor);
      }
      
      // トークンの処理
      if (token.value === '\n') {
        this.editor.appendChild(document.createElement('br'));
      } else if (token.value === ' ') {
        this.editor.appendChild(document.createTextNode(' '));
      } else {
        const span = document.createElement('span');
        span.className = `token token-${token.type}`;
        span.textContent = token.value;
        this.editor.appendChild(span);
      }
    });
    
    // 最後の位置にカーソル
    if (renderData.cursorPosition === renderData.tokens.length) {
      const cursor = document.createElement('span');
      cursor.className = 'token-cursor';
      cursor.style.color = this.editor.style.caretColor;
      this.editor.appendChild(cursor);
    }
    
    // スクロール位置を維持
    this.editor.scrollTop = this.editor.scrollHeight;
  }
  
  // 外部からの操作用メソッド
  clear() {
    this.model.clear();
    this.render();
  }
  
  getCurrentType() {
    return this.currentType;
  }
  
  focus() {
    this.editor.focus();
  }
  
  blur() {
    this.editor.blur();
  }
}

// グローバルに公開
window.TextInput = TextInput;