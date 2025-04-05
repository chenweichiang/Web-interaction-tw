// main_mobile.js - 行動裝置優化版
// 這是 main.js 的輕量版，專為行動裝置設計，減少計算量和效果複雜度

// 網頁背景參數設定區 - 針對行動裝置優化
const CONFIG = {
    // 背景曲線基本參數
    LINE_COUNT: 8,                    // 曲線數量進一步減少 (原為 15)
    LINE_THICKNESS_MIN: 0.3,          // 最小線條粗細
    LINE_THICKNESS_MAX: 1,            // 最大線條粗細
    LINE_OPACITY: 0.8,                // 線條透明度 (0-1)
    LINE_COLOR: "120, 120, 120",      // 線條顏色 (RGB格式)
    
    // 曲線點相關參數
    POINT_MIN_COUNT: 3,               // 每條曲線上最少點數
    POINT_MAX_COUNT: 4,               // 每條曲線上最多點數 (減少)
    POINT_AMPLITUDE_MIN: 15,          // 振幅最小值 (減少)
    POINT_AMPLITUDE_MAX: 50,          // 振幅最大值 (減少)
    
    // 小立方體相關參數
    CUBE_SIZE: 3,                     // 小立方體的大小 (減少)
    CUBES_PER_LINE: 5,                // 每條曲線上的立方體數量減少 (原為 8)
    CUBE_SPEED_MIN: 0.0001,           // 立方體最小移動速度
    CUBE_SPEED_MAX: 0.0005,           // 立方體最大移動速度 (減少)
    
    // 連線相關參數
    CONNECTION_DISTANCE: 50,          // 立方體間連線的最大距離 (減少)
    CONNECTION_DISTANCE_SQUARED: 2500, // 連線距離的平方值 (50^2)
    CONNECTION_LAYERS: 3,             // 不同層級的連線數 (減少)
    
    // 三角形填充相關參數
    MIN_TRIANGLE_AREA: 1000,          // 最小三角形面積 
    TRIANGLE_ALPHA_MIN: 0.05,         // 三角形透明度最小值
    TRIANGLE_ALPHA_MAX: 0.2,          // 三角形透明度最大值
    TRIANGLE_COLOR_MAX: 200,          // 三角形灰階顏色最大值 (0-255)
    
    // 效能優化參數
    THROTTLE_SCROLL: 100,             // 滾動事件節流時間增加 (原為 64)
    SPATIAL_HASH_CELL_SIZE: 120,      // 空間哈希單元格大小 (增加)
    
    // 行動裝置特定參數
    MOBILE_ANIMATION_FRAME_INTERVAL: 50, // 動畫幀間隔 (毫秒) - 約 20fps
    MOBILE_SCALE_FACTOR: 0.5,          // 行動裝置畫布縮放因子
};

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
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('行動裝置檢測:', this.isMobile ? '是行動裝置' : '非行動裝置');
        
        // 確保在 DOMContentLoaded 後執行初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    initialize() {
        // 強制移除和重新創建 canvas 元素，確保沒有舊的實例存在
        const oldCanvas = document.getElementById('background-canvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }
        
        // 創建新的 canvas 元素
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'background-canvas';
        
        // 設置基本樣式
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.display = 'block';
        
        // 將 canvas 添加到 body 最前面
        document.body.insertBefore(this.canvas, document.body.firstChild);
        
        console.log('已創建新的 canvas 元素', this.canvas);
        
        // 獲取上下文
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        if (!this.ctx) {
            console.error('無法獲取 canvas 2d 上下文！');
            return;
        }
        
        // 初始化其他屬性
        this.lines = [];
        this.lineCount = CONFIG.LINE_COUNT;
        this.scrollY = 0;
        this.animationTime = 0;
        this.lastFrameTime = 0;
        
        this.cubeSize = CONFIG.CUBE_SIZE;
        this.cubeRotation = 0;
        this.cubesPerLine = CONFIG.CUBES_PER_LINE;
        this.cubeConnections = [];
        this.connectionDistance = CONFIG.CONNECTION_DISTANCE;
        this.connectionDistanceSquared = CONFIG.CONNECTION_DISTANCE_SQUARED;
        this.connectionLayers = CONFIG.CONNECTION_LAYERS;
        
        // 空間哈希網格 - 優化效能
        this.spatialGrid = {};
        this.spatialGridCellSize = CONFIG.SPATIAL_HASH_CELL_SIZE;
        
        // 快取資料
        this.cache = {
            cubePositions: [],
            lastFrameTime: 0,
            frameCount: 0,
            fps: 0
        };
        
        // 立即設置畫布大小
        this.resizeCanvas();
        
        // 初始化曲線
        this.initLines();
        
        // 使用節流函數處理視窗大小變化事件
        window.addEventListener('resize', throttle(() => {
            this.resizeCanvas();
        }, 300)); // 行動裝置延長節流時間
        
        // 使用節流函數處理滾動事件，避免過度渲染
        window.addEventListener('scroll', throttle(() => {
            this.scrollY = window.scrollY;
        }, CONFIG.THROTTLE_SCROLL));
        
        // 嘗試立刻繪製一次，確保背景可見
        this.drawLines();
        
        // 開始動畫
        this.animate();
        
        console.log('行動裝置背景初始化完成 - 時間:', new Date().toLocaleTimeString());
    }
    
    // 調整 canvas 大小
    resizeCanvas() {
        if (!this.canvas || !this.ctx) {
            console.error('Canvas 未初始化！');
            return;
        }
        
        // 獲取視窗尺寸
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 行動裝置特殊處理 - 使用較低解析度以提高性能
        const pixelRatio = window.devicePixelRatio || 1;
        const scale = this.isMobile ? CONFIG.MOBILE_SCALE_FACTOR : 1;
        
        console.log(`調整 Canvas 尺寸: 視窗 ${width}x${height}, 縮放比例 ${scale}, 像素比 ${pixelRatio}`);
        
        // 設置 canvas 元素的實際尺寸
        this.canvas.width = Math.floor(width * scale);
        this.canvas.height = Math.floor(height * scale);
        
        // 重設上下文狀態，避免之前的設定影響
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 設置縮放比例，讓較低解析度的 canvas 仍能正確填滿螢幕
        if (scale !== 1) {
            this.ctx.scale(scale, scale);
        }
        
        // 確保基本樣式設置
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        
        // 重新初始化曲線
        this.initLines();
        
        // 立即繪製一次
        this.drawLines();
    }
    
    // 初始化曲線
    initLines() {
        this.lines = [];
        
        // 預計算常用值
        const PI2 = Math.PI * 2;
        const pointCountDiff = CONFIG.POINT_MAX_COUNT - CONFIG.POINT_MIN_COUNT + 1;
        const thicknessDiff = CONFIG.LINE_THICKNESS_MAX - CONFIG.LINE_THICKNESS_MIN;
        const amplitudeDiff = CONFIG.POINT_AMPLITUDE_MAX - CONFIG.POINT_AMPLITUDE_MIN;
        const cubeSpeedDiff = CONFIG.CUBE_SPEED_MAX - CONFIG.CUBE_SPEED_MIN;
        const canvasHeight = this.canvas.height / CONFIG.MOBILE_SCALE_FACTOR;
        
        for (let i = 0; i < this.lineCount; i++) {
            const pointCount = Math.floor(Math.random() * pointCountDiff) + CONFIG.POINT_MIN_COUNT;
            const yPosition = Math.random() * canvasHeight;
            const seed = Math.random() * 1000;
            const phaseOffset = Math.random() * PI2;
            
            const line = {
                points: new Array(pointCount),
                pointCount: pointCount,
                yPosition: yPosition,
                speed: Math.random() * 0.05 + 0.025, // 降低速度
                thickness: (Math.random() * thicknessDiff + CONFIG.LINE_THICKNESS_MIN) * 0.7,
                opacity: CONFIG.LINE_OPACITY,
                seed: seed,
                phaseOffset: phaseOffset,
                cubes: new Array(this.cubesPerLine)
            };
            
            // 為每條曲線初始化立方體
            for (let j = 0; j < this.cubesPerLine; j++) {
                const offset = j / this.cubesPerLine + (Math.random() * 0.1);
                line.cubes[j] = {
                    offset: offset,
                    speed: (Math.random() * cubeSpeedDiff + CONFIG.CUBE_SPEED_MIN) * 0.4,
                    lastPosition: null
                };
            }
            
            // 計算寬度比例
            const canvasWidth = this.canvas.width / CONFIG.MOBILE_SCALE_FACTOR;
            const widthRatio = canvasWidth / (pointCount - 1);
            
            // 生成曲線上的點
            for (let j = 0; j < pointCount; j++) {
                const x = widthRatio * j;
                line.points[j] = {
                    x: x,
                    y: yPosition,
                    originalY: yPosition,
                    amplitude: Math.random() * amplitudeDiff + CONFIG.POINT_AMPLITUDE_MIN,
                    speed: Math.random() * 0.2 + 0.2, // 降低速度
                    phaseOffset: Math.random() * PI2,
                    xFactor: x * 0.01,
                };
            }
            
            this.lines.push(line);
        }
    }
    
    // 動畫循環
    animate() {
        try {
            const now = performance.now();
            // 降低行動裝置上的刷新率，節省電池
            if (now - this.lastFrameTime < CONFIG.MOBILE_ANIMATION_FRAME_INTERVAL) {
                requestAnimationFrame(() => this.animate());
                return;
            }
            this.lastFrameTime = now;
            
            this.drawLines();
            requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('Animation error:', error);
            // 出現錯誤時嘗試重新初始化
            setTimeout(() => {
                this.initialize(); // 完全重新初始化
            }, 1000);
        }
    }
    
    // 繪製曲線
    drawLines() {
        if (!this.ctx || !this.canvas) {
            console.error('Canvas 上下文未初始化！');
            return;
        }
        
        try {
            // 測量幀率
            const now = performance.now();
            if (now - this.cache.lastFrameTime >= 1000) {
                this.cache.fps = this.cache.frameCount;
                this.cache.frameCount = 0;
                this.cache.lastFrameTime = now;
            }
            this.cache.frameCount++;
            
            // 清除畫布
            this.ctx.clearRect(0, 0, this.canvas.width / CONFIG.MOBILE_SCALE_FACTOR, 
                                     this.canvas.height / CONFIG.MOBILE_SCALE_FACTOR);
            
            // 更新動畫時間
            this.animationTime += 0.005; // 降低動畫速度
            this.cubeRotation += 0.005;  // 降低旋轉速度
            
            // 重置空間哈希網格
            this.spatialGrid = {};
            
            // 清空立方體位置陣列
            const cubePositions = [];
            this.cache.cubePositions = cubePositions;
            
            // 繪製所有線條
            for (let lineIndex = 0; lineIndex < this.lines.length; lineIndex++) {
                const line = this.lines[lineIndex];
                const controlPoints = this.calculateControlPoints(line);
                
                // 繪製曲線本身
                this.drawSingleLine(line, controlPoints);
                
                // 繪製曲線上的立方體
                this.drawCubesOnLine(line, controlPoints, lineIndex, cubePositions);
            }
            
            // 只有在效能較好的裝置上才繪製連線
            if (!this.isMobile || this.cache.fps > 15) {
                this.drawCubeConnections(cubePositions);
            }
        } catch (error) {
            console.error('繪製錯誤:', error);
        }
    }
    
    // 計算控制點
    calculateControlPoints(line) {
        const pointCount = line.points.length;
        const controlPoints = new Array(pointCount);
        
        for (let i = 0; i < pointCount; i++) {
            const point = line.points[i];
            
            // 簡化計算，減少三角函數使用
            const scrollAngle = (this.scrollY * 0.001) + (point.x * 0.0005) + line.seed;
            const scrollEffect = Math.sin(scrollAngle) * point.amplitude;
            
            const idleAngle = this.animationTime * point.speed + point.phaseOffset;
            const idleEffect = Math.sin(idleAngle) * (point.amplitude * 0.15);
            
            // 調整 Y 坐標
            const adjustedY = (point.originalY % (this.canvas.height / CONFIG.MOBILE_SCALE_FACTOR)) + 
                           scrollEffect + 
                           idleEffect;
            
            controlPoints[i] = {
                x: point.x,
                y: adjustedY
            };
        }
        
        return controlPoints;
    }
    
    // 繪製單條曲線
    drawSingleLine(line, controlPoints) {
        if (!controlPoints || controlPoints.length === 0) return;
        
        const ctx = this.ctx;
        if (!ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
        
        // 使用點對點直線連接代替貝茲曲線，減少計算量
        for (let i = 1; i < controlPoints.length; i++) {
            ctx.lineTo(controlPoints[i].x, controlPoints[i].y);
        }
        
        // 繪製線條
        ctx.strokeStyle = `rgba(${CONFIG.LINE_COLOR}, ${line.opacity})`;
        ctx.lineWidth = line.thickness;
        ctx.stroke();
    }
    
    // 繪製曲線上的立方體
    drawCubesOnLine(line, controlPoints, lineIndex, cubePositions) {
        if (!controlPoints || controlPoints.length < 2) return;
        
        const ctx = this.ctx;
        if (!ctx) return;
        
        // 計算曲線的總長度
        const totalLength = this.calculateLineLength(controlPoints);
        
        // 繪製每個立方體
        for (let i = 0; i < line.cubes.length; i++) {
            const cube = line.cubes[i];
            
            // 更新立方體的位置
            cube.offset += cube.speed;
            if (cube.offset > 1) cube.offset -= 1;
            
            // 計算立方體在曲線上的位置
            const position = this.getPointOnLine(controlPoints, cube.offset, totalLength);
            
            // 繪製立方體
            this.drawCube(ctx, position.x, position.y, lineIndex, i);
            
            // 儲存立方體位置用於之後繪製連線
            cubePositions.push({
                x: position.x,
                y: position.y,
                lineIndex: lineIndex,
                cubeIndex: i
            });
            
            // 添加到空間哈希
            this.addToSpatialHash(position.x, position.y, cubePositions.length - 1);
        }
    }
    
    // 計算曲線長度
    calculateLineLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }
    
    // 根據偏移量獲取曲線上的點
    getPointOnLine(points, offset, totalLength) {
        let targetLength = offset * totalLength;
        let currentLength = 0;
        
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i-1];
            const p2 = points[i];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentLength + segmentLength >= targetLength) {
                const t = (targetLength - currentLength) / segmentLength;
                return {
                    x: p1.x + dx * t,
                    y: p1.y + dy * t
                };
            }
            
            currentLength += segmentLength;
        }
        
        // 如果到達終點，返回最後一個點
        return { 
            x: points[points.length - 1].x, 
            y: points[points.length - 1].y 
        };
    }
    
    // 繪製立方體
    drawCube(ctx, x, y, lineIndex, cubeIndex) {
        const size = this.cubeSize;
        const halfSize = size / 2;
        
        // 繪製簡化的立方體 (實際上是一個正方形)
        ctx.fillStyle = `rgba(${CONFIG.LINE_COLOR}, 0.8)`;
        ctx.fillRect(x - halfSize, y - halfSize, size, size);
    }
    
    // 添加到空間哈希
    addToSpatialHash(x, y, index) {
        const cellSize = this.spatialGridCellSize;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const key = `${cellX},${cellY}`;
        
        if (!this.spatialGrid[key]) {
            this.spatialGrid[key] = [];
        }
        
        this.spatialGrid[key].push(index);
    }
    
    // 繪製立方體之間的連線
    drawCubeConnections(cubePositions) {
        if (cubePositions.length === 0) return;
        
        const ctx = this.ctx;
        if (!ctx) return;
        
        // 使用簡單的點對點連線
        for (let i = 0; i < cubePositions.length; i++) {
            const p1 = cubePositions[i];
            
            // 檢查相鄰的空間哈希格子
            const neighbors = this.getNeighborsFromSpatialHash(p1.x, p1.y);
            
            for (let j = 0; j < neighbors.length; j++) {
                const neighborIndex = neighbors[j];
                
                // 避免重複連線
                if (neighborIndex <= i) continue;
                
                const p2 = cubePositions[neighborIndex];
                
                // 計算距離
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distSquared = dx * dx + dy * dy;
                
                // 如果距離在閾值內，繪製連線
                if (distSquared < this.connectionDistanceSquared) {
                    const alpha = 1 - (Math.sqrt(distSquared) / this.connectionDistance);
                    ctx.strokeStyle = `rgba(${CONFIG.LINE_COLOR}, ${alpha * 0.3})`;
                    ctx.lineWidth = 0.3;
                    
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }
    
    // 從空間哈希中獲取鄰居
    getNeighborsFromSpatialHash(x, y) {
        const cellSize = this.spatialGridCellSize;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const neighbors = [];
        
        // 檢查當前格子和周圍的格子
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                if (this.spatialGrid[key]) {
                    neighbors.push(...this.spatialGrid[key]);
                }
            }
        }
        
        return neighbors;
    }
}

// 立即啟動背景效果
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已加載，初始化行動背景效果');
    window.backgroundLines = new BackgroundLines();
});

// 確保即使在 DOMContentLoaded 後加載腳本也能初始化
if (document.readyState !== 'loading') {
    console.log('DOM 已經準備好，立即初始化行動背景效果');
    window.backgroundLines = new BackgroundLines();
}