// js/state.js
const elements = {
  dotGrid: null,
  specialRow: null,
  lineCanvas: null,
  input: null,
  d2dInput: null,  // d2dArea から d2dInput に変更
  output: null,
  executeButton: null,
  clearButton: null,
  outputSection: null,
  textSection: null
};

// 以下、drawState, specialButtonState, keyState は変更なし
const drawState = {
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
const specialButtonState = {
  lastClickTime: 0,
  clickCount: 0,
  clickTarget: null,
  clickTimer: null,
  doubleClickDelay: CONFIG.timing.doubleTapDelay
};
const keyState = {
  deletePressed: false,
  spacePressed: false,
  lastPressTime: 0,
  maxTimeDiff: 300
};