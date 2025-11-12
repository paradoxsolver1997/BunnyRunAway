/**
 * 按钮事件管理器 - 管理所有按钮的事件监听器
 */

export class ButtonEventManager {
    constructor(gameController, dialogManager) {
        this.gameController = gameController;
        this.dialogManager = dialogManager;
    }
    
    /**
     * 设置所有按钮事件监听器
     */
    setupButtonEventListeners() {
        
        this.setupGameControlButtons();
        this.setupDifficultyButtons();
        this.setupMapControlButtons();
        this.setupDialogButtons();
    }
    
    /**
     * 设置游戏控制按钮
     */
    setupGameControlButtons() {
        // 统一游戏按钮
        const unifiedGameBtn = document.getElementById('unifiedGameBtn');
        if (unifiedGameBtn) {
            unifiedGameBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.handleButtonClick) {
                    await this.gameController.handleButtonClick('unifiedGameBtn');
                }
            });
        }
        
        // 暂停按钮
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.handleButtonClick) {
                    await this.gameController.handleButtonClick('pause');
                }
            });
        }
    }
    
    /**
     * 设置难度切换开关
     */
    setupDifficultyButtons() {
        // 难度模式切换开关
        const difficultyToggle = document.getElementById('difficultyToggle');
        const easyModeText = document.getElementById('easyModeText');
        const hardModeText = document.getElementById('hardModeText');
        
        if (difficultyToggle && easyModeText && hardModeText) {
            difficultyToggle.addEventListener('click', () => {
                const currentDifficulty = difficultyToggle.dataset.difficulty;
                const newDifficulty = currentDifficulty === 'easy' ? 'hard' : 'easy';
                
                // 更新toggle状态
                difficultyToggle.dataset.difficulty = newDifficulty;
                difficultyToggle.classList.toggle('hard', newDifficulty === 'hard');
                
                // 更新文本样式以突出显示当前模式
                if (newDifficulty === 'easy') {
                    easyModeText.style.color = '#ffd700'; // 金色高亮
                    easyModeText.style.fontWeight = 'bold';
                    hardModeText.style.color = 'rgba(255,255,255,0.7)'; // 普通颜色
                    hardModeText.style.fontWeight = 'normal';
                } else {
                    hardModeText.style.color = '#ffd700'; // 金色高亮
                    hardModeText.style.fontWeight = 'bold';
                    easyModeText.style.color = 'rgba(255,255,255,0.7)'; // 普通颜色
                    easyModeText.style.fontWeight = 'normal';
                }
                
                console.log('Mode changed to:', newDifficulty);
                
                // 实现模式切换逻辑（只切换同等地图号的不同难度版本）
                if (this.gameController && this.gameController.switchDifficultyMode) {
                    this.gameController.switchDifficultyMode(newDifficulty);
                }
            });
        }
    }
    
    /**
     * 设置地图控制按钮
     */
    setupMapControlButtons() {
        // 上一张地图按钮
        const prevMapBtn = document.getElementById('prevMapBtn');
        if (prevMapBtn) {
            prevMapBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.loadPreviousMap) {
                    await this.gameController.loadPreviousMap();
                }
            });
        }
        
        // 下一张地图按钮
        const nextMapBtn = document.getElementById('nextMapBtn');
        if (nextMapBtn) {
            nextMapBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.loadNextMap) {
                    await this.gameController.loadNextMap();
                }
            });
        }
        
        // 随机地图按钮
        const randomMapBtn = document.getElementById('randomMapBtn');
        if (randomMapBtn) {
            randomMapBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.loadRandomMap) {
                    await this.gameController.loadRandomMap();
                }
            });
        }
        
        // 自选地图按钮
        const customMapBtn = document.getElementById('customMapBtn');
        if (customMapBtn) {
            customMapBtn.addEventListener('click', () => {
                this.dialogManager.showCustomMapDialog();
            });
        }
        
        // 重置游戏按钮
        const resetGameBtn = document.getElementById('resetGameBtn');
        if (resetGameBtn) {
            resetGameBtn.addEventListener('click', async () => {
                if (this.gameController && this.gameController.resetGame) {
                    // 先重置游戏对象，然后通过事件驱动状态转换
                    await this.gameController.resetGame();
                    this.gameController.stateTransitionService.emitUserStopGame();
                }
            });
        }
    }
    
    /**
     * 设置对话框按钮
     */
    setupDialogButtons() {
        // 停止游戏确认对话框按钮
        const confirmStopBtn = document.getElementById('confirmStopBtn');
        if (confirmStopBtn) {
            confirmStopBtn.addEventListener('click', async () => {
                this.dialogManager.hideStopGameDialog();
                if (this.gameController && this.gameController.resetGame && this.gameController.stateTransitionService) {
                    // 先重置游戏对象
                    await this.gameController.resetGame();
                    // 如果当前处于暂停状态，先恢复游戏到运行状态
                    if (this.gameController.stateTransitionService.isPaused()) {
                        console.log('🔄 检测到游戏处于暂停状态，先恢复游戏到运行状态');
                        await this.gameController.stateTransitionService.resumeGame();
                    }
                    // 设置 STOP_OK 标志位为 true，这会自动触发状态转换
                    this.gameController.stateTransitionService.setStopOk(true);
                } else {
                }
            });
        }

        const cancelStopBtn = document.getElementById('cancelStopBtn');
        if (cancelStopBtn) {
            cancelStopBtn.addEventListener('click', () => {
                this.dialogManager.hideStopGameDialog();
                // 取消停止对话框，发布恢复游戏事件让状态管理器处理
                if (this.gameController && this.gameController.stateTransitionService) {
                    this.gameController.stateTransitionService.emitResumeGame();
                }
            });
        }

        // 新游戏对话框按钮
        const confirmNewGameBtn = document.getElementById('confirmNewGameBtn');
        if (confirmNewGameBtn) {
            confirmNewGameBtn.addEventListener('click', () => {
                this.dialogManager.hideNewGameDialog();
                if (this.gameController && this.gameController.stateTransitionService) {
                    this.gameController.stateTransitionService.emitRestartGame();
                }
            });
        }

        const cancelNewGameBtn = document.getElementById('cancelNewGameBtn');
        if (cancelNewGameBtn) {
            cancelNewGameBtn.addEventListener('click', () => {
                this.dialogManager.hideNewGameDialog();
                if (this.gameController && this.gameController.stateTransitionService) {
                    this.gameController.stateTransitionService.emitStartGame();
                }
            });
        }

        // 地图选择对话框按钮
        const confirmMapBtn = document.getElementById('confirmMapSelectionBtn');
        if (confirmMapBtn) {
            confirmMapBtn.addEventListener('click', () => {
                this.dialogManager.hideMapSelectionDialog();
                if (this.gameController && this.gameController.stateTransitionService) {
                    this.gameController.stateTransitionService.emitStartGame();
                }
            });
        }

        const cancelMapBtn = document.getElementById('cancelMapSelectionBtn');
        if (cancelMapBtn) {
            cancelMapBtn.addEventListener('click', () => {
                this.dialogManager.hideMapSelectionDialog();
                if (this.gameController && this.gameController.stateTransitionService) {
                    this.gameController.stateTransitionService.emitStartGame();
                }
            });
        }

        // 地图选择对话框中的地图选择按钮（复用现有功能）
        // 注意：这些按钮和面板上的按钮是同一个ID，所以事件监听器会共享
        // 但我们需要确保在地图选择对话框中点击时能正确工作

        // 自选地图对话框按钮
        const confirmCustomMapBtn = document.getElementById('confirmCustomMap');
        if (confirmCustomMapBtn) {
            confirmCustomMapBtn.addEventListener('click', () => {
                const mapNumberInput = document.getElementById('customMapNumber');
                const mapNumber = parseInt(mapNumberInput.value);
                
                if (mapNumber >= 1 && mapNumber <= 30) {
                    this.dialogManager.hideCustomMapDialog();
                    if (this.gameController && this.gameController.loadCustomMap) {
                        this.gameController.loadCustomMap(mapNumber);
                    }
                } else {
                    alert('Please enter a map number between 1 and 30');
                }
            });
        }

        const cancelCustomMapBtn = document.getElementById('cancelCustomMap');
        if (cancelCustomMapBtn) {
            cancelCustomMapBtn.addEventListener('click', () => {
                this.dialogManager.hideCustomMapDialog();
            });
        }

        // 胜利对话框按钮
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', async () => {
                this.dialogManager.hideVictoryDialog();
                // 胜利后重新开始游戏需要完全重置
                if (this.gameController && this.gameController.resetGame) {
                    console.log('🎊 胜利后重新开始游戏，执行完全重置');
                    await this.gameController.resetGame();
                    this.gameController.stateTransitionService.emitUserStopGame();
                } else if (this.gameController && this.gameController.handleButtonClick) {
                    // 回退到原来的处理方式
                    this.gameController.handleButtonClick('unifiedGameBtn');
                }
            });
        }

    }
}

// 默认导出
export default ButtonEventManager;
