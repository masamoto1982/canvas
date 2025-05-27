// txt-input.js

// 型プレフィックスのパターンを定義
const typePrefix = {
  'number': 'green',
  'boolean': 'red',
  'string': 'blue',
  'symbol': 'cyan'
};

// グローバル変数として現在の色を管理
let currentActiveColor = 'cyan';

const executeCode = () => {
  // 実行開始を通知
  window.dispatchEvent(new Event('execute-code-start'));
  
  const editor = elements.input;
  if (!editor) return;
  
  // まずキーボードとフォーカスを確実に解除
  if (isMobileDevice()) {
    editor.blur();
    editor.isKeyboardMode = false;
    
    // Androidキーボードを強制的に閉じる
    if (document.activeElement === editor) {
      document.activeElement.blur();
    }
  }
  
  const result = interpreter.execute(editor);
  if (elements.output) {
    elements.output.value = result;
    if (!result.startsWith('Error:')) {
      elements.output.classList.add('executed');
      setTimeout(() => elements.output.classList.remove('executed'), 300);
      editor.innerHTML = '';
    }
  }
  
  // モバイルモードでは確実にoutputセクションを表示
  if (isMobileDevice()) {
    // キーボードが閉じるのを待ってから画面切り替え
    setTimeout(() => {
      if (elements.textSection && elements.outputSection) {
        elements.textSection.classList.add('hide');
        elements.outputSection.classList.remove('hide');
      }
    }, 150);
  }
};

// 型プレフィックスを検出して適用する関数を修正
const detectAndApplyTypePrefix = (editor) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  
  // テキストノードを取得
  let textNode = container;
  if (container.nodeType !== Node.TEXT_NODE) {
    // 親要素がspanなどの場合、その親のテキストノードを探す
    if (container.childNodes.length > 0) {
      textNode = container.childNodes[container.childNodes.length - 1];
    }
  }
  
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
  
  const text = textNode.textContent;
  const cursorPos = textNode === range.startContainer ? range.startOffset : text.length;
  
  // カーソル位置から逆向きに検索して現在の単語を取得
  let wordStart = cursorPos;
  while (wordStart > 0 && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\n') {
    wordStart--;
  }
  
  const currentWord = text.substring(wordStart, cursorPos);
  
  // 型プレフィックスパターンをチェック
  const prefixMatch = currentWord.match(/^(number|boolean|string|symbol):(.+)$/);
  
  if (prefixMatch) {
    const [fullMatch, type, value] = prefixMatch;
    const color = typePrefix[type];
    
    if (color) {
      // 一時的に選択範囲を保存
      const savedSelection = selection.getRangeAt(0).cloneRange();
      
      // プレフィックスを含む全体を選択
      const newRange = document.createRange();
      newRange.setStart(textNode, wordStart);
      newRange.setEnd(textNode, cursorPos);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // 選択範囲を削除
      document.execCommand('delete', false);
      
      // 適切な色で値を挿入
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[color]);
      document.execCommand('insertText', false, value);
      
      // アクティブな色ボタンを更新
      document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
      });
      editor.style.caretColor = colorCodes[color];
      currentActiveColor = color;
    }
  }
};

const insertColoredText = (text, color) => {
  const editor = elements.input;
  if (!editor) return;
  editor.focus();
  if (text === '\n') {
    insertNewline();
    return;
  }
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
  document.execCommand('insertText', false, text);
};

const insertNewline = () => {
  const editor = elements.input;
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    range.setStartAfter(br);
    range.setEndAfter(br);
    selection.removeAllRanges();
    selection.addRange(range);
    br.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    document.execCommand('insertHTML', false, '<br><br>');
  }
};

const insertAtCursor = (text) => {
  const editor = elements.input;
  if (!editor) return;
  // currentActiveColorを使用
  insertColoredText(text, currentActiveColor);
  if (isMobileDevice()) {
    showTextSection();
    // d2d-inputからの入力の場合はキーボードを表示しない
    if (!editor.isKeyboardMode) {
      focusWithoutKeyboard(editor);
    }
  } else {
    focusOnInput();
  }
};

const clearInput = () => {
  if (elements.input) {
    elements.input.innerHTML = '';
    focusOnInput();
  }
};

