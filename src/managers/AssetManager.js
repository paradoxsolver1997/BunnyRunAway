/**
 * 真实资源加载器 - 仿照Python版本的ResourceManager
 * 加载真实的游戏资源（图片、动画等）
 */

export class AssetManager {
    constructor(parameterManager = null) {
        this.images = new Map();
        this.animations = new Map();
        this.loadingPromises = new Map();
        this.parameterManager = parameterManager;
        
        // 资源路径配置（仿照Python版本的ResourcePathManager）
        this.assetPaths = {
            backgrounds: 'assets/backgrounds/',
            sprites: 'assets/sprites/',
            tiles: 'assets/tiles/',
            fonts: 'assets/fonts/',
            languages: 'assets/languages/',
            numbers: 'assets/numbers/',
            sound: 'assets/sound/',
            buttons: 'assets/buttons/'
        };
        
        // 进度回调
        this.progressCallback = null;
        this.loadedCount = 0;
        this.totalCount = 0;
    }
    
    /**
     * 设置进度回调
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    
    /**
     * 更新加载进度
     */
    updateProgress(resourceName = '') {
        this.loadedCount++;
        if (this.progressCallback) {
            this.progressCallback(this.loadedCount, this.totalCount, resourceName);
        }
    }
    
    /**
     * 获取资源完整路径
     */
    getAssetPath(category, ...resourceParts) {
        const basePath = this.assetPaths[category];
        if (!basePath) {
            console.error(`未知的资源类别: ${category}`);
            return null;
        }
        
        // 处理嵌套路径（如stones/stone1.png）
        const resourcePath = resourceParts.join('/');
        return basePath + resourcePath + '.png';
    }
    
    /**
     * 获取缩放因子 - 从参数管理器获取
     */
    getScalingFactor(resourceType) {
        if (this.parameterManager) {
            return this.parameterManager.getScaling(resourceType, 1.0);
        }
        
        // 回退到硬编码值（仿照Python版本）
        const defaultScaling = {
            bunny: 0.075,
            fence: 0.075,
            stump: 0.075,
            hole: 0.5,
            stones: 0.3
        };
        
        return defaultScaling[resourceType] || 1.0;
    }
    
