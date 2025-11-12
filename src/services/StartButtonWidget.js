/**
 * 开始按钮图片组件
 * 继承自FloatingWidgetBase，完全沙箱化
 * 只在initial状态下存在，其他状态下完全消失
 * 重构为事件接收者模式，监听 start_game 事件
 */

import { FloatingWidgetBase } from './FloatingWidgetBase.js';
import { gameEventBus } from '../core/GameEventBus.js';

export class StartButtonWidget extends FloatingWidgetBase {
    constructor(stateTransitionService, canvas, assetLoader, gameController) {
        super(stateTransitionService, canvas, assetLoader);
        
        // 🆕 优化：保存 GameController 引用用于渲染请求
        this.gameController = gameController;
        
        // 按钮配置
        this.buttonConfig = {
            originalWidth: 822,
            originalHeight: 450,
            scale: 0.3,
            centerOffsetY: 50
        };
        
        // 动画状态
        this.animationState = {
            hoverScale: 1.05,
            clickScale: 0.95,
            fadeInDuration: 300,
            fadeOutDuration: 200
        };
        
        console.log('🎮 StartButtonWidget: 图片按钮组件初始化完成');
    }
    
    /**
     * 检查是否应该显示
     */
    shouldShow() {
        if (!this.stateTransitionService) {
            return false;
        }
        
        // 只有在initial状态下才显示
        return this.stateTransitionService.isInitial();
    }
    
    /**
     * 检查是否被禁用
     */
    isDisabled() {
        if (!this.stateTransitionService) {
            return true;
        }
        
        // 在倒计时期间按钮应该被禁用
        return this.stateTransitionService.isCountdown();
    }
    
    /**
     * 组件创建时调用
     */
    onCreate() {
        console.log('🎮 StartButtonWidget: 开始创建图片按钮');
        
        // 设置鼠标样式
        this.updateMouseCursor(false);
        
        console.log('✅ StartButtonWidget: 图片按钮创建完成');
    }
    
    /**
     * 组件销毁时调用
     */
    onDestroy() {
        console.log('🎮 StartButtonWidget: 开始销毁图片按钮');
        
        // 清理鼠标样式
        this.updateMouseCursor(false);
        
        // 重置动画状态
        this.renderState.alpha = 1.0;
        this.renderState.scale = 1.0;
        this.renderState.hovered = false;
        this.renderState.clicked = false;
        
        console.log('✅ StartButtonWidget: 图片按钮销毁完成');
    }
    
    /**
     * 设置事件监听器 - 添加直接Canvas点击处理
     */
    setupEventListeners() {
        // console.log('🎮 StartButtonWidget: 设置事件监听器（直接Canvas点击模式）'); // 调试日志
        
        // 防止重复注册：先清理现有监听器
        if (this.eventBusListeners && this.eventBusListeners.size > 0) {
            // console.log('🧹 StartButtonWidget: 清理现有事件总线监听器，防止重复注册'); // 调试日志
            this.cleanupEventBusListeners();
        }
        
        // 🆕 添加直接Canvas点击处理
        this.setupCanvasClickHandler();
        
        // 🆕 添加直接Canvas鼠标移动处理
        this.setupCanvasMouseMoveHandler();
        
        // 注意：点击和鼠标移动事件现在都由 StartButtonWidget 直接处理
    }
    
