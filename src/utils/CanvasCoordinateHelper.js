/**
 * Canvas坐标修正工具类
 * 统一处理Canvas坐标转换和修正，解决鼠标点击位置偏移问题
 * 同时支持纯JavaScript版本和WASM版本
 */

export class CanvasCoordinateHelper {
    /**
     * 获取修正后的Canvas坐标
     * 解决CSS样式（边框、缩放等）对坐标计算的影响
     * 
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @param {MouseEvent} event - 鼠标事件
     * @returns {Object} 修正后的坐标 {x, y}
     */
    static getCorrectedCoordinates(canvas, event) {
        if (!canvas || !event) {
            console.warn('CanvasCoordinateHelper: 缺少canvas或event参数');
            return { x: 0, y: 0 };
        }

        try {
            // 获取Canvas的边界框
            const rect = canvas.getBoundingClientRect();
            
            // 获取CSS样式信息
            const computedStyle = window.getComputedStyle(canvas);
            
            // 计算边框宽度
            const borderWidth = this.getBorderWidth(computedStyle);
            
            // 计算基础坐标（排除边框）
            let x = event.clientX - rect.left - borderWidth;
            let y = event.clientY - rect.top - borderWidth;
            
            // 检查并处理CSS transform缩放（如果存在）
            const transformInfo = this.parseTransformMatrix(computedStyle.transform);
            if (transformInfo.scaleX !== 1 || transformInfo.scaleY !== 1) {
                x = x / transformInfo.scaleX;
                y = y / transformInfo.scaleY;
            }
            
            // 处理Canvas尺寸变化的情况
            // 如果Canvas的显示尺寸与内部尺寸不同，需要按比例缩放坐标
            const displayWidth = rect.width - (borderWidth * 2);
            const displayHeight = rect.height - (borderWidth * 2);
            const scaleX = canvas.width / displayWidth;
            const scaleY = canvas.height / displayHeight;
            
            // 只有当缩放比例明显不同时才应用缩放
            if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
                x = x * scaleX;
                y = y * scaleY;
            }
            
            // 确保坐标在Canvas范围内
            x = Math.max(0, Math.min(x, canvas.width));
            y = Math.max(0, Math.min(y, canvas.height));
            
            return { x, y };
            
        } catch (error) {
            console.error('CanvasCoordinateHelper: 坐标修正失败', error);
            // 降级到基础坐标计算
            const rect = canvas.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
    }
    
    /**
     * 获取Canvas边框宽度
     * 
     * @param {CSSStyleDeclaration} computedStyle - 计算后的样式
     * @returns {number} 边框宽度（像素）
     */
    static getBorderWidth(computedStyle) {
        const borderLeft = parseInt(computedStyle.borderLeftWidth) || 0;
        const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
        
        // 返回较大的边框宽度（通常左右和上下边框相同）
        return Math.max(borderLeft, borderTop);
    }
    
    /**
     * 解析CSS transform矩阵
     * 
     * @param {string} transform - CSS transform属性值
     * @returns {Object} 解析后的变换信息
     */
    static parseTransformMatrix(transform) {
        if (!transform || transform === 'none') {
            return { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
        }
        
        try {
            // 解析matrix()格式
            const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
            if (matrixMatch) {
                const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
                if (values.length >= 6) {
                    return {
                        scaleX: values[0],
                        scaleY: values[3],
                        translateX: values[4],
                        translateY: values[5]
                    };
                }
            }
            
            // 解析scale()格式
            const scaleMatch = transform.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
            if (scaleMatch) {
                const scaleX = parseFloat(scaleMatch[1]);
                const scaleY = parseFloat(scaleMatch[2] || scaleMatch[1]);
                return {
                    scaleX: scaleX,
                    scaleY: scaleY,
                    translateX: 0,
                    translateY: 0
                };
            }
            
        } catch (error) {
            console.warn('CanvasCoordinateHelper: 解析transform失败', error);
        }
        
        // 默认返回无变换
        return { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
    }
    
    /**
     * 获取Canvas的实际缩放比例
     * 用于动态调整边检测阈值
     * 
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @returns {number} 缩放比例
     */
    static getCanvasScale(canvas) {
        if (!canvas) return 1;
        
        try {
            const computedStyle = window.getComputedStyle(canvas);
            const transformInfo = this.parseTransformMatrix(computedStyle.transform);
            return Math.max(transformInfo.scaleX, transformInfo.scaleY);
        } catch (error) {
            console.warn('CanvasCoordinateHelper: 获取缩放比例失败', error);
            return 1;
        }
    }
    
    /**
     * 计算动态边检测阈值
     * 根据Canvas缩放比例调整检测精度
     * 
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @param {number} baseThreshold - 基础阈值（默认20）
     * @returns {number} 调整后的阈值
     */
    static getAdjustedThreshold(canvas, baseThreshold = 20) {
        const scale = this.getCanvasScale(canvas);
        return baseThreshold * scale;
    }
    
    /**
     * 调试方法：输出Canvas坐标信息
     * 用于开发时调试坐标问题
     * 
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @param {MouseEvent} event - 鼠标事件
     */
    static debugCoordinates(canvas, event) {
        if (!canvas || !event) return;
        
        const rect = canvas.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(canvas);
        const borderWidth = this.getBorderWidth(computedStyle);
        const transformInfo = this.parseTransformMatrix(computedStyle.transform);
        const corrected = this.getCorrectedCoordinates(canvas, event);
        
        console.log('🔍 Canvas坐标调试信息:');
        console.log('├─ 原始坐标:', { x: event.clientX, y: event.clientY });
        console.log('├─ Canvas边界:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        console.log('├─ Canvas尺寸:', { width: canvas.width, height: canvas.height });
        console.log('├─ 边框宽度:', borderWidth);
        console.log('├─ Transform信息:', transformInfo);
        console.log('├─ 修正后坐标:', corrected);
        console.log('└─ 缩放比例:', this.getCanvasScale(canvas));
    }
}
