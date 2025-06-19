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
  groupProducts: [1, 1, 1, 1], // 4グループの積
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
  currentLineColor: null,
  // パフォーマンス改善用
  dotPositionCache: new Map(), // ドットID -> {x, y, element}
  spatialIndex: null,          // 空間インデックス
  canvasContext: null,         // キャッシュされたコンテキスト
  lineSegments: []             // 描画済みの線分
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

// 空間インデックスのヘルパー関数
const spatialIndexHelpers = {
  gridSize: 50, // ピクセル単位のグリッドサイズ
  
  getGridKey: (x, y) => {
    const gx = Math.floor(x / spatialIndexHelpers.gridSize);
    const gy = Math.floor(y / spatialIndexHelpers.gridSize);
    return `${gx},${gy}`;
  },
  
  getNearbyGridKeys: (x, y, radius) => {
    const keys = [];
    const gridRadius = Math.ceil(radius / spatialIndexHelpers.gridSize);
    const centerGx = Math.floor(x / spatialIndexHelpers.gridSize);
    const centerGy = Math.floor(y / spatialIndexHelpers.gridSize);
    
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        keys.push(`${centerGx + dx},${centerGy + dy}`);
      }
    }
    return keys;
  }
};