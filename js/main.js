// main.js
// コメント部分を修正（importする場合の例）
// e.g., import { initKeypad } from './d2d-input.js';
// import { initRichTextEditor } from './txt-input.js';

const handleSpecialButtonClick = (e, type, actions) => { //
  // Needs specialButtonState
  if (e && e.preventDefault) e.preventDefault();
  const now = Date.now();
  if (specialButtonState.clickTarget === type && now - specialButtonState.lastClickTime < specialButtonState.doubleClickDelay) {
    clearTimeout(specialButtonState.clickTimer);
    specialButtonState.clickCount = 0;
    specialButtonState.clickTarget = null;
    specialButtonState.clickTimer = null;
    if (actions.double) {
      actions.double();
      if (e.target) {
        e.target.classList.add('double-clicked');
        setTimeout(() => e.target.classList.remove('double-clicked'), 200);
      }
    }
  } else {
    specialButtonState.clickCount = 1;
    specialButtonState.lastClickTime = now;
    specialButtonState.clickTarget = type;
    clearTimeout(specialButtonState.clickTimer);
    specialButtonState.clickTimer = setTimeout(() => {
      if (specialButtonState.clickCount === 1 && specialButtonState.clickTarget === type) {
        if (actions.single) {
          actions.single();
          if (e.target) {
            e.target.classList.add('clicked');
            setTimeout(() => e.target.classList.remove('clicked'), 200);
          }
        }
      }
      specialButtonState.clickCount = 0;
      specialButtonState.clickTarget = null;
      specialButtonState.clickTimer = null;
    }, specialButtonState.doubleClickDelay);
  }
};

const setupSpecialButtonListeners = () => { //
  // Needs elements, handleSpecialButtonClick, handleDeleteAction (from textEditor.js), insertAtCursor (from textEditor.js), insertNewline (from textEditor.js)
  const deleteBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="delete"]') : null;
  const spaceBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="space"]') : null;

  if (deleteBtn) {
    deleteBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'delete', {
      single: () => handleDeleteAction(false),
      double: () => handleDeleteAction(true)
    }));
    deleteBtn.addEventListener('pointerdown', e => e.preventDefault());
  }
  if (spaceBtn) {
    spaceBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'space', {
      single: () => insertAtCursor(' '),
      double: () => insertNewline()
    }));
    spaceBtn.addEventListener('pointerdown', e => e.preventDefault());
  }
};

const setupExecuteButtonListener = () => { //
  // Needs elements, executeCode (from textEditor.js)
  if (elements.executeButton) {
    elements.executeButton.addEventListener('click', executeCode);
  }
};

const setupClearButtonListener = () => { //
  // Needs elements, clearInput (from textEditor.js)
  if (elements.clearButton) {
    elements.clearButton.addEventListener('click', clearInput);
  }
};

const setupKeyboardHandlers = () => { //
  // Needs elements, handleDeleteAction (from textEditor.js), insertAtCursor (from textEditor.js), executeCode (from textEditor.js)
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
      if (e.shiftKey) executeCode();
      else insertAtCursor('\n'); // Or insertNewline() if preferred for global enter
    }
  });
};

const setupGestureListeners = () => { //
  // Needs handlePointerMove, handlePointerUp (from d2dInput.js)
  document.addEventListener('pointermove', handlePointerMove, { passive: false });
  document.addEventListener('pointerup', handlePointerUp, { passive: false });
  document.addEventListener('pointercancel', handlePointerUp, { passive: false });
};

const setupMultiTouchSupport = () => { //
  // Needs isMobileDevice, elements
  if (isMobileDevice() && elements.d2dArea) {
    elements.d2dArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== elements.input) {
        document.activeElement.blur();
      }
    }, { passive: false });
    elements.d2dArea.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    elements.d2dArea.addEventListener('focusin', (e) => { //
        e.preventDefault(); //
        if (elements.d2dArea) { //
            elements.d2dArea.blur(); //
        }
    }, {passive: false}); //
  }
};


