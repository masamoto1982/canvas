const elements = {
  dotGrid: null,
  specialRow: null,
  lineCanvas: null,
  input: null,
  d2dArea: null,
  output: null,
  executeButton: null,
  clearButton: null,
  outputSection: null,
  textSection: null
};
const drawState = {
  isActive: false,
  detectedDots: new Set(),
  detectedDotsList: [],
  visitedNumbers: new Set(), // なぞったドット番号
  strokeCount: 0, // 新規追加：ストローク数
  previousDotNumber: null, // 新規追加：前のドット番号（ストローク検出用）
  totalValue: 1, // 互換性のため残す
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