/**
 * 游戏事件定义 - 统一的事件类型和数据结构
 * 定义所有游戏事件的名称、数据结构和处理规范
 */

/**
 * 游戏事件类型常量
 */
export const GAME_EVENTS = {
    // 游戏状态事件
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    GAME_RESET: 'game:reset',
    
    // 兔子相关事件
    // BUNNY_ESCAPED: 'bunny:escaped', // 未使用
    // BUNNY_TRAPPED: 'bunny:trapped', // 未使用
    // BUNNY_MOVED: 'bunny:moved', // 未使用
    BUNNY_PATH_UPDATED: 'bunny:path_updated',
    
    // 路径计算相关事件（新增，为多精灵框架做准备）
    PATH_CALCULATION_REQUESTED: 'path:calculation_requested',
    PATH_CALCULATION_COMPLETED: 'path:calculation_completed',
    // PATH_CALCULATION_FAILED: 'path:calculation_failed', // 已移除，没有监听器
    PATH_NEEDS_UPDATE: 'path:needs_update',
    
    // 路障相关事件
    // BLOCKER_ADDED: 'blocker:added', // 未使用
    // BLOCKER_REMOVED: 'blocker:removed', // 未使用
    BLOCKER_ANIMATION_START: 'blocker:animation_start',
    BLOCKER_ANIMATION_COMPLETE: 'blocker:animation_complete',
    BLOCKER_BLINK_START: 'blocker:blink_start',
    BLOCKER_BLINK_STOP: 'blocker:blink_stop',
    
    // 地图相关事件
    // MAP_LOADED: 'map:loaded', // 已移除，没有监听器
    // MAP_CHANGED: 'map:changed', // 未使用
    // EDGE_CLICKED: 'edge:clicked', // 未使用
    
    // UI相关事件
    UI_UPDATE: 'ui:update',
    // DIALOG_SHOW: 'dialog:show', // 未使用
    // DIALOG_HIDE: 'dialog:hide', // 未使用
    
    // 动画相关事件
    ANIMATION_START: 'animation:start',
    ANIMATION_COMPLETE: 'animation:complete',
    ANIMATION_PAUSE: 'animation:pause',
    ANIMATION_RESUME: 'animation:resume',
    
    // 音频相关事件
    SOUND_PLAY: 'sound:play',
    SOUND_STOP: 'sound:stop',
    MUSIC_PLAY: 'music:play',
    MUSIC_PAUSE: 'music:pause',
    
    // 胜利对话框相关事件
    VICTORY_CONTINUE_CURRENT: 'victory:continue_current',
    VICTORY_TRY_NEXT_MAP: 'victory:try_next_map'
};

/**
 * 事件数据结构定义
 */
export const EVENT_DATA_SCHEMAS = {
    [GAME_EVENTS.GAME_OVER]: {
        winner: 'string', // 'player' | 'bunny'
        reason: 'string', // 游戏结束原因
        stats: {
            blockerCount: 'number',
            gameTime: 'number',
            moves: 'number'
        }
    },
    
    // [GAME_EVENTS.BUNNY_ESCAPED]: { // 未使用
    //     position: 'string', // 逃脱位置节点
    //     path: 'array', // 逃脱路径
    //     escapeTime: 'number' // 逃脱用时
    // },
    
    // [GAME_EVENTS.BUNNY_TRAPPED]: { // 未使用
    //     position: 'string', // 被困位置节点
    //     reason: 'string' // 被困原因
    // },
    
    // [GAME_EVENTS.BUNNY_MOVED]: { // 未使用
    //     fromNode: 'string',
    //     toNode: 'string',
    //     position: { x: 'number', y: 'number' }
    // },
    
    // [GAME_EVENTS.BLOCKER_ADDED]: { // 未使用
    //     edgeId: 'string',
    //     position: { x: 'number', y: 'number' },
    //     blockerCount: 'number'
    // },
    
    // [GAME_EVENTS.BLOCKER_REMOVED]: { // 未使用
    //     edgeId: 'string',
    //     reason: 'string', // 'manual' | 'recycled' | 'victory'
    //     blockerCount: 'number'
    // },
    
    [GAME_EVENTS.BLOCKER_ANIMATION_START]: {
        edgeId: 'string',
        animationType: 'string', // 'drop' | 'recycle' | 'victory'
        duration: 'number'
    },
    
    [GAME_EVENTS.BLOCKER_ANIMATION_COMPLETE]: {
        edgeId: 'string',
        animationType: 'string'
    },
    
    // [GAME_EVENTS.EDGE_CLICKED]: { // 未使用
    //     edgeId: 'string',
    //     position: { x: 'number', y: 'number' },
    //     action: 'string' // 'add_blocker' | 'remove_blocker' | 'invalid'
    // },
    
    // [GAME_EVENTS.MAP_LOADED]: { // 已移除，没有监听器
    //     mapId: 'string',
    //     difficulty: 'string',
    //     nodeCount: 'number',
    //     edgeCount: 'number',
    //     holeCount: 'number'
    // },
    
    [GAME_EVENTS.UI_UPDATE]: {
        component: 'string',
        data: 'object'
    },
    
    // [GAME_EVENTS.DIALOG_SHOW]: { // 未使用
    //     dialogType: 'string',
    //     data: 'object'
    // },
    
    [GAME_EVENTS.ANIMATION_START]: {
        target: 'string', // 动画目标ID
        type: 'string', // 动画类型
        duration: 'number'
    },
    
    [GAME_EVENTS.ANIMATION_COMPLETE]: {
        target: 'string',
        type: 'string'
    }
};

