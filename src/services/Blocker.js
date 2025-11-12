/**
 * 路障类 - 统一的路障实现
 * 合并了autonomous_blocker.js和blocker_system.js的功能
 */

import { globalPauseManager } from '../core/PauseManager.js';

export class Blocker {
    constructor(edgeId, edgeObj, assetLoader, onBlockedChange = null) {
        this.edgeId = edgeId;
        this.edgeObj = edgeObj;
        this.assetLoader = assetLoader;
        this.onBlockedChange = onBlockedChange; // 回调函数，用于通知边状态变化
        
        this.creationTime = Date.now();
        this.isHighlighted = false;
        this.highlightStartTime = 0;
        
        // 异步动画管理
        this.animationState = 'idle'; // 'idle', 'dropping', 'recycling', 'destroyed'
        this.animationTimer = null; // 动画定时器
        this.animationStartTime = 0; // 动画开始时间
        
        // 掉落动画参数
        this.dropAnimation = {
            duration: 800, // 总动画时长（毫秒）
            height: -200, // 初始高度（屏幕上方，准备掉落）
            phase: 'falling', // 'falling', 'bounce', 'settle'
            velocity: 0, // 掉落速度
            gravity: 0.6 + this.getSeededRandom() * 0.4, // 重力加速度
            bounceHeight: 0, // 弹跳高度
            bounceDecay: 0.5 + this.getSeededRandom() * 0.2, // 弹跳衰减系数
            settleShake: 0, // 震荡幅度
            settlePhase: this.getSeededRandom() * Math.PI * 2, // 震荡相位
            rotationOffset: 0, // 旋转偏移
            rotationVelocity: (this.getSeededRandom() - 0.5) * 0.1 // 旋转速度
        };
        
        // 回收飞跳动画参数
        this.recycleAnimation = {
            duration: 600, // 回收动画时长（毫秒）
            progress: 0, // 回收进度
            originalPosition: null, // 原始位置
            targetPosition: null // 目标位置
        };
        
        // 闪烁相关参数
        this.blinkInterval = 500; // 闪烁间隔（毫秒）
        this.blinkDuration = 0.5; // 闪烁持续时间（秒）
        
        // 异步闪烁管理
        this.isLast = false; // 是否为最后一个（即将被回收）
        this.blinkTimer = null; // 闪烁定时器
        this.isBlinking = false; // 是否正在闪烁
        
        // 栅栏图片
        this.fenceImage = assetLoader ? assetLoader.getImage('fence') : null;
        
        // 设置初始状态（通知边被阻塞）
        this.setBlocked(true);
    }
    
    /**
     * 设置边是否被阻塞
     */
    setBlocked(blocked) {
        if (this.edgeObj && this.edgeObj.setBlocked) {
            this.edgeObj.setBlocked(blocked);
        }
        
        // 通知外部边状态变化
        if (this.onBlockedChange) {
            this.onBlockedChange(this.edgeId, blocked);
        }
    }
    
    /**
     * 设置是否高亮闪烁（兼容旧方法）
     */
    setHighlighted(highlighted) {
        this.isHighlighted = highlighted;
        if (highlighted) {
            // 每次设置高亮时都更新时间，确保闪烁持续
            this.highlightStartTime = Date.now();
            // console.log(`💫 路障 ${this.edgeId} 开始持续闪烁`);
        } else {
            // console.log(`💫 路障 ${this.edgeId} 停止闪烁`);
        }
    }
    
    /**
     * 设置是否为最后一个（即将被回收）
     */
    setAsLast(isLast) {
        if (this.isLast === isLast) return; // 避免重复设置
        
        this.isLast = isLast;
        
        if (isLast) {
            this.startAsyncBlinking();
        } else {
            this.stopAsyncBlinking();
        }
    }
    
    /**
     * 启动异步闪烁
     */
    startAsyncBlinking() {
        if (this.isBlinking) return; // 已经在闪烁
        
        this.isBlinking = true;
        this.isHighlighted = true;
        this.highlightStartTime = Date.now();
        
        // 使用setInterval创建持续的闪烁效果
        this.blinkTimer = setInterval(() => {
            if (!this.isLast) {
                // 如果不再是最后一个，停止闪烁
                this.stopAsyncBlinking();
                return;
            }
            
            // 持续闪烁：不需要重新设置highlightStartTime，保持连续性
            // 闪烁效果在render方法中通过sin函数实现
        }, 16); // 60FPS更新，确保闪烁流畅
        
    }
    
