/**
 * 精灵系统 - 仿照Python版本的Bunny动画系统
 * 管理精灵动画和渲染
 */

import { globalPauseManager } from '../core/PauseManager.js';

/**
 * 动画精灵类 - 仿照Python版本的Bunny类
 */
export class AnimatedSprite {
    constructor(position, animation = null) {
        this.position = { x: position.x, y: position.y };
        this.animation = animation;
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.visible = true;
        this.scale = 1.0;
        this.rotation = 0;
        this.alpha = 1.0;
        
        // 当前显示的图像
        this.currentImage = null;
        if (this.animation && this.animation.frames.length > 0) {
            this.currentImage = this.animation.frames[0];
        }
    }
    
    /**
     * 设置动画
     */
    setAnimation(animation) {
        this.animation = animation;
        this.currentFrame = 0;
        this.animationTimer = 0;
        
        if (this.animation && this.animation.frames.length > 0) {
            this.currentImage = this.animation.frames[0];
        }
    }
    
    /**
     * 启动动画
     */
    startAnimation(loop = true) {
        if (this.animation && this.animation.frames.length > 1) {
            this.animationTimer = 0;
            this.currentFrame = 0;
            this.animation.loop = loop;
            console.log(`🎬 动画已启动，循环: ${loop}, 帧数: ${this.animation.frames.length}`);
        } else {
            console.warn('⚠️ 无法启动动画：动画数据无效');
        }
    }
    
    /**
     * 停止动画
     */
    stopAnimation() {
        if (this.animation) {
            this.animationTimer = 0;
            this.currentFrame = 0;
            if (this.animation.frames.length > 0) {
                this.currentImage = this.animation.frames[0];
            }
            console.log('⏹️ 动画已停止');
        }
    }
    
    /**
     * 更新动画（仿照Python版本的update方法）
     */
    update(dt) {
        if (!this.animation || this.animation.frames.length <= 1) {
            return;
        }
        
        // 更新动画计时器（转换为毫秒，仿照Python版本：self.animation_timer += dt * 1000）
        this.animationTimer += dt * 1000;
        
        // 检查是否需要切换帧（仿照Python版本：if self.animation_timer >= self.animation["duration"]）
        if (this.animationTimer >= this.animation.duration) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.animation.frames.length;
            this.currentImage = this.animation.frames[this.currentFrame];
        }
    }
    
    /**
     * 渲染精灵
     */
    render(ctx) {
        if (!this.visible) {
            console.log('🙈 精灵不可见，跳过渲染');
            return;
        }
        
        if (!this.currentImage) {
            console.log('🖼️ 精灵没有当前图像，跳过渲染');
            return;
        }
        
        ctx.save();
        
        // 设置透明度
        ctx.globalAlpha = this.alpha;
        
        // 移动到精灵位置
        ctx.translate(this.position.x, this.position.y);
        
        // 应用旋转
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        // 计算渲染尺寸
        const width = this.currentImage.width * this.scale;
        const height = this.currentImage.height * this.scale;
        
        // 绘制图像（居中）
        ctx.drawImage(
            this.currentImage,
            -width / 2,
            -height / 2,
            width,
            height
        );
        
        // 可选的调试边框
        if (this.debugBorder) {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(-width / 2, -height / 2, width, height);
        }
        
        ctx.restore();
    }
    
    /**
     * 设置位置
     */
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
    }
    
    /**
     * 获取边界框
     */
    getBounds() {
        if (!this.currentImage) {
            return { x: this.position.x, y: this.position.y, width: 0, height: 0 };
        }
        
        const width = this.currentImage.width * this.scale;
        const height = this.currentImage.height * this.scale;
        
        return {
            x: this.position.x - width / 2,
            y: this.position.y - height / 2,
            width: width,
            height: height
        };
    }
}

// BunnySprite类已移除，功能已融合到Bunny类中

/**
 * 精灵管理器
 */
export class SpriteService {
    constructor() {
        this.sprites = new Map();
        this.spriteGroups = new Map();
    }
    
    /**
     * 添加精灵
     */
    addSprite(name, sprite, group = 'default') {
        this.sprites.set(name, sprite);
        
        if (!this.spriteGroups.has(group)) {
            this.spriteGroups.set(group, new Set());
        }
        this.spriteGroups.get(group).add(name);
    }
    
    /**
     * 获取精灵
     */
    getSprite(name) {
        return this.sprites.get(name);
    }
    
    /**
     * 移除精灵
     */
    removeSprite(name) {
        const sprite = this.sprites.get(name);
        if (sprite) {
            this.sprites.delete(name);
            
            // 从所有组中移除
            for (const group of this.spriteGroups.values()) {
                group.delete(name);
            }
        }
    }
    
    /**
     * 更新所有精灵（仿照Python版本的时间传递方式）
     * 注意：暂停状态检查已在GameLoop层面统一处理，这里不再重复检查
     */
    updateAll(dt) {
        for (const sprite of this.sprites.values()) {
            sprite.update(dt);
        }
    }
    
    /**
     * 更新所有精灵（排除兔子，避免重复更新）
     * 注意：暂停状态检查已在GameLoop层面统一处理，这里不再重复检查
     */
    updateAllExceptBunny(dt) {
        for (const [name, sprite] of this.sprites) {
            // 跳过兔子，避免重复更新
            if (name !== 'bunny') {
                sprite.update(dt);
            }
        }
    }
    
    /**
     * 渲染指定组的精灵
     */
    renderGroup(ctx, groupName = 'default') {
        const group = this.spriteGroups.get(groupName);
        if (!group) return;
        
        for (const spriteName of group) {
            const sprite = this.sprites.get(spriteName);
            if (sprite) {
                sprite.render(ctx);
            }
        }
    }
    
    /**
     * 渲染所有精灵
     */
    renderAll(ctx) {
        for (const sprite of this.sprites.values()) {
            sprite.render(ctx);
        }
    }
    
    /**
     * 清理所有精灵
     */
    clear() {
        this.sprites.clear();
        this.spriteGroups.clear();
    }
}
