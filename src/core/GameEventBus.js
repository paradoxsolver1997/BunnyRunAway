/**
 * 游戏事件总线 - 统一的事件驱动架构核心
 * 实现异步事件发布/订阅模式，解耦模块间依赖
 */

export class GameEventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = []; // 用于调试的事件历史
        this.maxHistorySize = 100;
        this.isDebugMode = true;
        
        console.log('🎯 GameEventBus initialized');
    }
    
    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项 {once: boolean, priority: number}
     */
    on(event, handler, options = {}) {
        if (typeof handler !== 'function') {
            console.error(`❌ Event handler for '${event}' must be a function`);
            return;
        }
        
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const listener = {
            handler,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateListenerId()
        };
        
        this.listeners.get(event).push(listener);
        
        // 按优先级排序（优先级高的先执行）
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        
        if (this.isDebugMode) {
            // console.log(`📡 Subscribed to event '${event}' with priority ${listener.priority}`);
        }
        
        return listener.id; // 返回监听器ID，用于取消订阅
    }
    
    /**
     * 订阅一次性事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }
    
    /**
     * 发布事件（异步）
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     * @param {Object} options - 选项 {immediate: boolean}
     */
    emit(event, data = null, options = {}) {
        const eventInfo = {
            event,
            data,
            timestamp: Date.now(),
            immediate: options.immediate || false
        };
        
        // 记录事件历史（用于调试）
        this.recordEvent(eventInfo);
        
        if (this.isDebugMode) {
            // console.log(`📤 Emitting event '${event}':`, data);
        }
        
        const handlers = this.listeners.get(event) || [];
        
        if (this.isDebugMode) {
        }
        
        if (handlers.length === 0) {
            // 对于某些频繁的事件，不显示警告
            const frequentEvents = ['bunny:moved', 'bunny:path_updated', 'ui:update'];
            if (this.isDebugMode && !frequentEvents.includes(event)) {
                console.warn(`⚠️ No listeners for event '${event}'`);
            }
            return;
        }
        
        // 异步执行事件处理函数
        const executeHandlers = () => {
            const handlersToRemove = [];
            
            handlers.forEach((listener, index) => {
                try {
                    listener.handler(data, eventInfo);
                    // console.log(`✅ 第${index + 1}个处理器执行完成: ${event}`);
                    
                    // 如果是一次性监听器，标记为待移除
                    if (listener.once) {
                        handlersToRemove.push(listener.id);
                    }
                } catch (error) {
                    console.error(`❌ Error in event handler for '${event}':`, error);
                }
            });
            
            // 移除一次性监听器
            handlersToRemove.forEach(id => {
                this.off(event, id);
            });
        };
        
        if (options.immediate) {
            // 立即执行（同步）
            executeHandlers();
        } else {
            // 异步执行（使用 Promise 确保不阻塞主线程）
            Promise.resolve().then(() => {
                executeHandlers();
            }).catch(error => {
                console.error(`❌ Promise 执行出错: ${event}`, error);
            });
        }
    }
    
    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {string|Function} handlerOrId - 处理函数或监听器ID
     */
    off(event, handlerOrId) {
        const handlers = this.listeners.get(event);
        if (!handlers) return;
        
        if (typeof handlerOrId === 'string') {
            // 通过ID取消订阅
            const index = handlers.findIndex(listener => listener.id === handlerOrId);
            if (index !== -1) {
                handlers.splice(index, 1);
                if (this.isDebugMode) {
                    // console.log(`📡 Unsubscribed from event '${event}' by ID`);
                }
            }
        } else if (typeof handlerOrId === 'function') {
            // 通过函数引用取消订阅
            const index = handlers.findIndex(listener => listener.handler === handlerOrId);
            if (index !== -1) {
                handlers.splice(index, 1);
                if (this.isDebugMode) {
                    // console.log(`📡 Unsubscribed from event '${event}' by function reference`);
                }
            }
        }
        
        // 如果没有监听器了，删除事件
        if (handlers.length === 0) {
            this.listeners.delete(event);
        }
    }
    
    /**
     * 移除所有事件监听器
     * @param {string} event - 事件名称（可选，不传则清除所有）
     */
    removeAllListeners(event = null) {
        if (event) {
            this.listeners.delete(event);
            if (this.isDebugMode) {
                // console.log(`📡 Removed all listeners for event '${event}'`);
            }
        } else {
            this.listeners.clear();
            if (this.isDebugMode) {
                // console.log(`📡 Removed all event listeners`);
            }
        }
    }
    
    /**
     * 获取事件监听器数量
     * @param {string} event - 事件名称（可选）
     */
    getListenerCount(event = null) {
        if (event) {
            return this.listeners.get(event)?.length || 0;
        } else {
            let total = 0;
            for (const handlers of this.listeners.values()) {
                total += handlers.length;
            }
            return total;
        }
    }
    
    /**
     * 获取所有事件名称
     */
    getEventNames() {
        return Array.from(this.listeners.keys());
    }
    
    /**
     * 启用/禁用调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.isDebugMode = enabled;
        // console.log(`🔧 GameEventBus debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * 获取事件历史（用于调试）
     */
    getEventHistory() {
        return [...this.eventHistory];
    }
    
    /**
     * 清除事件历史
     */
    clearEventHistory() {
        this.eventHistory = [];
    }
    
    /**
     * 生成唯一的监听器ID
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 记录事件到历史
     */
    recordEvent(eventInfo) {
        this.eventHistory.push(eventInfo);
        
        // 限制历史记录大小
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * 销毁事件总线
     */
    destroy() {
        this.removeAllListeners();
        this.clearEventHistory();
        // console.log('🗑️ GameEventBus destroyed');
    }
}

// 创建全局事件总线实例
export const gameEventBus = new GameEventBus();

// 在开发环境下启用调试模式（浏览器环境）
if (typeof window !== 'undefined') {
    try {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            gameEventBus.setDebugMode(true);
        }
    } catch (error) {
        // 忽略错误，可能在某些环境下window.location不可用
        // console.log('🔧 GameEventBus: 无法检测开发环境，跳过调试模式设置');
    }
}
