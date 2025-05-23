// テキストエディターの実装
class ColoredTextEditor {
  constructor(editorElement) {
    this.editor = editorElement;
    this.currentColor = 'blue'; // デフォルトはシンボル（青）
    this.setupEditor();
    this.setupEventListeners();
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  setupEditor() {
    this.editor.contentEditable = true;
    this.editor.spellcheck = false;
    this.editor.autocapitalize = 'off';
    this.editor.autocomplete = 'off';
    this.editor.autocorrect = 'off';
    this.updateCaretColor();
  }
  
  setupEventListeners() {
    // キーボードイベント
    this.editor.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.editor.addEventListener('paste', this.handlePaste.bind(this));
    
    // モバイル用の入力イベント
    if (this.isMobile) {
      this.editor.addEventListener('beforeinput', this.handleBeforeInput.bind(this));
      this.editor.addEventListener('input', this.handleInput.bind(this));
    }
    
    // フォーカス時に色を設定
    this.editor.addEventListener('focus', () => {
      this.ensureColorWrapper();
    });
    
    // 色ボタンのイベント設定
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setActiveColor(btn.dataset.color);
      });
    });
  }
  
  handleBeforeInput(e) {
    if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
      e.preventDefault();
      this.insertColoredText(e.data || '');
    }
  }
  
  handleInput(e) {
    // inputイベントで色が失われた場合の補正
    if (this.isMobile && e.inputType === 'insertText') {
      this.correctLastInput();
    }
  }
  
  correctLastInput() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    // 黒文字（色なし）のテキストを検出して色を適用
    if (container.nodeType === Node.TEXT_NODE && 
        container.parentElement === this.editor) {
      const text = container.textContent;
      const offset = range.startOffset;
      
      // テキストを色付きスパンで包む
      const span = document.createElement('span');
      span.style.color = CONSTANTS.EDITOR_COLORS[this.currentColor];
      span.textContent = text;
      
      container.parentElement.replaceChild(span, container);
      
      // カーソル位置を復元
      const newRange = document.createRange();
      newRange.setStart(span.firstChild, Math.min(offset, span.firstChild.length));
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }
  
  handleKeyDown(e) {
    // Enter + Shift で実行
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
    
    // Ctrl/Cmd + 色ショートカット
    if (e.ctrlKey || e.metaKey) {
      const colorMap = {
        'r': 'red',
        'y': 'yellow', 
        'g': 'green',
        'b': 'blue'
      };
      
      const color = colorMap[e.key.toLowerCase()];
      if (color) {
        e.preventDefault();
        this.setActiveColor(color);
        return;
      }
    }
    
    // Tab でスペース4つ
    if (e.key === 'Tab') {
      e.preventDefault();
      this.insertColoredText('    ');
      return;
    }
  }
  
  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    this.insertColoredText(text);
  }
  
  insertColoredText(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    // 色付きスパンを作成
    const span = document.createElement('span');
    span.style.color = CONSTANTS.EDITOR_COLORS[this.currentColor];
    span.textContent = text;
    
    range.insertNode(span);
    
    // カーソルを移動
    range.setStartAfter(span);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  insertText(text) {
    // 外部からの挿入（D2D入力など）
    this.insertColoredText(text);
    this.editor.focus();
  }
  
  insertNewline() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const br = document.createElement('br');
      range.deleteContents();
      range.insertNode(br);
      
      // カーソルを改行後に移動
      const newRange = document.createRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // 色のラッパーを確保
      this.ensureColorWrapper();
    }
  }
  
  ensureColorWrapper() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    // エディター直下にいる場合、色付きスパンを作成
    if (container === this.editor || 
        (container.nodeType === Node.TEXT_NODE && container.parentElement === this.editor)) {
      const span = document.createElement('span');
      span.style.color = CONSTANTS.EDITOR_COLORS[this.currentColor];
      
      if (container === this.editor) {
        // 空のZWSP（ゼロ幅スペース）を入れて編集可能にする
        span.innerHTML = '\u200B';
        range.insertNode(span);
        range.selectNodeContents(span);
        range.collapse(false);
      } else {
        // テキストノードをスパンで包む
        container.parentElement.replaceChild(span, container);
        span.appendChild(container);
        range.selectNodeContents(span);
        range.collapse(false);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  
  setActiveColor(color) {
    this.currentColor = color;
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    // カーソルの色を更新
    this.updateCaretColor();
    
    // 選択中のテキストがあれば色を変更
    const selection = window.getSelection();
    if (!selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const contents = range.extractContents();
      
      const span = document.createElement('span');
      span.style.color = CONSTANTS.EDITOR_COLORS[color];
      span.appendChild(contents);
      
      range.insertNode(span);
      
      // 選択を解除
      selection.removeAllRanges();
    }
    
    // 次の入力のための準備
    this.ensureColorWrapper();
  }
  
  updateCaretColor() {
    this.editor.style.caretColor = CONSTANTS.EDITOR_COLORS[this.currentColor];
  }
  
  clear() {
    this.editor.innerHTML = '';
    this.editor.focus();
    this.ensureColorWrapper();
  }
  
  getContent() {
    return this.editor;
  }
}