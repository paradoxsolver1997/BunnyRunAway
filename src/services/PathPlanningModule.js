/**
 * 独立路径规划模块
 * 为每个精灵提供独立的路径规划功能
 * 保守迁移：保持与Bunny类的完全兼容性
 */

import { gameEventBus } from '../core/GameEventBus.js';
import { GAME_EVENTS } from '../core/GameEvents.js';

export class PathPlanningModule {
    constructor(spriteId, gameState) {
        // 精灵标识符（为多精灵框架预留）
        this.spriteId = spriteId;
        this.gameState = gameState;
        
        // 独立的地图数据（每个精灵拥有自己的地图副本）
        this.adjacencyList = new Map();
        this.scaledPositions = new Map();
        this.holes = new Set();
        this.blockers = new Set();
        
        // 路径规划状态
        this.currentNode = null;
        this.path = [];
        this.pathIndex = 0;
        this.nextNode = null;
        
        // 路径规划配置
        this.maxPathLength = 1000; // 防止无限循环
        this.pathUpdateThreshold = 0.01; // 路径更新阈值
        
        // 事件系统（为多精灵协调预留）
        this.setupEventListeners();
        
        // console.log(`✅ PathPlanningModule: ${spriteId} 初始化完成`);
    }
    
    /**
     * 设置事件监听器（为多精灵协调预留）
     */
    setupEventListeners() {
        // 监听路径计算请求事件
        gameEventBus.on(GAME_EVENTS.PATH_CALCULATION_REQUESTED, (data) => {
            if (data.spriteId === this.spriteId) {
                // console.log(`🎯 PathPlanningModule: ${this.spriteId} 收到路径计算请求`, data);
                this.handlePathCalculationRequest(data);
            }
        });
        
        // 监听路径更新需求事件
        gameEventBus.on(GAME_EVENTS.PATH_NEEDS_UPDATE, (data) => {
            if (data.spriteId === this.spriteId) {
                // console.log(`🎯 PathPlanningModule: ${this.spriteId} 收到路径更新需求`, data);
                this.handlePathUpdateRequest(data);
            }
        });
        
        // console.log(`✅ PathPlanningModule: ${this.spriteId} 事件监听器设置完成`);
    }
    
    /**
     * 处理路径计算请求（为多精灵协调预留）
     */
    handlePathCalculationRequest(data) {
        // 保守迁移：暂时只记录，不改变现有逻辑
        this.lastPathCalculationRequest = data;
        // console.log(`🎯 PathPlanningModule: ${this.spriteId} 处理路径计算请求`, data);
    }
    
    /**
     * 处理路径更新请求（为多精灵协调预留）
     */
    handlePathUpdateRequest(data) {
        // 保守迁移：暂时只记录，不改变现有逻辑
        this.lastPathUpdateRequest = data;
        // console.log(`🎯 PathPlanningModule: ${this.spriteId} 处理路径更新请求`, data);
    }
    
    /**
     * 初始化独立地图（从全局地图复制）
     */
    initializeMap() {
        if (!this.gameState) {
            console.error(`❌ PathPlanningModule: ${this.spriteId} gameState为空，无法初始化地图`);
            return;
        }
        
        // 复制全局地图到独立地图
        this.adjacencyList = new Map(this.gameState.adjacencyList);
        this.scaledPositions = new Map(this.gameState.scaledPositions);
        this.holes = new Set(this.gameState.holes);
        this.blockers = new Set(this.gameState.blockers ? this.gameState.blockers.keys() : []);
        
        // console.log(`🗺️ PathPlanningModule: ${this.spriteId} 独立地图初始化完成`);
        // console.log(`   - 节点数量: ${this.adjacencyList.size}`);
        // console.log(`   - 洞口数量: ${this.holes.size}`);
        // console.log(`   - 路障数量: ${this.blockers.size}`);
    }
    
    /**
     * 设置当前节点
     */
    setCurrentNode(node) {
        this.currentNode = node;
        // console.log(`🎯 PathPlanningModule: ${this.spriteId} 设置当前节点: ${node}`);
    }
    
