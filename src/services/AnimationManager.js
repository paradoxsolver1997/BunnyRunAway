/**
 * 轻量级动画管理器
 * 为每个精灵/道具提供独立的动画管理功能
 * 保守迁移：基于现有动画系统，保持完全兼容
 */

import { gameEventBus } from '../core/GameEventBus.js';
import { GAME_EVENTS } from '../core/GameEvents.js';

export class AnimationManager {
    constructor(spriteId, sprite) {
        // 基础属性
        this.spriteId = spriteId;
        this.sprite = sprite;
        
        // 动画管理
        this.animations = new Map();
        this.currentAnimation = null;
        this.currentAnimationName = null;
        
        // 动画状态
        this.isPlaying = false;
        this.isPaused = false;
        this.isLooping = true;
        
        // 性能优化
        this.lastUpdateTime = 0;
        this.updateThreshold = 16; // 60fps阈值（毫秒）
        
        // 事件系统（为未来扩展预留）
        this.setupEventListeners();
        
        console.log(`✅ AnimationManager: ${spriteId} 初始化完成`);
    }
    
    /**
     * 设置事件监听器（保守迁移：保持原有逻辑不变）
     */
    setupEventListeners() {
        // 监听全局暂停事件
        gameEventBus.on(GAME_EVENTS.GAME_PAUSE, () => {
            console.log(`🎯 AnimationManager: ${this.spriteId} 收到暂停事件`);
            this.pauseAnimation();
        });
        
        // 监听全局恢复事件
        gameEventBus.on(GAME_EVENTS.GAME_RESUME, () => {
            console.log(`🎯 AnimationManager: ${this.spriteId} 收到恢复事件`);
            this.resumeAnimation();
        });
        
        console.log(`✅ AnimationManager: ${this.spriteId} 事件监听器设置完成`);
    }
    
    /**
     * 添加动画（保守迁移：保持原有接口）
     */
    addAnimation(name, animation) {
        if (!name || !animation) {
            console.warn(`⚠️ AnimationManager: ${this.spriteId} 无效的动画数据`);
            return false;
        }
        
        this.animations.set(name, animation);
        console.log(`✅ AnimationManager: ${this.spriteId} 添加动画: ${name}`);
        return true;
    }
    
    /**
     * 播放动画（保守迁移：保持原有接口）
     */
    playAnimation(name, loop = true) {
        if (!this.animations.has(name)) {
            console.warn(`⚠️ AnimationManager: ${this.spriteId} 动画不存在: ${name}`);
            return false;
        }
        
        this.currentAnimation = this.animations.get(name);
        this.currentAnimationName = name;
        this.isLooping = loop;
        this.isPlaying = true;
        this.isPaused = false;
        
        // 设置精灵动画（保持原有逻辑）
        if (this.sprite && this.sprite.setAnimation) {
            this.sprite.setAnimation(this.currentAnimation);
        }
        
        console.log(`🎬 AnimationManager: ${this.spriteId} 播放动画: ${name} (循环: ${loop})`);
        return true;
    }
    
    /**
     * 暂停动画（保守迁移：保持原有接口）
     */
    pauseAnimation() {
        if (!this.isPlaying) {
            return false;
        }
        
        this.isPaused = true;
        console.log(`⏸️ AnimationManager: ${this.spriteId} 暂停动画`);
        return true;
    }
    
    /**
     * 恢复动画（保守迁移：保持原有接口）
     */
    resumeAnimation() {
        if (!this.isPlaying || !this.isPaused) {
            return false;
        }
        
        this.isPaused = false;
        console.log(`▶️ AnimationManager: ${this.spriteId} 恢复动画`);
        return true;
    }
    
    /**
     * 停止动画（保守迁移：保持原有接口）
     */
    stopAnimation() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentAnimation = null;
        this.currentAnimationName = null;
        
        console.log(`⏹️ AnimationManager: ${this.spriteId} 停止动画`);
        return true;
    }
    
    /**
     * 更新动画（保守迁移：保持原有逻辑）
     */
    update(deltaTime) {
        // 检查是否应该更新
        if (!this.isPlaying || this.isPaused || !this.sprite) {
            return;
        }
        
        // 性能优化：检查更新阈值
        const currentTime = Date.now();
        if (currentTime - this.lastUpdateTime < this.updateThreshold) {
            return;
        }
        this.lastUpdateTime = currentTime;
        
        // 调用精灵的动画更新方法（保持原有逻辑）
        if (this.sprite.updateAnimation) {
            this.sprite.updateAnimation(deltaTime);
        }
    }
    
    /**
     * 获取当前动画信息（新增功能）
     */
    getCurrentAnimationInfo() {
        return {
            spriteId: this.spriteId,
            currentAnimation: this.currentAnimationName,
            isPlaying: this.isPlaying,
            isPaused: this.isPaused,
            isLooping: this.isLooping,
            animationCount: this.animations.size
        };
    }
    
    /**
     * 检查动画是否存在（新增功能）
     */
    hasAnimation(name) {
        return this.animations.has(name);
    }
    
    /**
     * 获取所有动画名称（新增功能）
     */
    getAnimationNames() {
        return Array.from(this.animations.keys());
    }
    
    /**
     * 重置动画管理器（保守迁移：保持原有逻辑）
     */
    reset() {
        this.stopAnimation();
        this.animations.clear();
        this.lastUpdateTime = 0;
        
        console.log(`🔄 AnimationManager: ${this.spriteId} 已重置`);
    }
    
    /**
     * 销毁动画管理器（新增功能）
     */
    destroy() {
        this.reset();
        // 移除事件监听器（为未来扩展预留）
        // gameEventBus.off(GAME_EVENTS.GAME_PAUSE, this.pauseAnimation);
        // gameEventBus.off(GAME_EVENTS.GAME_RESUME, this.resumeAnimation);
        
        console.log(`🗑️ AnimationManager: ${this.spriteId} 已销毁`);
    }
}
