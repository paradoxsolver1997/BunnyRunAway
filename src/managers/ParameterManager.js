/**
 * 参数管理器 - 仿照Python版本的ParameterManager
 * 管理游戏配置参数，支持嵌套访问和默认值
 */

export class ParameterManager {
    constructor() {
        this.parameters = null;
        this.loadingPromise = null;
    }
    
    /**
     * 异步加载参数配置
     */
    async loadParameters() {
        if (this.loadingPromise) {
            return await this.loadingPromise;
        }
        
        this.loadingPromise = this._loadParametersInternal();
        return await this.loadingPromise;
    }
    
    /**
     * 内部参数加载方法
     */
    async _loadParametersInternal() {
        try {
            const response = await fetch('./config.json');
            if (!response.ok) {
                throw new Error(`参数文件加载失败: ${response.status}`);
            }
            
            this.parameters = await response.json();
            console.log('✅ 游戏参数加载成功');
            return this.parameters;
            
        } catch (error) {
            console.error('❌ 参数加载失败:', error);
            // 使用默认参数
            this.parameters = this._getDefaultParameters();
            return this.parameters;
        }
    }
    
    /**
     * 获取默认参数（当配置文件加载失败时使用）
     */
    _getDefaultParameters() {
        return {
            game: {
                display: { fps: 60, canvas_width: 900, canvas_height: 700 }
            },
            bunny: {
                animation: { frame_duration: 500 },
                default_speed: 70,
                behavior: { auto_initialize: true }
            },
            rendering: {
                scaling: { bunny: 0.075, fence: 0.075, stump: 0.075, hole: 0.5, stones: 0.3 },
                sizes: { node_radius: 8, hole_radius: 15, edge_width: 2 },
                colors: {
                    edge_normal: "#4a5568",
                    edge_blocked: "#f56565",
                    node_normal: "#48bb78"
                }
            }
        };
    }
    
    /**
     * 通用参数获取方法，支持点分路径
     * @param {string} path - 参数路径，如 "bunny.default_speed"
     * @param {*} defaultValue - 默认值
     * @returns {*} 参数值
     */
    get(path, defaultValue = null) {
        if (!this.parameters) {
            console.warn('参数未加载，使用默认值');
            return defaultValue;
        }
        
        const keys = path.split('.');
        let current = this.parameters;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
    
    /**
     * 获取兔子相关参数
     */
    getBunny(key, defaultValue = null) {
        return this.get(`bunny.${key}`, defaultValue);
    }
    
    /**
     * 获取渲染相关参数
     */
    getRendering(key, defaultValue = null) {
        return this.get(`rendering.${key}`, defaultValue);
    }
    
    /**
     * 获取缩放因子
     */
    getScaling(resourceType, defaultValue = 1.0) {
        return this.get(`rendering.scaling.${resourceType}`, defaultValue);
    }
    
    /**
     * 获取颜色配置
     */
    getColor(colorName, defaultValue = '#000000') {
        return this.get(`rendering.colors.${colorName}`, defaultValue);
    }
    
    /**
     * 获取尺寸配置
     */
    getSize(sizeName, defaultValue = 0) {
        return this.get(`rendering.sizes.${sizeName}`, defaultValue);
    }
    
    /**
     * 获取游戏显示参数
     */
    getGameDisplay(key, defaultValue = null) {
        return this.get(`game.display.${key}`, defaultValue);
    }
    
    /**
     * 获取地图参数
     */
    getMap(key, defaultValue = null) {
        return this.get(`map.${key}`, defaultValue);
    }
    
    /**
     * 获取性能参数
     */
    getPerformance(key, defaultValue = null) {
        return this.get(`performance.${key}`, defaultValue);
    }
    
    /**
     * 获取调试参数
     */
    getDebug(key, defaultValue = false) {
        return this.get(`debug.${key}`, defaultValue);
    }
    
    /**
     * 检查参数是否已加载
     */
    isLoaded() {
        return this.parameters !== null;
    }
    
    /**
     * 获取所有参数（调试用）
     */
    getAllParameters() {
        return this.parameters;
    }
    
    /**
     * 动态设置参数（运行时修改）
     */
    set(path, value) {
        if (!this.parameters) {
            console.warn('参数未加载，无法设置');
            return false;
        }
        
        const keys = path.split('.');
        let current = this.parameters;
        
        // 导航到最后一级的父对象
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // 设置最终值
        current[keys[keys.length - 1]] = value;
        return true;
    }
    
    /**
     * 导出当前参数配置
     */
    exportConfig() {
        return JSON.stringify(this.parameters, null, 2);
    }
}

// 全局参数管理器实例
let globalParameterManager = null;

/**
 * 获取全局参数管理器实例
 */
export function getParameterManager() {
    if (!globalParameterManager) {
        globalParameterManager = new ParameterManager();
    }
    return globalParameterManager;
}

/**
 * 便捷函数：获取参数值
 */
export function getParam(path, defaultValue = null) {
    const manager = getParameterManager();
    return manager.get(path, defaultValue);
}

/**
 * 便捷函数：初始化参数系统
 */
export async function initializeParameters() {
    const manager = getParameterManager();
    await manager.loadParameters();
    return manager;
}
