/**
 * 主游戏控制器 - 整合所有游戏系统
 * 从integrated_game.html中提取的核心逻辑
 */

import { StateTransitionService } from './StateTransitionService.js';
import { CountdownService } from '../services/CountdownService.js';
import { UIService } from '../services/UIService.js';
import { LogService } from '../services/LogService.js';
import { UIManager } from './UIManager.js';
import { EventHandler } from './EventHandler.js';
import { GameLoop } from './GameLoop.js';
import { globalPauseManager } from './PauseManager.js';
import { AnimationCoordinator } from '../services/AnimationCoordinator.js';
import { GAME_CONFIG } from '../managers/ConfigManager.js';
import { StartButtonWidget } from '../services/StartButtonWidget.js';

export class GameController {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        
        // 进度回调
        this.progressCallback = null;
        
        // 确保canvas有正确的尺寸
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
            this.ctx = canvas.getContext('2d');
        } else {
            console.warn('GameController: canvas参数为空');
            this.ctx = null;
        }
        
        // 游戏配置常量 - 从ConfigManager获取
        this.MAX_MAP_NUMBER = GAME_CONFIG.MAX_MAP_NUMBER;
        this.MIN_MAP_NUMBER = GAME_CONFIG.MIN_MAP_NUMBER;
        
        // 🆕 优化：INITIAL 状态轻量级渲染系统
        this.initialRenderId = null; // INITIAL 状态的渲染ID
        this.needsRender = false;   // 按需渲染标志
        this.renderFrameId = null;  // 按需渲染ID
        
        // 核心系统 - 使用新的集中式状态管理
        this.stateTransitionService = new StateTransitionService();
        this.stateTransitionService.setGameController(this);
        this.stateTransitionService.setPauseManager(globalPauseManager);
        this.countdownManager = new CountdownService();
        this.uiSystem = new UIService(canvas, width, height);
        this.logSystem = new LogService();
        
        // 新的模块化组件
        this.uiManager = new UIManager();
        this.eventHandler = new EventHandler(this);
        // 🆕 GameLoop 现在由状态管理器负责创建和销毁
        this.gameLoop = null;
        
        // 初始化动画协调器（保守迁移：保持原有逻辑不变）
        this.animationCoordinator = new AnimationCoordinator();
        
        // 地图相关
        this.selectedDifficulty = 'easy';
        this.currentMapNumber = 1;
        this.isMapLoaded = false;
        
        // 游戏状态
        this.isRunning = false;
        this.splashStartTime = null;
        
        // 外部系统引用（将在初始化时设置）
        this.gameEngine = null;
        this.assetLoader = null;
        this.mapRenderer = null;
        this.spriteManager = null;
        this.blockerManager = null;
        this.parameterManager = null;
        
        // 沙箱组件
        this.startButtonWidget = null;
        
        this.setupCallbacks();
    }
    
    setupCallbacks() {
        // 设置回调 - 使用新的状态转换服务
        this.countdownManager.setOnCountdownFinished(() => {
            this.stateTransitionService.emitCountdownFinished();
        });
        
        this.uiSystem.setOnButtonClick(async (buttonName) => {
            await this.eventHandler.handleButtonClick(buttonName);
        });
        
        // 设置UI管理器的依赖 - 传递状态转换服务
        this.uiManager.setDependencies(this.stateTransitionService, this);
        
        // 🆕 修复：不再需要设置Canvas，EventHandler不再处理Canvas事件
    }
    
    setupGameEngineCallbacks() {
        // 设置游戏引擎回调 - 直接调用 StateTransitionService
        if (this.gameEngine) {
            this.gameEngine.onGameOver = (winner) => {
                this.stateTransitionService.gameOver(winner);
            };
        }
    }
    
    
    
    /**
     * 获取游戏时间（占位符）
     */
    getGameTime() {
        // TODO: 实现游戏时间计算
        return 0;
    }
    
    /**
     * 加载下一张地图
     */
    async loadNextMap() {
        try {
            if (this.currentMapNumber >= this.MAX_MAP_NUMBER) {
                this.logSystem.log('❌ 已经是最后一张地图', 'warning');
                return false;
            }
            
            this.currentMapNumber++;
            this.logSystem.log(`🗺️ 加载下一张地图: ${this.selectedDifficulty} 难度第${this.currentMapNumber}张`, 'info');
            
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 下一张地图加载成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 下一张地图初始化完成', 'success');
                return true;
            } else {
                this.logSystem.log('❌ 下一张地图加载失败，回到第一张地图', 'error');
                this.currentMapNumber = 1;
                return false;
            }
        } catch (error) {
            this.logSystem.log(`❌ 加载下一张地图时发生错误: ${error.message}`, 'error');
            this.currentMapNumber = 1;
            return false;
        }
    }
    
    /**
     * 加载上一张地图
     */
    async loadPreviousMap() {
        try {
            if (this.currentMapNumber > this.MIN_MAP_NUMBER) {
                this.currentMapNumber--;
            } else {
                this.logSystem.log('❌ 已经是第一张地图', 'warning');
                return false;
            }
            
            this.logSystem.log(`🗺️ 加载上一张地图: ${this.selectedDifficulty} 难度第${this.currentMapNumber}张`, 'info');
            
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 上一张地图加载成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 上一张地图初始化完成', 'success');
                return true;
            } else {
                this.logSystem.log('❌ 上一张地图加载失败', 'error');
                return false;
            }
        } catch (error) {
            this.logSystem.log(`❌ 加载上一张地图时发生错误: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 加载随机地图
     */
    async loadRandomMap() {
        try {
            // 使用种子随机数选择地图编号（1-30）
            const randomValue = this.stateTransitionService?.random ? 
                this.stateTransitionService.random() : Math.random();
            this.currentMapNumber = Math.floor(randomValue * this.MAX_MAP_NUMBER) + this.MIN_MAP_NUMBER;
            this.logSystem.log(`🗺️ 加载随机地图: ${this.selectedDifficulty} 难度第${this.currentMapNumber}张`, 'info');
            
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 随机地图加载成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 随机地图初始化完成', 'success');
                return true;
            } else {
                this.logSystem.log('❌ 随机地图加载失败', 'error');
                return false;
            }
        } catch (error) {
            this.logSystem.log(`❌ 加载随机地图时发生错误: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 切换难度
     */
    async changeDifficulty(newDifficulty) {
        try {
            if (newDifficulty === this.selectedDifficulty) {
                this.logSystem.log(`难度已经是 ${newDifficulty}`, 'info');
                return;
            }
            
            this.selectedDifficulty = newDifficulty;
            this.currentMapNumber = this.MIN_MAP_NUMBER; // 重置到第一张地图
            this.logSystem.log(`🎯 切换难度到: ${newDifficulty}`, 'info');
            
            // 重新加载当前地图
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 难度切换成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 新难度地图初始化完成', 'success');
            } else {
                this.logSystem.log('❌ 难度切换失败', 'error');
            }
        } catch (error) {
            this.logSystem.log(`❌ 切换难度时发生错误: ${error.message}`, 'error');
        }
    }
    
    /**
     * 切换难度模式（只切换同等地图号的不同难度版本）
     */
    async switchDifficultyMode(newDifficulty) {
        try {
            if (newDifficulty === this.selectedDifficulty) {
                this.logSystem.log(`模式已经是 ${newDifficulty}`, 'info');
                return;
            }
            
            this.selectedDifficulty = newDifficulty;
            this.logSystem.log(`🔄 切换模式到: ${newDifficulty} (地图 ${this.currentMapNumber})`, 'info');
            
            // 重新加载当前地图号的不同难度版本
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 模式切换成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 新模式地图初始化完成', 'success');
            } else {
                this.logSystem.log('❌ 模式切换失败', 'error');
            }
        } catch (error) {
            this.logSystem.log(`❌ 切换模式时发生错误: ${error.message}`, 'error');
        }
    }
    
    /**
     * 加载自定义地图
     */
    async loadCustomMap(mapNumber) {
        try {
            // 验证地图编号范围
            if (mapNumber < this.MIN_MAP_NUMBER || mapNumber > this.MAX_MAP_NUMBER) {
                this.logSystem.log(`❌ 地图编号超出范围: ${mapNumber} (范围: ${this.MIN_MAP_NUMBER}-${this.MAX_MAP_NUMBER})`, 'error');
                return false;
            }
            
            this.currentMapNumber = mapNumber;
            this.logSystem.log(`🗺️ 加载自定义地图: ${this.selectedDifficulty} 难度第${this.currentMapNumber}张`, 'info');
            
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 自定义地图加载成功', 'success');
                
                // 设置当前地图信息
                this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
                
                // 重新初始化游戏组件
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                this.logSystem.log('✅ 自定义地图初始化完成', 'success');
                return true;
            } else {
                this.logSystem.log('❌ 自定义地图加载失败', 'error');
                return false;
            }
        } catch (error) {
            this.logSystem.log(`❌ 加载自定义地图时发生错误: ${error.message}`, 'error');
            return false;
        }
    }
    
    async initialize() {
        try {
            this.logSystem.log('开始初始化完整游戏系统...', 'info');
            
            // 步骤1：初始化参数管理器
            const { initializeParameters } = await import(`../managers/ParameterManager.js?v=${Date.now()}`);
            this.parameterManager = await initializeParameters();
            this.logSystem.log('✅ 参数管理器初始化完成', 'success');
            
            // 步骤2：初始化资源加载器
            const { AssetManager } = await import(`../managers/AssetManager.js?v=${Date.now()}`);
            this.assetLoader = new AssetManager(this.parameterManager);
            // 设置资源加载进度回调
            this.assetLoader.setProgressCallback((current, total, resourceName) => {
                this.updateProgress(1, `Loading ${resourceName}... (${current}/${total})`);
            });
            this.logSystem.log('✅ 资源加载器初始化完成', 'success');
            
            // 步骤3：预加载核心资源
            this.updateProgress(1, 'Loading game assets...');
            const loadSuccess = await this.assetLoader.preloadCoreAssets();
            if (!loadSuccess) {
                throw new Error('核心资源加载失败');
            }
            this.logSystem.log('✅ 核心资源预加载完成', 'success');
            
            // 步骤4：设置倒计时管理器的资源管理器
            this.updateProgress(2, 'Configuring countdown system...');
            this.countdownManager.assetManager = this.assetLoader;
            this.logSystem.log('✅ 倒计时管理器资源设置完成', 'success');
            
            // 步骤5：地图管理器现在由 GameEngine 内部管理
            this.updateProgress(3, 'Setting up map system...');
            this.logSystem.log('✅ 地图管理器将由 GameEngine 内部管理', 'success');
            
            // 步骤6：初始化路障管理器
            this.updateProgress(4, 'Initializing blocker system...');
            const { BlockerService } = await import(`../services/BlockerService.js?v=${Date.now()}`);
            this.blockerManager = new BlockerService(this.assetLoader);
            this.logSystem.log('✅ 路障管理器初始化完成', 'success');
            
            // 步骤7：初始化地图渲染器
            this.updateProgress(5, 'Setting up map renderer...');
            const { MapRenderer } = await import(`../services/MapRenderer.js?v=${Date.now()}`);
            this.mapRenderer = new MapRenderer(this.assetLoader, this.parameterManager, this.blockerManager, this.stateTransitionService);
            this.logSystem.log('✅ 地图渲染器初始化完成', 'success');
            
            // 设置BlockerService和MapRenderer之间的引用
            if (this.blockerManager && this.mapRenderer) {
                this.blockerManager.setMapRenderer(this.mapRenderer);
                this.logSystem.log('✅ BlockerService和MapRenderer引用已设置', 'success');
            }
            
            // 步骤8：初始化开始按钮沙箱组件
            this.updateProgress(6, 'Initializing UI components...');
            this.startButtonWidget = new StartButtonWidget(this.stateTransitionService, this.canvas, this.assetLoader, this);
            this.startButtonWidget.create(); // 激活组件
            this.logSystem.log('✅ 开始按钮沙箱组件初始化完成', 'success');
            
            // 初始化精灵管理器
            const { SpriteService } = await import(`../services/SpriteService.js?v=${Date.now()}`);
            this.spriteManager = new SpriteService();
            this.logSystem.log('✅ 精灵管理器初始化完成', 'success');
            
            // 初始化音频管理器
            const { AudioManager } = await import(`../managers/AudioManager.js?v=${Date.now()}`);
            this.audioManager = new AudioManager();
            const audioSuccess = await this.audioManager.initialize();
            if (audioSuccess) {
                this.logSystem.log('✅ 音频管理器初始化完成', 'success');
                // 初始化音乐按钮状态，确保与AudioManager的默认状态一致
                this.updateMusicButtonIcon(this.audioManager.isMutedState());
            } else {
                this.logSystem.log('⚠️ 音频管理器初始化失败，继续运行', 'warning');
            }
            
            // 初始化游戏引擎（MapService 现在由 GameEngine 内部管理）
            const { GameEngine } = await import(`./GameEngine.js?v=${Date.now()}`);
            this.gameEngine = new GameEngine(null, this.parameterManager);
            this.gameEngine.gameController = this; // 设置游戏引擎对控制器的引用
            this.logSystem.log('✅ 游戏引擎初始化完成', 'success');
            
            // 设置游戏引擎回调
            this.setupGameEngineCallbacks();
            
            // 设置Canvas
            this.gameEngine.setCanvasSize(this.width, this.height);
            
            // 初始化寻路系统
            
            // 自动加载默认地图和创建兔子
            await this.initializeGameAfterSplash();
            
            // 设置回调函数
            this.setupCallbacks();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 🆕 创建初始 GameLoop（但不启动）
            this.gameLoop = new GameLoop(this);
            this.logSystem.log('✅ GameLoop 已创建（未启动）', 'success');
            
            this.logSystem.log('🎊 完整游戏系统初始化完成！', 'success');
            return true;
            
        } catch (error) {
            this.logSystem.log(`❌ 初始化失败: ${error.message}`, 'error');
            console.error('详细错误:', error);
            return false;
        }
    }
    
    async initializeGameAfterSplash() {
        this.logSystem.log('启动画面完成，开始初始化游戏组件...', 'info');
        
        const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
        
        if (success) {
            this.isMapLoaded = true;
            this.logSystem.log('✅ 默认地图加载成功', 'success');
            
            // 设置当前地图信息
            this.gameEngine.setCurrentMapInfo(this.selectedDifficulty, this.currentMapNumber);
            
            // 初始化自主路障管理器
            this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
            
            // 注意：Bunny实例的创建移到autoCreateBunnySprite方法中
            // 这里只初始化BlockerService的鼠标事件监听（不传入bunny实例）
            if (this.blockerManager && this.canvas) {
                this.blockerManager.initializeMouseListeners(
                    this.canvas, 
                    this.gameEngine.getGameState(), 
                    this.stateTransitionService,
                    null, // 暂时不传入bunny实例，等autoCreateBunnySprite创建后再设置
                    this // 🔧 新增：传入GameController引用用于UI更新
                );
            }
            
            await this.autoCreateBunnySprite();
            
            // 兔子的动态地图现在由Bunny类自己初始化
            
            this.uiManager.updateMapInfo();
            
            // 状态转换：从SPLASH到INITIAL
            // 注意：新的状态管理器没有SPLASH状态，直接使用INITIAL状态
            // this.stateTransitionService.transitionTo('initial');
            
            // Add a small delay to ensure DOM elements are available
            setTimeout(() => {
            this.uiManager.enableGameControls();
                this.uiManager.updateUIState();
            }, 100);
            
            this.logSystem.log('✅ 兔子已自动放置', 'success');
        } else {
            this.logSystem.log('❌ 默认地图加载失败', 'error');
        }
    }
    
    start() {
        this.isRunning = true;
        this.gameLoop.start();
    }
    
    /**
     * 设置进度回调
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    /**
     * 更新进度
     */
    updateProgress(step, details = '') {
        if (this.progressCallback) {
            this.progressCallback(step, details);
        }
    }
    
    async loadMap() {
        try {
            this.logSystem.log(`🗺️ 加载地图: ${this.selectedDifficulty} 难度第${this.currentMapNumber}张`, 'info');
            
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 地图加载成功', 'success');
                
                // 初始化自主路障管理器
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader);
                
                await this.autoCreateBunnySprite();
                this.uiManager.updateMapInfo();
                
                // Add a small delay to ensure DOM elements are available
                setTimeout(() => {
                this.uiManager.enableGameControls();
                }, 100);
                
                this.logSystem.log('✅ 兔子已自动放置', 'success');
                return true;
            } else {
                this.logSystem.log('❌ 地图加载失败', 'error');
                return false;
            }
        } catch (error) {
            this.logSystem.log(`❌ 地图加载错误: ${error.message}`, 'error');
            return false;
        }
    }
    
    async autoCreateBunnySprite() {
        if (!this.assetLoader) {
            return false;
        }
        
        const bunnyAnimation = this.assetLoader.getAnimation('bunny');
        if (bunnyAnimation) {
            // 使用新的Bunny类的位置
            const bunnyStartPos = this.gameEngine.scaledPositions.get(this.gameEngine.mapData.bunny_start);
            if (!bunnyStartPos) {
                console.error('无法找到兔子起始位置');
                return false;
            }
            
            // 创建纯JavaScript版本的Bunny实例
            const { Bunny } = await import(`../services/Bunny.js?v=${Date.now()}`);
            const bunny = new Bunny(
                this.gameEngine.mapData.bunny_start,
                bunnyStartPos,
                this.gameEngine.getGameState(),
                bunnyAnimation
            );
            
            // 兔子的图结构现在由Bunny类自己管理，不需要手动初始化
            
            // 应用渲染参数
            if (this.parameterManager) {
                const scale = this.parameterManager.get('bunny.rendering.scale', 0.3);
                const visible = this.parameterManager.get('bunny.rendering.visible', true);
                const alpha = this.parameterManager.get('bunny.rendering.alpha', 1.0);
                const speed = this.parameterManager.get('bunny.default_speed', 70);
                
                console.log(`🐰 兔子速度设置: ${speed} pixels/second`);
                
                bunny.scale = scale;
                bunny.visible = visible;
                bunny.alpha = alpha;
                bunny.speed = speed;
            }
            
            // 将融合后的Bunny添加到精灵管理器
            this.spriteManager.addSprite('bunny', bunny, 'characters');
            
            // 🆕 修复：正确启动动画
            bunny.startAnimation(true);
            if (bunny.animationManager) {
                bunny.animationManager.playAnimation('default', true);
                console.log('🎬 兔子动画管理器已启动');
            }
            
            // 保守迁移：注册兔子动画管理器到协调器（保持原有逻辑不变）
            if (this.animationCoordinator && bunny.animationManager) {
                this.animationCoordinator.registerAnimationManager('bunny', bunny.animationManager);
                console.log('🎬 兔子动画管理器已注册到协调器');
            }
            
            // 设置BlockerService的bunny引用
            if (this.blockerManager) {
                this.blockerManager.setBunny(bunny);
                console.log('🔗 BlockerService已关联到Bunny实例');
            }
            
            this.logSystem.log('✅ 兔子精灵创建成功', 'success');
            return true;
        }
        return false;
    }
    
    
    async resetGame() {
        try {
            this.logSystem.log('🔄 开始完全重置游戏...', 'info');
            
            // 1. 重置游戏引擎状态（包括兔子对象）
            if (this.gameEngine) {
                this.gameEngine.reset();
                this.logSystem.log('✅ 游戏引擎状态已完全重置', 'success');
            }
            
            // 2. 清空精灵管理器
            if (this.spriteManager) {
                this.spriteManager.clear();
                this.logSystem.log('✅ 精灵管理器已清空', 'success');
            }
            
            // 3. 清空路障管理器
            if (this.blockerManager) {
                this.blockerManager.clearAll();
                this.logSystem.log('✅ 路障管理器已清空', 'success');
            }
            
            // 4. 重置寻路系统
            
            // 5. 注意：不要在这里调用状态转换，避免双重重置
            // 状态转换会在其他地方处理
            this.logSystem.log('✅ 游戏对象重置完成，等待状态转换', 'success');
            
            // 6. 重新加载地图
            const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, this.currentMapNumber);
            
            if (success) {
                this.isMapLoaded = true;
                this.logSystem.log('✅ 地图重新加载成功', 'success');
                
                // 7. 初始化自主路障管理器
                this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                this.logSystem.log('✅ 自主路障管理器已重新初始化', 'success');
                
                // 8. 重新创建兔子精灵
                await this.autoCreateBunnySprite();
                this.logSystem.log('✅ 兔子精灵已重新创建', 'success');
                
                // 9. 兔子的图结构现在由Bunny类自己管理
                
                
                // 11. 更新UI状态
                this.uiManager.updateMapInfo();
                this.uiManager.updateBunnyStatus();
                this.logSystem.log('✅ UI状态已更新', 'success');
                
                // 12. 注意：游戏控制状态由CentralizedStateManager管理，这里不需要手动启用
                // setTimeout(() => {
                //     this.uiManager.enableGameControls();
                //     this.uiManager.updateUIState();
                // }, 100);
                
                this.logSystem.log('🎊 游戏完全重置完成！', 'success');
            } else {
                this.isMapLoaded = false;
                this.logSystem.log('❌ 地图重新加载失败', 'error');
            }
            
        } catch (error) {
            this.logSystem.log(`❌ 游戏重置失败: ${error.message}`, 'error');
            console.error('详细错误:', error);
        }
    }
    
    
    
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 注意：新的状态管理器没有SPLASH状态，移除启动画面逻辑
        // if (this.stateTransitionService.isSplashState()) {
        //     this.renderSplashScreen();
        //     return;
        // }
        
        this.ctx.fillStyle = '#f0f8ff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.isMapLoaded && this.gameEngine && this.mapRenderer) {
            const gameState = this.gameEngine.getGameState();
            this.mapRenderer.renderMap(this.ctx, gameState, this.width, this.height, this.spriteManager);
            
            // 渲染自主路障（独立于游戏状态机）
            this.gameEngine.renderAutonomousBlockers(this.ctx);
        }
        
        if (this.uiSystem) {
            this.uiSystem.render(this.ctx);
        }
        
        if (this.stateTransitionService.isCountdown() && this.countdownManager) {
            this.countdownManager.render(this.ctx, this.width, this.height);
        }
        
        // 渲染开始按钮沙箱组件
        if (this.startButtonWidget) {
            // 🆕 修复：在渲染前更新组件状态
            this.startButtonWidget.update();
            this.startButtonWidget.render(this.ctx, this.width, this.height);
        }
    }
    
    renderSplashScreen() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('BUNNY RUNAWAY!', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#C8C8C8';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('完整整合版 - 状态机 + 地图渲染 + 按钮逻辑', this.width / 2, this.height / 2 + 50);
        
        const progress = Math.min((Date.now() - (this.splashStartTime || Date.now())) / 3000, 1);
        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.width - barWidth) / 2;
        const barY = this.height / 2 + 100;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    
    /**
     * 处理按钮点击事件 - 委托给EventHandler
     */
    async handleButtonClick(buttonName) {
        return await this.eventHandler.handleButtonClick(buttonName);
    }
    
    setupEventListeners() {
        // 难度选择事件处理已移至HTML中的setupButtonEventListeners函数
        
        // 地图控制事件处理已移至HTML中的setupButtonEventListeners函数
        
        // 游戏控制事件处理已移至HTML中的setupButtonEventListeners函数
        
        // 🆕 修复：Canvas事件现在由各组件直接处理
        // - StartButtonWidget 处理 initial 状态的 Canvas 点击和鼠标移动
        // - BlockerService 处理 running 状态的 Canvas 点击
        // - EventHandler 不再处理 Canvas 事件
        console.log('✅ GameController: 事件监听器设置完成 - Canvas事件由各组件直接处理');
    }
    
    /**
     * 显示停止游戏确认对话框
     */
    showStopGameDialog() {
        if (this.uiManager && this.uiManager.showStopGameDialog) {
            this.uiManager.showStopGameDialog();
        } else {
            if (typeof showStopGameDialog === 'function') {
                showStopGameDialog();
            } else {
                console.error('❌ 全局showStopGameDialog函数不存在');
            }
        }
    }
    
    
    /**
     * 显示地图选择对话框
     */
    showMapSelectionDialog() {
        if (this.uiManager && this.uiManager.showMapSelectionDialog) {
            this.uiManager.showMapSelectionDialog();
        } else {
            if (typeof showMapSelectionDialog === 'function') {
                showMapSelectionDialog();
            } else {
                console.error('❌ 全局showMapSelectionDialog函数不存在');
            }
        }
    }
    
    /**
     * 更新UI状态
     */
    updateUIState() {
        if (this.uiManager) {
            this.uiManager.updateUIState();
        } else {
            console.warn('⚠️ UIManager不存在，无法更新UI状态');
        }
    }
    
    /**
     * 切换音乐静音状态
     */
    async toggleMusic() {
        if (this.audioManager) {
            // 确保AudioManager知道当前游戏状态
            const currentState = this.getCurrentGameState();
            this.audioManager.setCurrentGameState(currentState);
            
            const isMuted = await this.audioManager.toggleMute();
            this.updateMusicButtonIcon(isMuted);
            return isMuted;
        }
        return false;
    }
    
    /**
     * 更新音乐按钮图标
     */
    updateMusicButtonIcon(isMuted) {
        const musicIcon = document.getElementById('musicIcon');
        const musicButton = document.getElementById('musicButton');
        
        if (musicIcon && musicButton) {
            if (isMuted) {
                // 静音状态：显示喇叭图标并添加静音CSS类
                musicIcon.textContent = '🔊';
                musicButton.classList.add('muted');
                console.log('🔇 切换到静音状态 (使用CSS覆盖层)');
            } else {
                // 播放状态：显示喇叭图标并移除静音CSS类
                musicIcon.textContent = '🔊';
                musicButton.classList.remove('muted');
                console.log('🔊 切换到播放状态');
            }
        }
    }
    
    /**
     * 根据游戏状态更新音乐
     */
    async updateMusicForState(gameState) {
        if (this.audioManager) {
            await this.audioManager.playMusicForState(gameState);
        }
    }
    
    /**
     * 播放游戏结束音效
     */
    async playGameOverSounds(playerWon) {
        if (this.audioManager) {
            await this.audioManager.playGameOverSounds(playerWon);
        }
    }
    
    /**
     * 重置音效状态
     */
    resetAudioState() {
        if (this.audioManager) {
            this.audioManager.resetSoundState();
        }
    }
    
    /**
     * 获取当前游戏状态
     */
    getCurrentGameState() {
        if (this.stateTransitionService) {
            return this.stateTransitionService.getCurrentState();
        }
        return 'initial';
    }
    
    /**
     * 重置到初始状态
     */
    resetToInitialState() {
        console.log('🔄 重置到初始状态');
        
        // 重置状态转换服务
        if (this.stateTransitionService) {
            this.stateTransitionService.reset();
        }
        
        // 重置游戏引擎
        if (this.gameEngine) {
            this.gameEngine.reset();
        }
        
        // 更新UI状态
        this.updateUIState();
        
        // 更新音频状态
        if (this.audioManager) {
            this.audioManager.setCurrentGameState('initial');
        }
        
        console.log('✅ 游戏已重置到初始状态');
    }
    
    /**
     * 尝试下一张地图
     */
    async tryNextMap() {
        console.log('🗺️ 尝试下一张地图');
        if (this.gameEngine) {
            const currentMapNumber = this.gameEngine.getCurrentMapNumber();
            const nextMapNumber = currentMapNumber + 1;
            
            if (nextMapNumber <= 30) { // 假设最大地图号是30
                // 先重置到初始状态
                this.resetToInitialState();
                
                // 然后加载新地图
                try {
                    // 设置新的地图编号
                    this.gameEngine.setMapNumber(nextMapNumber);
                    this.currentMapNumber = nextMapNumber;
                    
                    // 通过游戏引擎加载新地图
                    const success = await this.gameEngine.loadRealMap(this.selectedDifficulty, nextMapNumber);
                    
                    if (success) {
                        this.isMapLoaded = true;
                        
                        // 重新初始化游戏组件
                        this.gameEngine.initializeAutonomousBlockerManager(this.assetLoader, this.blockerManager);
                        await this.autoCreateBunnySprite();
                        this.uiManager.updateMapInfo();
                        
                        console.log(`🗺️ 已加载地图 ${nextMapNumber}`);
                    } else {
                        console.error('❌ 地图加载失败');
                    }
                } catch (error) {
                    console.error('❌ 加载地图失败:', error);
                }
            } else {
                console.log('⚠️ 已经是最后一张地图');
            }
        }
    }
    
    /**
     * 重新创建 StartButtonWidget 沙箱组件
     */
    recreateStartButtonWidget() {
        // 如果已存在，先销毁再重新创建，确保没有重复监听器
        if (this.startButtonWidget) {
            // console.log('🧹 销毁现有的 StartButtonWidget，准备重新创建'); // 调试日志
            this.startButtonWidget.destroy();
            this.startButtonWidget = null;
        }
        
        // console.log('🔄 重新创建 StartButtonWidget 沙箱组件...'); // 调试日志
        this.startButtonWidget = new StartButtonWidget(
            this.stateTransitionService, 
            this.canvas, 
            this.assetLoader,
            this
        );
        this.startButtonWidget.create();
        
        // 🆕 修复：不再需要更新EventHandler的组件引用，EventHandler不再处理Canvas事件
        
        // console.log('✅ StartButtonWidget 沙箱组件重新创建完成'); // 调试日志
    }
    
    /**
     * 🆕 优化：启动 INITIAL 状态的轻量级渲染循环
     */
    startInitialRendering() {
        if (this.initialRenderId) return; // 防止重复启动
        
        // 🆕 改进：添加时间跟踪，类似GameLoop
        let lastTime = 0;
        
        const renderLoop = (currentTime) => {
            // 🆕 改进：计算准确的deltaTime
            const deltaTime = (currentTime - (lastTime || currentTime)) / 1000;
            lastTime = currentTime;
            
            // 更新 Bunny 动画（使用准确时间）
            this.updateBunnyAnimationOnly(deltaTime);
            
            // 🆕 改进：更新倒计时（使用准确时间）
            if (this.stateTransitionService.isCountdown() && this.countdownManager) {
                this.countdownManager.update(deltaTime);
            }
            
            // 渲染
            this.render();
            
            this.initialRenderId = requestAnimationFrame(renderLoop);
        };
        
        this.initialRenderId = requestAnimationFrame(renderLoop);
        console.log('🎨 GameController: INITIAL 状态轻量级渲染已启动（使用准确时间间隔）');
    }
    
    /**
     * 🆕 优化：停止 INITIAL 状态的渲染循环
     */
    stopInitialRendering() {
        if (this.initialRenderId) {
            cancelAnimationFrame(this.initialRenderId);
            this.initialRenderId = null;
            console.log('🎨 GameController: INITIAL 状态渲染已停止');
        }
    }
    
    /**
     * 🆕 优化：轻量级 Bunny 动画更新（只更新动画，不更新逻辑）
     */
    updateBunnyAnimationOnly(deltaTime = 1/60) {
        if (this.spriteManager) {
            const bunny = this.spriteManager.getSprite('bunny');
            if (bunny) {
                // 🆕 改进：使用准确的deltaTime
                if (bunny.animationManager && bunny.animationManager.isPlaying) {
                    bunny.animationManager.update(deltaTime);
                } else if (bunny.updateAnimation) {
                    bunny.updateAnimation(deltaTime);
                }
                // console.log('🐰 GameController: 更新兔子动画'); // 调试日志
            } else {
                console.warn('⚠️ GameController: 兔子精灵不存在');
            }
        } else {
            console.warn('⚠️ GameController: spriteManager 不存在');
        }
    }
    
    /**
     * 🆕 优化：请求按需渲染（用于按钮交互）
     */
    requestRender() {
        if (this.needsRender) return; // 避免重复请求
        this.needsRender = true;
        this.renderFrameId = requestAnimationFrame(() => {
            this.render();
            this.needsRender = false;
        });
    }
    
}

// 默认导出
export default GameController;
