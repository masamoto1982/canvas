// textEditor.js

// Depends on:
// - elements (from state.js)
// - colorCodes, Types (from constants.js)
// - rgbToColorName, getCurrentColor, isMobileDevice, focusWithoutKeyboard, focusOnInput,
//   getCursorPosition, setCursorPosition, showTextSection, showOutputSection (from utils.js)
// - interpreter (from interpreter.js)
// - Fraction (from fraction.js - indirectly via interpreter)
// - tokenize (from tokenizer.js - indirectly via interpreter)
// - parse (from parser.js - indirectly via interpreter)


const insertColoredText = (text, color) => {
  const editor = elements.input;
  if (!editor) return;

  // XXX: 意図しないキーボード表示の可能性があったため、ここでの明示的な editor.focus() 呼び出しを削除。
  // 呼び出し元 (keydown ハンドラや paste ハンドラ) が既にエディタにフォーカスを持っているか、
  // insertAtCursor の場合は後続の focusWithoutKeyboard でフォーカス管理されることを期待。
  // エディタがアクティブでない場合に execCommand が失敗する可能性があるため、
  // 呼び出し側でフォーカスを保証するか、この関数が呼ばれる文脈を限定する必要がある。
  // 通常、keydown や paste ではエディタはアクティブになっている。

  if (text === '\n') {
    insertNewline(); // insertNewline は内部でフォーカスを扱う可能性がある
    return;
  }

  // execCommand を実行するためには、対象の要素がフォーカスされているか、
  // またはドキュメント内で選択範囲が確立されている必要がある。
  // ここでは、呼び出し元がフォーカスを管理していると仮定する。
  // もし問題があれば、呼び出し元で editor.focus() を明示的に行う必要がある。
  if (document.activeElement !== editor) {
      // keydown や paste イベント以外から呼ばれる場合 (例: プログラムからの直接呼び出し) は、
      // フォーカスがないと execCommand が期待通りに動作しないことがある。
      // しかし、無条件に focus() するとキーボード問題が再発する可能性がある。
      // この関数の使用箇所とその時点でのフォーカス状態を慎重に管理する必要がある。
      // 現状では、d2d からの insertAtCursor -> insertColoredText の流れでは、
      // insertAtCursor の最後に focusWithoutKeyboard があるため、ここでの focus() は不要かつ問題を起こす。
      // keydown からの場合は既に focus されている。
  }


  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
  document.execCommand('insertText', false, text);
};

const insertNewline = () => {
  const editor = elements.input;
  if (!editor) return;

  // 改行挿入のためにはエディタがフォーカスされている必要がある
  if (document.activeElement !== editor) {
      editor.focus();
  }

  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);

    const newRange = document.createRange();
    newRange.setStartAfter(br);
    newRange.setEndAfter(br); // Ensure cursor is after <br>
    selection.removeAllRanges();
    selection.addRange(newRange);

    br.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

  } else {
    document.execCommand('insertHTML', false, '<br><br>');
  }
};

const insertAtCursor = (text) => {
  const editor = elements.input;
  if (!editor) return;

  const currentActiveColor = document.querySelector('.color-btn.active')?.dataset.color || 'cyan';
  // insertColoredText を呼び出す前にエディタがフォーカスされている必要はない (とされる修正)
  // insertColoredText は execCommand を実行するが、その時点での選択範囲に依存する
  insertColoredText(text, currentActiveColor);

  if (isMobileDevice()) {
    showTextSection();
    focusWithoutKeyboard(editor); // d2d入力後はキーボードなしでフォーカス
  } else {
    // focusOnInput(); // デスクトップでは必要に応じてフォーカス (insertColoredText がフォーカスを変えていなければ)
  }
};

const clearInput = () => {
  if (elements.input) {
    elements.input.innerHTML = '';
    if (isMobileDevice()){
        focusWithoutKeyboard(elements.input);
    } else {
        focusOnInput();
    }
  }
};

