/**
 * 真实地图管理器 - 仿照Python版本的MapManager
 * 负责加载和管理真实地图数据
 */

export class MapService {
    constructor() {
        this.currentDifficulty = 'easy'; // 默认难度
        this.currentMapNumber = 1;       // 当前地图编号
        
        // 缓存已加载的地图数据
        this.mapCache = new Map();
        this.maxCacheSize = 10; // 最大缓存10张地图
        
        // 地图文件路径配置
        this.mapBasePath = 'assets/maps/';
        
        // console.log('MapService initialized');
    }
    
    /**
     * 获取地图文件路径
     */
    getMapFilePath(difficulty, mapNumber) {
        const paddedNumber = mapNumber.toString().padStart(3, '0');
        return `${this.mapBasePath}${difficulty}/bunny_map_${paddedNumber}.json`;
    }
    
    /**
     * 设置当前难度
     */
    setDifficulty(difficulty) {
        if (['easy', 'hard'].includes(difficulty)) {
            this.currentDifficulty = difficulty;
            // console.log(`地图难度设置为: ${difficulty}`);
        } else {
            console.error(`无效的难度设置: ${difficulty}`);
        }
    }
    
    /**
     * 设置当前地图编号
     */
    setMapNumber(mapNumber) {
        // console.log(`🔍 DEBUG: MapService.setMapNumber 被调用 - 新地图编号: ${mapNumber}`);
        // console.log(`🔍 DEBUG: 当前地图编号: ${this.currentMapNumber}`);
        
        if (mapNumber >= 1 && mapNumber <= 100) {
            this.currentMapNumber = mapNumber;
            // console.log(`地图编号设置为: ${mapNumber}`);
            // console.log(`🔍 DEBUG: MapService.currentMapNumber 已更新为: ${this.currentMapNumber}`);
        } else {
            console.error(`无效的地图编号: ${mapNumber}`);
        }
    }
    
    /**
     * 获取当前地图信息
     */
    getCurrentMapInfo() {
        return {
            difficulty: this.currentDifficulty,
            mapNumber: this.currentMapNumber,
            filePath: this.getMapFilePath(this.currentDifficulty, this.currentMapNumber)
        };
    }
    
    /**
     * 加载指定地图数据
     */
    async loadMapData(difficulty = null, mapNumber = null) {
        const targetDifficulty = difficulty || this.currentDifficulty;
        const targetMapNumber = mapNumber || this.currentMapNumber;
        
        // 检查缓存
        const cacheKey = `${targetDifficulty}_${targetMapNumber}`;
        if (this.mapCache.has(cacheKey)) {
            // console.log(`从缓存加载地图: ${cacheKey}`);
            return this.mapCache.get(cacheKey);
        }
        
        try {
            const filePath = this.getMapFilePath(targetDifficulty, targetMapNumber);
            // console.log(`开始加载地图: ${filePath}`);
            
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`地图文件加载失败: ${response.status} ${response.statusText}`);
            }
            
            const rawMapData = await response.json();
            
            // 解码字符串为坐标
            const mapData = this.decodeMapData(rawMapData);
            
            // 缓存地图数据
            this.mapCache.set(cacheKey, mapData);
            this.manageCacheSize();
            
