const typePrefix = {
  'number': 'green',
  'boolean': 'yellow',
  'string': 'blue',
  'symbol': 'red'
};
let currentActiveColor = 'yellow';
const executeCode = () => {
  window.dispatchEvent(new Event('execute-code-start'));
  const editor = elements.input;
  if (!editor) return;
  if (isMobileDevice()) {
    editor.blur();
    editor.isKeyboardMode = false;
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
  if (isMobileDevice()) {
    setTimeout(() => {
      if (elements.textSection && elements.outputSection) {
        elements.textSection.classList.add('hide');
        elements.outputSection.classList.remove('hide');
      }
    }, 150);
  }
};
const detectAndApplyTypePrefix = (editor) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  let textNode = container;
  if (container.nodeType !== Node.TEXT_NODE) {
    if (container.childNodes.length > 0) {
      textNode = container.childNodes[container.childNodes.length - 1];
    }
  }
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
  const text = textNode.textContent;
  const cursorPos = textNode === range.startContainer ? range.startOffset : text.length;
  let wordStart = cursorPos;
  while (wordStart > 0 && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\n') {
    wordStart--;
  }
  const currentWord = text.substring(wordStart, cursorPos);
  const prefixMatch = currentWord.match(/^(number|boolean|string|symbol):(.+)$/);
  if (prefixMatch) {
    const [fullMatch, type, value] = prefixMatch;
    const color = typePrefix[type];
    if (color) {
      const savedSelection = selection.getRangeAt(0).cloneRange();
      const newRange = document.createRange();
      newRange.setStart(textNode, wordStart);
      newRange.setEnd(textNode, cursorPos);
      selection.removeAllRanges();
      selection.addRange(newRange);
      document.execCommand('delete', false);
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[color]);
      document.execCommand('insertText', false, value);
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
  document.execCommand('foreColor', false, colorCodes[color] || colorCodes['yellow']);
  document.execCommand('insertText', false, text);
};
const insertNewline = () => {
  const editor = elements.input;
  if (!editor) return;
  //editor.focus();
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
  if (isMobileDevice()) {
    showTextSection();
    if (!editor.isKeyboardMode) {
      focusWithoutKeyboard(editor);
    } else {
      focusOnInput();
    }
  } else {
    focusOnInput();
  }
  if (text === '\n') {
    insertNewline();
  } else {
    insertColoredText(text, currentActiveColor);
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
  let justExecuted = false;
  if (isMobileDevice()) {
    // txt-input.js 内の setupEditorEvents 関数
editor.addEventListener('click', (e) => {
  // justExecuted は、コード実行直後の意図しないフォーカスやキーボード表示を抑制するためのもの
  // クリックイベントが発生した時点で、このフラグによる抑制は一旦解除してよいでしょう。
  const wasJustExecuted = justExecuted; // 直前の justExecuted の状態を保持
  justExecuted = false; // フラグをリセット

  if (e.isTrusted && !wasJustExecuted) { // 信頼できるクリックで、かつ実行直後でなければ
    editor.isKeyboardMode = true; // キーボード入力モードに設定

    if (isMobileDevice()) {
      // モバイルの場合、outputが表示されていたらtext-sectionに切り替える
      showTextSection();
    }
    focusWithKeyboard(editor); // 修正したfocusWithKeyboardを呼び出し
  }
});
    editor.addEventListener('focus', (e) => {
      if (justExecuted) {
        e.preventDefault();
        editor.blur();
        justExecuted = false;
        return;
      }
      if (elements.outputSection && !elements.outputSection.classList.contains('hide')) {
        e.preventDefault();
        editor.blur();
        return;
      }
    });
    editor.addEventListener('input', (e) => {
      setTimeout(() => {
        detectAndApplyTypePrefix(editor);
      }, 0);
    });
  }
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
  const yellowBtn = document.querySelector('#color-yellow');
  if (yellowBtn) yellowBtn.classList.add('active');
  const applyColor = (color) => {
    currentActiveColor = color;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    if (editor) {
      editor.style.caretColor = colorCodes[color] || color;
      if (document.activeElement === editor) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[color] || colorCodes['yellow']);
      }
    }
  };
  // txt-input.js 内の initRichTextEditor 関数
colorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    applyColor(btn.dataset.color);
    btn.blur(); // ボタン自体のフォーカスを解除

    if (isMobileDevice()) {
      // モバイルデバイスの場合、カラーボタンクリック時にはエディタにフォーカスしない
      // focusWithoutKeyboard(editor); // この行をコメントアウトまたは削除
    } else {
      focusOnInput(); // デスクトップでは従来通りエディタにフォーカス
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
      else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); applyColor('yellow'); return; }
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      insertColoredText(e.key, currentActiveColor);
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