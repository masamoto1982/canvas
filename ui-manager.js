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
    // D2D入力からのテキスト挿入
    const editorElement = document.getElementById('editor');
    
    // モバイルでもデスクトップでも同じ処理を使用
    this.insertColoredText(text);
    
    // モバイルではエディターを表示
    if (this.isMobile) {
      this.showEditor();
    }
  }
  
  insertColoredText(text) {
    const editorElement = document.getElementById('editor');
    const selection = window.getSelection();
    
    // 既存の選択範囲を取得または作成
    let range;
    if (selection.rangeCount > 0 && editorElement.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      // エディター内の最後に挿入
      range = document.createRange();
      if (editorElement.lastChild) {
        // 最後の子要素の後に挿入
        if (editorElement.lastChild.nodeType === Node.ELEMENT_NODE) {
          range.selectNodeContents(editorElement.lastChild);
          range.collapse(false);
        } else {
          range.setStartAfter(editorElement.lastChild);
          range.collapse(true);
        }
      } else {
        range.selectNodeContents(editorElement);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // 現在の色を取得
    const currentColor = this.editor.currentColor;
    const colorValue = CONSTANTS.EDITOR_COLORS[currentColor];
    
    // 色付きスパンを作成
    const span = document.createElement('span');
    span.style.color = colorValue;
    span.textContent = text;
    
    // 挿入
    range.deleteContents();
    range.insertNode(span);
    
    // カーソル位置を更新
    range.setStartAfter(span);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // エディターの状態を維持
    if (this.isMobile && document.activeElement !== editorElement) {
      // モバイルでキーボードを表示しない
      editorElement.blur();
    }
  }
  
  insertNewline() {
    const editorElement = document.getElementById('editor');
    const selection = window.getSelection();
    
    // 選択範囲を取得または作成
    let range;
    if (selection.rangeCount > 0 && editorElement.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      if (editorElement.lastChild) {
        if (editorElement.lastChild.nodeType === Node.ELEMENT_NODE) {
          range.selectNodeContents(editorElement.lastChild);
          range.collapse(false);
        } else {
          range.setStartAfter(editorElement.lastChild);
          range.collapse(true);
        }
      } else {
        range.selectNodeContents(editorElement);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // 改行を挿入
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    
    // 次の行のための色付きスパンを準備
    const currentColor = this.editor.currentColor;
    const colorValue = CONSTANTS.EDITOR_COLORS[currentColor];
    const span = document.createElement('span');
    span.style.color = colorValue;
    span.innerHTML = '\u200B'; // ゼロ幅スペース
    
    // 改行後にスパンを挿入
    range.setStartAfter(br);
    range.collapse(true);
    range.insertNode(span);
    
    // カーソル位置を更新
    range.selectNodeContents(span);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // モバイルでキーボードを表示しない
    if (this.isMobile && document.activeElement !== editorElement) {
      editorElement.blur();
    }
  }
  
  handleDelete(deleteWord = false) {
    const editorElement = document.getElementById('editor');
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    if (deleteWord) {
      // 単語単位の削除
      const container = range.startContainer;
      const offset = range.startOffset;
      
      if (container.nodeType === Node.TEXT_NODE && offset > 0) {
        const text = container.textContent.substring(0, offset);
        const match = text.match(/\S+\s*$/);
        if (match) {
          const deleteLength = match[0].length;
          range.setStart(container, offset - deleteLength);
          range.deleteContents();
        }
      }
    } else {
      // 1文字削除
      if (range.startOffset > 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
        range.setStart(range.startContainer, range.startOffset - 1);
        range.deleteContents();
      } else if (range.startOffset === 0 && range.startContainer.previousSibling) {
        // 前の要素の最後の文字を削除
        const prev = range.startContainer.previousSibling;
        if (prev.nodeType === Node.TEXT_NODE) {
          prev.textContent = prev.textContent.slice(0, -1);
          if (prev.textContent.length === 0) {
            prev.remove();
          }
        } else if (prev.nodeType === Node.ELEMENT_NODE && prev.tagName === 'BR') {
          prev.remove();
        } else if (prev.nodeType === Node.ELEMENT_NODE && prev.lastChild) {
          // spanなどの要素の中身を削除
          if (prev.lastChild.nodeType === Node.TEXT_NODE) {
            prev.lastChild.textContent = prev.lastChild.textContent.slice(0, -1);
            if (prev.lastChild.textContent.length === 0) {
              prev.remove();
            }
          }
        }
      }
    }
    
    // モバイルでキーボードを表示しない
    if (this.isMobile && document.activeElement !== editorElement) {
      editorElement.blur();
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