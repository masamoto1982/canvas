// UI全体の管理
class UIManager {
  constructor() {
    this.model = new CanvasDataModel();
    this.language = new CanvasLanguage();
    this.textInput = null;
    this.d2dInput = null;
    this.output = null;
    
    this.isMobile = this.checkMobile();
    
    this.init();
  }
  
  init() {
    // エディターの初期化
    const editorElement = document.getElementById('editor');
    this.textInput = new TextInput(editorElement, this.model);
    
    // D2D入力の初期化
    const d2dContainer = document.getElementById('d2d-container');
    const canvas = document.getElementById('canvas');
    this.d2dInput = new D2DInput(d2dContainer, canvas, this.model, this.textInput);
    
    // 出力の初期化
    const outputElement = document.getElementById('output');
    this.output = new OutputDisplay(outputElement);
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // モバイル対応
    if (this.isMobile) {
      this.setupMobileUI();
    }
    
    // 初期フォーカス（デスクトップのみ）
    if (!this.isMobile) {
      this.textInput.focus();
    }
  }
  
  setupEventListeners() {
    // 実行ボタン
    document.getElementById('execute-btn').addEventListener('click', () => {
      this.executeCode();
    });
    
    // クリアボタン
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearAll();
    });
    
    // ウィンドウリサイズ
    window.addEventListener('resize', () => {
      this.isMobile = this.checkMobile();
    });
  }
  
  executeCode() {
    // 実行中表示
    this.output.showExecuting();
    
    // コードを取得
    const code = this.model.toPlainText();
    
    // 実行
    setTimeout(() => {
      const result = this.language.execute(code);
      
      if (result.success) {
        this.output.showResult(result.result);
      } else {
        this.output.showResult(result.result, true);
      }
      
      // モバイルでは出力セクションを表示
      if (this.isMobile) {
        this.showOutputSection();
      }
    }, 100);
  }
  
  clearAll() {
    // モデルをクリア
    this.model.clear();
    this.textInput.render();
    
    // 言語環境をリセット
    this.language.reset();
    
    // 出力をクリア
    this.output.clear();
    
    // モバイルではエディターセクションを表示
    if (this.isMobile) {
      this.showEditorSection();
    }
  }
  
  checkMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }
  
  setupMobileUI() {
    // モバイル用の追加設定
    const outputSection = document.querySelector('.output-section');
    outputSection.style.display = 'none';
  }
  
  showOutputSection() {
    const editorSection = document.querySelector('.editor-section');
    const outputSection = document.querySelector('.output-section');
    
    editorSection.classList.add('hidden');
    outputSection.style.display = 'flex';
    outputSection.classList.add('active');
  }
  
  showEditorSection() {
    const editorSection = document.querySelector('.editor-section');
    const outputSection = document.querySelector('.output-section');
    
    editorSection.classList.remove('hidden');
    outputSection.style.display = 'none';
    outputSection.classList.remove('active');
  }
  
  // デバッグ用メソッド
  debug() {
    console.log('=== Canvas Language Debug Info ===');
    console.log('Model:', this.model.debug());
    console.log('Language Environment:', this.language.getDebugInfo());
    console.log('Current Type:', this.textInput.getCurrentType());
    console.log('Is Mobile:', this.isMobile);
  }
}

// グローバルに公開
window.UIManager = UIManager;