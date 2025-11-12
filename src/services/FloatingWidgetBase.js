/**
 * 泛化悬浮小组件基类
 * 提供完全受状态机控制的生命周期管理
 * 支持零污染销毁和自动资源清理
 */

import { gameEventBus } from '../core/GameEventBus.js';

export class FloatingWidgetBase {
    constructor(stateTransitionService, canvas, assetLoader) {
        this.stateTransitionService = stateTransitionService;
        this.canvas = canvas;
        this.assetLoader = assetLoader;
        
        // 组件状态
        this.isActive = false;
        this.isVisible = false;
        this.isInteractive = false;
        
        // 事件监听器引用（用于自动清理）
        this.eventListeners = new Map();
        
        // 动画定时器引用（用于自动清理）
        this.animationTimers = new Set();
        
        // 渲染状态
        this.renderState = {
            alpha: 1.0,
            scale: 1.0,
            hovered: false,
            clicked: false
        };
        
        console.log('🏗️ FloatingWidgetBase: 基类初始化完成');
    }
    
    /**
     * 创建组件（由状态机调用）
     */
    create() {
        if (this.isActive) {
            console.warn('⚠️ FloatingWidgetBase: 组件已激活，跳过创建');
            return;
        }
        
        console.log('🏗️ FloatingWidgetBase: 开始创建组件');
        
        // 设置激活状态
        this.isActive = true;
        this.isVisible = this.shouldShow();
        this.isInteractive = this.canInteract();
        
        // 初始化组件
        this.onCreate();
        
        // 设置事件监听器
        this.setupEventListeners();
        
        console.log('✅ FloatingWidgetBase: 组件创建完成');
    }
    
    /**
     * 销毁组件（由状态机调用）
     */
    destroy() {
        if (!this.isActive) {
            console.warn('⚠️ FloatingWidgetBase: 组件未激活，跳过销毁');
            return;
        }
        
        console.log('🏗️ FloatingWidgetBase: 开始销毁组件');
        
        // 清理事件监听器
        this.cleanupEventListeners();
        
        // 清理动画定时器
        this.cleanupAnimationTimers();
        
        // 组件销毁前处理
        this.onDestroy();
        
        // 重置状态
        this.isActive = false;
        this.isVisible = false;
        this.isInteractive = false;
        
        // 清理引用
        this.eventListeners.clear();
        this.animationTimers.clear();
        
        console.log('✅ FloatingWidgetBase: 组件销毁完成，零污染');
    }
    
    /**
     * 更新组件状态
     */
    update() {
        if (!this.isActive) {
            return;
        }
        
        // 检查可见性
        const shouldShow = this.shouldShow();
        if (this.isVisible !== shouldShow) {
            this.isVisible = shouldShow;
            this.onVisibilityChange(shouldShow);
        }
        
        // 检查交互性
        const canInteract = this.canInteract();
        if (this.isInteractive !== canInteract) {
            this.isInteractive = canInteract;
            this.onInteractivityChange(canInteract);
        }
        
        // 更新渲染状态
        this.updateRenderState();
    }
    
    /**
     * 渲染组件
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.isActive || !this.isVisible) {
            return;
        }
        
        this.onRender(ctx, canvasWidth, canvasHeight);
    }
    
    /**
     * 检查是否应该显示（子类重写）
     */
    shouldShow() {
        // 默认实现：检查状态机
        if (!this.stateTransitionService) {
            return false;
        }
        
        // 子类应该重写此方法
        return false;
    }
    
    /**
     * 检查是否可以交互（子类重写）
     */
    canInteract() {
        // 默认实现：只有在显示且未禁用时才能交互
        return this.isVisible && !this.isDisabled();
    }
    
    /**
     * 检查是否被禁用（子类重写）
     */
    isDisabled() {
        // 子类应该重写此方法
        return false;
    }
    
    /**
     * 设置事件监听器（子类重写）
     */
    setupEventListeners() {
        // 子类应该重写此方法
        console.log('🏗️ FloatingWidgetBase: 设置事件监听器（子类重写）');
    }
    
    /**
     * 清理事件监听器
     */
    cleanupEventListeners() {
        console.log('🧹 FloatingWidgetBase: 清理事件监听器');
        
        // 清理DOM事件监听器
        for (const [element, listeners] of this.eventListeners) {
            for (const [event, handler] of listeners) {
                element.removeEventListener(event, handler);
            }
        }
        
        this.eventListeners.clear();
        
        // 清理事件总线监听器（如果存在）
        if (this.eventBusListeners) {
            console.log('🧹 FloatingWidgetBase: 清理事件总线监听器');
            for (const listenerId of this.eventBusListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.eventBusListeners.clear();
        }
    }
    
    /**
     * 清理动画定时器
     */
    cleanupAnimationTimers() {
        console.log('🧹 FloatingWidgetBase: 清理动画定时器');
        
        for (const timer of this.animationTimers) {
            clearTimeout(timer);
            clearInterval(timer);
        }
        
        this.animationTimers.clear();
    }
    
    /**
     * 添加事件监听器（自动管理）
     */
    addEventListener(element, event, handler) {
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, new Map());
        }
        
        this.eventListeners.get(element).set(event, handler);
        element.addEventListener(event, handler);
    }
    
    /**
     * 添加动画定时器（自动管理）
     */
    addAnimationTimer(timer) {
        this.animationTimers.add(timer);
        return timer;
    }
    
    /**
     * 更新渲染状态
     */
    updateRenderState() {
        // 子类可以重写此方法来自定义渲染状态更新
    }
    
    // 子类需要重写的钩子方法
    
    /**
     * 组件创建时调用（子类重写）
     */
    onCreate() {
        console.log('🏗️ FloatingWidgetBase: onCreate（子类重写）');
    }
    
    /**
     * 组件销毁时调用（子类重写）
     */
    onDestroy() {
        console.log('🏗️ FloatingWidgetBase: onDestroy（子类重写）');
    }
    
    /**
     * 可见性变化时调用（子类重写）
     */
    onVisibilityChange(visible) {
        console.log(`🏗️ FloatingWidgetBase: 可见性变化: ${visible}`);
    }
    
    /**
     * 交互性变化时调用（子类重写）
     */
    onInteractivityChange(interactive) {
        console.log(`🏗️ FloatingWidgetBase: 交互性变化: ${interactive}`);
    }
    
    /**
     * 渲染时调用（子类重写）
     */
    onRender(ctx, canvasWidth, canvasHeight) {
        console.log('🏗️ FloatingWidgetBase: onRender（子类重写）');
    }
}

// 默认导出
export default FloatingWidgetBase;
