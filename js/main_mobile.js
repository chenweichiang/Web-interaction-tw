// main_mobile.js - 行動裝置優化版
// 這是 main.js 的輕量版，專為行動裝置設計，減少計算量和效果複雜度

// 網頁背景參數設定區 - 針對行動裝置優化
console.log('行動裝置背景腳本已載入');

const CONFIG = {
    // 背景曲線基本參數
    LINE_COUNT: 8,                    // 曲線數量大幅減少
    LINE_THICKNESS_MIN: 1,            // 增加最小線條粗細，更容易看到
    LINE_THICKNESS_MAX: 2,            // 增加最大線條粗細，更容易看到
    LINE_OPACITY: 1,                  // 最大不透明度，更容易看到
    LINE_COLOR: "50, 50, 50",         // 線條顏色更深 (RGB格式)
    
    // 曲線點相關參數
    POINT_MIN_COUNT: 3,               // 每條曲線上最少點數
    POINT_MAX_COUNT: 4,               // 每條曲線上最多點數減少
    POINT_AMPLITUDE_MIN: 25,          // 增加振幅最小值，使波動更明顯
    POINT_AMPLITUDE_MAX: 100,         // 增加振幅最大值，使波動更明顯
    
    // 小立方體相關參數
    CUBE_SIZE: 4,                     // 小立方體的大小減少 (原為 5)
    CUBES_PER_LINE: 5,                // 每條曲線上的立方體數量減少 (原為 30)
    CUBE_SPEED_MIN: 0.0001,           // 立方體最小移動速度
    CUBE_SPEED_MAX: 0.0006,           // 立方體最大移動速度減少 (原為 0.0010)
    
    // 連線相關參數
    CONNECTION_DISTANCE: 60,          // 立方體間連線的最大距離減少 (原為 90)
    CONNECTION_DISTANCE_SQUARED: 3600, // 連線距離的平方值減少 (原為 10000)
    CONNECTION_LAYERS: 3,             // 不同層級的連線數減少 (原為 13)
    
    // 三角形填充相關參數
    MIN_TRIANGLE_AREA: 3000,          // 最小三角形面積減少 (過濾更多三角形)
    TRIANGLE_ALPHA_MIN: 0.1,          // 三角形透明度最小值
    TRIANGLE_ALPHA_MAX: 0.3,          // 三角形透明度最大值減少 (原為 0.5)
    TRIANGLE_COLOR_MAX: 200,          // 三角形灰階顏色最大值 (0-255)
    
    // 效能優化參數
    THROTTLE_SCROLL: 32,              // 滾動事件節流時間增加 (原為 16毫秒)
    SPATIAL_HASH_CELL_SIZE: 120,      // 空間哈希單元格大小增加 (原為 100)
    
    // 行動裝置專用優化參數
    MOBILE_RENDERING_INTERVAL: 3,     // 每隔幾幀才完整重繪（其他幀僅更新部分元素）
    DISABLE_TRIANGLES_ON_MOVEMENT: true, // 在頁面滾動時禁用三角形繪製
    LOW_POWER_MODE: false             // 低電量模式（可由使用者觸發）
};

