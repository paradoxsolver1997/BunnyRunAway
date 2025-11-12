/**
 * 路障管理器 - 统一管理所有路障
 * 合并了autonomous_blocker.js和blocker_system.js的管理功能
 * 重构为事件接收者模式，监听 blocker_click 事件
 */

import { Blocker } from './Blocker.js';
import { CanvasCoordinateHelper } from '../utils/CanvasCoordinateHelper.js';
import { gameEventBus } from '../core/GameEventBus.js';

export class BlockerService {
    constructor(assetLoader, onBlockerStateChange = null) {
        this.assetLoader = assetLoader;
        this.onBlockerStateChange = onBlockerStateChange;
        this.blockers = new Map(); // edgeId -> Blocker实例
        
        // 路障数量限制和回收（从GameEngine移过来）
        this.maxBlockers = 5; // 默认最大路障数量
        this.blockerQueue = []; // 路障队列，用于FIFO回收
        
        // 路障闪烁效果状态缓存（从GameEngine移过来）
        this._lastBlinkState = false;
        this._lastBlocker = null;
        
        // 当前最后一个路障状态
        this._currentLastBlocker = null;
        
        // 鼠标事件监听相关
        this.canvas = null;
        this.gameState = null; // 存储游戏状态信息（地图、位置等）
        this.stateTransitionService = null; // 状态转换服务
        this.bunny = null; // 兔子实例引用
        
        // 事件总线监听器管理
        this.eventBusListeners = new Set();
        
        // console.log('🚧 路障服务初始化完成');
    }
    
    /**
     * 初始化鼠标事件监听 - 添加直接Canvas点击处理
     */
    initializeMouseListeners(canvas, gameState, stateTransitionService, bunny = null, gameController = null) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.stateTransitionService = stateTransitionService;
        this.bunny = bunny;
        this.gameController = gameController; // 🔧 新增：保存GameController引用用于UI更新
        
        // 🆕 添加直接Canvas点击处理
        this.setupCanvasClickHandler();
        
