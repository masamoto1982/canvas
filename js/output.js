// 出力表示の管理
class OutputDisplay {
  constructor(outputElement) {
    this.output = outputElement;
    this.isExecuting = false;
  }
  
  // 実行結果を表示
  showResult(result, isError = false) {
    this.clear();
    
    this.output.textContent = result;
    
    // スタイルの適用
    this.output.classList.remove('success', 'error');
    if (isError) {
      this.output.classList.add('error');
    } else {
      this.output.classList.add('success');
    }
    
    // スクロール
    this.output.scrollTop = this.output.scrollHeight;
  }
  
  // 実行中の表示
  showExecuting() {
    this.isExecuting = true;
    this.output.textContent = '実行中...';
    this.output.classList.remove('success', 'error');
  }
  
  // クリア
  clear() {
    this.output.textContent = '';
    this.output.classList.remove('success', 'error');
    this.isExecuting = false;
  }
  
  // エラーメッセージを整形
  formatError(error) {
    if (error instanceof Error) {
      return `エラー: ${error.message}`;
    }
    return `エラー: ${String(error)}`;
  }
  
  // 実行ログを追加（デバッグ用）
  appendLog(message) {
    const log = document.createElement('div');
    log.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.style.color = '#7f8c8d';
    log.style.fontSize = '0.8em';
    this.output.appendChild(log);
  }
  
  // 複数行の結果を表示
  showMultilineResult(lines, isError = false) {
    this.clear();
    
    if (Array.isArray(lines)) {
      this.output.textContent = lines.join('\n');
    } else {
      this.output.textContent = String(lines);
    }
    
    this.output.classList.remove('success', 'error');
    if (isError) {
      this.output.classList.add('error');
    } else {
      this.output.classList.add('success');
    }
  }
  
  // 変数の状態を表示（デバッグ用）
  showVariables(variables) {
    const lines = ['=== 変数の状態 ==='];
    
    for (const [name, value] of Object.entries(variables)) {
      lines.push(`${name} = ${this.formatValue(value)}`);
    }
    
    if (lines.length === 1) {
      lines.push('(変数なし)');
    }
    
    this.showMultilineResult(lines);
  }
  
  // 値を整形
  formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object' && value.toString) {
      return value.toString();
    }
    return String(value);
  }
}

// グローバルに公開
window.OutputDisplay = OutputDisplay;