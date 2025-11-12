/**
 * 对话框管理器 - 管理所有游戏对话框的显示和隐藏
 */

export class DialogManager {
    constructor() {
        this.dialogs = {
            stopGame: 'stopGameDialog',
            newGame: 'newGameDialog',
            mapSelection: 'mapSelectionDialog',
            customMap: 'customMapDialog',
            victory: 'victoryDialog'
        };
        
        // 设置事件监听器
        this.setupEventListeners();
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 胜利对话框按钮事件
        const continueBtn = document.getElementById('continueCurrentMapBtn');
        const tryNextBtn = document.getElementById('tryNextMapBtn');
        
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.hideVictoryDialog();
                // 触发继续当前地图事件
                if (window.gameEventBus) {
                    window.gameEventBus.emit('victory_continue_current');
                }
            });
        }
        
        if (tryNextBtn) {
            tryNextBtn.addEventListener('click', () => {
                this.hideVictoryDialog();
                // 触发尝试下一张地图事件
                if (window.gameEventBus) {
                    window.gameEventBus.emit('victory_try_next_map');
                }
            });
        }
    }
    
    /**
     * 显示停止游戏确认对话框
     */
    showStopGameDialog() {
        const dialog = document.getElementById(this.dialogs.stopGame);
        if (dialog) {
            dialog.style.display = 'flex';
        } else {
        }
    }
    
    /**
     * 隐藏停止游戏确认对话框
     */
    hideStopGameDialog() {
        const dialog = document.getElementById(this.dialogs.stopGame);
        if (dialog) {
            dialog.style.display = 'none';
        }
    }
    
    /**
     * 显示新游戏对话框
     */
    showNewGameDialog() {
        const dialog = document.getElementById(this.dialogs.newGame);
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏新游戏对话框
     */
    hideNewGameDialog() {
        const dialog = document.getElementById(this.dialogs.newGame);
        if (dialog) {
            dialog.style.display = 'none';
        }
    }
    
    /**
     * 显示地图选择对话框
     */
    showMapSelectionDialog() {
        const dialog = document.getElementById(this.dialogs.mapSelection);
        if (dialog) {
            dialog.style.display = 'flex';
            
            // 启用地图控制按钮，让用户可以选择地图
            this.enableMapControlButtons();
        }
    }
    
    /**
     * 启用地图控制按钮
     */
    enableMapControlButtons() {
        const mapButtons = ['nextMapBtn', 'randomMapBtn', 'customMapBtn'];
        mapButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = false;
                console.log(`✅ 地图控制按钮 ${buttonId} 已启用`);
            }
        });
    }
    
    /**
     * 禁用地图控制按钮
     */
    disableMapControlButtons() {
        const mapButtons = ['nextMapBtn', 'randomMapBtn', 'customMapBtn'];
        mapButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = true;
                console.log(`❌ 地图控制按钮 ${buttonId} 已禁用`);
            }
        });
    }
    
    /**
     * 隐藏地图选择对话框
     */
    hideMapSelectionDialog() {
        const dialog = document.getElementById(this.dialogs.mapSelection);
        if (dialog) {
            dialog.style.display = 'none';
            
            // 禁用地图控制按钮，恢复到正常状态
            this.disableMapControlButtons();
        }
    }
    
    /**
     * 显示自选地图对话框
     */
    showCustomMapDialog() {
        const dialog = document.getElementById(this.dialogs.customMap);
        if (dialog) {
            dialog.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏自选地图对话框
     */
    hideCustomMapDialog() {
        const dialog = document.getElementById(this.dialogs.customMap);
        if (dialog) {
            dialog.style.display = 'none';
        }
    }
    
    /**
     * 显示胜利庆祝画面
     */
    showVictoryDialog(winner, stats = {}) {
        const dialog = document.getElementById(this.dialogs.victory);
        const title = document.getElementById('victoryTitle');
        const message = document.getElementById('victoryMessage');
        const continueBtn = document.getElementById('continueCurrentMapBtn');
        const tryNextBtn = document.getElementById('tryNextMapBtn');
        
        if (dialog && title && message && continueBtn && tryNextBtn) {
            if (winner === 'player' || winner === 'Player') {
                title.textContent = '🎉 Bunny Caught! You Win! 🎉';
                message.textContent = 'Congratulations! You successfully trapped the bunny!';
            } else {
                title.textContent = '🐰 Bunny Escaped! You Lose! 🐰';
                message.textContent = 'The bunny got away! Try again to catch it!';
            }
            
            // 检查是否可以尝试下一张地图
            const canTryNext = this.canTryNextMap();
            tryNextBtn.disabled = !canTryNext;
            tryNextBtn.textContent = canTryNext ? 'Try Next Map' : 'No More Maps';
            
            dialog.style.display = 'flex';
        } else {
            console.error('❌ Victory dialog elements not found!', {
                dialog: !!dialog,
                title: !!title,
                message: !!message,
                continueBtn: !!continueBtn,
                tryNextBtn: !!tryNextBtn
            });
        }
    }
    
    /**
     * 检查是否可以尝试下一张地图
     */
    canTryNextMap() {
        // 通过全局gameController获取当前地图信息
        if (window.gameController && window.gameController.gameEngine) {
            const currentMapNumber = window.gameController.gameEngine.getCurrentMapNumber();
            const maxMapNumber = 30; // 假设最大地图号是30
            return currentMapNumber < maxMapNumber;
        }
        return false;
    }
    
    /**
     * 隐藏胜利庆祝画面
     */
    hideVictoryDialog() {
        const dialog = document.getElementById(this.dialogs.victory);
        if (dialog) {
            dialog.style.display = 'none';
        }
    }
    
    /**
     * 格式化游戏时间
     */
    formatGameTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * 将对话框函数暴露到全局作用域（为了向后兼容）
     */
    exposeToGlobal() {
        window.showStopGameDialog = () => this.showStopGameDialog();
        window.hideStopGameDialog = () => this.hideStopGameDialog();
        window.showNewGameDialog = () => this.showNewGameDialog();
        window.hideNewGameDialog = () => this.hideNewGameDialog();
        window.showMapSelectionDialog = () => this.showMapSelectionDialog();
        window.hideMapSelectionDialog = () => this.hideMapSelectionDialog();
        window.showCustomMapDialog = () => this.showCustomMapDialog();
        window.hideCustomMapDialog = () => this.hideCustomMapDialog();
        window.showVictoryDialog = (winner, stats) => this.showVictoryDialog(winner, stats);
        window.hideVictoryDialog = () => this.hideVictoryDialog();
    }
}

// 默认导出
export default DialogManager;