        // console.log('🖱️ BlockerService事件监听已设置（直接Canvas点击模式）'); // 调试日志
    }
    
    /**
     * 设置Canvas点击事件处理 - 从 EventHandler 搬运过来
     */
    setupCanvasClickHandler() {
        if (!this.canvas) {
            console.error('🖱️ BlockerService: Canvas 未初始化');
            return;
        }
        
        // 先清理旧的事件监听器，防止重复注册
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        
        // 绑定新的事件监听器
        this.canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });
        
        console.log('✅ BlockerService: Canvas点击事件已设置（直接处理模式）');
    }
    
    /**
     * 处理Canvas点击事件 - 从 EventHandler 搬运过来
     */
    handleCanvasClick(event) {
        // 1. 状态检查：只有在 running 状态下才处理
        if (!this.stateTransitionService || !this.stateTransitionService.isRunning()) {
            return;
        }
        
        // 🔍 调试：输出Canvas尺寸信息
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(this.canvas);
            const borderWidth = CanvasCoordinateHelper.getBorderWidth(computedStyle);
            
            console.log('🔍 Canvas尺寸调试:');
            console.log('├─ Canvas内部尺寸:', `width=${this.canvas.width}, height=${this.canvas.height}`);
            console.log('├─ Canvas显示尺寸:', `width=${rect.width}, height=${rect.height}`);
            console.log('├─ 边框宽度:', borderWidth);
            console.log('├─ 缩放比例:', `scaleX=${(this.canvas.width / rect.width).toFixed(3)}, scaleY=${(this.canvas.height / rect.height).toFixed(3)}`);
            console.log('├─ CSS Transform:', computedStyle.transform);
            console.log('└─ 实际显示区域:', `width=${(rect.width - borderWidth * 2).toFixed(1)}, height=${(rect.height - borderWidth * 2).toFixed(1)}`);
        }
        
        // 2. 获取Canvas坐标
        const coords = this.getCanvasCoordinates(event);
        
        // 3. 检测是否点击在边附近
        const edgeKey = this.detectEdgeClick(coords.x, coords.y);
        if (edgeKey) {
            console.log('🖱️ BlockerService: 检测到边点击');
            this.handleEdgeClick(edgeKey, coords);
        }
    }
    
    /**
     * 获取Canvas坐标 - 从 EventHandler 搬运过来
     */
    getCanvasCoordinates(event) {
        // 空指针检查
        if (!this.canvas) {
            console.error('🖱️ BlockerService: Canvas 未初始化');
            return { x: 0, y: 0 };
        }
        
        if (!event) {
            console.error('🖱️ BlockerService: 事件对象为空');
            return { x: 0, y: 0 };
        }
        
        try {
            // 🔧 修复：使用修正后的坐标计算，解决Canvas缩放问题
            const correctedCoords = CanvasCoordinateHelper.getCorrectedCoordinates(this.canvas, event);
            
            // 🔍 调试：对比两种坐标计算方法（保留调试信息）
            const rect = this.canvas.getBoundingClientRect();
            const simpleCoords = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            
            // 计算差异
            const diffX = Math.abs(simpleCoords.x - correctedCoords.x);
            const diffY = Math.abs(simpleCoords.y - correctedCoords.y);
            
            // 如果差异超过5像素，输出详细调试信息
            if (diffX > 5 || diffY > 5) {
                console.log('🔍 坐标转换差异检测:');
                console.log('├─ 简单坐标:', `x=${simpleCoords.x}, y=${simpleCoords.y}`);
                console.log('├─ 修正坐标:', `x=${correctedCoords.x}, y=${correctedCoords.y}`);
                console.log('├─ 差异:', `x=${diffX.toFixed(2)}, y=${diffY.toFixed(2)}`);
                console.log('├─ Canvas尺寸:', `width=${this.canvas.width}, height=${this.canvas.height}`);
                console.log('├─ 显示尺寸:', `width=${rect.width}, height=${rect.height}`);
                console.log('└─ 缩放比例:', `scaleX=${(this.canvas.width / rect.width).toFixed(3)}, scaleY=${(this.canvas.height / rect.height).toFixed(3)}`);
                console.log('✅ 已使用修正坐标解决缩放问题');
            }
            
            return correctedCoords;
        } catch (error) {
            console.error('🖱️ BlockerService: 获取Canvas坐标失败:', error);
            return { x: 0, y: 0 };
        }
    }
    
    /**
     * 设置事件总线监听器
     */
    setupEventBusListeners() {
        // 防止重复注册：先清理现有监听器
        if (this.eventBusListeners && this.eventBusListeners.size > 0) {
            // console.log('🧹 BlockerService: 清理现有事件总线监听器，防止重复注册'); // 调试日志
            this.cleanupEventBusListeners();
        }
        
        // 监听 blocker_click 事件（由 EventHandler 分发）
        const listenerId = gameEventBus.on('blocker_click', (data) => {
            this.handleBlockerClick(data.coords);
        });
        
        this.eventBusListeners.add(listenerId);
        // console.log('🎯 BlockerService: 已监听 blocker_click 事件，ID:', listenerId); // 调试日志
    }
    
    /**
     * 处理 blocker_click 事件
     */
    handleBlockerClick(coords) {
        // console.log('🎯 BlockerService: 接收到 blocker_click 事件', coords); // 调试日志
        
        // 检查游戏状态，只有在RUNNING状态下才能放置路障
        if (this.stateTransitionService) {
            try {
                const currentState = this.stateTransitionService.getCurrentState();
                // console.log(`🔍 当前游戏状态: ${currentState}`); // 调试日志
                if (currentState !== 'running') {
                    // console.log(`⚠️ 游戏状态不是running，无法放置路障`); // 调试日志
                    return;
                }
                // console.log(`✅ 游戏状态正确，可以放置路障`); // 调试日志
            } catch (error) {
                console.warn(`⚠️ 状态检查失败，允许放置路障（向后兼容）: ${error.message}`); // 保留警告日志
                // 如果状态检查失败，允许放置路障（向后兼容）
            }
        }
        
        // 检测点击的边
        // console.log(`🔍 开始检测边点击，坐标: (${coords.x}, ${coords.y})`); // 调试日志
        const edgeKey = this.detectEdgeClick(coords.x, coords.y);
        // console.log(`🔍 检测到的边: ${edgeKey}`); // 调试日志
        if (edgeKey) {
            // console.log(`✅ 找到可点击的边，处理点击事件`); // 调试日志
            this.handleEdgeClick(edgeKey, coords);
        } else {
            // console.log(`❌ 没有找到可点击的边`); // 调试日志
        }
    }
    
    /**
     * 设置Bunny实例引用
     */
    setBunny(bunny) {
        this.bunny = bunny;
        // console.log('🔗 BlockerService已设置Bunny实例引用');
    }
    
    // 注意：handleCanvasClick 方法已移除，现在使用事件接收者模式
    // 点击事件由 EventHandler 智能分发，通过 blocker_click 事件触发
    
    /**
     * 处理Canvas鼠标移动事件
     */
    handleCanvasMouseMove(event) {
        // 鼠标移动事件处理已移至StartButtonWidget沙箱组件
        // 这里不再需要处理按钮悬浮逻辑
    }
    
    /**
     * 检测点击的边
     */
    detectEdgeClick(x, y) {
        if (!this.gameState || !this.gameState.edges || !this.gameState.scaledPositions) {
            return null;
        }
        
        // 使用动态阈值，考虑Canvas缩放
        const threshold = CanvasCoordinateHelper.getAdjustedThreshold(this.canvas, 20);
        
        // 🔍 调试：输出点击坐标和阈值信息
        console.log('🔍 边检测调试:');
        console.log('├─ 点击坐标:', `x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
        console.log('├─ 检测阈值:', threshold);
        console.log('├─ Canvas缩放:', CanvasCoordinateHelper.getCanvasScale(this.canvas));
        
        const candidates = [];
        
        for (const [edgeKey, edge] of this.gameState.edges) {
            const fromPos = this.gameState.scaledPositions.get(edge.from);
            const toPos = this.gameState.scaledPositions.get(edge.to);
            
            if (fromPos && toPos) {
                const distance = this.pointToLineDistance(x, y, fromPos[0], fromPos[1], toPos[0], toPos[1]);
                
                // 记录所有候选边（距离在阈值2倍范围内）
                if (distance <= threshold * 2) {
                    candidates.push({
                        edgeKey,
                        distance,
                        fromPos,
                        toPos,
                        withinThreshold: distance <= threshold
                    });
                }
                
                if (distance <= threshold) {
                    console.log('✅ 检测到边点击:');
                    console.log('├─ 边键:', edgeKey);
                    console.log('├─ 距离:', distance.toFixed(2));
                    console.log('├─ 起点:', `[${fromPos[0].toFixed(1)}, ${fromPos[1].toFixed(1)}]`);
                    console.log('├─ 终点:', `[${toPos[0].toFixed(1)}, ${toPos[1].toFixed(1)}]`);
                    console.log('└─ 阈值:', threshold);
                    return edgeKey;
                }
            }
        }
        
        // 🔍 调试：如果没有检测到边，输出最近的候选边
        if (candidates.length > 0) {
            console.log('❌ 未检测到边点击，最近的候选边:');
            candidates.sort((a, b) => a.distance - b.distance);
            candidates.slice(0, 3).forEach((candidate, index) => {
                console.log(`├─ 候选${index + 1}: ${candidate.edgeKey} (距离: ${candidate.distance.toFixed(2)})`);
            });
        } else {
            console.log('❌ 没有找到任何候选边');
        }
        
        return null;
    }
    
    /**
     * 计算点到线段的距离
     */
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * 处理边点击
     */
    handleEdgeClick(edgeKey, position) {
        // 检查是否可以放置路障
        if (!this.canPlaceBlocker(edgeKey)) {
            return;
        }
        
        // 确定操作类型（添加或移除）
        const hasBlocker = this.hasBlocker(edgeKey);
        const action = hasBlocker ? 'remove_blocker' : 'add_blocker';
        
        // console.log(`🖱️ 边点击处理: ${edgeKey}, 操作类型: ${action === 'add_blocker' ? '添加路障' : '手动回收路障'}`);
        
        if (action === 'add_blocker') {
            // 添加路障
            // console.log(`🔍 尝试添加路障: ${edgeKey}`);
            const edgeObj = this.gameState.edges.get(edgeKey);
            // console.log(`🔍 边对象: ${edgeObj ? '存在' : '不存在'}`);
            if (edgeObj) {
                const success = this.addBlocker(edgeKey, edgeObj, this.gameState);
                // console.log(`🔍 添加路障结果: ${success ? '成功' : '失败'}`);
                if (success) {
                    // 触发路障更新事件给Bunny
                    this.emitBlockerUpdateEvent(edgeKey, 'added', position);
                    // console.log(`✅ 路障添加成功: ${edgeKey}`);
                }
            } else {
                console.warn(`⚠️ 边对象不存在: ${edgeKey}`);
            }
        } else {
            // 手动回收路障
            const success = this.removeBlocker(edgeKey);
            if (success) {
                // 触发路障更新事件给Bunny
                this.emitBlockerUpdateEvent(edgeKey, 'removed', position);
                // console.log(`✅ 手动回收路障成功: ${edgeKey}`);
            }
        }
    }
    
    /**
     * 触发路障更新事件给Bunny
     */
    emitBlockerUpdateEvent(edgeKey, action, position) {
        // console.log(`🚧 路障${action === 'added' ? '添加' : '移除'}事件: ${edgeKey}`);
        
        // 统一边键格式为2层括号
        const normalizedEdgeKey = this.normalizeEdgeKey(edgeKey);
        // console.log(`🚧 标准化边键: ${edgeKey} -> ${normalizedEdgeKey}`);
        
        // 直接调用Bunny的路障更新处理方法
        if (this.bunny && this.bunny.handleBlockerUpdate) {
            this.bunny.handleBlockerUpdate(normalizedEdgeKey, action, position);
        }
        
        // 保留原有的回调函数调用（向后兼容）
        if (this.onBlockerStateChange) {
            this.onBlockerStateChange(normalizedEdgeKey, action, position);
        }
        
        // 🔧 新增：触发UI更新事件，更新剩余路障数量显示
        this.triggerUIUpdate();
    }
    
    /**
     * 标准化边键格式为2层括号
     */
    normalizeEdgeKey(edgeKey) {
        // console.log(`🔧 normalizeEdgeKey输入: ${edgeKey}`);
        
        // 优先尝试2层括号格式：((0, 2), (0, 3))
        let match = edgeKey.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
        if (match) {
            // console.log(`🔧 匹配2层括号格式，直接返回: ${edgeKey}`);
            return edgeKey; // 已经是2层括号格式，直接返回
        }
        
        // 尝试解析3层括号格式：(((0, 2)), ((0, 3)))
        match = edgeKey.match(/\(\(\((-?\d+),\s*(-?\d+)\)\),\s*\(\((-?\d+),\s*(-?\d+)\)\)\)/);
        if (match) {
            const result = `((${match[1]}, ${match[2]}), (${match[3]}, ${match[4]}))`;
            // console.log(`🔧 匹配3层括号格式，转换结果: ${result}`);
            return result;
        }
        
        // 如果无法解析，返回原格式
        console.warn(`🚧 无法标准化边键格式: ${edgeKey}`);
        return edgeKey;
    }
    
    /**
     * 触发UI更新事件
     */
    triggerUIUpdate() {
        // 通过GameController更新UI
        if (this.gameController && this.gameController.uiManager) {
            this.gameController.uiManager.updateMapInfo();
            // console.log(`🔄 已触发UI更新，当前剩余路障数量: ${this.maxBlockers - this.blockers.size}`);
        } else {
            console.warn(`⚠️ 无法触发UI更新：GameController或UIManager未设置`);
        }
    }
    
    /**
     * 添加路障（带数量限制和FIFO回收）
     */
    addBlocker(edgeId, edgeObj, gameState = null) {
        // console.log(`🔍 开始添加路障: ${edgeId}`);
        // console.log(`🔍 当前路障数量: ${this.blockers.size}`);
        
        // 如果路障已存在，不允许重复添加
        if (this.blockers.has(edgeId)) {
            console.warn(`⚠️ 路障 ${edgeId} 已存在`);
            return false;
        }
        
        // 检查路障数量限制
        if (this.blockerQueue.length >= this.maxBlockers) {
            // console.log(`🔍 路障数量已达上限，回收最老的路障`);
            // 先回收最老的路障并启动飞跳动画
            this.recycleOldBlockerWithAnimation(edgeId, gameState);
        }
        
        const blocker = new Blocker(
            edgeId, 
            edgeObj, 
            this.assetLoader, 
            this.onBlockerStateChange
        );
        
        this.blockers.set(edgeId, blocker);
        this.blockerQueue.push(edgeId); // 添加到队列
        
        // console.log(`✅ 路障添加成功: ${edgeId}, 当前路障数量: ${this.blockers.size}`);
        
        // 获取位置信息用于动画
        let dropStartPos = null;
        if (gameState && gameState.scaledPositions) {
            const edgeInfo = blocker.parseEdgeKey(edgeId);
            if (edgeInfo && edgeInfo.length === 2) {
                const fromPos = gameState.scaledPositions.get(edgeInfo[0]);
                const toPos = gameState.scaledPositions.get(edgeInfo[1]);
                
                if (fromPos && toPos) {
                    // 计算边的中点X坐标，Y坐标固定为-200（屏幕上方）
                    const midX = (fromPos[0] + toPos[0]) / 2;
                    dropStartPos = [midX, -200]; // 屏幕上方固定位置
                }
            }
        }
        
        // 立即启动掉落动画，避免延迟导致的重复渲染
        blocker.startAsyncDropAnimation(dropStartPos, null);
        
        // 解析边信息用于日志（使用blocker实例的方法）
        const edgeInfo = blocker.parseEdgeKey(edgeId);
        if (edgeInfo && edgeInfo.length === 2) {
            const [fromPos, toPos] = edgeInfo;
            // console.log(`🚧 添加路障到边[${fromPos} -> ${toPos}], 当前路障数量: ${this.blockers.size}`);
        } else {
            // console.log(`🚧 添加路障: ${edgeId}, 当前路障数量: ${this.blockers.size}`);
        }
        
        // 更新闪烁效果
        this.updateBlockerBlinkEffect();
        
        return true;
    }
    
    /**
     * 移除路障
     */
    removeBlocker(edgeId) {
        if (!this.blockers.has(edgeId)) {
            console.warn(`⚠️ 路障 ${edgeId} 不存在`);
            return false;
        }
        
        const blocker = this.blockers.get(edgeId);
        blocker.setBlocked(false); // 通知边状态变化
        blocker.destroy(); // 清理异步资源
        
        this.blockers.delete(edgeId);
        
        // 从队列中移除（支持从队列中间位置移除）
        const index = this.blockerQueue.indexOf(edgeId);
        if (index > -1) {
            this.blockerQueue.splice(index, 1);
            // console.log(`🗑️ 手动回收路障: ${edgeId}, 从队列位置 ${index} 移除, 当前路障数量: ${this.blockers.size}`);
        } else {
            // console.log(`🗑️ 移除路障: ${edgeId}, 当前路障数量: ${this.blockers.size}`);
        }
        
        // 更新闪烁效果
        this.updateBlockerBlinkEffect();
        
        return true;
    }
    
    /**
     * 获取路障
     */
    getBlocker(edgeId) {
        return this.blockers.get(edgeId);
    }
    
    /**
     * 检查路障是否存在
     */
    hasBlocker(edgeId) {
        return this.blockers.has(edgeId);
    }
    
    /**
     * 获取所有路障
     */
    getAllBlockers() {
        return Array.from(this.blockers.values());
    }
    
    /**
     * 获取路障数量
     */
    getBlockerCount() {
        return this.blockers.size;
    }
    
    /**
     * 清空所有路障
     */
    clearAll() {
        const count = this.blockers.size;
        
        // 销毁所有路障并通知Bunny
        for (const [edgeId, blocker] of this.blockers) {
            blocker.setBlocked(false); // 通知边状态变化
            
            // 🔧 修复：通知Bunny路障被移除
            this.emitBlockerUpdateEvent(edgeId, 'removed', null);
            
            blocker.destroy();
        }
        
        // 清空路障集合
        this.blockers.clear();
        
        // 清空路障队列
        this.blockerQueue = [];
        
        // 重置所有状态缓存
        this._currentLastBlocker = null;
        this._lastBlinkState = false;
        this._lastBlocker = null;
        
        // 更新闪烁效果（清除所有闪烁）
        this.updateBlockerBlinkEffect();
        
        // console.log(`🗑️ 已清空所有路障，共移除 ${count} 个路障`);
    }
    
    /**
     * 清空所有路障
     */
    clearAllBlockers() {
        // 通知所有路障解除阻塞状态并通知Bunny
        for (const [edgeId, blocker] of this.blockers) {
            blocker.setBlocked(false);
            
            // 🔧 修复：通知Bunny路障被移除
            this.emitBlockerUpdateEvent(edgeId, 'removed', null);
        }
        
        this.blockers.clear();
        // console.log('🗑️ 清空所有路障');
    }
    
    /**
     * 设置路障高亮状态
     */
    setBlockerHighlighted(edgeId, highlighted) {
        const blocker = this.blockers.get(edgeId);
        if (blocker) {
            blocker.setHighlighted(highlighted);
        } else {
            console.warn(`⚠️ 未找到路障 ${edgeId}，无法设置闪烁状态`);
        }
    }
    
    /**
     * 设置最后一个路障（即将被回收的路障）
     */
    setLastBlocker(edgeId) {
        // 避免重复设置同一个路障
        if (this._currentLastBlocker === edgeId) {
            return;
        }
        
        // 先清除所有路障的"最后一个"状态
        for (const [id, blocker] of this.blockers) {
            blocker.setAsLast(false);
        }
        
        // 设置指定的路障为最后一个
        if (edgeId) {
            const blocker = this.blockers.get(edgeId);
            if (blocker) {
                blocker.setAsLast(true);
                this._currentLastBlocker = edgeId;
            } else {
                console.warn(`⚠️ 未找到路障 ${edgeId}，无法设置为最后一个`);
            }
        } else {
            this._currentLastBlocker = null;
        }
    }
    
    /**
     * 清除所有路障的"最后一个"状态
     */
    clearLastBlocker() {
        // 避免重复清除
        if (this._currentLastBlocker === null) {
            return;
        }
        
        for (const [id, blocker] of this.blockers) {
            blocker.setAsLast(false);
        }
        this._currentLastBlocker = null;
        // console.log(`💫 已清除所有路障的"最后一个"状态`);
    }
    
    /**
     * 启动路障回收飞跳动画
     */
    startRecycleAnimation(oldEdgeId, newEdgeId, gameState) {
        const oldBlocker = this.blockers.get(oldEdgeId);
        if (!oldBlocker) {
            console.warn(`⚠️ 未找到旧路障 ${oldEdgeId}`);
            return;
        }
        
        // 获取新位置
        const newEdgeNodes = oldBlocker.parseEdgeKey(newEdgeId);
        if (!newEdgeNodes || newEdgeNodes.length !== 2) {
            console.warn(`⚠️ 无法解析新边键: ${newEdgeId}`);
            return;
        }
        
        const fromNode = newEdgeNodes[0];
        const toNode = newEdgeNodes[1];
        const fromPos = gameState.scaledPositions ? gameState.scaledPositions.get(fromNode) : null;
        const toPos = gameState.scaledPositions ? gameState.scaledPositions.get(toNode) : null;
        
        if (!fromPos || !toPos) {
            console.warn(`⚠️ 无法获取新位置: fromPos=${fromPos}, toPos=${toPos}`);
            return;
        }
        
        // 启动异步飞跳动画
        oldBlocker.startAsyncRecycleAnimation(fromPos, toPos);
        // console.log(`🚧 启动路障异步回收飞跳: ${oldEdgeId} -> ${newEdgeId}`);
    }
    
    /**
     * 触发路障胜利动画
     */
    triggerVictoryAnimation(edgeId) {
        const blocker = this.blockers.get(edgeId);
        if (blocker) {
            blocker.triggerVictoryAnimation();
        } else {
            console.warn(`⚠️ 未找到路障 ${edgeId}，无法触发胜利动画`);
        }
    }
    
    /**
     * 更新所有路障（现在使用异步动画，此方法保留用于兼容性）
     */
    updateAll(deltaTime) {
        // 异步动画系统不需要每帧更新
        // 保留此方法用于兼容性，但不执行任何操作
    }
    
    /**
     * 渲染所有路障
     */
    renderAll(ctx, gameState) {
        // console.log(`🔍 开始渲染路障，路障数量: ${this.blockers.size}`);
        // console.log(`🔍 gameState.scaledPositions:`, gameState.scaledPositions);
        
        for (const blocker of this.blockers.values()) {
            // 获取边的位置信息
            const edgeKey = blocker.edgeId;
            const edgeNodes = blocker.parseEdgeKey(edgeKey);
            // console.log(`🔍 渲染路障: ${edgeKey}, 解析的节点: ${edgeNodes}`);
            
            if (edgeNodes && edgeNodes.length === 2) {
                const fromNode = edgeNodes[0];
                const toNode = edgeNodes[1];
                const fromPos = gameState.scaledPositions ? gameState.scaledPositions.get(fromNode) : null;
                const toPos = gameState.scaledPositions ? gameState.scaledPositions.get(toNode) : null;
                
                // console.log(`🔍 路障位置: fromPos=${fromPos}, toPos=${toPos}`);
                
                if (fromPos && toPos) {
                    // console.log(`✅ 渲染路障: ${edgeKey}`);
                    blocker.render(ctx, fromPos, toPos);
                } else {
                    console.warn(`🚧 无法渲染路障: ${edgeKey}, fromPos=${fromPos}, toPos=${toPos}`);
                }
            } else {
                console.warn(`🚧 无法解析边键: ${edgeKey}`);
            }
        }
    }
    
    /**
     * 回收旧路障（FIFO）
     */
    recycleOldBlockerIfNeeded() {
        if (this.blockerQueue.length >= this.maxBlockers) {
            const oldBlocker = this.blockerQueue.shift(); // 移除最老的路障
            
            // 从阻塞集合中移除
            if (this.blockers.has(oldBlocker)) {
                const blocker = this.blockers.get(oldBlocker);
                blocker.setBlocked(false); // 通知边状态变化
                
                // 🔧 修复：通知Bunny路障被移除
                this.emitBlockerUpdateEvent(oldBlocker, 'removed', null);
                
                blocker.destroy(); // 清理异步资源
                this.blockers.delete(oldBlocker);
            }
            
            // console.log(`🔄 回收旧路障: ${oldBlocker}, 当前路障数量: ${this.blockerQueue.length}`);
        }
    }
    
    /**
     * 回收旧路障并启动飞跳动画
     */
    recycleOldBlockerWithAnimation(newEdgeId, gameState) {
        if (this.blockerQueue.length >= this.maxBlockers) {
            const oldBlocker = this.blockerQueue.shift(); // 移除最老的路障
            
            // 启动飞跳动画（在移除之前）
            if (this.blockers.has(oldBlocker)) {
                const blocker = this.blockers.get(oldBlocker);
                if (gameState && gameState.scaledPositions) {
                    const newEdgeInfo = blocker.parseEdgeKey(newEdgeId);
                    if (newEdgeInfo && newEdgeInfo.length === 2) {
                        const fromPos = gameState.scaledPositions.get(newEdgeInfo[0]);
                        const toPos = gameState.scaledPositions.get(newEdgeInfo[1]);
                        if (fromPos && toPos) {
                            blocker.startAsyncRecycleAnimation(fromPos, toPos);
                        }
                    }
                }
                
                blocker.setBlocked(false); // 通知边状态变化
                
                // 🔧 修复：通知Bunny路障被移除
                this.emitBlockerUpdateEvent(oldBlocker, 'removed', null);
                
                blocker.destroy(); // 清理异步资源
                this.blockers.delete(oldBlocker);
            }
            
            // console.log(`🔄 回收旧路障并启动飞跳动画: ${oldBlocker} -> ${newEdgeId}, 当前路障数量: ${this.blockerQueue.length}`);
        }
    }
    
    /**
     * 更新路障闪烁效果
     */
    updateBlockerBlinkEffect() {
        // 缓存当前状态，避免频繁重复设置
        const shouldBlink = this.blockerQueue.length >= this.maxBlockers && this.blockerQueue.length > 0;
        const currentLastBlocker = shouldBlink ? this.blockerQueue[0] : null;
        
        // 只有在状态发生变化时才更新
        if (this._lastBlinkState !== shouldBlink || this._lastBlocker !== currentLastBlocker) {
            this._lastBlinkState = shouldBlink;
            this._lastBlocker = currentLastBlocker;
            
            if (shouldBlink && currentLastBlocker) {
                // 获取最早的路障（即将被回收的路障）
                const oldestBlocker = currentLastBlocker;
                
                // 设置闪烁效果
                this.setLastBlocker(oldestBlocker);
            } else {
                // 如果没有达到最大数量，清除所有闪烁效果
                this.clearLastBlocker();
            }
        }
    }
    
    /**
     * 检查兔子是否正在经过指定边
     */
    isBunnyOnEdge(edgeId) {
        if (!this.bunny || !this.bunny.path || this.bunny.path.length === 0) {
            return false;
        }
        
        // 解析边信息
        const edgeInfo = this.parseEdgeKey(edgeId);
        if (!edgeInfo || edgeInfo.length !== 2) {
            return false;
        }
        
        const [fromNode, toNode] = edgeInfo;
        
        // 检查兔子当前路径中是否包含这条边
        for (let i = 0; i < this.bunny.path.length - 1; i++) {
            const pathFrom = this.bunny.path[i];
            const pathTo = this.bunny.path[i + 1];
            
            // 检查是否是同一条边（考虑双向）
            if ((pathFrom === fromNode && pathTo === toNode) ||
                (pathFrom === toNode && pathTo === fromNode)) {
                
                // 检查兔子是否正在这条边上移动
                if (i === this.bunny.pathIndex) {
                    // console.log(`🚫 兔子正在经过边 ${edgeId}，不允许放置路障`);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 检查边是否与洞口相连
     */
    isHoleEdge(edgeId) {
        if (!this.gameState || !this.gameState.holes) {
            return false;
        }
        
        // 解析边信息
        const edgeInfo = this.parseEdgeKey(edgeId);
        if (!edgeInfo || edgeInfo.length !== 2) {
            return false;
        }
        
        const [fromNode, toNode] = edgeInfo;
        
        // 检查边的任一端点是否是洞口
        const isFromHole = this.gameState.holes.has(fromNode);
        const isToHole = this.gameState.holes.has(toNode);
        
        if (isFromHole || isToHole) {
            // console.log(`🚫 边 ${edgeId} 与洞口相连，不允许放置路障`);
            return true;
        }
        
        return false;
    }
    
    /**
     * 解析边键格式
     */
    parseEdgeKey(edgeKey) {
        // 尝试解析2层括号格式：((0, 2), (0, 3))
        let match = edgeKey.match(/\(\((-?\d+),\s*(-?\d+)\),\s*\((-?\d+),\s*(-?\d+)\)\)/);
        if (match) {
            return [
                `(${match[1]}, ${match[2]})`,
                `(${match[3]}, ${match[4]})`
            ];
        }
        
        // 尝试解析3层括号格式：(((0, 2)), ((0, 3)))
        match = edgeKey.match(/\(\(\((-?\d+),\s*(-?\d+)\)\),\s*\(\((-?\d+),\s*(-?\d+)\)\)\)/);
        if (match) {
            return [
                `(${match[1]}, ${match[2]})`,
                `(${match[3]}, ${match[4]})`
            ];
        }
        
        return null;
    }
    
    /**
     * 检查是否可以放置路障
     */
    canPlaceBlocker(edgeId) {
        // console.log(`🔍 检查路障放置限制: ${edgeId}`);
        
        // 检查1：路障数量限制（修复手动回收逻辑）
        if (this.blockers.has(edgeId)) {
            // 如果路障已存在，允许点击进行手动回收
            // console.log(`✅ 路障已存在，允许点击进行手动回收`);
            return true; // 🔧 修复：允许对已存在的路障进行点击操作
        }
        
        // 检查2：不允许在兔子正在经过的边上放置路障
        if (this.isBunnyOnEdge(edgeId)) {
            // console.log(`🚫 兔子正在经过此边，不允许放置路障`);
            return false;
        }
        
        // 检查3：不允许在与洞口相连的边上放置路障
        if (this.isHoleEdge(edgeId)) {
            // console.log(`🚫 此边与洞口相连，不允许放置路障`);
            return false;
        }
        
        // 检查4：不允许在不存在的边上放置路障（已在detectEdgeClick中处理）
        // 这个检查已经在detectEdgeClick中实现了，如果边不存在，detectEdgeClick会返回null
        
        // console.log(`✅ 所有限制检查通过，允许放置路障`);
        return true;
    }
    
    /**
     * 获取路障统计信息
     */
    getStats() {
        return {
            totalBlockers: this.blockers.size,
            activeBlockers: Array.from(this.blockers.values()).filter(b => !b.fenceAnimationActive).length,
            animatingBlockers: Array.from(this.blockers.values()).filter(b => b.fenceAnimationActive).length,
            highlightedBlockers: Array.from(this.blockers.values()).filter(b => b.isHighlighted).length,
            maxBlockers: this.maxBlockers,
            queueLength: this.blockerQueue.length
        };
    }
    
    /**
     * 清理事件总线监听器
     */
    cleanupEventBusListeners() {
        // console.log('🧹 BlockerService: 清理事件总线监听器'); // 调试日志
        
        for (const listenerId of this.eventBusListeners) {
            if (gameEventBus && gameEventBus.off) {
                gameEventBus.off(listenerId);
            }
        }
        
        this.eventBusListeners.clear();
        // console.log('✅ BlockerService: 事件总线监听器已清理'); // 调试日志
    }
    
    /**
     * 销毁BlockerService，清理所有资源
     */
    destroy() {
        // console.log('🗑️ BlockerService: 开始销毁');
        
        // 清理事件总线监听器
        this.cleanupEventBusListeners();
        
        // 清理所有路障
        this.clearAll();
        
        // 清理引用
        this.canvas = null;
        this.gameState = null;
        this.stateTransitionService = null;
        this.bunny = null;
        this.gameController = null;
        
        // console.log('✅ BlockerService: 销毁完成');
    }
    
    // 按钮检测方法已移至StartButtonWidget沙箱组件
    
    // 按钮处理方法已移至StartButtonWidget沙箱组件
    
    /**
     * 设置MapRenderer引用
     */
    setMapRenderer(mapRenderer) {
        this.mapRenderer = mapRenderer;
    }
    
    // 按钮状态检查方法已移至StartButtonWidget沙箱组件
}

// 默认导出
export default BlockerService;
