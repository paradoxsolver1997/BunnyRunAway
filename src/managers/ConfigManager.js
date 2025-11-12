/**
 * 游戏统一配置管理
 * 
 * 集中管理所有游戏配置，避免重复定义
 */

/**
 * 游戏配置常量
 */
export const GAME_CONFIG = {
    // 地图配置
    MAX_MAP_NUMBER: 30,
    MIN_MAP_NUMBER: 1,
    
    // 加载状态消息
    LOADING_MESSAGES: {
        INITIALIZING: 'Initializing...',
        LOADING_ASSETS: 'Loading assets...',
        INITIALIZING_GAME: 'Initializing game system...',
        COMPLETE: 'Game system initialized successfully!'
    },
    
    // 对话框ID
    DIALOG_IDS: {
        TUTORIAL: 'tutorialDialog',
        ABOUT: 'aboutDialog',
        CREDITS: 'creditsDialog',
        LICENSE: 'licenseDialog',
        VICTORY: 'victoryDialog',
        FULL_DOCUMENT: 'fullDocumentDialog'
    },
    
    // 事件名称
    EVENTS: {
        VICTORY_CONTINUE_CURRENT: 'victory_continue_current',
        VICTORY_TRY_NEXT_MAP: 'victory_try_next_map'
    },
    
    // 游戏配置
    scaling: {
        bunny: 1.0,
        fence: 1.0,
        stone: 1.0,
        hole: 1.0
    },
    animation: {
        bunny_frame_duration: 200
    },
    physics: {
        bunny_speed: 100,  // 像素/秒
        collision_tolerance: 5
    },
    timing: {
        countdown_duration: 3,  // 倒计时秒数
        splash_duration: 1.0    // 启动画面持续时间
    }
};

/**
 * UI选择器常量
 */
export const UI_SELECTORS = {
    // 主要元素
    LOADING_OVERLAY: '#loadingOverlay',
    LOADING_STATUS: '#loadingStatus',
    GAME_CANVAS: '#gameCanvas',
    INFO_BUTTON: '#infoButton',
    MUSIC_BUTTON: '#musicButton',
    INFO_MENU: '#infoMenu',
    
    // 对话框
    TUTORIAL_DIALOG: '#tutorialDialog',
    ABOUT_DIALOG: '#aboutDialog',
    CREDITS_DIALOG: '#creditsDialog',
    LICENSE_DIALOG: '#licenseDialog',
    VICTORY_DIALOG: '#victoryDialog',
    FULL_DOCUMENT_DIALOG: '#fullDocumentDialog',
    
    // 文档相关
    DOCUMENTATION_SECTION: '#documentationSection',
    DOCUMENTATION_CONTENT: '#documentationContent',
    SHOW_DOCUMENTATION_BTN: '#showDocumentationBtn',
    TOGGLE_DOCUMENTATION_BTN: '#toggleDocumentationBtn'
};

/**
 * 游戏资源配置
 */
export const ASSETS_CONFIG = {
    base_path: 'assets',
    backgrounds: {
        grass: 'backgrounds/grass.png'
    },
    sprites: {
        bunny_a: 'sprites/bunny_a.png',
        bunny_b: 'sprites/bunny_b.png',
        fence: 'sprites/fence.png'
    },
    tiles: {
        hole: 'tiles/hole.png',
        stump: 'tiles/stump.png',
        stones: {
            stone1: 'tiles/stones/stone1.png',
            stone2: 'tiles/stones/stone2.png',
            stone3: 'tiles/stones/stone3.png',
            stone4: 'tiles/stones/stone4.png',
            stone5: 'tiles/stones/stone5.png',
            stone6: 'tiles/stones/stone6.png',
            stone7: 'tiles/stones/stone7.png',
            stone8: 'tiles/stones/stone8.png',
            stone9: 'tiles/stones/stone9.png'
        }
    },
    numbers: {
        one: 'numbers/one.png',
        two: 'numbers/two.png',
        three: 'numbers/three.png'
    },
    fonts: {
        'SourceHanSansSC-Regular': 'fonts/SourceHanSansSC-Regular.otf',
        'SourceSans3-Regular': 'fonts/SourceSans3-Regular.otf',
        'HALO____': 'fonts/HALO____.TTF'
    },
    sounds: {
        bunny_cackle: 'sound/bunny_cackle.mp3',
        lose: 'sound/lose.mp3',
        win: 'sound/win.mp3',
        background_music: 'sound/Pleasant Creek.mp3',
        countdown: 'sound/short-beep-countdown-81121.mp3'
    }
};

