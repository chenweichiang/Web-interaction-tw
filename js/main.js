// 網頁背景參數設定區 - 可自由調整
const CONFIG = {
    // 背景曲線基本參數
    LINE_COUNT: 100,                  // 曲線數量 (越多視覺越複雜)
    LINE_THICKNESS_MIN: 0.3,         // 最小線條粗細
    LINE_THICKNESS_MAX: 1,           // 最大線條粗細
    LINE_OPACITY: 0.8,               // 線條透明度 (0-1)
    LINE_COLOR: "120, 120, 120",     // 線條顏色 (RGB格式)
    
    // 曲線點相關參數
    POINT_MIN_COUNT: 5,              // 每條曲線上最少點數
    POINT_MAX_COUNT: 8,              // 每條曲線上最多點數
    POINT_AMPLITUDE_MIN: 30,         // 振幅最小值
    POINT_AMPLITUDE_MAX: 150,        // 振幅最大值
    
    // 小立方體相關參數
    CUBE_SIZE: 5,                    // 小立方體的大小
    CUBES_PER_LINE: 30,              // 每條曲線上的立方體數量
    CUBE_SPEED_MIN: 0.001,           // 立方體最小移動速度
    CUBE_SPEED_MAX: 0.005,           // 立方體最大移動速度
    
    // 連線相關參數
    CONNECTION_DISTANCE: 100,        // 立方體間連線的最大距離
    CONNECTION_DISTANCE_SQUARED: 10000, // 連線距離的平方值 (優化距離計算)
    CONNECTION_LAYERS: 3,            // 不同層級的連線數
    
    // 三角形填充相關參數
    MIN_TRIANGLE_AREA: 2800,         // 最小三角形面積 (過濾太小的三角形)
    TRIANGLE_ALPHA_MIN: 0.1,         // 三角形透明度最小值
    TRIANGLE_ALPHA_MAX: 0.3,         // 三角形透明度最大值
    TRIANGLE_COLOR_MAX: 40,          // 三角形灰階顏色最大值 (0-255)
    
    // 效能優化參數
    THROTTLE_SCROLL: 16,             // 滾動事件節流時間 (毫秒)
    SPATIAL_HASH_CELL_SIZE: 100,     // 空間哈希單元格大小 (優化連線計算)
};

// 檢查 CONFIG 對象，設置缺失的默認值
(function ensureConfigDefaults() {
    const defaults = {
        LINE_COUNT: 50,
        LINE_THICKNESS_MIN: 0.3,
        LINE_THICKNESS_MAX: 1,
        LINE_OPACITY: 0.8,
        LINE_COLOR: "120, 120, 120",
        POINT_MIN_COUNT: 5,
        POINT_MAX_COUNT: 8,
        POINT_AMPLITUDE_MIN: 30,
        POINT_AMPLITUDE_MAX: 150,
        CUBE_SIZE: 5,
        CUBES_PER_LINE: 5,
        CUBE_SPEED_MIN: 0.001,
        CUBE_SPEED_MAX: 0.005,
        CONNECTION_DISTANCE: 100,
        CONNECTION_LAYERS: 3,
        MIN_TRIANGLE_AREA: 1000,
        TRIANGLE_ALPHA_MIN: 0.1,
        TRIANGLE_ALPHA_MAX: 0.3,
        TRIANGLE_COLOR_MAX: 40,
        THROTTLE_SCROLL: 16,
        SPATIAL_HASH_CELL_SIZE: 100
    };
    
    let missingKeys = [];
    
    // 檢查並設置缺失的值
    for (const key in defaults) {
        if (!CONFIG.hasOwnProperty(key)) {
            CONFIG[key] = defaults[key];
            missingKeys.push(key);
        }
    }
    
    // 計算衍生值
    if (!CONFIG.hasOwnProperty('CONNECTION_DISTANCE_SQUARED')) {
        CONFIG.CONNECTION_DISTANCE_SQUARED = CONFIG.CONNECTION_DISTANCE * CONFIG.CONNECTION_DISTANCE;
    }
    
    // 輸出調試信息
    if (missingKeys.length > 0) {
        console.warn(`已為缺失的配置項設置默認值: ${missingKeys.join(', ')}`);
    }
    
    console.log('配置檢查完成，所有必要參數都已設置');
})();

// 通用節流函數 - 限制函數執行頻率
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

