// js/d2d-input.js
const wordMappings = {
  0: '+', 1: '-', 2: '*', 3: '/', 4: 'DUP', 5: 'DROP',
  6: 'SWAP', 7: 'ROT', 8: '>R', 9: 'R>', 10: 'R@', 11: '>',
  12: '>=', 13: '=', 14: 'IF', 15: 'DEF', 16: 'DEL', 17: 'CONS',
  18: 'HEAD', 19: 'TAIL', 20: 'LENGTH', 21: 'REVERSE', 22: 'CALL', 23: 'WORDS',
  24: 'WORDS?', 25: '[', 26: ']', 27: 'TRUE', 28: 'FALSE', 29: 'NIL'
};

let lineDrawing = false;
let firstDot = null;
let activeDots = new Set();
let canvas = null;
let ctx = null;
let pointerStartPos = null;
let isSwiping = false;
let swipeDirection = null;
let specialButtonStates = new Map();
let isLongPress = false;
let longPressTimer = null;
let isPointerDown = false;
let lastTapTime = 0;
let lastTappedDot = null;
let doubleTapTimer = null;
let isDoubleTap = false;

const drawLine = (from, to) => {
  if (!ctx) return;
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(
    fromRect.left + fromRect.width / 2 - canvasRect.left,
    fromRect.top + fromRect.height / 2 - canvasRect.top
  );
  ctx.lineTo(
    toRect.left + toRect.width / 2 - canvasRect.left,
    toRect.top + toRect.height / 2 - canvasRect.top
  );
  ctx.stroke();
};

const clearCanvas = () => {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const resizeCanvas = () => {
  if (!canvas || !elements.d2dInput) return;
  const container = elements.d2dInput;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  if (ctx) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }
};

const handlePointerDown = (e) => {
  e.preventDefault();
  
  // モバイルモードでd2d-inputが操作された時、キーボードを閉じる
  if (isMobileDevice()) {
    hideKeyboard();
    
    // txt-inputのキーボードモードを解除
    if (elements.input) {
      elements.input.isKeyboardMode = false;
    }
  }
  
  const dot = e.target.closest('.dot');
  if (!dot) return;
  
  isPointerDown = true;
  const currentTime = Date.now();
  
  if (lastTappedDot === dot && currentTime - lastTapTime < 500) {
    isDoubleTap = true;
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer);
      doubleTapTimer = null;
    }
    handleDoubleTap(dot);
    lastTapTime = 0;
    lastTappedDot = null;
  } else {
    isDoubleTap = false;
    lastTapTime = currentTime;
    lastTappedDot = dot;
    
    if (doubleTapTimer) {
      clearTimeout(doubleTapTimer);
    }
    
    doubleTapTimer = setTimeout(() => {
      if (!isLongPress && !lineDrawing && lastTappedDot === dot) {
        handleSingleTap(dot);
      }
      doubleTapTimer = null;
    }, 500);
  }
  
  pointerStartPos = { x: e.clientX, y: e.clientY };
  lineDrawing = true;
  firstDot = dot;
  activeDots.clear();
  activeDots.add(dot);
  dot.classList.add('detected');
  
  longPressTimer = setTimeout(() => {
    if (isPointerDown && firstDot === dot && activeDots.size === 1) {
      isLongPress = true;
      handleLongPress(dot);
    }
  }, 500);
};

const handleSingleTap = (dot) => {
  if (!dot) return;
  
  if (isMobileDevice()) {
    dot.classList.add('tapped-feedback');
    setTimeout(() => {
      dot.classList.remove('tapped-feedback');
    }, 150);
  }
  
  const value = dot.textContent || dot.dataset.value;
  if (value) {
    insertAtCursor(value);
  }
};

const handleDoubleTap = (dot) => {
  if (!dot) return;
  const value = dot.textContent || dot.dataset.value;
  if (value && !isNaN(value)) {
    insertAtCursor(`${value} ${value} `);
  }
};

const handleLongPress = (dot) => {
  if (!dot) return;
  const value = dot.textContent || dot.dataset.value;
  if (value && !isNaN(value)) {
    const negativeValue = value.startsWith('-') ? value.substring(1) : `-${value}`;
    insertAtCursor(negativeValue);
  }
};

