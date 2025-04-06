// Web Audio API 音訊合成
class AudioSynthesizer {
    constructor() {
        // 初始化屬性
        this.audioContext = null;
        this.masterGainNode = null;
        this.initialized = false;
        
        // 狀態追蹤
        this._initStatus = {
            attempted: false,
            success: false,
            lastAttempt: 0
        };
        
        console.log('AudioSynthesizer 已建立，等待用戶交互後初始化');
        
        // 不再在構造函數中初始化，而是等待用戶交互
        this._setupInitOnUserInteraction();
    }
    
    // 設置用戶交互後初始化
    _setupInitOnUserInteraction() {
        const initOnInteraction = () => {
            if (!this.initialized) {
                console.log('偵測到用戶互動，嘗試初始化音訊系統');
                this._safeInit();
                
                // 只有在成功初始化後才移除事件監聽器
                if (this.initialized) {
                    console.log('音訊系統成功初始化，移除事件監聽器');
                    events.forEach(event => {
                        document.removeEventListener(event, initOnInteraction);
                    });
                }
            }
        };
        
        // 監聽各種可能的用戶互動事件
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        events.forEach(event => {
            document.addEventListener(event, initOnInteraction, { once: false });
        });
        
        // 特別處理聲音按鈕點擊
        setTimeout(() => {
            const soundButton = document.getElementById('sound-toggle');
            if (soundButton) {
                console.log('已找到聲音按鈕，添加點擊初始化處理');
                soundButton.addEventListener('click', () => {
                    console.log('聲音按鈕被點擊，強制初始化音訊系統');
                    this.forceInit();
                });
            } else {
                console.log('未找到聲音按鈕元素，將在文檔加載完成後重試');
                document.addEventListener('DOMContentLoaded', () => {
                    const button = document.getElementById('sound-toggle');
                    if (button) {
                        button.addEventListener('click', () => {
                            this.forceInit();
                        });
                    }
                });
            }
        }, 500);
    }
    
    // 安全初始化 - 包含錯誤處理和重試邏輯
    _safeInit() {
        // 標記嘗試狀態
        this._initStatus.attempted = true;
        this._initStatus.lastAttempt = Date.now();
        
        try {
            // 使用標準 Web Audio API 創建上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 創建主音量控制節點
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.gain.value = 0.5; // 設置主音量為 50%
            this.masterGainNode.connect(this.audioContext.destination);
            
            // 標記初始化成功
            this.initialized = true;
            this._initStatus.success = true;
            
            console.log('音訊上下文已初始化成功，狀態:', this.audioContext.state);
            
            // 檢查上下文狀態並嘗試恢復
            if (this.audioContext.state === 'suspended') {
                console.log('音訊上下文處於暫停狀態，將在用戶互動時恢復');
                this._setupAutoResume();
            }
            
            return true;
        } catch (err) {
            console.error('初始化音訊上下文時發生錯誤:', err);
            // 失敗時標記狀態
            this.initialized = false;
            this._initStatus.success = false;
            return false;
        }
    }
    
