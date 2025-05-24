// アプリケーションのエントリーポイント
document.addEventListener('DOMContentLoaded', () => {
  // UIマネージャーのインスタンスを作成
  window.uiManager = new UIManager();
  
  // デバッグモード（開発時のみ）
  if (window.location.hostname === 'localhost') {
    window.canvas = {
      uiManager: window.uiManager,
      language: window.uiManager.language,
      editor: window.uiManager.editor,
      d2d: window.uiManager.d2dInput
    };
    console.log('Canvas Language initialized. Debug object available as window.canvas');
  }
});