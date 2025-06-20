const elements = {
  input: null,
  output: null,
  executeButton: null,
  clearButton: null,
  outputSection: null,
  textSection: null,
  stackContent: null,
  registerContent: null
};

// キー入力の状態管理は残す
const keyState = {
  deletePressed: false,
  spacePressed: false,
  lastPressTime: 0,
  maxTimeDiff: 300
};