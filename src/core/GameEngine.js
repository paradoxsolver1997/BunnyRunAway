/**
 * 游戏引擎 - 核心游戏逻辑
 * 整合了地图管理、游戏状态、兔子控制等功能
 * 重构为事件驱动架构
 */

import { gameEventBus } from './GameEventBus.js';
import { GAME_EVENTS, EVENT_PRIORITIES } from './GameEvents.js';

export class GameEngine {
    constructor(mapManager = null, parameterManager = null) {
        // 如果传入了 mapManager，保持兼容性；否则创建新的 MapService 实例
        if (mapManager) {
            this.mapManager = mapManager;
            this.mapService = mapManager; // 保持向后兼容
        } else {
            // 创建新的 MapService 实例
            this.mapService = null; // 将在 initializeMapService 中初始化
        }
        this.parameterManager = parameterManager;
        this.gameController = null; // 将在初始化时设置
        this.nodes = new Map();
        this.edges = new Map();
        // 路障管理已移至BlockerService中统一管理
        this.gameOver = false;
        this.winner = null;
        
        // 地图数据
        this.mapData = null;
        this.scaledPositions = new Map();
        this.holes = new Set();
        this.adjacencyList = new Map();
        
        // 渲染参数
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        
        // 自主路障管理器（独立于游戏状态机）
        this.autonomousBlockerManager = null;
        
        // 路障管理已移至BlockerService中统一管理
        
        // 事件监听器管理
        this.eventListeners = new Map();
        
        // 游戏开始时间（用于统计）
        this.startTime = null;
        
        // console.log('GameEngine initialized');
    }
    
    /**
     * 初始化 MapService 实例
     */
    async initializeMapService() {
        if (!this.mapService) {
            try {
                const { MapService } = await import('../services/MapService.js');
                this.mapService = new MapService();
                this.mapManager = this.mapService; // 保持向后兼容
                // console.log('✅ GameEngine: MapService 初始化完成');
            } catch (error) {
                console.error('❌ GameEngine: MapService 初始化失败:', error);
                throw error;
            }
        }
    }
    
    /**
     * 设置画布尺寸
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
    
    /**
     * 初始化自主路障管理器
     */
    initializeAutonomousBlockerManager(assetLoader, blockerManager = null) {
        if (blockerManager) {
            // 使用传入的路障管理器实例
            this.autonomousBlockerManager = blockerManager;
            // console.log('🚧 使用共享路障管理器实例');
        } else {
            // 动态导入路障管理器（备用方案）
            import('../services/BlockerService.js').then(module => {
                this.autonomousBlockerManager = new module.BlockerService(
                    assetLoader,
                    (edgeId, blocked) => this.onBlockerStateChange(edgeId, blocked)
                );
                // console.log('🚧 路障管理器初始化完成');
            }).catch(error => {
                console.error('❌ 初始化路障管理器失败:', error);
            });
        }
    }
    
    /**
     * 路障状态变化回调
     */
    onBlockerStateChange(edgeId, blocked) {
        // console.log(`🚧 路障状态变化: ${edgeId} -> ${blocked}`);
        // 这里可以通知其他系统路障状态变化
    }
    
