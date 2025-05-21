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
  if (!editor) {
    console.error('insertColoredText: editor element not found.');
    return;
  }

  console.log(`%c insertColoredText CALLED with text: "${text}", color: ${color}`, 'color: purple', 'AT:', new Date().toLocaleTimeString());
  console.trace();


  if (text === '\n') {
    console.log('  insertColoredText: text is newline, calling insertNewline()');
    insertNewline();
    return;
  }

  if (document.activeElement !== editor) {
    // This condition is tricky. If we must focus, it might trigger keyboard.
    // For d2d, focusWithoutKeyboard is called later. For keydown, it should already be focused.
    // If this log appears unexpectedly, it's a sign of focus issues.
    console.warn('  insertColoredText: Editor was not active. This might be an issue for execCommand. Current active:', document.activeElement);
    // editor.focus(); // Deliberately NOT focusing here to avoid keyboard flash from d2d. Let caller manage focus.
  }

  try {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
    document.execCommand('insertText', false, text);
    console.log('  insertColoredText: execCommands executed.');
  } catch (e) {
    console.error('  insertColoredText: Error during execCommand:', e);
  }
};

const insertNewline = () => {
  const editor = elements.input;
  if (!editor) return;
  console.log('%c insertNewline CALLED', 'color: #007bff', 'AT:', new Date().toLocaleTimeString());
  console.trace();

  if (document.activeElement !== editor) {
      console.log('  insertNewline: Editor not focused, focusing now.');
      editor.focus(); // Necessary for newline insertion context
  }

  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);

    const newRange = document.createRange();
    newRange.setStartAfter(br);
    newRange.setEndAfter(br);
    selection.removeAllRanges();
    selection.addRange(newRange);

    br.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    console.log('  insertNewline: Newline BR inserted.');
  } else {
    console.warn('  insertNewline: No selection range found, fallback to insertHTML.');
    document.execCommand('insertHTML', false, '<br><br>');
  }
};

const insertAtCursor = (text) => {
  const editor = elements.input;
  if (!editor) return;
  console.log(`%c insertAtCursor CALLED with text: "${text}"`, 'color: #28a745', 'AT:', new Date().toLocaleTimeString());
  console.trace();

  const currentActiveColor = document.querySelector('.color-btn.active')?.dataset.color || 'cyan';
  insertColoredText(text, currentActiveColor);

  if (isMobileDevice()) {
    console.log('  insertAtCursor: Mobile device, calling showTextSection and focusWithoutKeyboard.');
    showTextSection();
    focusWithoutKeyboard(editor);
  } else {
    console.log('  insertAtCursor: Desktop device.');
    // focusOnInput(); // Usually not needed as editor might already be focused or interaction implies focus.
  }
};

