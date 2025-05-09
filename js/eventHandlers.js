import { CONFIG, elements, appState, resizeCanvas, clearCanvas, focusOnInput, showTextSection, isMobileDevice, showOutputSection } from './config.js';
import { interpreter } from './interpreter.js';
import { initDotGrid, addDetectedDot, detectDot, resetDrawState, endDrawing, startDrawing } from './dotGrid.js';
import { initRichTextEditor, insertAtCursor, clearInput, handleDeleteAction } from './textEditor.js';

// コード実行関数 - 循環参照を避ける
export const executeCode = () => {
    const editor = elements.input;
    const output = elements.output;
    
    if (!editor || !output) return;
    
    const code = editor.innerText || '';
    
    if (!code.trim()) return;
    
    try {
        // インタープリタを使用してコードを実行
        const result = interpreter.execute(code);
        
        if (typeof result === 'string' && result.startsWith("エラー:")) {
            output.value = result;
        } else {
            output.value = result !== undefined ? String(result) : "実行完了";
            output.classList.add('executed');
            setTimeout(() => output.classList.remove('executed'), 300);
            
            // 実行成功したら入力をクリア
            editor.innerHTML = '';
        }
        
        showOutputSection();
    } catch (err) {
        output.value = `致命的なエラー: ${err.message}`;
        showOutputSection();
    }
    
    focusOnInput();
};

// アプリケーションの初期化
export const initApp = () => {
    console.log("Initializing app...");
    
    // ドットグリッドの初期化
    initDotGrid();
    
    // キャンバスのリサイズ
    resizeCanvas();
    
    // レスポンシブレイアウトの設定
    initResponsiveLayout();
    
    // テキストエディターの初期化
    initRichTextEditor();
    
    // キーボードイベントハンドラの設定
    setupKeyboardHandlers();
    
    // ジェスチャーイベントリスナーの設定
    setupGestureListeners();
    
    // ボタンイベントの設定
    setupButtonEvents();
    
    // 初期フォーカス
    focusOnInput();
    
    console.log("App initialization complete");
};

// レスポンシブレイアウトの初期化
const initResponsiveLayout = () => {
    const checkLayout = () => {
        resizeCanvas();
        if (isMobileDevice()) {
            if (elements.outputSection && elements.textSection) {
                elements.outputSection.classList.add('hide');
                elements.textSection.classList.remove('hide');
            }
        } else {
            if (elements.outputSection) elements.outputSection.classList.remove('hide');
            if (elements.textSection) elements.textSection.classList.remove('hide');
        }
        focusOnInput();
    };
    
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    checkLayout();
};

// 特殊ボタンクリック処理
const handleSpecialButtonClick = (e, type, actions) => {
    const specialButtonState = appState.specialButtonState;
    
    if (e && e.preventDefault) e.preventDefault();
    const now = Date.now();
    
    // ダブルクリック検出
    if (specialButtonState.clickTarget === type &&
        now - specialButtonState.lastClickTime < specialButtonState.doubleClickDelay) {
        clearTimeout(specialButtonState.clickTimer);
        specialButtonState.clickCount = 0;
        specialButtonState.clickTarget = null;
        specialButtonState.clickTimer = null;
        if (actions.double) actions.double();
    } else {
        // シングルクリック処理
        specialButtonState.clickCount = 1;
        specialButtonState.lastClickTime = now;
        specialButtonState.clickTarget = type;
        clearTimeout(specialButtonState.clickTimer);
        specialButtonState.clickTimer = setTimeout(() => {
            if (specialButtonState.clickCount === 1 && specialButtonState.clickTarget === type) {
                if (actions.single) actions.single();
            }
            specialButtonState.clickCount = 0;
            specialButtonState.clickTarget = null;
            specialButtonState.clickTimer = null;
        }, specialButtonState.doubleClickDelay);
    }
};

// ポインターダウン処理
const handlePointerDown = (e, el) => {
    const drawState = appState.drawState;
    
    if (!e || !el) return;
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
    } catch (err) {
        console.log("Pointer capture not supported or failed:", err);
    }

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
        startDrawing(el, e.clientX, e.clientY);
    } else {
        resetDrawState();
        clearCanvas();
    }
};

// ポインタームーブ処理
const handlePointerMove = (e) => {
    const drawState = appState.drawState;
    
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
        
        if (drawState.isDrawingMode) {
            detectDot(e.clientX, e.clientY);
        }
    }
};

// ポインターアップ処理
const handlePointerUp = (e) => {
    const drawState = appState.drawState;
    
    if (e.pointerId !== drawState.currentTouchId) return;
    
    try {
        const el = e.target;
        if (el && el.releasePointerCapture && el.hasPointerCapture(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
    } catch (err) {
        console.log("Error releasing pointer capture:", err);
    }
    
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
    focusOnInput();
};

// キーボードハンドラーの設定
const setupKeyboardHandlers = () => {
    document.addEventListener('keydown', (e) => {
        if (e.target === elements.input || e.target === elements.output) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handleDeleteAction(e.ctrlKey || e.metaKey);
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            insertAtCursor(' ');
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if(e.shiftKey) {
                executeCode();
            } else {
                insertAtCursor('\n');
            }
        }
    });
};

// ドットイベントリスナーの設定
const setupDotEventListeners = () => {
    if (!elements.d2dArea) {
        console.warn("d2d-area element not found");
        return;
    }
    elements.d2dArea.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('dot')) {
            handlePointerDown(e, e.target);
        }
    }, { passive: false });
};

// マルチタッチサポートの設定
const setupMultiTouchSupport = () => {
    if (isMobileDevice() && elements.d2dArea) {
        elements.d2dArea.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        elements.d2dArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }
};

// ジェスチャーリスナーの設定
const setupGestureListeners = () => {
    // ドットのイベントリスナーを設定
    setupDotEventListeners();
    
    // マルチタッチサポートを設定
    setupMultiTouchSupport();
    
    // ジェスチャーリスナーを設定
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
};

// 特殊ボタンリスナーの設定
const setupSpecialButtonListeners = () => {
    const deleteBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="delete"]') : null;

    if (deleteBtn) {
        // 削除ボタンの処理
        deleteBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'delete', {
            single: () => handleDeleteAction(false),
            double: () => handleDeleteAction(true)
        }));
        deleteBtn.addEventListener('pointerdown', e => e.preventDefault());
    }
};

// 実行ボタンリスナーの設定
const setupExecuteButtonListener = () => {
    if (elements.executeButton) {
        console.log("Setting up execute button listener");
        elements.executeButton.addEventListener('click', executeCode);
    } else {
        console.warn("Execute button not found");
    }
};

// クリアボタンリスナーの設定
const setupClearButtonListener = () => {
    if (elements.clearButton) {
        console.log("Setting up clear button listener");
        elements.clearButton.addEventListener('click', clearInput);
    } else {
        console.warn("Clear button not found");
    }
};

// ボタンイベントの設定
const setupButtonEvents = () => {
    // 特殊ボタンリスナー
    setupSpecialButtonListeners();
    
    // 実行ボタン
    setupExecuteButtonListener();
    
    // クリアボタン
    setupClearButtonListener();
};