const clearCanvas = () => {
  const lineCtx = elements.lineCanvas ? elements.lineCanvas.getContext('2d') : null;
  if (lineCtx && elements.lineCanvas) {
    lineCtx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);
  }
};

const resetDrawState = (keepActive = false) => {
  drawState.isActive = keepActive;
  if (drawState.detectedDots.size > 0) {
    drawState.detectedDots.forEach(dot => dot.classList.remove('detected'));
    drawState.detectedDots.clear();
  }
  drawState.currentStrokeValue = 0;
  drawState.currentStrokeDetected = false;
  drawState.hasMoved = false;
  drawState.isDrawingMode = false;
  drawState.detectedDotsList = [];
  drawState.lastDetectedDot = null;
  drawState.lastDotX = 0;
  drawState.lastDotY = 0;
  drawState.currentLineColor = null;
  if (!keepActive) {
    drawState.lastStrokeTime = 0;
    drawState.strokeValues = [];
  }
  clearTimeout(drawState.strokeTimer);
  drawState.strokeTimer = null;
};

const drawLineBetweenDots = (fromX, fromY, toX, toY, color) => {
  const lineCanvas = elements.lineCanvas;
  if (!lineCanvas) return;
  const ctx = lineCanvas.getContext('2d');
  if (!ctx) return;
  ctx.strokeStyle = colorCodes[color] || colorCodes['yellow'];
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
};

const recognizeLetterWithStrokes = (strokeValues) => {
  const strokeCount = strokeValues.length;
  
  if (strokeCount === 1) {
    const value = strokeValues[0];
    if (letterPatterns[1] && letterPatterns[1][value]) {
      console.log(`1ストローク認識: ${value} → ${letterPatterns[1][value]}`);
      return letterPatterns[1][value];
    }
  }
  else if (strokeCount === 2) {
    const key = strokeValues.join(',');
    if (letterPatterns[2] && letterPatterns[2][key]) {
      console.log(`2ストローク認識: ${key} → ${letterPatterns[2][key]}`);
      return letterPatterns[2][key];
    }
  }
  else if (strokeCount === 3) {
    const key = strokeValues.join(',');
    if (letterPatterns[3] && letterPatterns[3][key]) {
      console.log(`3ストローク認識: ${key} → ${letterPatterns[3][key]}`);
      return letterPatterns[3][key];
    }
  }
  
  console.log(`認識失敗: ストローク数=${strokeCount}, 値=${strokeValues.join(',')}`);
  return null;
};

const showRecognitionFeedback = (character) => {
  if (!elements.d2dArea || !character) return;
  const fb = document.createElement('div');
  fb.className = 'recognition-feedback';
  fb.textContent = character;
  elements.d2dArea.appendChild(fb);
  setTimeout(() => fb.remove(), 800);
};

const endDrawing = () => {
  if (!drawState.isActive) return;
  const now = Date.now();

  if (drawState.currentStrokeDetected && drawState.currentStrokeValue > 0) {
    drawState.strokeValues.push(drawState.currentStrokeValue);
    console.log(`ストローク追加: ${drawState.currentStrokeValue}, 合計: ${drawState.strokeValues.length}`);
    
    clearTimeout(drawState.strokeTimer);

    drawState.strokeTimer = setTimeout(() => {
      if (drawState.strokeValues.length > 0) {
        const rec = recognizeLetterWithStrokes(drawState.strokeValues);
        if (rec) {
          if (isMobileDevice()) {
            showTextSection();
          }
          insertAtCursor(rec);
          showRecognitionFeedback(rec);
          if (document.activeElement && document.activeElement !== elements.input) {
            document.activeElement.blur();
          }
        }
        resetDrawState();
        clearCanvas();
      }
      drawState.strokeTimer = null;
    }, CONFIG.timing.multiStrokeTimeout);
    
    drawState.currentStrokeValue = 0;
    drawState.detectedDots.forEach(dot => dot.classList.remove('detected'));
    drawState.detectedDots.clear();
    drawState.detectedDotsList = [];
    drawState.currentStrokeDetected = false;
    drawState.lastDetectedDot = null;
  } else {
    resetDrawState();
    clearCanvas();
  }
  
  drawState.lastStrokeTime = now;
};

