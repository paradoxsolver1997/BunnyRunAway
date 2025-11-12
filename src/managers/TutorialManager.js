/**
 * 教程管理器 - 处理互动式教程系统
 * 包含故事背景介绍、操作提示和游戏引导
 */

export class TutorialManager {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        this.tutorialSteps = [];
        this.overlay = null;
        this.bunnyImage = null;
        this.isFirstTime = true;
        
        // 教程步骤配置
        this.setupTutorialSteps();
        
        // 动画相关
        this.animationFrame = null;
        this.bunnyBounceOffset = 0;
        this.buttonPulseScale = 1;
        this.fingerAnimationOffset = 0;
    }
    
    /**
     * 设置教程步骤
     */
    setupTutorialSteps() {
        this.tutorialSteps = [
            {
                type: 'story',
                title: 'Welcome to Bunny Runaway!',
                content: 'This is a strategic puzzle game where you outsmart a clever bunny who wants to sneak out and steal vegetables from the neighbor\'s garden. Use limited blockers to cut its escape routes. Stay focused! Don\'t let this cunning little creature laugh at you!',
                bunnyImage: true,
                buttons: [
                    { text: 'See Tips', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Goal of the Game',
                content: 'This is your game board. The bunny starts in the center and tries to escape through any of the four corner holes. Your goal is to trap it by blocking all its possible escape routes! Note that it will never give up escaping as long as there is a route to any holes!',
                highlight: 'gameBoard',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Place Barriers',
                content: 'Click on the paths to place barriers and block the bunny\'s escape routes. You have limited barriers (maximum 5). When you use more than 5 barriers, the earliest barrier will be removed and recycled. Use them wisely! By the way, you can click an existing barrier to manually recycle it.',
                highlight: 'paths',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Barrier Rules',
                content: 'Place barriers on paths, not anywhere else. You can not block the path directly to a hole, neither can you block a path on which the bunny is running.',
                highlight: 'paths',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Start the Game',
                content: 'Click "Start Game" to play after a 3-second countdown. Then, the button becomes "Stop Game" which allows you to exit.',
                highlight: 'startButton',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Pause Control',
                content: 'Press "Pause Game" button to pause. Then, this button changes to "Resume Game" for you to resume.',
                highlight: 'pauseButton',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Map Selection',
                content: 'Choose different maps and difficulty levels. Feel free to choose "Hard mode" for more challenges!',
                highlight: 'mapControls',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Game Status',
                content: 'Check the game status and the number of barriers in real time.',
                highlight: 'gameStatus',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Info',
                content: 'Check additional information, such as the full tutorial, credits, and license of this game.',
                highlight: 'moreInfo',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'tip',
                title: 'Music',
                content: 'Toggle this to enjoy the music and sounds or mute the game.',
                highlight: 'musicControl',
                buttons: [
                    { text: 'Next Tip', action: 'next' },
                    { text: 'Skip and Play Now', action: 'skip' }
                ]
            },
            {
                type: 'final',
                title: 'Are You Ready?',
                content: 'You\'re all set! Remember: the bunny is smart and will always find the shortest path. Block multiple routes and think strategically. Good luck!',
                buttons: [
                    { text: 'Go Over Again', action: 'restart' },
                    { text: 'Ready and Play', action: 'start' }
                ]
            }
        ];
    }
    
    /**
     * 检查是否需要显示教程
     */
    shouldShowTutorial() {
        // 🆕 修复：只在游戏初始化时自动显示互动教程
        // 不影响静态教程对话框，两者完全独立
        return true;
    }
    
    /**
     * 开始教程
     */
    async startTutorial() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentStep = 0;
        
        // 预加载兔子图片
        await this.loadBunnyImage();
        
        // 创建教程覆盖层
        this.createTutorialOverlay();
        
        // 显示第一步
        this.showCurrentStep();
        
        // 开始动画循环
        this.startAnimationLoop();
        
        console.log('🎓 教程系统已启动');
    }
    
    /**
     * 加载兔子图片
     */
    async loadBunnyImage() {
        return new Promise((resolve) => {
            this.bunnyImage = new Image();
            this.bunnyImage.onload = () => {
                console.log('🐰 兔子图片加载完成');
                resolve();
            };
            this.bunnyImage.onerror = () => {
                console.warn('⚠️ 兔子图片加载失败，将使用默认显示');
                resolve();
            };
            this.bunnyImage.src = 'assets/sprites/bunny_a.png';
        });
    }
    
    /**
     * 创建教程覆盖层
     */
    createTutorialOverlay() {
        // 移除现有的覆盖层
        const existingOverlay = document.getElementById('tutorialOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // 创建新的覆盖层
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorialOverlay';
        this.overlay.className = 'tutorial-overlay';
        
        // 设置初始背景状态（故事步骤的默认状态）
        this.overlay.style.background = 'rgba(0, 0, 0, 0.8)';
        this.overlay.style.backdropFilter = 'blur(10px)';
        
        // 创建教程内容容器
        const content = document.createElement('div');
        content.className = 'interactive-tutorial-content';
        
        // 确保初始位置设置正确
        content.style.transform = '';
        content.style.transition = 'none';
        
        // 创建标题
        const title = document.createElement('h2');
        title.className = 'tutorial-title';
        content.appendChild(title);
        
        // 创建内容区域
        const textContent = document.createElement('div');
        textContent.className = 'tutorial-text';
        content.appendChild(textContent);
        
        // 创建兔子图片容器（仅故事步骤显示）
        const bunnyContainer = document.createElement('div');
        bunnyContainer.className = 'tutorial-bunny-container';
        content.appendChild(bunnyContainer);
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tutorial-buttons';
        content.appendChild(buttonContainer);
        
        // 创建进度指示器
        const progressContainer = document.createElement('div');
        progressContainer.className = 'tutorial-progress';
        content.appendChild(progressContainer);
        
        this.overlay.appendChild(content);
        document.body.appendChild(this.overlay);
        
        // 添加样式
        this.addTutorialStyles();
    }
    
    /**
     * 添加教程样式
     */
    addTutorialStyles() {
        if (document.getElementById('tutorialStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'tutorialStyles';
        style.textContent = `
            .tutorial-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                animation: tutorialFadeIn 0.5s ease-out;
                /* 背景和模糊效果由JavaScript动态控制 */
            }
            
            @keyframes tutorialFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .interactive-tutorial-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 40px;
                max-width: 600px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                border: 2px solid rgba(255, 255, 255, 0.2);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: tutorialSlideIn 0.6s ease-out;
                z-index: 10010;
            }
            
            /* 非故事步骤的增强样式 */
            .interactive-tutorial-content.tip-step,
            .interactive-tutorial-content.final-step {
                box-shadow: 
                    0 20px 40px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                border: 3px solid rgba(255, 255, 255, 0.4);
            }
            
            @keyframes tutorialSlideIn {
                from { 
                    opacity: 0;
                }
                to { 
                    opacity: 1;
                }
            }
            
            .tutorial-title {
                color: #ffd700;
                font-size: 2.6em;
                margin: 0 0 20px 0;
                text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
                font-weight: bold;
                animation: titleGlow 2s ease-in-out infinite alternate;
            }
            
            @keyframes titleGlow {
                from { text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 215, 0, 0.3); }
                to { text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.6); }
            }
            
            .tutorial-text {
                color: white;
                font-size: 1.3em;
                line-height: 1.6;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
                text-align: left;
            }
            
            .tutorial-bunny-container {
                margin: 20px 0;
                height: 120px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .tutorial-bunny {
                width: 100px;
                height: 100px;
                object-fit: contain;
                animation: bunnyBounce 2s ease-in-out infinite;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
            }
            
            @keyframes bunnyBounce {
                0%, 100% { transform: translateY(0px) rotate(-2deg); }
                50% { transform: translateY(-10px) rotate(2deg); }
            }
            
            .tutorial-buttons {
                display: flex;
                gap: 20px;
                justify-content: center;
                margin-top: 30px;
            }
            
            .tutorial-btn {
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #333;
                border: none;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 1.3em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                animation: buttonPulse 2s ease-in-out infinite;
                min-width: 150px;
            }
            
            @keyframes buttonPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .tutorial-btn:hover {
                background: linear-gradient(45deg, #ffed4e, #ffd700);
                transform: translateY(-3px) scale(1.05);
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.5);
            }
            
            .tutorial-btn:active {
                transform: translateY(-1px) scale(1.02);
            }
            
            .tutorial-progress {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 8px;
            }
            
            .progress-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
            }
            
            .progress-dot.active {
                background: #ffd700;
                transform: scale(1.2);
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
            }
            
            /* 高亮效果 - 完全透明镂空金色边框 */
            .tutorial-highlight {
                position: absolute;
                border: 4px solid #ffd700;
                border-radius: 12px;
                background: transparent;
                pointer-events: none;
                z-index: 10001;
                animation: highlightPulse 2s ease-in-out infinite;
                box-shadow: 
                    0 0 0 2px rgba(255, 215, 0, 0.3),
                    0 0 20px rgba(255, 215, 0, 0.4);
                opacity: 1;
            }
            
            @keyframes highlightPulse {
                0%, 100% { 
                    border-color: #ffd700;
                    box-shadow: 
                        0 0 0 2px rgba(255, 215, 0, 0.3),
                        0 0 20px rgba(255, 215, 0, 0.4);
                    transform: translateY(0px) scale(1);
                }
                25% { 
                    border-color: #ffed4e;
                    box-shadow: 
                        0 0 0 2.5px rgba(255, 215, 0, 0.4),
                        0 0 25px rgba(255, 215, 0, 0.5);
                    transform: translateY(2px) scale(1.01);
                }
                50% { 
                    border-color: #fff700;
                    box-shadow: 
                        0 0 0 3px rgba(255, 215, 0, 0.5),
                        0 0 30px rgba(255, 215, 0, 0.7);
                    transform: translateY(4px) scale(1.02);
                }
                75% { 
                    border-color: #ffed4e;
                    box-shadow: 
                        0 0 0 2.5px rgba(255, 215, 0, 0.4),
                        0 0 25px rgba(255, 215, 0, 0.5);
                    transform: translateY(2px) scale(1.01);
                }
            }
            
            .tutorial-finger {
                position: absolute;
                font-size: 2.4em;
                color: #ffd700;
                z-index: 10002;
                animation: fingerPoint 2s ease-in-out infinite;
                pointer-events: none;
            }
            
            @keyframes fingerPoint {
                0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
                25% { transform: translateY(3px) scale(1.05) rotate(2deg); }
                50% { transform: translateY(6px) scale(1.1) rotate(0deg); }
                75% { transform: translateY(3px) scale(1.05) rotate(-2deg); }
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .interactive-tutorial-content {
                    padding: 30px 20px;
                    margin: 20px;
                }
                
                .tutorial-title {
                    font-size: 2.2em;
                }
                
                .tutorial-text {
                    font-size: 1.2em;
                }
                
                .tutorial-buttons {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .tutorial-btn {
                    min-width: auto;
                    width: 100%;
                }
            }
            
            /* 额外的动画效果 */
            @keyframes tutorialFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            /* 故事步骤的特殊样式 */
            .interactive-tutorial-content.story-step {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            }
            
            .interactive-tutorial-content.tip-step {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            }
            
            .interactive-tutorial-content.final-step {
                background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            }
            
            /* 按钮特殊效果 */
            .tutorial-btn.primary {
                background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
                color: white;
            }
            
            .tutorial-btn.secondary {
                background: linear-gradient(45deg, #4ecdc4, #44a08d);
                color: white;
            }
            
            /* 文字样式已简化，移除打字机效果 */
            
            /* 粒子效果背景 */
            .tutorial-overlay::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
                    radial-gradient(circle at 40% 40%, rgba(78, 205, 196, 0.1) 0%, transparent 50%);
                animation: particleFloat 20s ease-in-out infinite;
                pointer-events: none;
            }
            
            @keyframes particleFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                33% { transform: translateY(-20px) rotate(1deg); }
                66% { transform: translateY(10px) rotate(-1deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 显示当前步骤
     */
    showCurrentStep() {
        if (!this.overlay || this.currentStep >= this.tutorialSteps.length) return;
        
        const step = this.tutorialSteps[this.currentStep];
        const content = this.overlay.querySelector('.interactive-tutorial-content');
        
        // 根据步骤类型调整覆盖层透明度
        if (step.type === 'story') {
            // 故事步骤：显示半透明蒙版
            this.overlay.style.background = 'rgba(0, 0, 0, 0.8)';
            this.overlay.style.backdropFilter = 'blur(10px)';
            console.log('🎭 故事步骤：应用半透明蒙版');
        } else {
            // 其他步骤：完全透明，让游戏界面可见
            this.overlay.style.background = 'transparent';
            this.overlay.style.backdropFilter = 'none';
            console.log('👁️ 提示步骤：移除蒙版，游戏界面可见');
        }
        
        // 根据步骤类型添加不同的CSS类
        content.className = 'interactive-tutorial-content';
        if (step.type === 'story') {
            content.classList.add('story-step');
        } else if (step.type === 'tip') {
            content.classList.add('tip-step');
        } else if (step.type === 'final') {
            content.classList.add('final-step');
        }
        
        // 更新标题
        const title = content.querySelector('.tutorial-title');
        title.textContent = step.title;
        
        // 更新内容 - 直接显示文字，无动画
        const textContent = content.querySelector('.tutorial-text');
        textContent.textContent = step.content;
        
        // 显示或隐藏兔子图片
        const bunnyContainer = content.querySelector('.tutorial-bunny-container');
        if (step.bunnyImage && this.bunnyImage) {
            bunnyContainer.innerHTML = `<img src="${this.bunnyImage.src}" alt="Bunny" class="tutorial-bunny">`;
            bunnyContainer.style.display = 'flex';
        } else {
            bunnyContainer.style.display = 'none';
        }
        
        // 更新按钮
        this.updateButtons(step.buttons);
        
        // 更新进度指示器
        this.updateProgress();
        
        // 处理高亮效果
        this.handleHighlight(step);
        
        // 智能调整对话框位置，避免遮挡高亮元素（在高亮元素创建后）
        this.adjustDialogPosition(step);
        
        // 确保位置调整在动画前完成，并添加步骤切换动画
        content.style.animation = 'none';
        // 强制重绘，确保位置调整生效
        content.offsetHeight;
        setTimeout(() => {
            content.style.animation = 'tutorialSlideIn 0.6s ease-out';
        }, 10);
    }
    
    // 打字机效果已移除，文字直接显示
    
    /**
     * 获取高亮框的尺寸和位置
     */
    getHighlightRect(highlightType, rect) {
        switch (highlightType) {
            case 'gameBoard':
            case 'paths':
                // gameBoard专用高亮框：突出显示游戏区域的核心部分
                return {
                    top: rect.top + 50,
                    left: rect.left + 200,
                    width: rect.width - 400,
                    height: rect.height - 120
                };
            
            case 'startButton':
            case 'pauseButton':
                // 按钮高亮框：稍微扩大按钮区域
                return {
                    top: rect.top - 10,
                    left: rect.left - 10,
                    width: rect.width + 20,
                    height: rect.height + 20
                };
            
            case 'gameStatus':
                // 游戏状态小面板：突出显示状态显示区域
                return {
                    top: rect.top - 10,
                    left: rect.left - 10,
                    width: rect.width + 20,
                    height: rect.height * 3.8 + 20
                };
            
            case 'moreInfo':
            case 'musicControl':
                // 信息按钮：圆形高亮框
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const radius = Math.max(rect.width, rect.height) / 2 + 15;
                return {
                    top: centerY - radius,
                    left: centerX - radius,
                    width: radius * 2,
                    height: radius * 2
                };
            
            case 'mapControls':
                // 地图控制：突出显示控制区域
                return {
                    top: rect.top - 100,
                    left: rect.left - 20,
                    width: rect.width + 40,
                    height: rect.height + 100
                };
            
            default:
                // 默认高亮框：标准尺寸
                return {
                    top: rect.top - 15,
                    left: rect.left - 15,
                    width: rect.width + 20,
                    height: rect.height + 20
                };
        }
    }
    
    /**
     * 智能调整对话框位置，避免遮挡高亮元素
     */
    adjustDialogPosition(step) {
        if (!this.overlay || !step.highlight) return;
        
        const content = this.overlay.querySelector('.interactive-tutorial-content');
        if (!content) return;
        
        // 直接根据高亮元素类型设置位置，不依赖重叠检测
        let newTransform = '';
        
        // 根据高亮元素位置调整对话框位置（基于 translate(-50%, -50%) 进行调整）
        if (step.highlight === 'gameBoard' || step.highlight === 'paths') {
            // 游戏面板在左侧，对话框移到右侧
            newTransform = 'translate(calc(-50% + 450px), -50%)';
        } else if (step.highlight === 'moreInfo' || step.highlight === 'musicControl') {
            // 信息按钮在右上角，对话框移到下方
            newTransform = 'translate(calc(-50% - 200px), -50%)';
        } else if (step.highlight === 'startButton' || step.highlight === 'pauseButton') {
            // 按钮在右侧面板，对话框移到左侧
            newTransform = 'translate(calc(-50% - 150px), -50%)';
        } else if (step.highlight === 'mapControls' || step.highlight === 'gameStatus') {
            // 地图控制在右侧面板，对话框移到左侧
            newTransform = 'translate(calc(-50% - 150px), -50%)';
        } else {
            // 地图控制在右侧面板，对话框移到左侧
            newTransform = 'translate(calc(-50% - 150px), -50%)';
        }
        
        // 应用新的位置（立即生效，无过渡动画）
        if (newTransform) {
            content.style.transform = newTransform;
            content.style.transition = 'none'; // 移除过渡动画
            console.log(`🎯 对话框位置已调整: ${step.highlight} -> ${newTransform}`);
        } else {
            // 没有特殊位置要求，恢复默认位置
            content.style.transform = '';
            content.style.transition = 'none'; // 移除过渡动画
            console.log(`🎯 对话框使用默认位置: ${step.highlight}`);
        }
    }
    
    /**
     * 更新按钮
     */
    updateButtons(buttons) {
        const buttonContainer = this.overlay.querySelector('.tutorial-buttons');
        buttonContainer.innerHTML = '';
        
        buttons.forEach((button, index) => {
            const btn = document.createElement('button');
            btn.className = 'tutorial-btn';
            
            // 根据按钮类型添加不同的样式
            if (button.text.includes('Skip') || button.text.includes('Play Now')) {
                btn.classList.add('primary');
            } else if (button.text.includes('Next') || button.text.includes('Ready')) {
                btn.classList.add('secondary');
            }
            
            btn.textContent = button.text;
            btn.addEventListener('click', () => this.handleButtonClick(button.action));
            
            // 添加按钮动画延迟
            btn.style.animationDelay = `${index * 0.1}s`;
            
            buttonContainer.appendChild(btn);
        });
    }
    
    /**
     * 更新进度指示器
     */
    updateProgress() {
        const progressContainer = this.overlay.querySelector('.tutorial-progress');
        progressContainer.innerHTML = '';
        
        this.tutorialSteps.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `progress-dot ${index === this.currentStep ? 'active' : ''}`;
            progressContainer.appendChild(dot);
        });
    }
    
    /**
     * 处理高亮效果
     */
    handleHighlight(step) {
        // 清除之前的高亮
        const existingHighlight = document.querySelector('.tutorial-highlight');
        const existingFinger = document.querySelector('.tutorial-finger');
        
        if (existingHighlight) existingHighlight.remove();
        if (existingFinger) existingFinger.remove();
        
        if (!step.highlight) return;
        
        // 根据高亮类型创建高亮效果
        let targetElement = null;
        let highlightRect = null;
        
        switch (step.highlight) {
            case 'gameBoard':
                targetElement = document.getElementById('gameCanvas');
                break;
            case 'startButton':
                targetElement = document.getElementById('unifiedGameBtn');
                break;
            case 'pauseButton':
                targetElement = document.getElementById('pauseBtn');
                break;
            case 'mapControls':
                targetElement = document.querySelector('.map-controls');
                break;
            case 'paths':
                // 对于路径，我们高亮整个游戏区域
                targetElement = document.getElementById('gameCanvas');
                break;
            case 'gameStatus':
                // 只高亮状态显示部分，而不是整个info-panel
                targetElement = document.querySelector('.info-panel h3');
                break;
            case 'moreInfo':
                targetElement = document.getElementById('infoButton');
                break;
            case 'musicControl':
                targetElement = document.getElementById('musicButton');
                break;
        }
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            
            // 根据高亮元素类型设置不同的高亮框尺寸
            highlightRect = this.getHighlightRect(step.highlight, rect);
            
            const scrollY = window.scrollY || 0;
            const scrollX = window.scrollX || 0;

            // 创建高亮框
            const highlight = document.createElement('div');
            highlight.className = 'tutorial-highlight';
            
            highlight.style.top = `${highlightRect.top + scrollY}px`;
            highlight.style.left = `${highlightRect.left + scrollX}px`;
            highlight.style.width = `${highlightRect.width}px`;
            highlight.style.height = `${highlightRect.height}px`;
            document.body.appendChild(highlight);
            
            // 创建手指动画
            const finger = document.createElement('div');
            finger.className = 'tutorial-finger';
            finger.textContent = '👆';

            finger.style.top = `${highlightRect.top + highlightRect.height / 2 - 20 + scrollY}px`;
            finger.style.left = `${highlightRect.left + highlightRect.width / 2 - 20 + scrollX}px`;
            document.body.appendChild(finger);
        }
    }
    
    /**
     * 处理按钮点击
     */
    handleButtonClick(action) {
        // 标记用户已交互，触发音乐自动播放
        this.markUserInteracted();
        
        switch (action) {
            case 'next':
                this.nextStep();
                break;
            case 'skip':
                this.skipTutorial();
                break;
            case 'restart':
                this.restartTutorial();
                break;
            case 'start':
                this.completeTutorial();
                break;
        }
    }
    
    /**
     * 下一步
     */
    nextStep() {
        this.currentStep++;
        if (this.currentStep < this.tutorialSteps.length) {
            this.showCurrentStep();
        } else {
            this.completeTutorial();
        }
    }
    
    /**
     * 跳过教程
     */
    skipTutorial() {
        this.completeTutorial();
    }
    
    /**
     * 重新开始教程
     */
    restartTutorial() {
        this.currentStep = 0;
        this.showCurrentStep();
    }
    
    /**
     * 完成教程
     */
    completeTutorial() {
        // 教程完成，无需保存状态到localStorage
        
        // 停止动画循环
        this.stopAnimationLoop();
        
        // 移除覆盖层
        if (this.overlay) {
            this.overlay.style.animation = 'tutorialFadeOut 0.5s ease-out';
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
            }, 500);
        }
        
        // 清除高亮效果
        const existingHighlight = document.querySelector('.tutorial-highlight');
        const existingFinger = document.querySelector('.tutorial-finger');
        if (existingHighlight) existingHighlight.remove();
        if (existingFinger) existingFinger.remove();
        
        this.isActive = false;
        this.isFirstTime = false;
        
        console.log('🎓 教程已完成');
        
        // 触发教程完成事件
        this.onTutorialComplete?.();
    }
    
    /**
     * 开始动画循环
     */
    startAnimationLoop() {
        const animate = () => {
            if (!this.isActive) return;
            
            // 更新兔子弹跳动画
            this.bunnyBounceOffset = Math.sin(Date.now() * 0.003) * 5;
            
            // 更新按钮脉冲动画
            this.buttonPulseScale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
            
            // 更新手指动画
            this.fingerAnimationOffset = Math.sin(Date.now() * 0.004) * 3;
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * 停止动画循环
     */
    stopAnimationLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    /**
     * 重置教程状态（用于测试）
     */
    resetTutorial() {
        this.isFirstTime = true;
        console.log('🔄 教程状态已重置');
    }
    
    /**
     * 强制显示教程（忽略完成状态）
     */
    forceShowTutorial() {
        // 由于现在总是显示教程，这个方法主要用于重启教程
        this.restartTutorial();
        console.log('🎓 强制显示教程已设置');
    }
    
    /**
     * 标记用户已交互，触发音乐自动播放
     */
    markUserInteracted() {
        // 通过全局gameController获取AudioManager并标记用户交互
        if (window.gameController && window.gameController.audioManager) {
            window.gameController.audioManager.markUserInteracted();
        }
    }
    
    /**
     * 获取教程状态信息
     */
    getTutorialStatus() {
        return {
            hasCompleted: false, // 不再使用localStorage，总是显示教程
            forceShow: false, // 不再需要强制显示
            willShow: this.shouldShowTutorial(), // 总是返回true
            completionTime: null, // 不再记录完成时间
            userAgent: navigator.userAgent,
            isLocalStorageSupported: false, // 不再使用localStorage
            storageType: 'none' // 不再使用存储
        };
    }
    
    
    /**
     * 设置教程完成回调
     */
    setOnTutorialComplete(callback) {
        this.onTutorialComplete = callback;
    }
}
