// UI全体の管理とイベント処理
class UIManager {
  constructor() {
    this.editor = null;
    this.d2dInput = null;
    this.language = new CanvasLanguage();
    this.isMobile = this.checkMobile();
    
    this.init();
  }
  
  init() {
    // エディターの初期化
    const editorElement = document.getElementById('editor');
    this.editor = new ColoredTextEditor(editorElement);
    
    // D2D入力の初期化
    const d2dContainer = document.getElementById('d2d-container');
    this.d2dInput = new D2DInput(d2dContainer);
    
    // ボタンイベントの設定
    this.setupButtons();
    
    // モバイル対応
    if (this.isMobile) {
      this.setupMobileUI();
    }
    
    // 初期フォーカス
    editorElement.focus();
  }
  
  setupButtons() {
    // 実行ボタン
    document.getElementById('execute-btn').addEventListener('click', () => {
      this.executeCode();
    });
    
    // クリアボタン
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearEditor();
    });
  }
  
  executeCode() {
    const editorElement = this.editor.getContent();
    const result = this.language.execute(editorElement);
    
    const output = document.getElementById('output');
    output.textContent = result;
    
    // 結果の表示スタイル
    output.classList.remove('success', 'error');
    if (result.startsWith('Error:')) {
      output.classList.add('error');
    } else {
      output.classList.add('success');
    }
    
    // モバイルでは出力セクションを表示
    if (this.isMobile) {
      this.showOutput();
    }
  }
  
  clearEditor() {
    this.editor.clear();
    this.language.reset();
    document.getElementById('output').textContent = '';
  }
  
  insertText(text) {
    this.editor.insertText(text);
    
    // モバイルではエディターを表示
    if (this.isMobile) {
      this.showEditor();
    }
  }
  
  insertNewline() {
    this.editor.insertNewline();
  }
  
  handleDelete(deleteWord = false) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    if (deleteWord) {
      // 単語単位の削除
      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      const offset = range.startOffset;
      
      // 前の単語の境界を探す
      let text = '';
      let node = container;
      
      if (node.nodeType === Node.TEXT_NODE) {
        text = node.textContent.substring(0, offset);
      }
      
      // 単語の開始位置を見つける
      const match = text.match(/\S+\s*$/);
      if (match) {
        const deleteLength = match[0].length;
        range.setStart(container, offset - deleteLength);
        range.deleteContents();
      }
    } else {
      // 1文字削除
      document.execCommand('delete');
    }
  }
  
  checkMobile() {
    return window.matchMedia('(max-width: 768px)').matches ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
  }
  
  setupMobileUI() {
    // モバイル用のUI調整
    const outputSection = document.querySelector('.output-section');
    const editorSection = document.querySelector('.editor-section');
    
    // 初期状態では出力を非表示
    outputSection.classList.add('hidden');
  }
  
  showOutput() {
    const outputSection = document.querySelector('.output-section');
    const editorSection = document.querySelector('.editor-section');
    
    outputSection.classList.remove('hidden');
    outputSection.classList.add('active');
    editorSection.classList.add('hidden');
  }
  
  showEditor() {
    const outputSection = document.querySelector('.output-section');
    const editorSection = document.querySelector('.editor-section');
    
    outputSection.classList.remove('active');
    outputSection.classList.add('hidden');
    editorSection.classList.remove('hidden');
  }
}

// グローバルに公開
window.UIManager = UIManager;