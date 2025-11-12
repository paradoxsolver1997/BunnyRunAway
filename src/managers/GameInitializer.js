/**
 * 游戏初始化器 - 管理游戏的完整初始化过程
 */

import { GameController } from '../core/GameController.js';
import { DialogManager } from './DialogManager.js';
import { ButtonEventManager } from './ButtonEventManager.js';
import { TutorialManager } from './TutorialManager.js';

export class GameInitializer {
    constructor() {
        this.gameController = null;
        this.dialogManager = null;
        this.buttonEventManager = null;
        this.tutorialManager = null;
        this.isInitialized = false;
        
        // 加载进度跟踪
        this.loadingSteps = [
            { name: 'System Initialization', weight: 20, current: 0, total: 4 },
            { name: 'Resource Loading', weight: 60, current: 0, total: 0 },
            { name: 'Game System Initialization', weight: 20, current: 0, total: 4 }
        ];
        this.currentStep = 0;
        this.overallProgress = 0;
    }
    
    /**
     * 更新加载状态
     */
    updateLoadingStatus(message) {
        const statusElement = document.getElementById('loadingStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log(`📋 ${message}`);
    }
    
    /**
     * 更新详细加载信息
     */
    updateLoadingDetails(details, step = null) {
        const detailsElement = document.getElementById('loadingDetails');
        const stepElement = document.getElementById('loadingStep');
        
        if (detailsElement) {
            detailsElement.textContent = details;
        }
        
        if (stepElement && step !== null) {
            stepElement.textContent = step;
        }
    }
    
    /**
     * 更新加载进度
     */
    updateLoadingProgress(stepIndex, subProgress = 0, details = '') {
        if (stepIndex >= 0 && stepIndex < this.loadingSteps.length) {
            const step = this.loadingSteps[stepIndex];
            step.current = subProgress;
            
            // 计算总体进度
            let totalProgress = 0;
            for (let i = 0; i < this.loadingSteps.length; i++) {
                const currentStep = this.loadingSteps[i];
                if (i < stepIndex) {
                    // 已完成步骤
                    totalProgress += currentStep.weight;
                } else if (i === stepIndex) {
                    // 当前步骤
                    const stepProgress = currentStep.total > 0 ? (currentStep.current / currentStep.total) : 0;
                    totalProgress += currentStep.weight * stepProgress;
                }
            }
            
            this.overallProgress = Math.round(totalProgress);
            
            // 更新UI
            this.updateProgressBar(this.overallProgress);
            this.updateLoadingDetails(details);
            this.updateLoadingStatus(`${step.name}...`);
        }
    }
    
    /**
     * 更新进度条
     */
    updateProgressBar(percentage) {
        const progressBar = document.getElementById('loadingProgressBar');
        const percentageElement = document.getElementById('loadingPercentage');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
    }
    
    /**
     * 设置资源加载步骤总数
     */
    setResourceLoadingTotal(total) {
        this.loadingSteps[1].total = total;
    }
    
    /**
     * 更新资源加载进度
     */
    updateResourceLoadingProgress(current, total, resourceName = '') {
        this.loadingSteps[1].current = current;
        this.loadingSteps[1].total = total;
        
        const details = resourceName ? `Loading ${resourceName}...` : `Loading resources... (${current}/${total})`;
        this.updateLoadingProgress(1, current, details);
    }
    
    /**
     * 隐藏加载覆盖层
     */
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * 初始化游戏系统
     */
    async initializeGame() {
        try {
            // 步骤1：系统初始化
            this.updateLoadingProgress(0, 0, 'Preparing game systems...');
            this.updateLoadingDetails('Initializing dialog manager...', 'Step 1 of 8');
            
            // 初始化对话框管理器
            this.dialogManager = new DialogManager();
            this.dialogManager.exposeToGlobal();
            this.updateLoadingProgress(0, 1, 'Dialog manager ready');
            
            // 获取Canvas元素
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Game canvas not found');
            }
            
            // 设置Canvas尺寸（与HTML中的尺寸保持一致）
            const width = 900;
            const height = 600;
            canvas.width = width;
            canvas.height = height;
            
            this.updateLoadingProgress(0, 2, 'Canvas configured');
            this.updateLoadingDetails('Setting up game canvas...', 'Step 2 of 8');
            
            // 初始化游戏控制器
            this.gameController = new GameController(canvas, width, height);
            // 设置对话框管理器引用
            this.gameController.dialogManager = this.dialogManager;
            // 设置进度回调
            this.gameController.setProgressCallback((step, details) => {
                this.updateResourceLoadingProgress(step, 6, details);
            });
            this.updateLoadingProgress(0, 3, 'Game controller created');
            this.updateLoadingDetails('Initializing game controller...', 'Step 3 of 8');
            
            // 初始化按钮事件管理器
            this.buttonEventManager = new ButtonEventManager(this.gameController, this.dialogManager);
            this.buttonEventManager.setupButtonEventListeners();
            this.updateLoadingProgress(0, 4, 'Button events configured');
            this.updateLoadingDetails('Setting up button events...', 'Step 4 of 8');
            
            // 初始化教程管理器
            this.tutorialManager = new TutorialManager();
            this.updateLoadingDetails('Initializing tutorial system...', 'Step 5 of 8');
            
            // 步骤2：资源加载（由GameController.initialize处理）
            this.updateLoadingDetails('Loading game resources...', 'Step 6 of 8');
            
            // 初始化游戏系统
            const success = await this.gameController.initialize();
            if (success) {
                this.updateLoadingProgress(2, 4, 'Game system initialized successfully!');
                this.updateLoadingDetails('Finalizing game setup...', 'Step 7 of 8');
                this.hideLoadingOverlay();
                this.isInitialized = true;
                
                // 🆕 修复：只启动轻量级渲染，不启动GameLoop
                // 注意：GameLoop将在状态转换到RUNNING时启动
                this.gameController.startInitialRendering();
                
                // 注意：音乐将在用户首次交互后自动播放
                // 通过教程系统或任何按钮点击来触发用户交互
                
                // 设置全局gameController引用，供UI使用
                window.gameController = this.gameController;
                
                // 设置全局gameEventBus引用，供UI使用
                if (this.gameController.stateTransitionService && this.gameController.stateTransitionService.stateManager) {
                    // 通过StateTransitionService获取gameEventBus
                    const { gameEventBus } = await import('../core/GameEventBus.js');
                    window.gameEventBus = gameEventBus;
                }
                
                // 设置全局gameInitializer引用，供教程系统使用
                window.gameInitializer = this;
                
                // 检查是否需要显示教程
                if (this.tutorialManager.shouldShowTutorial()) {
                    this.updateLoadingDetails('Starting interactive tutorial...', 'Step 8 of 8');
                    // 延迟一点时间确保游戏界面完全加载
                    setTimeout(() => {
                        this.startTutorial();
                    }, 10);
                } else {
                    this.updateLoadingDetails('Game ready to play!', 'Complete');
                }
                
                console.log('🎊 Game initialization completed successfully!');
                return true;
            } else {
                throw new Error('Game system initialization failed');
            }
            
        } catch (error) {
            console.error(`❌ Initialization failed: ${error.message}`);
            console.error('Game initialization error:', error);
            this.updateLoadingStatus(`Initialization failed: ${error.message}`);
            this.updateLoadingDetails(`Error: ${error.message}`, 'Failed');
            return false;
        }
    }
    
    /**
     * 获取游戏控制器实例
     */
    getGameController() {
        return this.gameController;
    }
    
    /**
     * 获取对话框管理器实例
     */
    getDialogManager() {
        return this.dialogManager;
    }
    
    /**
     * 获取按钮事件管理器实例
     */
    getButtonEventManager() {
        return this.buttonEventManager;
    }
    
    /**
     * 检查是否已初始化
     */
    isGameInitialized() {
        return this.isInitialized;
    }
    
    /**
     * 启动教程
     */
    async startTutorial() {
        if (this.tutorialManager) {
            // 设置教程完成回调
            this.tutorialManager.setOnTutorialComplete(() => {
                console.log('🎓 教程完成，游戏可以正常使用');
                // 可以在这里添加教程完成后的逻辑
            });
            
            await this.tutorialManager.startTutorial();
        }
    }
    
    /**
     * 获取教程管理器实例
     */
    getTutorialManager() {
        return this.tutorialManager;
    }
    
    /**
     * 重置教程状态（用于测试）
     */
    resetTutorial() {
        if (this.tutorialManager) {
            this.tutorialManager.resetTutorial();
        }
    }
}

// 默认导出
export default GameInitializer;