// 檢查 CONFIG 對象，設置缺失的默認值
(function ensureConfigDefaults() {
    const defaults = {
        LINE_COUNT: 15,
        LINE_THICKNESS_MIN: 0.3,
        LINE_THICKNESS_MAX: 1,
        LINE_OPACITY: 0.8,
        LINE_COLOR: "120, 120, 120",
        POINT_MIN_COUNT: 3,
        POINT_MAX_COUNT: 5,
        POINT_AMPLITUDE_MIN: 15,
        POINT_AMPLITUDE_MAX: 80,
        CUBE_SIZE: 4,
        CUBES_PER_LINE: 5,
        CUBE_SPEED_MIN: 0.0001,
        CUBE_SPEED_MAX: 0.0006,
        CONNECTION_DISTANCE: 60,
        CONNECTION_LAYERS: 3,
        MIN_TRIANGLE_AREA: 3000,
        TRIANGLE_ALPHA_MIN: 0.1,
        TRIANGLE_ALPHA_MAX: 0.3,
        TRIANGLE_COLOR_MAX: 200,
        THROTTLE_SCROLL: 32,
        SPATIAL_HASH_CELL_SIZE: 120,
        MOBILE_RENDERING_INTERVAL: 3,
        DISABLE_TRIANGLES_ON_MOVEMENT: true,
        LOW_POWER_MODE: false
    };
    
    // 檢查並設置缺失的值
    for (const key in defaults) {
        if (!CONFIG.hasOwnProperty(key)) {
            CONFIG[key] = defaults[key];
        }
    }
    
    // 計算衍生值
    if (!CONFIG.hasOwnProperty('CONNECTION_DISTANCE_SQUARED')) {
        CONFIG.CONNECTION_DISTANCE_SQUARED = CONFIG.CONNECTION_DISTANCE * CONFIG.CONNECTION_DISTANCE;
    }
    
    console.log('行動裝置配置檢查完成，所有必要參數都已設置');
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

// 行動裝置檢測
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

// 背景曲線效果 - 行動裝置優化版
class BackgroundLinesMobile {
    constructor() {
        this.canvas = document.getElementById('background-canvas');
        
        // 檢查 canvas 元素是否存在
        if (!this.canvas) {
            console.log('找不到 background-canvas 元素，正在創建...');
            
            // 如果找不到，手動創建一個
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'background-canvas';
            document.body.insertBefore(this.canvas, document.body.firstChild);
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
        this.connectionDistanceSquared = CONFIG.CONNECTION_DISTANCE_SQUARED;
        this.connectionLayers = CONFIG.CONNECTION_LAYERS;
        
        // 空間哈希網格 - 用於更高效地找到彼此接近的立方體
        this.spatialGrid = {};
        this.spatialGridCellSize = CONFIG.SPATIAL_HASH_CELL_SIZE;
        
        // 行動裝置專用變量
        this.frameCounter = 0;
        this.isMoving = false;
        this.movingTimeout = null;
        this.lastDrawTime = 0;
        this.targetFPS = 30; // 目標幀率
        this.fpsInterval = 1000 / this.targetFPS;
        
        // 效能監測
        this.performanceStats = {
            framesDrawn: 0,
            skippedFrames: 0,
            lastFpsUpdate: 0,
            currentFps: 0
        };
        
        this.resizeCanvas();
        this.initLines();
        
        // 使用節流函數處理視窗大小變化事件
        window.addEventListener('resize', throttle(() => {
            this.resizeCanvas();
        }, 200)); // 行動裝置上更寬鬆的節流
        
        // 使用節流函數處理滾動事件，避免過度渲染
        window.addEventListener('scroll', throttle(() => {
            this.scrollY = window.scrollY;
            this.isMoving = true;
            
            // 清除之前的計時器
            if (this.movingTimeout) {
                clearTimeout(this.movingTimeout);
            }
            
            // 設置新的計時器
            this.movingTimeout = setTimeout(() => {
                this.isMoving = false;
            }, 300);
            
            // 當滾動時，使用最簡單的渲染
            this.drawLines(true);
        }, CONFIG.THROTTLE_SCROLL));
        
        // 開始動畫
        this.animate();
        
        console.log('行動裝置背景動畫已初始化');
    }
    
    // 調整 canvas 大小
    resizeCanvas() {
        console.log('正在設置 Canvas 大小和樣式...');
        
        // 確保 canvas 在頁面上正確顯示
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        
        // *** 添加背景色以便確認 canvas 是否可見 ***
        this.canvas.style.backgroundColor = 'rgba(255,255,255,0.95)';
        this.canvas.style.display = 'block !important';
        
        // 移除可能的隱藏屬性
        document.getElementById('background-canvas').removeAttribute('hidden');
        
        // 行動裝置上降低解析度以提高效能
        const dpr = 1; // 固定為1，不使用裝置像素比
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        console.log(`Canvas 尺寸已調整: ${this.canvas.width}x${this.canvas.height}`);
        
        // 初始線條前填充背景
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.initLines(); // 重新初始化曲線
    }
    
    // 初始化曲線
    initLines() {
        this.lines = [];
        
        // 提前計算一些常用值
        const pointCountDiff = CONFIG.POINT_MAX_COUNT - CONFIG.POINT_MIN_COUNT + 1;
        const thicknessDiff = CONFIG.LINE_THICKNESS_MAX - CONFIG.LINE_THICKNESS_MIN;
        const amplitudeDiff = CONFIG.POINT_AMPLITUDE_MAX - CONFIG.POINT_AMPLITUDE_MIN;
        const cubeSpeedDiff = CONFIG.CUBE_SPEED_MAX - CONFIG.CUBE_SPEED_MIN;
        
        for (let i = 0; i < this.lineCount; i++) {
            const pointCount = Math.floor(Math.random() * pointCountDiff) + CONFIG.POINT_MIN_COUNT;
            const yPosition = Math.random() * this.canvas.height;
            const seed = Math.random() * 1000;
            const phaseOffset = Math.random() * Math.PI * 2;
            
            const line = {
                points: [],
                pointCount: pointCount,
                yPosition: yPosition,
                speed: Math.random() * 0.1 + 0.05, // 降低速度
                thickness: (Math.random() * thicknessDiff + CONFIG.LINE_THICKNESS_MIN) * 0.7,
                opacity: CONFIG.LINE_OPACITY,
                seed: seed,
                phaseOffset: phaseOffset,
                cubes: []
            };
            
            // 為每條曲線初始化多個立方體
            for (let j = 0; j < this.cubesPerLine; j++) {
                const offset = j / this.cubesPerLine + (Math.random() * 0.1);
                line.cubes.push({
                    offset: offset,
                    speed: (Math.random() * cubeSpeedDiff + CONFIG.CUBE_SPEED_MIN) * 0.4
                });
            }
            
            // 預計算寬度比例
            const widthRatio = this.canvas.width / (pointCount - 1);
            
            // 生成曲線上的點
            for (let j = 0; j < pointCount; j++) {
                const x = widthRatio * j;
                line.points.push({
                    x: x,
                    y: yPosition,
                    originalY: yPosition,
                    amplitude: Math.random() * amplitudeDiff + CONFIG.POINT_AMPLITUDE_MIN,
                    speed: Math.random() * 0.3 + 0.3, // 降低速度
                    phaseOffset: Math.random() * Math.PI * 2
                });
            }
            
            this.lines.push(line);
        }
    }
    
    // 繪製曲線
    drawLines(simplifiedMode = false) {
        const now = performance.now();
        
        // 幀率控制 - 每幀至少需要經過的毫秒數
        if (now - this.lastDrawTime < this.fpsInterval) {
            this.performanceStats.skippedFrames++;
            return; // 跳過這一幀
        }
        
        this.lastDrawTime = now;
        this.performanceStats.framesDrawn++;
        
        // 更新 FPS 計數
        if (now - this.performanceStats.lastFpsUpdate >= 1000) {
            this.performanceStats.currentFps = this.performanceStats.framesDrawn;
            this.performanceStats.framesDrawn = 0;
            this.performanceStats.lastFpsUpdate = now;
            
            // 根據 FPS 動態調整複雜度
            this.adjustComplexityBasedOnPerformance();
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.animationTime += 0.01;
        this.cubeRotation += 0.01; // 降低旋轉速度
        
        // 重置空間哈希網格
        this.spatialGrid = {};
        
        // 清空立方體位置陣列
        const cubePositions = [];
        
        // 行動裝置下使用較簡單的渲染方式
        const lineCount = this.lines.length;
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            const line = this.lines[lineIndex];
            
            // 計算控制點
            const controlPoints = [];
            for (let i = 0; i < line.points.length; i++) {
                const point = line.points[i];
                
                // 簡化效果
                const scrollEffect = simplifiedMode ? 0 : Math.sin((this.scrollY * 0.002) + line.seed) * point.amplitude * 0.5;
                const idleAngle = this.animationTime * point.speed + point.phaseOffset;
                const idleEffect = Math.sin(idleAngle) * (point.amplitude * 0.15);
                
                const adjustedY = (point.originalY % this.canvas.height) + 
                               scrollEffect + 
                               idleEffect;
                
                controlPoints.push({
                    x: point.x,
                    y: adjustedY
                });
            }
            
            // 繪製曲線
            this.ctx.beginPath();
            this.ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
            
            // 使用更簡單的曲線方式
            for (let i = 1; i < controlPoints.length; i++) {
                const current = controlPoints[i];
                const prev = controlPoints[i - 1];
                
                // 行動裝置上使用更簡單的線性連接
                if (simplifiedMode || this.isMoving) {
                    this.ctx.lineTo(current.x, current.y);
                } else {
                    // 較簡單的貝塞爾曲線
                    const midX = (prev.x + current.x) / 2;
                    const midY = (prev.y + current.y) / 2;
                    this.ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
                    
                    if (i === controlPoints.length - 1) {
                        this.ctx.lineTo(current.x, current.y);
                    }
                }
            }
            
            this.ctx.strokeStyle = `rgba(${CONFIG.LINE_COLOR}, ${line.opacity})`;
            this.ctx.lineWidth = line.thickness;
            this.ctx.stroke();
            
            // 僅在沒有滾動且非簡化模式時繪製立方體
            if (!simplifiedMode && !this.isMoving) {
                this.drawCubesForLine(line, controlPoints, lineIndex, cubePositions);
            }
        }
        
        // 立方體連線 - 僅在靜止狀態且每 N 幀繪製一次
        if (!this.isMoving && !simplifiedMode && this.frameCounter % CONFIG.MOBILE_RENDERING_INTERVAL === 0) {
            this.drawCubeConnections(cubePositions);
        }
        
        // 每幀增加計數
        this.frameCounter++;
    }
    
    // 為單條曲線繪製立方體
    drawCubesForLine(line, controlPoints, lineIndex, cubePositions) {
        for (const cube of line.cubes) {
            // 更新立方體位置
            cube.offset = (cube.offset + cube.speed) % 1;
            
            // 計算立方體在曲線上的位置
            const position = this.getPositionOnCurve(controlPoints, cube.offset);
            
            if (position) {
                // 立方體使用方形取代，減少繪圖複雜度
                this.drawSimpleCube(position.x, position.y, this.cubeSize, `rgba(${CONFIG.LINE_COLOR}, ${line.opacity})`);
                
                // 將立方體添加到空間哈希網格
                this.addToSpatialGrid(position.x, position.y, cubePositions.length);
                
                // 保存立方體位置
                cubePositions.push({
                    x: position.x,
                    y: position.y,
                    lineIndex: lineIndex
                });
            }
        }
    }
    
    // 繪製簡化立方體（行動裝置專用）
    drawSimpleCube(x, y, size, color) {
        const halfSize = size / 2;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(this.cubeRotation * 0.5); // 降低旋轉複雜度
        
        // 繪製簡單方形
        this.ctx.strokeStyle = color;
        this.ctx.strokeRect(-halfSize, -halfSize, size, size);
        
        this.ctx.restore();
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
        
        // 僅檢查當前單元格和上下左右四個相鄰單元格（減少對角線檢查）
        const neighbors = [
            {dx: 0, dy: 0},   // 當前單元格
            {dx: 0, dy: 1},   // 上
            {dx: 0, dy: -1},  // 下
            {dx: 1, dy: 0},   // 右
            {dx: -1, dy: 0}   // 左
        ];
        
        for (const neighbor of neighbors) {
            const cellKey = `${cellX + neighbor.dx},${cellY + neighbor.dy}`;
            if (this.spatialGrid[cellKey]) {
                result.push(...this.spatialGrid[cellKey]);
            }
        }
        
        return result;
    }
    
    // 簡化版的立方體連線繪製
    drawCubeConnections(cubePositions) {
        const cubeCount = cubePositions.length;
        if (cubeCount < 2) return;
        
        this.ctx.strokeStyle = 'rgba(10, 10, 10, 0.2)';
        this.ctx.lineWidth = 0.5;
        
        // 使用空間哈希網格進行更高效的距離檢查
        for (let i = 0; i < cubeCount; i++) {
            const p1 = cubePositions[i];
            
            // 只檢查鄰近單元格中的立方體，而不是所有立方體
            const nearbyIndices = this.getNearbyObjects(p1.x, p1.y);
            
            this.ctx.beginPath();
            let hasConnections = false;
            
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
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    hasConnections = true;
                }
            }
            
            // 只有在有連線時才繪製
            if (hasConnections) {
                this.ctx.stroke();
            }
        }
    }
    
    // 獲取曲線上的點（簡化版）
    getPositionOnCurve(points, offset) {
        const pointCount = points.length;
        if (pointCount < 2) return null;
        
        // 邊界情況
        if (offset === 0) return { x: points[0].x, y: points[0].y };
        if (offset === 1) return { x: points[pointCount - 1].x, y: points[pointCount - 1].y };
        
        // 簡單線性插值
        const segment = Math.floor(offset * (pointCount - 1));
        const segmentOffset = (offset * (pointCount - 1)) % 1;
        
        // 確保段索引有效
        const segmentIndex = Math.min(segment, pointCount - 2);
        
        const p0 = points[segmentIndex];
        const p1 = points[segmentIndex + 1];
        
        return {
            x: p0.x + (p1.x - p0.x) * segmentOffset,
            y: p0.y + (p1.y - p0.y) * segmentOffset
        };
    }
    
    // 根據效能調整複雜度
    adjustComplexityBasedOnPerformance() {
        const fps = this.performanceStats.currentFps;
        
        // 如果 FPS 過低，減少複雜度
        if (fps < 20) {
            // 減少的曲線數量
            if (this.lineCount > 5) {
                this.lineCount = Math.max(5, this.lineCount - 2);
                this.initLines();
            }
            
            // 增加渲染間隔
            CONFIG.MOBILE_RENDERING_INTERVAL = Math.min(6, CONFIG.MOBILE_RENDERING_INTERVAL + 1);
            
            console.log(`效能優化: FPS=${fps}, 減少曲線數量至 ${this.lineCount}, 渲染間隔增加至 ${CONFIG.MOBILE_RENDERING_INTERVAL}`);
        } 
        // 如果 FPS 很好，可以適度增加複雜度
        else if (fps > 45 && this.lineCount < CONFIG.LINE_COUNT) {
            this.lineCount = Math.min(CONFIG.LINE_COUNT, this.lineCount + 1);
            this.initLines();
            
            console.log(`效能良好: FPS=${fps}, 增加曲線數量至 ${this.lineCount}`);
        }
    }
    
    // 動畫循環
    animate() {
        try {
            // 檢查效能通知頻率
            if (this.frameCounter % 300 === 0) {
                console.log(`行動背景動畫運行中: FPS=${this.performanceStats.currentFps}, 曲線數=${this.lineCount}`);
            }
            
            // 繪製
            this.drawLines();
            
            // 請求下一幀
            requestAnimationFrame(() => this.animate());
        } catch (error) {
            console.error('動畫循環錯誤:', error);
            
            // 嘗試恢復
            setTimeout(() => {
                console.log('嘗試恢復動畫...');
                this.animate();
            }, 2000);
        }
    }
    
    // 切換低功耗模式
    toggleLowPowerMode() {
        CONFIG.LOW_POWER_MODE = !CONFIG.LOW_POWER_MODE;
        
        if (CONFIG.LOW_POWER_MODE) {
            // 儲存當前設定
            this._savedConfig = {
                lineCount: this.lineCount,
                cubesPerLine: this.cubesPerLine,
                renderingInterval: CONFIG.MOBILE_RENDERING_INTERVAL
            };
            
            // 最低設定
            this.lineCount = 5;
            this.cubesPerLine = 2;
            CONFIG.MOBILE_RENDERING_INTERVAL = 6;
            this.targetFPS = 20;
            this.fpsInterval = 1000 / this.targetFPS;
            
            this.initLines();
        } else {
            // 恢復設定
            if (this._savedConfig) {
                this.lineCount = this._savedConfig.lineCount;
                this.cubesPerLine = this._savedConfig.cubesPerLine;
                CONFIG.MOBILE_RENDERING_INTERVAL = this._savedConfig.renderingInterval;
                this.targetFPS = 30;
                this.fpsInterval = 1000 / this.targetFPS;
                
                this.initLines();
            }
        }
        
        return { 
            enabled: CONFIG.LOW_POWER_MODE, 
            message: CONFIG.LOW_POWER_MODE ? '已啟用低功耗模式' : '已恢復正常模式'
        };
    }
}

// 當 DOM 載入完成時初始化背景和其他功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 已載入 - 正在檢測裝置類型...');
    
    try {
        // 確保 canvas 元素存在
        if (!document.getElementById('background-canvas')) {
            console.log('找不到 background-canvas 元素，將自動創建');
            const canvas = document.createElement('canvas');
            canvas.id = 'background-canvas';
            document.body.insertBefore(canvas, document.body.firstChild);
        }
        
        // 初始化背景
        const bgLines = new BackgroundLinesMobile();
        console.log('行動裝置背景效果已初始化');
        
        // 將背景系統暴露在全局，以便可以進行控制
        window.mobileBackground = bgLines;
        
        // 滑動導航效果
        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            navContainer.addEventListener('click', function(e) {
                if (e.target.tagName.toLowerCase() === 'a') {
                    e.preventDefault();
                    
                    const targetId = e.target.getAttribute('href');
                    const targetSection = document.querySelector(targetId);
                    
                    if (targetSection) {
                        window.scrollTo({
                            top: targetSection.offsetTop - 70,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        }
        
        // 節流的滾動效果
        const throttledScroll = throttle(function() {
            const header = document.querySelector('header');
            if (header) {
                if (window.scrollY > 0) {
                    header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                } else {
                    header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }
            }
        }, CONFIG.THROTTLE_SCROLL);
        
        window.addEventListener('scroll', throttledScroll);
        
        // 添加電池狀態監控（如果瀏覽器支援）
        if ('getBattery' in navigator) {
            navigator.getBattery().then(function(battery) {
                function checkBattery() {
                    // 電量低於 15% 時自動啟用低功耗模式
                    if (battery.level < 0.15 && !CONFIG.LOW_POWER_MODE) {
                        console.log(`電量低 (${battery.level * 100}%)，自動啟用低功耗模式`);
                        if (window.mobileBackground && window.mobileBackground.toggleLowPowerMode) {
                            window.mobileBackground.toggleLowPowerMode();
                        }
                    }
                }
                
                // 初次檢查
                checkBattery();
                
                // 監聽電池變化
                battery.addEventListener('levelchange', checkBattery);
            });
        }
        
    } catch (error) {
        console.error('初始化行動裝置背景時發生錯誤:', error);
    }
});

// 添加簡單的行動裝置調試工具到全局空間
window.debugMobileCanvas = {
    // 獲取當前背景系統的狀態信息
    getStatus: function() {
        if (!window.mobileBackground) {
            return { error: '背景系統尚未初始化' };
        }
        
        return {
            fps: window.mobileBackground.performanceStats.currentFps,
            lineCount: window.mobileBackground.lineCount,
            renderingInterval: CONFIG.MOBILE_RENDERING_INTERVAL,
            lowPowerMode: CONFIG.LOW_POWER_MODE,
            canvasDimensions: {
                width: window.mobileBackground.canvas.width,
                height: window.mobileBackground.canvas.height
            }
        };
    },
    
    // 切換低功耗模式
    toggleLowPowerMode: function() {
        if (window.mobileBackground && window.mobileBackground.toggleLowPowerMode) {
            return window.mobileBackground.toggleLowPowerMode();
        } else {
            return { error: '背景系統尚未初始化' };
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
