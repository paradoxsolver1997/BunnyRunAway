/**
 * Canvas渲染引擎
 * 
 * 替代pygame的渲染功能，提供完整的2D游戏渲染能力
 */

export class CanvasRenderer {
    constructor(canvas, width = 800, height = 600) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = width;
        this.height = height;
        
        // 设置画布尺寸
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 渲染状态
        this.clearColor = '#f0fff4'; // 默认背景色（草地绿）
        this.camera = { x: 0, y: 0, zoom: 1.0 };
        
        // 资源缓存
        this.imageCache = new Map();
        this.fontCache = new Map();
        
        // 渲染队列
        this.renderQueue = [];
        
        // 性能优化
        this.optimizer = new RenderOptimizer(this);
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        
        // 初始化
        this.setupCanvas();
    }
    
    setupCanvas() {
        // 设置高质量渲染
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // 设置文本渲染
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';
    }
    
    // ==================== 基础渲染方法 ====================
    
    clear() {
        this.ctx.fillStyle = this.clearColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    setClearColor(color) {
        this.clearColor = color;
    }
    
    // ==================== 图片渲染 ====================
    
    async loadImage(src) {
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
        });
    }
    
    drawImage(image, x, y, width = null, height = null, sourceX = 0, sourceY = 0, sourceWidth = null, sourceHeight = null) {
        if (!image) return;
        
        if (sourceWidth !== null && sourceHeight !== null) {
            // 绘制图片的一部分
            this.ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width || sourceWidth, height || sourceHeight);
        } else if (width !== null && height !== null) {
            // 缩放绘制
            this.ctx.drawImage(image, x, y, width, height);
        } else {
            // 原始尺寸绘制
            this.ctx.drawImage(image, x, y);
        }
    }
    
    drawImageCentered(image, x, y, width = null, height = null) {
        if (!image) return;
        
        const drawWidth = width || image.width;
        const drawHeight = height || image.height;
        const drawX = x - drawWidth / 2;
        const drawY = y - drawHeight / 2;
        
        this.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }
    
    drawRotatedImage(image, x, y, width, height, rotation) {
        if (!image) return;
        
        // 保存当前状态
        this.ctx.save();
        
        // 移动到旋转中心
        this.ctx.translate(x, y);
        
        // 旋转
        this.ctx.rotate(rotation * Math.PI / 180);
        
        // 绘制图片（居中）
        this.ctx.drawImage(image, -width / 2, -height / 2, width, height);
        
        // 恢复状态
        this.ctx.restore();
    }
    
    // ==================== 几何图形渲染 ====================
    
    _setDrawStyle(color, strokeWidth) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.fillStyle = color;
    }

    drawRect(x, y, width, height, color = '#000000', fill = true, strokeWidth = 1) {
        this._setDrawStyle(color, strokeWidth);
        
        if (fill) {
            this.ctx.fillRect(x, y, width, height);
        } else {
            this.ctx.strokeRect(x, y, width, height);
        }
    }
    
    drawCircle(x, y, radius, color = '#000000', fill = true, strokeWidth = 1) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this._setDrawStyle(color, strokeWidth);
        
        if (fill) {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
    }
    
    drawLine(x1, y1, x2, y2, color = '#000000', width = 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this._setDrawStyle(color, width);
        this.ctx.stroke();
    }
    
    drawPolygon(points, color = '#000000', fill = true, strokeWidth = 1) {
        if (points.length < 3) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.closePath();
        
        this._setDrawStyle(color, strokeWidth);
        
        if (fill) {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
    }
    
    // ==================== 文本渲染 ====================
    
    async loadFont(fontFamily, fontSize, fontPath = null) {
        const fontKey = `${fontFamily}_${fontSize}`;
        
        if (this.fontCache.has(fontKey)) {
            return this.fontCache.get(fontKey);
        }
        
        // 如果有字体文件路径，加载字体
        if (fontPath) {
            try {
                const fontFace = new FontFace(fontFamily, `url(${fontPath})`);
                await fontFace.load();
                document.fonts.add(fontFace);
            } catch (error) {
                console.warn(`Failed to load font from ${fontPath}:`, error);
            }
        }
        
        const font = {
            family: fontFamily,
            size: fontSize,
            style: `${fontSize}px ${fontFamily}`
        };
        
        this.fontCache.set(fontKey, font);
        return font;
    }
    
    setFont(fontFamily, fontSize) {
        this.ctx.font = `${fontSize}px ${fontFamily}`;
    }
    
    drawText(text, x, y, color = '#000000', fontFamily = 'Arial', fontSize = 16, align = 'left', baseline = 'top') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
    }
    
    drawTextCentered(text, x, y, color = '#000000', fontFamily = 'Arial', fontSize = 16) {
        this.drawText(text, x, y, color, fontFamily, fontSize, 'center', 'middle');
    }
    
    measureText(text, fontFamily = 'Arial', fontSize = 16) {
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        return this.ctx.measureText(text);
    }
    
    // ==================== 变换和状态管理 ====================
    
    save() {
        this.ctx.save();
    }
    
    restore() {
        this.ctx.restore();
    }
    
    translate(x, y) {
        this.ctx.translate(x, y);
    }
    
    rotate(angle) {
        this.ctx.rotate(angle);
    }
    
    scale(sx, sy) {
        this.ctx.scale(sx, sy);
    }
    
    setAlpha(alpha) {
        this.ctx.globalAlpha = alpha;
    }
    
    setBlendMode(mode) {
        this.ctx.globalCompositeOperation = mode;
    }
    
    // ==================== 相机系统 ====================
    
    setCamera(x, y, zoom = 1.0) {
        this.camera.x = x;
        this.camera.y = y;
        this.camera.zoom = zoom;
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + this.width / 2,
            y: (worldY - this.camera.y) * this.camera.zoom + this.height / 2
        };
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.width / 2) / this.camera.zoom + this.camera.x,
            y: (screenY - this.height / 2) / this.camera.zoom + this.camera.y
        };
    }
    
    // ==================== 渲染队列系统 ====================
    
    addToRenderQueue(renderFunction, priority = 0) {
        this.renderQueue.push({ function: renderFunction, priority });
        this.renderQueue.sort((a, b) => a.priority - b.priority);
    }
    
    clearRenderQueue() {
        this.renderQueue = [];
    }
    
    renderQueue() {
        for (const item of this.renderQueue) {
            item.function(this);
        }
    }
    
    // ==================== 特效和动画 ====================
    
    drawFadeEffect(x, y, width, height, alpha, color = '#000000') {
        this.save();
        this.setAlpha(alpha);
        this.drawRect(x, y, width, height, color, true);
        this.restore();
    }
    
    drawGlowEffect(x, y, radius, color = '#ffffff', intensity = 0.5) {
        this.save();
        this.setBlendMode('screen');
        this.setAlpha(intensity);
        
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        
        this.restore();
    }
    
    drawParticle(x, y, size, color = '#ffffff', alpha = 1.0) {
        this.save();
        this.setAlpha(alpha);
        this.drawCircle(x, y, size, color, true);
        this.restore();
    }
    
    // ==================== 性能监控 ====================
    
    beginFrame() {
        this.lastFrameTime = performance.now();
    }
    
    endFrame() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.frameCount++;
        
        // 计算FPS
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / deltaTime);
        }
    }
    
    getFPS() {
        return this.fps;
    }
    
    // ==================== 调试和开发工具 ====================
    
    drawDebugGrid(gridSize = 50, color = '#cccccc', alpha = 0.3) {
        this.save();
        this.setAlpha(alpha);
        
        // 绘制垂直线
        for (let x = 0; x < this.width; x += gridSize) {
            this.drawLine(x, 0, x, this.height, color);
        }
        
        // 绘制水平线
        for (let y = 0; y < this.height; y += gridSize) {
            this.drawLine(0, y, this.width, y, color);
        }
        
        this.restore();
    }
    
    drawDebugInfo(x, y, info) {
        this.save();
        this.setFont('monospace', 12);
        this.setAlpha(0.8);
        
        let lineHeight = 16;
        let currentY = y;
        
        for (const [key, value] of Object.entries(info)) {
            this.drawText(`${key}: ${value}`, x, currentY, '#ffffff', 'monospace', 12);
            currentY += lineHeight;
        }
        
        this.restore();
    }
    
    // ==================== 截图和导出 ====================
    
    captureCanvas() {
        return this.canvas.toDataURL('image/png');
    }
    
    downloadCanvas(filename = 'canvas_capture.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.captureCanvas();
        link.click();
    }

    markDirtyRegion(x, y, width, height) {
        this.optimizer.markDirty(x, y, width, height);
    }

    render() {
        this.clear();
        this.optimizer.optimizedRender();
        // 调用渲染队列或其他渲染逻辑
        this.renderQueue();
    }
}

// 使用统一的导出工具
export { CanvasRenderer };
export default CanvasRenderer;

