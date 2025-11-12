/**
 * 真实地图渲染器 - 仿照Python版本的Renderer类
 * 使用真实图像资源渲染地图元素
 */

export class MapRenderer {
    constructor(assetLoader, parameterManager = null, blockerManager = null, stateTransitionService = null) {
        this.assetLoader = assetLoader;
        this.parameterManager = parameterManager;
        this.blockerManager = blockerManager;
        this.stateTransitionService = stateTransitionService;
        
        // 按钮动画控制器已移至StartButtonWidget沙箱组件
        
        // 渲染层级配置（仿照Python版本的draw_order）
        this.renderLayers = {
            background: 0,
            tiles: 1,
            edges: 2,
            blockers: 3, // 路障在边之后渲染
            nodes: 4,
            sprites: 5,
            ui: 6
        };
        
        // 随机石头选择
        this.stoneTextures = [];
        for (let i = 1; i <= 9; i++) {
            this.stoneTextures.push(`stone${i}`);
        }
    }
    
    /**
     * 获取颜色配置 - 从参数管理器获取
     */
    getColor(colorName) {
        if (this.parameterManager) {
            return this.parameterManager.getColor(colorName);
        }
        
        // 回退到默认颜色
        const defaultColors = {
            edge_normal: '#4a5568',
            edge_blocked: '#f56565',
            edge_hole: '#ed8936',
            node_normal: '#48bb78',
            node_hole: '#f56565',
            path_preview: 'rgba(255, 182, 206, 0.8)',
            ui_background: 'rgba(0, 0, 0, 0.7)',
            ui_text: 'white'
        };
        
        return defaultColors[colorName] || '#000000';
    }
    
    /**
     * 获取尺寸配置 - 从参数管理器获取
     */
    getSize(sizeName) {
        if (this.parameterManager) {
            return this.parameterManager.getSize(sizeName);
        }
        
        // 回退到默认尺寸
        const defaultSizes = {
            node_radius: 8,
            hole_radius: 15,
            edge_width: 2,
            blocked_edge_width: 5,
            hole_edge_width: 3
        };
        
        return defaultSizes[sizeName] || 0;
    }
    
    /**
     * 渲染完整地图
     */
    renderMap(ctx, gameState, canvasWidth, canvasHeight, spriteManager = null) {
        // 清空画布
        this.clearCanvas(ctx, canvasWidth, canvasHeight);
        
        // 按层级渲染（仿照Python版本的draw_order）
        this.renderBackground(ctx, canvasWidth, canvasHeight);
        this.renderTiles(ctx, gameState);
        this.renderEdges(ctx, gameState);
        
        // 渲染路障（在边之后，节点之前）
        if (this.blockerManager) {
            this.blockerManager.renderAll(ctx, gameState);
        }
        
        this.renderNodes(ctx, gameState);
        
        // 渲染精灵（兔子等角色）
        if (spriteManager) {
            this.renderSprites(ctx, spriteManager);
        }
        
        // 按钮渲染逻辑已移至StartButtonWidget沙箱组件
        
        // UI信息渲染已移除，现在由外部HTML面板处理
    }
    
    /**
     * 渲染精灵（仿照Python版本的draw_game_objects）
     */
    renderSprites(ctx, spriteManager) {
        if (!spriteManager) {
            console.log('❌ 精灵管理器为空，跳过精灵渲染');
            return;
        }
        
        // console.log('🎭 开始渲染精灵...');
        // console.log('精灵管理器状态:', {
        //     totalSprites: spriteManager.sprites.size,
        //     groups: Array.from(spriteManager.spriteGroups.keys()),
        //     sprites: Array.from(spriteManager.sprites.keys())
        // });
        
        // 渲染所有精灵组，按优先级顺序
        const renderOrder = ['background', 'items', 'characters', 'effects', 'ui'];
        
        for (const group of renderOrder) {
            const groupSprites = spriteManager.spriteGroups.get(group);
            if (groupSprites && groupSprites.size > 0) {
                // console.log(`渲染 ${group} 组，包含 ${groupSprites.size} 个精灵:`, Array.from(groupSprites));
                spriteManager.renderGroup(ctx, group);
            }
        }
        
        // 如果没有分组，渲染所有精灵
        if (spriteManager.spriteGroups.size === 0) {
            // console.log('没有精灵分组，渲染所有精灵');
            spriteManager.renderAll(ctx);
        }
        
        // console.log('✅ 精灵渲染完成');
    }
    