    /**
     * 停止异步闪烁
     */
    stopAsyncBlinking() {
        if (!this.isBlinking) return; // 没有在闪烁
        
        this.isBlinking = false;
        this.isLast = false;
        this.isHighlighted = false;
        
        if (this.blinkTimer) {
            clearInterval(this.blinkTimer);
            this.blinkTimer = null;
        }
        
    }
    
    /**
     * 销毁路障（清理资源）
     */
    destroy() {
        this.stopAsyncBlinking();
        this.stopAllAnimations();
        this.animationState = 'destroyed';
        // console.log(`🗑️ 路障 ${this.edgeId} 已被销毁`);
    }
    
    /**
     * 启动异步掉落动画
     */
    startAsyncDropAnimation(dropStartPos = null, targetPos = null) {
        if (this.animationState !== 'idle') {
            console.warn(`⚠️ 路障 ${this.edgeId} 已在动画中，无法启动掉落动画`);
            return;
        }
        
        this.animationState = 'dropping';
        this.animationStartTime = Date.now();
        
        // 重置掉落动画参数，确保从屏幕上方开始
        this.dropAnimation.phase = 'falling';
        this.dropAnimation.height = -200; // 确保从屏幕上方开始
        this.dropAnimation.velocity = 0;
        this.dropAnimation.bounceHeight = 0;
        this.dropAnimation.settleShake = 0;
        this.dropAnimation.rotationOffset = 0;
        
        // 禁用同步动画系统，避免冲突
        this.fenceAnimationActive = false;
        
        // 启动动画循环
        this.startAnimationLoop();
        
        // 解析边信息用于日志
        const edgeInfo = this.parseEdgeKey(this.edgeId);
        if (edgeInfo && edgeInfo.length === 2) {
            const [edgeFromPos, edgeToPos] = edgeInfo;
            // console.log(`🎬 路障开始掉落动画，从高度${this.dropAnimation.height}掉落到边[${edgeFromPos} -> ${edgeToPos}]`);
        } else {
            //console.log(`🎬 路障 ${this.edgeId} 开始异步掉落动画`);
        }
    }
    
    /**
     * 启动异步回收飞跳动画
     */
    startAsyncRecycleAnimation(targetFromPos, targetToPos) {
        if (this.animationState !== 'idle') {
            console.warn(`⚠️ 路障 ${this.edgeId} 已在动画中，无法启动回收动画`);
            return;
        }
        
        this.animationState = 'recycling';
        this.animationStartTime = Date.now();
        
        // 设置回收动画参数
        this.recycleAnimation.progress = 0;
        this.recycleAnimation.originalPosition = {
            fromPos: [...this.currentFromPos] || [0, 0],
            toPos: [...this.currentToPos] || [0, 0]
        };
        this.recycleAnimation.targetPosition = {
            fromPos: [...targetFromPos],
            toPos: [...targetToPos]
        };
        
        // 启动动画循环
        this.startAnimationLoop();
        
        // 解析边信息用于日志
        const edgeInfo = this.parseEdgeKey(this.edgeId);
        if (edgeInfo && edgeInfo.length === 2) {
            const [fromPos, toPos] = edgeInfo;
            console.log(`🎬 路障从边[${fromPos} -> ${toPos}]飞跳到新位置[${targetFromPos} -> ${targetToPos}]，开始异步回收飞跳动画`);
        } else {
            console.log(`🎬 路障 ${this.edgeId} 开始异步回收飞跳动画`);
        }
    }
    