/**
 * 音频配置
 */
export const AUDIO_CONFIG = {
    musicVolume: 0.5,      // 背景音乐音量
    soundVolume: 0.7,      // 音效音量
    masterVolume: 1.0,     // 主音量
    fadeTime: 1000,        // 淡入淡出时间（毫秒）
    maxConcurrentSounds: 8 // 最大并发音效数
};

/**
 * UI配置
 */
export const UI_CONFIG = {
    theme: {
        primary: '#4a5568',
        secondary: '#2d3748',
        accent: '#4299e1',
        text: '#ffffff',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '#e2e8f0'
    },
    fonts: {
        title: '24px Arial',
        subtitle: '18px Arial',
        body: '14px Arial',
        button: '16px Arial'
    },
    spacing: {
        small: 8,
        medium: 16,
        large: 24,
        xlarge: 32
    },
    animation: {
        duration: 300,
        easing: 'easeOutCubic'
    }
};


/**
 * 倒计时配置
 */
export const COUNTDOWN_CONFIG = {
    duration: 3,           // 倒计时持续时间（秒）
    numberSize: 100,       // 数字大小
    fadeTime: 0.5,         // 淡入淡出时间
    position: {            // 倒计时位置
        x: 0.5,            // 相对X位置 (0-1)
        y: 0.3             // 相对Y位置 (0-1)
    }
};

/**
 * 渲染配置
 */
export const RENDER_CONFIG = {
    canvas: {
        width: 900,
        height: 600,
        background: '#2d3748'
    },
    layers: {
        background: 0,
        game: 1,
        ui: 2,
        overlay: 3
    },
    quality: {
        pixelRatio: window.devicePixelRatio || 1,
        antialias: true,
        smoothing: true
    }
};

/**
 * 地图配置
 */
export const MAP_CONFIG = {
    cache: {
        maxSize: 10,       // 最大缓存地图数
        ttl: 300000        // 缓存生存时间（毫秒）
    },
    paths: {
        easy: '/assets/maps/easy/',
        hard: '/assets/maps/hard/'
    },
    files: {
        pattern: 'bunny_map_{number:03d}.json',
        maxCount: 100
    }
};

/**
 * 设置配置
 */
export const SETTINGS_CONFIG = {
    default: {
        language: 'cn',
        difficulty: 'easy',
        volume: {
            master: 1.0,
            music: 0.5,
            sound: 0.7
        },
        graphics: {
            quality: 'high',
            fullscreen: false
        },
        controls: {
            keyBindings: {
                start: 'Space',
                pause: 'KeyP',
                reset: 'KeyR',
                exit: 'Escape'
            }
        }
    },
    storage: {
        key: 'bunny_runaway_settings',
        version: '1.0.0'
    }
};

/**
 * 统一配置管理器
 */
export class ConfigManager {
    constructor() {
        this.configs = {
            assets: ASSETS_CONFIG,
            audio: AUDIO_CONFIG,
            ui: UI_CONFIG,
            game: GAME_CONFIG,
            countdown: COUNTDOWN_CONFIG,
            render: RENDER_CONFIG,
            map: MAP_CONFIG,
            settings: SETTINGS_CONFIG
        };
    }

    /**
     * 获取配置
     * @param {string} category - 配置类别
     * @param {string} key - 配置键（可选）
     * @returns {*} 配置值
     */
    get(category, key = null) {
        if (!this.configs[category]) {
            console.warn(`配置类别不存在: ${category}`);
            return null;
        }

        if (key === null) {
            return this.configs[category];
        }

        return this.getNestedValue(this.configs[category], key);
    }

