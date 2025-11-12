/**
 * 统一错误处理系统
 * 提供标准化的错误处理、日志记录和错误恢复机制
 */

// import { errorLogger } from './error_logger.js'; // 文件已删除

// 错误类型枚举
export const ErrorTypes = {
    INITIALIZATION: 'INITIALIZATION',
    RESOURCE_LOADING: 'RESOURCE_LOADING',
    RENDERING: 'RENDERING',
    AUDIO: 'AUDIO',
    INPUT: 'INPUT',
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    STATE_TRANSITION: 'STATE_TRANSITION',
    UNKNOWN: 'UNKNOWN'
};

// 错误严重级别
export const ErrorSeverity = {
    LOW: 'LOW',        // 警告级别，不影响核心功能
    WARNING: 'WARNING', // 警告级别，用于状态转换等非关键错误
    MEDIUM: 'MEDIUM',  // 中等级别，可能影响部分功能
    HIGH: 'HIGH',      // 高级别，影响核心功能
    CRITICAL: 'CRITICAL' // 严重级别，可能导致游戏崩溃
};

/**
 * 自定义错误类
 */
export class GameError extends Error {
    constructor(type, message, severity = ErrorSeverity.MEDIUM, context = {}) {
        super(message);
        this.name = 'GameError';
        this.type = type;
        this.severity = severity;
        this.context = context;
        this.timestamp = new Date().toISOString();
        this.stack = this.stack || new Error().stack;
    }

    /**
     * 获取错误信息摘要
     */
    getSummary() {
        return {
            type: this.type,
            severity: this.severity,
            message: this.message,
            timestamp: this.timestamp,
            context: this.context
        };
    }

    /**
     * 检查是否为严重错误
     */
    isCritical() {
        return this.severity === ErrorSeverity.CRITICAL || this.severity === ErrorSeverity.HIGH;
    }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 1000; // 最大日志条数
        this.listeners = new Map(); // 错误监听器
        this.recoveryStrategies = new Map(); // 错误恢复策略
        this.isEnabled = true;
        
        // 绑定全局错误处理
        this.bindGlobalHandlers();
    }

    /**
     * 绑定全局错误处理器
     */
    bindGlobalHandlers() {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new GameError(
                ErrorTypes.UNKNOWN,
                `Unhandled Promise Rejection: ${event.reason}`,
                ErrorSeverity.HIGH,
                { reason: event.reason, promise: event.promise }
            ));
        });

        // 捕获全局JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError(new GameError(
                ErrorTypes.UNKNOWN,
                `Global Error: ${event.message}`,
                ErrorSeverity.HIGH,
                { 
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                }
            ));
        });
    }

    /**
     * 处理错误
     * @param {Error|GameError} error - 错误对象
     * @param {Object} additionalContext - 额外上下文信息
     */
    handleError(error, additionalContext = {}) {
        if (!this.isEnabled) return;

        // 转换为GameError对象
        let gameError;
        if (error instanceof GameError) {
            gameError = error;
        } else {
            gameError = new GameError(
                ErrorTypes.UNKNOWN,
                error.message || 'Unknown error',
                ErrorSeverity.MEDIUM,
                { originalError: error, ...additionalContext }
            );
        }

        // 记录错误
        this.logError(gameError);

        // 通知监听器
        this.notifyListeners(gameError);

        // 尝试错误恢复
        this.attemptRecovery(gameError);

        // 根据严重级别决定是否抛出错误
        if (gameError.isCritical()) {
            console.error('Critical error occurred:', gameError);
            throw gameError;
        } else {
            console.warn('Error handled:', gameError.getSummary());
        }
    }

    /**
     * 记录错误到日志
     */
    logError(error) {
        this.errorLog.push(error.getSummary());
        
        // 限制日志大小
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }

        // 同时记录到错误日志系统（已注释，因为errorLogger文件已删除）
        // errorLogger.log({
        //     type: error.type,
        //     severity: error.severity,
        //     message: error.message,
        //     context: error.context,
        //     stack: error.stack
        // });
    }

    /**
     * 添加错误监听器
     */
    addListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    /**
     * 移除错误监听器
     */
    removeListener(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 通知错误监听器
     */
    notifyListeners(error) {
        // 通知特定类型的监听器
        if (this.listeners.has(error.type)) {
            this.listeners.get(error.type).forEach(callback => {
                try {
                    callback(error);
                } catch (e) {
                    console.error('Error in error listener:', e);
                }
            });
        }

        // 通知通用监听器
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                try {
                    callback(error);
                } catch (e) {
                    console.error('Error in error listener:', e);
                }
            });
        }
    }

    /**
     * 添加错误恢复策略
     */
    addRecoveryStrategy(type, strategy) {
        this.recoveryStrategies.set(type, strategy);
    }

    /**
     * 尝试错误恢复
     */
    attemptRecovery(error) {
        const strategy = this.recoveryStrategies.get(error.type);
        if (strategy && typeof strategy === 'function') {
            try {
                const result = strategy(error);
                if (result) {
                    console.log(`Error recovery successful for ${error.type}:`, result);
                }
            } catch (e) {
                console.error('Error recovery failed:', e);
            }
        }
    }

    /**
     * 获取错误日志
     */
    getErrorLog(filter = {}) {
        let filteredLog = this.errorLog;

        if (filter.type) {
            filteredLog = filteredLog.filter(log => log.type === filter.type);
        }

        if (filter.severity) {
            filteredLog = filteredLog.filter(log => log.severity === filter.severity);
        }

        if (filter.since) {
            const sinceDate = new Date(filter.since);
            filteredLog = filteredLog.filter(log => new Date(log.timestamp) >= sinceDate);
        }

        return filteredLog;
    }

    /**
     * 清空错误日志
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * 启用/禁用错误处理
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * 创建错误包装器
     */
    wrapFunction(fn, errorType, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, { ...context, function: fn.name, args });
                throw error;
            }
        };
    }

    /**
     * 创建安全的异步函数
     */
    safeAsync(fn, errorType, fallback = null, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, { ...context, function: fn.name, args });
                return fallback;
            }
        };
    }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();

// 预定义一些常用的错误恢复策略
errorHandler.addRecoveryStrategy(ErrorTypes.RESOURCE_LOADING, (error) => {
    console.log('Attempting to reload resource...');
    // 这里可以添加资源重新加载的逻辑
    return { action: 'retry', message: 'Resource reload attempted' };
});

errorHandler.addRecoveryStrategy(ErrorTypes.AUDIO, (error) => {
    console.log('Attempting to reinitialize audio...');
    // 这里可以添加音频重新初始化的逻辑
    return { action: 'reinitialize', message: 'Audio reinitialization attempted' };
});

// 导出便捷函数
export function handleError(error, context = {}) {
    return errorHandler.handleError(error, context);
}

export function createError(type, message, severity = ErrorSeverity.MEDIUM, context = {}) {
    return new GameError(type, message, severity, context);
}

export function wrapWithErrorHandling(fn, errorType, context = {}) {
    return errorHandler.wrapFunction(fn, errorType, context);
}

export function safeAsync(fn, errorType, fallback = null, context = {}) {
    return errorHandler.safeAsync(fn, errorType, fallback, context);
}

// 导出错误处理器实例
export { errorHandler as default };
