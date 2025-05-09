import { elements, appState, focusOnInput, showTextSection, isMobileDevice, showOutputSection } from './config.js';

// 色付きテキストの挿入
export const insertColoredText = (text, color) => {
    const editor = elements.input;
    if (!editor) return;
    
    // エディタにフォーカスを当てる
    editor.focus();
    
    if (text === '\n') {
        // 改行の挿入 - <br>タグを使用
        document.execCommand('insertHTML', false, '<br>');
        // 改行後は黒色に戻す
        appState.editorState.currentColor = 'black';
    } else if (text === ' ') {
        // 空白の挿入 - 現在の色で挿入
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, color);
        document.execCommand('insertText', false, text);
        // 空白後は黒色に戻す
        appState.editorState.currentColor = 'black';
        // キャレット色も更新
        editor.style.caretColor = 'black';
    } else {
        // 通常のテキスト挿入 - 色を適用して挿入
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, color);
        document.execCommand('insertText', false, text);
    }
};

// 色変更の挿入（黒色に戻さないバージョン）
export const insertColorChange = (color) => {
    const editor = elements.input;
    if (!editor) return;
    
    // 色を変更（空白は挿入しない）
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
};

// カーソル位置に文字を挿入
export const insertAtCursor = (text) => {
    const editor = elements.input;
    if (!editor) return;
    
    const currentColor = appState.editorState.currentColor || 'black';
    
    insertColoredText(text, currentColor);
    
    if (isMobileDevice()) showTextSection();
    focusOnInput();
};

// 入力欄をクリア
export const clearInput = () => {
    if (elements.input) {
        elements.input.innerHTML = '';
        // 初期色を黒に設定
        appState.editorState.currentColor = 'black';
        focusOnInput();
    }
};

// 削除処理
export const handleDeleteAction = (deleteToken = false) => {
    const editor = elements.input;
    if (!editor) return;
    
    if (deleteToken) {
        // トークン削除モード
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        // 現在のカーソル位置を取得
        const range = selection.getRangeAt(0);
        const cursorPosition = range.startOffset;
        if (cursorPosition === 0) return;
        
        // テキスト全体を取得
        const fullText = editor.textContent || '';
        
        // トークンの範囲を見つける
        let tokenStart = cursorPosition;
        let foundWord = false;
        
        while (tokenStart > 0) {
            const char = fullText.charAt(tokenStart - 1);
            if (char === ' ' || char === '\n') {
                if (foundWord) break;
            } else {
                foundWord = true;
            }
            tokenStart--;
        }
        
        // 直前の空白も削除
        let spaceStart = tokenStart;
        while (spaceStart > 0) {
            const char = fullText.charAt(spaceStart - 1);
            if (char === ' ' || char === '\n') {
                spaceStart--;
            } else {
                break;
            }
        }
        
        // 削除範囲を選択して削除
        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            
            const range = document.createRange();
            const textNode = editor.firstChild;
            
            if (textNode) {
                range.setStart(textNode, spaceStart);
                range.setEnd(textNode, cursorPosition);
                selection.addRange(range);
                document.execCommand('delete', false);
            }
        } catch (err) {
            // シンプルな削除にフォールバック
            document.execCommand('delete', false);
        }
    } else {
        // 一文字削除
        document.execCommand('delete', false);
    }
    
    focusOnInput();
    if (isMobileDevice()) showTextSection();
};

// リッチテキストエディタの初期化
export const initRichTextEditor = () => {
    const editor = elements.input;
    if (!editor) {
        console.warn("Text editor element not found");
        return;
    }
    
    console.log("Initializing rich text editor");
    
    // 初期色を黒に設定
    appState.editorState.currentColor = 'black';
    
    // 色ボタンの設定（黒ボタンを除外）
    const colorButtons = document.querySelectorAll('.color-btn:not(#color-black)');
    
    editor.style.caretColor = 'black';
    
    const applyColor = (color) => {
        // 色ボタンのアクティブ状態更新
        colorButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
        
        // 新しい色を設定
        appState.editorState.currentColor = color;
        editor.style.caretColor = color;
        insertColorChange(color);
        
        editor.focus();
    };
    
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`Color button clicked: ${btn.dataset.color}`);
            applyColor(btn.dataset.color);
        });
    });
    
    // キー入力ハンドラ
    editor.addEventListener('keydown', (e) => {
        if (e.key.length !== 1 && !['Enter', 'Tab', ' '].includes(e.key)) return;
        
        if (e.ctrlKey || e.metaKey) return;
        
        e.preventDefault();
        
        if (e.key === 'Tab') {
            insertColoredText('    ', appState.editorState.currentColor);
            // タブ後は黒色に戻す
            appState.editorState.currentColor = 'black';
            editor.style.caretColor = 'black';
            return;
        }
        
        const char = e.key === 'Enter' ? '\n' : e.key;
        insertColoredText(char, appState.editorState.currentColor);
        
        // 空白や改行後は黒色に戻す
        if (e.key === ' ' || e.key === 'Enter') {
            appState.editorState.currentColor = 'black';
            editor.style.caretColor = 'black';
            
            // 色ボタンのアクティブ状態をクリア
            colorButtons.forEach(btn => {
                btn.classList.remove('active');
            });
        }
    });
    
    // ペーストハンドラ
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        
        const text = e.clipboardData.getData('text/plain');
        
        // ペーストされたテキストを現在の色で挿入
        insertColoredText(text, appState.editorState.currentColor);
        
        // 空白を含む場合は黒色に戻す
        if (text.includes(' ') || text.includes('\n')) {
            appState.editorState.currentColor = 'black';
            editor.style.caretColor = 'black';
            
            // 色ボタンのアクティブ状態をクリア
            colorButtons.forEach(btn => {
                btn.classList.remove('active');
            });
        }
    });
    
    focusOnInput();
    
    console.log("Rich text editor initialized");
};