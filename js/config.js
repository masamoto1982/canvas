// アプリケーションの設定と状態
export const CONFIG = {
    sensitivity: {
        hitRadius: 15,
        minSwipeDistance: 5,
        debounceTime: 50
    },
    timing: {
        multiStrokeTimeout: 500,
        doubleTapDelay: 300
    },
    layout: {
        dotSize: 40,
        dotGap: 20,
        gridRows: 5,
        gridCols: 5
    },
    visual: {
        detectedColor: '#fca5a5',
        feedbackSize: 120,
        feedbackTextSize: 60
    },
    behavior: {
        autoFocus: true,
    },
    recognition: {
        tolerance: 1
    }
};

// DOM要素の参照
export const elements = {
    get dotGrid() { return document.getElementById('dot-grid'); },
    get specialRow() { return document.getElementById('special-row'); },
    get lineCanvas() { return document.getElementById('line-canvas'); },
    get input() { return document.getElementById('txt-input'); },
    get d2dArea() { return document.getElementById('d2d-input'); },
    get output() { return document.getElementById('output'); },
    get executeButton() { return document.getElementById('execute-button'); },
    get clearButton() { return document.getElementById('clear-button'); },
    get outputSection() { return document.getElementById('output-section'); },
    get textSection() { return document.getElementById('text-section'); }
};

// アプリケーションの状態
export const appState = {
    drawState: {
        isActive: false,
        detectedDots: new Set(),
        totalValue: 0,
        startX: 0,
        startY: 0,
        lastStrokeTime: 0,
        lastDetectionTime: 0,
        currentStrokeDetected: false,
        strokeTimer: null,
        currentTouchId: null,
        pointerStartTime: 0,
        pointerStartX: 0,
        pointerStartY: 0,
        hasMoved: false,
        isDrawingMode: false,
        tapCheckTimer: null
    },
    specialButtonState: {
        lastClickTime: 0,
        clickCount: 0,
        clickTarget: null,
        clickTimer: null,
        doubleClickDelay: 300
    },
    editorState: {
        currentColor: 'black'
    }
};

// ユーティリティ関数
export const isMobileDevice = () => {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /Mobi|Android/i.test(navigator.userAgent);
};

export const focusOnInput = () => {
    if (elements.input) {
        elements.input.focus();
    }
};

export const showTextSection = () => {
    if (isMobileDevice() && elements.textSection && elements.outputSection) {
        elements.outputSection.classList.add('hide');
        elements.textSection.classList.remove('hide');
        focusOnInput();
    }
};

export const showOutputSection = () => {
    if (isMobileDevice() && elements.textSection && elements.outputSection) {
        elements.textSection.classList.add('hide');
        elements.outputSection.classList.remove('hide');
    }
};

// キャンバス関連
export const clearCanvas = () => {
    const lineCtx = elements.lineCanvas ? elements.lineCanvas.getContext('2d') : null;
    if (lineCtx && elements.lineCanvas) {
        lineCtx.clearRect(0, 0, elements.lineCanvas.width, elements.lineCanvas.height);
    }
};

export const resizeCanvas = () => {
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