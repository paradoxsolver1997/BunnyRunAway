/**
 * 兔子类 - 整合寻路、移动和渲染功能
 * 负责处理路障更新、寻路、移动、动画等所有兔子相关的逻辑和渲染
 */

import { globalPauseManager } from '../core/PauseManager.js';
import { gameEventBus } from '../core/GameEventBus.js';
import { GAME_EVENTS } from '../core/GameEvents.js';
import { PathPlanningModule } from './PathPlanningModule.js';
import { AnimationManager } from './AnimationManager.js';

export class Bunny {
    constructor(startNode, startPosition, gameState, animation = null) {
        // 初始化渲染相关属性（仿照AnimatedSprite）
        this.position = { x: startPosition[0], y: startPosition[1] };
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
            // console.log(`🎬 兔子动画初始化: 帧数${this.animation.frames.length}, 帧持续时间${this.animation.duration}ms`);
        } else {
            console.warn('⚠️ 兔子动画数据无效:', this.animation);
        }
        
        // 基本属性
        this.state = 'IDLE'; // IDLE, MOVING, ESCAPED, TRAPPED
        this.hasEscaped = false;
        this.gameOver = false;
        
        // 移动相关
        this.speed = 70; // pixels/second
        this.path = [];
        this.pathIndex = 0;
        this.currentNode = startNode;
        this.nextNode = null; // 兔子当前所在边的另一个节点

        // 帧率平滑相关
        this.maxDeltaTime = 1/30; // 限制最大deltaTime为30fps，防止跳跃
        
        // 游戏状态引用
        this.gameState = gameState;
        
        // 兔子的动态地图（独立于全局地图）
        this.bunnyAdjacencyList = new Map();
        this.bunnyScaledPositions = new Map();
        this.bunnyHoles = new Set();
        this.bunnyBlockers = new Set();
        
        // 初始化兔子的动态地图
        this.initializeBunnyMap();
        
        // 注意：不在INITIAL状态进行寻路，等游戏开始后再寻路
        // this.smartReroute(); // 移除，等游戏开始后再调用
        
        // 初始化事件系统（保守迁移：保持原有逻辑不变）
        this.setupPathCalculationEvents();
        
        // 初始化独立路径规划模块（保守迁移：保持原有逻辑不变）
        this.pathPlanningModule = new PathPlanningModule('bunny', gameState);
        this.pathPlanningModule.setCurrentNode(startNode);
        