    /**
     * 设置配置
     * @param {string} category - 配置类别
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     */
    set(category, key, value) {
        if (!this.configs[category]) {
            this.configs[category] = {};
        }

        this.setNestedValue(this.configs[category], key, value);
    }

    /**
     * 获取嵌套值
     * @param {Object} obj - 对象
     * @param {string} path - 路径（用.分隔）
     * @returns {*} 值
     */
    getNestedValue(obj, path) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * 设置嵌套值
     * @param {Object} obj - 对象
     * @param {string} path - 路径（用.分隔）
     * @param {*} value - 值
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * 合并配置
     * @param {string} category - 配置类别
     * @param {Object} newConfig - 新配置
     */
    merge(category, newConfig) {
        if (!this.configs[category]) {
            this.configs[category] = {};
        }

        this.configs[category] = this.deepMerge(this.configs[category], newConfig);
    }

    /**
     * 深度合并对象
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并后的对象
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * 获取所有配置
     * @returns {Object} 所有配置
     */
    getAll() {
        return { ...this.configs };
    }

    /**
     * 重置配置到默认值
     * @param {string} category - 配置类别（可选）
     */
    reset(category = null) {
        if (category) {
            if (this.configs[category]) {
                this.configs[category] = this.getDefaultConfig(category);
            }
        } else {
            this.configs = {
                assets: ASSETS_CONFIG,
                audio: AUDIO_CONFIG,
                ui: UI_CONFIG,
                game: GAME_CONFIG,
                countdown: COUNTDOWN_CONFIG,
                render: RENDER_CONFIG,
                map: MAP_CONFIG,
                settings: SETTINGS_CONFIG
            };
        }
    }

    /**
     * 获取默认配置
     * @param {string} category - 配置类别
     * @returns {Object} 默认配置
     */
    getDefaultConfig(category) {
        const defaults = {
            assets: ASSETS_CONFIG,
            audio: AUDIO_CONFIG,
            ui: UI_CONFIG,
            game: GAME_CONFIG,
            countdown: COUNTDOWN_CONFIG,
            render: RENDER_CONFIG,
            map: MAP_CONFIG,
            settings: SETTINGS_CONFIG
        };

        return defaults[category] || {};
    }

    /**
     * 验证配置
     * @param {string} category - 配置类别
     * @returns {boolean} 是否有效
     */
    validate(category) {
        const config = this.configs[category];
        if (!config) {
            return false;
        }

        // 这里可以添加具体的验证逻辑
        switch (category) {
            case 'audio':
                return this.validateAudioConfig(config);
            case 'ui':
                return this.validateUIConfig(config);
            case 'game':
                return this.validateGameConfig(config);
            default:
                return true;
        }
    }

    /**
     * 验证音频配置
     * @param {Object} config - 音频配置
     * @returns {boolean} 是否有效
     */
    validateAudioConfig(config) {
        return config.musicVolume >= 0 && config.musicVolume <= 1 &&
               config.soundVolume >= 0 && config.soundVolume <= 1 &&
               config.masterVolume >= 0 && config.masterVolume <= 1;
    }

    /**
     * 验证UI配置
     * @param {Object} config - UI配置
     * @returns {boolean} 是否有效
     */
    validateUIConfig(config) {
        return config.theme && config.fonts && config.spacing;
    }

    /**
     * 验证游戏配置
     * @param {Object} config - 游戏配置
     * @returns {boolean} 是否有效
     */
    validateGameConfig(config) {
        return config.scaling && config.animation && config.physics;
    }
}

// 创建全局配置管理器实例
export const configManager = new ConfigManager();

// 导出所有配置
export default {
    ASSETS_CONFIG,
    AUDIO_CONFIG,
    UI_CONFIG,
    GAME_CONFIG,
    COUNTDOWN_CONFIG,
    RENDER_CONFIG,
    MAP_CONFIG,
    SETTINGS_CONFIG,
    ConfigManager,
    configManager
};