const handleDeleteAction = (deleteToken = false) => {
  const editor = elements.input;
  if (!editor) return;

  if (document.activeElement !== editor) {
      editor.focus();
  }

  if (deleteToken) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const cursorPosition = getCursorPosition(editor);
    if (cursorPosition === 0) return;

    // トークン削除ロジック (前回提示のもの)
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
        const currentSelection = window.getSelection();
        currentSelection.removeAllRanges();
        let currentPos = 0;
        let startNodeFound = false;
        let endNodeFound = false;
        const tempRange = document.createRange();
        const setRangeRecursive = (node) => {
            if (startNodeFound && endNodeFound) return;
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.length;
                if (!startNodeFound && currentPos <= spaceStart && spaceStart < currentPos + nodeLength) {
                    tempRange.setStart(node, spaceStart - currentPos);
                    startNodeFound = true;
                }
                if (!endNodeFound && currentPos < cursorPosition && cursorPosition <= currentPos + nodeLength) {
                    tempRange.setEnd(node, cursorPosition - currentPos);
                    endNodeFound = true;
                } else if (!endNodeFound && cursorPosition > currentPos + nodeLength && currentPos + nodeLength === editor.textContent.length) {
                    tempRange.setEnd(node, nodeLength);
                    endNodeFound = true;
                }
                currentPos += nodeLength;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    setRangeRecursive(node.childNodes[i]);
                    if (startNodeFound && endNodeFound) break;
                }
            }
        };
        setRangeRecursive(editor);
        if (startNodeFound && endNodeFound) {
            currentSelection.addRange(tempRange);
            document.execCommand('delete', false, null);
        } else {
            document.execCommand('delete', false, null); // Fallback
        }
    }
  } else {
    document.execCommand('delete', false, null);
  }

  if (isMobileDevice()) {
    showTextSection();
    focusWithoutKeyboard(editor);
  } else {
    focusOnInput();
  }
};

const executeCode = () => {
  const editor = elements.input;
  if (!editor) return;

  const result = interpreter.execute(editor);

  if (elements.output) {
    elements.output.value = result;
    if (!result.startsWith('Error:')) {
      elements.output.classList.add('executed');
      setTimeout(() => elements.output.classList.remove('executed'), 300);
      // editor.innerHTML = ''; // 必要に応じて有効化
    }
  }

  showOutputSection();

  if (isMobileDevice()) {
    focusWithoutKeyboard(editor);
  } else {
    focusOnInput();
  }
};

const setupEditorEvents = () => {
  const editor = elements.input;
  if (!editor) return;

  editor.addEventListener('touchstart', (e) => {
    // txt-input を直接タップした場合は、デフォルトのフォーカス処理（キーボード表示）を許可
    // preventDefault は呼び出さない
  });
};


function initRichTextEditor() {
  const editor = document.getElementById('txt-input'); // This is elements.input
  if (!editor) return;

  setupEditorEvents();
  let currentColor = 'cyan'; // このモジュール内での現在の色状態
  const colorButtons = document.querySelectorAll('.color-btn');

  editor.style.caretColor = colorCodes[currentColor] || currentColor;

  const cyanBtn = document.querySelector('#color-cyan');
  if (cyanBtn) {
    cyanBtn.classList.add('active');
  }

  const applyColor = (color) => {
    currentColor = color;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });

    if (editor) {
      editor.style.caretColor = colorCodes[color] || color;
      if (document.activeElement === editor && editor.contentEditable === 'true' && !editor.hasAttribute('readonly')) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
      }
    }
  };

  editor.addEventListener('focus', () => {
    // ユーザーが txt-input をタップするなどしてフォーカスした場合、入力のための文字色を設定
    if (editor.contentEditable === 'true' && !editor.hasAttribute('readonly')) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
    }
  });

  editor.addEventListener('input', (e) => {
    const activeColor = getCurrentColor(); // グローバルな現在の色を取得 (utils.js)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) { // 既存の選択範囲がある場合のみ色を適用
           document.execCommand('styleWithCSS', false, true);
           document.execCommand('foreColor', false, colorCodes[activeColor] || colorCodes['cyan']);
      }
    }
  });

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertNewline();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); applyColor('red'); return; }
      else if (e.key.toLowerCase() === 'b') { e.preventDefault(); applyColor('blue'); return; }
      else if (e.key.toLowerCase() === 'g') { e.preventDefault(); applyColor('green'); return; }
      else if (e.key.toLowerCase() === 'c') { e.preventDefault(); applyColor('cyan'); return; }
      return; // 他の Ctrl/Meta ショートカットはデフォルト動作を許可
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      // キー入力時には、まずエディタにフォーカスがあることを確認
      // (通常 keydown イベント自体がフォーカスされた要素で発生する)
      // そして、現在の色で文字を挿入
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
      document.execCommand('insertText', false, e.key);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
      document.execCommand('insertText', false, '    '); // タブの代わりにスペース4つ
      return;
    }
  });

  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // ペースト時も現在の色を適用
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
    document.execCommand('insertText', false, text);
  });

  if (isMobileDevice()) {
    focusWithoutKeyboard(editor);
  } else {
    focusOnInput();
  }
}