const handleDeleteAction = (deleteToken = false) => {
  const editor = elements.input;
  if (!editor) return;
  if (deleteToken) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const cursorPosition = getCursorPosition(editor);
    if (cursorPosition === 0) return;
    const fullText = editor.textContent || '';
    let tokenStart = cursorPosition;
    let foundWord = false;
    while (tokenStart > 0) {
      const char = fullText.charAt(tokenStart - 1);
      if (char === ' ' || char === '\n') {
        if (foundWord) break;
      } else {
        foundWord = true;
      }
      tokenStart--;
    }
    let spaceStart = tokenStart;
    while (spaceStart > 0) {
      const char = fullText.charAt(spaceStart - 1);
      if (char === ' ' || char === '\n') spaceStart--;
      else break;
    }
    const range = selection.getRangeAt(0);
    if (editor.firstChild) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        let currentPos = 0;
        const setRange = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.length;
                if (currentPos <= spaceStart && spaceStart < currentPos + nodeLength) {
                    range.setStart(node, spaceStart - currentPos);
                }
                if (currentPos <= cursorPosition && cursorPosition <= currentPos + nodeLength) {
                    range.setEnd(node, cursorPosition - currentPos);
                    return true;
                }
                currentPos += nodeLength;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    if (setRange(node.childNodes[i])) return true;
                }
            }
            return false;
        };
        setRange(editor);
        selection.addRange(range);
        document.execCommand('delete', false);
    }
  } else {
    document.execCommand('delete', false);
  }
  if (isMobileDevice()) {
    focusWithoutKeyboard(editor);
    showTextSection();
  } else {
    focusOnInput();
  }
};

const setupEditorEvents = () => {
  const editor = elements.input;
  if (!editor) return;
  
  // 実行後フラグを追加
  let justExecuted = false;
  
  // モバイルでの入力モード制御
  if (isMobileDevice()) {
    // クリックでキーボード表示
    editor.addEventListener('click', (e) => {
      if (e.isTrusted && !justExecuted) {
        editor.isKeyboardMode = true;
        focusWithKeyboard(editor);
      }
      justExecuted = false;
    });
    
    // フォーカスイベントの制御
    editor.addEventListener('focus', (e) => {
      // 実行直後はtxt-inputを表示しない
      if (justExecuted) {
        e.preventDefault();
        editor.blur();
        justExecuted = false;
        return;
      }
      
      // outputが表示されている場合は、フォーカスを防ぐ
      if (elements.outputSection && !elements.outputSection.classList.contains('hide')) {
        e.preventDefault();
        editor.blur();
        return;
      }
    });
    
    // Androidキーボードからの入力を処理
    editor.addEventListener('input', (e) => {
      setTimeout(() => {
        detectAndApplyTypePrefix(editor);
      }, 0);
    });
  }
  
  // executeCodeを呼ぶ前にフラグを設定
  window.addEventListener('execute-code-start', () => {
    justExecuted = true;
  });
};

function initRichTextEditor() {
  const editor = document.getElementById('txt-input');
  if (!editor) return;

  setupEditorEvents();
  const colorButtons = document.querySelectorAll('.color-btn');
  editor.style.caretColor = colorCodes[currentActiveColor] || currentActiveColor;

  const cyanBtn = document.querySelector('#color-cyan');
  if (cyanBtn) cyanBtn.classList.add('active');

  const applyColor = (color) => {
    currentActiveColor = color;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    if (editor) {
      editor.style.caretColor = colorCodes[color] || color;
      // フォーカスがある場合は即座に色を適用
      if (document.activeElement === editor) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
      }
    }
  };
  
  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyColor(btn.dataset.color);
      if (isMobileDevice()) {
        focusWithoutKeyboard(editor);
      } else {
        focusOnInput();
      }
    });
  });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      executeCode();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      insertNewline();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); applyColor('red'); return; }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyColor('blue'); return; }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); applyColor('green'); return; }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); applyColor('cyan'); return; }
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      insertColoredText(e.key, currentActiveColor);
      // キー入力後に型プレフィックスをチェック
      setTimeout(() => {
        detectAndApplyTypePrefix(editor);
      }, 0);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertColoredText('    ', currentActiveColor);
      return;
    }
  });

  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // ペースト時に型プレフィックスを処理
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (index > 0) insertNewline();
      
      const tokens = line.split(/\s+/);
      tokens.forEach((token, tokenIndex) => {
        if (tokenIndex > 0) insertColoredText(' ', currentActiveColor);
        
        const prefixMatch = token.match(/^(number|boolean|string|symbol):(.+)$/);
        if (prefixMatch) {
          const [, type, value] = prefixMatch;
          const color = typePrefix[type] || currentActiveColor;
          insertColoredText(value, color);
        } else {
          insertColoredText(token, currentActiveColor);
        }
      });
    });
  });

  if (isMobileDevice()) {
    focusWithoutKeyboard(editor);
  } else {
    focusOnInput();
  }
}