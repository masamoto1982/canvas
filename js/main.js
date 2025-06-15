// js/main.js
// DOM要素のID定義
const elementIds = {
  output: 'output',
  input: 'txt-input',
  dotGrid: 'dot-grid',
  specialRow: 'special-row',
  lineCanvas: 'line-canvas',
  clearButton: 'clear-button',
  executeButton: 'execute-button',
  d2dInput: 'd2d-input',
  textSection: 'text-section',
  outputSection: 'output-section'
};

// モバイルビューの初期化
const initializeMobileView = () => {
  if (!isMobileDevice()) return;
  
  // 初期状態でtext-sectionを表示
  if (elements.textSection) {
    elements.textSection.classList.remove('hide');
  }
  if (elements.outputSection) {
    elements.outputSection.classList.add('hide');
  }
};

// イベントリスナーの設定
const setupEventListeners = () => {
  // Clear button
  if (elements.clearButton) {
    elements.clearButton.addEventListener('click', () => {
      clearInput();
    });
  }
  
  // Execute button
  if (elements.executeButton) {
    elements.executeButton.addEventListener('click', () => {
      executeCode();
    });
  }
  
  // モバイルでの画面切り替え
  if (isMobileDevice()) {
    // Output section タップで入力画面に戻る
    if (elements.outputSection) {
      elements.outputSection.addEventListener('click', (e) => {
        // textarea自体をクリックした場合は切り替えない
        if (e.target.id !== 'output') {
          showTextSection();
        }
      });
    }
    
    // Output textareaをタップした場合も入力画面に戻る
    if (elements.output) {
      elements.output.addEventListener('click', (e) => {
        e.stopPropagation();
        showTextSection();
      });
    }
  }
  
  // キーボードショートカット
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter または Cmd+Enter で実行
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCode();
    }
  });
};

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  
  // 要素の初期化（state.jsのelementsオブジェクトに値を設定）
  Object.keys(elementIds).forEach(key => {
    const id = elementIds[key];
    if (id) {
      elements[key] = document.getElementById(id);
    }
  });
  
  // モバイルビューの初期化
  initializeMobileView();
  
  // D2D入力の初期化
  console.log('d2d-input element:', elements.d2dInput);
  if (typeof initializeD2D === 'function') {
    console.log('Initializing d2d-input');
    initializeD2D();
  } else {
    console.error('initializeD2D function not found');
  }
  
  // リッチテキストエディタの初期化
  if (typeof initRichTextEditor === 'function') {
    initRichTextEditor();
  } else {
    console.error('initRichTextEditor function not found');
  }
  
  // モバイルモードの場合、初期状態でキーボードを表示しない
  if (isMobileDevice() && elements.input) {
    elements.input.isKeyboardMode = false;
    if (typeof focusWithoutKeyboard === 'function') {
      focusWithoutKeyboard(elements.input);
    }
  }
  
  // イベントリスナーの設定
  setupEventListeners();
  
  console.log('Initialization complete');
});