    // 設置自動恢復音訊上下文的事件
    _setupAutoResume() {
        const resumeAudio = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                console.log('用戶已互動，嘗試恢復音訊上下文...');
                this.audioContext.resume().then(() => {
                    console.log('音訊上下文已恢復，狀態:', this.audioContext.state);
                }).catch(err => {
                    console.error('恢復音訊上下文失敗:', err);
                });
            }
        };
        
        // 監聽各種可能的用戶互動事件
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        events.forEach(event => {
            document.addEventListener(event, resumeAudio, { once: false });
        });
    }
    
    // 強制初始化/恢復音訊上下文 (用於用戶明確操作時調用)
    forceInit() {
        // 如果尚未初始化，則嘗試初始化
        if (!this.initialized) {
            console.log('強制初始化音訊上下文');
            const success = this._safeInit();
            if (!success) {
                console.error('強制初始化失敗');
                return false;
            }
        }
        
        // 如果已初始化但被暫停，則恢復
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log('強制恢復已暫停的音訊上下文');
            this.audioContext.resume().then(() => {
                console.log('音訊上下文已強制恢復，狀態:', this.audioContext.state);
                
                // 播放一個靜音的音調以確認上下文已激活
                this._playInitTestTone();
            }).catch(err => {
                console.error('強制恢復音訊上下文失敗:', err);
            });
        } else if (this.audioContext && this.audioContext.state === 'running') {
            // 已經在運行狀態，播放測試音
            this._playInitTestTone();
        }
        
        return this.initialized;
    }
    
    // 播放初始化測試音 (極小音量和時長)
    _playInitTestTone() {
        try {
            // 使用正確的時間值
            const currentTime = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = 1; // 幾乎聽不到的頻率
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0.001; // 極小音量
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.01);
            
            console.log('播放靜音測試音成功');
            return true;
        } catch (err) {
            console.error('播放靜音測試音失敗:', err);
            return false;
        }
    }
    
    // 強制播放測試音效 - 在初始化問題時使用
    playTestTone() {
        console.log('嘗試播放測試音效');
        
        // 強制初始化
        if (!this.forceInit()) {
            console.error('播放測試音效失敗: 無法初始化音訊上下文');
            return false;
        }
        
        try {
            // 只有當音訊上下文是運行狀態才播放
            if (this.audioContext.state === 'running') {
                // 測試音效 - A4(440Hz) 標準音
                this.playTone(440, 'sine', 0.3, 0.5);
                
                // 播放一個簡短的音階
                setTimeout(() => this.playNote('C', 4, 0.2, 'sine', 0.5), 300);
                setTimeout(() => this.playNote('E', 4, 0.2, 'sine', 0.5), 500);
                setTimeout(() => this.playNote('G', 4, 0.2, 'sine', 0.5), 700);
                
                console.log('測試音效已觸發');
                return true;
            } else {
                console.warn('音訊上下文未運行，無法播放測試音效');
                // 嘗試再次恢復
                this.audioContext.resume().then(() => {
                    console.log('已恢復音訊上下文，重試播放測試音效');
                    setTimeout(() => this.playTestTone(), 100);
                });
                return false;
            }
        } catch (err) {
            console.error('播放測試音效時發生錯誤:', err);
            return false;
        }
    }

    // 恢復音訊上下文（用於解決瀏覽器自動暫停音訊上下文的問題）
    resume() {
        // 確保上下文存在
        if (!this.audioContext) {
            const success = this.forceInit();
            return success;
        }
        
        if (this.audioContext.state === 'suspended') {
            console.log('正在嘗試恢復暫停的音訊上下文...');
            return this.audioContext.resume().then(() => {
                console.log('音訊上下文恢復成功，狀態:', this.audioContext.state);
                return true;
            }).catch(err => {
                console.error('恢復音訊上下文失敗:', err);
                return false;
            });
        } else {
            console.log('音訊上下文狀態:', this.audioContext.state, '無需恢復');
            return true;
        }
    }

    // 產生音調
    playTone(frequency, waveType = 'sine', duration = 1.0, volume = 0.5) {
        // 確保初始化
        if (!this.initialized) {
            console.warn('播放音調前需要初始化音訊上下文');
            if (!this.forceInit()) {
                console.error('無法初始化音訊上下文，無法播放音調');
                return null;
            }
        }
        
        // 檢查音訊上下文狀態
        if (this.audioContext.state !== 'running') {
            console.log('音訊上下文非運行狀態，嘗試恢復...');
            this.audioContext.resume();
            if (this.audioContext.state !== 'running') {
                console.warn('音訊上下文無法恢復到運行狀態，無法播放音調');
                return null;
            }
        }
        
        try {
            // 記錄播放請求 (測試音特別標記)
            if (frequency === 440) {
                console.log('🔊 正在播放測試音: 440Hz (A4音), 持續時間:', duration, '秒');
            }
            
            // 獲取當前音頻上下文時間
            const currentTime = this.audioContext.currentTime;
            
            // 創建振盪器
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = waveType; // 波形類型: sine, square, sawtooth, triangle
            oscillator.frequency.value = frequency; // 設置頻率 (赫茲)
            
            // 創建增益節點控制音量
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // 初始音量為 0，避免爆音
            
            // 連接節點
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGainNode);
            
            // 設置淡入淡出效果，避免聲音突然開始或結束時產生爆音
            // 確保淡入淡出時間不會導致負值或超出持續時間
            const fadeTime = Math.min(0.01, duration / 4); // 淡入淡出時間，最長不超過持續時間的1/4
            
            // 使用指數淡入淡出，聽起來更自然
            gainNode.gain.setValueAtTime(0.0001, currentTime); // 從非零小值開始，避免錯誤
            gainNode.gain.exponentialRampToValueAtTime(volume, currentTime + fadeTime);
            
            // 持續播放
            if (duration > fadeTime * 2) {
                gainNode.gain.setValueAtTime(volume, currentTime + duration - fadeTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + duration);
            }
            
            // 啟動振盪器並設置停止時間
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            // 記錄並返回
            if (frequency > 20) { // 只記錄可聽見的音頻
                console.log(`播放音調: ${frequency.toFixed(1)}Hz, 音量: ${volume.toFixed(2)}, 持續時間: ${duration.toFixed(2)}秒`);
            }
            return {
                oscillator,
                gainNode,
                duration
            };
        } catch (err) {
            console.error('播放音調時發生錯誤:', err, '音訊上下文狀態:', this.audioContext?.state);
            return null;
        }
    }
    
    // 播放音階
    playNote(note, octave = 4, duration = 0.5, waveType = 'sine', volume = 0.5) {
        try {
            const noteFrequencies = {
                'C': 261.63,  // Do
                'C#': 277.18, 'Db': 277.18,
                'D': 293.66,  // Re
                'D#': 311.13, 'Eb': 311.13,
                'E': 329.63,  // Mi
                'F': 349.23,  // Fa
                'F#': 369.99, 'Gb': 369.99,
                'G': 392.00,  // Sol
                'G#': 415.30, 'Ab': 415.30,
                'A': 440.00,  // La (A4 是標準音高 440Hz)
                'A#': 466.16, 'Bb': 466.16,
                'B': 493.88   // Si
            };
            
            // 檢查音符是否有效
            if (!noteFrequencies[note]) {
                console.error(`無效的音符: ${note}`);
                return null;
            }
            
            // 計算指定八度的頻率
            // A4 是 440Hz，每升高一個八度，頻率翻倍
            const baseFrequency = noteFrequencies[note];
            const octaveDiff = octave - 4; // 與基準八度 (4) 的差異
            const frequency = baseFrequency * Math.pow(2, octaveDiff);
            
            // 播放音調
            return this.playTone(frequency, waveType, duration, volume);
        } catch (err) {
            console.error(`播放音符時發生錯誤: ${note}`, err);
            return null;
        }
    }
    
    // 產生噪音
    playNoise(duration = 1.0, volume = 0.5, type = 'white') {
        this.resume();
        
        // 創建緩衝區
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // 生成噪音數據
        switch (type) {
            case 'white':
                // 白噪音：所有頻率的強度相等
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                break;
            case 'pink':
                // 粉紅噪音：頻率越高強度越低
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    data[i] *= 0.11; // 調整音量
                    b6 = white * 0.115926;
                }
                break;
            case 'brown':
                // 棕噪音：低頻強度更高
                let lastOut = 0.0;
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.5; // 調整音量
                }
                break;
        }
        
        // 創建緩衝源並連接到增益節點
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        
        // 連接節點
        noiseSource.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        // 設置淡入淡出效果
        const currentTime = this.audioContext.currentTime;
        const fadeTime = 0.01;
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + fadeTime);
        gainNode.gain.setValueAtTime(volume, currentTime + duration - fadeTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
        
        // 啟動噪音
        noiseSource.start();
        noiseSource.stop(currentTime + duration);
        
        return {
            source: noiseSource,
            gainNode,
            duration
        };
    }
    
    // 產生簡單的樂句
    playMelody(notes, options = {}) {
        const {
            tempo = 120, // BPM (每分鐘節拍數)
            waveType = 'sine',
            volume = 0.5,
            baseOctave = 4
        } = options;
        
        let currentTime = 0;
        const noteDuration = 60 / tempo; // 一個四分音符的持續時間（秒）
        
        // 處理每個音符
        notes.forEach(noteInfo => {
            let note, octaveOffset, duration;
            
            // 處理不同的輸入格式
            if (typeof noteInfo === 'string') {
                // 只有音符名稱，例如 "C"、"D#"
                note = noteInfo;
                octaveOffset = 0;
                duration = noteDuration;
            } else {
                // 包含更多信息的物件
                note = noteInfo.note;
                octaveOffset = noteInfo.octave || 0;
                duration = noteInfo.duration ? noteDuration * noteInfo.duration : noteDuration;
            }
            
            // 判斷是否為休止符
            if (note === 'R' || note === 'rest') {
                // 休止符，只增加時間
                currentTime += duration;
            } else {
                // 實際音符，安排在適當的時間播放
                setTimeout(() => {
                    this.playNote(
                        note,
                        baseOctave + octaveOffset,
                        duration * 0.95, // 稍微縮短一點以便區分連續的相同音符
                        waveType,
                        volume
                    );
                }, currentTime * 1000);
                
                currentTime += duration;
            }
        });
        
        return currentTime; // 返回總持續時間
    }
    
    // 設置主音量
    setMasterVolume(value) {
        this.masterGainNode.gain.value = Math.max(0, Math.min(1, value));
    }

    // 根據三角形數據產生高音聲音 (取代之前的噪音方法)
    playTriangleSound(triangleData) {
        // 確保上下文初始化
        if (!this.initialized) {
            console.warn('播放三角形高音前需要初始化音訊上下文');
            if (!this.forceInit()) {
                console.error('無法初始化音訊上下文，無法播放三角形高音');
                return null;
            }
        }
        
        try {
            const { area, alpha, baseColor, p1, p2, p3 } = triangleData;
            
            // 確保至少有基本資料
            if (!area) {
                console.warn('三角形數據缺少面積訊息');
                return null;
            }
            
            // 標準化面積
            const minArea = triangleData.minArea || 1000;
            const maxArea = minArea * 20;
            const normalizedArea = Math.min(Math.max(area, minArea), maxArea);
            const areaRatio = (normalizedArea - minArea) / (maxArea - minArea);
            
            // 使用透明度調整音量，並確保可聽見
            const volume = Math.min(alpha * 3, 0.4) + 0.15;
            
            // 使用面積決定頻率 - 小三角形=更高的頻率
            // 使用 3000-8000Hz 的範圍，人耳對這個範圍的高頻很敏感
            const frequency = 3000 + (1 - areaRatio) * 5000; // 3000-8000Hz
            
            // 使用顏色和面積調整持續時間
            // 較長的持續時間，與三角形出現的節奏匹配
            const colorNormalized = baseColor / 255; // 0-1之間
            const duration = 0.3 + (0.7 - areaRatio * 0.4) * (1 - colorNormalized); // 0.3-1.0秒之間
            
            // 處理位置信息
            let centerX = 0, centerY = 0;
            if (p1 && p2 && p3) {
                centerX = (p1.x + p2.x + p3.x) / 3;
                centerY = (p1.y + p2.y + p3.y) / 3;
            } else {
                centerX = window.innerWidth / 2;
                centerY = window.innerHeight / 2;
            }
            
            // 使用位置決定聲音的立體聲效果
            const panValue = (centerX / window.innerWidth) * 2 - 1; // -1到1之間
            
            // 創建振盪器和增益節點
            const oscillator = this.audioContext.createOscillator();
            
            // 使用三角波獲得更柔和的高音，或 sine 獲得純淨的高音
            oscillator.type = Math.random() > 0.5 ? 'triangle' : 'sine';
            oscillator.frequency.value = frequency;
            
            // 創建增益節點控制音量
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // 初始音量為 0，避免爆音
            
            // 添加一個高通濾波器讓高頻更突出
            const highpassFilter = this.audioContext.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = 1500; // 截止頻率
            highpassFilter.Q.value = 1.2; // 共振
            
            // 添加一個高頻增強濾波器
            const highshelfFilter = this.audioContext.createBiquadFilter();
            highshelfFilter.type = 'highshelf';
            highshelfFilter.frequency.value = 2000;
            highshelfFilter.gain.value = 10; // 高頻增益
            
            // 創建聲相節點
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = panValue;
            
            // 連接音訊處理鏈
            oscillator.connect(gainNode);
            gainNode.connect(highpassFilter);
            highpassFilter.connect(highshelfFilter);
            highshelfFilter.connect(panner);
            panner.connect(this.masterGainNode);
            
            // 設置柔和的淡入淡出效果，更長的持續時間
            const currentTime = this.audioContext.currentTime;
            const fadeInTime = 0.03; // 較柔和的淡入
            const fadeOutTime = 0.2; // 較長的淡出
            
            // 使用指數淡入淡出，聽起來更自然
            gainNode.gain.setValueAtTime(0.0001, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(volume, currentTime + fadeInTime);
            
            // 較長的持續音量階段
            gainNode.gain.setValueAtTime(volume, currentTime + duration - fadeOutTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + duration);
            
            // 啟動振盪器並設置停止時間
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            console.log(`播放三角形高音: 頻率=${frequency.toFixed(0)}Hz, 音量=${volume.toFixed(2)}, 時長=${duration.toFixed(2)}秒, 聲相=${panValue.toFixed(2)}`);
            
            // 將相關信息返回
            return {
                type: 'high_tone',
                frequency: frequency,
                duration: duration,
                volume: volume,
                pan: panValue,
                oscillator: oscillator,
                gainNode: gainNode
            };
        } catch (err) {
            console.error('播放三角形高音時發生錯誤:', err);
            return null;
        }
    }
    
    // 取代原來的三角形和弦方法，改為使用多層高音
    playTriangleChord(triangleData) {
        // 確保上下文初始化
        if (!this.initialized) {
            console.warn('播放三角形和弦前需要初始化音訊上下文');
            if (!this.forceInit()) {
                console.error('無法初始化音訊上下文，無法播放三角形和弦');
                return null;
            }
        }
        
        try {
            const { area, alpha, baseColor, p1, p2, p3 } = triangleData;
            
            // 確保至少有基本資料
            if (!area) {
                console.warn('三角形數據缺少面積訊息');
                return null;
            }
            
            // 標準化面積比例
            const minArea = triangleData.minArea || 1000;
            const areaRatio = Math.min(area / (minArea * 10), 1);
            
            // 基於面積和透明度的音量
            const baseVolume = Math.min(alpha * 3, 0.4) + 0.1;
            
            // 處理位置信息
            let centerX = 0, centerY = 0;
            if (p1 && p2 && p3) {
                centerX = (p1.x + p2.x + p3.x) / 3;
                centerY = (p1.y + p2.y + p3.y) / 3;
            } else {
                centerX = window.innerWidth / 2;
                centerY = window.innerHeight / 2;
            }
            
            // 計算聲相
            const panValue = (centerX / window.innerWidth) * 2 - 1; // -1到1之間
            
            // 使用顏色和面積計算持續時間 - 延長持續時間
            const colorNormalized = baseColor / 255; // 0-1之間
            const baseDuration = 0.6 + (1 - colorNormalized) * 0.9; // 0.6-1.5秒之間
            
            // 創建多層高音效果
            const toneResults = [];
            
            // 主要高音 (最高頻率)
            const mainFrequency = 4000 + (1 - areaRatio) * 4000; // 4000-8000Hz之間
            
            // 播放主要高音
            const mainTone = this._playEnhancedTone(
                'sine',
                mainFrequency,
                baseDuration,
                baseVolume,
                panValue
            );
            toneResults.push(mainTone);
            
            // 第二層 - 次高音 (稍微延遲，稍低頻率)
            setTimeout(() => {
                const secondary = this._playEnhancedTone(
                    'triangle',
                    mainFrequency * 0.667, // 音程關係: 5度
                    baseDuration * 0.8,
                    baseVolume * 0.7,
                    panValue * 0.6
                );
            }, 30); // 30毫秒延遲
            
            // 第三層 - 只對較大三角形添加一個最低的音調
            if (area > minArea * 3) {
                setTimeout(() => {
                    const tertiary = this._playEnhancedTone(
                        'sine',
                        mainFrequency * 0.5, // 音程關係: 八度
                        baseDuration * 0.7,
                        baseVolume * 0.5,
                        panValue * -0.5 // 相反方向的立體聲
                    );
                }, 60); // 60毫秒延遲
            }
            
            console.log(`播放三角形高音和弦: 主頻率=${mainFrequency.toFixed(0)}Hz, 音量=${baseVolume.toFixed(2)}, 時長=${baseDuration.toFixed(2)}秒`);
            
            return {
                type: 'high_tone_chord',
                mainFrequency: mainFrequency,
                duration: baseDuration,
                volume: baseVolume,
                layers: area > minArea * 3 ? 3 : 2
            };
        } catch (err) {
            console.error('播放三角形高音和弦時發生錯誤:', err);
            return null;
        }
    }
    
    // 輔助方法: 播放增強的高音
    _playEnhancedTone(waveType, frequency, duration, volume, pan = 0) {
        try {
            // 創建振盪器
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = waveType; // sine, triangle
            oscillator.frequency.value = frequency;
            
            // 創建增益節點
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0; // 初始音量為 0，避免爆音
            
            // 添加一個高通濾波器讓聲音更乾淨
            const highpassFilter = this.audioContext.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = frequency * 0.7; // 截止頻率
            
            // 添加一個高頻增強濾波器
            const highshelfFilter = this.audioContext.createBiquadFilter();
            highshelfFilter.type = 'highshelf';
            highshelfFilter.frequency.value = frequency * 0.8;
            highshelfFilter.gain.value = 5; // 高頻增益
            
            // 創建聲相節點
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = pan;
            
            // 連接音訊處理鏈
            oscillator.connect(gainNode);
            gainNode.connect(highpassFilter);
            highpassFilter.connect(highshelfFilter);
            highshelfFilter.connect(panner);
            panner.connect(this.masterGainNode);
            
            // 設置柔和的淡入淡出效果
            const currentTime = this.audioContext.currentTime;
            const fadeInTime = 0.04; // 較柔和的淡入
            const fadeOutTime = 0.25; // 較長的淡出
            
            // 使用指數淡入淡出，聽起來更自然
            gainNode.gain.setValueAtTime(0.0001, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(volume, currentTime + fadeInTime);
            
            // 持續音量階段
            gainNode.gain.setValueAtTime(volume, currentTime + duration - fadeOutTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + duration);
            
            // 啟動振盪器並設置停止時間
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            return {
                type: waveType,
                frequency: frequency,
                duration: duration,
                volume: volume,
                pan: pan,
                oscillator: oscillator,
                gainNode: gainNode
            };
        } catch (err) {
            console.error('播放增強高音時發生錯誤:', err);
            return null;
        }
    }
    
    // 增加一個獲取狀態的方法
    getStatus() {
        return {
            initialized: this.initialized,
            contextState: this.audioContext ? this.audioContext.state : 'none',
            initAttempts: this._initStatus
        };
    }
}

// 創建全局音訊合成器實例
const synth = new AudioSynthesizer();

// 將函數導出到 window.audioModule 全局對象，而不是使用 ES6 模組 export
window.audioModule = {
    // 播放單一音調
    playTone: (frequency, waveType, duration, volume) => {
        return synth.playTone(frequency, waveType, duration, volume);
    },
    
    // 強制播放測試音效
    playTestTone: () => {
        return synth.playTestTone();
    },
    
    // 播放音符
    playNote: (note, octave, duration, waveType, volume) => {
        return synth.playNote(note, octave, duration, waveType, volume);
    },
    
    // 播放噪音
    playNoise: (duration, volume, type) => {
        return synth.playNoise(duration, volume, type);
    },
    
    // 播放旋律
    playMelody: (notes, options) => {
        return synth.playMelody(notes, options);
    },
    
    // 設置主音量
    setVolume: (value) => {
        synth.setMasterVolume(value);
    },
    
    // 例子：小星星
    playSampleMelody: () => {
        const littleStar = [
            'C', 'C', 'G', 'G', 'A', 'A', 'G', 'R',
            'F', 'F', 'E', 'E', 'D', 'D', 'C', 'R',
            'G', 'G', 'F', 'F', 'E', 'E', 'D', 'R',
            'G', 'G', 'F', 'F', 'E', 'E', 'D', 'R',
            'C', 'C', 'G', 'G', 'A', 'A', 'G', 'R',
            'F', 'F', 'E', 'E', 'D', 'D', 'C'
        ];
        
        return synth.playMelody(littleStar, {
            tempo: 180,
            waveType: 'sine',
            volume: 0.4,
            baseOctave: 4
        });
    },
    
    // 三角形聲音相關函數
    playTriangleSound: (triangleData) => {
        return synth.playTriangleSound(triangleData);
    },
    
    playTriangleChord: (triangleData) => {
        return synth.playTriangleChord(triangleData);
    },
    
    // 輔助函數，限制一段時間內的聲音觸發頻率
    createThrottledSoundTrigger: (interval = 300) => {
        let lastPlayTime = 0;
        let trianglesPlayed = 0;
        
        return (triangleData) => {
            const now = Date.now();
            
            // 確保不會在短時間內產生太多聲音
            if (now - lastPlayTime >= interval && trianglesPlayed < 5) {
                lastPlayTime = now;
                trianglesPlayed++;
                
                // 5秒後重置計數器
                setTimeout(() => {
                    trianglesPlayed = Math.max(0, trianglesPlayed - 1);
                }, 5000);
                
                console.log(`觸發三角形聲音: 面積=${triangleData.area.toFixed(0)}, Alpha=${triangleData.alpha.toFixed(2)}`);
                
                // 隨機選擇播放單音或和弦
                if (Math.random() > 0.6) {
                    return synth.playTriangleChord(triangleData);
                } else {
                    return synth.playTriangleSound(triangleData);
                }
            }
            
            return null;
        };
    }
};

console.log('音訊模組已載入到全局變數 window.audioModule');

// 立即嘗試初始化音訊
setTimeout(() => {
    console.log('檢查是否可以預初始化音訊系統');
    // 不嘗試自動播放，僅在用戶互動後初始化
    console.log('音訊系統將在用戶互動後初始化');
}, 1000);