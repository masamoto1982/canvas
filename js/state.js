// state.js

// Potentially export each state object
// export const elements = { ... };
// export const drawState = { ... };
// etc.

const elements = { //
  dotGrid: null, // Initialized in main.js
  specialRow: null, // Initialized in main.js
  lineCanvas: null, // Initialized in main.js
  input: null, // Initialized in main.js
  d2dArea: null, // Initialized in main.js
  output: null, // Initialized in main.js
  executeButton: null, // Initialized in main.js
  clearButton: null, // Initialized in main.js
  outputSection: null, // Initialized in main.js
  textSection: null // Initialized in main.js
};

const drawState = { //
  isActive: false,
  detectedDots: new Set(),
  detectedDotsList: [],
  totalValue: 1,
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
  tapCheckTimer: null,
  lastDetectedDot: null,
  lastDotX: 0,
  lastDotY: 0,
  currentLineColor: null
};

const specialButtonState = { //
  lastClickTime: 0,
  clickCount: 0,
  clickTarget: null,
  clickTimer: null,
  doubleClickDelay: CONFIG.timing.doubleTapDelay // CONFIG should be defined (e.g. from constants.js)
};

const keyState = { //
  deletePressed: false,
  spacePressed: false,
  lastPressTime: 0,
  maxTimeDiff: 300
};