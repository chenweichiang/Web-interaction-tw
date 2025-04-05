// 背景曲線效果
class BackgroundLines {
    constructor() {
        this.canvas = document.getElementById('background-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.lines = [];
        this.lineCount = 70; // 增加曲線數量到70條，讓畫面更複雜
        this.scrollY = 0;
        this.animationTime = 0; // 添加動畫時間計數器，用於靜止時的動畫
        
        this.cubeSize = 5; // 小立方體的大小
        this.cubeRotation = 0; // 小立方體的旋轉角度
        this.cubesPerLine = 5; // 每條曲線上的立方體數量增加到5個
        this.cubeConnections = []; // 儲存立方體之間的連線資訊
        this.connectionDistance = 250; // 連線的最大距離
        this.connectionLayers = 3; // 不同層級的連線
        
        this.resizeCanvas();
        this.initLines();
        
        // 監聽視窗大小變化
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 監聽頁面滾動
        window.addEventListener('scroll', () => {
            this.scrollY = window.scrollY;
            this.drawLines(); // 每次滾動時重新繪製
        });
        
        // 開始動畫
        this.animate();
    }
    
    // 調整 canvas 大小
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'fixed'; // 確保 canvas 固定在視窗中
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        this.initLines(); // 重新初始化曲線
    }
    
    // 初始化曲線
    initLines() {
        this.lines = [];
        
        for (let i = 0; i < this.lineCount; i++) {
            const line = {
                points: [],
                pointCount: Math.floor(Math.random() * 4) + 5, // 增加點數量 (5-8)，使曲線更平滑
                yPosition: Math.random() * this.canvas.height, // 曲線的 y 位置
                speed: Math.random() * 0.2 + 0.1, // 曲線變化速度
                thickness: (Math.random() * 1 + 0.3) * 0.7, // 線條粗細減少30% (0.21-0.91)
                opacity: 0.8, // 設定透明度為 80%
                seed: Math.random() * 1000, // 用於生成變化的隨機種子
                phaseOffset: Math.random() * Math.PI * 2, // 添加相位偏移，使靜止時的動畫不同同步
                cubes: [] // 儲存曲線上的多個立方體
            };
            
            // 為每條曲線初始化多個立方體
            for (let j = 0; j < this.cubesPerLine; j++) {
                line.cubes.push({
                    offset: j / this.cubesPerLine + (Math.random() * 0.1), // 將曲線均勻分配立方體，並添加一些隨機性
                    speed: (Math.random() * 0.005 + 0.001) * 0.4 // 小立方體在線條上移動的速度
                });
            }
            
            // 生成曲線上的點，每個點有自己的特性
            for (let j = 0; j < line.pointCount; j++) {
                line.points.push({
                    x: (this.canvas.width / (line.pointCount - 1)) * j, // 分布在整個寬度
                    y: line.yPosition,
                    originalY: line.yPosition,
                    amplitude: Math.random() * 120 + 30, // 振幅 (30-150)
                    speed: Math.random() * 0.5 + 0.5, // 每個點有自己的速度
                    phaseOffset: Math.random() * Math.PI * 2 // 每個點有自己的相位偏移
                });
            }
            
            this.lines.push(line);
        }
    }
    
    // 繪製曲線
    drawLines() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.animationTime += 0.01; // 每幀增加動畫時間
        this.cubeRotation += 0.02; // 更新立方體旋轉角度
        
        // 計算每條曲線上的立方體位置，用於後續連線
        const cubePositions = [];
        