    /**
     * 加载单个图像资源
     */
    async loadImage(name, category, resourceName, scale = null) {
        // 如果已经加载过，直接返回
        if (this.images.has(name)) {
            return this.images.get(name);
        }
        
        // 如果正在加载，等待加载完成
        if (this.loadingPromises.has(name)) {
            return await this.loadingPromises.get(name);
        }
        
        // 创建加载Promise
        const loadingPromise = this._loadImageInternal(name, category, resourceName, scale);
        this.loadingPromises.set(name, loadingPromise);
        
        try {
            const image = await loadingPromise;
            this.images.set(name, image);
            this.loadingPromises.delete(name);
            this.updateProgress(resourceName);
            return image;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }
    
    /**
     * 内部图像加载方法
     */
    async _loadImageInternal(name, category, resourceName, scale) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // 确定缩放比例
                let finalScale = scale;
                if (finalScale === null) {
                    if (category === 'sprites' && resourceName.includes('bunny')) {
                        finalScale = this.getScalingFactor('bunny');
                    } else if (category === 'sprites' && resourceName === 'fence') {
                        finalScale = this.getScalingFactor('fence');
                    } else if (category === 'tiles' && resourceName === 'stump') {
                        finalScale = this.getScalingFactor('stump');
                    } else if (category === 'tiles' && resourceName === 'hole') {
                        finalScale = this.getScalingFactor('hole');
                    } else if (category === 'tiles' && resourceName.startsWith('stone')) {
                        finalScale = this.getScalingFactor('stones');
                    } else {
                        finalScale = 1.0;
                    }
                }
                
                // 如果需要缩放，创建Canvas进行缩放
                if (finalScale !== 1.0) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    const newWidth = Math.round(img.width * finalScale);
                    const newHeight = Math.round(img.height * finalScale);
                    
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    // 使用平滑缩放
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // 将Canvas转换为Image对象
                    const scaledImg = new Image();
                    scaledImg.onload = () => resolve(scaledImg);
                    scaledImg.onerror = reject;
                    scaledImg.src = canvas.toDataURL();
                } else {
                    resolve(img);
                }
            };
            
            img.onerror = () => {
                console.error(`无法加载图像: ${name}`);
                // 创建占位图像
                const placeholder = this._createPlaceholder();
                resolve(placeholder);
            };
            
            // 设置图像源
            const imagePath = this.getAssetPath(category, resourceName);
            if (imagePath) {
                img.src = imagePath;
            } else {
                reject(new Error(`无法确定资源路径: ${category}/${resourceName}`));
            }
        });
    }
    
    /**
     * 创建占位图像
     */
    _createPlaceholder() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        
        // 绘制红色占位方块
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 32, 32);
        
        // 绘制白色边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 28, 28);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }
    
    /**
     * 加载动画序列（仿照Python版本）
     */
    async loadAnimation(name, category, resourceNames, frameDuration = null) {
        if (this.animations.has(name)) {
            return this.animations.get(name);
        }
        
        // 确定帧持续时间 - 从参数管理器获取
        let duration = frameDuration;
        if (duration === null) {
            if (name === 'bunny' && this.parameterManager) {
                duration = this.parameterManager.getBunny('animation.frame_duration', 500);
            } else {
                duration = 500; // 默认值
            }
        }
        
        // 加载所有帧
        const frames = [];
        const loadPromises = [];
        
        for (let i = 0; i < resourceNames.length; i++) {
            const frameName = `${name}_frame_${i}`;
            const resourceName = resourceNames[i];
            
            const promise = this.loadImage(frameName, category, resourceName)
                .then(image => ({ index: i, image }));
            loadPromises.push(promise);
        }
        
        // 等待所有帧加载完成
        const loadedFrames = await Promise.all(loadPromises);
        
        // 按索引排序帧
        loadedFrames.sort((a, b) => a.index - b.index);
        loadedFrames.forEach(frame => frames.push(frame.image));
        
        const animation = {
            frames: frames,
            duration: duration,
            frameCount: frames.length
        };
        
        this.animations.set(name, animation);
        this.updateProgress(name);
        return animation;
    }
    
    /**
     * 获取已加载的图像
     */
    getImage(name) {
        return this.images.get(name) || null;
    }
    
    /**
     * 获取已加载的动画
     */
    getAnimation(name) {
        return this.animations.get(name) || null;
    }
    
    /**
     * 获取倒计时数字图片
     */
    getNumberImage(number) {
        const numberMap = {
            1: 'number_one',
            2: 'number_two', 
            3: 'number_three'
        };
        
        const imageName = numberMap[number];
        if (!imageName) {
            console.warn(`未找到数字 ${number} 的图片`);
            return null;
        }
        
        return this.getImage(imageName);
    }
    
    /**
     * 预加载核心游戏资源
     */
    async preloadCoreAssets() {
        console.log('🎨 开始预加载核心游戏资源...');
        
        // 计算总资源数量
        this.totalCount = 16; // 1背景 + 2兔子 + 3地图元素 + 9石头 + 3数字 + 1按钮
        this.loadedCount = 0;
        
        const loadingTasks = [];
        
        // 加载背景
        loadingTasks.push(
            this.loadImage('background', 'backgrounds', 'grass')
                .then(() => console.log('✅ 背景加载完成'))
        );
        
        // 加载兔子动画帧
        loadingTasks.push(
            this.loadAnimation('bunny', 'sprites', ['bunny_a', 'bunny_b'])
                .then(() => console.log('✅ 兔子动画加载完成'))
        );
        
        // 加载地图元素
        loadingTasks.push(
            this.loadImage('hole', 'tiles', 'hole')
                .then(() => console.log('✅ 洞口图像加载完成'))
        );
        
        loadingTasks.push(
            this.loadImage('stump', 'tiles', 'stump')
                .then(() => console.log('✅ 树桩图像加载完成'))
        );
        
        loadingTasks.push(
            this.loadImage('fence', 'sprites', 'fence')
                .then(() => console.log('✅ 围栏图像加载完成'))
        );
        
        // 加载石头纹理
        const stonePromises = [];
        for (let i = 1; i <= 9; i++) {
            stonePromises.push(
                this.loadImage(`stone${i}`, 'tiles', `stones/stone${i}`)
            );
        }
        loadingTasks.push(
            Promise.all(stonePromises)
                .then(() => console.log('✅ 石头纹理加载完成'))
        );
        
        // 加载倒计时数字图片
        loadingTasks.push(
            this.loadImage('number_one', 'numbers', 'one')
                .then(() => console.log('✅ 数字1图片加载完成'))
        );
        
        loadingTasks.push(
            this.loadImage('number_two', 'numbers', 'two')
                .then(() => console.log('✅ 数字2图片加载完成'))
        );
        
        loadingTasks.push(
            this.loadImage('number_three', 'numbers', 'three')
                .then(() => console.log('✅ 数字3图片加载完成'))
        );
        
        // 加载开始按钮图片
        loadingTasks.push(
            this.loadImage('start_button', 'buttons', 'startbtn')
                .then(() => console.log('✅ 开始按钮图片加载完成'))
        );
        
        try {
            await Promise.all(loadingTasks);
            console.log('🎊 所有核心资源加载完成！');
            return true;
        } catch (error) {
            console.error('❌ 资源加载失败:', error);
            return false;
        }
    }
    
    /**
     * 获取加载进度
     */
    getLoadingProgress() {
        const totalImages = this.images.size + this.loadingPromises.size;
        const loadedImages = this.images.size;
        
        if (totalImages === 0) return 0;
        return loadedImages / totalImages;
    }
    
    /**
     * 清理资源
     */
    clear() {
        this.images.clear();
        this.animations.clear();
        this.loadingPromises.clear();
    }
}