    /**
     * 启动动画循环
     */
    startAnimationLoop() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
        }
        
        this.animationTimer = setInterval(() => {
            this.updateAsyncAnimation();
        }, 16); // 约60FPS
    }
    
    /**
     * 停止所有动画
     */
    stopAllAnimations() {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = null;
        }
        this.animationState = 'idle';
    }
    
    /**
     * 更新异步动画
     */
    updateAsyncAnimation() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.animationStartTime;
        
        switch (this.animationState) {
            case 'dropping':
                this.updateAsyncDropAnimation(elapsed);
                break;
            case 'recycling':
                this.updateAsyncRecycleAnimation(elapsed);
                break;
            default:
                this.stopAllAnimations();
                break;
        }
    }
    
    /**
     * 更新异步掉落动画
     */
    updateAsyncDropAnimation(elapsed) {
        if (elapsed >= this.dropAnimation.duration) {
            // 动画完成，重置所有动画参数
            this.dropAnimation.height = 0;
            this.dropAnimation.rotationOffset = 0;
            this.dropAnimation.phase = 'settle';
            this.animationState = 'idle';
            this.stopAllAnimations();
            console.log(`🎬 路障 ${this.edgeId} 掉落动画完成`);
            return;
        }
        
        // 根据掉落阶段更新动画
        switch (this.dropAnimation.phase) {
            case 'falling':
                this.updateAsyncFallingPhase();
                break;
            case 'bounce':
                this.updateAsyncBouncePhase();
                break;
            case 'settle':
                this.updateAsyncSettlePhase();
                break;
        }
    }
    
    /**
     * 更新异步掉落阶段
     */
    updateAsyncFallingPhase() {
        // 重力加速掉落
        this.dropAnimation.velocity += this.dropAnimation.gravity;
        this.dropAnimation.height += this.dropAnimation.velocity;
        
        // 添加轻微旋转效果
        this.dropAnimation.rotationOffset += this.dropAnimation.rotationVelocity;
        
        // 当接近地面时，开始弹跳
        if (this.dropAnimation.height >= -10) {
            this.dropAnimation.phase = 'bounce';
            this.dropAnimation.bounceHeight = Math.abs(this.dropAnimation.velocity) * 0.4;
            this.dropAnimation.velocity = 0;
            this.dropAnimation.height = 0;
            this.dropAnimation.rotationVelocity *= 0.1;
        }
    }
    
    /**
     * 更新异步弹跳阶段
     */
    updateAsyncBouncePhase() {
        // 弹跳衰减
        this.dropAnimation.bounceHeight *= this.dropAnimation.bounceDecay;
        this.dropAnimation.height = -this.dropAnimation.bounceHeight;
        
        // 当弹跳高度很小时，进入震荡阶段
        if (this.dropAnimation.bounceHeight < 2) {
            this.dropAnimation.phase = 'settle';
            this.dropAnimation.settleShake = this.dropAnimation.bounceHeight * 2;
        }
    }
    
    /**
     * 更新异步震荡阶段
     */
    updateAsyncSettlePhase() {
        // 震荡衰减
        this.dropAnimation.settleShake *= 0.92;
        this.dropAnimation.settlePhase += 0.4;
        
        // 使用sin函数创建震荡效果
        const verticalShake = this.dropAnimation.settleShake * Math.sin(this.dropAnimation.settlePhase);
        const horizontalShake = this.dropAnimation.settleShake * 0.3 * Math.cos(this.dropAnimation.settlePhase * 1.3);
        
        this.dropAnimation.height = verticalShake;
        this.dropAnimation.rotationOffset = horizontalShake * 0.1;
        
        // 当震荡很小时，停止动画
        if (this.dropAnimation.settleShake < 0.05) {
            this.dropAnimation.height = 0;
            this.dropAnimation.rotationOffset = 0;
            this.animationState = 'idle';
            this.stopAllAnimations();
        }
    }
    
    /**
     * 更新异步回收飞跳动画
     */
    updateAsyncRecycleAnimation(elapsed) {
        if (elapsed >= this.recycleAnimation.duration) {
            // 回收动画完成
            this.dropAnimation.height = 0;
            this.dropAnimation.rotationOffset = 0;
            this.animationState = 'idle';
            this.stopAllAnimations();
            return;
        }
        
        // 计算进度（0到1）
        this.recycleAnimation.progress = elapsed / this.recycleAnimation.duration;
        
        // 使用缓动函数创建平滑的飞跳效果
        const easeProgress = this.easeInOutCubic(this.recycleAnimation.progress);
        
        // 计算飞跳高度（抛物线轨迹）
        const jumpHeight = Math.sin(easeProgress * Math.PI) * 80;
        this.dropAnimation.height = -jumpHeight;
        
        // 添加旋转效果
        this.dropAnimation.rotationOffset = Math.sin(easeProgress * Math.PI * 2) * 0.3;
    }
    
    /**
     * 触发胜利动画
     */
    triggerVictoryAnimation() {
        // 胜利动画逻辑
        this.isHighlighted = true;
        this.highlightStartTime = Date.now();
    }
    
    /**
     * 启动回收飞跳动画
     */
    startRecycleAnimation(targetFromPos, targetToPos) {
        this.isRecycling = true;
        this.recycleStartTime = Date.now();
        this.originalPosition = {
            fromPos: [...this.currentFromPos] || [0, 0],
            toPos: [...this.currentToPos] || [0, 0]
        };
        this.targetPosition = {
            fromPos: [...targetFromPos],
            toPos: [...targetToPos]
        };
        this.recycleProgress = 0;
        console.log('🚧 启动路障回收飞跳动画');
    }
    
    /**
     * 设置当前位置（用于渲染时记录）
     */
    setCurrentPosition(fromPos, toPos) {
        this.currentFromPos = [...fromPos];
        this.currentToPos = [...toPos];
    }
    
    /**
     * 更新路障动画 - 改进的物理掉落效果
     */
    update(deltaTime) {
        // 检查全局暂停状态
        if (globalPauseManager.isGamePaused()) {
            return;
        }
        
        // 如果异步动画正在运行，跳过同步动画更新
        if (this.animationState !== 'idle') {
            return;
        }
        
        // 优先处理回收动画
        if (this.isRecycling) {
            this.updateRecycleAnimation();
            return;
        }
        
        if (!this.fenceAnimationActive) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.fenceAnimationStart;
        
        if (elapsed >= this.fenceAnimationDuration) {
                // 动画完成
                this.fenceAnimationActive = false;
                this.fenceAnimationHeight = 0;
            this.dropPhase = 'settle';
            return;
        }
        
        // 根据掉落阶段更新动画
        switch (this.dropPhase) {
            case 'falling':
                this.updateFallingPhase(elapsed);
                break;
            case 'bounce':
                this.updateBouncePhase(elapsed);
                break;
            case 'settle':
                this.updateSettlePhase(elapsed);
                break;
        }
    }
    
    /**
     * 更新回收飞跳动画
     */
    updateRecycleAnimation() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.recycleStartTime;
        
        if (elapsed >= this.recycleDuration) {
            // 回收动画完成
            this.isRecycling = false;
            this.fenceAnimationHeight = 0;
            this.rotationOffset = 0;
            return;
        }
        
        // 计算进度（0到1）
        this.recycleProgress = elapsed / this.recycleDuration;
        
        // 使用缓动函数创建平滑的飞跳效果
        const easeProgress = this.easeInOutCubic(this.recycleProgress);
        
        // 计算飞跳高度（抛物线轨迹）
        const jumpHeight = Math.sin(easeProgress * Math.PI) * 80; // 最高80像素
        this.fenceAnimationHeight = -jumpHeight;
        
        // 添加旋转效果
        this.rotationOffset = Math.sin(easeProgress * Math.PI * 2) * 0.3;
    }
    
    /**
     * 缓动函数 - 三次贝塞尔曲线
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * 更新掉落阶段
     */
    updateFallingPhase(elapsed) {
        // 重力加速掉落
        this.dropVelocity += this.gravity;
        this.fenceAnimationHeight += this.dropVelocity;
        
        // 添加轻微旋转效果
        this.rotationOffset += this.rotationVelocity;
        
        // 当接近地面时，开始弹跳
        if (this.fenceAnimationHeight >= -10) {
            this.dropPhase = 'bounce';
            this.bounceHeight = Math.abs(this.dropVelocity) * 0.4; // 弹跳高度基于速度
            this.dropVelocity = 0;
            this.fenceAnimationHeight = 0;
            // 停止旋转
            this.rotationVelocity *= 0.1;
        }
    }
    
    /**
     * 更新弹跳阶段
     */
    updateBouncePhase(elapsed) {
        // 弹跳衰减
        this.bounceHeight *= this.bounceDecay;
        this.fenceAnimationHeight = -this.bounceHeight;
        
        // 当弹跳高度很小时，进入震荡阶段
        if (this.bounceHeight < 2) {
            this.dropPhase = 'settle';
            this.settleShake = this.bounceHeight * 2; // 初始震荡幅度
        }
    }
    
    /**
     * 更新震荡阶段
     */
    updateSettlePhase(elapsed) {
        // 震荡衰减
        this.settleShake *= 0.92;
        this.settlePhase += 0.4;
        
        // 使用sin函数创建震荡效果，添加轻微的水平震荡
        const verticalShake = this.settleShake * Math.sin(this.settlePhase);
        const horizontalShake = this.settleShake * 0.3 * Math.cos(this.settlePhase * 1.3);
        
        this.fenceAnimationHeight = verticalShake;
        this.rotationOffset = horizontalShake * 0.1; // 轻微旋转模拟水平震荡
        
        // 当震荡很小时，停止动画
        if (this.settleShake < 0.05) {
            this.fenceAnimationActive = false;
            this.fenceAnimationHeight = 0;
            this.rotationOffset = 0;
        }
    }
    
    /**
     * 渲染路障
     */
    render(ctx, fromPos, toPos) {
        if (!this.fenceImage || !fromPos || !toPos) {
            return;
        }
        
        // 记录当前位置（用于回收动画）
        this.setCurrentPosition(fromPos, toPos);
        
        // 计算边的中点
        const midX = (fromPos[0] + toPos[0]) / 2;
        const midY = (fromPos[1] + toPos[1]) / 2;
        
        // 计算边的角度
        const dx = toPos[0] - fromPos[0];
        const dy = toPos[1] - fromPos[1];
        const angle = Math.atan2(dy, dx);
        
        // 保存当前状态
        ctx.save();
        
        // 移动到中点并旋转
        ctx.translate(midX, midY);
        ctx.rotate(angle + this.dropAnimation.rotationOffset); // 添加掉落时的旋转效果
        
        // 应用动画高度偏移
        const yOffset = this.dropAnimation.height;
        
        // 处理闪烁效果 - 使用sin函数实现平滑闪烁
        if (this.isHighlighted) {
            const elapsed = Date.now() - this.highlightStartTime;
            // 使用sin函数，500毫秒周期，透明度在0到1之间变化
            const blinkPhase = (elapsed / this.blinkInterval) * Math.PI * 1;
            const alpha = 0.5 + 0.5 * Math.sin(blinkPhase);
            ctx.globalAlpha = Math.max(0.0, Math.min(1.0, alpha));
        } else {
            // 正常状态：完全不透明
            ctx.globalAlpha = 1.0;
        }
        
        // 绘制栅栏
        const fenceWidth = 20;
        const fenceHeight = 30;
        ctx.drawImage(
            this.fenceImage,
            -fenceWidth / 2,
            yOffset - fenceHeight / 2,
            fenceWidth,
            fenceHeight
        );
        
        // 恢复状态
        ctx.restore();
    }
    
    /**
     * 解析边键格式 - 简化版本，直接处理2层括号格式
     */
    parseEdgeKey(edgeKey) {
        // 直接处理2层括号格式：((0, 2), (0, 3))
        // 使用更简单的正则表达式
        const match = edgeKey.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
        if (match) {
            return [
                `(${match[1]}, ${match[2]})`,
                `(${match[3]}, ${match[4]})`
            ];
        }
        
        console.warn(`🚧 无法解析边键格式: ${edgeKey}`);
        return null;
    }
    
    /**
     * 获取种子随机数
     */
    getSeededRandom() {
        // 使用边ID作为种子，确保每个路障的随机性一致
        const seed = this.hashString(this.edgeId + Date.now());
        const rng = this.createSeededRandom(seed);
        return rng();
    }
    
    /**
     * 字符串哈希函数
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    
    /**
     * 创建带种子的随机数生成器
     */
    createSeededRandom(seed) {
        let m_seed = seed % 2147483647;
        if (m_seed <= 0) m_seed += 2147483646;
        
        return function() {
            m_seed = m_seed * 16807 % 2147483647;
            return (m_seed - 1) / 2147483646;
        };
    }
}
