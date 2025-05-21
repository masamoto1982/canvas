// main.js

// Assuming these functions are defined elsewhere or within this file if not modularized yet:
// - resizeCanvas (expected in d2dInput.js or similar)
// - isMobileDevice (expected in utils.js)
// - elements (global from state.js)
// - addColorButtonStyles (defined here or in utils.js)
// - initKeypad (expected in d2dInput.js)
// - focusWithoutKeyboard, focusOnInput (expected in utils.js)
// - executeCode, clearInput (expected in textEditor.js)
// - handleDeleteAction, insertAtCursor (expected in textEditor.js)
// - handlePointerMove, handlePointerUp (expected in d2dInput.js for gestures)
// - initRichTextEditor (defined in textEditor.js)

const handleSpecialButtonClick = (e, type, actions) => {
  if (e && e.preventDefault) e.preventDefault();
  const now = Date.now();
  if (specialButtonState.clickTarget === type && now - specialButtonState.lastClickTime < specialButtonState.doubleClickDelay) { // specialButtonState from state.js
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

const setupSpecialButtonListeners = () => {
  const deleteBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="delete"]') : null;
  const spaceBtn = elements.specialRow ? elements.specialRow.querySelector('[data-action="space"]') : null;

  if (deleteBtn) {
    deleteBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'delete', {
      single: () => handleDeleteAction(false), // handleDeleteAction from textEditor.js
      double: () => handleDeleteAction(true)  // handleDeleteAction from textEditor.js
    }));
    deleteBtn.addEventListener('pointerdown', e => e.preventDefault());
  }
  if (spaceBtn) {
    spaceBtn.addEventListener('pointerup', e => handleSpecialButtonClick(e, 'space', {
      single: () => insertAtCursor(' '),    // insertAtCursor from textEditor.js
      double: () => insertNewline()       // insertNewline from textEditor.js
    }));
    spaceBtn.addEventListener('pointerdown', e => e.preventDefault());
  }
};

const setupExecuteButtonListener = () => {
  if (elements.executeButton) {
    elements.executeButton.addEventListener('click', executeCode); // executeCode from textEditor.js
  }
};

const setupClearButtonListener = () => {
  if (elements.clearButton) {
    elements.clearButton.addEventListener('click', clearInput); // clearInput from textEditor.js
  }
};

const setupKeyboardHandlers = () => {
  document.addEventListener('keydown', (e) => {
    if (e.target === elements.input || e.target === elements.output) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteAction(e.ctrlKey || e.metaKey); // handleDeleteAction from textEditor.js
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      insertAtCursor(' '); // insertAtCursor from textEditor.js
    }
    // Note: Enter key handling is now primarily within textEditor.js's keydown listener
    // to allow Shift+Enter for execute and Enter for newline.
    // If global Enter key handling outside the editor is still needed, it can be added here,
    // but ensure it doesn't conflict with the editor's specific Enter handling.
    /*
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) executeCode(); // executeCode from textEditor.js
      else insertAtCursor('\n'); // Or insertNewline() from textEditor.js
    }
    */
  });
};

const setupGestureListeners = () => {
  // These should call functions from d2dInput.js
  document.addEventListener('pointermove', handlePointerMove, { passive: false });
  document.addEventListener('pointerup', handlePointerUp, { passive: false });
  document.addEventListener('pointercancel', handlePointerUp, { passive: false });
};

const setupMultiTouchSupport = () => {
  if (isMobileDevice() && elements.d2dArea) {
    elements.d2dArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (document.activeElement && document.activeElement !== elements.input) {
        document.activeElement.blur();
      }
    }, { passive: false }); // Removed capture:true, check if still needed for your use case
    
    elements.d2dArea.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    
    elements.d2dArea.addEventListener('focusin', (e) => {
        e.preventDefault();
        if (elements.d2dArea) {
            elements.d2dArea.blur();
        }
    }, {passive: false});
    
    // Removed other pointer/mouse event listeners here for d2dArea as pointerdown on d2dArea
    // is handled in setupDotEventListeners in d2dInput.js
  }
};