    /**
     * 设置Canvas点击事件处理 - 从 EventHandler 搬运过来
     */
    setupCanvasClickHandler() {
        if (!this.canvas) {
            console.error('🎮 StartButtonWidget: Canvas 未初始化');
            return;
        }
        
        // 先清理旧的事件监听器，防止重复注册
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        
        // 绑定新的事件监听器
        this.canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });
        
        console.log('✅ StartButtonWidget: Canvas点击事件已设置（直接处理模式）');
    }
    
    /**
     * 处理Canvas点击事件 - 从 EventHandler 搬运过来
     */
    handleCanvasClick(event) {
        // 1. 状态检查：只有在 initial 状态下才处理
        if (!this.stateTransitionService || !this.stateTransitionService.isInitial()) {
            return;
        }
        
        // 2. 获取Canvas坐标
        const coords = this.getCanvasCoordinates(event);
        
        // 3. 检查是否在按钮区域内
        if (this.isPointInButton(coords.x, coords.y)) {
            console.log('🎮 StartButtonWidget: 检测到按钮点击');
            this.onStartGameEvent();
        }
    }
    
    /**
     * 设置Canvas鼠标移动事件处理 - 从 EventHandler 搬运过来
     */
    setupCanvasMouseMoveHandler() {
        if (!this.canvas) {
            console.error('🎮 StartButtonWidget: Canvas 未初始化');
            return;
        }
        
        // 先清理旧的事件监听器，防止重复注册
        this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
        
        // 绑定新的事件监听器
        this.canvas.addEventListener('mousemove', (event) => {
            this.handleCanvasMouseMove(event);
        });
        
        console.log('✅ StartButtonWidget: Canvas鼠标移动事件已设置（直接处理模式）');
    }
    
    /**
     * 处理Canvas鼠标移动事件 - 从 EventHandler 搬运过来
     */
    handleCanvasMouseMove(event) {
        // 1. 状态检查：只有在 initial 状态下才处理
        if (!this.stateTransitionService || !this.stateTransitionService.isInitial()) {
            return;
        }
        
        // 2. 调用现有的悬浮效果处理逻辑
        this.handleMouseMove(event);
    }
    
    /**
     * 获取Canvas坐标 - 从 EventHandler 搬运过来
     */
    getCanvasCoordinates(event) {
        // 空指针检查
        if (!this.canvas) {
            console.error('🎮 StartButtonWidget: Canvas 未初始化');
            return { x: 0, y: 0 };
        }
        
        if (!event) {
            console.error('🎮 StartButtonWidget: 事件对象为空');
            return { x: 0, y: 0 };
        }
        
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        } catch (error) {
            console.error('🎮 StartButtonWidget: 获取Canvas坐标失败:', error);
            return { x: 0, y: 0 };
        }
    }
    
    /**
     * 处理 start_game 事件
     */
    onStartGameEvent() {
        // console.log('🎮 StartButtonWidget: 接收到 start_game 事件'); // 调试日志
        
        // 触发点击动画
        this.triggerClickAnimation();
        
        // 处理按钮点击逻辑
        this.onButtonClick();
    }
    
    // 注意：handleClick 方法已移除，现在使用事件接收者模式
    // 点击事件由 EventHandler 智能分发，通过 start_game 事件触发
    
    /**
     * 清理事件总线监听器
     */
    cleanupEventBusListeners() {
        if (this.eventBusListeners && this.eventBusListeners.size > 0) {
            // console.log('🧹 StartButtonWidget: 清理事件总线监听器'); // 调试日志
            for (const listenerId of this.eventBusListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.eventBusListeners.clear();
            // console.log('✅ StartButtonWidget: 事件总线监听器已清理'); // 调试日志
        }
    }
    
    /**
     * 处理鼠标移动事件
     */
    handleMouseMove(event) {
        // 严格的状态检查
        if (!this.isActive || !this.isVisible) {
            return;
        }
        
        // 双重检查：确保状态机状态正确
        if (!this.stateTransitionService || !this.stateTransitionService.isInitial()) {
            return;
        }
        
        // 获取鼠标坐标
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 检查是否悬浮在按钮上
        const isHovering = this.isPointInButton(x, y);
        
        if (this.renderState.hovered !== isHovering) {
            this.renderState.hovered = isHovering;
            this.updateMouseCursor(isHovering);
            this.onHoverChange(isHovering);
        }
    }
    
    /**
     * 检查点是否在按钮内
     */
    isPointInButton(x, y) {
        const bounds = this.getButtonBounds();
        return x >= bounds.x && 
               x <= bounds.x + bounds.width &&
               y >= bounds.y && 
               y <= bounds.y + bounds.height;
    }
    
    /**
     * 获取按钮边界
     */
    getButtonBounds() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // 按钮位置：画布中心偏下
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        // 按钮尺寸：基于原图比例缩放
        const width = Math.round(this.buttonConfig.originalWidth * this.buttonConfig.scale);
        const height = Math.round(this.buttonConfig.originalHeight * this.buttonConfig.scale);
        
        return {
            x: centerX - width / 2,
            y: centerY + this.buttonConfig.centerOffsetY,
            width: width,
            height: height,
            centerX: centerX,
            centerY: centerY + this.buttonConfig.centerOffsetY
        };
    }
    
    /**
     * 更新鼠标光标
     */
    updateMouseCursor(isHovering) {
        if (this.canvas) {
            this.canvas.style.cursor = isHovering ? 'pointer' : 'default';
        }
    }
    
    /**
     * 触发点击动画
     */
    triggerClickAnimation() {
        this.renderState.clicked = true;
        
        // 点击动画：快速缩放
        const originalScale = this.renderState.scale;
        this.renderState.scale = this.animationState.clickScale;
        
        // 🆕 优化：请求重新渲染
        this.requestRender();
        
        // 恢复动画
        this.addAnimationTimer(setTimeout(() => {
            this.renderState.scale = originalScale;
            this.renderState.clicked = false;
            // 🆕 优化：恢复时也请求重新渲染
            this.requestRender();
        }, 150));
    }
    
    /**
     * 悬浮状态变化
     */
    onHoverChange(hovered) {
        if (hovered) {
            this.renderState.scale = this.animationState.hoverScale;
        } else {
            this.renderState.scale = 1.0;
        }
        
        // 🆕 优化：请求重新渲染
        this.requestRender();
    }
    
    /**
     * 按钮点击处理
     */
    onButtonClick() {
        // 委托给状态管理器处理，复用HTML按钮的逻辑
        if (this.stateTransitionService) {
            try {
                this.stateTransitionService.handleButtonClick('unifiedGameBtn');
            } catch (error) {
                console.error('❌ StartButtonWidget: 按钮点击处理失败:', error);
            }
        } else {
            console.warn('⚠️ StartButtonWidget: 状态管理器未初始化');
        }
    }
    
    /**
     * 渲染组件
     */
    onRender(ctx, canvasWidth, canvasHeight) {
        if (!this.isActive || !this.isVisible) {
            return;
        }
        
        // 获取开始按钮图片
        const startButtonImage = this.assetLoader.getImage('start_button');
        if (!startButtonImage) {
            return; // 图片未加载，不渲染
        }
        
        // 计算按钮位置和尺寸
        const bounds = this.getButtonBounds();
        
        // 保存当前状态
        ctx.save();
        
        // 应用透明度
        ctx.globalAlpha = this.renderState.alpha;
        
        // 应用缩放变换
        const centerX = bounds.centerX;
        const centerY = bounds.centerY;
        
        ctx.translate(centerX, centerY);
        ctx.scale(this.renderState.scale, this.renderState.scale);
        ctx.translate(-centerX, -centerY);
        
        // 绘制按钮图片
        ctx.drawImage(
            startButtonImage,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height
        );
        
        // 恢复状态
        ctx.restore();
    }
    
    /**
     * 🆕 优化：请求重新渲染（用于按钮交互）
     */
    requestRender() {
        if (this.gameController && this.gameController.requestRender) {
            this.gameController.requestRender();
        }
    }
}

// 默认导出
export default StartButtonWidget;