// 背景曲線效果
class BackgroundLines {
    constructor() {
        this.canvas = document.getElementById('background-canvas');
        
        // 檢查 canvas 元素是否存在
        if (!this.canvas) {
            console.error('找不到 background-canvas 元素，請確認 HTML 中是否存在該元素！');
            
            // 如果找不到，手動創建一個
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'background-canvas';
            document.body.insertBefore(this.canvas, document.body.firstChild);
            
            console.log('已自動創建 canvas 元素');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.lines = [];
        this.lineCount = CONFIG.LINE_COUNT;
        this.scrollY = 0;
        this.animationTime = 0;
        
        this.cubeSize = CONFIG.CUBE_SIZE;
        this.cubeRotation = 0;
        this.cubesPerLine = CONFIG.CUBES_PER_LINE;
        this.cubeConnections = [];
        this.connectionDistance = CONFIG.CONNECTION_DISTANCE;
        this.connectionDistanceSquared = CONFIG.CONNECTION_DISTANCE_SQUARED; // 使用平方距離優化
        this.connectionLayers = CONFIG.CONNECTION_LAYERS;
        
        // 空間哈希網格 - 用於更高效地找到彼此接近的立方體
        this.spatialGrid = {};
        this.spatialGridCellSize = CONFIG.SPATIAL_HASH_CELL_SIZE;
        
        // 預計算的正弦和餘弦值
        this.precomputedTrig = {
            sin: {},
            cos: {}
        };
        
        // 常用計算結果的快取
        this.cache = {
            cubePositions: [],
            controlPoints: new Map(),
            lastFrameTime: 0,
            frameCount: 0,
            fps: 0
        };
        
        this.resizeCanvas();
        this.initLines();
        
        // 使用節流函數處理視窗大小變化事件
        window.addEventListener('resize', throttle(() => {
            this.resizeCanvas();
        }, 100));
        
        // 使用節流函數處理滾動事件，避免過度渲染
        window.addEventListener('scroll', throttle(() => {
            this.scrollY = window.scrollY;
            this.drawLines();
        }, CONFIG.THROTTLE_SCROLL));
        
        // 開始動畫
        this.animate();
    }
    
    // 調整 canvas 大小
    resizeCanvas() {
        // 確保 canvas 在頁面上正確顯示
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        
        // 設置 canvas 的實際尺寸，解決高清屏幕問題
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        
        // 縮放上下文以適應 DPR
        this.ctx.scale(dpr, dpr);
        
        // 清除快取，因為尺寸改變
        this.cache.controlPoints.clear();
        
        console.log(`Canvas 尺寸已調整: ${this.canvas.width}x${this.canvas.height}, DPR: ${dpr}`);
        
        this.initLines(); // 重新初始化曲線
    }
    
    // 初始化曲線
    initLines() {
        this.lines = [];
        
        // 預計算 pi*2 以避免重複計算
        const PI2 = Math.PI * 2;
        
        // 提前計算一些常用值
        const pointCountDiff = CONFIG.POINT_MAX_COUNT - CONFIG.POINT_MIN_COUNT + 1;
        const thicknessDiff = CONFIG.LINE_THICKNESS_MAX - CONFIG.LINE_THICKNESS_MIN;
        const amplitudeDiff = CONFIG.POINT_AMPLITUDE_MAX - CONFIG.POINT_AMPLITUDE_MIN;
        const cubeSpeedDiff = CONFIG.CUBE_SPEED_MAX - CONFIG.CUBE_SPEED_MIN;
        
        // 使用單次分配的大型陣列進行初始化，避免重複記憶體分配
        const allLines = new Array(this.lineCount);
        
        for (let i = 0; i < this.lineCount; i++) {
            const pointCount = Math.floor(Math.random() * pointCountDiff) + CONFIG.POINT_MIN_COUNT;
            const yPosition = Math.random() * this.canvas.height;
            const seed = Math.random() * 1000;
            const phaseOffset = Math.random() * PI2;
            
            const line = {
                points: new Array(pointCount),
                pointCount: pointCount,
                yPosition: yPosition,
                speed: Math.random() * 0.2 + 0.1,
                thickness: (Math.random() * thicknessDiff + CONFIG.LINE_THICKNESS_MIN) * 0.7,
                opacity: CONFIG.LINE_OPACITY,
                seed: seed,
                phaseOffset: phaseOffset,
                cubes: new Array(this.cubesPerLine)
            };
            
            // 為每條曲線初始化多個立方體 - 一次性分配記憶體
            for (let j = 0; j < this.cubesPerLine; j++) {
                const offset = j / this.cubesPerLine + (Math.random() * 0.1);
                line.cubes[j] = {
                    offset: offset,
                    speed: (Math.random() * cubeSpeedDiff + CONFIG.CUBE_SPEED_MIN) * 0.4,
                    lastPosition: null // 用於快取上一幀的位置
                };
            }
            
            // 預計算寬度比例
            const widthRatio = this.canvas.width / (pointCount - 1);
            
            // 生成曲線上的點，每個點有自己的特性
            for (let j = 0; j < pointCount; j++) {
                const x = widthRatio * j;
                line.points[j] = {
                    x: x,
                    y: yPosition,
                    originalY: yPosition,
                    amplitude: Math.random() * amplitudeDiff + CONFIG.POINT_AMPLITUDE_MIN,
                    speed: Math.random() * 0.5 + 0.5,
                    phaseOffset: Math.random() * PI2,
                    // 預計算一些常用值
                    xFactor: x * 0.01, // 預計算 x 相關因子
                    xFactor2: x * 0.02, // 第二種振動的 x 因子
                };
            }
            
            allLines[i] = line;
        }
        
        // 一次性將所有曲線添加到陣列
        this.lines = allLines;
        
        // 預計算常用的三角函數值
        this.precomputeTrigValues();
    }
    
    // 預計算常用的三角函數值以提高性能
    precomputeTrigValues() {
        // 為動畫時間創建查找表
        for (let i = 0; i < 628; i++) { // 0 到 2π 的 628 個樣本點 (約0.01精度)
            const angle = i / 100;
            this.precomputedTrig.sin[angle.toFixed(2)] = Math.sin(angle);
            this.precomputedTrig.cos[angle.toFixed(2)] = Math.cos(angle);
        }
    }
    
    // 優化的三角函數查找
    fastSin(angle) {
        const normalizedAngle = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const key = (Math.round(normalizedAngle * 100) / 100).toFixed(2);
        return this.precomputedTrig.sin[key] || Math.sin(angle);
    }
    
    fastCos(angle) {
        const normalizedAngle = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const key = (Math.round(normalizedAngle * 100) / 100).toFixed(2);
        return this.precomputedTrig.cos[key] || Math.cos(angle);
    }
    
    // 繪製曲線
    drawLines() {
        // 測量幀率
        const now = performance.now();
        if (now - this.cache.lastFrameTime >= 1000) {
            this.cache.fps = this.cache.frameCount;
            this.cache.frameCount = 0;
            this.cache.lastFrameTime = now;
        }
        this.cache.frameCount++;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.animationTime += 0.01;
        this.cubeRotation += 0.02;
        
        // 重置空間哈希網格
        this.spatialGrid = {};
        
        // 清空立方體位置陣列
        const cubePositions = [];
        this.cache.cubePositions = cubePositions;
        
        // 使用對象池減少記憶體分配
        if (!this._controlPointsPool) {
            this._controlPointsPool = [];
        }
        
        // 釋放控制點池
        while (this._controlPointsPool.length > 0) {
            const point = this._controlPointsPool.pop();
            point.used = false;
        }
        
        // 批次繪製所有線條，減少狀態切換
        const lineCount = this.lines.length;
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = this.lines[lineIndex];
            
            // 獲取或計算控制點
            const cacheKey = `${lineIndex}_${this.scrollY}_${this.animationTime.toFixed(2)}`;
            let controlPoints = this.cache.controlPoints.get(cacheKey);
            
            if (!controlPoints) {
                // 需要計算新的控制點
                controlPoints = this.calculateControlPoints(line);
                
                // 只快取部分常用的結果來避免記憶體過度使用
                if (this.cache.controlPoints.size < 100) {
                    this.cache.controlPoints.set(cacheKey, controlPoints);
                }
            }
            
            // 繪製曲線
            this.drawSingleLine(line, controlPoints);
            
            // 批次處理立方體
            this.processCubes(line, controlPoints, lineIndex, cubePositions);
        }
        
        // 使用空間哈希網格進行更高效的立方體連線
        this.drawCubeConnectionsOptimized(cubePositions);
    }
    