    /**
     * 智能重新寻路（A*算法）
     */
    smartReroute() {
        // console.log(`🐰 PathPlanningModule: ${this.spriteId} 开始智能重新寻路`);
        // console.log(`   - 起始节点: ${this.currentNode}`);
        // console.log(`   - 洞口数量: ${this.holes.size}`);
        // console.log(`   - 路障数量: ${this.blockers.size}`);
        
        // 如果已经在洞口，设置逃脱状态
        if (this.holes.has(this.currentNode)) {
            this.path = [this.currentNode];
            this.pathIndex = 0;
            this.nextNode = null;
            // console.log(`🐰 PathPlanningModule: ${this.spriteId} 已经在洞口，逃脱成功`);
            return true;
        }
        
        // 执行A*寻路
        const newPath = this.astar(this.currentNode, this.holes, this.adjacencyList, this.blockers);
        
        if (!newPath || newPath.length === 0) {
            // 无法找到路径
            this.path = null;
            this.pathIndex = 0;
            this.nextNode = null;
            // console.log(`🐰 PathPlanningModule: ${this.spriteId} 无法找到路径，被困住了`);
            
            // 发布路径计算失败事件
            this.emitPathCalculationFailed({
                error: 'No path found to any hole',
                spriteId: this.spriteId
            });
            
            return false;
        }
        
        // 验证路径节点位置数据一致性
        if (!this.validatePathPositions(newPath)) {
            console.error(`❌ PathPlanningModule: ${this.spriteId} 路径位置数据验证失败`);
            this.path = null;
            this.pathIndex = 0;
            this.nextNode = null;
            
            // 发布路径计算失败事件
            this.emitPathCalculationFailed({
                error: 'Path position data validation failed',
                spriteId: this.spriteId
            });
            
            return false;
        }
        
        // 设置新路径
        this.path = newPath;
        this.pathIndex = 0;
        this.nextNode = this.path.length > 1 ? this.path[1] : null;
        
        // console.log(`🐰 PathPlanningModule: ${this.spriteId} 路径计算完成，路径长度: ${this.path.length}`);
        
        // 发布路径计算完成事件
        this.emitPathCalculationCompleted({
            path: this.path,
            success: true,
            calculationTime: 0, // 暂时不计算时间
            spriteId: this.spriteId
        });
        
        return true;
    }
    
    /**
     * A*寻路算法
     */
    astar(start, goals, adjacencyList, blockers) {
        if (!start || !goals || goals.size === 0) return null;
        
        // console.log(`🔍 PathPlanningModule: ${this.spriteId} A*寻路开始`);
        // console.log(`   - 起始节点: ${start}`);
        // console.log(`   - 目标数量: ${goals.size}`);
        
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(start, 0);
        fScore.set(start, this.heuristic(start, goals));
        
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
                const path = this.reconstructPath(cameFrom, current);
                // console.log(`🔍 PathPlanningModule: ${this.spriteId} A*找到目标，路径长度: ${path.length}`);
                return path;
            }
            
            // 检查邻居节点
            const neighbors = adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                // 检查边是否被阻塞
                if (this.isEdgeBlocked(current, neighbor, blockers)) {
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
        
        // console.log(`🔍 PathPlanningModule: ${this.spriteId} A*未找到路径`);
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
     * 曼哈顿距离计算
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
        const path = [current];
        let step = 0;
        
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
            step++;
            
            // 防止无限循环
            if (step > this.maxPathLength) {
                console.error(`❌ PathPlanningModule: ${this.spriteId} reconstructPath无限循环检测！步骤数=${step}`);
                break;
            }
        }
        