/**
 * 事件优先级定义
 */
export const EVENT_PRIORITIES = {
    CRITICAL: 100,    // 关键事件（游戏结束等）
    HIGH: 75,         // 高优先级（兔子移动、路障变化）
    NORMAL: 50,       // 普通优先级（UI更新、动画）
    LOW: 25,          // 低优先级（调试信息、统计）
    BACKGROUND: 0     // 后台优先级（清理、优化）
};

/**
 * 事件验证器
 */
export class EventValidator {
    /**
     * 验证事件数据是否符合schema
     * @param {string} eventType - 事件类型
     * @param {*} data - 事件数据
     * @returns {boolean} 是否有效
     */
    static validate(eventType, data) {
        const schema = EVENT_DATA_SCHEMAS[eventType];
        if (!schema) {
            console.warn(`⚠️ No schema defined for event '${eventType}'`);
            return true; // 没有schema的事件默认有效
        }
        
        return this.validateObject(data, schema);
    }
    
    /**
     * 验证对象结构
     * @param {*} obj - 要验证的对象
     * @param {*} schema - 结构定义
     * @returns {boolean} 是否有效
     */
    static validateObject(obj, schema) {
        if (typeof schema === 'string') {
            return typeof obj === schema;
        }
        
        if (Array.isArray(schema)) {
            return Array.isArray(obj);
        }
        
        if (typeof schema === 'object' && schema !== null) {
            if (typeof obj !== 'object' || obj === null) {
                return false;
            }
            
            for (const [key, expectedType] of Object.entries(schema)) {
                if (!(key in obj)) {
                    console.warn(`⚠️ Missing required field '${key}' in event data`);
                    return false;
                }
                
                if (!this.validateObject(obj[key], expectedType)) {
                    console.warn(`⚠️ Invalid type for field '${key}' in event data`);
                    return false;
                }
            }
        }
        
        return true;
    }
}

/**
 * 事件工厂 - 创建标准化的事件数据
 */
export class EventFactory {
    /**
     * 创建游戏结束事件
     */
    static createGameOverEvent(winner, reason = '', stats = {}) {
        return {
            winner,
            reason,
            stats: {
                blockerCount: stats.blockerCount || 0,
                gameTime: stats.gameTime || 0,
                moves: stats.moves || 0
            }
        };
    }
    
    /**
     * 创建兔子逃脱事件
     */
    static createBunnyEscapedEvent(position, path = [], escapeTime = 0) {
        return {
            position,
            path,
            escapeTime
        };
    }
    
    /**
     * 创建路障添加事件
     */
    static createBlockerAddedEvent(edgeId, position, blockerCount) {
        return {
            edgeId,
            position,
            blockerCount
        };
    }
    
    /**
     * 创建路障移除事件
     */
    static createBlockerRemovedEvent(edgeId, reason, blockerCount) {
        return {
            edgeId,
            reason,
            blockerCount
        };
    }
    
    /**
     * 创建边点击事件
     */
    static createEdgeClickedEvent(edgeId, position, action) {
        return {
            edgeId,
            position,
            action
        };
    }
    
    // /**
    //  * 创建地图加载事件 - 已移除，没有监听器
    //  */
    // static createMapLoadedEvent(mapId, difficulty, stats) {
    //     return {
    //         mapId,
    //         difficulty,
    //         nodeCount: stats.nodeCount || 0,
    //         edgeCount: stats.edgeCount || 0,
    //         holeCount: stats.holeCount || 0
    //     };
    // }
}

/**
 * 事件监听器基类 - 提供标准的事件处理接口
 */
export class EventListener {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.listeners = new Map(); // 存储监听器ID
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} handler - 处理函数
     * @param {Object} options - 选项
     */
    addListener(event, handler, options = {}) {
        const id = this.eventBus.on(event, handler, options);
        this.listeners.set(id, { event, handler });
        return id;
    }
    
    /**
     * 移除事件监听器
     * @param {string} id - 监听器ID
     */
    removeListener(id) {
        const listener = this.listeners.get(id);
        if (listener) {
            this.eventBus.off(listener.event, id);
            this.listeners.delete(id);
        }
    }
    
    /**
     * 移除所有监听器
     */
    removeAllListeners() {
        for (const id of this.listeners.keys()) {
            this.removeListener(id);
        }
    }
    
    /**
     * 销毁监听器
     */
    destroy() {
        this.removeAllListeners();
    }
}
