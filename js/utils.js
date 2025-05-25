// utils.js

// Potentially export each function
// export const rgbToColorName = (rgb) => { ... };
// export const getCurrentColor = () => { ... };
// export const getPrimeFactors = (num) => { ... };
// etc.

const rgbToColorName = (rgb) => {
  const exactColors = {
    '#FF4B00': 'red',
    '#03AF7A': 'green',
    '#005AFF': 'blue',
    '#4DC4FF': 'cyan',
  };
  if (exactColors[rgb]) {
    return exactColors[rgb];
  }
  let r, g, b;
  if (rgb.startsWith('rgb')) {
    const matches = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (matches) {
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    }
  } else if (rgb.startsWith('#')) {
    const hex = rgb.substring(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }
  if (r > 200 && g < 150 && b < 100) return 'red';
  else if (r < 100 && g > 100 && b < 150) return 'green';
  else if (r < 100 && g < 150 && b > 150) return 'blue';
  else if (r < 150 && g > 150 && b > 200) return 'cyan';
  return 'cyan';
};


const getCurrentColor = () => {
  const activeColorBtn = document.querySelector('.color-btn.active');
  return activeColorBtn ? activeColorBtn.dataset.color : 'cyan';
};

// 型から色を取得する新しい関数
const getColorFromType = (type) => {
  const typeToColor = {
    [Types.NUMBER]: 'green',
    [Types.BOOLEAN]: 'red',
    [Types.STRING]: 'blue',
    [Types.SYMBOL]: 'cyan'
  };
  return typeToColor[type] || 'cyan';
};

// 色から型を取得する新しい関数
const getTypeFromColor = (color) => {
  return ColorTypes[color] || Types.SYMBOL;
};


const getPrimeFactors = (num) => {
  const factors = [];
  let divisor = 2;
  while (num > 1) {
    while (num % divisor === 0) {
      factors.push(divisor);
      num /= divisor;
    }
    divisor++;
    if (divisor * divisor > num) {
      if (num > 1) factors.push(num);
      break;
    }
  }
  return factors;
};

const findSubsetProductMatches = (factors, dotValues) => {
  const candidates = [];
  const maxSubsets = Math.min(10, Math.pow(2, factors.length));
  for (let i = 1; i < maxSubsets; i++) {
    const subset = [];
    for (let j = 0; j < factors.length; j++) {
      if (i & (1 << j)) {
        subset.push(factors[j]);
      }
    }
    const product = subset.reduce((a, b) => a * b, 1);
    if (letterPatterns[product]) {
      candidates.push({
        letter: letterPatterns[product],
        product: product,
        distance: Math.abs(product - factors.reduce((a, b) => a * b, 1))
      });
    }
  }
  return candidates.sort((a, b) => a.distance - b.distance);
};

const isMobileDevice = () => {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android/i.test(navigator.userAgent);
};


const focusWithoutKeyboard = (element) => {
  if (!element) return;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const originalReadOnly = element.getAttribute('readonly');
  const originalContentEditable = element.getAttribute('contenteditable');
  if (element.tagName.toLowerCase() === 'div' && originalContentEditable === 'true') {
    element.setAttribute('contenteditable', 'false');
  } else {
    element.setAttribute('readonly', 'readonly');
  }
  element.focus();
  if (element.tagName.toLowerCase() === 'div' && originalContentEditable === 'true') {
    element.setAttribute('contenteditable', 'true');
  } else {
    if (originalReadOnly) {
      element.setAttribute('readonly', originalReadOnly);
    } else {
      element.removeAttribute('readonly');
    }
  }
  window.scrollTo(scrollX, scrollY);
};

const focusOnInput = () => {
  const editor = elements.input;
  if (!editor) return;
  editor.focus();
};

const getCursorPosition = (element) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return 0;
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
};

const setCursorPosition = (element, position) => {
  let charIndex = 0;
  let foundPosition = false;
  const traverseNodes = (node) => {
    if (foundPosition) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.length;
      if (charIndex + nodeLength >= position) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStart(node, position - charIndex);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        foundPosition = true;
      }
      charIndex += nodeLength;
    } else {
      for (let i = 0; i < node.childNodes.length && !foundPosition; i++) {
        traverseNodes(node.childNodes[i]);
      }
    }
  };
  traverseNodes(element);
  if (!foundPosition) {
    const range = document.createRange();
    const selection = window.getSelection();
    if (element.lastChild) {
      if (element.lastChild.nodeType === Node.TEXT_NODE) {
        range.setStart(element.lastChild, element.lastChild.length);
      } else {
        range.setStartAfter(element.lastChild);
      }
    } else {
      range.setStart(element, 0);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

const findLastTextNode = (element) => {
  if (element.nodeType === Node.TEXT_NODE) return element;
  for (let i = element.childNodes.length - 1; i >= 0; i--) {
    const lastNode = findLastTextNode(element.childNodes[i]);
    if (lastNode) return lastNode;
  }
  return null;
};

const showTextSection = () => {
  if (isMobileDevice() && elements.textSection && elements.outputSection) {
    elements.outputSection.classList.add('hide');
    elements.textSection.classList.remove('hide');
  }
};

const showOutputSection = () => {
  if (isMobileDevice() && elements.textSection && elements.outputSection) {
    elements.textSection.classList.add('hide');
    elements.outputSection.classList.remove('hide');
  }
};

const updateConfigStyles = () => {
  const existing = document.getElementById('dynamic-config-styles');
  if (existing) existing.remove();
  const s = document.createElement('style');
  s.id = 'dynamic-config-styles';
  s.textContent = `
    #dot-grid {
      gap: ${CONFIG.layout.dotGap}px;
    }
    .dot-row {
      gap: ${CONFIG.layout.dotGap}px;
    }
    .dot {
      width: ${CONFIG.layout.dotSize}px;
      height: ${CONFIG.layout.dotSize}px;
      font-size: ${CONFIG.layout.dotSize * 0.4}px;
    }
    .dot.detected {
      background-color: ${CONFIG.visual.detectedColor};
      border-color: ${CONFIG.visual.detectedColor};
    }
    .special-button {
      padding: 0 ${CONFIG.layout.dotSize * 0.3}px;
      height: ${CONFIG.layout.dotSize}px;
      font-size: ${CONFIG.layout.dotSize * 0.3}px;
    }
    #special-row {
      gap: ${CONFIG.layout.dotGap}px;
      margin-top: ${CONFIG.layout.dotGap}px;
    }
    .recognition-feedback {
      width: ${CONFIG.visual.feedbackSize}px;
      height: ${CONFIG.visual.feedbackSize}px;
      font-size: ${CONFIG.visual.feedbackTextSize}px;
    }
  `;
  document.head.appendChild(s);
};