        return path;
    }
    
    /**
     * 检查边是否被阻塞
     */
    isEdgeBlocked(from, to, blockers) {
        for (const blocker of blockers) {
            if (this.isEdgeBlockedByBlocker(from, to, blocker)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 检查边是否被特定路障阻塞
     */
    isEdgeBlockedByBlocker(from, to, blocker) {
        // 解析路障边格式
        const match = blocker.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
        if (match) {
            const blockerFrom = `(${match[1]}, ${match[2]})`;
            const blockerTo = `(${match[3]}, ${match[4]})`;
            
            return (from === blockerFrom && to === blockerTo) || 
                   (from === blockerTo && to === blockerFrom);
        }
        return false;
    }
    
    /**
     * 检查是否需要重新寻路
     */
    checkNeedRepath(edgeKey) {
        if (!this.path || this.path.length === 0) {
            return false;
        }
        
        // 检查是否阻塞了当前正在走的边
        if (this.pathIndex < this.path.length - 1) {
            const from = this.path[this.pathIndex];
            const to = this.path[this.pathIndex + 1];
            
            if (this.isEdgeBlockedByBlocker(from, to, edgeKey)) {
                return true;
            }
        }
        
        // 检查是否阻塞了路径上的任何边
        for (let i = 0; i < this.path.length - 1; i++) {
            const from = this.path[i];
            const to = this.path[i + 1];
            
            if (this.isEdgeBlockedByBlocker(from, to, edgeKey)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 更新路径索引
     */
    updatePathIndex() {
        if (this.path && this.pathIndex < this.path.length - 1) {
            this.pathIndex++;
            this.nextNode = this.pathIndex < this.path.length - 1 ? this.path[this.pathIndex + 1] : null;
        }
    }
    
    /**
     * 获取当前路径
     */
    getCurrentPath() {
        return this.path;
    }
    
    /**
     * 获取下一个节点
     */
    getNextNode() {
        return this.nextNode;
    }
    
    /**
     * 获取当前节点
     */
    getCurrentNode() {
        return this.currentNode;
    }
    
    /**
     * 发布路径计算完成事件
     */
    emitPathCalculationCompleted(pathData) {
        const eventData = {
            ...pathData,
            spriteId: this.spriteId,
            timestamp: Date.now()
        };
        
        // 🆕 修复：移除无效事件发布，没有监听器
        // gameEventBus.emit(GAME_EVENTS.PATH_CALCULATION_COMPLETED, eventData);
        // console.log(`🎯 PathPlanningModule: ${this.spriteId} 发布路径计算完成事件`, eventData);
    }
    
    /**
     * 发布路径计算失败事件
     */
    emitPathCalculationFailed(errorData) {
        const eventData = {
            ...errorData,
            spriteId: this.spriteId,
            timestamp: Date.now()
        };
        
        // 🆕 修复：移除无效事件发布，没有监听器
        // gameEventBus.emit(GAME_EVENTS.PATH_CALCULATION_FAILED, eventData);
        console.log(`🎯 PathPlanningModule: ${this.spriteId} 路径计算失败（事件已禁用）`, eventData);
    }
    
    /**
     * 检查位置数据一致性（从Bunny类迁移过来）
     */
    checkPositionConsistency() {
        if (!this.path || this.path.length === 0) {
            return true;
        }
        
        const currentNode = this.currentNode;
        const currentPosition = this.scaledPositions.get(currentNode);
        const gameStatePosition = this.gameState.scaledPositions.get(currentNode);
        
        if (currentPosition && gameStatePosition) {
            const posDiff = Math.abs(currentPosition[0] - gameStatePosition[0]) + 
                           Math.abs(currentPosition[1] - gameStatePosition[1]);
            
            if (posDiff > 0.01) {
                console.error(`❌ PathPlanningModule: ${this.spriteId} 位置数据不一致！节点: ${currentNode}`);
                console.error(`   模块位置: [${currentPosition[0].toFixed(2)}, ${currentPosition[1].toFixed(2)}]`);
                console.error(`   游戏状态位置: [${gameStatePosition[0].toFixed(2)}, ${gameStatePosition[1].toFixed(2)}]`);
                console.error(`   差异: ${posDiff.toFixed(2)}px`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 验证路径节点位置数据一致性
     */
    validatePathPositions(path) {
        if (!path || path.length === 0) {
            return true;
        }
        
        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            const position = this.scaledPositions.get(node);
            const gameStatePosition = this.gameState.scaledPositions.get(node);
            
            if (position && gameStatePosition) {
                const diff = Math.abs(position[0] - gameStatePosition[0]) + Math.abs(position[1] - gameStatePosition[1]);
                
                if (diff > 0.01) {
                    console.error(`❌ PathPlanningModule: ${this.spriteId} 路径节点${i}位置数据不一致！`);
                    console.error(`   节点: ${node}`);
                    console.error(`   模块位置: [${position[0].toFixed(2)}, ${position[1].toFixed(2)}]`);
                    console.error(`   游戏状态位置: [${gameStatePosition[0].toFixed(2)}, ${gameStatePosition[1].toFixed(2)}]`);
                    console.error(`   差异: ${diff.toFixed(2)}px`);
                    return false;
                }
            } else {
                console.error(`❌ PathPlanningModule: ${this.spriteId} 缺少位置数据: ${node}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 重置路径规划状态
     */
    reset() {
        this.path = [];
        this.pathIndex = 0;
        this.nextNode = null;
        // console.log(`🔄 PathPlanningModule: ${this.spriteId} 路径规划状态已重置`);
    }
}
