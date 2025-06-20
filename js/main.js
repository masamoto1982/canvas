const setupExecuteButtonListener = () => {
  if (elements.executeButton) {
    elements.executeButton.addEventListener('click', (e) => {
      e.preventDefault();
      executeCode();
    });
  }
};

const setupClearButtonListener = () => {
  if (elements.clearButton) {
    elements.clearButton.addEventListener('click', clearInput);
  }
};

const setupKeyboardHandlers = () => {
  document.addEventListener('keydown', (e) => {
    if (e.target === elements.input || e.target === elements.output) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteAction(e.ctrlKey || e.metaKey);
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      insertAtCursor(' ');
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) executeCode();
      else insertAtCursor('\n');
    }
  });
};

const initResponsiveLayout = () => {
  const checkLayout = () => {
    if (isMobileDevice()) {
      // モバイルではデフォルトでoutputセクションを非表示に
      if (elements.textSection && elements.outputSection) {
        elements.outputSection.classList.add('hide');
        elements.textSection.classList.remove('hide');
      }
    } else {
      // デスクトップでは両方表示
      if (elements.outputSection) elements.outputSection.classList.remove('hide');
      if (elements.textSection) elements.textSection.classList.remove('hide');
    }
  };
  
  window.addEventListener('resize', checkLayout);
  window.addEventListener('orientationchange', checkLayout);
  checkLayout();
};

window.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  elements.input = document.getElementById('txt-input');
  elements.output = document.getElementById('output');
  elements.executeButton = document.getElementById('execute-button');
  elements.clearButton = document.getElementById('clear-button');
  elements.outputSection = document.getElementById('output-section');
  elements.textSection = document.getElementById('text-section');
  elements.stackContent = document.getElementById('stack-content');
  elements.registerContent = document.getElementById('register-content');
  
  console.log("DOM Content Loaded");
  
  // outputセクションのクリックイベント（モバイル用）
  if (elements.outputSection && isMobileDevice()) {
    elements.outputSection.addEventListener('click', (e) => {
      if (e.target === elements.output) return;
      showTextSection();
    });
  }
  
  initResponsiveLayout();
  setupExecuteButtonListener();
  setupClearButtonListener();
  setupKeyboardHandlers();
  initRichTextEditor();
  
  // 初期メモリ表示
  if (typeof interpreter !== 'undefined' && interpreter.reset) {
    interpreter.reset();
  }
});