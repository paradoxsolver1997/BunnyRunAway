/**
 * 音频管理器 - 处理游戏中的音乐和音效
 */

export class AudioManager {
    constructor() {
        this.backgroundMusic = null;
        this.currentMusic = null; // 当前播放的背景音乐
        this.soundEffects = new Map();
        this.isMuted = false; // 默认非静音，等待用户交互后自动播放
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        this.masterVolume = 1.0;
        
        // 音乐状态管理
        this.musicTracks = new Map(); // 存储所有音乐轨道
        this.currentTrackName = null; // 当前播放的音乐名称
        
        // 音效播放控制
        this.playingSounds = new Set(); // 正在播放的音效
        this.gameOverSoundPlayed = false; // 游戏结束音效是否已播放
        
        // 游戏状态跟踪
        this.currentGameState = 'initial'; // 当前游戏状态
        this.userHasInteracted = false; // 用户是否已经交互过
        
        // 音频文件路径
        this.audioPaths = {
            backgroundGame: 'assets/sound/mushroom dance_0.ogg',
            backgroundMenu: 'assets/sound/Pleasant Creek.mp3',
            countdownBeep: 'assets/sound/short-beep-countdown-81121.mp3',
            win: 'assets/sound/win.mp3',
            lose: 'assets/sound/lose.mp3',
            cackle: 'assets/sound/bunny_cackle.mp3'
        };
    }
    
    /**
     * 初始化音频管理器
     */
    async initialize() {
        try {
            // 预加载所有音乐轨道
            await this.loadAllMusicTracks();
            console.log('✅ 音频管理器初始化完成');
            return true;
        } catch (error) {
            console.error('❌ 音频管理器初始化失败:', error);
            return false;
        }
    }
    
    /**
     * 加载所有音乐轨道
     */
    async loadAllMusicTracks() {
        const musicTracks = [
            { name: 'menu', path: this.audioPaths.backgroundMenu, loop: true },
            { name: 'game', path: this.audioPaths.backgroundGame, loop: true },
            { name: 'countdown', path: this.audioPaths.countdownBeep, loop: false }
        ];
        
        const loadPromises = musicTracks.map(track => this.loadMusicTrack(track));
        await Promise.all(loadPromises);
        
        // 设置默认背景音乐为菜单音乐
        this.backgroundMusic = this.musicTracks.get('menu');
        this.currentMusic = this.backgroundMusic;
        this.currentTrackName = 'menu';
    }
    
    /**
     * 加载单个音乐轨道
     */
    async loadMusicTrack(track) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = track.path;
            audio.loop = track.loop;
            // 根据静音状态设置初始音量
            const initialVolume = this.isMuted ? 0 : this.musicVolume * this.masterVolume;
            audio.volume = initialVolume;
            audio.preload = 'auto';
            
            audio.addEventListener('canplaythrough', () => {
                this.musicTracks.set(track.name, audio);
                console.log(`🎵 音乐轨道加载完成: ${track.name}`);
                resolve();
            });
            