        for (const line of this.lines) {
            this.ctx.beginPath();
            
            // 創建控制點數組，用於使曲線更平滑
            const controlPoints = [];
            
            // 先計算所有點的新位置
            for (let i = 0; i < line.points.length; i++) {
                const point = line.points[i];
                
                // 每個點獨立變化
                const scrollEffect = Math.sin((this.scrollY * 0.003) + (point.x * 0.002) + line.seed) * point.amplitude;
                
                // 使用每個點獨立的速度和相位
                const idleEffect = Math.sin(
                    this.animationTime * point.speed + 
                    point.phaseOffset + 
                    (point.x * 0.01)
                ) * (point.amplitude * 0.2);
                
                // 添加一個額外的變化，使曲線形狀更複雜
                const secondaryEffect = Math.cos(
                    this.animationTime * (point.speed * 0.7) + 
                    point.phaseOffset * 2 + 
                    (point.x * 0.02)
                ) * (point.amplitude * 0.1);
                
                // 計算每個點的最終位置
                const adjustedY = (point.originalY % this.canvas.height) + 
                                  scrollEffect + 
                                  idleEffect + 
                                  secondaryEffect;
                
                controlPoints.push({
                    x: point.x,
                    y: adjustedY
                });
            }
            
            // 使用新計算的點繪製更平滑的曲線
            if (controlPoints.length > 0) {
                this.ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
                
                for (let i = 1; i < controlPoints.length; i++) {
                    // 使用前一個點和當前點計算控制點
                    const prev = controlPoints[i - 1];
                    const current = controlPoints[i];
                    
                    if (i === 1) {
                        // 第一段曲線
                        const next = controlPoints[i + 1] || current;
                        const cp1x = prev.x + (current.x - prev.x) / 4;
                        const cp1y = prev.y + (current.y - prev.y) / 4;
                        const cp2x = current.x - (next.x - prev.x) / 4;
                        const cp2y = current.y - (next.y - prev.y) / 4;
                        
                        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
                    } else if (i === controlPoints.length - 1) {
                        // 最後一段曲線
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
            }
            
            // 設置曲線樣式，透明度設為 80%
            this.ctx.strokeStyle = `rgba(120, 120, 120, ${line.opacity})`;
            this.ctx.lineWidth = line.thickness;
            this.ctx.stroke();
            
            // 保存曲線路徑用於檢測立方體是否在線上
            const linePath = new Path2D();
            for (let i = 0; i < controlPoints.length; i++) {
                if (i === 0) {
                    linePath.moveTo(controlPoints[i].x, controlPoints[i].y);
                } else {
                    linePath.lineTo(controlPoints[i].x, controlPoints[i].y);
                }
            }
            
            // 繪製曲線上的多個小立方體並保存位置
            for (const cube of line.cubes) {
                // 更新立方體在線條上的位置
                cube.offset = (cube.offset + cube.speed) % 1;
                
                // 計算立方體在曲線上的確切位置
                const position = this.getExactPositionOnCurve(controlPoints, cube.offset);
                
                // 繪製立方體
                if (position) {
                    // 獲取位置附近曲線的切線方向，用於旋轉立方體
                    const tangent = this.getCurveTangent(controlPoints, cube.offset);
                    const angle = Math.atan2(tangent.y, tangent.x);
                    
                    // 使用線條顏色
                    const cubeColor = `rgba(120, 120, 120, ${line.opacity})`;
                    
                    // 繪製只有邊框線的小立方體
                    this.drawCube(position.x, position.y, this.cubeSize, angle, cubeColor);
                    
                    // 添加到立方體位置數組中，用於後續連線
                    cubePositions.push({
                        x: position.x,
                        y: position.y,
                        lineIndex: this.lines.indexOf(line)
                    });
                }
            }
        }
        
        // 繪製立方體之間的連線
        this.drawCubeConnections(cubePositions);
    }
    
    // 繪製立方體之間的連線
    drawCubeConnections(cubePositions) {
        this.cubes = cubePositions;
        
        // 如果立方體數量少於 2，無需繪製連線
        if (this.cubes.length < 2) return;
        
        // 遍歷所有可能的立方體對
        for (let i = 0; i < this.cubes.length; i++) {
            for (let j = i + 1; j < this.cubes.length; j++) {
                const p1 = this.cubes[i];
                const p2 = this.cubes[j];
                
                // 計算距離
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 根據距離決定是否連線
                if (distance < 100) {
                    // 短距離連線
                    // 設定線條顏色和寬度
                    const opacity = 1 - distance / 100;
                    this.ctx.strokeStyle = `rgba(10, 10, 10, ${opacity})`;
                    this.ctx.lineWidth = Math.max(0.1, (1 - distance / 100) * 1.5);
                    
                    // 繪製線條
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                    
                    // 保存連線資訊以供後續三角形填充使用
                    this.cubeConnections.push({
                        p1: i,
                        p2: j,
                        distance
                    });
                }
            }
        }
        
        // 尋找並填充短距離連線形成的三角形
        this.findAndFillTriangles(this.cubes, this.cubeConnections);
        
        // 清空連線資訊，為下一幀做準備
        this.cubeConnections = [];
    }
    
    // 尋找並填充由短距離連線形成的三角形
    findAndFillTriangles(positions, potentialEdges) {
        // 創建一個圖形結構來表示連線關係
        const graph = {};
        for (let i = 0; i < positions.length; i++) {
            graph[i] = [];
        }
        
        // 將所有短距離連線加入圖形
        for (const edge of potentialEdges) {
            graph[edge.p1].push(edge.p2);
            graph[edge.p2].push(edge.p1);
        }
        
        // 尋找所有可能的三角形
        const triangles = [];
        for (let i = 0; i < positions.length; i++) {
            const neighbors1 = graph[i];
            for (let j = 0; j < neighbors1.length; j++) {
                const neighbor1 = neighbors1[j];
                if (neighbor1 <= i) continue; // 避免重複
                
                for (let k = 0; k < neighbors1.length; k++) {
                    const neighbor2 = neighbors1[k];
                    if (neighbor2 <= neighbor1) continue; // 避免重複
                    
                    // 檢查這三個點是否形成三角形（第三邊是否存在）
                    if (graph[neighbor1].includes(neighbor2)) {
                        // 找到一個三角形
                        triangles.push([i, neighbor1, neighbor2]);
                    }
                }
            }
        }
        
        // 繪製找到的三角形
        for (const triangle of triangles) {
            const p1 = positions[triangle[0]];
            const p2 = positions[triangle[1]];
            const p3 = positions[triangle[2]];
            
            // 計算三角形面積，過小的三角形不繪製
            const area = this.calculateTriangleArea(p1, p2, p3);
            if (area < 1000) continue; // 過濾掉太小的三角形
            
            // 生成隨機的灰階顏色值 (0-40)，確保顏色偏黑色到灰色
            const greyValue = Math.floor(Math.random() * 40);
            
            // 生成隨機的透明度 (0.1-0.3)，保持在70%透明度左右
            const alpha = 0.1 + Math.random() * 0.2;
            
            // 繪製填充三角形
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.lineTo(p3.x, p3.y);
            this.ctx.closePath();
            
            // 使用波浪或漸變填充效果
            const gradient = this.ctx.createLinearGradient(p1.x, p1.y, p3.x, p3.y);
            const baseColor = greyValue;
            const endColor = Math.max(0, baseColor - 10); // 稍微深一點的顏色
            
            gradient.addColorStop(0, `rgba(${baseColor}, ${baseColor}, ${baseColor}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${endColor}, ${endColor}, ${endColor}, ${alpha})`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // 添加一點細微的紋理
            if (Math.random() > 0.7) {
                this.addTextureToTriangle(p1, p2, p3, alpha);
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
    
    // 在曲線上獲取確切的位置（改進後的方法，確保立方體完全在線上）
    getExactPositionOnCurve(points, offset) {
        if (points.length < 2) return { x: 0, y: 0 };
        
        // 如果是起點
        if (offset === 0) return { x: points[0].x, y: points[0].y };
        
        // 如果是終點
        if (offset === 1) return { x: points[points.length - 1].x, y: points[points.length - 1].y };
        
        // 計算總曲線長度的近似值
        let totalLength = 0;
        const segments = [];
        
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            totalLength += length;
            segments.push({
                startIndex: i-1,
                endIndex: i,
                length: length
            });
        }
        
        // 根據偏移量計算位置
        let targetLength = totalLength * offset;
        let currentLength = 0;
        
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (currentLength + segment.length >= targetLength) {
                const segmentOffset = (targetLength - currentLength) / segment.length;
                const start = points[segment.startIndex];
                const end = points[segment.endIndex];
                
                // 線性插值計算確切位置
                const x = start.x + (end.x - start.x) * segmentOffset;
                const y = start.y + (end.y - start.y) * segmentOffset;
                
                return { x, y };
            }
            currentLength += segment.length;
        }
        
        // 如果出現問題，返回曲線起點
        return { x: points[0].x, y: points[0].y };
    }
    
    // 獲取曲線在指定偏移量的切線方向
    getCurveTangent(points, offset) {
        if (points.length < 2) return { x: 1, y: 0 };
        
        // 類似於上面的方法，但返回的是切線方向
        let totalLength = 0;
        const segments = [];
        
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            totalLength += length;
            segments.push({ dx: dx / length, dy: dy / length, length });
        }
        
        let targetLength = totalLength * offset;
        let currentLength = 0;
        
        for (let i = 0; i < segments.length; i++) {
            if (currentLength + segments[i].length >= targetLength) {
                return { x: segments[i].dx, y: segments[i].dy };
            }
            currentLength += segments[i].length;
        }
        
        return { x: segments[segments.length-1].dx, y: segments[segments.length-1].dy };
    }
    
    // 繪製立體小立方體
    drawCube(x, y, size, rotation, color) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        
        const halfSize = size / 2;
        
        // 立方體的三個可見面，只繪製邊框
        const faces = [
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
        
        // 添加一些旋轉，使立方體看起來在晃動
        const wobble = Math.sin(this.animationTime * 3) * 0.1;
        this.ctx.rotate(wobble);
        
        // 繪製立方體的每個面，只繪製邊框
        for (const face of faces) {
            this.ctx.beginPath();
            this.ctx.moveTo(face.points[0].x, face.points[0].y);
            
            for (let i = 1; i < face.points.length; i++) {
                this.ctx.lineTo(face.points[i].x, face.points[i].y);
            }
            
            this.ctx.closePath();
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    // 動畫循環
    animate() {
        this.drawLines();
        requestAnimationFrame(() => this.animate());
    }
}

// 當 DOM 載入完成時初始化背景和其他功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing background lines');
    
    // 初始化背景曲線
    const bgLines = new BackgroundLines();
    
    // 滑動導航效果
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 獲取目標區塊
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            // 滑動到目標區塊
            window.scrollTo({
                top: targetSection.offsetTop - 70, // 減去導航欄的高度
                behavior: 'smooth'
            });
        });
    });
    
    // 滾動時為導航欄添加陰影效果
    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        
        if (window.scrollY > 0) {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
    });
});