    /**
     * 加载真实地图数据
     */
    async loadRealMap(difficulty = 'easy', mapNumber = 1) {
        // console.log(`🔍 DEBUG: GameEngine.loadRealMap 被调用 - 难度: ${difficulty}, 地图编号: ${mapNumber}`);
        
        // 确保 MapService 已初始化
        if (!this.mapService) {
            // console.log(`🔍 DEBUG: MapService 未初始化，开始初始化`);
            await this.initializeMapService();
        }
        
        if (!this.mapService) {
            console.error('没有地图管理器，无法加载真实地图');
            return false;
        }
        
        try {
            // console.log(`🗺️ 开始加载真实地图: ${difficulty} 难度第${mapNumber}张`);
            // console.log(`🔍 DEBUG: 当前 MapService.currentMapNumber = ${this.mapService.currentMapNumber}`);
            
            // 使用地图管理器加载地图数据
            const rawMapData = await this.mapService.loadMapData(difficulty, mapNumber);
            if (!rawMapData) {
                console.error('地图数据加载失败');
                return false;
            }
            
            // 转换为游戏引擎格式
            const gameMapData = this.mapService.convertToGameEngineFormat(
                rawMapData, 
                this.canvasWidth, 
                this.canvasHeight
            );
            
            // 设置地图数据
            this.mapData = gameMapData;
            
            // 解析地图数据
            this.parseRealMapData();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 检查是否自动初始化兔子
            // createBunnyAtStart方法已移除，现在由新的Bunny类处理
            // 兔子创建现在由GameController负责
            
            // 发送地图加载事件 - 暂时注释，因为没有监听器
            // const mapStats = {
            //     nodeCount: this.nodes.size,
            //     edgeCount: this.edges.size,
            //     holeCount: this.holes.size
            // };
            // const mapData = EventFactory.createMapLoadedEvent(
            //     `${difficulty}_${mapNumber}`, 
            //     difficulty, 
            //     mapStats
            // );
            // gameEventBus.emit(GAME_EVENTS.MAP_LOADED, mapData, { 
            //     priority: EVENT_PRIORITIES.HIGH 
            // });
            
            // console.log(`✅ 真实地图加载成功: ${this.nodes.size}个节点, ${this.edges.size}条边`);
            return true;
            
        } catch (error) {
            console.error(`❌ 真实地图加载失败: ${error.message}`);
            return false;
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听游戏开始事件，记录开始时间
        const gameStartListener = () => {
            this.startTime = Date.now();
            // console.log('🎮 游戏开始时间已记录');
        };
        
        // 监听游戏重置事件，清理状态
        const gameResetListener = () => {
            this.reset();
        };
        
        // 注册事件监听器（移除了路障相关的事件监听）
        this.eventListeners.set('game_start', 
            gameEventBus.on(GAME_EVENTS.GAME_START, gameStartListener, { 
                priority: EVENT_PRIORITIES.NORMAL 
            })
        );
        
        this.eventListeners.set('game_reset', 
            gameEventBus.on(GAME_EVENTS.GAME_RESET, gameResetListener, { 
                priority: EVENT_PRIORITIES.HIGH 
            })
        );
        
        // console.log('📡 GameEngine事件监听器已设置（路障相关事件已移除）');
    }
    
    // 路障相关的事件处理方法已移除，现在由BlockerService直接处理
    
    /**
     * 解析真实地图数据
     */
    parseRealMapData() {
        if (!this.mapData) {
            console.error('没有地图数据可解析');
            return;
        }
        
        // 清空现有数据
        this.nodes.clear();
        this.edges.clear();
        this.holes.clear();
        this.scaledPositions.clear();
        this.adjacencyList.clear();
        // 路障清理通过BlockerService管理
        
        const { nodes, edges, original_positions, scaling, hole_positions } = this.mapData;
        
        // 处理节点
        Object.entries(nodes).forEach(([nodeKey, nodeData]) => {
            // 获取原始位置
            const originalPos = original_positions[nodeKey];
            if (!originalPos) {
                console.warn(`节点 ${nodeKey} 没有位置数据`);
                return;
            }
            
            // 计算缩放后的位置
            const scaledX = originalPos[0] * scaling.scale + scaling.offsetX;
            const scaledY = originalPos[1] * scaling.scale + scaling.offsetY;
            const scaledPos = [scaledX, scaledY];
            
            const node = {
                key: nodeKey,
                is_hole: nodeData.is_hole,
                position: { x: scaledX, y: scaledY },
                coordinate: nodeData.coordinate
            };
            
            this.nodes.set(nodeKey, node);
            this.scaledPositions.set(nodeKey, scaledPos);
            
            if (nodeData.is_hole) {
                this.holes.add(nodeKey);
            }
        });
        
        // 处理边
        Object.entries(edges).forEach(([edgeKey, edgeData]) => {
            const edge = {
                key: edgeKey,
                from: edgeData.from,
                to: edgeData.to,
                is_hole_edge: edgeData.is_hole_edge,
                coordinate_from: edgeData.coordinate_from,
                coordinate_to: edgeData.coordinate_to
            };
            
            this.edges.set(edgeKey, edge);
            
            // 构建邻接表
            if (!this.adjacencyList.has(edge.from)) {
                this.adjacencyList.set(edge.from, []);
            }
            if (!this.adjacencyList.has(edge.to)) {
                this.adjacencyList.set(edge.to, []);
            }
            
            this.adjacencyList.get(edge.from).push(edge.to);
            this.adjacencyList.get(edge.to).push(edge.from);
        });
        
        // console.log(`地图解析完成: ${this.nodes.size}个节点, ${this.edges.size}条边, ${this.holes.size}个洞口`);
    }
    
    // createBunnyAtStart方法已移除，现在由新的Bunny类处理
    
    /**
     * 坐标转字符串
     */
    coordToString(coord) {
        return `(${coord[0]}, ${coord[1]})`;
    }
    
    /**
     * 字符串转坐标
     */
    stringToCoord(str) {
        const match = str.match(/\((-?\d+),\s*(-?\d+)\)/);
        if (match) {
            return [parseInt(match[1]), parseInt(match[2])];
        }
        return null;
    }
    
    /**
     * 获取游戏状态
     */
    getGameState() {
        return {
            nodes: this.nodes,
            edges: this.edges,
            adjacencyList: this.adjacencyList, // 添加邻接表
            blockers: this.autonomousBlockerManager ? this.autonomousBlockerManager.blockers : new Map(),
            scaledPositions: this.scaledPositions,
            holes: this.holes,
            gameOver: this.gameOver,
            winner: this.winner,
            mapData: this.mapData
        };
    }
    
    
    /**
     * 解析边键格式
     */
    parseEdgeKey(edgeKey) {
        const match = edgeKey.match(/\(\(\((-?\d+),\s*(-?\d+)\)\),\s*\(\((-?\d+),\s*(-?\d+)\)\)\)/);
        if (match) {
            return [
                `(${match[1]}, ${match[2]})`,
                `(${match[3]}, ${match[4]})`
            ];
        }
        return null;
    }
    
    /**
     * 比较两条边是否相等
     */
    edgesAreEqual(edge1, edge2) {
        if (!edge1 || !edge2) return false;
        return (edge1[0] === edge2[0] && edge1[1] === edge2[1]) ||
               (edge1[0] === edge2[1] && edge1[1] === edge2[0]);
    }
    
    /**
     * 计算点到线段的距离
     */
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projection = { x: x1 + t * dx, y: y1 + t * dy };
        
        return Math.sqrt((px - projection.x) * (px - projection.x) + (py - projection.y) * (py - projection.y));
    }
    