const addDetectedDot = (dot) => {
  if (!dot || drawState.detectedDots.has(dot)) return;
  
  dot.classList.add('detected');
  drawState.detectedDots.add(dot);
  drawState.detectedDotsList.push(dot);
  drawState.currentStrokeDetected = true;
  
  const v = parseInt(dot.dataset.value, 10);
  if (!isNaN(v)) {
    drawState.currentStrokeValue |= v;
  }
  
  const rect = dot.getBoundingClientRect();
  const dotX = rect.left + rect.width / 2;
  const dotY = rect.top + rect.height / 2;
  
  if (drawState.lastDetectedDot) {
    const activeColorBtn = document.querySelector('.color-btn.active');
    const currentColor = activeColorBtn ? activeColorBtn.dataset.color : 'red';
    drawLineBetweenDots(
      drawState.lastDotX - elements.d2dArea.getBoundingClientRect().left,
      drawState.lastDotY - elements.d2dArea.getBoundingClientRect().top,
      dotX - elements.d2dArea.getBoundingClientRect().left,
      dotY - elements.d2dArea.getBoundingClientRect().top,
      currentColor
    );
    drawState.currentLineColor = currentColor;
  }
  
  drawState.lastDetectedDot = dot;
  drawState.lastDotX = dotX;
  drawState.lastDotY = dotY;
  
  clearTimeout(drawState.strokeTimer);
  drawState.strokeTimer = null;
};

const detectDot = (x, y) => {
  if (!drawState.isActive || !elements.dotGrid) return;
  const now = Date.now();
  if (now - drawState.lastDetectionTime < CONFIG.sensitivity.debounceTime) return;
  drawState.lastDetectionTime = now;

  const hitRadius = CONFIG.sensitivity.hitRadius;
  elements.d2dArea.querySelectorAll('.dot').forEach(dot => {
    if (drawState.detectedDots.has(dot)) return;
    const r = dot.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(x - cx, y - cy);

    if (dist <= hitRadius) {
      addDetectedDot(dot);
      clearTimeout(drawState.strokeTimer);
      drawState.strokeTimer = null;
      drawState.lastStrokeTime = Date.now();
    }
  });
};

const handlePointerDown = (e, el) => {
  if (!e || !el) return;
  if (document.activeElement === elements.input && elements.input.isKeyboardMode) {
    elements.input.blur();
    elements.input.isKeyboardMode = false;
  }
  if (document.activeElement && document.activeElement !== elements.input) {
    document.activeElement.blur();
  }
  if (e.target !== elements.input && e.target !== elements.output) {
    if (e.preventDefault) e.preventDefault();
  }
  drawState.currentTouchId = e.pointerId;
  drawState.pointerStartX = e.clientX;
  drawState.pointerStartY = e.clientY;
  drawState.hasMoved = false;
  try {
    if (el.setPointerCapture && !el.hasPointerCapture(e.pointerId)) {
      el.setPointerCapture(e.pointerId);
    }
  } catch (err) { console.log("Pointer capture not supported or failed:", err); }
  if (isMobileDevice()) showTextSection();
  const isDot = el.classList.contains('dot');
  clearTimeout(drawState.tapCheckTimer);
  drawState.tapCheckTimer = setTimeout(() => {
    if (!drawState.hasMoved) {
      const digit = el.dataset.digit;
      const word = el.dataset.word;
      if (digit || word) {
        insertAtCursor(digit || word);
        el.classList.add('tapped-feedback');
        setTimeout(() => el.classList.remove('tapped-feedback'), 200);
        resetDrawState();
        clearCanvas();
      } else if (isDot) {
        resetDrawState();
        clearCanvas();
      }
    }
    drawState.tapCheckTimer = null;
  }, 200);
  if (isDot) {
    const now = Date.now();
    if (!drawState.isActive || now - drawState.lastStrokeTime > CONFIG.timing.multiStrokeTimeout) {
      resetDrawState(true);
    }
    drawState.isActive = true;
    drawState.startX = e.clientX;
    drawState.startY = e.clientY;
    drawState.lastDetectionTime = now;
    drawState.lastStrokeTime = now;
    addDetectedDot(el);
    clearTimeout(drawState.strokeTimer);
    drawState.strokeTimer = null;
  } else {
    resetDrawState();
    clearCanvas();
  }
};

