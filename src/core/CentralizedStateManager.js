/**
 * 集中式状态管理器 - 统一管理游戏状态转换
 * 实现集中式状态管理，防止多重调用，整合暂停功能
 */

import { gameEventBus } from './GameEventBus.js';
import { GAME_EVENTS } from './GameEvents.js';

export class CentralizedStateManager {
    constructor() {
        // 游戏状态定义
        this.states = {
            INITIAL: 'initial',
            COUNTDOWN: 'countdown', 
            RUNNING: 'running',
            PAUSED: 'paused',
            GAME_OVER: 'game_over'
        };
        
        // 当前状态
        this.currentState = this.states.INITIAL;
        this.previousState = null;
        
        // 状态转换规则 - 定义哪些状态可以转换到哪些状态
        // 新的简化转换规则：
        // INITIAL -> COUNTDOWN (不能直接到GAME_OVER)
        // COUNTDOWN -> RUNNING (倒计时期间不可被打断)
        // RUNNING -> PAUSED, GAME_OVER, INITIAL (INITIAL通过setStopOk自动触发)
        // PAUSED -> RUNNING (只能回到RUNNING，不能直接到INITIAL)
        // GAME_OVER -> INITIAL
        this.transitions = {
            [this.states.INITIAL]: [this.states.COUNTDOWN],
            [this.states.COUNTDOWN]: [this.states.RUNNING],
            [this.states.RUNNING]: [this.states.PAUSED, this.states.GAME_OVER, this.states.INITIAL],
            [this.states.PAUSED]: [this.states.RUNNING],
            [this.states.GAME_OVER]: [this.states.INITIAL]
        };
        
        // 状态转换锁 - 防止多重调用
        this.isTransitioning = false;
        
        // STOP_OK 标志位 - 严格控制谁可以设置
        // true: 允许从RUNNING直接转换到INITIAL
        // false: 不允许从RUNNING直接转换到INITIAL
        this.stop_ok = false;
        
        // 游戏控制器引用
        this.gameController = null;
        
        // 暂停管理器引用
        this.pauseManager = null;
        
        // 随机种子管理 - 确保每次重置后随机性不同
        this.randomSeed = Date.now(); // 使用当前时间作为初始种子
        this.randomGenerator = this.createSeededRandom(this.randomSeed);
        
        // console.log('🎯 CentralizedStateManager initialized');
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
    
    /**
     * 生成随机数（使用种子）
     */
    random() {
        return this.randomGenerator();
    }
    
    /**
     * 生成随机整数（使用种子）
     */
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    /**
     * 更新随机种子（在重置时调用）
     */
    updateRandomSeed() {
        this.randomSeed = Date.now() + Math.random() * 1000; // 确保种子不同
        this.randomGenerator = this.createSeededRandom(this.randomSeed);
        // console.log(`🎲 随机种子已更新: ${this.randomSeed}`);
    }
    
    /**
     * 设置游戏控制器引用
     */
    setGameController(gameController) {
        this.gameController = gameController;
    }
    
    /**
     * 设置 STOP_OK 标志位 - 严格控制访问
     * 只有以下情况可以设置：
     * 1. 进入 INITIAL 状态时自动设为 false
     * 2. 用户点击 Stop 对话框的 OK 按钮时设为 true
     * 3. 如果设置为 true 且当前处于 RUNNING 状态，立即触发状态转换
     */
    setStopOk(value) {
        this.stop_ok = value;
        // console.log(`🔒 STOP_OK 标志位已设置为: ${value}`);
        
        // 自动触发机制：如果设置为 true 且当前处于 RUNNING 状态，立即转换到 INITIAL
        if (value === true && this.isRunning()) {
            // console.log('🚀 检测到 STOP_OK=true 且游戏正在运行，自动触发状态转换到 INITIAL');
            // 使用 setTimeout 确保状态转换在下一个事件循环中执行，避免同步调用问题
            setTimeout(async () => {
                await this.transitionTo(this.states.INITIAL);
            }, 0);
        }
    }
    
    /**
     * 获取 STOP_OK 标志位状态
     */
    getStopOk() {
        return this.stop_ok;
    }
    
    /**
     * 设置暂停管理器引用
     */
    setPauseManager(pauseManager) {
        this.pauseManager = pauseManager;
    }
    
    /**
     * 检查是否可以转换到指定状态
     */
    canTransitionTo(newState) {
        return this.transitions[this.currentState]?.includes(newState) || false;
    }
    
    /**
     * 统一的状态转换入口 - 核心方法
     */
    async transitionTo(newState, context = {}) {
        // 防止多重调用
        if (this.isTransitioning) {
            console.warn(`⚠️ 状态转换正在进行中，忽略转换请求: ${this.currentState} -> ${newState}`);
            return false;
        }
        
        // 检查转换是否合法
        if (!this.canTransitionTo(newState)) {
            console.warn(`❌ 非法状态转换: ${this.currentState} -> ${newState}`);
            return false;
        }
        
        // 如果已经是目标状态，直接返回
        if (this.currentState === newState) {
            // console.log(`ℹ️ 已经是目标状态: ${newState}`);
            return true;
        }
        
        // 设置转换锁
        this.isTransitioning = true;
        
        try {
            // console.log(`🔄 开始状态转换: ${this.currentState} -> ${newState}`);
            // console.log(`🔍 DEBUG: transitionTo context =`, context);
            
            // 记录前一个状态
            this.previousState = this.currentState;
            
            // 执行状态退出逻辑
            // console.log(`🔍 DEBUG: 执行状态退出逻辑: ${this.currentState}`);
            await this.executeExitLogic(this.currentState, context);
            
            // 更新当前状态
            this.currentState = newState;
            // console.log(`🔍 DEBUG: 状态已更新为: ${this.currentState}`);
            
            // 执行状态进入逻辑
            // console.log(`🔍 DEBUG: 执行状态进入逻辑: ${this.currentState}`);
            await this.executeEnterLogic(this.currentState, context);
            
            // 发布状态变化事件
            this.emitStateChangeEvent(this.previousState, this.currentState, context);
            
            // 自动恢复暂停状态机制：如果从RUNNING状态转换到INITIAL或GAME_OVER，且游戏仍处于暂停状态，则自动恢复
            this.checkAndResumeFromPause(this.previousState, this.currentState);
            
            console.log(`✅ 状态转换完成: ${this.previousState} -> ${this.currentState}`);
            return true;
            
        } catch (error) {
            console.error(`❌ 状态转换失败: ${error.message}`);
            // 发生错误时回滚到前一个状态
            this.currentState = this.previousState;
            return false;
        } finally {
            // 释放转换锁
            this.isTransitioning = false;
        }
    }
    
    /**
     * 执行状态退出逻辑
     */
    async executeExitLogic(state, context) {
        switch (state) {
            case this.states.COUNTDOWN:
                // 倒计时状态退出时停止倒计时
                if (this.gameController?.countdownManager) {
                    this.gameController.countdownManager.stopCountdown();
                }
                break;
                
            case this.states.RUNNING:
                // 运行状态退出时停止游戏循环
                if (this.gameController?.gameLoop) {
                    this.gameController.gameLoop.stop();
                }
                break;
                
            case this.states.PAUSED:
                // 暂停状态退出时不需要恢复暂停管理器
                // 暂停恢复将在目标状态的进入逻辑中处理
                break;
        }
    }
    
    /**
     * 执行状态进入逻辑
     */
    async executeEnterLogic(state, context) {
        switch (state) {
            case this.states.COUNTDOWN:
                // 🆕 修复：保持轻量级渲染继续运行，支持倒计时显示
                // 轻量级渲染将负责倒计时数字显示和兔子动画
                
                // 🆕 修复：销毁 StartButtonWidget，因为不再需要
                if (this.gameController?.startButtonWidget) {
                    console.log('🧹 状态转换到 COUNTDOWN：销毁 StartButtonWidget');
                    this.gameController.startButtonWidget.destroy();
                    this.gameController.startButtonWidget = null;
                }
                
                // 进入倒计时状态
                if (this.gameController?.countdownManager) {
                    this.gameController.countdownManager.startCountdown();
                }
                // 倒计时状态下禁用所有游戏控制按钮
                if (this.gameController?.uiManager) {
                    this.gameController.uiManager.disableGameControls();
                }
                // 切换到倒计时音乐
                if (this.gameController) {
                    await this.gameController.updateMusicForState('countdown');
                }
                break;
                
            case this.states.RUNNING:
                // 🆕 优化：停止 INITIAL 状态的轻量级渲染
                if (this.gameController?.stopInitialRendering) {
                    this.gameController.stopInitialRendering();
                }
                
                // 进入运行状态
                if (this.gameController?.gameLoop) {
                    this.gameController.gameLoop.start();
                }
                // 确保暂停状态被清除
                if (this.pauseManager) {
                    this.pauseManager.resume();
                }
                // 启用游戏控制按钮（Stop button 和 Pause button）
                if (this.gameController?.uiManager) {
                    this.gameController.uiManager.enableGameControls();
                }
                // 通知兔子开始游戏（开始寻路）
                if (this.gameController?.spriteManager) {
                    const bunny = this.gameController.spriteManager.getSprite('bunny');
                    if (bunny && bunny.startGame) {
                        bunny.startGame();
                    }
                }
                // 切换到游戏音乐
                if (this.gameController) {
                    await this.gameController.updateMusicForState('running');
                }
                break;
                
            case this.states.PAUSED:
                // 进入暂停状态
                if (this.pauseManager) {
                    this.pauseManager.pause();
                }
                // 暂停状态下保持游戏音乐（不切换）
                // 注意：根据需求，running、paused、gameover都使用同一首音乐
                break;
                
            case this.states.GAME_OVER:
                // 进入游戏结束状态
                if (this.gameController?.gameLoop) {
                    this.gameController.gameLoop.stop();
                    // 🆕 销毁 GameLoop，避免重复处理
                    this.gameController.gameLoop = null;
                    // console.log('🗑️ GameLoop 已销毁');
                }
                // 禁用游戏控制按钮
                if (this.gameController?.uiManager) {
                    this.gameController.uiManager.disableGameControls();
                }
                // 切换到游戏结束音乐（与游戏音乐相同）
                if (this.gameController) {
                    await this.gameController.updateMusicForState('gameover');
                }
                // 显示获胜对话框
                if (this.gameController?.dialogManager && context.winner) {
                    this.gameController.dialogManager.showVictoryDialog(context.winner);
                }
                break;
                
            case this.states.INITIAL:
                // 进入初始状态 - 执行完整的游戏重置
                // console.log(`🔍 DEBUG: 进入 INITIAL 状态，context =`, context);
                // 注意：暂停机制只在RUNNING状态中处理，INITIAL状态不需要处理暂停
                // 确保游戏控制被禁用，防止自动开始
                if (this.gameController?.uiManager) {
                    this.gameController.uiManager.disableGameControls();
                }
                // 重置 STOP_OK 标志位
                this.setStopOk(false);
                // console.log(`🔍 DEBUG: 准备调用 resetGameToInitialState(context)`);
                await this.resetGameToInitialState(context);
                // console.log(`🔍 DEBUG: resetGameToInitialState 调用完成`);
                
                // 重置音效播放状态
                if (this.gameController) {
                    this.gameController.resetAudioState();
                }
                
                // 🆕 重新创建 GameLoop（但不启动）
                if (this.gameController && !this.gameController.gameLoop) {
                    const { GameLoop } = await import('./GameLoop.js');
                    this.gameController.gameLoop = new GameLoop(this.gameController);
                    // console.log('🔄 GameLoop 已重新创建（未启动）');
                }
                
                // 🆕 优化：启动轻量级渲染循环替代 GameLoop
                if (this.gameController?.startInitialRendering) {
                    this.gameController.startInitialRendering();
                }
                // 切换到菜单音乐
                if (this.gameController) {
                    await this.gameController.updateMusicForState('initial');
                }
                break;
        }
        
        // 更新UI状态（包括游戏状态显示）
        if (this.gameController?.uiManager) {
            this.gameController.uiManager.updateUIState();
        }
    }
    
    /**
     * 发布状态变化事件
     */
    emitStateChangeEvent(fromState, toState, context) {
        gameEventBus.emit(GAME_EVENTS.UI_UPDATE, {
            component: 'state_manager',
            data: {
                fromState,
                toState,
                currentState: toState,
                context
            }
        });
    }
    
    /**
     * 检查并自动恢复暂停状态
     * 当从RUNNING状态转换到INITIAL或GAME_OVER状态时，如果游戏仍处于暂停状态，则自动恢复
     */
    checkAndResumeFromPause(fromState, toState) {
        // 检查是否是从RUNNING状态转换到INITIAL或GAME_OVER状态
        const isFromRunning = fromState === this.states.RUNNING;
        const isToInitialOrGameOver = toState === this.states.INITIAL || toState === this.states.GAME_OVER;
        
        if (isFromRunning && isToInitialOrGameOver) {
            // 检查游戏是否仍处于暂停状态
            if (this.pauseManager && this.pauseManager.isGamePaused()) {
                // console.log('🔄 检测到从RUNNING状态转换到终止状态，但游戏仍处于暂停状态，自动恢复暂停状态');
                this.pauseManager.resume();
                // console.log('✅ 暂停状态已自动恢复');
            }
        }
    }
    
    // ========== 状态查询方法 ==========
    
    getCurrentState() {
        return this.currentState;
    }
    
    getPreviousState() {
        return this.previousState;
    }
    
    isInitial() {
        return this.currentState === this.states.INITIAL;
    }
    
    isCountdown() {
        return this.currentState === this.states.COUNTDOWN;
    }
    
    isRunning() {
        return this.currentState === this.states.RUNNING;
    }
    
    isPaused() {
        return this.currentState === this.states.PAUSED;
    }
    
    isGameOver() {
        return this.currentState === this.states.GAME_OVER;
    }
    
    isTransitioning() {
        return this.isTransitioning;
    }
    
    // ========== 便捷的状态转换方法 ==========
    
    /**
     * 开始游戏 - 从初始状态到倒计时
     */
    async startGame() {
        return await this.transitionTo(this.states.COUNTDOWN);
    }
    
    /**
     * 倒计时完成 - 从倒计时到运行
     */
    async startRunning() {
        return await this.transitionTo(this.states.RUNNING);
    }
    
    /**
     * 暂停游戏 - 从运行到暂停
     */
    async pauseGame() {
        return await this.transitionTo(this.states.PAUSED);
    }
    
    /**
     * 恢复游戏 - 从暂停到运行
     */
    async resumeGame() {
        return await this.transitionTo(this.states.RUNNING);
    }
    
    /**
     * 停止游戏 - 根据当前状态进行适当的转换
     */
    async stopGame() {
        if (this.isPaused()) {
            // PAUSED状态：恢复到RUNNING状态
            return await this.transitionTo(this.states.RUNNING);
        } else if (this.isInitial() || this.isGameOver()) {
            // INITIAL或GAME_OVER状态：已经在目标状态或可以转换
            return await this.transitionTo(this.states.INITIAL);
        } else if (this.isCountdown()) {
            // COUNTDOWN状态：不能被打断
            // console.log('⚠️ 倒计时进行中，不能停止游戏');
            return false;
        } else if (this.isRunning()) {
            // RUNNING状态：由setStopOk的自动触发机制处理，这里不需要处理
            // console.log('⚠️ RUNNING状态下的停止操作由setStopOk自动触发机制处理');
            return false;
        }
        
        return false;
    }
    
    /**
     * 游戏结束 - 从运行到游戏结束
     */
    async gameOver(winner = 'Player') {
        return await this.transitionTo(this.states.GAME_OVER, { winner });
    }
    
    /**
     * 重新开始 - 从游戏结束到初始状态
     */
    async restartGame() {
        return await this.transitionTo(this.states.INITIAL);
    }
    
    // ========== 按钮处理逻辑 ==========
    
    /**
     * 处理按钮点击事件
     */
    async handleButtonClick(buttonName) {
        
        switch (buttonName) {
            case 'start':
            case 'unifiedGameBtn':
                return await this.handleStartButton();
                
            case 'pause':
                return await this.handlePauseButton();
                
            case 'exit':
                return await this.handleExitButton();
                
            default:
                console.warn(`⚠️ 未知按钮: ${buttonName}`);
                return false;
        }
    }
    
    /**
     * 处理开始按钮
     */
    async handleStartButton() {
        if (this.isGameOver()) {
            // 游戏结束状态：重新开始
            return await this.restartGame();
        } else if (this.isInitial()) {
            // 初始状态：开始游戏
            return await this.startGame();
        } else if (this.isCountdown()) {
            // 倒计时状态：按钮失效，不可被打断
            // console.log('⚠️ 倒计时进行中，按钮失效');
            return false;
        } else if (this.isRunning() || this.isPaused()) {
            // 游戏进行中：显示停止确认对话框
            this.showStopGameDialog();
            return true;
        }
        return false;
    }
    
    /**
     * 处理暂停按钮
     */
    async handlePauseButton() {
        if (this.isCountdown()) {
            // 倒计时状态：暂停按钮失效
            // console.log('⚠️ 倒计时进行中，暂停按钮失效');
            return false;
        } else if (this.isRunning()) {
            return await this.pauseGame();
        } else if (this.isPaused()) {
            return await this.resumeGame();
        }
        return false;
    }
    
    /**
     * 处理退出按钮
     */
    async handleExitButton() {
        // 退出游戏逻辑
        if (this.gameController?.exitGame) {
            this.gameController.exitGame();
        }
        return true;
    }
    
    /**
     * 显示停止游戏确认对话框
     */
    showStopGameDialog() {
        if (this.isRunning()) {
            // 如果正在运行，先暂停
            this.pauseGame();
        }
        
        if (this.gameController?.showStopGameDialog) {
            this.gameController.showStopGameDialog();
        }
    }
    
    /**
     * 获取按钮文本
     */
    getButtonText(buttonName) {
        if (buttonName === 'start' || buttonName === 'unifiedGameBtn') {
            if (this.isInitial()) {
                return 'Start Game';
            } else {
                return 'Stop Game';
            }
        } else if (buttonName === 'pause') {
            // 添加调试信息
            // console.log(`🔍 getButtonText('pause'): 当前状态=${this.getCurrentState()}, isPaused()=${this.isPaused()}, isRunning()=${this.isRunning()}, isCountdown()=${this.isCountdown()}, isGameOver()=${this.isGameOver()}`);
            
            if (this.isPaused()) {
                // console.log(`🔍 getButtonText('pause'): 返回 'Resume Game'`);
                return 'Resume Game';
            } else {
                // console.log(`🔍 getButtonText('pause'): 返回 'Pause Game'`);
                return 'Pause Game';
            }
        }
        
        //console.log(`🔍 getButtonText('${buttonName}'): 返回原始值 '${buttonName}'`);
        return buttonName;
    }
    
    /**
     * 完全重置游戏到初始状态 - 实现完全重置策略
     * 确保第一次进入INITIAL和重新进入INITIAL完全一致
     */
    async resetGameToInitialState(context = {}) {
        try {
            // console.log('🔄 开始完全重置游戏到初始状态...', context);
            // console.log(`🔍 DEBUG: resetGameToInitialState 接收到的 context =`, context);
            
            // 0. 处理地图切换逻辑（如果有指定地图编号）
            if (context.mapNumber && context.reason === 'victory_try_next_map') {
                // console.log(`🗺️ 胜利后切换到地图 ${context.mapNumber}`);
                // console.log(`🔍 DEBUG: 检测到 victory_try_next_map 条件，准备加载地图 ${context.mapNumber}`);
                // 地图编号已经在 StateTransitionService 中更新，这里只需要确保加载新地图
            } else {
                // console.log(`🔍 DEBUG: 没有检测到 victory_try_next_map 条件`);
                // console.log(`🔍 DEBUG: context.mapNumber = ${context.mapNumber}, context.reason = ${context.reason}`);
            }
            
            // 1. 停止所有异步操作
            await this.stopAllAsyncOperations();
            
            // 2. 清理所有事件监听器
            this.clearAllEventListeners();
            
            // 3. 清理所有定时器
            this.clearAllTimers();
            
            // 4. 重置所有系统状态
            await this.resetAllSystems();
            
            // 5. 重新初始化所有系统
            await this.reinitializeAllSystems(context);
            
            // 6. 确保状态完全一致
            this.ensureStateConsistency();
            
            // console.log('🎊 游戏完全重置到初始状态完成！');
            
        } catch (error) {
            console.error(`❌ 完全重置游戏到初始状态失败: ${error.message}`);
            console.error('详细错误:', error);
        }
    }
    
    /**
     * 停止所有异步操作
     */
    async stopAllAsyncOperations() {
        // console.log('🛑 停止所有异步操作...');
        
        // 停止游戏循环
        if (this.gameController?.gameLoop) {
            this.gameController.gameLoop.stop();
            // console.log('✅ 游戏循环已停止');
        }
        
        // 停止倒计时服务
        if (this.gameController?.countdownService) {
            this.gameController.countdownService.stop();
            // console.log('✅ 倒计时服务已停止');
        }
        
        // 停止所有路障动画
        if (this.gameController?.gameEngine?.autonomousBlockerManager) {
            const blockers = this.gameController.gameEngine.autonomousBlockerManager.getAllBlockers();
            for (const blocker of blockers) {
                if (blocker.stopAsyncOperations) {
                    blocker.stopAsyncOperations();
                }
            }
            // console.log('✅ 路障动画已停止');
        }
        
        // 等待所有异步操作完成
        await new Promise(resolve => setTimeout(resolve, 100));
        // console.log('✅ 所有异步操作已停止');
    }
    
    /**
     * 清理所有事件监听器
     */
    clearAllEventListeners() {
        // console.log('🧹 清理所有事件监听器...');
        
        // 清理游戏引擎的事件监听器
        if (this.gameController?.gameEngine?.eventListeners) {
            // 先移除所有监听器，再清空Map
            for (const [name, listenerId] of this.gameController.gameEngine.eventListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.gameController.gameEngine.eventListeners.clear();
            // console.log('✅ 游戏引擎事件监听器已清理');
        }
        
        // 清理UI管理器的事件监听器
        if (this.gameController?.uiManager?.eventListeners) {
            for (const [name, listenerId] of this.gameController.uiManager.eventListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.gameController.uiManager.eventListeners.clear();
            // console.log('✅ UI管理器事件监听器已清理');
        }
        
        // 清理按钮事件管理器
        if (this.gameController?.buttonEventManager?.clearAllListeners) {
            this.gameController.buttonEventManager.clearAllListeners();
            // console.log('✅ 按钮事件监听器已清理');
        }
        
        // 清理Canvas点击事件
        if (this.gameController?.canvas) {
            this.gameController.canvas.onclick = null;
            // console.log('✅ Canvas点击事件已清理');
        }
        
        // 🆕 新增：清理 StartButtonWidget 沙箱组件
        if (this.gameController?.startButtonWidget) {
            // console.log('🧹 销毁 StartButtonWidget 沙箱组件...');
            this.gameController.startButtonWidget.destroy();
            this.gameController.startButtonWidget = null; // 清空引用
            // console.log('✅ StartButtonWidget 沙箱组件已销毁');
        }
        
        // 🆕 新增：清理 BlockerService 事件总线监听器
        if (this.gameController?.blockerManager?.cleanupEventBusListeners) {
            // console.log('🧹 清理 BlockerService 事件总线监听器...'); // 调试日志
            this.gameController.blockerManager.cleanupEventBusListeners();
            // console.log('✅ BlockerService 事件总线监听器已清理'); // 调试日志
        }
        
        // 🆕 新增：清理 StartButtonWidget 事件总线监听器
        if (this.gameController?.startButtonWidget?.cleanupEventBusListeners) {
            // console.log('🧹 清理 StartButtonWidget 事件总线监听器...'); // 调试日志
            this.gameController.startButtonWidget.cleanupEventBusListeners();
            // console.log('✅ StartButtonWidget 事件总线监听器已清理'); // 调试日志
        }
        
        // 🆕 新增：清理游戏引擎事件总线监听器
        if (this.gameController?.gameEngine?.eventListeners) {
            // console.log('🧹 清理游戏引擎事件总线监听器...'); // 调试日志
            for (const [name, listenerId] of this.gameController.gameEngine.eventListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.gameController.gameEngine.eventListeners.clear();
            // console.log('✅ 游戏引擎事件总线监听器已清理'); // 调试日志
        }
        
        // 🆕 新增：清理UI管理器事件总线监听器
        if (this.gameController?.uiManager?.eventListeners) {
            // console.log('🧹 清理UI管理器事件总线监听器...'); // 调试日志
            for (const [name, listenerId] of this.gameController.uiManager.eventListeners) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
            }
            this.gameController.uiManager.eventListeners.clear();
            // console.log('✅ UI管理器事件总线监听器已清理'); // 调试日志
        }
        
        // console.log('✅ 所有事件监听器已清理');
    }
    
    /**
     * 清理所有定时器
     */
    clearAllTimers() {
        // console.log('⏰ 清理所有定时器...');
        
        // 清理倒计时定时器
        if (this.gameController?.countdownService?.clearTimers) {
            this.gameController.countdownService.clearTimers();
            // console.log('✅ 倒计时定时器已清理');
        }
        
        // 清理路障闪烁定时器
        if (this.gameController?.gameEngine?.autonomousBlockerManager) {
            const blockers = this.gameController.gameEngine.autonomousBlockerManager.getAllBlockers();
            for (const blocker of blockers) {
                if (blocker.clearTimers) {
                    blocker.clearTimers();
                }
            }
            // console.log('✅ 路障闪烁定时器已清理');
        }
        
        // console.log('✅ 所有定时器已清理');
    }
    
    /**
     * 重置所有系统状态
     * 注意：保留地图号和难度状态，这是用户闯关进度的重要记录
     */
    async resetAllSystems() {
        // console.log('🔄 重置所有系统状态...');
        
        // 保护地图号和难度状态 - 这是用户闯关进度的重要记录
        const preservedMapNumber = this.gameController?.currentMapNumber;
        const preservedDifficulty = this.gameController?.selectedDifficulty;
        // console.log(`🛡️ 保护用户进度: 地图${preservedMapNumber}, 难度${preservedDifficulty}`);
        
        // 更新随机种子 - 确保每次重置后随机性不同
        this.updateRandomSeed();
        
        // 重置游戏引擎
        if (this.gameController?.gameEngine?.reset) {
            this.gameController.gameEngine.reset();
            // console.log('✅ 游戏引擎已重置');
        }
        
        // 重置精灵管理器
        if (this.gameController?.spriteManager?.clear) {
            this.gameController.spriteManager.clear();
            // console.log('✅ 精灵管理器已重置');
        }
        
        // 重置路障管理器
        if (this.gameController?.gameEngine?.autonomousBlockerManager?.clearAll) {
            this.gameController.gameEngine.autonomousBlockerManager.clearAll();
            // console.log('✅ 路障管理器已重置');
        }
        
        
        // 重置暂停管理器
        if (this.pauseManager?.reset) {
            this.pauseManager.reset();
            // console.log('✅ 暂停管理器已重置');
        }
        
        // 恢复地图号和难度状态
        if (preservedMapNumber !== undefined) {
            this.gameController.currentMapNumber = preservedMapNumber;
        }
        if (preservedDifficulty !== undefined) {
            this.gameController.selectedDifficulty = preservedDifficulty;
        }
        // console.log(`✅ 用户进度已恢复: 地图${preservedMapNumber}, 难度${preservedDifficulty}`);
        
        // console.log('✅ 所有系统状态已重置（保留用户进度）');
    }
    
    /**
     * 重新初始化所有系统
     */
    async reinitializeAllSystems(context = {}) {
        // console.log('🔧 重新初始化所有系统...', context);
        // console.log(`🔍 DEBUG: reinitializeAllSystems 接收到的 context =`, context);
        
        // 🛡️ 状态保护：确保在重新初始化过程中不会被状态转换中断
        const originalIsTransitioning = this.isTransitioning;
        this.isTransitioning = true;
        // console.log('🔒 重新初始化期间锁定状态转换');
        
        // 如果需要加载新地图，先加载地图
        if (context.mapNumber && context.reason === 'victory_try_next_map') {
            // console.log(`🗺️ 重新初始化时加载地图 ${context.mapNumber}`);
            // console.log(`🔍 DEBUG: 开始加载地图 - 难度: ${this.gameController.selectedDifficulty}, 地图编号: ${context.mapNumber}`);
            
            if (this.gameController?.gameEngine?.loadRealMap) {
                // console.log(`🔍 DEBUG: 调用 gameEngine.loadRealMap`);
                const success = await this.gameController.gameEngine.loadRealMap(
                    this.gameController.selectedDifficulty, 
                    context.mapNumber
                );
                // console.log(`🔍 DEBUG: loadRealMap 返回结果: ${success}`);
                
                if (success) {
                    this.gameController.isMapLoaded = true;
                    // console.log(`🔍 DEBUG: 设置 isMapLoaded = true`);
                    
                    // console.log(`🔍 DEBUG: 调用 setCurrentMapInfo`);
                    this.gameController.gameEngine.setCurrentMapInfo(
                        this.gameController.selectedDifficulty, 
                        context.mapNumber
                    );
                    // console.log(`🔍 DEBUG: setCurrentMapInfo 完成`);
                    
                    // console.log(`✅ 地图 ${context.mapNumber} 加载成功`);
                    // console.log(`🔍 DEBUG: 加载后 - GameEngine.getCurrentMapNumber() = ${this.gameController.gameEngine.getCurrentMapNumber()}`);
                    // console.log(`🔍 DEBUG: 加载后 - GameController.currentMapNumber = ${this.gameController.currentMapNumber}`);
                } else {
                    console.error(`❌ 地图 ${context.mapNumber} 加载失败`);
                }
            } else {
                console.error(`❌ gameController.gameEngine.loadRealMap 不存在`);
            }
        } else {
            // console.log(`🔍 DEBUG: 没有加载新地图的条件`);
            // console.log(`🔍 DEBUG: context.mapNumber = ${context.mapNumber}, context.reason = ${context.reason}`);
        }
        
        // 重新创建兔子精灵
        if (this.gameController?.autoCreateBunnySprite) {
            await this.gameController.autoCreateBunnySprite();
            // console.log('✅ 兔子精灵已重新创建');
        }
        
        // 兔子的图结构现在由Bunny类自己管理
        
        // 🆕 新增：重新创建 StartButtonWidget（如果需要）
        if (this.gameController.startButtonWidget === null) {
            // console.log('🔄 重新创建 StartButtonWidget 沙箱组件...');
            this.gameController.recreateStartButtonWidget();
        }
        
        // 重新设置事件监听器（确保不重复注册）
        if (this.gameController?.setupEventListeners) {
            // 先清理可能存在的重复监听器
            this.ensureNoDuplicateListeners();
            this.gameController.setupEventListeners();
            // console.log('✅ 事件监听器已重新设置');
        }
        
        // console.log('🔍 DEBUG: 即将检查 BlockerService 事件总线监听器');
        
        // 🆕 关键修复：重新设置 BlockerService 事件总线监听器
        // console.log('🔍 DEBUG: 开始检查 BlockerService 事件总线监听器');
        // console.log('🔍 DEBUG: gameController 存在:', !!this.gameController);
        // console.log('🔍 DEBUG: blockerManager 存在:', !!this.gameController?.blockerManager);
        // console.log('🔍 DEBUG: setupEventBusListeners 方法存在:', !!this.gameController?.blockerManager?.setupEventBusListeners);
        
        if (this.gameController?.blockerManager?.setupEventBusListeners) {
            this.gameController.blockerManager.setupEventBusListeners();
            // console.log('✅ BlockerService 事件总线监听器已重新设置');
        } else {
            console.warn('⚠️ BlockerService 未找到或 setupEventBusListeners 方法不存在');
            // console.log('🔍 检查 blockerManager:', this.gameController?.blockerManager);
        }
        
        // console.log('✅ 所有系统已重新初始化');
        
        // 🔓 恢复状态转换锁定
        this.isTransitioning = originalIsTransitioning;
        // console.log('🔓 重新初始化完成，恢复状态转换');
    }
    
    /**
     * 确保状态完全一致
     */
    ensureStateConsistency() {
        // console.log('🔍 确保状态完全一致...');
        
        // 更新UI状态
        if (this.gameController?.uiManager) {
            this.gameController.uiManager.updateMapInfo();
            this.gameController.uiManager.updateBunnyStatus();
            this.gameController.uiManager.disableGameControls();
            // console.log('✅ UI状态已更新');
        }
        
        // 确保游戏循环处于正确状态
        if (this.gameController?.gameLoop) {
            // 游戏循环将在executeEnterLogic中启动
            // console.log('✅ 游戏循环状态已确认');
        }
        
        // 确保暂停状态正确
        if (this.pauseManager && this.pauseManager.isGamePaused()) {
            this.pauseManager.resume();
            // console.log('✅ 暂停状态已确保正确');
        }
        
        // console.log('✅ 状态一致性已确保');
    }
    
    /**
     * 确保没有重复的事件监听器
     */
    ensureNoDuplicateListeners() {
        // console.log('🔍 检查并清理重复的事件监听器...'); // 调试日志
        
        // 清理游戏引擎的重复监听器
        if (this.gameController?.gameEngine?.eventListeners) {
            const existingListeners = new Set();
            const toRemove = [];
            
            for (const [name, listenerId] of this.gameController.gameEngine.eventListeners) {
                if (existingListeners.has(name)) {
                    toRemove.push([name, listenerId]);
                } else {
                    existingListeners.add(name);
                }
            }
            
            // 移除重复的监听器
            for (const [name, listenerId] of toRemove) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
                this.gameController.gameEngine.eventListeners.delete(name);
                // console.log(`🗑️ 移除重复的监听器: ${name}`); // 调试日志
            }
        }
        
        // 清理UI管理器的重复监听器
        if (this.gameController?.uiManager?.eventListeners) {
            const existingListeners = new Set();
            const toRemove = [];
            
            for (const [name, listenerId] of this.gameController.uiManager.eventListeners) {
                if (existingListeners.has(name)) {
                    toRemove.push([name, listenerId]);
                } else {
                    existingListeners.add(name);
                }
            }
            
            // 移除重复的监听器
            for (const [name, listenerId] of toRemove) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
                this.gameController.uiManager.eventListeners.delete(name);
                // console.log(`🗑️ 移除UI管理器重复的监听器: ${name}`); // 调试日志
            }
        }
        
        // 清理StartButtonWidget的重复监听器
        if (this.gameController?.startButtonWidget?.eventBusListeners) {
            const existingListeners = new Set();
            const toRemove = [];
            
            for (const listenerId of this.gameController.startButtonWidget.eventBusListeners) {
                if (existingListeners.has(listenerId)) {
                    toRemove.push(listenerId);
                } else {
                    existingListeners.add(listenerId);
                }
            }
            
            // 移除重复的监听器
            for (const listenerId of toRemove) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
                this.gameController.startButtonWidget.eventBusListeners.delete(listenerId);
                // console.log(`🗑️ 移除StartButtonWidget重复的监听器: ${listenerId}`); // 调试日志
            }
        }
        
        // 清理BlockerService的重复监听器
        if (this.gameController?.blockerManager?.eventBusListeners) {
            const existingListeners = new Set();
            const toRemove = [];
            
            for (const listenerId of this.gameController.blockerManager.eventBusListeners) {
                if (existingListeners.has(listenerId)) {
                    toRemove.push(listenerId);
                } else {
                    existingListeners.add(listenerId);
                }
            }
            
            // 移除重复的监听器
            for (const listenerId of toRemove) {
                if (gameEventBus && gameEventBus.off) {
                    gameEventBus.off(listenerId);
                }
                this.gameController.blockerManager.eventBusListeners.delete(listenerId);
                // console.log(`🗑️ 移除BlockerService重复的监听器: ${listenerId}`); // 调试日志
            }
        }
        
        // console.log('✅ 重复事件监听器检查完成'); // 调试日志
    }
    
    /**
     * 重置状态管理器
     */
    reset() {
        this.currentState = this.states.INITIAL;
        this.previousState = null;
        this.isTransitioning = false;
        // console.log('🔄 CentralizedStateManager reset to initial state');
    }
}

// 默认导出
export default CentralizedStateManager;
