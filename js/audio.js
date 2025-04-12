function generateZizzingSound() {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 控制总体音量
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioContext.destination);
    
    // 创建一个噪音源
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    // 创建噪音播放源
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    
    // 创建一个带通滤波器，让噪音集中在特定频率范围
    const zizFilter = audioContext.createBiquadFilter();
    zizFilter.type = 'bandpass';
    zizFilter.frequency.value = 2500; // 茲茲声的主频率
    zizFilter.Q.value = 3; // 降低Q值，减少噪音感40%
    
    // 创建一个高通滤波器，但降低高频部分以减少噪音感
    const highpassFilter = audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 1000; // 降低高通频率
    
    // 添加低通滤波器使声音更圆润
    const lowpassFilter = audioContext.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 4000;
    
    // 添加失真效果，但强度降低40%
    const distortion = audioContext.createWaveShaper();
    function makeDistortionCurve(amount) {
      const samples = 44100;
      const curve = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        // 降低失真强度
        curve[i] = Math.tanh(x * amount * 0.6); // 降低40%
      }
      return curve;
    }
    distortion.curve = makeDistortionCurve(30); // 原为50，降低40%
    
    // 创建抖动调制器，模拟不稳定的电流接触
    const zizModulator = audioContext.createGain();
    
    // 设置循环变量和定时器ID
    let isPlaying = false;
    let modulationIntervalId = null;
    
    // 循环播放兹兹声的函数
    function startZizLoop() {
      if (isPlaying) return;
      isPlaying = true;
      
      // 开始播放噪音源
      noise.start();
      
      // 设置兹兹声调制
      modulateZizzing();
      
      // 循环调用调制函数，确保持续播放
      modulationIntervalId = setInterval(() => {
        if (isPlaying) {
          modulateZizzing();
        }
      }, 3000); // 每3秒重新安排一次兹兹声模式
    }
    
    // 兹兹声特有的间断性调制，但尾音拉长
    function modulateZizzing() {
      const now = audioContext.currentTime;
      
      // 随机设置增益模式，创造断断续续的兹兹声
      zizModulator.gain.cancelScheduledValues(now);
      
      // 随机长度的兹兹声，但尾音拉长
      function scheduleZiz(startTime) {
        if (startTime > now + 3) return; // 只安排未来3秒的兹兹声，然后重新安排
        
        const zizDuration = 0.02 + Math.random() * 0.1; // 兹兹声基本持续时间
        const tailDuration = 0.05 + Math.random() * 0.08; // 尾音持续时间
        const totalDuration = zizDuration + tailDuration;
        const gapDuration = Math.random() < 0.3 ? 
                             0 : // 30%的概率没有间隙，连续兹兹
                             0.01 + Math.random() * 0.03; // 较短间隙
        
        // 快速淡入
        zizModulator.gain.setValueAtTime(0, startTime);
        zizModulator.gain.linearRampToValueAtTime(1, startTime + 0.005);
        
        // 兹兹声基本持续
        zizModulator.gain.setValueAtTime(1, startTime + zizDuration);
        
        // 尾音淡出（较慢）
        zizModulator.gain.exponentialRampToValueAtTime(0.001, startTime + totalDuration);
        
        // 安排下一个兹兹声
        scheduleZiz(startTime + totalDuration + gapDuration);
      }
      
      scheduleZiz(now);
    }
    
    // 连接节点
    noise.connect(zizFilter);
    zizFilter.connect(highpassFilter);
    highpassFilter.connect(lowpassFilter);
    lowpassFilter.connect(distortion);
    distortion.connect(zizModulator);
    zizModulator.connect(masterGain);
    
    // 提供控制接口
    return {
      start: () => {
        startZizLoop();
      },
      setVolume: (volume) => {
        masterGain.gain.value = volume;
      },
      setIntensity: (intensity) => {
        // 调整茲茲声的强度
        zizFilter.Q.value = 2 + intensity * 5; // 降低范围
        distortion.curve = makeDistortionCurve(15 + intensity * 40); // 降低范围
      },
      stop: () => {
        if (modulationIntervalId) {
          clearInterval(modulationIntervalId);
          modulationIntervalId = null;
        }
        if (isPlaying) {
          isPlaying = false;
          noise.stop();
        }
      }
    };
  }
  
  // 创建HTML界面使用的代码
  function createZizInterface() {
    // 创建兹兹声发生器
    let zizSound = null;
    
    // 自动开始播放
    function startSound() {
      if (!zizSound) {
        zizSound = generateZizzingSound();
        zizSound.start(); // 开始循环播放
        
        // 应用初始设置
        const volume = document.getElementById('volumeSlider').value / 100;
        const intensity = document.getElementById('intensitySlider').value / 100;
        zizSound.setVolume(volume);
        zizSound.setIntensity(intensity);
      }
    }
    
    // 停止播放
    function stopSound() {
      if (zizSound) {
        zizSound.stop();
        zizSound = null;
      }
    }
    
    // 创建监听器
    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('startBtn').addEventListener('click', startSound);
      document.getElementById('stopBtn').addEventListener('click', stopSound);
      
      const volumeSlider = document.getElementById('volumeSlider');
      const intensitySlider = document.getElementById('intensitySlider');
      
      volumeSlider.addEventListener('input', updateSound);
      intensitySlider.addEventListener('input', updateSound);
      
      function updateSound() {
        if (!zizSound) return;
        
        const volume = volumeSlider.value / 100;
        const intensity = intensitySlider.value / 100;
        
        document.getElementById('volumeValue').textContent = Math.round(volume * 100) + '%';
        document.getElementById('intensityValue').textContent = Math.round(intensity * 100) + '%';
        
        zizSound.setVolume(volume);
        zizSound.setIntensity(intensity);
      }
    });
  }