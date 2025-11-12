/**
 * 文档服务 - 管理文档的加载和显示
 * 从js/ui/documentation-loader.js合并
 */

export class DocumentationService {
    /**
     * 初始化文档功能
     */
    static initialize() {
        this.setupDocumentationButtons();
        console.log('✅ 文档服务已初始化');
    }
    
    /**
     * 设置文档按钮
     */
    static setupDocumentationButtons() {
        const showDocBtn = document.getElementById('showDocumentationBtn');
        const toggleDocBtn = document.getElementById('toggleDocumentationBtn');
        const docSection = document.getElementById('documentationSection');
        
        if (!showDocBtn || !toggleDocBtn || !docSection) {
            console.warn('⚠️ 文档相关元素未找到');
            return;
        }
        
        // 显示文档按钮事件
        showDocBtn.addEventListener('click', async () => {
            await this.loadAndRenderDocumentation();
            docSection.style.display = 'block';
            showDocBtn.style.display = 'none';
            
            // 平滑滚动到文档区域
            docSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        });
        
        // 隐藏文档按钮事件
        toggleDocBtn.addEventListener('click', () => {
            docSection.style.display = 'none';
            showDocBtn.style.display = 'block';
        });
    }
    
    /**
     * 加载并渲染文档
     */
    static async loadAndRenderDocumentation() {
        const docContent = document.getElementById('documentationContent');
        if (!docContent) {
            console.error('❌ 找不到文档内容容器');
            return;
        }
        
        try {
            // 显示加载状态
            docContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #667eea;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>Loading documentation...</div>';
            
            // 加载 README.md 文件
            const response = await fetch('./docs/README.md');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const markdownText = await response.text();
            
            // 使用 marked.js 渲染 Markdown
            const htmlContent = marked.parse(markdownText);
            
            // 将渲染后的 HTML 插入到文档区域
            docContent.innerHTML = htmlContent;
            
            console.log('✅ Documentation loaded and rendered successfully');
            
        } catch (error) {
            console.error('❌ Error loading documentation:', error);
            docContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <h3>⚠️ Error Loading Documentation</h3>
                    <p>Unable to load the documentation file. Please check if the file exists at <code>./docs/README.md</code></p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="control-btn" onclick="DocumentationService.loadAndRenderDocumentation()" style="margin-top: 20px;">🔄 Retry</button>
                </div>
            `;
        }
    }
    
    /**
     * 加载并显示完整文档
     */
    static async loadAndShowFullDocument(filePath, title) {
        const fullDocDialog = document.getElementById('fullDocumentDialog');
        const fullDocTitle = document.getElementById('fullDocumentTitle');
        const fullDocContent = document.getElementById('fullDocumentContent');
        
        if (!fullDocDialog || !fullDocTitle || !fullDocContent) {
            console.error('❌ 找不到完整文档对话框元素');
            return;
        }
        
        try {
            // 设置标题
            fullDocTitle.textContent = title;
            
            // 显示对话框
            fullDocDialog.style.display = 'flex';
            
            // 显示加载状态
            fullDocContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #667eea;"><div style="border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>Loading document...</div>';
            
            // 加载文档文件
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const fileContent = await response.text();
            
            // 根据文件类型处理内容
            let htmlContent;
            if (filePath.endsWith('.html')) {
                // 对于HTML文件，提取body内容
                const parser = new DOMParser();
                const doc = parser.parseFromString(fileContent, 'text/html');
                const bodyContent = doc.body.innerHTML;
                htmlContent = bodyContent;
            } else if (filePath.endsWith('.md') || filePath.endsWith('LICENSE')) {
                // 对于Markdown或文本文件，使用marked.js渲染
                htmlContent = marked.parse(fileContent);
            } else {
                // 对于纯文本文件，保持原样
                htmlContent = `<pre style="white-space: pre-wrap; font-family: inherit;">${fileContent}</pre>`;
            }
            
            // 将内容插入到对话框
            fullDocContent.innerHTML = htmlContent;
            
            console.log(`✅ Full document loaded successfully: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ Error loading full document: ${filePath}`, error);
            fullDocContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <h3>⚠️ Error Loading Document</h3>
                    <p>Unable to load the document file. Please check if the file exists at <code>${filePath}</code></p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="control-btn" onclick="DocumentationService.loadAndShowFullDocument('${filePath}', '${title}')" style="margin-top: 20px;">🔄 Retry</button>
                </div>
            `;
        }
    }
}

// 将DocumentationService暴露到全局，供HTML中的onclick事件使用
window.DocumentationService = DocumentationService;
