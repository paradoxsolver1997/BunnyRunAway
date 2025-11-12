/**
 * 动画协调器
 * 统一管理所有精灵/道具的动画更新
 * 保守迁移：基于现有动画系统，保持完全兼容
 */

import { gameEventBus } from '../core/GameEventBus.js';
import { GAME_EVENTS } from '../core/GameEvents.js';

export class AnimationCoordinator {
    constructor() {
        // 动画管理器注册表
        this.animationManagers = new Map();
        
        // 全局状态
        this.isGlobalPaused = false;
        this.isRunning = false;
        
        // 性能优化
        this.updateQueue = [];
        this.lastUpdateTime = 0;
        this.updateThreshold = 16; // 60fps阈值（毫秒）
        
        // 统计信息
        this.stats = {
            totalManagers: 0,
            activeAnimations: 0,
            pausedAnimations: 0,
            updateCount: 0
        };
        
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        gameEventBus.on(GAME_EVENTS.GAME_PAUSE, () => {
            this.pauseAllAnimations();
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_RESUME, () => {
            this.resumeAllAnimations();
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_OVER, (data) => {
            this.lastGameOverEvent = data;
        });
    }
    
    /**
     * 注册动画管理器
     */
    registerAnimationManager(spriteId, animationManager) {
        if (!spriteId || !animationManager) {
            return false;
        }
        
        this.animationManagers.set(spriteId, animationManager);
        this.stats.totalManagers = this.animationManagers.size;
        return true;
    }
    
    /**
     * 注销动画管理器
     */
    unregisterAnimationManager(spriteId) {
        if (!this.animationManagers.has(spriteId)) {
            return false;
        }
        
        const manager = this.animationManagers.get(spriteId);
        if (manager && manager.destroy) {
            manager.destroy();
        }
        
        this.animationManagers.delete(spriteId);
        this.stats.totalManagers = this.animationManagers.size;
        return true;
    }
    
    /**
     * 更新所有动画
     */
    updateAllAnimations(deltaTime) {
        // 检查全局暂停状态
        if (this.isGlobalPaused) {
            return;
        }
        
        // 性能优化：检查更新阈值
        const currentTime = Date.now();
        if (currentTime - this.lastUpdateTime < this.updateThreshold) {
            return;
        }
        this.lastUpdateTime = currentTime;
        
        // 更新所有动画管理器
        let activeCount = 0;
        let pausedCount = 0;
        
        for (const [spriteId, manager] of this.animationManagers) {
            if (manager && manager.update) {
                manager.update(deltaTime);
                
                // 统计活跃动画
                if (manager.isPlaying) {
                    activeCount++;
                    if (manager.isPaused) {
                        pausedCount++;
                    }
                }
            }
        }
        
        // 更新统计信息
        this.stats.activeAnimations = activeCount;
        this.stats.pausedAnimations = pausedCount;
        this.stats.updateCount++;
    }
    
    /**
     * 暂停所有动画（保守迁移：保持原有接口）
     */
    pauseAllAnimations() {
        this.isGlobalPaused = true;
        
        for (const [spriteId, manager] of this.animationManagers) {
            if (manager && manager.pauseAnimation) {
                manager.pauseAnimation();
            }
        }
        
    }
    
    /**
     * 恢复所有动画
     */
    resumeAllAnimations() {
        this.isGlobalPaused = false;
        
        for (const [spriteId, manager] of this.animationManagers) {
            if (manager && manager.resumeAnimation) {
                manager.resumeAnimation();
            }
        }
        
    }
    
    /**
     * 停止所有动画
     */
    stopAllAnimations() {
        for (const [spriteId, manager] of this.animationManagers) {
            if (manager && manager.stopAnimation) {
                manager.stopAnimation();
            }
        }
        
    }
    
    /**
     * 获取动画管理器
     */
    getAnimationManager(spriteId) {
        return this.animationManagers.get(spriteId);
    }
    
    /**
     * 获取所有动画管理器
     */
    getAllAnimationManagers() {
        return Array.from(this.animationManagers.entries());
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            isGlobalPaused: this.isGlobalPaused,
            isRunning: this.isRunning
        };
    }
    
    /**
     * 检查动画管理器是否存在
     */
    hasAnimationManager(spriteId) {
        return this.animationManagers.has(spriteId);
    }
    
    /**
     * 获取活跃动画数量
     */
    getActiveAnimationCount() {
        let count = 0;
        for (const [spriteId, manager] of this.animationManagers) {
            if (manager && manager.isPlaying && !manager.isPaused) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * 重置协调器
     */
    reset() {
        this.stopAllAnimations();
        this.animationManagers.clear();
        this.isGlobalPaused = false;
        this.isRunning = false;
        this.updateQueue = [];
        this.lastUpdateTime = 0;
        
        // 重置统计信息
        this.stats = {
            totalManagers: 0,
            activeAnimations: 0,
            pausedAnimations: 0,
            updateCount: 0
        };
        
    }
    
    /**
     * 销毁协调器
     */
    destroy() {
        this.reset();
        // 🆕 修复：清理无效的注释代码
        // 当前 AnimationCoordinator 只监听 GAME_OVER 事件用于记录，不需要清理
        
    }
}
