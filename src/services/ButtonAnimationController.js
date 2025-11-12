/**
 * 按钮动画控制器
 * 管理开始按钮的所有动画效果：呼吸、悬浮、点击等
 */

export class ButtonAnimationController {
    constructor() {
        // 动画状态
        this.isVisible = false;
        this.isEnabled = true;
        this.isHovered = false;
        this.isClicked = false;
        
        // 动画参数
        this.baseScale = 0.3; // 基础缩放（2倍大小）
        this.currentScale = this.baseScale;
        this.targetScale = this.baseScale;
        
        // 呼吸动画参数
        this.breathingEnabled = true;
        this.breathingAmplitude = 0.05; // 呼吸幅度
        this.breathingSpeed = 2; // 呼吸速度（周期/秒）
        this.breathingPhase = 0; // 呼吸相位
        
        // 悬浮动画参数
        this.hoverScale = 1.1; // 悬浮时放大倍数
        this.hoverTransitionTime = 300; // 悬浮过渡时间（毫秒）
        this.hoverStartTime = 0;
        this.hoverStartScale = 0;
        
        // 点击动画参数
        this.clickScale = 0.9; // 点击时缩小倍数
        this.clickTransitionTime = 200; // 点击过渡时间（毫秒）
        this.clickStartTime = 0;
        this.clickStartScale = 0;
        
        // 动画时间
        this.lastUpdateTime = 0;
        this.animationId = null;
        
        // 缓动函数
        this.easingFunctions = {
            easeOut: (t) => 1 - Math.pow(1 - t, 3),
            easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            easeOutBack: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)
        };
    }
    
    /**
     * 设置按钮可见性
     */
    setVisible(visible) {
        this.isVisible = visible;
        if (!visible) {
            this.stopAnimation();
        } else if (this.isEnabled) {
            this.startAnimation();
        }
    }
    
    /**
     * 设置按钮启用状态
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.stopAnimation();
        } else if (this.isVisible) {
            this.startAnimation();
        }
    }
    
    /**
     * 设置悬浮状态
     */
    setHovered(hovered) {
        if (this.isHovered !== hovered) {
            this.isHovered = hovered;
            this.hoverStartTime = performance.now();
            this.hoverStartScale = this.currentScale;
            
            if (hovered) {
                this.targetScale = this.baseScale * this.hoverScale;
            } else {
                this.targetScale = this.baseScale;
            }
        }
    }
    
    /**
     * 触发点击动画
     */
    triggerClick() {
        this.isClicked = true;
        this.clickStartTime = performance.now();
        this.clickStartScale = this.currentScale;
        this.targetScale = this.baseScale * this.clickScale;
        
        // 点击动画完成后自动恢复
        setTimeout(() => {
            this.isClicked = false;
            this.targetScale = this.isHovered ? 
                this.baseScale * this.hoverScale : 
                this.baseScale;
        }, this.clickTransitionTime);
    }
    
    /**
     * 开始动画循环
     */
    startAnimation() {
        if (this.animationId) {
            return; // 已经在运行
        }
        
        this.lastUpdateTime = performance.now();
        this.animate();
    }
    
    /**
     * 停止动画循环
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * 动画更新循环
     */
    animate() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        // 更新呼吸动画
        if (this.breathingEnabled && !this.isHovered && !this.isClicked) {
            this.breathingPhase += (deltaTime / 1000) * this.breathingSpeed * Math.PI * 2;
            const breathingOffset = Math.sin(this.breathingPhase) * this.breathingAmplitude;
            this.targetScale = this.baseScale + breathingOffset;
        }
        
        // 更新悬浮动画
        if (this.isHovered && !this.isClicked) {
            const hoverProgress = Math.min(
                (currentTime - this.hoverStartTime) / this.hoverTransitionTime, 
                1
            );
            const easedProgress = this.easingFunctions.easeOut(hoverProgress);
            this.targetScale = this.hoverStartScale + 
                (this.baseScale * this.hoverScale - this.hoverStartScale) * easedProgress;
        }
        
        // 更新点击动画
        if (this.isClicked) {
            const clickProgress = Math.min(
                (currentTime - this.clickStartTime) / this.clickTransitionTime, 
                1
            );
            const easedProgress = this.easingFunctions.easeOutBack(clickProgress);
            this.targetScale = this.clickStartScale + 
                (this.baseScale * this.clickScale - this.clickStartScale) * easedProgress;
        }
        
        // 平滑过渡到目标缩放
        const scaleDiff = this.targetScale - this.currentScale;
        const scaleSpeed = 0.1; // 缩放速度
        this.currentScale += scaleDiff * scaleSpeed;
        
        // 继续动画循环
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * 获取当前缩放值
     */
    getCurrentScale() {
        return this.currentScale;
    }
    
    /**
     * 获取当前透明度（用于禁用状态）
     */
    getCurrentAlpha() {
        if (!this.isEnabled) {
            return 0.5;
        }
        if (this.isHovered) {
            return 0.9;
        }
        return 1.0;
    }
    
    /**
     * 清理资源
     */
    destroy() {
        this.stopAnimation();
    }
}
