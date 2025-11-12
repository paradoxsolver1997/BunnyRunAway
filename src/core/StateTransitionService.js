/**
 * 状态转换服务 - 事件驱动的状态转换系统
 * 简化异步调用，提供统一的状态转换接口
 */

import { gameEventBus } from './GameEventBus.js';
import { GAME_EVENTS } from './GameEvents.js';
import { GAME_CONFIG } from '../managers/ConfigManager.js';
import { CentralizedStateManager } from './CentralizedStateManager.js';

export class StateTransitionService {
    constructor() {
        this.stateManager = new CentralizedStateManager();
        this.eventHandlers = new Map();
        
        this.setupEventHandlers();
        // console.log('🎯 StateTransitionService initialized');
    }
    
    /**
     * 设置游戏控制器引用
     */
    setGameController(gameController) {
        this.gameController = gameController; // 🆕 添加：保存gameController引用
        this.stateManager.setGameController(gameController);
    }
    
    /**
     * 设置暂停管理器引用
     */
    setPauseManager(pauseManager) {
        this.stateManager.setPauseManager(pauseManager);
    }
    
    /**
     * 设置 STOP_OK 标志位 - 公共接口
     */
    setStopOk(value) {
        this.stateManager.setStopOk(value);
    }
    
    /**
     * 设置事件处理器
     */
    setupEventHandlers() {
        // 倒计时完成事件
        this.addEventHandler('countdown_finished', () => {
            this.stateManager.startRunning();
        });
        
        // 游戏结束事件 - 已移除，现在直接通过 gameOver() 方法处理
        // this.addEventHandler('game_over', (data) => {
        //     this.stateManager.gameOver(data?.winner || 'Player');
        // });
        
        // 用户停止游戏事件
        this.addEventHandler('user_stop_game', () => {
            this.stateManager.stopGame();
        });
        
        // 暂停游戏事件
        this.addEventHandler('pause_game', () => {
            this.stateManager.pauseGame();
        });
        
        // 恢复游戏事件
        this.addEventHandler('resume_game', () => {
            this.stateManager.resumeGame();
        });
        
        // 开始游戏事件
        this.addEventHandler('start_game', () => {
            this.stateManager.startGame();
        });
        
        // 重新开始游戏事件
        this.addEventHandler('restart_game', () => {
            this.stateManager.restartGame();
        });
        
        // 胜利对话框事件
        this.addEventHandler('victory_continue_current', () => {
            this.stateManager.transitionTo(this.stateManager.states.INITIAL);
        });
        
        this.addEventHandler('victory_try_next_map', () => {
            this.handleTryNextMap();
        });
    }
    
    /**
     * 添加事件处理器
     */
    addEventHandler(eventName, handler) {
        const listenerId = gameEventBus.on(eventName, handler);
        this.eventHandlers.set(eventName, listenerId);
        // console.log(`✅ 事件处理器注册成功: ${eventName}, ID: ${listenerId}`);
    }
    
    /**
     * 移除事件处理器
     */
    removeEventHandler(eventName) {
        const listenerId = this.eventHandlers.get(eventName);
        if (listenerId) {
            gameEventBus.off(eventName, listenerId);
            this.eventHandlers.delete(eventName);
        }
    }
    
    // ========== 统一的状态转换接口 ==========
    
    /**
     * 统一的状态转换方法
     */
    async transitionTo(newState, context = {}) {
        return await this.stateManager.transitionTo(newState, context);
    }
    
    /**
     * 检查是否可以转换到指定状态
     */
    canTransitionTo(newState) {
        return this.stateManager.canTransitionTo(newState);
    }
    
    /**
     * 获取当前状态
     */
    getCurrentState() {
        return this.stateManager.getCurrentState();
    }
    
    // ========== 便捷的状态转换方法 ==========
    
    async startGame() {
        return await this.stateManager.startGame();
    }
    
    async startRunning() {
        return await this.stateManager.startRunning();
    }
    
    async pauseGame() {
        return await this.stateManager.pauseGame();
    }
    
    async resumeGame() {
        return await this.stateManager.resumeGame();
    }
    
    async stopGame() {
        return await this.stateManager.stopGame();
    }
    
    async gameOver(winner = 'Player') {
        return await this.stateManager.gameOver(winner);
    }
    
    async restartGame() {
        return await this.stateManager.restartGame();
    }
    
    // ========== 状态查询方法 ==========
    
    isInitial() {
        return this.stateManager.isInitial();
    }
    
    isCountdown() {
        return this.stateManager.isCountdown();
    }
    
    isRunning() {
        return this.stateManager.isRunning();
    }
    
    isPaused() {
        return this.stateManager.isPaused();
    }
    
    isGameOver() {
        return this.stateManager.isGameOver();
    }
    
    isTransitioning() {
        return this.stateManager.isTransitioning();
    }
    
    // ========== 按钮处理逻辑 ==========
    
    /**
     * 处理按钮点击事件
     */
    async handleButtonClick(buttonName) {
        return await this.stateManager.handleButtonClick(buttonName);
    }
    
    /**
     * 获取按钮文本
     */
    getButtonText(buttonName) {
        return this.stateManager.getButtonText(buttonName);
    }
    
    // ========== 事件发布方法 ==========
    
    /**
     * 发布倒计时完成事件
     */
    emitCountdownFinished() {
        gameEventBus.emit('countdown_finished');
    }
    