const getDistance = (pos1, pos2) => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getSwipeDirection = (startPos, currentPos) => {
  const dx = currentPos.x - startPos.x;
  const dy = currentPos.y - startPos.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  if (absDx > absDy && absDx > 30) {
    return dx > 0 ? 'right' : 'left';
  } else if (absDy > absDx && absDy > 30) {
    return dy > 0 ? 'down' : 'up';
  }
  return null;
};

const handlePointerMove = (e) => {
  if (!lineDrawing || !firstDot || !pointerStartPos) return;
  
  const currentPos = { x: e.clientX, y: e.clientY };
  const distance = getDistance(pointerStartPos, currentPos);
  
  if (distance > 20 && !isSwiping) {
    isSwiping = true;
    swipeDirection = getSwipeDirection(pointerStartPos, currentPos);
  }
  
  const dot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dot');
  
  if (dot && dot !== firstDot && !activeDots.has(dot)) {
    activeDots.add(dot);
    dot.classList.add('detected');
    clearCanvas();
    let prevDot = firstDot;
    activeDots.forEach(d => {
      if (d !== firstDot) {
        drawLine(prevDot, d);
        prevDot = d;
      }
    });
  }
};

const handlePointerUp = (e) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  
  if (!lineDrawing) {
    isPointerDown = false;
    return;
  }
  
  if (isSwiping && firstDot && swipeDirection) {
    handleSwipe(firstDot, swipeDirection);
  } else if (activeDots.size > 1) {
    const values = Array.from(activeDots).map(dot => dot.textContent || dot.dataset.value);
    const joinedValue = values.join('');
    insertAtCursor(joinedValue);
  }
  
  activeDots.forEach(dot => dot.classList.remove('detected'));
  activeDots.clear();
  clearCanvas();
  lineDrawing = false;
  firstDot = null;
  pointerStartPos = null;
  isSwiping = false;
  swipeDirection = null;
  isLongPress = false;
  isPointerDown = false;
};

const handleSwipe = (dot, direction) => {
  const value = dot.textContent || dot.dataset.value;
  if (!value || isNaN(value)) return;
  
  const num = parseInt(value);
  let result;
  
  switch (direction) {
    case 'right':
      result = `1${value}`;
      break;
    case 'left':
      result = value.length > 1 ? value.substring(1) : value;
      break;
    case 'up':
      result = String((num + 1) % 10);
      break;
    case 'down':
      result = String((num - 1 + 10) % 10);
      break;
  }
  
  if (result !== undefined) {
    insertAtCursor(result);
  }
};

const addRecognitionFeedback = (value, dot) => {
  const feedback = document.createElement('div');
  feedback.className = 'recognition-feedback';
  feedback.textContent = value;
  
  if (dot && elements.d2dInput) {
    const dotRect = dot.getBoundingClientRect();
    const containerRect = elements.d2dInput.getBoundingClientRect();
    feedback.style.left = `${dotRect.left - containerRect.left + dotRect.width / 2}px`;
    feedback.style.top = `${dotRect.top - containerRect.top + dotRect.height / 2}px`;
  }
  
  if (elements.d2dInput) {
    elements.d2dInput.appendChild(feedback);
    setTimeout(() => feedback.remove(), 800);
  }
};

const handleSpecialButtonDown = (e) => {
  e.preventDefault();
  
  // モバイルモードでd2d-inputが操作された時、キーボードを閉じる
  if (isMobileDevice()) {
    hideKeyboard();
    
    // txt-inputのキーボードモードを解除
    if (elements.input) {
      elements.input.isKeyboardMode = false;
    }
  }
  
  const button = e.target.closest('.special-button');
  if (!button) return;
  
  const isDelete = button.classList.contains('delete');
  const isSpace = button.classList.contains('space');
  
  const buttonState = {
    startTime: Date.now(),
    timer: null,
    isLongPress: false,
    lastClickTime: specialButtonStates.get(button)?.lastClickTime || 0
  };
  
  const currentTime = Date.now();
  const isDoubleClick = currentTime - buttonState.lastClickTime < 300;
  
  if (isDelete) {
    if (isDoubleClick) {
      button.classList.add('double-clicked');
      clearInput();
      setTimeout(() => button.classList.remove('double-clicked'), 200);
    } else {
      buttonState.timer = setTimeout(() => {
        buttonState.isLongPress = true;
        button.classList.add('long-pressed');
        handleDeleteAction(true);
      }, 500);
    }
  } else if (isSpace) {
    const otherButton = document.querySelector('.special-button.delete');
    if (otherButton && specialButtonStates.get(otherButton)?.isPressed) {
      button.classList.add('combined-pressed');
      otherButton.classList.add('combined-pressed');
      insertAtCursor('\n');
    } else {
      buttonState.timer = setTimeout(() => {
        buttonState.isLongPress = true;
        button.classList.add('long-pressed');
        insertAtCursor('    ');
      }, 500);
    }
  }
  
  buttonState.lastClickTime = currentTime;
  buttonState.isPressed = true;
  specialButtonStates.set(button, buttonState);
};

