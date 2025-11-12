/**
 * 倒计时管理器 - 仿照Python原版的倒计时系统
 * 
 * 负责游戏开始前的3-2-1倒计时显示
 */

import { createError, handleError, ErrorTypes, ErrorSeverity } from '../utils/ErrorHandler.js';

export class CountdownService {
    constructor(assetManager = null) {
        this.assetManager = assetManager;
        this.isActive = false;
        this.currentNumber = 3;
        this.duration = 3.0; // 总倒计时时间（秒）
        this.numberDuration = 1.0; // 每个数字显示时间（秒）
        this.timer = 0;
        this.sequence = [3, 2, 1];
        this.currentIndex = 0;
        
        // 倒计时配置
        this.config = {
            numberSize: 320,
            position: { x: 450, y: 300 }, // 屏幕中心（将在渲染时动态计算）
            font: 'bold 320px Arial',
            color: '#FFFFFF',
            strokeColor: '#000000',
            strokeWidth: 8,
            backgroundOverlay: {
                enabled: true,
                color: 'rgba(0, 0, 0, 0.5)',
                coverGameAreaOnly: true
            },
            animation: {
                expandDuration: 0.3,
                holdDuration: 0.5,
                shrinkDuration: 0.2,
                startScale: 0.0,
                targetScale: 1.0,
                startAlpha: 0,
                targetAlpha: 1.0
            }
        };
        
        // 动画状态
        this.animationState = {
            phase: 'expand', // expand, hold, shrink
            progress: 0,
            scale: 0,
            alpha: 0
        };
        
        // 回调函数
        this.onCountdownFinished = null;
        this.onNumberChanged = null;
    }
    
    /**
     * 开始倒计时
     */
    startCountdown() {
        if (this.isActive) {
            console.log('⚠️ 倒计时已经在运行，跳过启动');
            return;
        }
        
        this.isActive = true;
        this.currentIndex = 0;
        this.currentNumber = this.sequence[0];
        this.timer = 0;
        this.animationState = {
            phase: 'expand',
            progress: 0,
            scale: this.config.animation.startScale,
            alpha: this.config.animation.startAlpha
        };
        
        console.log('倒计时开始');
        
        // 触发数字变化回调
        if (this.onNumberChanged) {
            this.onNumberChanged(this.currentNumber);
        }
    }
    
    /**
     * 停止倒计时
     */
    stopCountdown() {
        this.isActive = false;
        console.log('倒计时停止');
    }
    
    /**
     * 更新倒计时
     */
    update(deltaTime) {
        if (!this.isActive) {
            return false;
        }
        
        this.timer += deltaTime;
        
        // 更新动画
        this.updateAnimation(deltaTime);
        
        // 检查是否需要切换到下一个数字
        if (this.timer >= this.numberDuration) {
            this.timer = 0;
            this.currentIndex++;
            
            if (this.currentIndex >= this.sequence.length) {
                // 倒计时完成
                this.isActive = false;
                if (this.onCountdownFinished) {
                    this.onCountdownFinished();
                }
                return true;
            } else {
                // 切换到下一个数字
                this.currentNumber = this.sequence[this.currentIndex];
                this.animationState = {
                    phase: 'expand',
                    progress: 0,
                    scale: this.config.animation.startScale,
                    alpha: this.config.animation.startAlpha
                };
                
                // 触发数字变化回调
                if (this.onNumberChanged) {
                    this.onNumberChanged(this.currentNumber);
                }
            }
        }
        
        return false;
    }
    
