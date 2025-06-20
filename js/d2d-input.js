const clearCanvas = () => {
  const ctx = drawState.canvasContext;
  if (ctx && elements.lineCanvas) {
    ctx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);
    drawState.lineSegments = [];
  }
};

const resetDrawState = (keepActive = false) => {
  drawState.isActive = keepActive;
  if (drawState.detectedDots.size > 0) {
    drawState.detectedDots.forEach(dot => dot.classList.remove('detected'));
    drawState.detectedDots.clear();
  }
  drawState.groupProducts = [1, 1, 1, 1];
  drawState.currentStrokeDetected = false;
  drawState.hasMoved = false;
  drawState.isDrawingMode = false;
  drawState.detectedDotsList = [];
  drawState.lastDetectedDot = null;
  drawState.lastDotX = 0;
  drawState.lastDotY = 0;
  drawState.currentLineColor = null;
  drawState.lineSegments = [];
  if (!keepActive) drawState.lastStrokeTime = 0;
  clearTimeout(drawState.strokeTimer);
  drawState.strokeTimer = null;
};

const drawLineBetweenDots = (fromX, fromY, toX, toY, color) => {
  const ctx = drawState.canvasContext;
  if (!ctx) return;
  
  ctx.strokeStyle = colorCodes[color] || colorCodes['yellow'];
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  
  // 線分を記録
  drawState.lineSegments.push({fromX, fromY, toX, toY, color});
};

const redrawAllLines = () => {
  const ctx = drawState.canvasContext;
  if (!ctx) return;
  
  ctx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);
  
  drawState.lineSegments.forEach(segment => {
    ctx.strokeStyle = colorCodes[segment.color] || colorCodes['yellow'];
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(segment.fromX, segment.fromY);
    ctx.lineTo(segment.toX, segment.toY);
    ctx.stroke();
  });
};

const recognizeLetterWithGroups = (groupProducts) => {
  const key = `${groupProducts[0]}_${groupProducts[1]}_${groupProducts[2]}_${groupProducts[3]}`;
  
  if (letterPatterns[key]) {
    console.log(`パターン一致: ${key} → ${letterPatterns[key]}`);
    return letterPatterns[key];
  }
  
  // 部分一致を試みる（いくつかのグループが1の場合）
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [patternKey, char] of Object.entries(letterPatterns)) {
    const pattern = patternKey.split('_').map(Number);
    let score = 0;
    
    for (let i = 0; i < 4; i++) {
      if (pattern[i] === groupProducts[i]) {
        score += (groupProducts[i] > 1) ? 2 : 1;
      } else if (pattern[i] === 1 || groupProducts[i] === 1) {
        // 片方が1の場合は部分点
        score += 0.5;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = char;
    }
  }
  
  if (bestMatch && bestScore >= 3) {
    console.log(`部分一致: ${key} → ${bestMatch} (スコア: ${bestScore})`);
    return bestMatch;
  }
  
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
  if (drawState.currentStrokeDetected) {
    clearTimeout(drawState.strokeTimer);
    drawState.strokeTimer = setTimeout(() => {
      if (drawState.detectedDots.size > 0) {
        const rec = recognizeLetterWithGroups(drawState.groupProducts);
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
        drawState.lastStrokeTime = 0;
      } else {
        resetDrawState();
        clearCanvas();
        drawState.lastStrokeTime = 0;
      }
      drawState.strokeTimer = null;
    }, CONFIG.timing.multiStrokeTimeout);
  } else if (!drawState.strokeTimer) {
    resetDrawState();
    clearCanvas();
    drawState.lastStrokeTime = 0;
  }
  drawState.lastStrokeTime = now;
};

const addDetectedDot = (dot) => {
  if (!dot || drawState.detectedDots.has(dot)) return;
  dot.classList.add('detected');
  drawState.detectedDots.add(dot);
  drawState.detectedDotsList.push(dot);
  drawState.currentStrokeDetected = true;
  
  const dotIndex = parseInt(dot.dataset.index, 10);
  const primes = dotGroupPrimes[dotIndex];
  if (primes) {
    for (let i = 0; i < 4; i++) {
      if (primes[i] !== null) {
        drawState.groupProducts[i] *= primes[i];
      }
    }
  }
  
  const cachedPos = drawState.dotPositionCache.get(dotIndex);
  if (cachedPos) {
    if (drawState.lastDetectedDot) {
      const activeColorBtn = document.querySelector('.color-btn.active');
      const currentColor = activeColorBtn ? activeColorBtn.dataset.color : 'red';
      const areaRect = elements.d2dArea.getBoundingClientRect();
      drawLineBetweenDots(
        drawState.lastDotX - areaRect.left,
        drawState.lastDotY - areaRect.top,
        cachedPos.x - areaRect.left,
        cachedPos.y - areaRect.top,
        currentColor
      );
      drawState.currentLineColor = currentColor;
    }
    drawState.lastDetectedDot = dot;
    drawState.lastDotX = cachedPos.x;
    drawState.lastDotY = cachedPos.y;
  }
  
  clearTimeout(drawState.strokeTimer);
  drawState.strokeTimer = null;
};