    // findPathToEscape方法已移除，现在由新的Bunny类处理
    
    // bfsPath方法已移除，现在由新的Bunny类处理
    
    /**
     * 获取边的键值
     */
    getEdgeKey(from, to) {
        // 尝试两个方向的边键
        const key1 = `((${from}), (${to}))`;
        const key2 = `((${to}), (${from}))`;
        
        if (this.edges.has(key1)) return key1;
        if (this.edges.has(key2)) return key2;
        
        return null;
    }
    
    /**
     * 添加随机障碍
     */
    addRandomBlocker() {
        const edges = Array.from(this.edges.keys());
        if (edges.length === 0) return false;
        
        // 选择一个没有被阻挡的边
        const hasBlocker = this.autonomousBlockerManager ? this.autonomousBlockerManager.hasBlocker.bind(this.autonomousBlockerManager) : () => false;
        const availableEdges = edges.filter(edgeKey => !hasBlocker(edgeKey));
        if (availableEdges.length === 0) return false;
        
        // 使用种子随机数选择路障位置
        const randomValue = this.gameController?.stateTransitionService?.random ? 
            this.gameController.stateTransitionService.random() : Math.random();
        const randomEdge = availableEdges[Math.floor(randomValue * availableEdges.length)];
        // 通过BlockerService添加路障
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.addBlocker(randomEdge, this.edges.get(randomEdge), this.getGameState());
        }
        