    /**
     * 更新动画状态
     */
    updateAnimation(deltaTime) {
        const anim = this.config.animation;
        const state = this.animationState;
        
        switch (state.phase) {
            case 'expand':
                state.progress += deltaTime / anim.expandDuration;
                if (state.progress >= 1.0) {
                    state.progress = 1.0;
                    state.phase = 'hold';
                }
                break;
                
            case 'hold':
                state.progress += deltaTime / anim.holdDuration;
                if (state.progress >= 1.0) {
                    state.progress = 1.0;
                    state.phase = 'shrink';
                }
                break;
                
            case 'shrink':
                state.progress += deltaTime / anim.shrinkDuration;
                if (state.progress >= 1.0) {
                    state.progress = 1.0;
                }
                break;
        }
        
        // 计算当前缩放和透明度
        if (state.phase === 'expand') {
            // 展开阶段：从0到1
            state.scale = anim.startScale + (anim.targetScale - anim.startScale) * state.progress;
            state.alpha = anim.startAlpha + (anim.targetAlpha - anim.startAlpha) * state.progress;
        } else if (state.phase === 'hold') {
            // 保持阶段：保持最大值
            state.scale = anim.targetScale;
            state.alpha = anim.targetAlpha;
        } else if (state.phase === 'shrink') {
            // 收缩阶段：从1到0
            state.scale = anim.targetScale - (anim.targetScale - anim.startScale) * state.progress;
            state.alpha = anim.targetAlpha - (anim.targetAlpha - anim.startAlpha) * state.progress;
        }
    }
    
    /**
     * 渲染倒计时
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.isActive) {
            return;
        }
        
        // 绘制背景遮罩
        if (this.config.backgroundOverlay.enabled) {
            ctx.save();
            ctx.fillStyle = this.config.backgroundOverlay.color;
            
            if (this.config.backgroundOverlay.coverGameAreaOnly) {
                // 只覆盖游戏区域（使用实际的Canvas尺寸）
                const gameAreaX = 0;
                const gameAreaY = 0;
                const gameAreaWidth = canvasWidth;
                const gameAreaHeight = canvasHeight;
                ctx.fillRect(gameAreaX, gameAreaY, gameAreaWidth, gameAreaHeight);
            } else {
                // 覆盖整个屏幕
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            ctx.restore();
        }
        
        // 绘制倒计时数字
        ctx.save();
        
        // 设置透明度
        ctx.globalAlpha = this.animationState.alpha;
        
        // 计算中心位置（动态居中）
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // 移动到中心位置
        ctx.translate(centerX, centerY);
        
        // 应用缩放
        ctx.scale(this.animationState.scale, this.animationState.scale);
        
        // 获取数字图片
        const numberImage = this.assetManager ? this.assetManager.getNumberImage(this.currentNumber) : null;
        
        if (numberImage) {
            // 使用图片绘制数字
            const imageWidth = this.config.numberSize;
            const imageHeight = this.config.numberSize;
            const imageX = -imageWidth / 2;
            const imageY = -imageHeight / 2;
            
            ctx.drawImage(numberImage, imageX, imageY, imageWidth, imageHeight);
        } else {
            // 回退到文字渲染（如果图片不可用）
            ctx.font = this.config.font;
            ctx.fillStyle = this.config.color;
            ctx.strokeStyle = this.config.strokeColor;
            ctx.lineWidth = this.config.strokeWidth;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 绘制数字（带描边）
            const text = this.currentNumber.toString();
            ctx.strokeText(text, 0, 0);
            ctx.fillText(text, 0, 0);
        }
        
        ctx.restore();
    }
    
    /**
     * 设置倒计时完成回调
     */
    setOnCountdownFinished(callback) {
        this.onCountdownFinished = callback;
    }
    
    /**
     * 设置数字变化回调
     */
    setOnNumberChanged(callback) {
        this.onNumberChanged = callback;
    }
    
    /**
     * 获取当前倒计时状态
     */
    getStatus() {
        return {
            isActive: this.isActive,
            currentNumber: this.currentNumber,
            currentIndex: this.currentIndex,
            progress: this.timer / this.numberDuration,
            animationState: { ...this.animationState }
        };
    }
    
    /**
     * 重置倒计时
     */
    reset() {
        this.isActive = false;
        this.currentIndex = 0;
        this.currentNumber = this.sequence[0];
        this.timer = 0;
        this.animationState = {
            phase: 'expand',
            progress: 0,
            scale: this.config.animation.startScale,
            alpha: this.config.animation.startAlpha
        };
    }
}

// 默认导出
export default CountdownService;