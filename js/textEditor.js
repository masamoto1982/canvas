// textEditor.js

// Potentially export functions like initRichTextEditor, insertColoredText etc. if needed by other modules,
// or make them internal to this module and expose only initRichTextEditor.

const insertColoredText = (text, color) => { //
  const editor = elements.input; // Needs elements
  if (!editor) return;
  editor.focus();
  if (text === '\n') {
    insertNewline();
    return;
  }
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']); // Needs colorCodes
  document.execCommand('insertText', false, text);
};

const insertNewline = () => { //
  const editor = elements.input; // Needs elements
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

const insertAtCursor = (text) => { //
  const editor = elements.input; // Needs elements
  if (!editor) return;
  const currentActiveColor = document.querySelector('.color-btn.active')?.dataset.color || 'cyan';
  insertColoredText(text, currentActiveColor);
  if (isMobileDevice()) { // Needs isMobileDevice
    showTextSection(); // Needs showTextSection
    focusWithoutKeyboard(editor); // Needs focusWithoutKeyboard
  } else {
    focusOnInput(); // Needs focusOnInput
  }
};

const clearInput = () => { //
  if (elements.input) { // Needs elements
    elements.input.innerHTML = '';
    focusOnInput(); // Needs focusOnInput
  }
};

const handleDeleteAction = (deleteToken = false) => { //
  const editor = elements.input; // Needs elements
  if (!editor) return;
  if (deleteToken) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const cursorPosition = getCursorPosition(editor); // Needs getCursorPosition
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
    // Simplified deletion logic for token
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
  if (isMobileDevice()) { // Needs isMobileDevice
    focusWithoutKeyboard(editor); // Needs focusWithoutKeyboard
    showTextSection(); // Needs showTextSection
  } else {
    focusOnInput(); // Needs focusOnInput
  }
};

const executeCode = () => { //
  const editor = elements.input; // Needs elements
  if (!editor) return;
  const result = interpreter.execute(editor); // Needs interpreter
  if (elements.output) { // Needs elements
    elements.output.value = result;
    if (!result.startsWith('Error:')) {
      elements.output.classList.add('executed');
      setTimeout(() => elements.output.classList.remove('executed'), 300);
      editor.innerHTML = ''; // Clear editor on successful execution
    }
  }
  showOutputSection(); // Needs showOutputSection
  if (isMobileDevice()) { // Needs isMobileDevice
    focusWithoutKeyboard(editor); // Needs focusWithoutKeyboard
  } else {
    focusOnInput(); // Needs focusOnInput
  }
};

const setupEditorEvents = () => { //
  const editor = elements.input; // Needs elements
  if (!editor) return;
  editor.addEventListener('touchstart', (e) => { /* No preventDefault */ });
  editor.addEventListener('focus', () => { /* No specific action, allow native focus */});
};


function initRichTextEditor() { //
  const editor = document.getElementById('txt-input');
  if (!editor) return;

  setupEditorEvents();
  let currentColor = 'cyan';
  const colorButtons = document.querySelectorAll('.color-btn');
  editor.style.caretColor = colorCodes[currentColor] || currentColor; // Needs colorCodes

  const cyanBtn = document.querySelector('#color-cyan');
  if (cyanBtn) cyanBtn.classList.add('active');

  const applyColor = (color) => {
    currentColor = color;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    if (editor) {
      editor.style.caretColor = colorCodes[color] || color; // Needs colorCodes
      if (document.activeElement === editor) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']); // Needs colorCodes
      }
    }
  };
  
  editor.addEventListener('input', (e) => { //
    const activeColor = getCurrentColor(); // Needs getCurrentColor
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPosition = getCursorPosition(editor); // Needs getCursorPosition
      // This part can be problematic with complex content.
      // A more robust solution might involve more granular DOM manipulation.
      // For now, applying to selection or at cursor.
      if (!range.collapsed) {
           document.execCommand('styleWithCSS', false, true);
           document.execCommand('foreColor', false, colorCodes[activeColor] || colorCodes['cyan']); // Needs colorCodes
      }
      // setCursorPosition(editor, cursorPosition); // Might be needed if color application moves cursor
    }
  });


  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyColor(btn.dataset.color);
      if (isMobileDevice()) { // Needs isMobileDevice
        focusWithoutKeyboard(editor); // Needs focusWithoutKeyboard
      } else {
        focusOnInput(); // Needs focusOnInput
      }
    });
  });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      executeCode(); // executeCode is defined above
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      insertNewline(); // insertNewline is defined above
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); applyColor('red'); return; }
      else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyColor('blue'); return; }
      else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); applyColor('green'); return; }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); applyColor('cyan'); return; } //
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      insertColoredText(e.key, currentColor); // insertColoredText is defined above
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertColoredText('    ', currentColor); // insertColoredText is defined above
      return;
    }
  });

  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    insertColoredText(text, currentColor); // insertColoredText is defined above
  });

  if (isMobileDevice()) { // Needs isMobileDevice
    focusWithoutKeyboard(editor); // Needs focusWithoutKeyboard
  } else {
    focusOnInput(); // Needs focusOnInput
  }
}