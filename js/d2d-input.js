// D2D（Dot-to-Dot）入力システム
class D2DInput {
  constructor(container, canvas, model, textInput) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.textInput = textInput;
    
    this.dotGrid = document.getElementById('dot-grid');
    this.specialControls = document.getElementById('special-controls');
    
    // 描画状態
    this.isDrawing = false;
    this.activePointerId = null;
    this.detectedDots = new Set();
    this.dotSequence = [];
    this.totalValue = 1;
    this.lastPoint = null;
    
    this.init();
  }
  
  init() {
    this.createDotGrid();
    this.createSpecialControls();
    this.setupCanvas();
    this.setupEventListeners();
  }
  
  createDotGrid() {
    this.dotGrid.innerHTML = '';
    const { rows, cols } = CONSTANTS.D2D.GRID_SIZE;
    
    for (let r = 0; r < rows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'dot-row';
      
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (index >= CONSTANTS.D2D.DOT_VALUES.length) continue;
        
        const dot = this.createDot(index);
        rowEl.appendChild(dot);
      }
      
      this.dotGrid.appendChild(rowEl);
    }
  }
  
  createDot(index) {
    const dot = document.createElement('div');
    const value = CONSTANTS.D2D.DOT_VALUES[index];
    
    dot.className = 'dot';
    dot.dataset.index = String(index);
    dot.dataset.value = String(value);
    dot.dataset.digit = String(index + 1);
    dot.textContent = dot.dataset.digit;
    
    return dot;
  }
  
  createSpecialControls() {
    this.specialControls.innerHTML = '';
    
    // 削除ボタン
    const deleteBtn = this.createSpecialButton('削除', 'delete');
    
    // 0ボタン
    const zeroBtn = document.createElement('div');
    zeroBtn.className = 'dot';
    zeroBtn.textContent = '0';
    zeroBtn.dataset.digit = '0';
    zeroBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isDrawing) {
        this.insertCharacter('0');
      }
    });
    
    // スペース/改行ボタン
    const spaceBtn = this.createSpecialButton('空白/改行', 'space');
    
    this.specialControls.appendChild(deleteBtn);
    this.specialControls.appendChild(zeroBtn);
    this.specialControls.appendChild(spaceBtn);
  }
  
  createSpecialButton(text, action) {
    const btn = document.createElement('button');
    btn.className = 'special-btn';
    btn.textContent = text;
    btn.dataset.action = action;
    
    let lastTapTime = 0;
    
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const isDouble = (now - lastTapTime) < 300;
      lastTapTime = now;
      
      switch (action) {
        case 'delete':
          if (isDouble) {
            this.model.deleteWord();
          } else {
            this.model.deleteToken();
          }
          this.textInput.render();
          break;
          
        case 'space':
          if (isDouble) {
            this.model.addToken(CONSTANTS.TOKEN_TYPES.SPECIAL, '\n');
          } else {
            this.model.addToken(CONSTANTS.TOKEN_TYPES.SPECIAL, ' ');
          }
          this.textInput.render();
          break;
      }
    });
    
    return btn;
  }
  
  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  setupEventListeners() {
    // ポインターイベント
    this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    window.addEventListener('pointermove', this.handlePointerMove.bind(this));
    window.addEventListener('pointerup', this.handlePointerUp.bind(this));
    window.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    
    // タッチイベントでキーボードを防ぐ
    this.container.addEventListener('touchstart', (e) => {
      if (e.target !== document.getElementById('editor')) {
        e.preventDefault();
        this.textInput.blur();
      }
    }, { passive: false });
  }
  
  handlePointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    const dot = e.target.closest('.dot[data-value]');
    
    if (dot) {
      e.preventDefault();
      
      // ポインターキャプチャ
      try {
        this.container.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('Pointer capture failed:', err);
      }
      
      this.activePointerId = e.pointerId;
      
      // 数字タップの判定
      if (dot.dataset.digit && !this.isDrawing) {
        // タップで数字入力
        this.insertCharacter(dot.dataset.digit);
      } else {
        // パターン描画開始
        this.startDrawing(dot, e.clientX, e.clientY);
      }
    }
  }
  
  handlePointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.activePointerId) return;
    
    // 現在のポインター位置のドットを検出
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const dot = element?.closest('.dot[data-value]');
    
    if (dot && !this.detectedDots.has(dot)) {
      this.addDot(dot);
    }
    
    // ライブ線を描画
    this.drawLiveLine(e.clientX, e.clientY);
  }
  
  handlePointerUp(e) {
    if (e.pointerId !== this.activePointerId) return;
    
    // ポインターキャプチャを解放
    try {
      this.container.releasePointerCapture(e.pointerId);
    } catch (err) {
      console.warn('Release pointer capture failed:', err);
    }
    
    if (this.isDrawing) {
      this.endDrawing();
    }
    
    this.activePointerId = null;
  }
  
  startDrawing(dot, clientX, clientY) {
    this.isDrawing = true;
    this.detectedDots.clear();
    this.dotSequence = [];
    this.totalValue = 1;
    this.lastPoint = null;
    
    this.clearCanvas();
    this.addDot(dot);
  }
  
  addDot(dot) {
    if (this.detectedDots.has(dot)) return;
    
    dot.classList.add('active');
    this.detectedDots.add(dot);
    this.dotSequence.push(dot);
    
    const value = parseInt(dot.dataset.value);
    if (!isNaN(value)) {
      this.totalValue *= value;
    }
    
    // ドットの中心を計算
    const rect = dot.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - canvasRect.left;
    const centerY = rect.top + rect.height / 2 - canvasRect.top;
    
    // 線を描画
    if (this.lastPoint) {
      this.drawLine(this.lastPoint.x, this.lastPoint.y, centerX, centerY);
    }
    
    this.lastPoint = { x: centerX, y: centerY };
  }
  
  drawLine(x1, y1, x2, y2) {
    const currentColor = CONSTANTS.EDITOR_COLORS[CONSTANTS.TYPE_TO_COLOR[this.textInput.getCurrentType()]];
    
    this.ctx.strokeStyle = currentColor;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }
  
  drawLiveLine(clientX, clientY) {
    if (!this.lastPoint) return;
    
    // 既存の線を再描画
    this.redrawAllLines();
    
    // ライブ線を描画
    const canvasRect = this.canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    
    const currentColor = CONSTANTS.EDITOR_COLORS[CONSTANTS.TYPE_TO_COLOR[this.textInput.getCurrentType()]];
    
    this.ctx.strokeStyle = currentColor + '80'; // 半透明
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }
  
  redrawAllLines() {
    this.clearCanvas();
    
    if (this.dotSequence.length < 2) return;
    
    const currentColor = CONSTANTS.EDITOR_COLORS[CONSTANTS.TYPE_TO_COLOR[this.textInput.getCurrentType()]];
    const canvasRect = this.canvas.getBoundingClientRect();
    
    this.ctx.strokeStyle = currentColor;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    
    for (let i = 0; i < this.dotSequence.length - 1; i++) {
      const dot1 = this.dotSequence[i];
      const dot2 = this.dotSequence[i + 1];
      
      const rect1 = dot1.getBoundingClientRect();
      const rect2 = dot2.getBoundingClientRect();
      
      const x1 = rect1.left + rect1.width / 2 - canvasRect.left;
      const y1 = rect1.top + rect1.height / 2 - canvasRect.top;
      const x2 = rect2.left + rect2.width / 2 - canvasRect.left;
      const y2 = rect2.top + rect2.height / 2 - canvasRect.top;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
  
  endDrawing() {
    this.isDrawing = false;
    
    // 文字認識
    if (this.totalValue > 1) {
      const character = CONSTANTS.LETTER_PATTERNS[this.totalValue];
      if (character) {
        this.insertCharacter(character);
        this.showFeedback(character);
      }
    }
    
    // リセット
    this.detectedDots.forEach(dot => dot.classList.remove('active'));
    this.detectedDots.clear();
    this.dotSequence = [];
    this.totalValue = 1;
    this.lastPoint = null;
    
    setTimeout(() => this.clearCanvas(), 500);
  }
  
  insertCharacter(char) {
    const type = this.textInput.getCurrentType();
    this.model.addToken(type, char);
    this.textInput.render();
  }
  
  showFeedback(character) {
    const feedback = document.createElement('div');
    feedback.className = 'recognition-feedback';
    feedback.textContent = character;
    this.container.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 800);
  }
  
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// グローバルに公開
window.D2DInput = D2DInput;