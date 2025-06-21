const typePrefix = {
'number': 'green',
'boolean': 'cyan',
'string': 'blue',
'symbol': 'red',
'vector': 'purple',
'nil': 'orange',
'comment': 'yellow'
};
let currentActiveColor = 'red'; // デフォルトをsymbol型（赤）に変更
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
  } else {
    elements.output.classList.add('error');
    setTimeout(() => elements.output.classList.remove('error'), 300);
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
// 小文字の型プレフィックスのみを許可
const prefixMatch = currentWord.match(/^(number|boolean|string|symbol|vector|nil|comment):(.+)$/);
if (prefixMatch) {
  const [fullMatch, type, value] = prefixMatch;
  const color = typePrefix[type];
  if (color) {
    // シンボル型の場合、英数字が大文字であることを確認
    if (type === 'symbol' && /[a-z]/.test(value)) {
      // 小文字が含まれている場合は処理しない
      return;
    }
    
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

// 新しい自動着色関数
const detectAndApplyAutoColoring = (editor) => {
 const selection = window.getSelection();
 if (!selection.rangeCount) return;
 
 const range = selection.getRangeAt(0);
 const container = range.startContainer;
 
 if (container.nodeType !== Node.TEXT_NODE) return;
 
 const text = container.textContent;
 const cursorPos = range.startOffset;
 
 // NILの自動着色（入力完了時のみ）
 if (cursorPos >= 3) {
   const lastThreeChars = text.substring(cursorPos - 3, cursorPos);
   if (lastThreeChars === 'NIL') {
     // 前後が区切り文字であることを確認（単語境界）
     const charBefore = cursorPos > 3 ? text[cursorPos - 4] : ' ';
     const charAfter = cursorPos < text.length ? text[cursorPos] : ' ';
     
     if (/[\s\[\]]/.test(charBefore) && /[\s\[\]]/.test(charAfter)) {
       // NILの3文字を選択
       const newRange = document.createRange();
       newRange.setStart(container, cursorPos - 3);
       newRange.setEnd(container, cursorPos);
       selection.removeAllRanges();
       selection.addRange(newRange);
       
       // オレンジ色に変更
       document.execCommand('styleWithCSS', false, true);
       document.execCommand('foreColor', false, colorCodes['orange']);
       
       // カーソルを元の位置に戻す
       selection.collapseToEnd();
     }
   }
 }
 
 // [ または ] の自動着色（入力直後のみ）
 if (cursorPos >= 1) {
   const lastChar = text[cursorPos - 1];
   if (lastChar === '[' || lastChar === ']') {
     // 直前の1文字を選択
     const newRange = document.createRange();
     newRange.setStart(container, cursorPos - 1);
     newRange.setEnd(container, cursorPos);
     selection.removeAllRanges();
     selection.addRange(newRange);
     
     // パープル色に変更
     document.execCommand('styleWithCSS', false, true);
     document.execCommand('foreColor', false, colorCodes['purple']);
     
     // カーソルを元の位置に戻す
     selection.collapseToEnd();
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
document.execCommand('foreColor', false, colorCodes[color] || colorCodes['red']);
document.execCommand('insertText', false, text);
};
const insertNewline = () => {
const editor = elements.input;
if (!editor) return;
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

// 選択範囲の色を変更する新しい関数
const changeSelectionColor = (color) => {
const editor = elements.input;
if (!editor) return;

const selection = window.getSelection();
if (!selection.rangeCount || selection.isCollapsed) return;

// 選択範囲を保存
const range = selection.getRangeAt(0);
const selectedText = range.toString();

if (selectedText.length === 0) return;

// 選択範囲を削除して、新しい色で再挿入
document.execCommand('delete', false);
document.execCommand('styleWithCSS', false, true);
document.execCommand('foreColor', false, colorCodes[color] || colorCodes['red']);
document.execCommand('insertText', false, selectedText);

// アクティブな色を更新
currentActiveColor = color;
document.querySelectorAll('.color-btn').forEach(btn => {
 btn.classList.toggle('active', btn.dataset.color === color);
});
editor.style.caretColor = colorCodes[color];
};

const setupEditorEvents = () => {
const editor = elements.input;
if (!editor) return;
let justExecuted = false;
if (isMobileDevice()) {
 editor.addEventListener('click', (e) => {
   const wasJustExecuted = justExecuted;
   justExecuted = false;
   if (e.isTrusted && !wasJustExecuted) {
     editor.isKeyboardMode = true;
     if (isMobileDevice()) {
       showTextSection();
     }
     focusWithKeyboard(editor);
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
     detectAndApplyAutoColoring(editor); // 追加
   }, 0);
 });
}
window.addEventListener('execute-code-start', () => {
 justExecuted = true;
});
};
function initRichTextEditor() {
const editor = document.getElementById('input');
if (!editor) return;
setupEditorEvents();
const colorButtons = document.querySelectorAll('.color-btn');
editor.style.caretColor = colorCodes[currentActiveColor] || currentActiveColor;

// デフォルトでred（symbol）ボタンをアクティブに
const redBtn = document.querySelector('#color-red');
if (redBtn) redBtn.classList.add('active');

const applyColor = (color) => {
 const selection = window.getSelection();
 
 // 選択範囲がある場合は、選択範囲の色を変更
 if (selection && !selection.isCollapsed) {
   changeSelectionColor(color);
 } else {
   // 選択範囲がない場合は、これから入力する文字の色を変更
   currentActiveColor = color;
   colorButtons.forEach(btn => {
     btn.classList.toggle('active', btn.dataset.color === color);
   });
   if (editor) {
     editor.style.caretColor = colorCodes[color] || color;
     if (document.activeElement === editor) {
       document.execCommand('styleWithCSS', false, true);
       document.execCommand('foreColor', false, colorCodes[color] || colorCodes['red']);
     }
   }
 }
};

colorButtons.forEach(btn => {
 btn.addEventListener('click', () => {
   applyColor(btn.dataset.color);
   btn.blur();
   if (isMobileDevice()) {
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
   // 新しいショートカットキーの割り当て
   if (e.key === 'r' || e.key === 'R') { e.preventDefault(); applyColor('red'); return; }
   else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyColor('blue'); return; }
   else if (e.key === 'g' || e.key === 'G') { e.preventDefault(); applyColor('green'); return; }
   else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); applyColor('cyan'); return; }
   else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); applyColor('yellow'); return; }
   return;
 }
 if (e.key.length === 1) {
   e.preventDefault();
   insertColoredText(e.key, currentActiveColor);
   setTimeout(() => {
     detectAndApplyTypePrefix(editor);
     detectAndApplyAutoColoring(editor); // 追加
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
     const prefixMatch = token.match(/^(number|boolean|string|symbol|vector|nil|comment):(.+)$/);
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