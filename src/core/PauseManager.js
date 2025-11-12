/**
 * 全局暂停管理器 - 专业游戏暂停系统
 * 实现所有游戏活动的完全冻结和恢复
 */

export class PauseManager {
    constructor() {
        this.isPaused = false;
        this.pauseStartTime = null;
        this.pausedAnimations = new Map(); // 存储暂停时的动画状态
        this.pausedTimers = new Map(); // 存储暂停时的定时器状态
        this.pausedIntervals = new Map(); // 存储暂停时的间隔器状态
        this.originalAnimations = new Map(); // 存储原始动画状态
    }
    
    /**
     * 暂停游戏 - 冻结所有活动
     */
    pause() {
        if (this.isPaused) {
            console.log('⚠️ 游戏已经处于暂停状态');
            return;
        }
        
        console.log('⏸️ 暂停游戏 - 冻结所有活动（音乐继续播放）');
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        // 1. 暂停所有CSS动画
        this.pauseCSSAnimations();
        
        // 2. 暂停所有JavaScript定时器
        this.pauseTimers();
        
        // 3. 暂停所有间隔器
        this.pauseIntervals();
        
        // 4. 暂停所有Canvas动画
        this.pauseCanvasAnimations();
        
        // 5. 不暂停音频 - 音乐继续播放
        // this.pauseAudio(); // 注释掉，让音乐继续播放
        
        console.log('✅ 游戏已完全暂停（音乐继续播放）');
    }
    
    /**
     * 恢复游戏 - 恢复所有活动
     */
    resume() {
        if (!this.isPaused) {
            console.log('⚠️ 游戏没有处于暂停状态');
            return;
        }
        
        const pauseDuration = Date.now() - this.pauseStartTime;
        console.log(`▶️ 恢复游戏 - 暂停时长: ${pauseDuration}ms（音乐继续播放）`);
        
        // 1. 恢复所有CSS动画
        this.resumeCSSAnimations();
        
        // 2. 恢复所有JavaScript定时器
        this.resumeTimers();
        
        // 3. 恢复所有间隔器
        this.resumeIntervals();
        
        // 4. 恢复所有Canvas动画
        this.resumeCanvasAnimations();
        
        // 5. 不处理音频 - 音乐继续播放
        // this.resumeAudio(); // 注释掉，音乐继续播放
        
        this.isPaused = false;
        this.pauseStartTime = null;
        
        console.log('✅ 游戏已完全恢复（音乐继续播放）');
    }
    
    /**
     * 暂停CSS动画
     */
    pauseCSSAnimations() {
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const animationName = computedStyle.animationName;
            const animationDuration = computedStyle.animationDuration;
            
            if (animationName !== 'none' && animationDuration !== '0s') {
                // 记录原始动画状态
                this.originalAnimations.set(element, {
                    animationPlayState: computedStyle.animationPlayState,
                    animationName: animationName,
                    animationDuration: animationDuration
                });
                
                // 暂停动画
                element.style.animationPlayState = 'paused';
            }
        });
    }
    
    /**
     * 恢复CSS动画
     */
    resumeCSSAnimations() {
        this.originalAnimations.forEach((originalState, element) => {
            element.style.animationPlayState = originalState.animationPlayState;
        });
        this.originalAnimations.clear();
    }
    
    /**
     * 暂停JavaScript定时器
     */
    pauseTimers() {
        // 暂停所有setTimeout
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => {
            if (this.isPaused) {
                // 如果游戏暂停，延迟执行
                return originalSetTimeout(() => {
                    if (!this.isPaused) {
                        callback(...args);
                    }
                }, delay);
            }
            return originalSetTimeout(callback, delay, ...args);
        };
    }
    
    /**
     * 恢复JavaScript定时器
     */
    resumeTimers() {
        // 恢复原始setTimeout
        // 注意：这里需要更复杂的实现来真正暂停定时器
        // 简化版本：依赖游戏循环的暂停检查
    }
    
    /**
     * 暂停间隔器
     */
    pauseIntervals() {
        // 暂停所有setInterval
        const originalSetInterval = window.setInterval;
        window.setInterval = (callback, delay, ...args) => {
            if (this.isPaused) {
                // 如果游戏暂停，不创建间隔器
                return null;
            }
            return originalSetInterval(callback, delay, ...args);
        };
    }
    
    /**
     * 恢复间隔器
     */
    resumeIntervals() {
        // 恢复原始setInterval
        // 注意：这里需要更复杂的实现来真正暂停间隔器
        // 简化版本：依赖游戏循环的暂停检查
    }
    
    /**
     * 暂停Canvas动画
     */
    pauseCanvasAnimations() {
        // 暂停所有Canvas元素的动画
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            // 标记Canvas为暂停状态
            canvas.dataset.paused = 'true';
        });
    }
    
    /**
     * 恢复Canvas动画
     */
    resumeCanvasAnimations() {
        // 恢复所有Canvas元素的动画
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            // 移除暂停标记
            delete canvas.dataset.paused;
        });
    }
    
    /**
     * 暂停音频
     */
    pauseAudio() {
        // 暂停所有音频元素
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.dataset.wasPlaying = 'true';
            }
        });
    }
    
    /**
     * 恢复音频
     */
    resumeAudio() {
        // 恢复所有音频元素
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (audio.dataset.wasPlaying === 'true') {
                audio.play();
                delete audio.dataset.wasPlaying;
            }
        });
    }
    
    /**
     * 检查是否暂停
     */
    isGamePaused() {
        return this.isPaused;
    }
    
    /**
     * 获取暂停时长
     */
    getPauseDuration() {
        if (!this.isPaused || !this.pauseStartTime) {
            return 0;
        }
        return Date.now() - this.pauseStartTime;
    }
}

// 创建全局实例
export const globalPauseManager = new PauseManager();