    // 分離計算控制點邏輯以提高可維護性
    calculateControlPoints(line) {
        const pointCount = line.points.length;
        const controlPoints = new Array(pointCount);
        
        for (let i = 0; i < pointCount; i++) {
            const point = line.points[i];
            
            // 使用快取的三角函數值進行計算
            const scrollAngle = (this.scrollY * 0.003) + (point.x * 0.002) + line.seed;
            const scrollEffect = this.fastSin(scrollAngle) * point.amplitude;
            
            const idleAngle = this.animationTime * point.speed + point.phaseOffset + point.xFactor;
            const idleEffect = this.fastSin(idleAngle) * (point.amplitude * 0.2);
            
            const secondaryAngle = this.animationTime * (point.speed * 0.7) + point.phaseOffset * 2 + point.xFactor2;
            const secondaryEffect = this.fastCos(secondaryAngle) * (point.amplitude * 0.1);
            
            // 計算最終 Y 位置
            const adjustedY = (point.originalY % this.canvas.height) + 
                           scrollEffect + 
                           idleEffect + 
                           secondaryEffect;
            
            // 從對象池獲取或創建新點
            let controlPoint;
            if (this._controlPointsPool.length > 0) {
                controlPoint = this._controlPointsPool.pop();
                controlPoint.x = point.x;
                controlPoint.y = adjustedY;
                controlPoint.used = true;
            } else {
                controlPoint = {
                    x: point.x,
                    y: adjustedY,
                    used: true
                };
            }
            
            controlPoints[i] = controlPoint;
        }
        
        return controlPoints;
    }
    