const clearInput = () => {
  console.log('%c clearInput CALLED', 'color: #dc3545', 'AT:', new Date().toLocaleTimeString());
  console.trace();
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
  console.log(`%c handleDeleteAction CALLED, deleteToken: ${deleteToken}`, 'color: #fd7e14', 'AT:', new Date().toLocaleTimeString());
  console.trace();

  if (document.activeElement !== editor) {
      console.log('  handleDeleteAction: Editor not focused, focusing now.');
      editor.focus();
  }

  if (deleteToken) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        console.warn('  handleDeleteAction (token): No selection range.');
        return;
    }

    const cursorPosition = getCursorPosition(editor);
    if (cursorPosition === 0) {
        console.log('  handleDeleteAction (token): Cursor at start, nothing to delete.');
        return;
    }
    console.log(`  handleDeleteAction (token): Cursor position: ${cursorPosition}`);

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
    console.log(`  handleDeleteAction (token): Calculated deletion range from ${spaceStart} to ${cursorPosition}`);

    const range = selection.getRangeAt(0); // This range is usually the current cursor/selection
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
            console.log('  handleDeleteAction (token): Token deleted using calculated range.');
        } else {
            console.warn('  handleDeleteAction (token): Failed to set precise range, using default delete.');
            document.execCommand('delete', false, null);
        }
    } else {
        console.warn('  handleDeleteAction (token): Editor has no children, using default delete.');
        document.execCommand('delete', false, null);
    }
  } else {
    document.execCommand('delete', false, null);
    console.log('  handleDeleteAction (single char): Standard delete executed.');
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
  console.log('%c executeCode CALLED', 'color: #6f42c1', 'AT:', new Date().toLocaleTimeString());
  console.trace();

  const result = interpreter.execute(editor);
  console.log('  executeCode: Interpreter result -', result);

  if (elements.output) {
    elements.output.value = result;
    if (!result.startsWith('Error:')) {
      elements.output.classList.add('executed');
      setTimeout(() => elements.output.classList.remove('executed'), 300);
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
  console.log('setupEditorEvents CALLED');

  editor.addEventListener('touchstart', (e) => {
    console.log('%c editor TOUCHSTART event', 'color: #17a2b8', 'AT:', new Date().toLocaleTimeString(), e);
    // No preventDefault here for native focus
  });
};


function initRichTextEditor() {
  const editor = document.getElementById('txt-input');
  if (!editor) {
      console.error("initRichTextEditor: Editor element 'txt-input' not found!");
      return;
  }
  console.log('initRichTextEditor CALLED');

  setupEditorEvents();
  let currentColor = 'cyan';
  const colorButtons = document.querySelectorAll('.color-btn');

  editor.style.caretColor = colorCodes[currentColor] || currentColor;

  const cyanBtn = document.querySelector('#color-cyan');
  if (cyanBtn) {
    cyanBtn.classList.add('active');
  }

  const applyColor = (color) => {
    console.log(`%c applyColor CALLED with color: ${color}`, 'color: #ffc107', 'AT:', new Date().toLocaleTimeString());
    console.trace();
    currentColor = color;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });

    if (editor) {
      editor.style.caretColor = colorCodes[color] || color;
      if (document.activeElement === editor && editor.contentEditable === 'true' && !editor.hasAttribute('readonly')) {
        console.log('  applyColor: Editor is active, applying foreColor immediately.');
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[color] || colorCodes['cyan']);
      }
    }
  };

  editor.addEventListener('focus', () => {
    console.log('%c editor FOCUS event', 'color: #20c997', 'AT:', new Date().toLocaleTimeString(), 'Current activeElement before this event logic:', document.activeElement);
    console.trace();
    if (editor.contentEditable === 'true' && !editor.hasAttribute('readonly')) {
        console.log('  editor.focus: Setting foreColor to', currentColor);
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
    } else {
        console.log('  editor.focus: Condition not met for setting foreColor (contentEditable:', editor.contentEditable, 'readonly:', editor.hasAttribute('readonly') + ')');
    }
  });

  // Temporary blur listener for debugging
  editor.addEventListener('blur', () => {
    console.log('%c editor BLUR event', 'color: #e83e8c', 'AT:', new Date().toLocaleTimeString(), 'New activeElement:', document.activeElement);
    console.trace(); // Why did it blur?
  });


  editor.addEventListener('input', (e) => {
    // console.log('editor INPUT event', e, 'AT:', new Date().toLocaleTimeString()); // Can be very noisy
    const activeColor = getCurrentColor();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
           console.log('  editor.input: Applying color to selection.');
           document.execCommand('styleWithCSS', false, true);
           document.execCommand('foreColor', false, colorCodes[activeColor] || colorCodes['cyan']);
      }
    }
  });

  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log(`Color button clicked: ${btn.dataset.color}`);
      applyColor(btn.dataset.color);
      if (isMobileDevice()) {
        focusWithoutKeyboard(editor);
      } else {
        focusOnInput();
      }
    });
  });

  editor.addEventListener('keydown', (e) => {
    // console.log('editor KEYDOWN event', e.key, 'AT:', new Date().toLocaleTimeString()); // Can be noisy
    if (e.key === 'Enter' && e.shiftKey) {
      console.log('  keydown: Shift+Enter -> executeCode');
      e.preventDefault();
      executeCode();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('  keydown: Enter -> insertNewline');
      e.preventDefault();
      insertNewline();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      let colorToApply = null;
      if (e.key.toLowerCase() === 'r') colorToApply = 'red';
      else if (e.key.toLowerCase() === 'b') colorToApply = 'blue';
      else if (e.key.toLowerCase() === 'g') colorToApply = 'green';
      else if (e.key.toLowerCase() === 'c') colorToApply = 'cyan';
      
      if (colorToApply) {
        console.log(`  keydown: Ctrl/Meta + ${e.key} -> applyColor(${colorToApply})`);
        e.preventDefault();
        applyColor(colorToApply);
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      console.log(`  keydown: Printable key "${e.key}" -> insert with color ${currentColor}`);
      e.preventDefault();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
      document.execCommand('insertText', false, e.key);
      return;
    }
    if (e.key === 'Tab') {
      console.log('  keydown: Tab -> insert spaces');
      e.preventDefault();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
      document.execCommand('insertText', false, '    ');
      return;
    }
  });

  editor.addEventListener('paste', (e) => {
    console.log('%c editor PASTE event', 'color: #6610f2', 'AT:', new Date().toLocaleTimeString());
    console.trace();
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    console.log('  paste: Pasting text -', text);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, colorCodes[currentColor] || colorCodes['cyan']);
    document.execCommand('insertText', false, text);
  });

  console.log('initRichTextEditor: Initial focus setting...');
  if (isMobileDevice()) {
    focusWithoutKeyboard(editor);
  } else {
    focusOnInput();
  }
  console.log('initRichTextEditor: COMPLETED');
}