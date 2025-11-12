/**
 * 应用入口文件 - 主应用初始化
 * 合并了js/ui/app-pure-js.js的功能
 */

import { GameInitializer } from './managers/GameInitializer.js';
import { UIManager } from './core/UIManager.js';
import { DialogManager } from './managers/DialogManager.js';
import { AudioManager } from './managers/AudioManager.js';
import { DocumentationService } from './services/DocumentationService.js';
import { ResponsiveHelper } from './utils/responsive-helper.js';
import { EventHandler } from './core/EventHandler.js';

// 全局游戏初始化器实例
let gameInitializer = null;

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, starting pure JavaScript game system initialization');
    
    try {
        gameInitializer = new GameInitializer();
        const success = await gameInitializer.initializeGame();
        
        if (success) {
            console.log('🎊 Pure JavaScript game system initialized successfully!');
            
            // 设置全局gameInitializer引用，供UI使用
            window.gameInitializer = gameInitializer;
            
            // 初始化各个UI模块
            initializeUIModules();
        } else {
            console.error('❌ Pure JavaScript game system initialization failed');
        }
    } catch (error) {
        console.error('❌ Critical error during pure JavaScript initialization:', error);
    }
});

/**
 * 初始化所有UI模块
 */
function initializeUIModules() {
    // 初始化事件处理器
    EventHandler.initialize();
    
    // 初始化音乐控制
    AudioManager.initializeMusicButton();
    
    // 初始化信息菜单
    UIManager.initializeInfoMenu();
    
    // 初始化文档功能
    DocumentationService.initialize();
    
    // 初始化响应式对话框功能
    ResponsiveHelper.initialize();
    
    // 注意：DialogManager已经在GameInitializer中通过实例化初始化了
    // 不需要在这里再次初始化
    
    console.log('✅ All UI modules initialized successfully for pure JavaScript version');
}

// 错误处理
window.addEventListener('error', (event) => {
    console.error(`Global error: ${event.error.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error(`Unhandled Promise rejection: ${event.reason}`);
});

// 开发者工具：教程管理命令
window.tutorialCommands = {
    // 显示教程状态
    status: () => {
        if (window.gameInitializer && window.gameInitializer.getTutorialManager) {
            const tutorialManager = window.gameInitializer.getTutorialManager();
            const status = tutorialManager.getTutorialStatus();
            
            console.log('🎓 教程状态详情 (Pure JavaScript):');
            console.log('├─ 已完成:', status.hasCompleted ? '✅ 是' : '❌ 否');
            console.log('├─ 强制显示:', status.forceShow ? '✅ 是' : '❌ 否');
            console.log('├─ 将显示教程:', status.willShow ? '✅ 是' : '❌ 否');
            console.log('├─ 完成时间:', status.completionTime || '未完成');
            console.log('├─ 存储类型:', status.storageType);
            console.log('├─ localStorage支持:', status.isLocalStorageSupported ? '✅ 是' : '❌ 否');
            console.log('└─ 用户代理:', status.userAgent.substring(0, 50) + '...');
            
            return status;
        } else {
            console.log('❌ 教程管理器未初始化 (Pure JavaScript)');
            return null;
        }
    },
    
    // 重启教程（用于测试）
    restart: () => {
        if (window.gameInitializer && window.gameInitializer.getTutorialManager) {
            const tutorialManager = window.gameInitializer.getTutorialManager();
            tutorialManager.forceShowTutorial();
            console.log('🎓 教程已重启 (Pure JavaScript)');
            return true;
        } else {
            console.log('❌ 教程管理器未初始化 (Pure JavaScript)');
            return false;
        }
    },
    
    // 帮助信息
    help: () => {
        console.log(`
🎓 教程管理命令 (Pure JavaScript):
- tutorialCommands.status()   - 查看教程状态
- tutorialCommands.restart()  - 重启教程（用于测试）
- tutorialCommands.help()     - 显示帮助信息

💡 注意: 这是纯JavaScript版本，不包含WASM模块
        `);
    }
};

// 在控制台显示可用命令
console.log(`
🎮 Bunny Runaway 纯JavaScript版本已加载完成！

🎓 教程管理命令已就绪:
- tutorialCommands.status()   - 查看教程状态
- tutorialCommands.restart()  - 重启教程（用于测试）
- tutorialCommands.help()     - 显示帮助信息

💡 提示: 这是纯JavaScript版本，用于开发和调试JavaScript逻辑
`);