    // 繪製單條曲線
    drawSingleLine(line, controlPoints) {
        if (controlPoints.length === 0) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
        
        // 使用貝塞爾曲線繪製平滑曲線
        const pointCount = controlPoints.length;
        for (let i = 1; i < pointCount; i++) {
            const prev = controlPoints[i - 1];
            const current = controlPoints[i];
            
            if (i === 1) {
                // 第一段
                const next = (i + 1 < pointCount) ? controlPoints[i + 1] : current;
                const cp1x = prev.x + (current.x - prev.x) / 4;
                const cp1y = prev.y + (current.y - prev.y) / 4;
                const cp2x = current.x - (next.x - prev.x) / 4;
                const cp2y = current.y - (next.y - prev.y) / 4;
                
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
            } else if (i === pointCount - 1) {
                // 最後一段
                const prevPrev = controlPoints[i - 2];
                const cp1x = prev.x + (current.x - prevPrev.x) / 4;
                const cp1y = prev.y + (current.y - prevPrev.y) / 4;
                const cp2x = current.x - (current.x - prev.x) / 4;
                const cp2y = current.y - (current.y - prev.y) / 4;
                
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
            } else {
                // 中間段
                const next = controlPoints[i + 1];
                const prevPrev = controlPoints[i - 2];
                const cp1x = prev.x + (current.x - prevPrev.x) / 4;
                const cp1y = prev.y + (current.y - prevPrev.y) / 4;
                const cp2x = current.x - (next.x - prev.x) / 4;
                const cp2y = current.y - (next.y - prev.y) / 4;
                
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
            }
        }
        
        // 設置樣式並繪製
        this.ctx.strokeStyle = `rgba(${CONFIG.LINE_COLOR}, ${line.opacity})`;
        this.ctx.lineWidth = line.thickness;
        this.ctx.stroke();
    }
    
    // 處理曲線上的立方體
    processCubes(line, controlPoints, lineIndex, cubePositions) {
        for (const cube of line.cubes) {
            // 更新立方體位置
            cube.offset = (cube.offset + cube.speed) % 1;
            
            // 計算立方體在曲線上的位置
            const position = this.getExactPositionOnCurve(controlPoints, cube.offset);
            
            if (position) {
                // 獲取切線方向
                const tangent = this.getCurveTangent(controlPoints, cube.offset);
                const angle = Math.atan2(tangent.y, tangent.x);
                
                // 繪製立方體
                const cubeColor = `rgba(${CONFIG.LINE_COLOR}, ${line.opacity})`;
                this.drawCube(position.x, position.y, this.cubeSize, angle, cubeColor);
                
                // 添加到空間哈希
                const cubeInfo = {
                    x: position.x,
                    y: position.y,
                    lineIndex: lineIndex
                };
                
                // 將立方體添加到空間哈希網格
                this.addToSpatialGrid(position.x, position.y, cubePositions.length);
                
                // 保存立方體位置
                cubePositions.push(cubeInfo);
            }
        }
    }
    
    // 添加對象到空間哈希網格
    addToSpatialGrid(x, y, index) {
        const cellX = Math.floor(x / this.spatialGridCellSize);
        const cellY = Math.floor(y / this.spatialGridCellSize);
        const cellKey = `${cellX},${cellY}`;
        
        if (!this.spatialGrid[cellKey]) {
            this.spatialGrid[cellKey] = [];
        }
        
        this.spatialGrid[cellKey].push(index);
    }
    