    /**
     * 直接处理游戏结束 - 性能优化版本
     * 绕过事件总线，直接调用状态管理器，然后发布事件保持兼容性
     */
    async gameOver(winner) {
        console.log(`🎮 StateTransitionService: 直接处理游戏结束 - 获胜者: ${winner}`);
        console.log('🎮 StateTransitionService: 检查音效播放条件', {
            hasGameController: !!this.gameController,
            hasPlayGameOverSounds: !!(this.gameController && this.gameController.playGameOverSounds),
            winner,
            playerWon: winner === 'player' || winner === 'Player'
        });
        
        // 🆕 添加：播放游戏结束音效
        if (this.gameController && this.gameController.playGameOverSounds) {
            const playerWon = winner === 'player' || winner === 'Player';
            console.log(`🎵 StateTransitionService: 准备播放音效 - playerWon: ${playerWon}`);
            await this.gameController.playGameOverSounds(playerWon);
            console.log('🎵 StateTransitionService: 音效播放调用完成');
        } else {
            console.warn('⚠️ StateTransitionService: 无法播放音效', {
                hasGameController: !!this.gameController,
                hasPlayGameOverSounds: !!(this.gameController && this.gameController.playGameOverSounds)
            });
        }
        
        // 1. 直接执行状态转换（性能优化）
        const result = await this.stateManager.gameOver(winner);
        
        // 2. 发布事件（保持解耦和兼容性）
        gameEventBus.emit(GAME_EVENTS.GAME_OVER, { winner });
        
        return result;
    }
    
    /**
     * 发布游戏结束事件 - 保留用于向后兼容
     */
    emitGameOver(winner) {
        gameEventBus.emit(GAME_EVENTS.GAME_OVER, { winner });
    }
    
    /**
     * 发布用户停止游戏事件
     */
    emitUserStopGame() {
        gameEventBus.emit('user_stop_game');
    }
    
    /**
     * 发布暂停游戏事件
     */
    emitPauseGame() {
        gameEventBus.emit('pause_game');
    }
    
    /**
     * 发布恢复游戏事件
     */
    emitResumeGame() {
        gameEventBus.emit('resume_game');
    }
    
    /**
     * 发布开始游戏事件
     */
    emitStartGame() {
        gameEventBus.emit('start_game');
    }
    
    /**
     * 发布重新开始游戏事件
     */
    emitRestartGame() {
        gameEventBus.emit('restart_game');
    }
    
    /**
     * 处理尝试下一张地图的逻辑
     */
    async handleTryNextMap() {
        // console.log('🗺️ 处理尝试下一张地图事件');
        
        // 检查是否可以切换到下一张地图
        if (this.stateManager.gameController && this.stateManager.gameController.gameEngine) {
            const currentMapNumber = this.stateManager.gameController.gameEngine.getCurrentMapNumber();
            const maxMapNumber = this.stateManager.gameController.MAX_MAP_NUMBER || GAME_CONFIG.MAX_MAP_NUMBER;
            
            // console.log(`🔍 DEBUG: 当前地图编号 = ${currentMapNumber}, 最大地图编号 = ${maxMapNumber}`);
            // console.log(`🔍 DEBUG: GameController.currentMapNumber = ${this.stateManager.gameController.currentMapNumber}`);
            
            if (currentMapNumber < maxMapNumber) {
                // 可以切换到下一张地图
                const nextMapNumber = currentMapNumber + 1;
                // console.log(`🗺️ 切换到下一张地图: ${nextMapNumber}`);
                
                // 更新地图编号
                // console.log(`🔍 DEBUG: 更新前 - GameEngine.mapService.currentMapNumber = ${this.stateManager.gameController.gameEngine.getCurrentMapNumber()}`);
                this.stateManager.gameController.gameEngine.setMapNumber(nextMapNumber);
                // console.log(`🔍 DEBUG: 更新后 - GameEngine.mapService.currentMapNumber = ${this.stateManager.gameController.gameEngine.getCurrentMapNumber()}`);
                
                // console.log(`🔍 DEBUG: 更新前 - GameController.currentMapNumber = ${this.stateManager.gameController.currentMapNumber}`);
                this.stateManager.gameController.currentMapNumber = nextMapNumber;
                // console.log(`🔍 DEBUG: 更新后 - GameController.currentMapNumber = ${this.stateManager.gameController.currentMapNumber}`);
                
                // 转换到初始状态，让状态机处理地图加载
                const context = {
                    mapNumber: nextMapNumber,
                    reason: 'victory_try_next_map'
                };
                // console.log(`🔍 DEBUG: 准备调用 transitionTo(INITIAL, context)`, context);
                
                await this.stateManager.transitionTo(this.stateManager.states.INITIAL, context);
                // console.log(`🔍 DEBUG: transitionTo(INITIAL) 调用完成`);
            } else {
                // 已经是最后一张地图，只重置到初始状态
                // console.log('⚠️ 已经是最后一张地图，只重置到初始状态');
                await this.stateManager.transitionTo(this.stateManager.states.INITIAL);
            }
        } else {
            console.error('❌ GameController 引用不存在，无法处理下一张地图');
        }
    }
    
    // ========== 重置和清理 ==========
    
    /**
     * 重置状态转换服务
     */
    reset() {
        this.stateManager.reset();
    }
    
    /**
     * 销毁状态转换服务
     */
    destroy() {
        // 移除所有事件处理器
        for (const eventName of this.eventHandlers.keys()) {
            this.removeEventHandler(eventName);
        }
        
        // 重置状态管理器
        this.stateManager.reset();
        
        // console.log('🗑️ StateTransitionService destroyed');
    }
}

// 默认导出
export default StateTransitionService;
