// D2DInput クラス (構文エラー修正版)

class D2DInput {
  constructor(container) {
    this.container = container;
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
        console.error("D2DInput Error: Canvas element with ID 'canvas' not found.");
        return; // 初期化中断
    }
    this.ctx = this.canvas.getContext('2d');
    this.dotGrid = document.getElementById('dot-grid'); // ドット要素のコンテナ
    if (!this.dotGrid) {
        console.error("D2DInput Error: Element with ID 'dot-grid' not found.");
        return; // 初期化中断
    }
    this.specialControls = document.getElementById('special-controls');
    if (!this.specialControls) {
        console.error("D2DInput Error: Element with ID 'special-controls' not found.");
        // return; // これは必須ではないかもしれないので、エラーログのみに留める
    }


    this.isDrawing = false;
    this.detectedDots = new Set(); // DOM要素を格納
    this.totalValue = 1;
    this.lastPoint = null; // {x, y} 最後にコミットされたドットの中心座標（キャンバス相対）
    this.strokeTimeout = null;

    // ポインターイベント関連のステート
    this.activePointerId = null;
    // ▼▼▼ ここが修正点です ▼▼▼
    this.hasMovedSufficiently = false; // "suficiently" から "Sufficiently" に修正、スペース削除
    // ▲▲▲ 修正点 ▲▲▲
    this.pointerDownStartCoords = null; // {x, y} pointerdown時のclientX/Y

    this.config = {
      minSwipeDistance: 10, // px: この距離以上動いたらドラッグとみなす
      dotHitRadius: 25, 
    };