    // 從空間哈希網格獲取附近的對象
    getNearbyObjects(x, y) {
        const cellX = Math.floor(x / this.spatialGridCellSize);
        const cellY = Math.floor(y / this.spatialGridCellSize);
        const result = [];
        
        // 檢查當前單元格和相鄰的 8 個單元格
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cellKey = `${cellX + dx},${cellY + dy}`;
                if (this.spatialGrid[cellKey]) {
                    result.push(...this.spatialGrid[cellKey]);
                }
            }
        }
        
        return result;
    }
    
    // 使用空間哈希優化立方體連線計算
    drawCubeConnectionsOptimized(cubePositions) {
        // 如果立方體數量少於 2，無需繪製連線
        const cubeCount = cubePositions.length;
        if (cubeCount < 2) return;
        
        this.cubes = cubePositions;
        this.cubeConnections = [];
        
        // 批次繪製連線以提高效能
        const linesToDraw = [];
        
        // 使用空間哈希網格進行更高效的距離檢查
        for (let i = 0; i < cubeCount; i++) {
            const p1 = cubePositions[i];
            
            // 只檢查鄰近單元格中的立方體，而不是所有立方體
            const nearbyIndices = this.getNearbyObjects(p1.x, p1.y);
            
            for (let j = 0; j < nearbyIndices.length; j++) {
                const index = nearbyIndices[j];
                
                // 避免重複檢查
                if (index <= i) continue;
                
                const p2 = cubePositions[index];
                
                // 使用平方距離進行比較，避免開平方運算
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distanceSquared = dx * dx + dy * dy;
                
                if (distanceSquared < this.connectionDistanceSquared) {
                    // 計算準確距離和透明度
                    const distance = Math.sqrt(distanceSquared);
                    const opacity = 1 - distance / this.connectionDistance;
                    
                    // 保存連線信息
                    linesToDraw.push({
                        x1: p1.x,
                        y1: p1.y,
                        x2: p2.x,
                        y2: p2.y,
                        opacity: opacity,
                        lineWidth: Math.max(0.1, (1 - distance / this.connectionDistance) * 1.5)
                    });
                    
                    // 保存連線信息用於三角形
                    this.cubeConnections.push({
                        p1: i,
                        p2: index,
                        distance: distance
                    });
                }
            }
        }
        
        // 批次繪製所有連線，減少狀態切換
        if (linesToDraw.length > 0) {
            // 按照不透明度分組以減少狀態更改
            const opacityGroups = {};
            
            for (const line of linesToDraw) {
                const opacityKey = line.opacity.toFixed(2);
                if (!opacityGroups[opacityKey]) {
                    opacityGroups[opacityKey] = { 
                        opacity: line.opacity,
                        lines: []
                    };
                }
                opacityGroups[opacityKey].lines.push(line);
            }
            
            // 批次繪製每個不透明度組
            for (const key in opacityGroups) {
                const group = opacityGroups[key];
                this.ctx.strokeStyle = `rgba(10, 10, 10, ${group.opacity})`;
                
                // 對每個線寬分組
                const widthGroups = {};
                for (const line of group.lines) {
                    const widthKey = line.lineWidth.toFixed(2);
                    if (!widthGroups[widthKey]) {
                        widthGroups[widthKey] = {
                            width: line.lineWidth,
                            lines: []
                        };
                    }
                    widthGroups[widthKey].lines.push(line);
                }
                
                // 為每個線寬批次繪製線條
                for (const widthKey in widthGroups) {
                    const widthGroup = widthGroups[widthKey];
                    this.ctx.lineWidth = widthGroup.width;
                    
                    this.ctx.beginPath();
                    for (const line of widthGroup.lines) {
                        this.ctx.moveTo(line.x1, line.y1);
                        this.ctx.lineTo(line.x2, line.y2);
                    }
                    this.ctx.stroke();
                }
            }
        }
        
        // 使用優化版本的三角形計算
        this.findAndFillTrianglesOptimized(this.cubes, this.cubeConnections);
    }
    
    // 優化的三角形查找和填充
    findAndFillTrianglesOptimized(positions, potentialEdges) {
        if (potentialEdges.length < 3) return; // 至少需要 3 條邊才能形成三角形
        
        // 使用更高效的數據結構
        const graph = new Map();
        for (let i = 0; i < positions.length; i++) {
            graph.set(i, new Set());
        }
        
        // 將所有邊加入圖中
        for (const edge of potentialEdges) {
            graph.get(edge.p1).add(edge.p2);
            graph.get(edge.p2).add(edge.p1);
        }
        
        // 找到所有三角形
        const triangles = [];
        const visited = new Set(); // 用來追蹤已處理的三角形
        
        for (let i = 0; i < positions.length; i++) {
            const neighbors1 = graph.get(i);
            if (neighbors1.size < 2) continue; // 一個點至少需要兩個鄰居才能形成三角形
            
            // 轉換成陣列以便迭代
            const neighborsArray = Array.from(neighbors1);
            
            for (let j = 0; j < neighborsArray.length; j++) {
                const neighbor1 = neighborsArray[j];
                if (neighbor1 <= i) continue; // 避免重複
                
                for (let k = j + 1; k < neighborsArray.length; k++) {
                    const neighbor2 = neighborsArray[k];
                    if (neighbor2 <= neighbor1) continue; // 避免重複
                    
                    // 檢查第三條邊是否存在
                    if (graph.get(neighbor1).has(neighbor2)) {
                        // 創建一個唯一的三角形標識符
                        const triangleId = [i, neighbor1, neighbor2].sort().join(',');
                        
                        // 如果這個三角形尚未處理，添加它
                        if (!visited.has(triangleId)) {
                            visited.add(triangleId);
                            triangles.push([i, neighbor1, neighbor2]);
                        }
                    }
                }
            }
        }
        
        // 批次處理三角形
        this.batchRenderTriangles(positions, triangles);
    }
    
    // 批次渲染三角形
    batchRenderTriangles(positions, triangles) {
        if (triangles.length === 0) return;
        
        // 按透明度和顏色分組
        const groups = {};
        
        for (const triangle of triangles) {
            const p1 = positions[triangle[0]];
            const p2 = positions[triangle[1]];
            const p3 = positions[triangle[2]];
            
            // 計算三角形面積
            const area = this.calculateTriangleArea(p1, p2, p3);
            if (area < CONFIG.MIN_TRIANGLE_AREA) continue;
            
            // 隨機顏色和透明度
            const greyValue = Math.floor(Math.random() * CONFIG.TRIANGLE_COLOR_MAX);
            const alpha = CONFIG.TRIANGLE_ALPHA_MIN + 
                         Math.random() * (CONFIG.TRIANGLE_ALPHA_MAX - CONFIG.TRIANGLE_ALPHA_MIN);
            
            // 創建分組鍵
            const colorKey = `${greyValue}_${alpha.toFixed(2)}`;
            
            if (!groups[colorKey]) {
                groups[colorKey] = {
                    baseColor: greyValue,
                    endColor: Math.max(0, greyValue - 10),
                    alpha: alpha,
                    triangles: []
                };
            }
            
            groups[colorKey].triangles.push({p1, p2, p3, area});
        }
        
        // 批次渲染每個分組
        for (const key in groups) {
            const group = groups[key];
            const baseColor = group.baseColor;
            const endColor = group.endColor;
            const alpha = group.alpha;
            
            // 批次繪製這個分組的所有三角形
            for (const triangle of group.triangles) {
                this.ctx.beginPath();
                this.ctx.moveTo(triangle.p1.x, triangle.p1.y);
                this.ctx.lineTo(triangle.p2.x, triangle.p2.y);
                this.ctx.lineTo(triangle.p3.x, triangle.p3.y);
                this.ctx.closePath();
                
                // 使用漸變填充
                const gradient = this.ctx.createLinearGradient(
                    triangle.p1.x, triangle.p1.y, triangle.p3.x, triangle.p3.y
                );
                
                gradient.addColorStop(0, `rgba(${baseColor}, ${baseColor}, ${baseColor}, ${alpha})`);
                gradient.addColorStop(1, `rgba(${endColor}, ${endColor}, ${endColor}, ${alpha})`);
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                // 添加紋理 (僅在較大三角形上添加，以進一步優化)
                if (triangle.area > CONFIG.MIN_TRIANGLE_AREA * 2 && Math.random() > 0.7) {
                    this.addTextureToTriangle(
                        triangle.p1, triangle.p2, triangle.p3, alpha
                    );
                }
            }
        }
    }
    
    // 計算三角形面積
    calculateTriangleArea(p1, p2, p3) {
        return Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
    }
    
    // 為三角形添加細微紋理
    addTextureToTriangle(p1, p2, p3, alpha) {
        // 計算三角形的中心
        const centerX = (p1.x + p2.x + p3.x) / 3;
        const centerY = (p1.y + p2.y + p3.y) / 3;
        
        // 在三角形內添加一些細點，創造紋理感
        const dotCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < dotCount; i++) {
            // 使用重心坐標生成三角形內的隨機點
            const a = Math.random();
            const b = Math.random() * (1 - a);
            const c = 1 - a - b;
            
            const x = a * p1.x + b * p2.x + c * p3.x;
            const y = a * p1.y + b * p2.y + c * p3.y;
            
            // 生成隨機小點
            const size = Math.random() * 0.8 + 0.2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`; // 半透明白色點
            this.ctx.fill();
        }
        
        // 可能添加些許波浪線條
        if (Math.random() > 0.5) {
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            
            const controlX = centerX + (Math.random() - 0.5) * 20;
            const controlY = centerY + (Math.random() - 0.5) * 20;
            
            this.ctx.quadraticCurveTo(controlX, controlY, p2.x, p2.y);
            this.ctx.strokeStyle = `rgba(30, 30, 30, ${alpha * 0.3})`;
            this.ctx.lineWidth = 0.3;
            this.ctx.stroke();
        }
    }
    
    // 優化的曲線點計算函數
    getExactPositionOnCurve(points, offset) {
        const pointCount = points.length;
        if (pointCount < 2) return { x: 0, y: 0 };
        
        // 邊界情況
        if (offset === 0) return { x: points[0].x, y: points[0].y };
        if (offset === 1) return { x: points[pointCount - 1].x, y: points[pointCount - 1].y };
        
        // 使用快取的段數據以避免重複計算
        if (!this._segmentCache) {
            this._segmentCache = new Map();
        }
        
        // 快取鍵
        const cacheKey = `segments_${pointCount}_${points[0].x.toFixed(0)}_${points[0].y.toFixed(0)}`;
        
        let segments = this._segmentCache.get(cacheKey);
        let totalLength = 0;
        
        if (!segments) {
            segments = [];
            totalLength = 0;
            
            // 計算所有線段和總長度
            for (let i = 1; i < pointCount; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                totalLength += length;
                segments.push({
                    startIndex: i-1,
                    endIndex: i,
                    length: length,
                    startOffset: (totalLength - length) / totalLength,
                    endOffset: totalLength / totalLength
                });
            }
            
            if (this._segmentCache.size < 50) { // 限制快取大小
                this._segmentCache.set(cacheKey, {
                    segments: segments,
                    totalLength: totalLength
                });
            }
        } else {
            segments = segments.segments;
            totalLength = segments.totalLength;
        }
        
        // 根據偏移量查找對應的段
        const targetLength = totalLength * offset;
        let currentLength = 0;
        
        // 使用二分查找快速定位線段
        let startIdx = 0;
        let endIdx = segments.length - 1;
        let segmentIndex = 0;
        
        while (startIdx <= endIdx) {
            const mid = Math.floor((startIdx + endIdx) / 2);
            const segment = segments[mid];
            
            const segmentStart = mid > 0 ? 
                segments.reduce((acc, seg, i) => i < mid ? acc + seg.length : acc, 0) : 0;
            const segmentEnd = segmentStart + segment.length;
            
            if (targetLength >= segmentStart && targetLength <= segmentEnd) {
                segmentIndex = mid;
                currentLength = segmentStart;
                break;
            } else if (targetLength < segmentStart) {
                endIdx = mid - 1;
            } else {
                startIdx = mid + 1;
            }
        }
        
        // 如果沒有找到（極少發生），使用線性搜索
        if (startIdx > endIdx) {
            segmentIndex = 0;
            currentLength = 0;
            for (let i = 0; i < segments.length; i++) {
                if (currentLength + segments[i].length >= targetLength) {
                    segmentIndex = i;
                    break;
                }
                currentLength += segments[i].length;
            }
        }
        
        // 計算確切位置
        const segment = segments[segmentIndex];
        const segmentOffset = (targetLength - currentLength) / segment.length;
        
        const startPoint = points[segment.startIndex];
        const endPoint = points[segment.endIndex];
        
        // 線性插值計算位置
        return {
            x: startPoint.x + (endPoint.x - startPoint.x) * segmentOffset,
            y: startPoint.y + (endPoint.y - startPoint.y) * segmentOffset
        };
    }
    
    // 優化的切線計算函數
    getCurveTangent(points, offset) {
        const pointCount = points.length;
        if (pointCount < 2) return { x: 1, y: 0 };
        
        // 針對簡單情況使用直接計算
        if (offset === 0) {
            const dx = points[1].x - points[0].x;
            const dy = points[1].y - points[0].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            return { x: dx / len, y: dy / len };
        }
        
        if (offset === 1) {
            const dx = points[pointCount - 1].x - points[pointCount - 2].x;
            const dy = points[pointCount - 1].y - points[pointCount - 2].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            return { x: dx / len, y: dy / len };
        }
        
        // 使用與 getExactPositionOnCurve 相同邏輯找到對應線段
        if (!this._segmentCache) {
            this._segmentCache = new Map();
        }
        
        const cacheKey = `segments_${pointCount}_${points[0].x.toFixed(0)}_${points[0].y.toFixed(0)}`;
        
        let cachedData = this._segmentCache.get(cacheKey);
        let segments;
        let totalLength;
        
        if (!cachedData) {
            // 如果沒有快取，計算所有線段
            segments = [];
            totalLength = 0;
            
            for (let i = 1; i < pointCount; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                totalLength += length;
                segments.push({
                    startIndex: i-1,
                    endIndex: i,
                    length: length,
                    dx: dx / length,
                    dy: dy / length
                });
            }
            
            // 保存到快取
            if (this._segmentCache.size < 50) {
                this._segmentCache.set(cacheKey, {
                    segments: segments,
                    totalLength: totalLength
                });
            }
        } else {
            segments = cachedData.segments;
            totalLength = cachedData.totalLength;
        }
        
        // 根據偏移量查找段
        const targetLength = totalLength * offset;
        let currentLength = 0;
        
        for (let i = 0; i < segments.length; i++) {
            if (currentLength + segments[i].length >= targetLength) {
                return { x: segments[i].dx, y: segments[i].dy };
            }
            currentLength += segments[i].length;
        }
        
        // 如果沒找到，使用最後一段
        if (segments.length > 0) {
            return { 
                x: segments[segments.length-1].dx, 
                y: segments[segments.length-1].dy 
            };
        }
        
        // 以防萬一
        return { x: 1, y: 0 };
    }
    
    // 優化的立方體繪製函數
    drawCube(x, y, size, rotation, color) {
        this.ctx.save();
        
        // 減少計算量與狀態更改
        this.ctx.translate(x, y);
        
        // 組合旋轉
        const combinedRotation = rotation + Math.sin(this.animationTime * 3) * 0.1;
        this.ctx.rotate(combinedRotation);
        
        const halfSize = size / 2;
        
        // 使用剛性記憶體模式儲存立方體面
        if (!this._cubePrototype) {
            this._cubePrototype = [
                { // 頂面
                    points: [
                        { x: -halfSize, y: -halfSize },
                        { x: halfSize, y: -halfSize },
                        { x: halfSize, y: -halfSize * 0.7 },
                        { x: -halfSize, y: -halfSize * 0.7 }
                    ]
                },
                { // 正面
                    points: [
                        { x: -halfSize, y: -halfSize * 0.7 },
                        { x: halfSize, y: -halfSize * 0.7 },
                        { x: halfSize, y: halfSize },
                        { x: -halfSize, y: halfSize }
                    ]
                },
                { // 右側面
                    points: [
                        { x: halfSize, y: -halfSize },
                        { x: halfSize * 1.3, y: -halfSize * 0.3 },
                        { x: halfSize * 1.3, y: halfSize * 0.7 },
                        { x: halfSize, y: halfSize }
                    ]
                }
            ];
        }
        
        // 只設置一次線條樣式
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 0.5;
        
        // 使用預定義的立方體面批次繪製
        for (const face of this._cubePrototype) {
            this.ctx.beginPath();
            this.ctx.moveTo(face.points[0].x, face.points[0].y);
            
            for (let i = 1; i < face.points.length; i++) {
                this.ctx.lineTo(face.points[i].x, face.points[i].y);
            }
            
            this.ctx.closePath();
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    // 優化的動畫循環
    animate() {
        try {
            // 確保 canvas 和上下文存在
            if (!this.canvas || !this.ctx) {
                console.error('Canvas 或上下文不存在，重新初始化');
                
                // 嘗試重新獲取 canvas
                this.canvas = document.getElementById('background-canvas');
                
                if (!this.canvas) {
                    console.error('無法找到 canvas 元素！');
                    return; // 停止動畫
                }
                
                this.ctx = this.canvas.getContext('2d');
                this.resizeCanvas(); // 重設 canvas 大小
            }
            
            // 使用 requestAnimationFrame 回調計數器
            if (!this._frameCounter) {
                this._frameCounter = 0;
            }
            
            // 每幀都繪製
            this.drawLines();
            this._frameCounter++;
            
            // 監控幀率
            if (this._frameCounter % 60 === 0) {
                console.log(`背景動畫運行中: FPS=${this.cache.fps}`);
            }
            
            // 請求下一幀
            requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('動畫循環中發生錯誤:', error);
            
            // 嘗試在一段時間後重新啟動動畫
            setTimeout(() => {
                console.log('嘗試重新啟動動畫...');
                this.animate();
            }, 1000);
        }
    }
}

// 當 DOM 載入完成時初始化背景和其他功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 已載入 - 開始初始化背景曲線');
    
    try {
        // 確保 canvas 元素存在
        if (!document.getElementById('background-canvas')) {
            console.warn('找不到 background-canvas 元素，將自動創建');
            const canvas = document.createElement('canvas');
            canvas.id = 'background-canvas';
            document.body.insertBefore(canvas, document.body.firstChild);
        }
        
        // 初始化背景曲線
        const bgLines = new BackgroundLines();
        console.log('背景曲線已成功初始化');
    } catch (error) {
        console.error('初始化背景曲線時發生錯誤:', error);
    }
    
    // 滑動導航效果 - 使用事件委託減少事件監聽器數量
    try {
        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            navContainer.addEventListener('click', function(e) {
                // 只處理 a 標籤的點擊
                if (e.target.tagName.toLowerCase() === 'a') {
                    e.preventDefault();
                    
                    // 獲取目標區塊
                    const targetId = e.target.getAttribute('href');
                    const targetSection = document.querySelector(targetId);
                    
                    if (targetSection) {
                        // 使用 scrollTo 滑動到目標
                        window.scrollTo({
                            top: targetSection.offsetTop - 70,
                            behavior: 'smooth'
                        });
                    }
                }
            });
            console.log('導航滑動效果已設置');
        } else {
            console.warn('找不到導航元素 .nav-links');
        }
    } catch (navError) {
        console.error('設置導航時發生錯誤:', navError);
    }
    
    // 使用節流函數處理滾動事件
    try {
        const throttledScroll = throttle(function() {
            const header = document.querySelector('header');
            if (header) {
                if (window.scrollY > 0) {
                    header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                } else {
                    header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }
            }
        }, 16);
        
        window.addEventListener('scroll', throttledScroll);
        console.log('滾動效果已設置');
    } catch (scrollError) {
        console.error('設置滾動效果時發生錯誤:', scrollError);
    }
});

// 添加簡單的調試工具到全局空間
window.debugBackgroundCanvas = {
    // 獲取當前背景系統的狀態信息
    getStatus: function() {
        const canvas = document.getElementById('background-canvas');
        
        return {
            canvasExists: !!canvas,
            canvasDimensions: canvas ? {
                width: canvas.width,
                height: canvas.height,
                style: {
                    width: canvas.style.width,
                    height: canvas.style.height,
                    position: canvas.style.position,
                    zIndex: canvas.style.zIndex
                }
            } : null,
            bgLinesInitialized: typeof BackgroundLines !== 'undefined',
            devicePixelRatio: window.devicePixelRatio || 1,
            windowDimensions: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    },
    
    // 重新初始化背景系統
    reinitialize: function() {
        try {
            // 移除舊的 canvas
            const oldCanvas = document.getElementById('background-canvas');
            if (oldCanvas) {
                oldCanvas.remove();
            }
            
            // 創建新的 canvas
            const canvas = document.createElement('canvas');
            canvas.id = 'background-canvas';
            document.body.insertBefore(canvas, document.body.firstChild);
            
            // 初始化背景系統
            const bgLines = new BackgroundLines();
            
            return {
                success: true,
                message: '背景系統已重新初始化'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    },
    
    // 切換背景的可見性
    toggleVisibility: function() {
        const canvas = document.getElementById('background-canvas');
        if (!canvas) return { success: false, message: '找不到 Canvas 元素' };
        
        if (canvas.style.display === 'none') {
            canvas.style.display = '';
            return { success: true, message: '背景已顯示' };
        } else {
            canvas.style.display = 'none';
            return { success: true, message: '背景已隱藏' };
        }
    }
};