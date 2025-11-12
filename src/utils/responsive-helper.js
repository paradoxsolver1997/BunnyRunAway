/**
 * 响应式辅助工具 - 管理响应式对话框和布局
 * 从 index.html 中提取的响应式处理逻辑
 */

export class ResponsiveHelper {
    /**
     * 初始化响应式对话框居中功能
     */
    static initialize() {
        // 检测面板可见性并调整对话框位置
        function updateDialogPosition() {
            const documentationSection = document.getElementById('documentationSection');
            const gameArea = document.querySelector('.game-area');
            const infoPanel = document.querySelector('.info-panel');
            const dialogs = document.querySelectorAll('.dialog-overlay');
            
            // 检查是否只有Game Status面板可见
            const isOnlyGameStatusVisible = !documentationSection || 
                documentationSection.style.display === 'none' || 
                documentationSection.offsetParent === null;
            
            // 检查窗口大小
            const windowWidth = window.innerWidth;
            const isSmallScreen = windowWidth <= 1200;
            
            // 为所有对话框添加响应式类
            dialogs.forEach(dialog => {
                if (isOnlyGameStatusVisible || isSmallScreen) {
                    dialog.classList.add('responsive-center');
                } else {
                    dialog.classList.remove('responsive-center');
                }
            });
            
            console.log(`🔄 对话框位置更新: 仅Game Status可见=${isOnlyGameStatusVisible}, 小屏幕=${isSmallScreen}`);
        }
        
        // 监听窗口大小变化
        window.addEventListener('resize', updateDialogPosition);
        
        // 监听文档区域显示/隐藏
        const observer = new MutationObserver(updateDialogPosition);
        const documentationSection = document.getElementById('documentationSection');
        if (documentationSection) {
            observer.observe(documentationSection, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
        
        // 初始调用
        updateDialogPosition();
        
        console.log('✅ 响应式对话框居中功能已初始化');
    }
}