            audio.addEventListener('error', (error) => {
                console.warn(`⚠️ 音乐轨道加载失败: ${track.name}`, error);
                resolve(); // 即使加载失败也继续
            });
        });
    }
    
    /**
     * 根据游戏状态播放音乐（简化版本）
     */
    async playMusicForState(gameState) {
        // 更新当前游戏状态
        this.currentGameState = gameState;
        
        // 如果用户还没有交互过，不播放音乐
        if (!this.userHasInteracted) {
            console.log(`⏳ 等待用户交互，记录状态: ${gameState}`);
            return;
        }
        
        // 确定要播放的音乐轨道
        let trackName = null;
        switch (gameState) {
            case 'initial':
                trackName = 'menu';
                break;
            case 'countdown':
                trackName = 'countdown';
                break;
            case 'running':
            case 'paused':
            case 'gameover':
                trackName = 'game';
                break;
            default:
                trackName = 'menu';
        }
        
        // 直接切换到指定轨道，不检查静音状态（音乐会一直播放）
        await this.switchToTrack(trackName);
        console.log(`🎵 切换到音乐: ${trackName} (状态: ${gameState})`);
    }
    
    /**
     * 切换到指定音乐轨道（简化版本）
     */
    async switchToTrack(trackName) {
        if (this.currentTrackName === trackName) {
            // 如果已经是当前轨道，确保音乐在播放
            if (this.currentMusic && this.currentMusic.paused) {
                try {
                    await this.currentMusic.play();
                    console.log(`🎵 恢复播放音乐轨道: ${trackName}`);
                } catch (error) {
                    console.warn(`⚠️ 音乐轨道恢复播放失败: ${trackName}`, error);
                }
            }
            return;
        }
        
        // 停止当前音乐
        this.stopCurrentMusic();
        
        // 切换到新轨道
        const newTrack = this.musicTracks.get(trackName);
        if (newTrack) {
            this.currentMusic = newTrack;
            this.currentTrackName = trackName;
            this.backgroundMusic = newTrack; // 保持兼容性
            
            try {
                await newTrack.play();
                console.log(`🎵 切换到音乐轨道: ${trackName}`);
            } catch (error) {
                console.warn(`⚠️ 音乐轨道播放失败: ${trackName}`, error);
            }
        } else {
            console.warn(`⚠️ 找不到音乐轨道: ${trackName}`);
        }
    }
    
    /**
     * 播放背景音乐（保持向后兼容）
     */
    async playBackgroundMusic() {
        if (!this.currentMusic || this.isMuted) {
            return;
        }
        
        try {
            await this.currentMusic.play();
            console.log('🎵 背景音乐开始播放');
        } catch (error) {
            console.warn('⚠️ 背景音乐播放失败:', error);
        }
    }
    
    /**
     * 停止当前音乐
     */
    stopCurrentMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            console.log('🔇 当前音乐已停止');
        }
    }
    
    /**
     * 停止背景音乐（保持向后兼容）
     */
    stopBackgroundMusic() {
        this.stopCurrentMusic();
    }
    
    /**
     * 恢复当前音乐（简化版本）
     */
    async resumeCurrentMusic() {
        if (this.currentMusic && this.currentMusic.paused) {
            try {
                await this.currentMusic.play();
                console.log('▶️ 当前音乐已恢复');
            } catch (error) {
                console.warn('⚠️ 当前音乐恢复失败:', error);
            }
        }
    }
    
    /**
     * 切换静音状态（基于音量控制，不停止音乐）
     */
    async toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            // 静音：将所有音乐音量设置为0
            this.setAllMusicVolume(0);
            console.log('🔇 音频已静音（音量设为0）');
        } else {
            // 取消静音：恢复音乐音量
            this.setAllMusicVolume(this.musicVolume);
            console.log(`🔊 取消静音，恢复音量: ${this.musicVolume}`);
        }
        
        return this.isMuted;
    }
    
    /**
     * 设置当前游戏状态（供外部调用）
     */
    setCurrentGameState(gameState) {
        this.currentGameState = gameState;
        console.log(`🎮 游戏状态已更新: ${gameState}`);
    }
    
    /**
     * 设置静音状态
     */
    setMuted(muted) {
        if (this.isMuted !== muted) {
            this.toggleMute();
        }
    }
    
    /**
     * 获取静音状态
     */
    isMutedState() {
        return this.isMuted;
    }
    
    /**
     * 设置音乐音量
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        // 如果不是静音状态，更新所有音乐轨道的音量
        if (!this.isMuted) {
            this.setAllMusicVolume(this.musicVolume);
        }
    }
    
    /**
     * 设置主音量
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        // 更新所有音乐轨道的音量
        const targetVolume = this.isMuted ? 0 : this.musicVolume;
        this.setAllMusicVolume(targetVolume);
    }
    
    /**
     * 设置所有音乐轨道的音量
     */
    setAllMusicVolume(volume) {
        this.musicTracks.forEach((audio, trackName) => {
            if (audio) {
                audio.volume = volume * this.masterVolume;
            }
        });
        console.log(`🎵 所有音乐轨道音量设置为: ${volume}`);
    }
    
    /**
     * 播放音效
     */
    async playSound(soundName) {
        if (this.isMuted || !this.audioPaths[soundName]) {
            return;
        }
        
        try {
            const audio = new Audio(this.audioPaths[soundName]);
            
            // 优化音效播放设置
            audio.volume = this.soundVolume * this.masterVolume;
            audio.preload = 'auto';
            
            // 禁用音频处理效果，减少回音
            if (audio.audioContext) {
                audio.audioContext.destination.channelCount = 1; // 单声道
            }
            
            // 设置音频属性以减少回音
            audio.crossOrigin = 'anonymous';
            
            await audio.play();
            console.log(`🔊 播放音效: ${soundName}`);
            
            // 播放完成后清理
            audio.addEventListener('ended', () => {
                audio.src = '';
                audio.load();
            });
            
        } catch (error) {
            console.warn(`⚠️ 音效播放失败: ${soundName}`, error);
        }
    }
    
    /**
     * 播放游戏结束音效
     */
    async playGameOverSounds(playerWon) {
        if (this.isMuted) {
            return;
        }
        
        // 防止重复播放游戏结束音效
        if (this.gameOverSoundPlayed) {
            console.log('⚠️ 游戏结束音效已经播放过，跳过重复播放');
            return;
        }
        
        // 标记游戏结束音效已播放
        this.gameOverSoundPlayed = true;
        
        try {
            if (playerWon) {
                // 玩家胜利：播放胜利音效
                await this.playSoundWithOptimization('win');
                console.log('🎉 播放胜利音效');
            } else {
                // 兔子胜利：播放失败音效和嘲笑音效
                await this.playSoundWithOptimization('lose');
                console.log('😢 播放失败音效');
                
                // 延迟播放嘲笑音效，让失败音效先播放
                setTimeout(async () => {
                    await this.playSoundWithOptimization('cackle');
                    console.log('🐰 播放兔子嘲笑音效');
                }, 800); // 增加延迟时间，确保音效不重叠
            }
        } catch (error) {
            console.warn('⚠️ 游戏结束音效播放失败:', error);
        }
    }
    
    /**
     * 优化的音效播放方法
     */
    async playSoundWithOptimization(soundName) {
        if (this.isMuted || !this.audioPaths[soundName]) {
            return;
        }
        
        // 防止同一音效重复播放
        if (this.playingSounds.has(soundName)) {
            console.log(`⚠️ 音效 ${soundName} 正在播放中，跳过重复播放`);
            return;
        }
        
        // 标记音效开始播放
        this.playingSounds.add(soundName);
        
        try {
            const audio = new Audio();
            
            // 设置音频属性以减少回音和噪音
            audio.volume = Math.min(this.soundVolume * this.masterVolume, 0.8); // 限制最大音量
            audio.preload = 'auto';
            audio.crossOrigin = 'anonymous';
            
            // 设置音频源
            audio.src = this.audioPaths[soundName];
            
            // 等待音频加载完成
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve, { once: true });
                audio.addEventListener('error', reject, { once: true });
                audio.load();
            });
            
            // 播放音频
            await audio.play();
            console.log(`🔊 优化播放音效: ${soundName}`);
            
            // 播放完成后清理资源
            audio.addEventListener('ended', () => {
                this.playingSounds.delete(soundName); // 从播放列表中移除
                audio.src = '';
                audio.load();
            }, { once: true });
            
        } catch (error) {
            this.playingSounds.delete(soundName); // 出错时也要从播放列表中移除
            console.warn(`⚠️ 优化音效播放失败: ${soundName}`, error);
        }
    }
    
    /**
     * 停止所有音频
     */
    stopAll() {
        this.stopBackgroundMusic();
        console.log('🔇 所有音频已停止');
    }
    
    /**
     * 重置音效播放状态
     */
    resetSoundState() {
        this.playingSounds.clear();
        this.gameOverSoundPlayed = false;
        console.log('🔄 音效播放状态已重置');
    }
    
    
    /**
     * 标记用户已交互，开始自动播放音乐
     */
    async markUserInteracted() {
        if (this.userHasInteracted) {
            return; // 已经交互过了
        }
        
        this.userHasInteracted = true;
        console.log('👆 用户已交互，开始自动播放音乐');
        
        // 开始播放当前游戏状态对应的音乐
        await this.playMusicForState(this.currentGameState);
    }
    
    /**
     * 检查用户是否已交互
     */
    hasUserInteracted() {
        return this.userHasInteracted;
    }
    
    /**
     * 获取调试信息
     */
    getDebugInfo() {
        return {
            isMuted: this.isMuted,
            musicVolume: this.musicVolume,
            soundVolume: this.soundVolume,
            masterVolume: this.masterVolume,
            userHasInteracted: this.userHasInteracted,
            currentGameState: this.currentGameState,
            backgroundMusicLoaded: !!this.backgroundMusic,
            backgroundMusicPaused: this.backgroundMusic ? this.backgroundMusic.paused : true
        };
    }
    
    /**
     * 初始化音乐控制按钮 - 从js/ui/music-controller.js合并
     */
    static initializeMusicButton() {
        const musicButton = document.getElementById('musicButton');
        if (musicButton) {
            musicButton.addEventListener('click', async () => {
                // 通过全局gameController调用音乐切换
                if (window.gameController && window.gameController.toggleMusic) {
                    try {
                        const isMuted = await window.gameController.toggleMusic();
                        console.log('🎵 音乐状态切换:', isMuted ? '静音' : '播放');
                    } catch (error) {
                        console.error('❌ 音乐切换失败:', error);
                    }
                } else {
                    console.warn('⚠️ GameController未初始化或没有toggleMusic方法');
                    console.log('🔍 当前window.gameController状态:', !!window.gameController);
                    if (window.gameController) {
                        console.log('🔍 toggleMusic方法存在:', typeof window.gameController.toggleMusic);
                    }
                }
            });
            console.log('✅ 音乐控制按钮事件已绑定');
        } else {
            console.warn('⚠️ 找不到音乐按钮元素');
        }
    }
}
