// アプリケーションのエントリーポイント
(() => {
  let uiManager = null;
  
  // DOMContentLoadedイベント
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Canvas Language IDE initializing...');
    
    try {
      // UIマネージャーの初期化
      uiManager = new UIManager();
      
      // グローバルに公開（デバッグ用）
      window.canvasLang = {
        ui: uiManager,
        model: uiManager.model,
        language: uiManager.language,
        debug: () => uiManager.debug()
      };
      
      console.log('Canvas Language IDE initialized successfully');
      console.log('Debug interface available as window.canvasLang');
      
      // サンプルコードを表示（オプション）
      if (window.location.hash === '#demo') {
        loadDemoCode();
      }
      
    } catch (error) {
      console.error('Failed to initialize Canvas Language IDE:', error);
      showInitError(error);
    }
  });
  
  // デモコードを読み込む
  function loadDemoCode() {
    if (!uiManager) return;
    
    // サンプルコード（型付き）
    const demoCode = [
      'symbol:= variable:X number:5',
      'symbol:= variable:Y number:3',
      'symbol:+ variable:X variable:Y'
    ].join(' ');
    
    uiManager.textInput.render();
   
   console.log('Demo code loaded');
 }
 
 // 初期化エラーを表示
 function showInitError(error) {
   const container = document.querySelector('.container');
   if (!container) return;
   
   const errorDiv = document.createElement('div');
   errorDiv.style.cssText = `
     position: fixed;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     background: #e74c3c;
     color: white;
     padding: 20px;
     border-radius: 8px;
     font-size: 16px;
     max-width: 80%;
     text-align: center;
     box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
   `;
   
   errorDiv.innerHTML = `
     <h3 style="margin: 0 0 10px 0;">初期化エラー</h3>
     <p style="margin: 0;">${error.message}</p>
     <button onclick="location.reload()" style="
       margin-top: 15px;
       padding: 8px 16px;
       border: none;
       background: white;
       color: #e74c3c;
       border-radius: 4px;
       cursor: pointer;
       font-size: 14px;
     ">再読み込み</button>
   `;
   
   container.appendChild(errorDiv);
 }
 
 // サービスワーカーの登録（PWA対応）
 if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
   navigator.serviceWorker.register('/sw.js').catch(err => {
     console.warn('Service Worker registration failed:', err);
   });
 }
 
 // パフォーマンス監視
 if (window.performance && window.performance.mark) {
   window.performance.mark('canvasLangLoaded');
   
   window.addEventListener('load', () => {
     window.performance.mark('canvasLangReady');
     window.performance.measure('canvasLangInitTime', 'canvasLangLoaded', 'canvasLangReady');
     
     const measure = window.performance.getEntriesByName('canvasLangInitTime')[0];
     if (measure) {
       console.log(`Canvas Language IDE ready in ${measure.duration.toFixed(2)}ms`);
     }
   });
 }
 
 // キーボードショートカット
 document.addEventListener('keydown', (e) => {
   if (!uiManager) return;
   
   // Ctrl/Cmd + Enter で実行
   if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
     e.preventDefault();
     document.getElementById('execute-btn').click();
     return;
   }
   
   // Ctrl/Cmd + L でクリア
   if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
     e.preventDefault();
     document.getElementById('clear-btn').click();
     return;
   }
   
   // Ctrl/Cmd + D でデバッグ情報
   if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
     e.preventDefault();
     uiManager.debug();
     return;
   }
 });
 
 // ビジビリティ変更の処理
 document.addEventListener('visibilitychange', () => {
   if (!uiManager) return;
   
   if (document.hidden) {
     // アプリがバックグラウンドになった
     console.log('Canvas Language IDE went to background');
   } else {
     // アプリがフォアグラウンドに戻った
     console.log('Canvas Language IDE returned to foreground');
     
     // モバイルでキャンバスをリサイズ
     if (uiManager.d2dInput && uiManager.isMobile) {
       uiManager.d2dInput.resizeCanvas();
     }
   }
 });
 
 // エラーハンドリング
 window.addEventListener('error', (event) => {
   console.error('Global error:', event.error);
   
   // 開発環境でのみスタックトレースを表示
   if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
     console.error('Stack trace:', event.error?.stack);
   }
 });
 
 // 未処理のPromiseリジェクション
 window.addEventListener('unhandledrejection', (event) => {
   console.error('Unhandled promise rejection:', event.reason);
   
   // 重大なエラーの場合はユーザーに通知
   if (event.reason && event.reason.message && event.reason.message.includes('Canvas')) {
     console.error('Canvas-related error detected');
   }
 });
 
 // タッチデバイスの検出と最適化
 const isTouchDevice = () => {
   return 'ontouchstart' in window || 
          navigator.maxTouchPoints > 0 || 
          navigator.msMaxTouchPoints > 0;
 };
 
 if (isTouchDevice()) {
   document.documentElement.classList.add('touch-device');
   
   // タッチデバイス用の最適化
   document.addEventListener('touchstart', () => {}, { passive: true });
   
   // ダブルタップによるズーム防止
   let lastTouchEnd = 0;
   document.addEventListener('touchend', (e) => {
     const now = Date.now();
     if (now - lastTouchEnd <= 300) {
       e.preventDefault();
     }
     lastTouchEnd = now;
   }, false);
 }
 
 // デベロッパーツール検出（オプション）
 const devtools = { open: false, orientation: null };
 const threshold = 160;
 const emitEvent = (state, orientation) => {
   if (devtools.open !== state || devtools.orientation !== orientation) {
     console.log('DevTools', state ? 'opened' : 'closed', orientation || '');
     devtools.open = state;
     devtools.orientation = orientation;
   }
 };
 
 setInterval(() => {
   if (window.outerWidth - window.innerWidth > threshold || 
       window.outerHeight - window.innerHeight > threshold) {
     emitEvent(true, window.outerWidth - window.innerWidth > threshold ? 'vertical' : 'horizontal');
   } else {
     emitEvent(false, null);
   }
 }, 500);
 
 // Canvas Language IDE のバージョン情報
 console.log('%cCanvas Language IDE v1.0.0', 'color: #3498db; font-size: 16px; font-weight: bold;');
 console.log('%cA visual programming environment with color-based syntax', 'color: #7f8c8d; font-style: italic;');
 console.log('%cFor debugging, use window.canvasLang.debug()', 'color: #27ae60;');
})();