const addColorButtonStyles = () => { //
  const styleElem = document.createElement('style');
  styleElem.textContent = `
    #color-cyan, #color-cyan.active { background-color: #f0faff; color: #4DC4FF; border: 1px solid #b3e5fc; }
    #color-cyan.active { background-color: #b3e5fc; }
    #clear-button { background-color: #cccccc; }
    #clear-button:hover { background-color: #D49000; }
    #clear-button:active { background-color: #B37800; }
    #execute-button { background-color: #cccccc; }
    #execute-button:hover { background-color: #3AA7E2; }
    #execute-button:active { background-color: #2A8AC0; }
    #d2d-input { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; outline: none; touch-action: none; }
  `; //
  document.head.appendChild(styleElem);
};

const initResponsiveLayout = () => { //
  // Needs resizeCanvas (from d2dInput.js), isMobileDevice, elements, showTextSection, showOutputSection, focusWithoutKeyboard, focusOnInput
  const checkLayout = () => {
    resizeCanvas();
    if (isMobileDevice()) {
      if (elements.textSection && elements.outputSection) {
        elements.outputSection.classList.add('hide');
        elements.textSection.classList.remove('hide');
      }
      const preventKeyboard = () => {
        if (elements.d2dArea) {
          elements.d2dArea.addEventListener('touchstart', (e) => {
            if (document.activeElement && document.activeElement !== elements.input) {
              document.activeElement.blur();
            }
            e.preventDefault();
          }, { passive: false, capture: true });
          ['touchstart', 'mousedown', 'pointerdown', 'MSPointerDown'].forEach(eventType => {
            elements.d2dArea.addEventListener(eventType, (e) => {
              if (e.target !== elements.input) {
                e.preventDefault();
                if (document.activeElement) document.activeElement.blur();
              }
            }, { passive: false, capture: true });
          });
          elements.d2dArea.addEventListener('focus', () => { //
            if (elements.d2dArea) elements.d2dArea.blur(); //
          }, false); //
        }
      };
      preventKeyboard();
    } else {
      if (elements.outputSection) elements.outputSection.classList.remove('hide');
      if (elements.textSection) elements.textSection.classList.remove('hide');
    }
    if (isMobileDevice()) {
      focusWithoutKeyboard(elements.input);
    } else {
      focusOnInput();
    }
  };
  window.addEventListener('resize', checkLayout);
  window.addEventListener('orientationchange', checkLayout);
  checkLayout();
};

window.addEventListener('DOMContentLoaded', () => { //
  // Initialize elements object
  elements.dotGrid = document.getElementById('dot-grid');
  elements.specialRow = document.getElementById('special-row');
  elements.lineCanvas = document.getElementById('line-canvas');
  elements.input = document.getElementById('txt-input');
  elements.d2dArea = document.getElementById('d2d-input');
  elements.output = document.getElementById('output');
  elements.executeButton = document.getElementById('execute-button');
  elements.clearButton = document.getElementById('clear-button');
  elements.outputSection = document.getElementById('output-section');
  elements.textSection = document.getElementById('text-section');

  console.log("DOM Content Loaded");
  console.log("d2d-input element:", elements.d2dArea); //

  if (elements.d2dArea) {
    console.log("Initializing d2d-input"); //
    elements.d2dArea.setAttribute('tabindex', '-1'); //
    elements.d2dArea.setAttribute('aria-hidden', 'true'); //
    elements.d2dArea.setAttribute('unselectable', 'on'); //
    elements.d2dArea.setAttribute('onselectstart', 'return false;'); //
    elements.d2dArea.setAttribute('onmousedown', 'return false;'); //
    if (isMobileDevice()) { // Needs isMobileDevice
      elements.d2dArea.setAttribute('inputmode', 'none'); //
      elements.d2dArea.addEventListener('focus', () => { //
        if (elements.d2dArea) elements.d2dArea.blur(); //
      }, false);
    }
    addColorButtonStyles(); // Add styles first
    initKeypad(); // Needs initKeypad (from d2dInput.js)
    // resizeCanvas is called within initKeypad and initResponsiveLayout
  } else {
    console.error("d2d-input element not found!"); //
  }

  initResponsiveLayout();
  setupExecuteButtonListener();
  setupClearButtonListener();
  setupKeyboardHandlers();
  initRichTextEditor(); // Needs initRichTextEditor (from textEditor.js)
  setupGestureListeners(); // Global gesture listeners
  setupMultiTouchSupport(); // For d2d area specifically
});