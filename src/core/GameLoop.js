/**
 * 游戏循环管理器 - 管理游戏的主循环
 * 从GameController中分离出来的游戏循环功能
 */

import { globalPauseManager } from './PauseManager.js';
import { gameEventBus } from './GameEventBus.js';
import { GAME_EVENTS } from './GameEvents.js';

export class GameLoop {
    constructor(gameController) {
        this.gameController = gameController;
        this.isRunning = false;
        this.lastTime = 0;
        
        // 事件驱动的暂停状态（新增，作为备用机制）
        this.isPausedByEvent = false;
        
        // 设置事件监听器（保守迁移：保持原有逻辑）
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        gameEventBus.on(GAME_EVENTS.GAME_PAUSE, () => {
            this.isPausedByEvent = true;
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_RESUME, () => {
            this.isPausedByEvent = false;
        });
    }
    
    
    /**
     * 开始游戏循环
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ GameLoop already running, skipping start');
            return;
        }
        this.isRunning = true;
        this.gameLoop();
    }
    
    /**
     * 停止游戏循环
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * 游戏主循环
     */
    async gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - (this.lastTime || currentTime)) / 1000;
        this.lastTime = currentTime;
        
        await this.update(deltaTime);
        this.gameController.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * 更新游戏状态
     */
    async update(deltaTime) {
        // 检查全局暂停状态
        if (globalPauseManager.isGamePaused() || this.isPausedByEvent) {
            this.updateUIOnly();
            return;
        }
        
        if (!this.gameController.gameEngine) {
            return;
        }
        
        // 🆕 优化：移除 INITIAL 状态处理，只处理 RUNNING 状态
        if (this.gameController.stateTransitionService.isCountdown()) {
            this.updateBunnyAnimationOnly(deltaTime);
            this.gameController.countdownManager.update(deltaTime);
        } else if (this.gameController.stateTransitionService.isRunning()) {
            await this.updateGameEngine(deltaTime);
        }
        
        // 统一动画更新
        if (this.gameController.animationCoordinator) {
            this.gameController.animationCoordinator.updateAllAnimations(deltaTime);
        }
        
        // 更新自主路障动画
        if (this.gameController.gameEngine) {
            this.gameController.gameEngine.updateAutonomousBlockers(deltaTime);
        }
        
        // 更新UI系统
        if (this.gameController.uiSystem) {
            this.gameController.uiSystem.update(deltaTime);
        }
        
        // 🆕 优化：移除 StartButtonWidget 更新，现在由事件驱动处理
        // StartButtonWidget 现在自己管理更新，不需要 GameLoop 处理
    }
    
    /**
     * 只更新兔子动画（不更新逻辑）
     */
    updateBunnyAnimationOnly(deltaTime) {
        if (this.gameController.spriteManager) {
            const bunnySprite = this.gameController.spriteManager.getSprite('bunny');
            if (bunnySprite && bunnySprite.updateAnimation) {
                // 只更新动画，不更新逻辑
                bunnySprite.updateAnimation(deltaTime);
            }
        }
    }
    
    /**
     * 更新游戏引擎
     */
    async updateGameEngine(deltaTime) {
        if (!this.gameController.gameEngine) {
            return;
        }
        
        const gameOverResult = this.gameController.gameEngine.update(deltaTime);
        
        // 更新兔子移动
        if (this.gameController.spriteManager && !this.gameController.gameEngine.gameOver) {
            const bunny = this.gameController.spriteManager.getSprite('bunny');
            if (bunny) {
                bunny.update(deltaTime);
                
                // 检查兔子游戏结束状态
                if (!this.gameController.gameEngine.gameOver) {
                    if (bunny.hasEscaped) {
                        this.gameController.gameEngine.gameOver = true;
                        this.gameController.gameEngine.winner = 'bunny';
                    } else if (bunny.state === 'TRAPPED') {
                        this.gameController.gameEngine.gameOver = true;
                        this.gameController.gameEngine.winner = 'player';
                    }
                }
            }
        }
        
        // 处理游戏结束
        if (gameOverResult || this.gameController.gameEngine.gameOver) {
            console.log('🎮 GameLoop: 检测到游戏结束条件', {
                gameOverResult,
                gameEngineGameOver: this.gameController.gameEngine.gameOver,
                winner: this.gameController.gameEngine.winner,
                isGameOver: this.gameController.stateTransitionService.isGameOver()
            });
            
            if (!this.gameController.stateTransitionService.isGameOver()) {
                console.log('🎮 GameLoop: 调用 StateTransitionService.gameOver');
                // 🆕 优化：直接调用 StateTransitionService.gameOver，绕过 EventHandler
                await this.gameController.stateTransitionService.gameOver(this.gameController.gameEngine.winner);
                
                // 🆕 关键修复：调用后立即停止 GameLoop，避免重复处理
                console.log('🛑 GameLoop: 游戏结束处理完成，立即停止循环');
                this.stop();
                return; // 立即退出当前帧
            } else {
                console.log('⚠️ GameLoop: 游戏已经结束，跳过重复处理');
            }
        }
    }
    
    /**
     * 只更新UI（暂停时使用）
     */
    updateUIOnly() {
        // 暂停时只更新UI系统，不更新游戏逻辑
        if (this.gameController.uiSystem) {
            this.gameController.uiSystem.update(0); // 传入0作为deltaTime
        }
    }
}