const addColorButtonStyles = () => {
  const styleElem = document.createElement('style');
  styleElem.textContent = `
    #color-cyan, #color-cyan.active { background-color: #f0faff; color: #4DC4FF; border: 1px solid #b3e5fc; }
    #color-cyan.active { background-color: #b3e5fc; }
    #clear-button { background-color: #cccccc; }
    #clear-button:hover { background-color: #D49000; } /* Ensure this color is defined or use a valid one */
    #clear-button:active { background-color: #B37800; } /* Ensure this color is defined or use a valid one */
    #execute-button { background-color: #cccccc; }
    #execute-button:hover { background-color: #3AA7E2; } /* Ensure this color is defined or use a valid one */
    #execute-button:active { background-color: #2A8AC0; } /* Ensure this color is defined or use a valid one */
    #d2d-input { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; outline: none; touch-action: none; }
  `;
  document.head.appendChild(styleElem);
};

const initResponsiveLayout = () => {
  const checkLayout = () => {
    console.log('checkLayout CALLED');
    resizeCanvas(); // Assuming resizeCanvas is defined (e.g., in d2dInput.js)
    if (isMobileDevice()) {
      if (elements.textSection && elements.outputSection) {
        elements.outputSection.classList.add('hide');
        elements.textSection.classList.remove('hide');
      }
      // d2d keyboard prevention is primarily through event handlers on d2dArea
      // and its attributes, further refined in setupMultiTouchSupport.
    } else { // Desktop
      if (elements.outputSection) elements.outputSection.classList.remove('hide');
      if (elements.textSection) elements.textSection.classList.remove('hide');
    }
    
    // --- FOCUS CALLS REMOVED FROM HERE ---
    // Let initRichTextEditor be the sole manager of its initial focus.
    console.log('checkLayout: Initial focus calls previously here are now REMOVED. initRichTextEditor will handle it.');
  };
  window.addEventListener('resize', checkLayout);
  window.addEventListener('orientationchange', checkLayout);
  console.log('initResponsiveLayout: Calling checkLayout for the first time.');
  checkLayout(); // Initial call
};


window.addEventListener('DOMContentLoaded', () => {
  // Initialize elements object from state.js (or define here if state.js is not used that way)
  elements.dotGrid = document.getElementById('dot-grid');
  elements.specialRow = document.getElementById('special-row');
  elements.lineCanvas = document.getElementById('line-canvas');
  elements.input = document.getElementById('txt-input'); // This is the editor
  elements.d2dArea = document.getElementById('d2d-input');
  elements.output = document.getElementById('output');
  elements.executeButton = document.getElementById('execute-button');
  elements.clearButton = document.getElementById('clear-button');
  elements.outputSection = document.getElementById('output-section');
  elements.textSection = document.getElementById('text-section');

  console.log("DOM Content Loaded");
  console.log("d2d-input element:", elements.d2dArea);

  if (elements.d2dArea) {
    console.log("Initializing d2d-input attributes");
    elements.d2dArea.setAttribute('tabindex', '-1');
    elements.d2dArea.setAttribute('aria-hidden', 'true');
    elements.d2dArea.setAttribute('unselectable', 'on');

    if (isMobileDevice()) {
      elements.d2dArea.setAttribute('inputmode', 'none');
    }
    addColorButtonStyles(); 
    initKeypad(); // From d2dInput.js, sets up dots and their listeners
  } else {
    console.error("d2d-input element not found!");
  }

  initResponsiveLayout(); // Sets up layout, visibility. NO LONGER SETS INITIAL FOCUS for txt-input.
  
  // Setup button and global keyboard listeners
  setupExecuteButtonListener(); 
  setupClearButtonListener();   
  setupKeyboardHandlers();    // Global keyboard shortcuts (delete, space outside editor)
  setupGestureListeners();    // Global pointer move/up for d2d gestures
  setupMultiTouchSupport();   // d2d touch handling on mobile (prevent default, blur on focusin)
  setupSpecialButtonListeners(); // For delete/space special buttons in d2d area

  initRichTextEditor(); // NOW THIS IS THE PRIMARY PLACE FOR TXT-INPUT'S INITIAL FOCUS and its event handling
});