const redrawExistingLines = (currentColor) => {
  if (drawState.detectedDotsList.length <= 1) return;
  const dots = drawState.detectedDotsList;
  for (let i = 1; i < dots.length; i++) {
    const prevDot = dots[i-1];
    const currDot = dots[i];
    const prevRect = prevDot.getBoundingClientRect();
    const currRect = currDot.getBoundingClientRect();
    const prevX = prevRect.left + prevRect.width / 2 - elements.d2dArea.getBoundingClientRect().left;
    const prevY = prevRect.top + prevRect.height / 2 - elements.d2dArea.getBoundingClientRect().top;
    const currX = currRect.left + currRect.width / 2 - elements.d2dArea.getBoundingClientRect().left;
    const currY = currRect.top + currRect.height / 2 - elements.d2dArea.getBoundingClientRect().top;
    drawLineBetweenDots(prevX, prevY, currX, currY, currentColor);
  }
};

const handlePointerMove = (e) => {
  if (!drawState.isActive || e.pointerId !== drawState.currentTouchId) return;
  const dx = e.clientX - drawState.pointerStartX;
  const dy = e.clientY - drawState.pointerStartY;
  const distance = Math.hypot(dx, dy);
  if (distance >= CONFIG.sensitivity.minSwipeDistance) {
    if (!drawState.hasMoved) {
      drawState.hasMoved = true;
      clearTimeout(drawState.tapCheckTimer);
      drawState.tapCheckTimer = null;
      const startElement = document.elementFromPoint(drawState.pointerStartX, drawState.pointerStartY);
      if (startElement && startElement.classList.contains('dot')) {
        drawState.isDrawingMode = true;
      }
    }
    if (drawState.isDrawingMode && drawState.lastDetectedDot) {
      const activeColorBtn = document.querySelector('.color-btn.active');
      const currentColor = activeColorBtn ? activeColorBtn.dataset.color : 'red';
      const lineCanvas = elements.lineCanvas;
      if (lineCanvas) {
        const ctx = lineCanvas.getContext('2d');
        if (ctx) {
          clearCanvas();
          redrawExistingLines(currentColor);
          ctx.strokeStyle = colorCodes[currentColor] || colorCodes['red'];
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(
            drawState.lastDotX - elements.d2dArea.getBoundingClientRect().left,
            drawState.lastDotY - elements.d2dArea.getBoundingClientRect().top
          );
          ctx.lineTo(
            e.clientX - elements.d2dArea.getBoundingClientRect().left,
            e.clientY - elements.d2dArea.getBoundingClientRect().top
          );
          ctx.stroke();
        }
      }
    }
    detectDot(e.clientX, e.clientY);
  }
};

