/**
 * UI管理器 - 管理游戏UI状态和更新
 * 从GameController中分离出来的UI相关功能
 */

import { gameEventBus } from './GameEventBus.js';
import { GAME_EVENTS } from './GameEvents.js';

export class UIManager {
    constructor() {
        this.stateTransitionService = null;
        this.gameController = null;
        
        // 监听UI更新事件
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器（保守迁移：基于现有事件系统）
     */
    setupEventListeners() {
        // 监听UI更新事件（保持原有逻辑）
        gameEventBus.on(GAME_EVENTS.UI_UPDATE, (data) => {
            // console.log('🎯 UIManager: 收到UI_UPDATE事件', data);
            this.handleUIUpdateEvent(data);
        });
        
        // 监听游戏状态事件（基于现有事件）
        gameEventBus.on(GAME_EVENTS.GAME_START, () => {
            // console.log('🎯 UIManager: 收到GAME_START事件');
            this.handleGameStartEvent();
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_PAUSE, () => {
            // console.log('🎯 UIManager: 收到GAME_PAUSE事件');
            this.handleGamePauseEvent();
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_RESUME, () => {
            // console.log('🎯 UIManager: 收到GAME_RESUME事件');
            this.handleGameResumeEvent();
        });
        
        gameEventBus.on(GAME_EVENTS.GAME_OVER, (data) => {
            // console.log('🎯 UIManager: 收到GAME_OVER事件', data);
            this.handleGameOverEvent(data);
        });
        
    }
    
    /**
     * 设置依赖
     */
    setDependencies(stateTransitionService, gameController) {
        this.stateTransitionService = stateTransitionService;
        this.gameController = gameController;
    }
    
    /**
     * 处理UI更新事件（保守迁移：保持原有逻辑不变）
     */
    handleUIUpdateEvent(data) {
        // console.log('🎯 UIManager: 处理UI_UPDATE事件', data);
        
        // 如果是状态管理器的事件，处理状态变化
        if (data.component === 'state_manager') {
            this.handleStateChangeEvent(data.data);
        } else {
            // 其他UI更新事件，调用原有逻辑
            this.updateUIState();
        }
    }
    
    /**
     * 处理状态变化事件（保守迁移：保持原有逻辑不变）
     */
    handleStateChangeEvent(stateData) {
        // console.log('🎯 UIManager: 处理状态变化事件', stateData);
        
        const { fromState, toState, currentState } = stateData;
        
        // 更新按钮文本
        this.updateButtonTexts(currentState);
        
        // 更新按钮状态
        this.updateButtonStates(currentState);
        
        // 更新游戏状态显示
        this.updateGameStatusDisplay(currentState);
    }
    
    /**
     * 处理游戏开始事件（保守迁移：保持原有逻辑不变）
     */
    handleGameStartEvent() {
        // console.log('🎯 UIManager: 处理游戏开始事件');
        this.updateGameControls('start');
    }
    
    /**
     * 处理游戏暂停事件（保守迁移：保持原有逻辑不变）
     */
    handleGamePauseEvent() {
        // console.log('🎯 UIManager: 处理游戏暂停事件');
        this.updateGameControls('pause');
    }
    
    /**
     * 处理游戏恢复事件（保守迁移：保持原有逻辑不变）
     */
    handleGameResumeEvent() {
        // console.log('🎯 UIManager: 处理游戏恢复事件');
        this.updateGameControls('resume');
    }
    
    /**
     * 处理游戏结束事件（保守迁移：保持原有逻辑不变）
     */
    handleGameOverEvent(data) {
        // console.log('🎯 UIManager: 处理游戏结束事件', data);
        this.updateGameControls('game_over');
        this.updateGameOverUI(data);
    }
    
    /**
     * 更新UI状态（保持原有逻辑不变）
     */
    updateUIState() {
        if (!this.stateTransitionService) return;
        
        const unifiedText = this.stateTransitionService.getButtonText('unifiedGameBtn');
        const pauseText = this.stateTransitionService.getButtonText('pause');
        
        // 添加调试信息
        // console.log(`🔍 UIManager.updateUIState: 当前状态=${this.stateTransitionService.getCurrentState()}, pauseText="${pauseText}"`);
        
        // 更新HTML面板中的按钮文本
        this.updateHTMLButtonText('unifiedGameBtn', unifiedText);
        this.updateHTMLButtonText('pauseBtn', pauseText);
        
        // 更新按钮启用状态
        // 在倒计时期间禁用Stop按钮，避免倒计时暂停问题
        const isCountdownState = this.stateTransitionService.isCountdown();
        this.updateHTMLButtonState('unifiedGameBtn', !isCountdownState);
        this.updateHTMLButtonState('pauseBtn', 
            this.stateTransitionService.isRunning() || this.stateTransitionService.isPaused());
        
        // 更新游戏状态显示
        this.updateGameStatus();
        
        // 更新兔子状态（合并到统一UI更新中）
        this.updateBunnyStatus();
        
        // 输出调试信息
        // if (isCountdownState) {
        //    console.log('⏰ 倒计时状态：Stop按钮已禁用');
        //}
    }
    
    /**
     * 更新HTML按钮文本（智能更新：只在值变化时更新DOM）
     */
    updateHTMLButtonText(buttonId, text) {
        try {
            const button = document.getElementById(buttonId);
            if (button) {
                // 智能更新：只在文本实际变化时更新DOM
                if (button.textContent !== text) {
                    console.log(`🎯 UIManager: 更新按钮 '${buttonId}' 文本: '${button.textContent}' -> '${text}'`);
                    button.textContent = text;
                }
            } else {
                console.warn(`⚠️ Button with ID '${buttonId}' not found in DOM`);
            }
        } catch (error) {
            console.error(`Error updating button text for '${buttonId}':`, error);
        }
    }
    
    /**
     * 更新HTML按钮状态（智能更新：只在状态变化时更新DOM）
     */
    updateHTMLButtonState(buttonId, enabled) {
        try {
            const button = document.getElementById(buttonId);
            if (button) {
                // 智能更新：只在状态实际变化时更新DOM
                if (button.disabled === enabled) {
                    console.log(`🎯 UIManager: 更新按钮 '${buttonId}' 状态: ${button.disabled} -> ${!enabled}`);
                    button.disabled = !enabled;
                }
            } else {
                console.warn(`⚠️ Button with ID '${buttonId}' not found in DOM`);
            }
        } catch (error) {
            console.error(`Error updating button state for '${buttonId}':`, error);
        }
    }
    
    /**
     * 更新地图信息
     */
    updateMapInfo() {
        if (!this.gameController || !this.gameController.gameEngine) return;
        
        try {
            const stats = this.gameController.gameEngine.getMapStats();
            
            const mapInfoElement = document.getElementById('mapInfo');
            if (mapInfoElement) {
                mapInfoElement.textContent = 
                    `${stats.currentDifficulty.toUpperCase()} Map ${stats.currentMapNumber}`;
            } else {
                console.warn('⚠️ Map info element not found in DOM');
            }
            
            const blockerCountElement = document.getElementById('blockerCount');
            if (blockerCountElement) {
                blockerCountElement.textContent = stats.blockers;
            } else {
                console.warn('⚠️ Blocker count element not found in DOM');
            }
        } catch (error) {
            console.error('Error updating map info:', error);
        }
    }
    
    /**
     * 更新游戏状态显示
     */
    updateGameStatus() {
        try {
            const gameStatusElement = document.getElementById('gameStatus');
            if (!gameStatusElement) {
                console.warn('⚠️ Game status element not found in DOM');
                return;
            }
            
            if (!this.stateTransitionService) {
                gameStatusElement.textContent = 'Unknown';
                return;
            }
            
            // 根据当前状态显示相应的文本
            let statusText = 'Unknown';
            const currentState = this.stateTransitionService.getCurrentState();
            
            switch (currentState) {
                case 'initial':
                    statusText = 'Initial';
                    break;
                case 'countdown':
                    statusText = 'Countdown';
                    break;
                case 'running':
                    statusText = 'Running';
                    break;
                case 'paused':
                    statusText = 'Paused';
                    break;
                case 'game_over':
                    statusText = 'Game Over';
                    break;
                default:
                    statusText = 'Unknown';
            }
            
            gameStatusElement.textContent = statusText;
            // 注释掉频繁的状态更新日志，只在状态变化时输出
            // console.log(`🎮 游戏状态已更新: ${statusText}`);
        } catch (error) {
            console.error('Error updating game status:', error);
        }
    }
    
    /**
     * 更新兔子状态 (保留原方法以兼容其他调用，现在调用游戏状态更新)
     */
    updateBunnyStatus() {
        // 现在调用游戏状态更新
        this.updateGameStatus();
    }
    
    /**
     * 更新按钮文本（智能更新：只在值变化时更新DOM）
     */
    updateButtonTexts(currentState) {
        if (!this.stateTransitionService) return;
        
        const unifiedText = this.stateTransitionService.getButtonText('unifiedGameBtn');
        const pauseText = this.stateTransitionService.getButtonText('pause');
        
        // 智能更新：只在值变化时更新DOM
        this.updateHTMLButtonText('unifiedGameBtn', unifiedText);
        this.updateHTMLButtonText('pauseBtn', pauseText);
    }
    
    /**
     * 更新按钮状态（智能更新：只在状态变化时更新）
     */
    updateButtonStates(currentState) {
        if (!this.stateTransitionService) return;
        
        const isCountdownState = this.stateTransitionService.isCountdown();
        const isRunning = this.stateTransitionService.isRunning();
        const isPaused = this.stateTransitionService.isPaused();
        
        // 智能更新：只在状态变化时更新
        this.updateHTMLButtonState('unifiedGameBtn', !isCountdownState);
        this.updateHTMLButtonState('pauseBtn', isRunning || isPaused);
    }
    
    /**
     * 更新游戏状态显示（智能更新：只在状态变化时更新）
     */
    updateGameStatusDisplay(currentState) {
        if (!this.stateTransitionService) return;
        
        // 智能更新：只在状态变化时更新
        this.updateGameStatus();
    }
    
    /**
     * 更新游戏控制（基于事件驱动）
     */
    updateGameControls(action) {
        console.log(`🎯 UIManager: 更新游戏控制 - ${action}`);
        
        switch (action) {
            case 'start':
                // 游戏开始时的UI更新
                this.updateGameStatus();
                break;
            case 'pause':
                // 游戏暂停时的UI更新
                this.updateGameStatus();
                break;
            case 'resume':
                // 游戏恢复时的UI更新
                this.updateGameStatus();
                break;
            case 'game_over':
                // 游戏结束时的UI更新
                this.updateGameStatus();
                break;
        }
    }
    
    /**
     * 更新游戏结束UI（基于事件驱动）
     */
    updateGameOverUI(data) {
        // console.log('🎯 UIManager: 更新游戏结束UI', data);
        
        // 更新游戏状态显示
        this.updateGameStatus();
        
        // 可以在这里添加更多游戏结束相关的UI更新
        if (data && data.winner) {
            console.log(`🎯 UIManager: 游戏结束 - 获胜者: ${data.winner}`);
        }
    }
    
    /**
     * 启用游戏控制
     */
    enableGameControls() {
        try {
            // 检查是否在倒计时状态，如果是则不启用Stop按钮
            const isCountdownState = this.stateTransitionService && this.stateTransitionService.isCountdown();
            const isInitialState = this.stateTransitionService && this.stateTransitionService.isInitial();
            
            const unifiedGameBtn = document.getElementById('unifiedGameBtn');
            if (unifiedGameBtn) {
                // 在倒计时期间禁用Stop按钮
                unifiedGameBtn.disabled = isCountdownState;
                //if (isCountdownState) {
                //    console.log('⏰ 倒计时状态：Stop按钮保持禁用');
                //} else {
                //    console.log('✅ Unified game button enabled');
                //}
            } else {
                console.warn('⚠️ Unified game button not found in DOM');
            }
            
            const pauseBtn = document.getElementById('pauseBtn');
            if (pauseBtn) {
                // 根据游戏状态设置暂停按钮的启用状态
                const shouldEnablePause = this.stateTransitionService && 
                    (this.stateTransitionService.isRunning() || this.stateTransitionService.isPaused());
                pauseBtn.disabled = !shouldEnablePause;
                // console.log(`✅ Pause Game button ${shouldEnablePause ? 'enabled' : 'disabled'}`);
            } else {
                console.warn('⚠️ Pause Game button not found in DOM');
            }
            
            // 根据状态决定地图控制按钮和难度切换按钮的状态
            if (isInitialState) {
                // 初始状态：启用地图控制按钮和难度切换按钮
                this.enableMapControlButtons();
                this.enableDifficultyToggle();
                // console.log('✅ 初始状态：地图控制按钮和难度切换按钮已启用');
            } else {
                // 其他状态：禁用地图控制按钮和难度切换按钮
                this.disableMapControlButtons();
                this.disableDifficultyToggle();
                // console.log('❌ 非初始状态：地图控制按钮和难度切换按钮已禁用');
            }
        } catch (error) {
            console.error('Error in enableGameControls:', error);
        }
    }
    
    /**
     * 禁用地图控制按钮
     */
    disableMapControlButtons() {
        const mapButtons = ['prevMapBtn', 'nextMapBtn', 'randomMapBtn', 'customMapBtn'];
        mapButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = true;
                // console.log(`❌ 地图控制按钮 ${buttonId} 已禁用`);
            }
        });
    }
    
