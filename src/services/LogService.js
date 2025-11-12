/**
 * 日志系统 - 统一管理游戏日志输出
 * 从integrated_game.html中提取的日志逻辑
 */

export class LogService {
    constructor() {
        this.logContainer = null;
        this.maxLogEntries = 50;
    }
    
    initialize() {
        this.logContainer = document.getElementById('logContainer');
        if (!this.logContainer) {
            console.warn('LogService: 找不到logContainer元素');
        }
    }
    
    log(message, type = 'info') {
        // 输出到控制台
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        switch (type) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warning':
                console.warn(logMessage);
                break;
            case 'success':
                console.log(`✅ ${logMessage}`);
                break;
            case 'debug':
                console.log(`🔍 ${logMessage}`);
                break;
            default:
                console.log(logMessage);
        }
        
        // 输出到UI日志面板
        if (this.logContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${type}`;
            logEntry.textContent = logMessage;
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
            
            // 限制日志条目数量
            if (this.logContainer.children.length > this.maxLogEntries) {
                this.logContainer.removeChild(this.logContainer.firstChild);
            }
        }
    }
    
    clear() {
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
    }
    
    setMaxEntries(maxEntries) {
        this.maxLogEntries = maxEntries;
    }
}

// 默认导出
export default LogService;