        // 初始化独立动画管理器（保守迁移：保持原有逻辑不变）
        this.animationManager = new AnimationManager('bunny', this);
        if (animation) {
            this.animationManager.addAnimation('default', animation);
        }
        
    }
    
    /**
     * 开始游戏 - 在游戏从INITIAL转换到RUNNING时调用
     */
    startGame() {
        
        // 保守迁移：同时使用原有逻辑和独立模块（保持兼容性）
        this.smartReroute(); // 原有逻辑
        
        // 初始化独立路径规划模块
        if (this.pathPlanningModule) {
            this.pathPlanningModule.initializeMap();
            this.pathPlanningModule.setCurrentNode(this.currentNode);
            this.pathPlanningModule.smartReroute();
        }
        
        // 初始化独立动画管理器（保守迁移：保持原有逻辑不变）
        if (this.animationManager) {
            this.animationManager.playAnimation('default', true);
        }
    }
    
    /**
     * 同步更新nextNode - 根据当前路径索引更新下一个节点
     */
    updateNextNode() {
        if (this.path && this.pathIndex < this.path.length - 1) {
            this.nextNode = this.path[this.pathIndex + 1];
        } else {
            this.nextNode = null;
        }
    }
    
    // ===== 渲染相关方法（仿照AnimatedSprite） =====
    
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
        }
    }
    
    /**
     * 停止动画
     */
    stopAnimation() {
        if (this.animation) {
            this.animation.loop = false;
        }
    }
    
    /**
     * 更新动画（仿照旧程序AnimatedSprite的update方法）
     */
    updateAnimation(dt) {
        if (!this.animation || this.animation.frames.length <= 1) {
            return;
        }
        
        // 更新动画计时器（转换为毫秒，仿照Python版本：self.animation_timer += dt * 1000）
        this.animationTimer += dt * 1000;
        
        // 检查是否需要切换帧（仿照旧程序：if self.animation_timer >= self.animation["duration"]）
        if (this.animationTimer >= this.animation.duration) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.animation.frames.length;
            this.currentImage = this.animation.frames[this.currentFrame];
        }
    }
    
    /**
     * 渲染兔子
     */
    render(ctx) {
        if (!this.visible || !this.currentImage) {
            return;
        }
        
        ctx.save();
        
        // 应用变换
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        // 绘制图像（居中）
        const imageWidth = this.currentImage.width || 32;
        const imageHeight = this.currentImage.height || 32;
        ctx.drawImage(
            this.currentImage,
            -imageWidth / 2,
            -imageHeight / 2,
            imageWidth,
            imageHeight
        );
        
        ctx.restore();
    }
    
    /**
     * 初始化兔子的动态地图
     */
    initializeBunnyMap() {
        if (!this.gameState) {
            console.error('❌ gameState为空，无法初始化兔子地图');
            return;
        }
        
        // 复制全局地图到兔子的动态地图
        this.bunnyAdjacencyList = new Map(this.gameState.adjacencyList);
        this.bunnyScaledPositions = new Map(this.gameState.scaledPositions);
        this.bunnyHoles = new Set(this.gameState.holes);
        this.bunnyBlockers = new Set(this.gameState.blockers ? this.gameState.blockers.keys() : []);
        
        // console.log('🗺️ 兔子动态地图初始化完成');
        // console.log(`   - 节点数量: ${this.bunnyAdjacencyList.size}`);
        // console.log(`   - 洞口数量: ${this.bunnyHoles.size}`);
        // console.log(`   - 路障数量: ${this.bunnyBlockers.size}`);
        // console.log(`   - 起始节点: ${this.currentNode}`);
        // console.log(`   - 洞口列表:`, Array.from(this.bunnyHoles));
        // console.log(`   - gameState.adjacencyList:`, this.gameState.adjacencyList);
        // console.log(`   - gameState.scaledPositions:`, this.gameState.scaledPositions);
    }
    
    /**
     * 处理路障更新事件
     */
    handleBlockerUpdate(edgeKey, action, position) {
        // 更新兔子的路障信息
        this.updateBunnyBlocker(edgeKey, action === 'added');
        
        // 检查是否需要重新寻路
        const needRepath = this.checkNeedRepath(edgeKey);
        if (needRepath) {
            this.smartReroute();
        }
        
        // 保守迁移：同步独立路径规划模块（保持兼容性）
        if (this.pathPlanningModule) {
            this.pathPlanningModule.initializeMap();
            this.pathPlanningModule.setCurrentNode(this.currentNode);
            
            // 检查独立模块是否需要重新寻路
            const moduleNeedRepath = this.pathPlanningModule.checkNeedRepath(edgeKey);
            if (moduleNeedRepath) {
                console.log(`🎯 PathPlanningModule: 独立模块需要重新寻路`);
                this.pathPlanningModule.smartReroute();
            }
            
            // 检查独立模块的位置数据一致性
            if (!this.pathPlanningModule.checkPositionConsistency()) {
                console.warn(`⚠️ PathPlanningModule: ${this.pathPlanningModule.spriteId} 位置数据不一致，尝试重新同步`);
                this.pathPlanningModule.initializeMap();
            }
        }
    }
    
    /**
     * 更新兔子的路障信息
     */
    updateBunnyBlocker(edge, isBlocked) {
        
        // 解析边信息
        const match = edge.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
        if (!match) {
            console.warn(`🐰 无法解析边键格式: ${edge}`);
            return;
        }
        
        const from = `(${match[1]}, ${match[2]})`;
        const to = `(${match[3]}, ${match[4]})`;
        
        // 🔍 调试4：检查路障更新前后的位置数据
        const fromPosBefore = this.bunnyScaledPositions.get(from);
        const toPosBefore = this.bunnyScaledPositions.get(to);
        
        // console.log(`   边: ${from} <-> ${to}`);
        // console.log(`   更新前位置: ${from}=[${fromPosBefore[0].toFixed(2)}, ${fromPosBefore[1].toFixed(2)}], ${to}=[${toPosBefore[0].toFixed(2)}, ${toPosBefore[1].toFixed(2)}]`);
        
        if (isBlocked) {
            // 添加路障
            this.bunnyBlockers.add(edge);
            // 同时添加反向边
            const reverseEdge = this.getReverseEdge(edge);
            if (reverseEdge) {
                this.bunnyBlockers.add(reverseEdge);
            }
            
            // 从邻接表中移除被阻塞的边（实时更新可行地图）
            this.removeEdgeFromAdjacencyList(from, to);
            this.removeEdgeFromAdjacencyList(to, from);
            
        } else {
            // 移除路障
            this.bunnyBlockers.delete(edge);
            // 同时移除反向边
            const reverseEdge = this.getReverseEdge(edge);
            if (reverseEdge) {
                this.bunnyBlockers.delete(reverseEdge);
            }
            
            // 将边重新添加到邻接表（恢复可行地图）
            this.addEdgeToAdjacencyList(from, to);
            this.addEdgeToAdjacencyList(to, from);
            
        }
        
        // 🔍 调试5：验证路障更新后位置数据是否被意外修改
        const fromPosAfter = this.bunnyScaledPositions.get(from);
        const toPosAfter = this.bunnyScaledPositions.get(to);
        
        if (fromPosBefore && fromPosAfter) {
            const fromDiff = Math.abs(fromPosBefore[0] - fromPosAfter[0]) + Math.abs(fromPosBefore[1] - fromPosAfter[1]);
            if (fromDiff > 0.01) {
                console.error(`❌ 路障更新后位置数据被意外修改！节点: ${from}`);
                console.error(`   更新前: [${fromPosBefore[0].toFixed(2)}, ${fromPosBefore[1].toFixed(2)}]`);
                console.error(`   更新后: [${fromPosAfter[0].toFixed(2)}, ${fromPosAfter[1].toFixed(2)}]`);
            }
        }
        
        if (toPosBefore && toPosAfter) {
            const toDiff = Math.abs(toPosBefore[0] - toPosAfter[0]) + Math.abs(toPosBefore[1] - toPosAfter[1]);
            if (toDiff > 0.01) {
                console.error(`❌ 路障更新后位置数据被意外修改！节点: ${to}`);
                console.error(`   更新前: [${toPosBefore[0].toFixed(2)}, ${toPosBefore[1].toFixed(2)}]`);
                console.error(`   更新后: [${toPosAfter[0].toFixed(2)}, ${toPosAfter[1].toFixed(2)}]`);
            }
        }
        
        
    }
    
    
    /**
     * 从邻接表中移除边
     */
    removeEdgeFromAdjacencyList(from, to) {
        if (this.bunnyAdjacencyList.has(from)) {
            const neighbors = this.bunnyAdjacencyList.get(from);
            const index = neighbors.indexOf(to);
            if (index > -1) {
                neighbors.splice(index, 1);
            }
        }
    }
    
    /**
     * 向邻接表中添加边
     */
    addEdgeToAdjacencyList(from, to) {
        if (!this.bunnyAdjacencyList.has(from)) {
            this.bunnyAdjacencyList.set(from, []);
        }
        const neighbors = this.bunnyAdjacencyList.get(from);
        if (!neighbors.includes(to)) {
            neighbors.push(to);
        }
    }
    
    /**
     * 获取反向边
     */
    getReverseEdge(edge) {
        // 解析边格式：((0, 2), (0, 3)) -> (0, 3) 到 (0, 2)
        const match = edge.match(/\(\((-?\d+),\s*(-?\d+)\)\),\s*\(\((-?\d+),\s*(-?\d+)\)\)/);
        if (match) {
            const from = `(${match[1]}, ${match[2]})`;
            const to = `(${match[3]}, ${match[4]})`;
            // 统一使用2层括号格式
            return `((${match[3]}, ${match[4]}), (${match[1]}, ${match[2]}))`;
        }
        return null;
    }
    
    /**
     * 检查是否需要重新寻路
     */
    checkNeedRepath(edgeNormal) {
        if (!this.path || this.path.length === 0) {
            return false;
        }
        
        // 解析路障边格式
        let blockerFrom, blockerTo;
        try {
            const match = edgeNormal.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
            if (match) {
                blockerFrom = `(${match[1]}, ${match[2]})`;
                blockerTo = `(${match[3]}, ${match[4]})`;
            } else {
                blockerFrom = edgeNormal;
                blockerTo = edgeNormal;
            }
        } catch (e) {
            return false;
        }
        
        // 检查是否阻塞了兔子当前正在走的边
        if (this.pathIndex < this.path.length - 1) {
            
            if ((this.currentNode === blockerFrom && this.nextNode === blockerTo) ||
                (this.currentNode === blockerTo && this.nextNode === blockerFrom)) {
                return true;
            }
        }
        
        // 检查是否阻塞了兔子路径上的任何边
        for (let i = 0; i < this.path.length - 1; i++) {
            const pathFrom = this.path[i];
            const pathTo = this.path[i + 1];
            
            if ((pathFrom === blockerFrom && pathTo === blockerTo) ||
                (pathFrom === blockerTo && pathTo === blockerFrom)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 智能重新寻路
     */
    smartReroute() {
        // console.log('🐰 兔子开始智能重新寻路');
        // console.log(`   - 起始节点: ${this.currentNode}`);
        // console.log(`   - 洞口数量: ${this.bunnyHoles.size}`);
        // console.log(`   - 洞口列表:`, Array.from(this.bunnyHoles));
        // console.log(`   - 邻接表大小: ${this.bunnyAdjacencyList.size}`);
        // console.log(`   - 路障数量: ${this.bunnyBlockers.size}`);
        
        // 如果游戏结束，不需要重新寻路
        if (this.gameOver) {
            // console.log('🐰 游戏已结束，跳过寻路');
            return true;
        }
        
        // 如果兔子已经在洞口，设置逃脱标志并返回成功
        if (this.bunnyHoles.has(this.currentNode)) {
            this.hasEscaped = true;
            this.state = 'ESCAPED';
            // console.log('🐰 兔子已经逃脱！');
            return true;
        }
        
        // 计算到最近洞口的新路径
        // console.log('🐰 开始A*寻路...');
        // console.log(`🐰 寻路参数检查:`);
        // console.log(`   - 起始节点: ${this.currentNode}`);
        // console.log(`   - 洞口数量: ${this.bunnyHoles.size}`);
        // console.log(`   - 邻接表大小: ${this.bunnyAdjacencyList.size}`);
        // console.log(`   - 路障数量: ${this.bunnyBlockers.size}`);
        // console.log(`   - 起始节点的邻居:`, this.bunnyAdjacencyList.get(this.currentNode) || []);
        
        const newPath = this.astar(this.currentNode, this.bunnyHoles, this.bunnyAdjacencyList, this.bunnyBlockers);
        // console.log(`🔍 smartReroute: A*寻路结果=`, newPath);
        
        // 🔍 详细验证路径的相邻性
        if (newPath && newPath.length > 1) {
            // console.log(`🔍 验证路径相邻性:`);
            for (let i = 0; i < newPath.length - 1; i++) {
                const from = newPath[i];
                const to = newPath[i + 1];
                const neighbors = this.bunnyAdjacencyList.get(from) || [];
                const isAdjacent = neighbors.includes(to);
                // console.log(`   步骤${i}: ${from} -> ${to} = ${isAdjacent ? '✅相邻' : '❌不相邻'}`);
                if (!isAdjacent) {
                    console.error(`   ❌ 路径验证失败！${from} 的邻居:`, neighbors);
                }
            }
        }
        
        if (!newPath || newPath.length === 0) {
            // 无法找到路径，兔子被困住了
            this.path = null;
            this.pathIndex = 0;
            this.nextNode = null; // 重置nextNode
            this.state = 'TRAPPED';
            // console.log('🐰 兔子被困住了！无法找到路径');
            
            // 保守迁移：发布路径计算失败事件（保持原有逻辑不变）
            const errorData = {
                error: 'No path found to any hole'
            };
            this.emitPathCalculationFailed(errorData);
            
            return false;
        }
        
        // 如果路径长度为1且起点是洞口，兔子已经逃脱
        if (newPath.length === 1 && this.bunnyHoles.has(newPath[0])) {
            this.path = newPath;
            this.pathIndex = 0;
            this.nextNode = null; // 路径长度为1，没有下一个节点
            this.hasEscaped = true;
            this.state = 'ESCAPED';
            // console.log('🐰 兔子已经逃脱！');
            return true;
        }
        
        // 设置新路径
        // console.log(`🔍 设置新路径前检查: newPath=`, newPath);
        // console.log(`🔍 路径有效性检查: 长度=${newPath.length}, 第一个元素=${newPath[0]}, 类型=${typeof newPath[0]}`);
        
        this.path = newPath;
        this.pathIndex = 0;
        this.state = 'IDLE';
        
        // console.log(`🔍 路径设置完成: path=`, this.path);
        // console.log(`🔍 路径索引重置为: ${this.pathIndex}`);
        
        // 🔄 掉头逻辑：检查是否需要掉头
        if (this.path.length > 1) {
            // 如果新路径的第一个节点不是当前的下一个节点，需要掉头
            if (this.path[0] === this.currentNode && this.path[1] !== this.nextNode) {
                // console.log(`🔄 检测到需要掉头！`);
                // console.log(`   当前节点: ${this.currentNode}`);
                // console.log(`   当前目标: ${this.nextNode}`);
                // console.log(`   新路径: [${this.path.join(' -> ')}]`);
                
                // 检查nextNode是否为null，避免插入null值
                if (this.nextNode !== null) {
                    // 执行掉头：把当前目标插入路径开头
                    this.path.unshift(this.nextNode);
                    // console.log(`   掉头后路径: [${this.path.join(' -> ')}]`);
                } else {
                    // console.log(`   ⚠️ nextNode为null，跳过掉头逻辑`);
                }
                
                this.currentNode = this.path[this.pathIndex];
                this.updateNextNode(); // 同步更新nextNode
                
                // console.log(`   掉头后节点: ${this.currentNode}`);
                // console.log(`   掉头后索引: ${this.pathIndex}`);
            }
        }
        
        // 🔍 调试6：验证路径中每个节点的位置数据
        // console.log(`🔍 验证路径节点位置数据:`);
        for (let i = 0; i < newPath.length; i++) {
            const node = newPath[i];
            const position = this.bunnyScaledPositions.get(node);
            const gameStatePosition = this.gameState.scaledPositions.get(node);
            
            if (position && gameStatePosition) {
                const diff = Math.abs(position[0] - gameStatePosition[0]) + Math.abs(position[1] - gameStatePosition[1]);
                // console.log(`   节点${i}: ${node} = [${position[0].toFixed(2)}, ${position[1].toFixed(2)}] (差异: ${diff.toFixed(2)}px)`);
                
                if (diff > 0.01) {
                    console.error(`   ❌ 位置数据不一致！`);
                }
            } else {
                console.error(`   ❌ 缺少位置数据: ${node}`);
            }
        }
        
        // 保守迁移：发布路径计算完成事件（保持原有逻辑不变）
        const pathData = {
            path: this.path,
            success: true,
            calculationTime: 0 // 暂时不计算时间，保持简单
        };
        this.emitPathCalculationCompleted(pathData);
        
        return true;
    }
    
    /**
     * A*寻路算法
     */
    astar(start, goals, adjacencyList, blockers) {
        if (!start || !goals || goals.size === 0) return null;
        
        // console.log(`🔍 A*寻路开始: 起始节点=${start}, 目标数量=${goals.size}`);
        
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(start, 0);
        fScore.set(start, this.heuristic(start, goals));
        
        // console.log(`🔍 A*初始化: 起始节点=${start}, gScore=${gScore.get(start)}, fScore=${fScore.get(start)}`);
        
        while (openSet.length > 0) {
            // 找到fScore最小的节点
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(openSet[i]) < fScore.get(current)) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            openSet.splice(currentIndex, 1);
            
            // 检查是否到达目标
            if (goals.has(current)) {
                // console.log(`🔍 A*找到目标: ${current}, cameFrom大小=${cameFrom.size}`);
                // console.log(`🔍 cameFrom内容:`, Array.from(cameFrom.entries()));
                const path = this.reconstructPath(cameFrom, current);
                // console.log(`🔍 A*重构路径:`, path);
                return path;
            }
            
            // 检查邻居节点
            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                // 检查边是否被阻塞
                if (this.isEdgeBlocked(current, neighbor, blockers)) {
                    // console.log(`🚫 A*跳过被阻塞的边: ${current} -> ${neighbor}`);
                    continue;
                }
                
                const tentativeGScore = gScore.get(current) + 1;
                
                if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, goals));
                    
                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * 启发式函数（曼哈顿距离）
     */
    heuristic(node, goals) {
        let minDistance = Infinity;
        for (const goal of goals) {
            const distance = this.manhattanDistance(node, goal);
            minDistance = Math.min(minDistance, distance);
        }
        return minDistance;
    }
    
    /**
     * 曼哈顿距离
     */
    manhattanDistance(node1, node2) {
        const match1 = node1.match(/\((-?\d+),\s*(-?\d+)\)/);
        const match2 = node2.match(/\((-?\d+),\s*(-?\d+)\)/);
        
        if (match1 && match2) {
            const x1 = parseInt(match1[1]);
            const y1 = parseInt(match1[2]);
            const x2 = parseInt(match2[1]);
            const y2 = parseInt(match2[2]);
            return Math.abs(x1 - x2) + Math.abs(y1 - y2);
        }
        
        return 0;
    }
    
    /**
     * 重构路径
     */
    reconstructPath(cameFrom, current) {
        // console.log(`🔍 reconstructPath开始: 目标节点=${current}, cameFrom大小=${cameFrom.size}`);
        // console.log(`🔍 cameFrom内容:`, Array.from(cameFrom.entries()));
        
        const path = [current];
        let step = 0;
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
            step++;
            // console.log(`🔍 重构步骤${step}: 添加节点=${current}, 当前路径=`, path);
            
            // 防止无限循环
            if (step > 100) {
                console.error(`❌ reconstructPath无限循环检测！步骤数=${step}`);
                break;
            }
        }
        
        // console.log(`🔍 reconstructPath完成: 最终路径=`, path);
        return path;
    }
    
    /**
     * 检查边是否被阻塞
     */
    isEdgeBlocked(from, to, blockers) {
        const edgeKey1 = `((${from}), (${to}))`;
        const edgeKey2 = `((${to}), (${from}))`;
        
        const isBlocked = blockers.has(edgeKey1) || blockers.has(edgeKey2);
        
        // 调试日志
        if (isBlocked) {
            // console.log(`🚫 边被阻塞: ${from} -> ${to}`);
            // console.log(`   检查的边键1: ${edgeKey1}`);
            // console.log(`   检查的边键2: ${edgeKey2}`);
            // console.log(`   路障集合:`, Array.from(blockers));
        }
        
        return isBlocked;
    }
    
    /**
     * 更新兔子状态（逻辑+渲染）
     */
    update(dt) {
        // 先更新动画渲染
        this.updateAnimation(dt);
        
        
        // 检查全局暂停状态
        if (globalPauseManager.isGamePaused()) {
            return { status: 0, reachedNode: null };
        }
        
        // 检查游戏结束条件
        if (this.checkGameOver()) {
            return { status: 0, reachedNode: null };
        }
        
        // 如果已经逃脱或被困，不移动
        if (this.hasEscaped || this.state === 'TRAPPED') {
            return { status: 0, reachedNode: null };
        }
        
        // 如果没有路径，不进行寻路（等游戏开始后再寻路）
        if (!this.path || this.path.length === 0) {
            // 在INITIAL状态不进行寻路，等游戏开始后再寻路
            return { status: 0, reachedNode: null };
        }
        
        // 连续移动逻辑
        if (this.path && this.pathIndex < this.path.length) {
            if (this.pathIndex < this.path.length - 1) {
                const nextPosition = this.bunnyScaledPositions.get(this.nextNode);
                
                if (nextPosition) {
                    const targetX = nextPosition[0];
                    const targetY = nextPosition[1];
                    
                    // 计算到目标的距离和方向
                    const dx = targetX - this.position.x;
                    const dy = targetY - this.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 限制deltaTime防止帧率不稳定导致的跳跃
                    const clampedDt = Math.min(dt, this.maxDeltaTime);
                    const step = this.speed * clampedDt;
                    
                    // 运动控制
                    if (distance <= step) {
                        this.position.x = targetX;
                        this.position.y = targetY;
                    } else {
                        const moveX = (dx / distance) * step;
                        const moveY = (dy / distance) * step;
                        this.position.x += moveX;
                        this.position.y += moveY;
                    }
                    
                    // 节点到达检测
                    const arrivalThreshold = step / 2;
                    const actualDistance = Math.sqrt(
                        Math.pow(this.position.x - targetX, 2) + 
                        Math.pow(this.position.y - targetY, 2)
                    );
                    
                    if (actualDistance <= arrivalThreshold) {
                        if (this.pathIndex < this.path.length - 1) {
                            // 验证节点相邻性
                            const currentNeighbors = this.bunnyAdjacencyList.get(this.currentNode) || [];
                            const isAdjacent = currentNeighbors.includes(this.nextNode);
                            if (!isAdjacent) {
                                console.error(`❌ 检测到节点跳跃！${this.currentNode} -> ${this.nextNode} 不相邻！`);
                            }
                            
                            // 更新路径索引和当前节点
                            this.pathIndex++;
                            this.currentNode = this.path[this.pathIndex];
                            this.updateNextNode();
                            
                            // 检查是否到达洞口
                            if (this.bunnyHoles.has(this.currentNode)) {
                                this.hasEscaped = true;
                                this.state = 'ESCAPED';
                                return { status: 2, reachedNode: this.currentNode };
                            }
                            
                            return { status: 2, reachedNode: this.currentNode };
                        }
                    }
                    
                    return { status: 1, reachedNode: null }; // 移动中
                }
            } else {
                // 已经到达路径的最后一个节点，检查是否到达洞口
                const currentNode = this.currentNode;
                
                if (this.bunnyHoles.has(currentNode)) {
                    this.hasEscaped = true;
                    this.state = 'ESCAPED';
                    return { status: 2, reachedNode: currentNode };
                }
            }
        }
        
        return { status: 0, reachedNode: null }; // 静止
    }
    
    /**
     * 检查游戏结束条件
     */
    checkGameOver() {
        // 检查是否逃脱
        if (this.bunnyHoles.has(this.currentNode)) {
            this.hasEscaped = true;
            this.state = 'ESCAPED';
            return true;
        }
        
        // 检查是否被困
        if (this.state === 'TRAPPED') {
            return true;
        }
        
        return false;
    }
    
    
    /**
     * 重置兔子状态
     */
    reset(startNode, startPosition) {
        
        this.position = { x: startPosition[0], y: startPosition[1] };
        this.state = 'IDLE';
        this.hasEscaped = false;
        this.gameOver = false;
        this.path = [];
        this.pathIndex = 0;
        this.currentNode = startNode;
        this.nextNode = null; // 重置nextNode
        
        // 重新初始化动态地图
        this.initializeBunnyMap();
        
        // 保守迁移：重置独立路径规划模块（保持兼容性）
        if (this.pathPlanningModule) {
            this.pathPlanningModule.reset();
            this.pathPlanningModule.setCurrentNode(startNode);
        }
        
        // 保守迁移：重置独立动画管理器（保持兼容性）
        if (this.animationManager) {
            this.animationManager.reset();
        }
        
        // console.log('🐰 兔子状态已重置');
    }
    
    /**
     * 设置路径计算事件系统（保守迁移：保持原有逻辑不变）
     * 为多精灵框架做准备，但暂时不改变现有行为
     */
    setupPathCalculationEvents() {
        // 监听路径计算请求事件（为未来多精灵协调做准备）
        gameEventBus.on(GAME_EVENTS.PATH_CALCULATION_REQUESTED, (data) => {
            console.log('🎯 Bunny: 收到路径计算请求事件', data);
            // 保守迁移：暂时只记录，不改变现有逻辑
            this.lastPathCalculationRequest = data;
        });
        
        // 监听路径更新需求事件（为未来智能路径更新做准备）
        gameEventBus.on(GAME_EVENTS.PATH_NEEDS_UPDATE, (data) => {
            console.log('🎯 Bunny: 收到路径更新需求事件', data);
            // 保守迁移：暂时只记录，不改变现有逻辑
            this.lastPathUpdateRequest = data;
        });
        
        console.log('✅ Bunny: 路径计算事件系统设置完成（保守迁移模式）');
    }
    
    /**
     * 发布路径计算完成事件（保守迁移：保持原有逻辑不变）
     * 为未来事件驱动路径计算做准备
     */
    emitPathCalculationCompleted(pathData) {
        const eventData = {
            bunnyId: 'bunny', // 为多精灵框架预留
            path: pathData.path,
            pathLength: pathData.path ? pathData.path.length : 0,
            calculationTime: pathData.calculationTime || 0,
            success: pathData.success || false,
            timestamp: Date.now()
        };
        
        // 🆕 修复：移除无效事件发布，没有监听器
        // gameEventBus.emit(GAME_EVENTS.PATH_CALCULATION_COMPLETED, eventData);
        // console.log('🎯 Bunny: 发布路径计算完成事件', eventData);
    }
    
    /**
     * 发布路径计算失败事件（保守迁移：保持原有逻辑不变）
     * 为未来错误处理做准备
     */
    emitPathCalculationFailed(errorData) {
        const eventData = {
            bunnyId: 'bunny', // 为多精灵框架预留
            error: errorData.error || 'Unknown error',
            timestamp: Date.now()
        };
        
        // 🆕 修复：移除无效事件发布，没有监听器
        // gameEventBus.emit(GAME_EVENTS.PATH_CALCULATION_FAILED, eventData);
        console.log('🎯 Bunny: 路径计算失败（事件已禁用）', eventData);
    }
}