    /**
     * 清空画布
     */
    clearCanvas(ctx, width, height) {
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, width, height);
    }
    
    /**
     * 渲染背景（仿照Python版本的draw_background）
     */
    renderBackground(ctx, canvasWidth, canvasHeight) {
        const background = this.assetLoader.getImage('background');
        if (background) {
            // 缩放背景以适应地图区域
            ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
        } else {
            // 如果背景未加载，使用渐变背景
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, '#2d5a27');
            gradient.addColorStop(1, '#1a3d1a');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
    }
    
    /**
     * 渲染地图瓷砖（装饰性石头等）
     */
    renderTiles(ctx, gameState) {
        if (!gameState.scaledPositions) return;
        
        // 装饰性石头已移除，只保留石头路
    }
    
    /**
     * 渲染边（路径）
     */
    renderEdges(ctx, gameState) {
        if (!gameState.edges || !gameState.scaledPositions) return;
        
        ctx.save();
        
        // 绘制边 - 始终绘制石子路，仿照Python版本
        for (const [edgeKey, edge] of gameState.edges) {
            const fromPos = gameState.scaledPositions.get(edge.from);
            const toPos = gameState.scaledPositions.get(edge.to);
            
            if (fromPos && toPos) {
                // 始终绘制石子路（不管是否有路障）
                this.renderStoneEdge(ctx, fromPos, toPos, edge.is_hole_edge || false, edgeKey);
            }
        }
        
        // 路障渲染已移至BlockerManager处理
        
        ctx.restore();
    }
    
    /**
     * 使用小石子渲染边 - 仿照Python版本的石子平铺方法
     */
    renderStoneEdge(ctx, fromPos, toPos, isHoleEdge = false, edgeKey = '') {
        const dx = toPos[0] - fromPos[0];
        const dy = toPos[1] - fromPos[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length < 1) return;
        
        // 计算单位向量
        const unitX = dx / length;
        const unitY = dy / length;
        
        // 石子密度：每3.75像素一个石子（仿照Python版本）
        const stoneSpacing = 3.75;
        const numStones = Math.max(5, Math.floor(length / stoneSpacing));
        
        // 使用边的键作为随机种子，确保每次渲染一致
        const edgeSeed = this.hashString(edgeKey) % 10000;
        const rng = this.createSeededRandom(edgeSeed);
        
        // 石子缩放 - 洞口边的石子稍大
        const baseScale = this.assetLoader.getScalingFactor('stones');
        const scale = isHoleEdge ? baseScale * 1.3 : baseScale;
        
        for (let i = 0; i < numStones; i++) {
            // 计算石子位置
            const t = i / Math.max(1, numStones - 1);
            const x = fromPos[0] + t * dx;
            const y = fromPos[1] + t * dy;
            
            // 添加随机偏移（垂直于边的方向）
            const perpX = -unitY;
            const perpY = unitX;
            const randomOffset = (rng() - 0.5) * 8; // ±4像素的随机偏移
            
            const stoneX = x + perpX * randomOffset;
            const stoneY = y + perpY * randomOffset;
            
            // 随机选择石头类型
            const stoneIndex = Math.floor(rng() * 9) + 1;
            const stoneName = `stone${stoneIndex}`;
            
            // 随机旋转角度
            const rotation = rng() * 360;
            
            // 绘制石头
            this.renderStone(ctx, stoneX, stoneY, stoneName, scale, rotation);
        }
    }
    
    /**
     * 渲染单个石头
     */
    renderStone(ctx, x, y, stoneName, scale = 1.0, rotation = 0) {
        const stoneImage = this.assetLoader.getImage(stoneName);
        if (!stoneImage) return;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation * Math.PI / 180);
        
        const width = stoneImage.width * scale;
        const height = stoneImage.height * scale;
        
        ctx.drawImage(stoneImage, -width/2, -height/2, width, height);
        ctx.restore();
    }
    
    /**
     * 字符串哈希函数（用于生成一致的随机数种子）
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    
    /**
     * 创建带种子的随机数生成器
     */
    createSeededRandom(seed) {
        let m_seed = seed % 2147483647;
        if (m_seed <= 0) m_seed += 2147483646;
        
        return function() {
            m_seed = m_seed * 16807 % 2147483647;
            return (m_seed - 1) / 2147483646;
        };
    }
    
    /**
     * 在边上渲染围栏
     */
    renderFenceOnEdge(ctx, fromPos, toPos) {
        const fenceImage = this.assetLoader.getImage('fence');
        if (!fenceImage) return;
        
        // 计算边的中点
        const midX = (fromPos[0] + toPos[0]) / 2;
        const midY = (fromPos[1] + toPos[1]) / 2;
        
        // 计算边的角度
        const dx = toPos[0] - fromPos[0];
        const dy = toPos[1] - fromPos[1];
        const angle = Math.atan2(dy, dx);
        
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        
        // 绘制围栏
        ctx.drawImage(
            fenceImage,
            -fenceImage.width / 2,
            -fenceImage.height / 2
        );
        
        ctx.restore();
    }
    
    /**
     * 渲染节点
     */
    renderNodes(ctx, gameState) {
        if (!gameState.nodes) return;
        
        for (const [nodeKey, node] of gameState.nodes) {
            const pos = node.position;
            
            if (node.is_hole) {
                // 渲染洞口
                this.renderHole(ctx, pos.x, pos.y);
            } else {
                // 渲染普通节点（树桩）
                this.renderStump(ctx, pos.x, pos.y);
            }
        }
    }
    
    /**
     * 渲染洞口
     */
    renderHole(ctx, x, y) {
        const holeImage = this.assetLoader.getImage('hole');
        if (holeImage) {
            // 绘制洞口图像
            ctx.drawImage(
                holeImage,
                x - holeImage.width / 2,
                y - holeImage.height / 2
            );
            
            // 移除红色圆圈背景，只保留洞口图像
        } else {
            // 回退到简单圆形
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.node_hole;
            ctx.fill();
            ctx.strokeStyle = '#c53030';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // 添加"EXIT"标签
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        
        ctx.strokeText('EXIT', x, y + 3);
        ctx.fillText('EXIT', x, y + 3);
        ctx.restore();
    }
    
    /**
     * 渲染树桩（普通节点）
     */
    renderStump(ctx, x, y) {
        const stumpImage = this.assetLoader.getImage('stump');
        if (stumpImage) {
            // 绘制树桩图像
            ctx.drawImage(
                stumpImage,
                x - stumpImage.width / 2,
                y - stumpImage.height / 2
            );
        } else {
            // 回退到简单圆形
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = this.colors.node_normal;
            ctx.fill();
            ctx.strokeStyle = '#2f855a';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
    
    // UI信息渲染方法已删除，现在由外部HTML面板处理状态显示
    
    /**
     * 渲染网格（调试用）
     */
    renderGrid(ctx, canvasWidth, canvasHeight, gridSize = 50) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // 垂直线
        for (let x = 0; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        
        // 水平线
        for (let y = 0; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * 渲染路径预览
     */
    renderPathPreview(ctx, path, scaledPositions) {
        if (!path || path.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = this.colors.path_preview;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 6]);
        
        ctx.beginPath();
        
        for (let i = 0; i < path.length; i++) {
            const nodeKey = path[i];
            const pos = scaledPositions.get(nodeKey);
            
            if (pos) {
                if (i === 0) {
                    ctx.moveTo(pos[0], pos[1]);
                } else {
                    ctx.lineTo(pos[0], pos[1]);
                }
            }
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        
        // 在路径上绘制方向箭头
        this.renderPathArrows(ctx, path, scaledPositions);
    }
    
    /**
     * 渲染路径箭头
     */
    renderPathArrows(ctx, path, scaledPositions) {
        if (!path || path.length < 2) return;
        
        ctx.save();
        ctx.fillStyle = this.colors.path_preview;
        
        for (let i = 0; i < path.length - 1; i++) {
            const currentPos = scaledPositions.get(path[i]);
            const nextPos = scaledPositions.get(path[i + 1]);
            
            if (currentPos && nextPos) {
                // 计算箭头位置（边的中点）
                const midX = (currentPos[0] + nextPos[0]) / 2;
                const midY = (currentPos[1] + nextPos[1]) / 2;
                
                // 计算箭头方向
                const dx = nextPos[0] - currentPos[0];
                const dy = nextPos[1] - currentPos[1];
                const angle = Math.atan2(dy, dx);
                
                // 绘制箭头
                this.drawArrow(ctx, midX, midY, angle, 8);
            }
        }
        
        ctx.restore();
    }
    
    /**
     * 绘制箭头
     */
    drawArrow(ctx, x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(-size, -size / 2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size, size / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // 按钮渲染方法已移至StartButtonWidget沙箱组件
    
    // 按钮状态检查方法已移至StartButtonWidget沙箱组件
    
    // 按钮动画控制方法已移至StartButtonWidget沙箱组件
}

// 默认导出
export default MapRenderer;