            // console.log(`✅ 成功加载地图: ${targetDifficulty} 难度第${targetMapNumber}张`);
            return mapData;
            
        } catch (error) {
            console.error(`❌ 地图加载失败: ${error.message}`);
            return null;
        }
    }
    
    /**
     * 解码地图数据 - 将字符串坐标转换为实际坐标
     */
    decodeMapData(rawMapData) {
        const mapData = {
            nodes: [],
            edges: [],
            positions: {},
            holes: [],
            bunnyStart: null,
            traps: rawMapData.traps || [],
            generation_params: rawMapData.generation_params || {}
        };
        
        // 解码节点列表
        mapData.nodes = rawMapData.nodes.map(nodeStr => this.parseCoordinate(nodeStr));
        
        // 解码边列表
        mapData.edges = rawMapData.edges.map(edgeStr => this.parseEdge(edgeStr));
        
        // 解码位置信息
        for (const [nodeStr, posStr] of Object.entries(rawMapData.positions)) {
            // nodeStr 是网格坐标 "(0, 0)"，posStr 是实际位置坐标 "(0.019, 0.196)"
            const position = this.parseCoordinate(posStr);
            mapData.positions[nodeStr] = position; // 直接使用原始的nodeStr作为键
        }
        
        // 解码洞口
        mapData.holes = rawMapData.holes.map(holeStr => this.parseCoordinate(holeStr));
        
        // 解码兔子起始位置
        mapData.bunnyStart = this.parseCoordinate(rawMapData.bunny_start);
        
        return mapData;
    }
    
    /**
     * 解析坐标字符串 "(x, y)" -> [x, y]
     * 支持整数和浮点数
     */
    parseCoordinate(coordStr) {
        const match = coordStr.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
        if (match) {
            return [parseFloat(match[1]), parseFloat(match[2])];
        }
        throw new Error(`无法解析坐标: ${coordStr}`);
    }
    
    /**
     * 解析边字符串 "((x1, y1), (x2, y2))" -> [[x1, y1], [x2, y2]]
     * 支持整数和浮点数
     */
    parseEdge(edgeStr) {
        const match = edgeStr.match(/\(\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\),\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)\)/);
        if (match) {
            return [
                [parseFloat(match[1]), parseFloat(match[2])],
                [parseFloat(match[3]), parseFloat(match[4])]
            ];
        }
        throw new Error(`无法解析边: ${edgeStr}`);
    }
    
    /**
     * 坐标转字符串
     */
    coordToString(coord) {
        return `(${coord[0]}, ${coord[1]})`;
    }
    
    /**
     * 边转字符串
     */
    edgeToString(edge) {
        return `((${edge[0][0]}, ${edge[0][1]}), (${edge[1][0]}, ${edge[1][1]}))`;
    }
    
    /**
     * 计算地图缩放参数
     */
    calculateMapScaling(positions, canvasWidth = 800, canvasHeight = 600) {
        const margin = 50;
        const availableWidth = canvasWidth - 2 * margin;
        const availableHeight = canvasHeight - 2 * margin;
        
        // 找到位置的边界
        const coords = Object.values(positions);
        if (coords.length === 0) {
            return { scale: 1, offsetX: margin, offsetY: margin };
        }
        
        const minX = Math.min(...coords.map(pos => pos[0]));
        const maxX = Math.max(...coords.map(pos => pos[0]));
        const minY = Math.min(...coords.map(pos => pos[1]));
        const maxY = Math.max(...coords.map(pos => pos[1]));
        
        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        
        // 计算缩放比例
        const scaleX = mapWidth > 0 ? availableWidth / mapWidth : 1;
        const scaleY = mapHeight > 0 ? availableHeight / mapHeight : 1;
        const scale = Math.min(scaleX, scaleY);
        
        // 计算偏移，使地图居中
        const scaledWidth = mapWidth * scale;
        const scaledHeight = mapHeight * scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 - minX * scale;
        const offsetY = (canvasHeight - scaledHeight) / 2 - minY * scale;
        
        return { scale, offsetX, offsetY };
    }
    
    /**
     * 转换地图数据为游戏引擎格式
     */
    convertToGameEngineFormat(mapData, canvasWidth = 800, canvasHeight = 600) {
        const scaling = this.calculateMapScaling(mapData.positions, canvasWidth, canvasHeight);
        
        // 转换为游戏引擎期望的格式
        const gameMapData = {
            nodes: {},
            edges: {},
            bunny_start: this.coordToString(mapData.bunnyStart), // 转换为字符串格式
            hole_positions: mapData.holes
        };
        
        // 创建节点数据
        for (const node of mapData.nodes) {
            const nodeKey = this.coordToString(node);
            const isHole = mapData.holes.some(hole => 
                hole[0] === node[0] && hole[1] === node[1]
            );
            
            gameMapData.nodes[nodeKey] = {
                is_hole: isHole,
                coordinate: node
            };
        }
        
        // 创建边数据
        for (const edge of mapData.edges) {
            const fromKey = this.coordToString(edge[0]);
            const toKey = this.coordToString(edge[1]);
            const edgeKey = `(${fromKey}, ${toKey})`;
            // console.log(`🗺️ MapService生成边键: ${edgeKey} (fromKey: ${fromKey}, toKey: ${toKey})`);
            
            // 检查是否是通向洞口的边
            const isHoleEdge = mapData.holes.some(hole => 
                (hole[0] === edge[0][0] && hole[1] === edge[0][1]) ||
                (hole[0] === edge[1][0] && hole[1] === edge[1][1])
            );
            
            gameMapData.edges[edgeKey] = {
                from: fromKey,
                to: toKey,
                is_hole_edge: isHoleEdge,
                coordinate_from: edge[0],
                coordinate_to: edge[1]
            };
        }
        
        // 保存缩放信息
        gameMapData.scaling = scaling;
        gameMapData.original_positions = mapData.positions;
        
        return gameMapData;
    }
    
    /**
     * 切换到下一张地图
     */
    async nextMap() {
        const nextNumber = this.currentMapNumber + 1;
        if (nextNumber <= 100) {
            this.currentMapNumber = nextNumber;
            // console.log(`切换到地图 ${nextNumber}`);
            return await this.loadMapData();
        } else {
            // console.log('已经是最后一张地图');
            return null;
        }
    }
    
    /**
     * 切换到上一张地图
     */
    async previousMap() {
        const prevNumber = this.currentMapNumber - 1;
        if (prevNumber >= 1) {
            this.currentMapNumber = prevNumber;
            // console.log(`切换到地图 ${prevNumber}`);
            return await this.loadMapData();
        } else {
            // console.log('已经是第一张地图');
            return null;
        }
    }
    
    /**
     * 管理缓存大小
     */
    manageCacheSize() {
        while (this.mapCache.size > this.maxCacheSize) {
            const firstKey = this.mapCache.keys().next().value;
            this.mapCache.delete(firstKey);
            // console.log(`缓存已满，移除最旧的地图缓存: ${firstKey}`);
        }
    }
    
    /**
     * 获取可用地图数量
     */
    getAvailableMapCount(difficulty = null) {
        // 简单返回固定数量，实际应用中可能需要扫描文件系统
        return 100;
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.mapCache.clear();
        // console.log('地图缓存已清理');
    }
    
    /**
     * 获取缓存状态
     */
    getCacheStatus() {
        return {
            cacheSize: this.mapCache.size,
            maxCacheSize: this.maxCacheSize,
            cachedMaps: Array.from(this.mapCache.keys())
        };
    }
}

// 默认导出
export default MapService;