const handleSpecialButtonUp = (e) => {
  const button = e.target.closest('.special-button');
  if (!button) return;
  
  const buttonState = specialButtonStates.get(button);
  if (!buttonState) return;
  
  if (buttonState.timer) {
    clearTimeout(buttonState.timer);
  }
  
  const isDelete = button.classList.contains('delete');
  const isSpace = button.classList.contains('space');
  
  if (!buttonState.isLongPress) {
    if (isDelete) {
      const currentTime = Date.now();
      const isDoubleClick = currentTime - buttonState.lastClickTime < 300;
      if (!isDoubleClick) {
        button.classList.add('clicked');
        handleDeleteAction(false);
        setTimeout(() => button.classList.remove('clicked'), 200);
      }
    } else if (isSpace) {
      const otherButton = document.querySelector('.special-button.delete');
      if (!otherButton || !specialButtonStates.get(otherButton)?.isPressed) {
        button.classList.add('clicked');
        insertAtCursor(' ');
        setTimeout(() => button.classList.remove('clicked'), 200);
      }
    }
  }
  
  button.classList.remove('long-pressed', 'combined-pressed', 'clicked', 'double-clicked');
  const otherButton = document.querySelector('.special-button:not(.delete):not(.space)');
  if (otherButton) {
    otherButton.classList.remove('combined-pressed');
  }
  
  buttonState.isPressed = false;
  specialButtonStates.set(button, buttonState);
};

const initializeD2D = () => {
  const dotGrid = document.getElementById('dot-grid');
  const specialRow = document.getElementById('special-row');
  
  if (!dotGrid || !specialRow) return;
  
  for (let row = 0; row < 3; row++) {
    const dotRow = document.createElement('div');
    dotRow.className = 'dot-row';
    
    for (let col = 0; col < 10; col++) {
      const index = row * 10 + col;
      const dot = document.createElement('div');
      dot.className = 'dot';
      
      if (index < 10) {
        dot.classList.add('numeric');
        dot.textContent = index.toString();
        dot.dataset.value = index.toString();
      } else if (wordMappings[index]) {
        dot.classList.add('word-dot');
        dot.textContent = wordMappings[index];
        dot.dataset.value = wordMappings[index];
      }
      
      dotRow.appendChild(dot);
    }
    
    dotGrid.appendChild(dotRow);
  }
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'special-button delete';
  deleteButton.textContent = 'Delete';
  specialRow.appendChild(deleteButton);
  
  const spaceButton = document.createElement('button');
  spaceButton.className = 'special-button space';
  spaceButton.textContent = 'Space';
  specialRow.appendChild(spaceButton);
  
  dotGrid.addEventListener('pointerdown', handlePointerDown);
  dotGrid.addEventListener('pointermove', handlePointerMove);
  dotGrid.addEventListener('pointerup', handlePointerUp);
  dotGrid.addEventListener('pointercancel', handlePointerUp);
  dotGrid.addEventListener('pointerleave', handlePointerUp);
  
  specialRow.addEventListener('pointerdown', handleSpecialButtonDown);
  specialRow.addEventListener('pointerup', handleSpecialButtonUp);
  specialRow.addEventListener('pointercancel', handleSpecialButtonUp);
  specialRow.addEventListener('pointerleave', handleSpecialButtonUp);
  
  dotGrid.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  specialRow.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  
  canvas = document.getElementById('line-canvas');
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }
};