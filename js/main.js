// メインエントリーポイント
import { initApp } from './eventHandlers.js';

// ロード完了時にログを表示
console.log("Main script loaded");

// DOMコンテンツロード時にアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing app");
    initApp();
});