    this.init();
  }

  init() {
    if (!this.canvas || !this.dotGrid ) { // 主要な要素がない場合は初期化を続行しない
        console.error("D2DInput init: Essential elements missing. Aborting initialization.");
        return;
    }
    this.createDotGrid();
    this.createSpecialControls();
    this.setupCanvas();
    this.setupEventListeners();
    this.preventKeyboardOnTouch();

    
  }

  preventKeyboardOnTouch() {
    if (!this.container) return;
    this.container.addEventListener('touchstart', (e) => {
      const editorElement = document.getElementById('editor');
      if (editorElement && e.target !== editorElement) { // editorElement も存在確認
        e.preventDefault();
        if (document.activeElement === editorElement) editorElement.blur();
      }
    }, { passive: false });
  }

  createDotGrid() {
    this.dotGrid.innerHTML = ''; // dotGridがnullでないことを確認済み
    const { rows, cols } = CONSTANTS.D2D.GRID_SIZE;
    for (let r = 0; r < rows; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'dot-row';
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (index >= CONSTANTS.D2D.DOT_VALUES.length) continue;
        const dot = this.createDotElement(index);
        rowEl.appendChild(dot);
      }
      this.dotGrid.appendChild(rowEl);
    }
  }

  createDotElement(index) {
    const dot = document.createElement('div');
    const value = CONSTANTS.D2D.DOT_VALUES[index];
    dot.className = 'dot numeric';
    dot.dataset.index = String(index);
    dot.dataset.value = String(value);
    dot.dataset.digit = (index + 1).toString();
    dot.textContent = dot.dataset.digit;
    return dot;
  }

  createSpecialControls() {
    if (!this.specialControls) return; // specialControls がなければ何もしない
    this.specialControls.innerHTML = '';
    const deleteBtn = this.createSpecialButton('削除', 'delete');
    
    const zeroBtn = document.createElement('div');
    zeroBtn.className = 'dot numeric'; 
    zeroBtn.textContent = '0';
    zeroBtn.dataset.digit = '0';
    // zeroBtn には data-value を設定しないことで、パターン描画の対象外とする
    // (handlePointerDown の .closest('.dot[data-value]') で区別される)
    zeroBtn.addEventListener('pointerdown', (e) => { // ポインターイベントに変更
        e.preventDefault(); e.stopPropagation();
        if (!this.isDrawing) window.uiManager.insertText('0');
    });

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
    
    // ダブルタップ相当のロジックのための状態
    let lastTapTime = 0;

    btn.addEventListener('pointerdown', (e) => { // ポインターイベントに変更
        e.preventDefault(); // ボタンのデフォルト動作やテキスト選択を防ぐ
        e.stopPropagation();

        const now = Date.now();
        const isDoubleAction = (now - lastTapTime) < 300; // 300ms以内ならダブルアクション
        lastTapTime = now;

        switch (action) {
            case 'delete':
                window.uiManager.handleDelete(isDoubleAction);
                break;
            case 'space':
                if (isDoubleAction) window.uiManager.insertNewline();
                else window.uiManager.insertText(' ');
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
    if (!this.container || !this.canvas) return;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    if (this.isDrawing) this.redrawAllLines();
  }

  setupEventListeners() {
    if (!this.container) return;
    this.container.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false });
    window.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false });
    window.addEventListener('pointercancel', this.handlePointerUp.bind(this), { passive: false });
  }

  handlePointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    const targetElement = e.target;
    // data-valueを持つグリッドドットのみをパターン描画の対象とする
    const dot = targetElement.closest('.dot[data-value]'); 

    console.log('[DEBUG handlePointerDown] Fired. Target:', targetElement.className, 'Found dot with data-value:', dot ? dot.dataset.value : 'null', 'isDrawing:', this.isDrawing);

    if (dot) {
      e.preventDefault();
      if (this.container.setPointerCapture && !this.container.hasPointerCapture(e.pointerId)) {
        try { this.container.setPointerCapture(e.pointerId); } catch(err) { console.warn("setPointerCapture failed:", err); }
      }


      this.activePointerId = e.pointerId;
      this.hasMovedSufficiently = false;
      this.pointerDownStartCoords = { x: e.clientX, y: e.clientY };

      if (!this.isDrawing) {
        console.log('[DEBUG handlePointerDown] Not drawing. Starting new pattern from dot:', dot.dataset.value);
        this.startDrawing(dot, e.clientX, e.clientY);
      } else {
        if (!this.detectedDots.has(dot)) {
            console.log('[DEBUG handlePointerDown] Already drawing. Adding dot to pattern:', dot.dataset.value);
            this.addDot(dot);
            this.drawLine(e.clientX, e.clientY);
        } else {
            console.log('[DEBUG handlePointerDown] Already drawing. Dot already in path. Ignored.');
        }
      }
    } else {
      // ドット外でpointerdownした場合 (かつ描画中だった場合など)
      // if (this.isDrawing) { // 必要に応じて描画終了処理
      //   console.log('[DEBUG handlePointerDown] Pointer down outside dot while drawing. Finalizing current drawing.');
      //   this.endDrawing();
      // }
    }
  }

  handlePointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.activePointerId) {
      return;
    }
    // passive:false であれば preventDefault 可能だが、スクロールなどを妨げる可能性も考慮
    // e.preventDefault(); 

    if (!this.hasMovedSufficiently && this.pointerDownStartCoords) {
      const dx = e.clientX - this.pointerDownStartCoords.x;
      const dy = e.clientY - this.pointerDownStartCoords.y;
      if (Math.hypot(dx, dy) >= this.config.minSwipeDistance) {
        this.hasMovedSufficiently = true;
        console.log('[DEBUG handlePointerMove] Sufficiently moved, drag confirmed.');
      }
    }

    if (this.hasMovedSufficiently) {
      const elementBelowPointer = document.elementFromPoint(e.clientX, e.clientY);
      const dotOver = elementBelowPointer ? elementBelowPointer.closest('.dot[data-value]') : null;

      if (dotOver) {
        if (!this.detectedDots.has(dotOver)) {
          console.log('[DEBUG handlePointerMove] New dot detected:', dotOver.dataset.value, '. Adding it.');
          this.addDot(dotOver);
        }
      }
      this.drawLine(e.clientX, e.clientY);
    }
  }

  handlePointerUp(e) {
    if (e.pointerId !== this.activePointerId) {
      return;
    }
    if (this.container.hasPointerCapture && this.container.hasPointerCapture(e.pointerId)) {
        try { this.container.releasePointerCapture(e.pointerId); } catch(err) { console.warn("releasePointerCapture failed:", err); }
    }
    console.log('[DEBUG handlePointerUp] Fired. isDrawing:', this.isDrawing, 'hasMovedSufficiently:', this.hasMovedSufficiently);

    if (this.isDrawing) { // 十分に動いたか、あるいは少なくとも1ドットで開始していれば描画終了処理
        this.endDrawing();
    }
    
    // 状態のリセット (isDrawing が false でも activePointerId などはリセットが必要)
    this.isDrawing = false; // endDrawing内でfalseになるが、念のため
    this.hasMovedSufficiently = false;
    this.activePointerId = null;
    this.pointerDownStartCoords = null;
  }

  startDrawing(dotElement, clientX, clientY) {
    this.isDrawing = true;
    this.hasMovedSufficiently = false; // startDrawing時はまだ「十分に動いた」とは言えない
                                     // ただし、最初のドットを追加するので、実質的に操作は開始されている
    this.detectedDots.clear();
    this.totalValue = 1;
    this.lastPoint = null;
    this.clearCanvas();

    console.log('[DEBUG startDrawing] Adding first dot:', dotElement.dataset.value);
    this.addDot(dotElement);
    
    // 最初のドットに触れた時点でライブ線を開始する場合は drawLine を呼ぶ
    // (タップだけでも線がポインタに追従するようになる)
    this.drawLine(clientX, clientY);
  }

  addDot(dotElement) {
    if (this.detectedDots.has(dotElement)) {
        console.log('[DEBUG addDot] Dot already detected, skipping:', dotElement.dataset.value);
        return;
    }
    dotElement.classList.add('active');
    this.detectedDots.add(dotElement);

    const value = parseInt(dotElement.dataset.value);
    if (!isNaN(value)) {
      this.totalValue *= value;
      console.log('[DEBUG addDot] Dot value:', value, 'New totalValue:', this.totalValue);
    }

    const rect = dotElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentDotCenter = this.getRelativePoint(centerX, centerY);

    if (this.lastPoint) {
      const currentColorName = window.uiManager.editor.currentColor;
      const strokeColor = CONSTANTS.EDITOR_COLORS[currentColorName] || CONSTANTS.EDITOR_COLORS.blue;
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
      this.ctx.lineTo(currentDotCenter.x, currentDotCenter.y);
      this.ctx.stroke();
      console.log('[DEBUG addDot] Drawn line from', JSON.stringify(this.lastPoint), 'to', JSON.stringify(currentDotCenter));
    }
    this.lastPoint = currentDotCenter;
  }

  drawLine(clientX, clientY) {
    if (!this.lastPoint && !this.isDrawing) { // 描画開始前、またはlastPointがない場合は描画しない
        // isDrawing が true でも、最初の addDot で lastPoint が設定されるまでは描画できない
        if(this.detectedDots.size === 0 && this.isDrawing) {
             // 最初のドットに触れたが、まだlastPointが確定していない状態。
             // startDrawing -> addDot(firstDot) で lastPoint が設定され、その後 drawLine が呼ばれるので、
             // この分岐は実質的に不要かもしれない。
        } else if (!this.lastPoint) {
            return;
        }
    }
    
    const currentPointerCanvasXY = this.getRelativePoint(clientX, clientY);

    this.clearCanvas();
    this.redrawAllLines();

    // lastPoint が設定された後（＝少なくとも1つのドットが検出された後）にライブ線を描画
    if (this.lastPoint) {
        const currentColorName = window.uiManager.editor.currentColor;
        const baseColor = CONSTANTS.EDITOR_COLORS[currentColorName] || CONSTANTS.EDITOR_COLORS.blue;
        const liveLineColor = baseColor + '80';

        this.ctx.strokeStyle = liveLineColor;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        this.ctx.lineTo(currentPointerCanvasXY.x, currentPointerCanvasXY.y);
        this.ctx.stroke();
    }
  }

  redrawAllLines() {
    const dotsArray = Array.from(this.detectedDots);
    if (dotsArray.length === 0) return; // ドットがなければ何もしない

    const currentColorName = window.uiManager.editor.currentColor;
    const strokeColor = CONSTANTS.EDITOR_COLORS[currentColorName] || CONSTANTS.EDITOR_COLORS.blue;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    
    let prevDotCenter = null;

    for (let i = 0; i < dotsArray.length; i++) {
        const dotElement = dotsArray[i];
        const rect = dotElement.getBoundingClientRect();
        const currentDotCenter = this.getRelativePoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
        );

        if (i === 0) {
            // 描画パスの開始点を設定するだけ
        } else if (prevDotCenter) { // 2つ目以降のドットで、前のドットの中心がある場合
            this.ctx.beginPath(); // 各セグメントを独立したパスとして描画
            this.ctx.moveTo(prevDotCenter.x, prevDotCenter.y);
            this.ctx.lineTo(currentDotCenter.x, currentDotCenter.y);
            this.ctx.stroke();
        }
        prevDotCenter = currentDotCenter;
    }
    if (dotsArray.length > 1) {
      console.log('[DEBUG redrawAllLines] Redrawn', dotsArray.length -1 , 'segments.');
    }
  }

  endDrawing() {
    console.log('[DEBUG endDrawing] Called. totalValue:', this.totalValue, 'Detected dots count:', this.detectedDots.size);
    // this.isDrawing は handlePointerUp で false にするので、ここでは不要かも
    // this.hasMovedSufficiently も同様

    if (this.strokeTimeout) {
      clearTimeout(this.strokeTimeout);
      this.strokeTimeout = null; // クリアした後はnullにする
    }

    if (this.detectedDots.size > 0 && this.totalValue > 1) {
        const character = CONSTANTS.LETTER_PATTERNS[this.totalValue];
        if (character) {
            console.log('[DEBUG endDrawing] Recognized:', character);
            window.uiManager.insertText(character);
            this.showFeedback(character);
        } else {
            console.log('[DEBUG endDrawing] No character for totalValue:', this.totalValue);
        }
    } else if (this.detectedDots.size === 1 && this.totalValue > 1) {
        // 1ドットのみタップされた場合も、そのドットの数字を LETTER_PATTERNS から引く
        const character = CONSTANTS.LETTER_PATTERNS[this.totalValue];
        if (character) {
            console.log('[DEBUG endDrawing] Recognized single tap:', character);
            window.uiManager.insertText(character);
            this.showFeedback(character);
        } else {
            console.log('[DEBUG endDrawing] No character for single tap totalValue:', this.totalValue);
        }
    } else {
        console.log('[DEBUG endDrawing] Not enough dots or totalValue too small to recognize.');
    }
    
    // 状態リセット
    const dotsToClear = new Set(this.detectedDots);
    this.detectedDots.clear();
    dotsToClear.forEach(dot => dot.classList.remove('active'));
    this.totalValue = 1;
    this.lastPoint = null; 
    this.isDrawing = false; // 描画終了
    this.hasMovedSufficiently = false; // リセット
    // activePointerId は handlePointerUp で null になっているはず

    this.clearCanvas();
    console.log('[DEBUG endDrawing] State reset, canvas cleared.');
  }

  showFeedback(character) {
    if (!this.container) return;
    const feedback = document.createElement('div');
    feedback.className = 'recognition-feedback';
    feedback.textContent = character;
    this.container.appendChild(feedback);
    setTimeout(() => { if(feedback.parentNode) feedback.remove(); }, 800);
  }

  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getRelativePoint(clientX, clientY) {
    if (!this.container) return { x: clientX, y: clientY }; // コンテナがない場合のフォールバック
    const rect = this.container.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
}