        // console.log(`✅ 添加随机障碍: ${randomEdge}`);
        return true;
    }
    
    /**
     * 移除随机障碍
     */
    removeRandomBlocker() {
        if (!this.autonomousBlockerManager) return false;
        
        const blockedEdges = Array.from(this.autonomousBlockerManager.blockers.keys());
        if (blockedEdges.length === 0) return false;
        
        // 使用种子随机数选择要移除的路障
        const randomValue = this.gameController?.stateTransitionService?.random ? 
            this.gameController.stateTransitionService.random() : Math.random();
        const randomEdge = blockedEdges[Math.floor(randomValue * blockedEdges.length)];
        this.autonomousBlockerManager.removeBlocker(randomEdge);
        
        // console.log(`移除随机障碍: ${randomEdge}`);
        return true;
    }
    
    /**
     * 更新游戏状态
     */
    update(deltaTime) {
        // 更新路障闪烁效果（仿照Python原代码）
        this.updateBlockerBlinkEffect();
        
        // 返回游戏是否结束
        return this.gameOver;
    }
    
    /**
     * 重置游戏 - 完全清理并重新初始化所有游戏对象
     */
    reset() {
        // console.log('🔄 开始完全重置游戏...');
        
        // 1. 清理所有路障（通过BlockerService统一管理）
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.clearAll();
        }
        // console.log('✅ 路障已清理');
        
        // 2. 重置游戏状态
        this.gameOver = false;
        this.winner = null;
        this.startTime = null;
        // console.log('✅ 游戏状态已重置');
        
        
        // 5. 清理自主路障管理器
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.clearAll();
            // console.log('✅ 自主路障管理器已清理');
        }
        
        // console.log('🎊 游戏完全重置完成');
    }
    
    /**
     * 销毁游戏引擎，清理事件监听器
     */
    destroy() {
        // 移除所有事件监听器
        for (const [name, listenerId] of this.eventListeners) {
            gameEventBus.off(listenerId);
            // console.log(`📡 移除事件监听器: ${name}`);
        }
        this.eventListeners.clear();
        
        // 清理数据（路障通过BlockerService管理）
        this.nodes.clear();
        this.edges.clear();
        this.scaledPositions.clear();
        this.holes.clear();
        this.adjacencyList.clear();
        
        // 重置状态
        this.gameOver = false;
        this.winner = null;
        // this.bunny = null; // 已移除，现在使用新的Bunny类
        this.startTime = null;
        
        // console.log('🗑️ GameEngine已销毁');
    }
    
    /**
     * 获取地图统计信息
     */
    getMapStats() {
        // 计算剩余路障数量：最大路障数 - 当前已使用路障数
        const currentBlockers = this.autonomousBlockerManager ? this.autonomousBlockerManager.getBlockerCount() : 0;
        const maxBlockers = this.autonomousBlockerManager ? this.autonomousBlockerManager.maxBlockers : 5;
        const remainingBlockers = maxBlockers - currentBlockers;
        
        return {
            nodes: this.nodes.size,
            edges: this.edges.size,
            holes: this.holes.size,
            blockers: remainingBlockers, // 🔧 修改：返回剩余路障数量而不是已使用数量
            currentDifficulty: this.mapService ? this.mapService.currentDifficulty : 'unknown',
            currentMapNumber: this.mapService ? this.mapService.currentMapNumber : 'unknown'
        };
    }
    
    /**
     * 设置当前地图信息（供GameController调用）
     */
    setCurrentMapInfo(difficulty, mapNumber) {
        if (this.mapService) {
            this.mapService.currentDifficulty = difficulty;
            this.mapService.currentMapNumber = mapNumber;
        }
    }
    
    /**
     * 获取当前地图编号（供外部查询）
     */
    getCurrentMapNumber() {
        return this.mapService ? this.mapService.currentMapNumber : 1;
    }
    
    /**
     * 获取当前难度（供外部查询）
     */
    getCurrentDifficulty() {
        return this.mapService ? this.mapService.currentDifficulty : 'easy';
    }
    
    /**
     * 获取当前地图信息（供外部查询）
     */
    getCurrentMapInfo() {
        return this.mapService ? this.mapService.getCurrentMapInfo() : {
            difficulty: 'easy',
            mapNumber: 1,
            filePath: 'assets/maps/easy/bunny_map_001.json'
        };
    }
    
    /**
     * 设置地图编号（供外部调用）
     */
    setMapNumber(mapNumber) {
        if (this.mapService) {
            this.mapService.setMapNumber(mapNumber);
        }
    }
    
    /**
     * 设置难度（供外部调用）
     */
    setDifficulty(difficulty) {
        if (this.mapService) {
            this.mapService.setDifficulty(difficulty);
        }
    }
    
    /**
     * 更新自主路障（独立于游戏状态机）
     */
    updateAutonomousBlockers(dt) {
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.updateAll(dt);
        }
    }
    
    /**
     * 渲染自主路障（独立于游戏状态机）
     */
    renderAutonomousBlockers(ctx) {
        if (this.autonomousBlockerManager) {
            const gameState = this.getGameState();
            this.autonomousBlockerManager.renderAll(ctx, gameState);
        }
    }
    
    // 路障回收方法已移至BlockerService中统一管理
    
    /**
     * 更新路障闪烁效果（委托给BlockerService）
     */
    updateBlockerBlinkEffect() {
        // 委托给BlockerService统一管理
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.updateBlockerBlinkEffect();
        }
    }
    
    /**
     * 触发胜利路障动画
     */
    triggerVictoryBlockerAnimation(edgeKey) {
        // 通知自主路障管理器触发胜利动画
        if (this.autonomousBlockerManager) {
            this.autonomousBlockerManager.triggerVictoryAnimation(edgeKey);
        }
    }
}

export default GameEngine;