const detectDot = (x, y) => {
  if (!drawState.isActive || !drawState.spatialIndex) return;
  const now = Date.now();
  if (now - drawState.lastDetectionTime < CONFIG.sensitivity.debounceTime) return;
  drawState.lastDetectionTime = now;
  
  const hitRadius = CONFIG.sensitivity.hitRadius;
  const nearbyKeys = spatialIndexHelpers.getNearbyGridKeys(x, y, hitRadius);
  
  for (const key of nearbyKeys) {
    const dotsInGrid = drawState.spatialIndex.get(key);
    if (!dotsInGrid) continue;
    
    for (const dotInfo of dotsInGrid) {
      if (drawState.detectedDots.has(dotInfo.element)) continue;
      
      const dist = Math.hypot(x - dotInfo.x, y - dotInfo.y);
      if (dist <= hitRadius) {
        addDetectedDot(dotInfo.element);
        drawState.lastStrokeTime = Date.now();
        return; // 最初に見つかったドットで終了
      }
    }
  }
};

const updateDotPositionCache = () => {
  drawState.dotPositionCache.clear();
  drawState.spatialIndex = new Map();
  
  const dots = elements.d2dArea.querySelectorAll('.dot');
  dots.forEach(dot => {
    const rect = dot.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const index = parseInt(dot.dataset.index, 10);
    
    const dotInfo = { x, y, element: dot, index };
    drawState.dotPositionCache.set(index, dotInfo);
    
    // 空間インデックスに追加
    const gridKey = spatialIndexHelpers.getGridKey(x, y);
    if (!drawState.spatialIndex.has(gridKey)) {
      drawState.spatialIndex.set(gridKey, []);
    }
    drawState.spatialIndex.get(gridKey).push(dotInfo);
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
  const areaRect = elements.d2dArea.getBoundingClientRect();
  for (let i = 1; i < dots.length; i++) {
    const prevIndex = parseInt(dots[i-1].dataset.index, 10);
    const currIndex = parseInt(dots[i].dataset.index, 10);
    const prevPos = drawState.dotPositionCache.get(prevIndex);
    const currPos = drawState.dotPositionCache.get(currIndex);
    if (prevPos && currPos) {
      drawLineBetweenDots(
        prevPos.x - areaRect.left,
        prevPos.y - areaRect.top,
        currPos.x - areaRect.left,
        currPos.y - areaRect.top,
        currentColor
      );
    }
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
      const ctx = drawState.canvasContext;
      if (ctx) {
        redrawAllLines();
        const areaRect = elements.d2dArea.getBoundingClientRect();
        ctx.strokeStyle = colorCodes[currentColor] || colorCodes['red'];
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(
          drawState.lastDotX - areaRect.left,
          drawState.lastDotY - areaRect.top
        );
        ctx.lineTo(
          e.clientX - areaRect.left,
          e.clientY - areaRect.top
        );
        ctx.stroke();
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
  
  // コンテキストをキャッシュ
 drawState.canvasContext = canvas.getContext('2d');
 
 clearCanvas();
 updateDotPositionCache();
};

function initKeypad() {
 if (!elements.dotGrid || !elements.specialRow) {
   console.error("Required grid elements not found! dotGrid:", elements.dotGrid, "specialRow:", elements.specialRow);
   return;
 }
 elements.dotGrid.innerHTML = '';
 elements.specialRow.innerHTML = '';
 CONFIG.layout.gridRows = 3;
 CONFIG.layout.gridCols = 3;
 for (let r = 0; r < CONFIG.layout.gridRows; r++) {
   const row = document.createElement('div');
   row.className = 'dot-row';
   for (let c = 0; c < CONFIG.layout.gridCols; c++) {
     const idx = r * CONFIG.layout.gridCols + c;
     const position = idx + 1;
     const dot = document.createElement('div');
     dot.className = 'dot';
     dot.dataset.index = position;
     dot.textContent = position.toString();
     dot.classList.add('numeric');
     dot.dataset.digit = position.toString();
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
 
 // 初期化時に位置をキャッシュ
 setTimeout(() => {
   updateDotPositionCache();
 }, 100);
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
 
 // ウィンドウリサイズ時に位置を再計算
 let resizeTimer;
 window.addEventListener('resize', () => {
   clearTimeout(resizeTimer);
   resizeTimer = setTimeout(() => {
     updateDotPositionCache();
   }, 100);
 });
};