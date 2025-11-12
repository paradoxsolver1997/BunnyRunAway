/**
 * 事件处理器 - 管理全局事件处理
 * 从 index.html 中提取的事件处理逻辑
 * 重构为智能事件分发中心，拥有事件处理的绝对垄断权
 */

import { gameEventBus } from './GameEventBus.js';

export class EventHandler {
    constructor(gameController) {
        this.gameController = gameController;
        // 🆕 修复：移除无用的Canvas和组件引用
        // Canvas事件现在由各组件直接处理
    }
    
    /**
     * 初始化全局事件处理
     */
    static initialize() {
        this.setupGlobalErrorHandling();
        console.log('✅ 事件处理器已初始化');
    }
    
    /**
     * 处理按钮点击事件
     */
    async handleButtonClick(buttonName) {
        console.log(`🎮 EventHandler: 处理按钮点击 - ${buttonName}`);
        
        // 委托给GameController的StateTransitionService处理
        if (this.gameController && this.gameController.stateTransitionService) {
            return await this.gameController.stateTransitionService.handleButtonClick(buttonName);
        } else {
            console.error('❌ EventHandler: GameController或StateTransitionService未初始化');
        }
    }
    
    /**
     * 获取当前游戏状态
     */
    getCurrentGameState() {
        if (this.gameController && this.gameController.stateTransitionService) {
            return this.gameController.stateTransitionService.getCurrentState();
        }
        return 'unknown';
    }
    
    /**
     * 设置全局错误处理
     */
    static setupGlobalErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error(`Global error: ${event.error.message}`);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error(`Unhandled Promise rejection: ${event.reason}`);
        });
    }
}