    /**
     * 启用地图控制按钮（仅在非游戏状态时使用）
     */
    enableMapControlButtons() {
        const mapButtons = ['prevMapBtn', 'nextMapBtn', 'randomMapBtn', 'customMapBtn'];
        mapButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = false;
                // console.log(`✅ 地图控制按钮 ${buttonId} 已启用`);
            }
        });
    }
    
    /**
     * 禁用难度切换按钮
     */
    disableDifficultyToggle() {
        const difficultyToggle = document.getElementById('difficultyToggle');
        if (difficultyToggle) {
            difficultyToggle.style.pointerEvents = 'none';
            difficultyToggle.style.opacity = '0.5';
            // console.log('❌ 难度切换按钮已禁用');
        }
    }
    
    /**
     * 启用难度切换按钮
     */
    enableDifficultyToggle() {
        const difficultyToggle = document.getElementById('difficultyToggle');
        if (difficultyToggle) {
            difficultyToggle.style.pointerEvents = 'auto';
            difficultyToggle.style.opacity = '1';
            // console.log('✅ 难度切换按钮已启用');
        }
    }
    
    /**
     * 禁用游戏控制（游戏停止时使用）
     */
    disableGameControls() {
        try {
            const unifiedGameBtn = document.getElementById('unifiedGameBtn');
            if (unifiedGameBtn) {
                unifiedGameBtn.disabled = true;
                // console.log('❌ Unified game button disabled');
            }
            
            const pauseBtn = document.getElementById('pauseBtn');
            if (pauseBtn) {
                pauseBtn.disabled = true;
                // console.log('❌ Pause Game button disabled');
            }
            
            // 检查当前状态，决定是否启用地图控制按钮
            const isInitialState = this.stateTransitionService && this.stateTransitionService.isInitial();
            if (isInitialState) {
                // 初始状态：启用地图控制按钮和难度切换按钮
                this.enableMapControlButtons();
                this.enableDifficultyToggle();
                // console.log('✅ 初始状态：地图控制按钮和难度切换按钮已启用');
            } else {
                // 其他状态（包括COUNTDOWN）：禁用地图控制按钮和难度切换按钮
                this.disableMapControlButtons();
                this.disableDifficultyToggle();
                // console.log('❌ 非初始状态：地图控制按钮和难度切换按钮已禁用');
            }
        } catch (error) {
            console.error('Error in disableGameControls:', error);
        }
    }
    
    /**
     * 显示停止游戏确认对话框
     */
    showStopGameDialog() {
        
        if (typeof showStopGameDialog === 'function') {
            showStopGameDialog();
        } else {
        }
    }
    
    /**
     * 显示地图选择对话框
     */
    showMapSelectionDialog() {
        if (typeof showMapSelectionDialog === 'function') {
            showMapSelectionDialog();
        } else {
            console.log('showMapSelectionDialog函数不存在');
        }
    }
    
    /**
     * 初始化信息菜单 - 从js/ui/ui-manager.js合并
     */
    static initializeInfoMenu() {
        const infoButton = document.getElementById('infoButton');
        const infoMenu = document.getElementById('infoMenu');
        
        if (!infoButton || !infoMenu) {
            console.warn('⚠️ 信息菜单元素未找到');
            return;
        }
        
        // 切换信息菜单显示
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = infoMenu.style.display !== 'none';
            infoMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // 点击菜单项
        this.setupMenuItems();
        
        // 设置关闭按钮
        this.setupCloseButtons();
        
        // 设置完整文档按钮
        this.setupFullDocumentButtons();
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!infoButton.contains(e.target) && !infoMenu.contains(e.target)) {
                this.hideInfoMenu();
            }
        });
        
    }
    
    /**
     * 设置菜单项事件 - 从js/ui/ui-manager.js合并
     */
    static setupMenuItems() {
        // 教程按钮
        const tutorialBtn = document.getElementById('tutorialBtn');
        if (tutorialBtn) {
            // 🆕 添加重复检查机制：先移除现有监听器，再添加新的
            if (tutorialBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 教程按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            tutorialBtn.addEventListener('click', () => {
                console.log('📖 教程按钮被点击');
                this.showDialog('tutorialDialog');
                this.hideInfoMenu();
            });
            
            // 标记已添加监听器
            tutorialBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 教程按钮未找到');
        }
        
        // 关于按钮
        const aboutBtn = document.getElementById('aboutBtn');
        if (aboutBtn) {
            // 🆕 添加重复检查机制
            if (aboutBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 关于按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            aboutBtn.addEventListener('click', () => {
                console.log('ℹ️ 关于按钮被点击');
                this.showDialog('aboutDialog');
                this.hideInfoMenu();
            });
            
            // 标记已添加监听器
            aboutBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 关于按钮未找到');
        }
        
        // 制作人员按钮
        const creditsBtn = document.getElementById('creditsBtn');
        if (creditsBtn) {
            // 🆕 添加重复检查机制
            if (creditsBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 制作人员按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            creditsBtn.addEventListener('click', () => {
                console.log('👥 制作人员按钮被点击');
                this.showDialog('creditsDialog');
                this.hideInfoMenu();
            });
            
            // 标记已添加监听器
            creditsBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 制作人员按钮未找到');
        }
        
        // 许可证按钮
        const licenseBtn = document.getElementById('licenseBtn');
        if (licenseBtn) {
            // 🆕 添加重复检查机制
            if (licenseBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 许可证按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            licenseBtn.addEventListener('click', () => {
                console.log('📄 许可证按钮被点击');
                this.showDialog('licenseDialog');
                this.hideInfoMenu();
            });
            
            // 标记已添加监听器
            licenseBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 许可证按钮未找到');
        }
    }
    
    /**
     * 设置关闭按钮事件 - 从js/ui/ui-manager.js合并
     */
    static setupCloseButtons() {
        // 关闭教程对话框按钮
        const closeTutorialBtn = document.getElementById('closeTutorialBtn');
        if (closeTutorialBtn) {
            // 🆕 添加重复检查机制
            if (closeTutorialBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 关闭教程对话框按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            closeTutorialBtn.addEventListener('click', () => {
                this.hideDialog('tutorialDialog');
            });
            
            // 标记已添加监听器
            closeTutorialBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 关闭教程按钮未找到');
        }
        
        // 关闭关于对话框按钮
        const closeAboutBtn = document.getElementById('closeAboutBtn');
        if (closeAboutBtn) {
            closeAboutBtn.addEventListener('click', () => {
                console.log('❌ 关闭关于对话框');
                this.hideDialog('aboutDialog');
            });
        } else {
            console.error('❌ 关闭关于按钮未找到');
        }
        
        // 关闭制作人员对话框按钮
        const closeCreditsBtn = document.getElementById('closeCreditsBtn');
        if (closeCreditsBtn) {
            closeCreditsBtn.addEventListener('click', () => {
                console.log('❌ 关闭制作人员对话框');
                this.hideDialog('creditsDialog');
            });
        } else {
            console.error('❌ 关闭制作人员按钮未找到');
        }
        
        // 关闭许可证对话框按钮
        const closeLicenseBtn = document.getElementById('closeLicenseBtn');
        if (closeLicenseBtn) {
            closeLicenseBtn.addEventListener('click', () => {
                console.log('❌ 关闭许可证对话框');
                this.hideDialog('licenseDialog');
            });
        } else {
            console.error('❌ 关闭许可证按钮未找到');
        }
    }
    
    /**
     * 设置完整文档按钮事件 - 从js/ui/ui-manager.js合并
     */
    static setupFullDocumentButtons() {
        // 完整教程按钮
        const readFullTutorialBtn = document.getElementById('readFullTutorialBtn');
        if (readFullTutorialBtn) {
            // 🆕 添加重复检查机制
            if (readFullTutorialBtn.hasAttribute('data-listener-added')) {
                console.log('⚠️ 完整教程按钮事件监听器已存在，跳过重复设置');
                return;
            }
            
            readFullTutorialBtn.addEventListener('click', () => {
                console.log('📖 打开完整教程');
                this.loadAndShowFullDocument('./docs/tutorial.html', '📖 Full Tutorial');
            });
            
            // 标记已添加监听器
            readFullTutorialBtn.setAttribute('data-listener-added', 'true');
        } else {
            console.error('❌ 完整教程按钮未找到');
        }
        
        // 完整制作人员按钮
        const readFullCreditsBtn = document.getElementById('readFullCreditsBtn');
        if (readFullCreditsBtn) {
            readFullCreditsBtn.addEventListener('click', () => {
                console.log('👥 打开完整制作人员');
                this.loadAndShowFullDocument('./docs/credits.html', '👥 Full Credits');
            });
        } else {
            console.error('❌ 完整制作人员按钮未找到');
        }
        
        // 完整许可证按钮
        const readFullLicenseBtn = document.getElementById('readFullLicenseBtn');
        if (readFullLicenseBtn) {
            readFullLicenseBtn.addEventListener('click', () => {
                console.log('📄 打开完整许可证');
                this.loadAndShowFullDocument('./docs/LICENSE', '📄 Full License');
            });
        } else {
            console.error('❌ 完整许可证按钮未找到');
        }
        
        // 关闭完整文档对话框按钮
        const closeFullDocumentBtn = document.getElementById('closeFullDocumentBtn');
        if (closeFullDocumentBtn) {
            closeFullDocumentBtn.addEventListener('click', () => {
                console.log('❌ 关闭完整文档对话框');
                this.hideDialog('fullDocumentDialog');
            });
        } else {
            console.error('❌ 关闭完整文档按钮未找到');
        }
    }
    
    /**
     * 显示对话框 - 从js/ui/ui-manager.js合并
     */
    static showDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.style.display = 'flex';
            
        } else {
            console.error('❌ 对话框未找到:', dialogId);
        }
    }
    
    /**
     * 隐藏对话框 - 从js/ui/ui-manager.js合并
     */
    static hideDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.style.display = 'none';
        } else {
            console.error('❌ 对话框未找到:', dialogId);
        }
    }
    
    /**
     * 加载并显示完整文档 - 从js/ui/ui-manager.js合并
     */
    static async loadAndShowFullDocument(filePath, title) {
        const fullDocDialog = document.getElementById('fullDocumentDialog');
        const fullDocTitle = document.getElementById('fullDocumentTitle');
        const fullDocContent = document.getElementById('fullDocumentContent');
        
        try {
            // 设置标题
            fullDocTitle.textContent = title;
            
            // 显示对话框
            fullDocDialog.style.display = 'flex';
            
            // 显示加载状态
            fullDocContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #667eea;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>Loading document...</div>';
            
            // 加载文档文件
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const fileContent = await response.text();
            
            // 根据文件类型处理内容
            let htmlContent;
            if (filePath.endsWith('.html')) {
                // 对于HTML文件，提取body内容
                const parser = new DOMParser();
                const doc = parser.parseFromString(fileContent, 'text/html');
                const bodyContent = doc.body.innerHTML;
                htmlContent = bodyContent;
            } else if (filePath.endsWith('.md') || filePath.endsWith('LICENSE')) {
                // 对于Markdown或文本文件，使用marked.js渲染
                htmlContent = marked.parse(fileContent);
            } else {
                // 对于纯文本文件，保持原样
                htmlContent = `<pre style="white-space: pre-wrap; font-family: inherit;">${fileContent}</pre>`;
            }
            
            // 将内容插入到对话框
            fullDocContent.innerHTML = htmlContent;
            
            
        } catch (error) {
            console.error(`❌ Error loading full document: ${filePath}`, error);
            fullDocContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <h3>⚠️ Error Loading Document</h3>
                    <p>Unable to load the document file. Please check if the file exists at <code>${filePath}</code></p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="control-btn" onclick="UIManager.loadAndShowFullDocument('${filePath}', '${title}')" style="margin-top: 20px;">🔄 Retry</button>
                </div>
            `;
        }
    }
    
    /**
     * 隐藏信息菜单 - 从js/ui/ui-manager.js合并
     */
    static hideInfoMenu() {
        const infoMenu = document.getElementById('infoMenu');
        if (infoMenu) {
            infoMenu.style.display = 'none';
        }
    }
}
