/**
 * UI系统 - 仿照Python原版的UI布局和按钮系统
 * 
 * 负责管理游戏界面元素、按钮布局和事件处理
 */

import { createError, handleError, ErrorTypes, ErrorSeverity } from '../utils/ErrorHandler.js';

export class UIService {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        
        // 确保canvas有正确的尺寸和上下文
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
            this.ctx = canvas.getContext('2d');
        } else {
            console.warn('UIService: canvas参数为空');
            this.ctx = null;
        }
        
        // UI配置 - 仿照Python原版的布局
        this.config = {
            screen: {
                width: 900,
                height: 600,
                mapSize: 600,
                backgroundColor: [240, 248, 255]
            },
            map: {
                position: { x: 50, y: 100 },
                size: 600
            },
            controlPanel: {
                position: { x: 670, y: 340 },
                spacing: 45,
                buttonSize: { width: 160, height: 40 }
            },
            statusPanel: {
                position: { x: 620, y: 70 },
                width: 260,
                spacing: 10
            }
        };
        
        // 按钮定义
        this.buttons = new Map();
        this.setupButtons();
        
        // 状态面板信息
        this.statusInfo = {
            mapNumber: 1,
            difficulty: 'easy',
            bunnyStatus: 'IDLE',
            bunnyPosition: 'N/A',
            pathInfo: 'N/A',
            blockersInfo: '0/5'
        };
        
        // 事件回调
        this.onButtonClick = null;
        this.onLanguageChange = null;
        this.onDifficultyChange = null;
        
        // 语言系统
        this.currentLanguage = 'cn';
        this.languages = {
            'cn': { name: '中文', flag: 'cn.png' },
            'en': { name: 'English', flag: 'gb.png' },
            'de': { name: 'Deutsch', flag: 'de.png' },
            'es': { name: 'Español', flag: 'es.png' },
            'fr': { name: 'Français', flag: 'fr.png' },
            'jp': { name: '日本語', flag: 'jp.png' },
            'kr': { name: '한국어', flag: 'kr.png' }
        };
        
        // 语言选择器状态
        this.languageSelectorOpen = false;
    }
    
    /**
     * 设置按钮
     */
    setupButtons() {
        // 游戏区内的按钮已全部移除，所有UI控制现在由外部HTML面板处理
        // 包括：教程、语言选择、难度选择、游戏控制等
        // 这样可以避免重复和冲突，保持界面简洁
    }
    
    /**
     * 添加按钮
     */
    addButton(name, config) {
        this.buttons.set(name, {
            ...config,
            hover: false,
            pressed: false
        });
    }
    
    /**
     * 更新UI系统
     */
    update(deltaTime) {
        // 更新按钮状态
        for (const [name, button] of this.buttons) {
            // 重置按钮状态
            button.hover = false;
            button.pressed = false;
        }
    }
    
    /**
     * 渲染UI
     */
    render(ctx, gameState) {
        // 游戏区内的UI元素已全部移除，现在只渲染版权信息
        this.renderCopyright(ctx);
    }
    
    // 状态面板渲染方法已删除，现在由外部HTML面板处理状态显示
    
    /**
     * 渲染按钮
     */
    renderButtons(ctx) {
        for (const [name, button] of this.buttons) {
            this.renderButton(ctx, name, button);
        }
    }
    
    /**
     * 渲染单个按钮
     */
    renderButton(ctx, name, button) {
        const x = button.position.x;
        const y = button.position.y;
        const width = button.size.width;
        const height = button.size.height;
        
        ctx.save();
        
        // 确定按钮颜色
        let bgColor = '#FFFFFF';
        let textColor = '#000000';
        let borderColor = '#000000';
        
        if (!button.enabled) {
            bgColor = '#C8C8C8';
            textColor = '#808080';
            borderColor = '#808080';
        } else if (button.hover) {
            bgColor = '#F0F0F0';
            borderColor = '#505050';
        }
        
        // 绘制按钮背景
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        
        // 绘制按钮文本
        if (button.text) {
            ctx.fillStyle = textColor;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.text, x + width / 2, y + height / 2);
        }
        
        // 特殊按钮处理
        if (button.isLanguageSelector) {
            this.renderLanguageFlag(ctx, x, y, width, height);
        }
        
        ctx.restore();
    }
    
    /**
     * 渲染语言旗帜
     */
    renderLanguageFlag(ctx, x, y, width, height) {
        const language = this.languages[this.currentLanguage];
        if (language) {
            // 这里应该加载并绘制旗帜图片
            // 暂时用文字代替
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(language.name, x + width / 2, y + height / 2);
        }
    }
    
    // 语言选择器相关方法已删除，现在由外部HTML面板处理
    
    /**
     * 渲染版权信息
     */
    renderCopyright(ctx) {
        ctx.save();
        ctx.fillStyle = '#808080';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('© 2025 ParadoxSolver | Bunny Runaway', this.width / 2, this.height - 10);
        ctx.restore();
    }
    
    /**
     * 处理鼠标点击
     */
    handleClick(x, y) {
        // 游戏区内的按钮已全部移除，所有交互现在由外部HTML面板处理
        return false;
    }
    
    // 语言选择器点击处理方法已删除
    
    /**
     * 检查点是否在按钮内
     */
    isPointInButton(x, y, button) {
        return x >= button.position.x && 
               x <= button.position.x + button.size.width &&
               y >= button.position.y && 
               y <= button.position.y + button.size.height;
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonState(buttonName, enabled, text = null) {
        const button = this.buttons.get(buttonName);
        if (button) {
            button.enabled = enabled;
            if (text !== null) {
                button.text = text;
            }
        }
    }
    
    /**
     * 更新状态信息
     */
    updateStatusInfo(info) {
        this.statusInfo = { ...this.statusInfo, ...info };
    }
    
    /**
     * 设置按钮点击回调
     */
    setOnButtonClick(callback) {
        this.onButtonClick = callback;
    }
    
    /**
     * 设置语言变化回调
     */
    setOnLanguageChange(callback) {
        this.onLanguageChange = callback;
    }
    
    /**
     * 设置难度变化回调
     */
    setOnDifficultyChange(callback) {
        this.onDifficultyChange = callback;
    }
}

// 默认导出
export default UIService;