const handlePointerUp = (e) => {
  if (e.pointerId !== drawState.currentTouchId) return;
  try {
    const el = e.target;
    if (el && el.releasePointerCapture && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  } catch (err) { console.log("Error releasing pointer capture:", err); }
  if (drawState.tapCheckTimer) {
    clearTimeout(drawState.tapCheckTimer);
    drawState.tapCheckTimer = null;
    const el = e.target;
    if (el && el.classList.contains('dot') && !el.dataset.digit && !el.dataset.word) {
      resetDrawState();
      clearCanvas();
    }
  }
  if (drawState.isActive && (drawState.isDrawingMode || drawState.currentStrokeDetected)) {
    endDrawing();
  } else {
    resetDrawState();
    clearCanvas();
  }
  drawState.currentTouchId = null;
  if (elements.d2dArea) {
    elements.d2dArea.blur();
  }
};

const resizeCanvas = () => {
  const d2dArea = elements.d2dArea;
  const canvas = elements.lineCanvas;
  if (!d2dArea || !canvas) return;
  const rect = d2dArea.getBoundingClientRect();
  const style = window.getComputedStyle(d2dArea);
  const pl = parseFloat(style.paddingLeft) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  const pt = parseFloat(style.paddingTop) || 0;
  const pb = parseFloat(style.paddingBottom) || 0;
  canvas.width = d2dArea.clientWidth - pl - pr;
  canvas.height = d2dArea.clientHeight - pt - pb;
  canvas.style.left = `${pl}px`;
  canvas.style.top = `${pt}px`;
  clearCanvas();
};

function initKeypad() {
  if (!elements.dotGrid || !elements.specialRow) {
    console.error("Required grid elements not found! dotGrid:", elements.dotGrid, "specialRow:", elements.specialRow);
    return;
  }
  elements.dotGrid.innerHTML = '';
  elements.specialRow.innerHTML = '';
  
  for (let r = 0; r < CONFIG.layout.gridRows; r++) {
    const row = document.createElement('div');
    row.className = 'dot-row';
    for (let c = 0; c < CONFIG.layout.gridCols; c++) {
      const idx = r * CONFIG.layout.gridCols + c;
      if (idx >= dotValues.length) continue;
      const value = dotValues[idx];
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.index = idx;
      dot.dataset.value = value;
      
      if (numericPositions[idx]) {
        dot.classList.add('numeric');
        dot.textContent = numericPositions[idx];
        dot.dataset.digit = numericPositions[idx];
      }
      else if (symbolPositions[idx]) {
        dot.classList.add('symbol-dot');
        dot.textContent = symbolPositions[idx];
        dot.dataset.word = symbolPositions[idx];
      }
      else {
        dot.classList.add('letter-dot');
      }
      row.appendChild(dot);
    }
    elements.dotGrid.appendChild(row);
  }
  
  const deleteBtn = document.createElement('div');
  deleteBtn.className = 'special-button delete';
  deleteBtn.textContent = '削除';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.title = '削除 (ダブルタップで単語削除)';
  elements.specialRow.appendChild(deleteBtn);
  
  const zeroBtn = document.createElement('div');
  zeroBtn.className = 'dot numeric';
  zeroBtn.textContent = '0';
  zeroBtn.dataset.digit = '0';
  zeroBtn.dataset.index = 'special_0';
  zeroBtn.dataset.value = '0';
  elements.specialRow.appendChild(zeroBtn);
  
  const spaceBtn = document.createElement('div');
  spaceBtn.className = 'special-button space';
  spaceBtn.textContent = '空白/改行';
  spaceBtn.dataset.action = 'space';
  spaceBtn.title = 'シングルクリック: 空白挿入\nダブルクリック: 改行';
  elements.specialRow.appendChild(spaceBtn);
  
  if (elements.d2dArea) {
    elements.d2dArea.tabIndex = -1;
    elements.d2dArea.setAttribute('inputmode', 'none');
    elements.d2dArea.setAttribute('aria-hidden', 'true');
    const style = document.createElement('style');
    style.textContent = `
      #d2d-input {
        -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;
        -webkit-tap-highlight-color: transparent; outline: none;
      }
      #d2d-input:focus { outline: none; }
    `;
    document.head.appendChild(style);
  }
  updateConfigStyles();
  resizeCanvas();
  setupDotEventListeners();
  setupSpecialButtonListeners();
}

const setupDotEventListeners = () => {
  if (!elements.d2dArea) return;
  elements.d2dArea.addEventListener('focus', (e) => {
    if (elements.d2dArea) elements.d2dArea.blur();
    e.preventDefault();
  }, false);
  elements.d2dArea.setAttribute('tabindex', '-1');
  elements.d2dArea.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('dot')) {
      handlePointerDown(e, e.target);
    }
  }, { passive: false });
};