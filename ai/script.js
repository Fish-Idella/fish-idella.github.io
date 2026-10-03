(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
       基础工具
       ═══════════════════════════════════════════════════════════════ */
    const $ = (s) => document.querySelector(s);

    let toastTimer = null;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
    }

    function nextPaint() {
        return new Promise((res) => {
            requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 0)));
        });
    }

    /* ─── 常量 ─────────────────────────────────────────────────── */
    const TRACKS = 4;
    const HIT_LINE_RATIO = 0.75;

    /* 能量峰值检测参数 */
    const TRACK_MIN_GAP = 1.08;      // 内置模式同轨最小间距（单位 blockH）
    const TRACK_SAFETY = 1.15;       // 预排谱面时同轨余量系数

    const BLOCK_HUE = 188;
    const TRACK_HUES = [188, 268, 330, 45];

    /* 以下 5 个由难度滑块动态调整 */
    let TRAVEL_TIME = 0.9;
    let MAX_JUDGE_RATIO = 0.25;
    let ONSET_MIN_GAP = 0.10;
    let ONSET_SENSITIVITY = 0.50;
    let MAX_EMPTY_GAP = 0.55;

    /* ─── 难度配置 ──────────────────────────────────────────── */
    const CFG = {
        travel: 0.90,    // 下落时间（秒）
        judge: 0.25,     // 判定窗口比例
        density: 50,     // 谱面密度 0-100
    };
    try {
        const raw = localStorage.getItem('btb_cfg');
        if (raw) Object.assign(CFG, JSON.parse(raw));
    } catch (e) { }

    function applyCfg() {
        TRAVEL_TIME = CFG.travel;
        MAX_JUDGE_RATIO = CFG.judge;

        const k = CFG.density / 100;
        /* 密度越高 → 灵敏度越高、峰值间隔越短、补点阈值越小 */
        ONSET_SENSITIVITY = 1.10 - 0.90 * k;  // 1.10 → 0.20
        ONSET_MIN_GAP = 0.20 - 0.12 * k;      // 0.20 → 0.08
        MAX_EMPTY_GAP = 0.90 - 0.60 * k;      // 0.90 → 0.30
    }
    applyCfg();

    const TIERS = [
        { name: 'PERFECT', score: 100, color: '#fbbf24', upper: 0.25, particles: 20 },
        { name: 'GREAT', score: 70, color: '#a78bfa', upper: 0.50, particles: 15 },
        { name: 'GOOD', score: 40, color: '#67e8f9', upper: 0.75, particles: 11 },
        { name: 'OK', score: 15, color: '#f472b6', upper: 1.01, particles: 7 },
    ];

    function tierOf(ratio) {
        if (ratio < 0.25) return 0;
        if (ratio < 0.50) return 1;
        if (ratio < 0.75) return 2;
        return 3;
    }

    /* ═══════════════════════════════════════════════════════════════
       音频引擎
       ═══════════════════════════════════════════════════════════════ */
    const A = {
        ctx: null, master: null, analyser: null, freq: null,
        mode: 'none',
        noiseBuf: null,
        bpm: 120, beatCount: 0, nextNoteTime: 0, schedTimer: null,
        localBuffer: null, localBeats: null, localChart: null, localName: '',
        audioSource: null, audioStartAt: 0,
    };

    async function initAudio() {
        if (A.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { toast('当前浏览器不支持 Web Audio API'); throw new Error('no AudioContext'); }
        const ctx = new AC();
        A.ctx = ctx;

        A.master = ctx.createGain();
        A.master.gain.value = 0.5;

        A.analyser = ctx.createAnalyser();
        A.analyser.fftSize = 2048;
        A.analyser.smoothingTimeConstant = 0.72;

        A.master.connect(A.analyser);
        A.analyser.connect(ctx.destination);
        A.freq = new Uint8Array(A.analyser.frequencyBinCount);

        const len = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
        A.noiseBuf = buf;
    }

    /* 内置乐器 */
    function kick(t) {
        const ctx = A.ctx;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.95, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
        o.connect(g).connect(A.master);
        o.start(t); o.stop(t + 0.36);
    }
    function snare(t) {
        const ctx = A.ctx;
        const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.42, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
        s.connect(f).connect(g).connect(A.master);
        s.start(t); s.stop(t + 0.22);
    }
    function hat(t, vol) {
        const ctx = A.ctx;
        const s = ctx.createBufferSource(); s.buffer = A.noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 7200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        s.connect(f).connect(g).connect(A.master);
        s.start(t); s.stop(t + 0.06);
    }
    function bassNote(freq, t, dur) {
        const ctx = A.ctx;
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = freq;
        f.type = 'lowpass';
        f.frequency.setValueAtTime(1300, t);
        f.frequency.exponentialRampToValueAtTime(280, t + dur);
        f.Q.value = 6;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.17, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(f).connect(g).connect(A.master);
        o.start(t); o.stop(t + dur + 0.05);
    }

    const BASS_NOTES = [55, 65.41, 73.42, 82.41];

    function playStep(step, t) {
        const b = step % 8;
        if (b === 0 || b === 4) kick(t);
        if (b === 2 || b === 6) snare(t);
        hat(t, b % 2 === 0 ? 0.075 : 0.045);
        if (b % 2 === 0) bassNote(BASS_NOTES[(b / 2) | 0], t, 0.42);
    }
    function scheduleAhead() {
        if (A.mode !== 'builtin' || !A.ctx) return;
        const now = A.ctx.currentTime;
        let guard = 0;
        while (A.nextNoteTime < now + 0.14 && guard++ < 32) {
            playStep(A.beatCount, A.nextNoteTime);
            A.nextNoteTime += (60 / A.bpm) / 2;
            A.beatCount++;
        }
    }
    function startSequencer(startAt) {
        stopSequencer();
        A.beatCount = 0;
        A.nextNoteTime = startAt;
        A.schedTimer = setInterval(scheduleAhead, 25);
    }
    function stopSequencer() {
        if (A.schedTimer) { clearInterval(A.schedTimer); A.schedTimer = null; }
    }

    /* 音效 */
    function sfxOver() {
        if (!A.ctx) return;
        const t = A.ctx.currentTime;
        const o = A.ctx.createOscillator(), g = A.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(320, t);
        o.frequency.exponentialRampToValueAtTime(55, t + 0.65);
        g.gain.setValueAtTime(0.22, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g).connect(A.master);
        o.start(t); o.stop(t + 0.75);
    }
    function sfxWin() {
        if (!A.ctx) return;
        const ctx = A.ctx, t0 = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        for (let i = 0; i < notes.length; i++) {
            const t = t0 + i * 0.10;
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(notes[i], t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.24, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.60);
            o.connect(g).connect(A.master);
            o.start(t); o.stop(t + 0.65);
        }
        const tEnd = t0 + notes.length * 0.10;
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(1567.98, tEnd);
        g2.gain.setValueAtTime(0.0001, tEnd);
        g2.gain.exponentialRampToValueAtTime(0.20, tEnd + 0.04);
        g2.gain.exponentialRampToValueAtTime(0.001, tEnd + 1.1);
        o2.connect(g2).connect(A.master);
        o2.start(tEnd); o2.stop(tEnd + 1.2);
        const ob = ctx.createOscillator(), gb = ctx.createGain();
        ob.type = 'sine';
        ob.frequency.setValueAtTime(130.81, t0);
        gb.gain.setValueAtTime(0.0001, t0);
        gb.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
        gb.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
        ob.connect(gb).connect(A.master);
        ob.start(t0); ob.stop(t0 + 1.0);
    }

    /* ═══════════════════════════════════════════════════════════════
       频段分类用的 FFT（仅在分析阶段调用，每个峰值一次）
       ═══════════════════════════════════════════════════════════════ */
    function fftRadix2(re, im) {
        const n = re.length;
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                let t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
        for (let len = 2; len <= n; len <<= 1) {
            const half = len >> 1;
            const ang = -2 * Math.PI / len;
            const wr = Math.cos(ang), wi = Math.sin(ang);
            for (let i = 0; i < n; i += len) {
                let cr = 1, ci = 0;
                for (let j = 0; j < half; j++) {
                    const p = i + j, q = p + half;
                    const vr = re[q] * cr - im[q] * ci;
                    const vi = re[q] * ci + im[q] * cr;
                    re[q] = re[p] - vr;
                    im[q] = im[p] - vi;
                    re[p] += vr;
                    im[p] += vi;
                    const ncr = cr * wr - ci * wi;
                    ci = cr * wi + ci * wr;
                    cr = ncr;
                }
            }
        }
    }

    /* 给某个峰值帧分类频段：0=低频 1=中频 2=高频 */
    function classifyBand(mono, frameIdx, hop, N, asr) {
        const off = frameIdx * hop;
        if (off < 0 || off + N > mono.length) return 1;

        const re = new Float32Array(N);
        const im = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
            re[i] = mono[off + i] * w;
        }
        fftRadix2(re, im);

        const binHz = asr / N;
        const iLo0 = Math.max(1, Math.floor(20 / binHz));
        const iLo1 = Math.min(N / 2, Math.ceil(250 / binHz));
        const iMid0 = iLo1;
        const iMid1 = Math.min(N / 2, Math.ceil(3000 / binHz));
        const iHi0 = iMid1;
        const iHi1 = Math.min(N / 2, Math.ceil(12000 / binHz));

        let eLo = 0, eMid = 0, eHi = 0;
        for (let i = iLo0; i < iLo1; i++) eLo += re[i] * re[i] + im[i] * im[i];
        for (let i = iMid0; i < iMid1; i++) eMid += re[i] * re[i] + im[i] * im[i];
        for (let i = iHi0; i < iHi1; i++) eHi += re[i] * re[i] + im[i] * im[i];

        /* 三频段里取能量最大者；加一点低频/高频的偏置让分类更"有性格" */
        eLo *= 1.35;
        eHi *= 1.15;

        if (eLo >= eMid && eLo >= eHi) return 0;
        if (eHi >= eMid && eHi >= eLo) return 2;
        return 1;
    }

    /* ═══════════════════════════════════════════════════════════════
       能量峰值检测：返回 [{ time, band }, ...]
       band: 0=低频 1=中频 2=高频
       ═══════════════════════════════════════════════════════════════ */
    function analyzeOnsets(buffer) {
        const sr = buffer.sampleRate;
        const srcLen = buffer.length;
        const ch0 = buffer.getChannelData(0);
        const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

        /* 1. 下混单声道 + 降采样到约 22 kHz */
        const ds = Math.max(1, Math.round(sr / 22050));
        const len = Math.floor(srcLen / ds);
        if (len < 128) return null;

        const mono = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            const j = i * ds;
            let acc = 0, cnt = 0;
            for (let k = 0; k < ds && j + k < srcLen; k++) {
                let v = ch0[j + k];
                if (ch1) v = (v + ch1[j + k]) * 0.5;
                acc += v; cnt++;
            }
            mono[i] = cnt ? acc / cnt : 0;
        }
        const asr = sr / ds;

        /* 2. 分帧，算两条包络 */
        const N = 512;
        const HOP = 256;
        const frames = Math.floor((len - N) / HOP);
        if (frames < 8) return null;

        const envLo = new Float32Array(frames);
        const envHi = new Float32Array(frames);
        for (let f = 0; f < frames; f++) {
            const off = f * HOP;
            let sLo = 0, sHi = 0;
            let prev = off > 0 ? mono[off - 1] : 0;
            for (let i = 0; i < N; i++) {
                const s = mono[off + i];
                sLo += s * s;
                const d = s - prev;
                sHi += d * d;
                prev = s;
            }
            envLo[f] = Math.sqrt(sLo / N);
            envHi[f] = Math.sqrt(sHi / N);
        }

        /* 3. onset 强度 */
        const onset = new Float32Array(frames);
        let maxO = 0;
        for (let f = 1; f < frames; f++) {
            const dLo = Math.log(1 + envLo[f] * 10) - Math.log(1 + envLo[f - 1] * 10);
            const dHi = Math.log(1 + envHi[f] * 3) - Math.log(1 + envHi[f - 1] * 3);
            const v = dLo + dHi * 0.8;
            if (v > 0) {
                onset[f] = v;
                if (v > maxO) maxO = v;
            }
        }
        if (maxO < 1e-7) return [];

        /* 4. 自适应阈值 + 局部极大值 */
        const frameDur = HOP / asr;
        const W = Math.max(4, Math.round(0.22 / frameDur));
        const floor = maxO * 0.03;
        const isPeak = new Uint8Array(frames);

        for (let i = 1; i < frames - 1; i++) {
            const v = onset[i];
            if (v < floor) continue;
            if (v < onset[i - 1] || v < onset[i + 1]) continue;

            const a = Math.max(0, i - W), b = Math.min(frames - 1, i + W);
            let mean = 0;
            for (let j = a; j <= b; j++) mean += onset[j];
            mean /= (b - a + 1);
            let varr = 0;
            for (let j = a; j <= b; j++) { const d = onset[j] - mean; varr += d * d; }
            const std = Math.sqrt(varr / (b - a + 1));

            if (v >= mean + std * ONSET_SENSITIVITY) isPeak[i] = 1;
        }

        /* 5. 窗口内只保留最强峰（防止一个上升沿被反复检测） */
        const peaks = [];
        for (let f = 0; f < frames; f++) if (isPeak[f]) peaks.push(f);

        const onsets = [];
        const minGapFrames = Math.max(1, Math.round(ONSET_MIN_GAP / frameDur));
        let k = 0;
        while (k < peaks.length) {
            const f0 = peaks[k];
            let best = f0, end = k;
            while (end + 1 < peaks.length && peaks[end + 1] - f0 < minGapFrames) {
                end++;
                if (onset[peaks[end]] > onset[best]) best = peaks[end];
            }
            const band = classifyBand(mono, best, HOP, N, asr);
            onsets.push({ time: best * frameDur, band });
            k = end + 1;
        }
        return onsets;
    }

    /* ═══════════════════════════════════════════════════════════════
       谱面预排：按频段分派轨道
         - 中频：0 → 1 → 2 → 3 轮询
         - 高频：中间两格 1 ↔ 2 轮换，占用则扩散到 0 ↔ 3
         - 低频：外圈 0 ↔ 3 轮换，占用则扩散到 1 ↔ 2
       ═══════════════════════════════════════════════════════════════ */
    function buildChart(onsets, minTrackGap) {
        const chart = [];
        const lastEnd = [-1e9, -1e9, -1e9, -1e9];
        let cLo = 0, cMid = 0, cHi = 0;

        function pick(cands, t) {
            for (let i = 0; i < cands.length; i++) {
                const c = cands[i];
                if (t - lastEnd[c] >= minTrackGap) return c;
            }
            /* 4 条都占用（几何上几乎不可能），兜底选最早空闲的 */
            let best = 0;
            for (let i = 1; i < TRACKS; i++) {
                if (lastEnd[i] < lastEnd[best]) best = i;
            }
            return best;
        }

        for (let i = 0; i < onsets.length; i++) {
            const o = onsets[i];
            const t = o.time;
            let cands;

            if (o.band === 2) {
                /* 高频：中间两格优先，相位交替 */
                const phase = cHi++ % 2;
                cands = phase === 0 ? [1, 2, 0, 3] : [2, 1, 3, 0];
            } else if (o.band === 0) {
                /* 低频：外圈优先，相位交替 */
                const phase = cLo++ % 2;
                cands = phase === 0 ? [0, 3, 1, 2] : [3, 0, 2, 1];
            } else {
                /* 中频：严格 0→1→2→3 轮询 */
                const phase = cMid++ % 4;
                cands = [phase, (phase + 1) % 4, (phase + 2) % 4, (phase + 3) % 4];
            }

            const track = pick(cands, t);
            chart.push({ time: t, track, band: o.band });
            lastEnd[track] = t;
        }
        return chart;
    }

    /* ─── 音频生命周期 ────────────────────────────────────────── */
    function stopAllAudio() {
        stopSequencer();
        if (A.audioSource) {
            try { A.audioSource.onended = null; A.audioSource.stop(); } catch (e) { }
            try { A.audioSource.disconnect(); } catch (e) { }
            A.audioSource = null;
        }
        A.mode = 'none';
        if (A.master) A.master.gain.value = 0.5;
    }

    function clearLocalAsset() {
        A.localBuffer = null;
        A.localBeats = null;
        A.localChart = null;
        A.localName = '';
    }

    /* ═══════════════════════════════════════════════════════════════
       对象池
       ═══════════════════════════════════════════════════════════════ */
    const particlePool = [];
    const popupPool = [];

    function acquireParticle() {
        return particlePool.length ? particlePool.pop()
            : { x: 0, y: 0, vx: 0, vy: 0, life: 0, hue: 0, size: 0 };
    }
    function releaseParticle(p) {
        if (particlePool.length < 400) particlePool.push(p);
    }
    function acquirePopup() {
        return popupPool.length ? popupPool.pop()
            : { x: 0, y: 0, text: '', color: '', life: 0, vy: 0 };
    }
    function releasePopup(p) {
        if (popupPool.length < 80) popupPool.push(p);
    }

    /* ═══════════════════════════════════════════════════════════════
       游戏状态
       ═══════════════════════════════════════════════════════════════ */
    const G = {
        state: 'menu',
        blocks: [],
        particles: [],
        popups: [],

        trackW: 0, blockH: 0, hitLine: 0, maxJudgeDist: 0, speed: 0,

        score: 0, combo: 0, maxCombo: 0, best: 0,

        bpm: 120, startTime: 0, nextBeatTime: 0, prevMusicT: -999,

        localIdx: 0, audioEnded: false, audioEndTimer: 0,

        flash: 0, shake: 0,

        trackFlash: [0, 0, 0, 0],
        trackPress: [0, 0, 0, 0],
        lastHitTime: [0, 0, 0, 0],

        tierCount: [0, 0, 0, 0],
    };

    try { G.best = +(localStorage.getItem('btb_best') || 0) || 0; } catch (e) { G.best = 0; }

    /* ─── 画布 ───────────────────────────────────────────────── */
    const cv = $('#cv');
    const ctx = cv.getContext('2d', { alpha: false });
    let W = 0, H = 0, DPR = 1;
    let bgGrad = null;

    let judgeBandSprite = null;
    let spectrumBars = null;

    let BLK_PAD = 0;
    let BLK_W = 0;
    let BLK_LINE_H = 0;
    let BLK_LINE_INSET = 0;
    let BLK_LINE_Y0 = 0;

    function buildJudgeBandSprite() {
        const bandH = G.maxJudgeDist * 2 + 4;
        const c = document.createElement('canvas');
        c.width = Math.ceil(W * DPR);
        c.height = Math.ceil(bandH * DPR);
        const g = c.getContext('2d');
        g.scale(DPR, DPR);

        const gg = g.createLinearGradient(0, 0, 0, bandH);
        gg.addColorStop(0, 'rgba(103,232,249,0)');
        gg.addColorStop(0.35, 'rgba(103,232,249,0.02)');
        gg.addColorStop(0.50, 'rgba(103,232,249,0.075)');
        gg.addColorStop(0.65, 'rgba(103,232,249,0.02)');
        gg.addColorStop(1, 'rgba(103,232,249,0)');
        g.fillStyle = gg;
        g.fillRect(0, 0, W, bandH);

        g.setLineDash([5, 9]);
        g.lineWidth = 1;
        g.strokeStyle = 'rgba(103,232,249,0.12)';
        g.beginPath();
        g.moveTo(0, 2.5);
        g.lineTo(W, 2.5);
        g.moveTo(0, bandH - 2.5);
        g.lineTo(W, bandH - 2.5);
        g.stroke();

        judgeBandSprite = c;
    }

    function buildSpectrumBars() {
        if (!A.ctx) { spectrumBars = null; return; }
        const nyq = A.ctx.sampleRate / 2;
        const nbins = A.ctx.frequencyBinCount;
        const FMIN = 40, FMAX = 14000;
        const BARS = 56;
        const barW = W / BARS;

        const arr = [];
        for (let i = 0; i < BARS; i++) {
            const f0 = FMIN * Math.pow(FMAX / FMIN, i / BARS);
            const f1 = FMIN * Math.pow(FMAX / FMIN, (i + 1) / BARS);
            const i0 = Math.floor((f0 / nyq) * nbins);
            const i1 = Math.max(i0 + 1, Math.min(nbins, Math.floor((f1 / nyq) * nbins)));
            const fc = Math.sqrt(f0 * f1);
            let hue;
            if (fc < 250) hue = 330;
            else if (fc < 3000) hue = 268;
            else hue = 188;
            arr.push({
                i0, i1,
                x: i * barW + 1,
                w: barW - 2,
                style: 'hsla(' + hue + ',92%,62%,0.14)',
                topStyle: 'hsla(' + hue + ',95%,72%,0.30)',
            });
        }
        spectrumBars = arr;
    }

    function rebuildAll() {
        buildJudgeBandSprite();
        buildSpectrumBars();
    }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = cv.clientWidth;
        H = cv.clientHeight;
        cv.width = Math.round(W * DPR);
        cv.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        G.trackW = W / TRACKS;
        G.blockH = Math.min(G.trackW * 0.98, H * 0.125);
        G.hitLine = H * HIT_LINE_RATIO;
        G.maxJudgeDist = H * MAX_JUDGE_RATIO;
        G.speed = (G.hitLine + G.blockH) / TRAVEL_TIME;

        BLK_PAD = G.trackW * 0.05;
        BLK_W = G.trackW - BLK_PAD * 2;
        BLK_LINE_H = Math.max(2, Math.round(G.blockH * 0.065));
        BLK_LINE_INSET = BLK_W * 0.12;
        BLK_LINE_Y0 = Math.round((G.blockH - BLK_LINE_H) * 0.5);

        bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#08080f');
        bgGrad.addColorStop(0.55, '#0c0c19');
        bgGrad.addColorStop(1, '#0a0a15');

        rebuildAll();
    }

    /* ═══════════════════════════════════════════════════════════════
       游戏逻辑
       ═══════════════════════════════════════════════════════════════ */
    function resetGame() {
        G.blocks.length = 0;
        for (let i = 0; i < G.particles.length; i++) releaseParticle(G.particles[i]);
        for (let i = 0; i < G.popups.length; i++) releasePopup(G.popups[i]);
        G.particles.length = 0;
        G.popups.length = 0;

        G.score = 0; G.combo = 0; G.maxCombo = 0;
        G.flash = 0; G.shake = 0;
        G.bpm = 120; A.bpm = 120;

        G.localIdx = 0; G.prevMusicT = -999;
        G.audioEnded = false; G.audioEndTimer = 0;

        for (let i = 0; i < TRACKS; i++) {
            G.trackFlash[i] = 0;
            G.trackPress[i] = 0;
            G.lastHitTime[i] = 0;
        }
        for (let i = 0; i < 4; i++) G.tierCount[i] = 0;

        if (A.mode === 'builtin') {
            const startAt = A.ctx.currentTime + 0.9;
            G.startTime = startAt;
            G.nextBeatTime = 0;
            startSequencer(startAt);
        } else if (A.mode === 'local') {
            startLocalPlayback();
        }
    }

    function startLocalPlayback() {
        if (!A.localBuffer) return;
        const src = A.ctx.createBufferSource();
        src.buffer = A.localBuffer;
        src.connect(A.master);
        const lead = 1.6;
        // A.audioStartAt = A.ctx.currentTime + lead;
        /* 补偿 Web Audio 输出延迟（约 10~40ms） */
        A.audioStartAt = A.ctx.currentTime + lead - (A.ctx.baseLatency || 0);
        src.start(A.audioStartAt);
        A.audioSource = src;
        src.onended = () => { if (G.state === 'playing') G.audioEnded = true; };
        G.localIdx = 0;
    }

    /* 生成方块 */
    function spawnBlock(fixedTrack) {
        let track;

        if (fixedTrack !== undefined) {
            track = fixedTrack;
        } else {
            const blocks = G.blocks;
            const need = G.blockH * TRACK_MIN_GAP;
            const start = (Math.random() * TRACKS) | 0;
            let bestTrack = start, bestMinY = -Infinity;

            for (let n = 0; n < TRACKS; n++) {
                const t = (start + n) % TRACKS;
                let minY = Infinity;
                for (let i = 0; i < blocks.length; i++) {
                    const b = blocks[i];
                    if (b.dead || b.track !== t) continue;
                    if (b.y < minY) minY = b.y;
                }
                if (minY >= need) { bestTrack = t; break; }
                if (minY > bestMinY) { bestMinY = minY; bestTrack = t; }
            }
            track = bestTrack;
        }

        G.blocks.push({ track, y: -G.blockH, dead: false });
    }

    function tryHit(track) {
        if (G.state !== 'playing') return;
        const maxD = G.maxJudgeDist;
        let target = null, bestDist = Infinity;
        const blocks = G.blocks;
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.dead || b.track !== track) continue;
            const d = Math.abs(b.y + G.blockH / 2 - G.hitLine);
            if (d > maxD) continue;
            if (d < bestDist) { bestDist = d; target = b; }
        }
        if (target) {
            const tierIdx = tierOf(bestDist / maxD);
            const tier = TIERS[tierIdx];
            target.dead = true;
            G.score += tier.score;
            G.combo++;
            if (G.combo > G.maxCombo) G.maxCombo = G.combo;
            G.flash = 1;
            G.trackFlash[track] = 1;
            G.lastHitTime[track] = performance.now();
            G.tierCount[tierIdx]++;
            burst(target, tierIdx);

            const cx = track * G.trackW + G.trackW / 2;
            const cy = target.y + G.blockH / 2 - G.blockH * 0.55;
            const p = acquirePopup();
            p.x = cx; p.y = cy; p.text = tier.name; p.color = tier.color;
            p.life = 1; p.vy = -90;
            G.popups.push(p);
        } else {
            G.trackPress[track] = 1;
        }
    }

    function burst(b, tierIdx) {
        const cx = b.track * G.trackW + G.trackW / 2;
        const cy = b.y + G.blockH / 2;
        const n = TIERS[tierIdx].particles;
        const halfW = G.trackW * 0.275;
        const halfH = G.blockH * 0.275;
        const hueBase = BLOCK_HUE + (tierIdx === 0 ? 25 : 0);

        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 300;
            const p = acquireParticle();
            p.x = cx + (Math.random() - 0.5) * halfW * 2;
            p.y = cy + (Math.random() - 0.5) * halfH * 2;
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp - 80;
            p.life = 1;
            p.hue = hueBase + Math.random() * 30;
            p.size = 2 + Math.random() * 4;
            G.particles.push(p);
        }
    }

    function endGame(reason) {
        if (G.state !== 'playing') return;
        const isClear = (reason === 'clear');

        G.state = 'over';
        G.shake = isClear ? 0.45 : 1.4;
        stopSequencer();
        if (isClear) sfxWin(); else sfxOver();

        if (A.audioSource) {
            try { A.audioSource.onended = null; A.audioSource.stop(); } catch (e) { }
            try { A.audioSource.disconnect(); } catch (e) { }
            A.audioSource = null;
        }

        let newRecord = false;
        if (G.score > G.best) {
            G.best = G.score;
            newRecord = true;
            try { localStorage.setItem('btb_best', String(G.best)); } catch (e) { }
        }

        const hint = $('#retryHint');
        const nameOrMode = A.mode === 'local' ? (A.localName || '当前本地曲目') : '内置音乐';
        const total = (A.mode === 'local' && A.localChart) ? A.localChart.length : 0;
        hint.textContent = (isClear ? '再挑战：' : '重试：') + nameOrMode
            + (total ? '（' + total + ' 个方块）' : '');

        setTimeout(() => {
            const titleEl = $('#resultTitle');
            const subEl = $('#resultSub');
            if (isClear) {
                titleEl.textContent = 'TRACK CLEAR';
                titleEl.classList.add('win');
                subEl.textContent = 'SONG COMPLETE';
            } else {
                titleEl.textContent = 'GAME OVER';
                titleEl.classList.remove('win');
                subEl.textContent = 'TRACK FAILED';
            }
            $('.final-score').textContent = G.score;
            $('.final-combo').textContent = G.maxCombo;
            $('.final-best').textContent = G.best;
            $('.final-p').textContent = G.tierCount[0];
            $('.final-g').textContent = G.tierCount[1];
            $('.final-gd').textContent = G.tierCount[2];
            $('.final-ok').textContent = G.tierCount[3];
            $('#newRecord').classList.toggle('hidden', !newRecord);
            $('#over').classList.remove('hidden');
        }, isClear ? 900 : 520);
    }

    /* ═══════════════════════════════════════════════════════════════
       更新
       ═══════════════════════════════════════════════════════════════ */
    function update(dt) {
        const ps = G.particles;
        let w = 0;
        for (let r = 0; r < ps.length; r++) {
            const p = ps[r];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 900 * dt;
            p.vx *= 0.99;
            p.life -= dt * 2.1;
            if (p.life > 0) {
                ps[w++] = p;
            } else {
                releaseParticle(p);
            }
        }
        ps.length = w;

        const pops = G.popups;
        w = 0;
        for (let r = 0; r < pops.length; r++) {
            const p = pops[r];
            p.y += p.vy * dt;
            p.vy *= 0.92;
            p.life -= dt * 1.5;
            if (p.life > 0) {
                pops[w++] = p;
            } else {
                releasePopup(p);
            }
        }
        pops.length = w;

        G.flash = Math.max(0, G.flash - dt * 4.2);
        G.shake = Math.max(0, G.shake - dt * 3);
        for (let i = 0; i < TRACKS; i++) {
            G.trackFlash[i] = Math.max(0, G.trackFlash[i] - dt * 3.4);
            G.trackPress[i] = Math.max(0, G.trackPress[i] - dt * 6.5);
        }

        if (G.state !== 'playing') return;
        if (!A.ctx) return;

        if (A.mode === 'builtin') {
            const targetBpm = Math.min(175, 120 + Math.floor(G.score / 300) * 5);
            if (targetBpm !== G.bpm) { G.bpm = targetBpm; A.bpm = targetBpm; }
            const t = A.ctx.currentTime - G.startTime;
            if (t - G.prevMusicT > 1.0) G.nextBeatTime = Math.max(G.nextBeatTime, t);
            G.prevMusicT = t;
            let guard = 0;
            while (t >= G.nextBeatTime - TRAVEL_TIME && guard++ < 4) {
                spawnBlock();
                G.nextBeatTime += 60 / G.bpm;
            }
        } else if (A.mode === 'local') {
            const chart = A.localChart || [];
            const t = A.ctx.currentTime - A.audioStartAt;

            if (t - G.prevMusicT > 1.0) {
                let k = G.localIdx;
                while (k < chart.length && chart[k].time < t - TRAVEL_TIME) k++;
                G.localIdx = k;
            }
            G.prevMusicT = t;

            let guard = 0;
            while (G.localIdx < chart.length &&
                t >= chart[G.localIdx].time - TRAVEL_TIME && guard++ < 4) {
                spawnBlock(chart[G.localIdx].track);
                G.localIdx++;
            }
            if (G.audioEnded) {
                G.audioEndTimer += dt;
                if (G.audioEndTimer > 1.1) { endGame('clear'); return; }
            }
        }

        const missY = G.hitLine + G.maxJudgeDist;
        const graceful = (A.mode === 'local' && G.audioEnded);
        const blocks = G.blocks;
        const speed = G.speed;

        let wb = 0;
        for (let r = 0; r < blocks.length; r++) {
            const b = blocks[r];
            if (b.dead) continue;
            b.y += speed * dt;
            const centerY = b.y + G.blockH / 2;
            if (centerY > missY) {
                if (graceful) continue;
                blocks[wb++] = b;
                blocks.length = wb;
                endGame('fail');
                return;
            }
            blocks[wb++] = b;
        }
        blocks.length = wb;
    }

    /* ═══════════════════════════════════════════════════════════════
       渲染
       ═══════════════════════════════════════════════════════════════ */
    function drawSpectrum() {
        if (!A.ctx || !spectrumBars) return;
        const an = A.analyser;
        const data = A.freq;
        if (!an || !data) return;

        an.getByteFrequencyData(data);

        const bars = spectrumBars;
        const baseY = H;
        const scaleY = H * 0.5;

        for (let i = 0; i < bars.length; i++) {
            const b = bars[i];
            let sum = 0;
            const i0 = b.i0, i1 = b.i1;
            for (let j = i0; j < i1; j++) sum += data[j];
            const v = (sum / (i1 - i0)) / 255;
            const h = Math.pow(v, 1.35) * scaleY;
            if (h < 1) continue;
            ctx.fillStyle = b.style;
            ctx.fillRect(b.x, baseY - h, b.w, h);
            ctx.fillStyle = b.topStyle;
            ctx.fillRect(b.x, baseY - h, b.w, 2);
        }
    }

    function drawJudgeBand() {
        if (!judgeBandSprite) return;
        const bandH = G.maxJudgeDist * 2 + 4;
        const y = G.hitLine - G.maxJudgeDist - 2;
        ctx.drawImage(judgeBandSprite, 0, y, W, bandH);
    }

    function drawTracks() {
        const tw = G.trackW;
        const blockH = G.blockH;
        const hitLine = G.hitLine;
        for (let i = 0; i < TRACKS; i++) {
            const x = i * tw;
            if (G.trackFlash[i] > 0.01) {
                const g = ctx.createLinearGradient(0, hitLine - blockH, 0, hitLine + blockH);
                g.addColorStop(0, 'rgba(255,255,255,0)');
                g.addColorStop(0.5, 'hsla(' + TRACK_HUES[i] + ',100%,80%,' + (G.trackFlash[i] * 0.26) + ')');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = g;
                ctx.fillRect(x, hitLine - blockH, tw, blockH * 2);
            }
            if (G.trackPress[i] > 0.01) {
                ctx.fillStyle = 'rgba(255,255,255,' + (G.trackPress[i] * 0.055) + ')';
                ctx.fillRect(x, 0, tw, H);
            }
        }

        ctx.strokeStyle = 'rgba(140,190,255,0.055)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < TRACKS; i++) {
            const x = Math.round(i * tw) + 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
        }
        ctx.stroke();

        const y = Math.round(hitLine) + 0.5;
        const grd = ctx.createLinearGradient(0, 0, W, 0);
        grd.addColorStop(0, 'rgba(103,232,249,0)');
        grd.addColorStop(0.5, 'rgba(103,232,249,0.5)');
        grd.addColorStop(1, 'rgba(103,232,249,0)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    function drawBlocks() {
        const tw = G.trackW;
        const pad = BLK_PAD;
        const w = BLK_W;
        const blockH = G.blockH;
        const maxD = G.maxJudgeDist;
        const hitLine = G.hitLine;
        const blocks = G.blocks;
        const lineH = BLK_LINE_H;
        const inset = BLK_LINE_INSET;
        const lineY0 = BLK_LINE_Y0;
        const lineW = w - inset * 2;

        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.dead) continue;
            const y = b.y;
            if (y > H || y + blockH < 0) continue;

            const x = b.track * tw + pad;
            const centerY = y + blockH * 0.5;
            const distRatio = Math.abs(centerY - hitLine) / maxD;
            const near = Math.min(1, Math.max(0, 1 - distRatio));

            ctx.fillStyle = 'hsl(' + BLOCK_HUE + ',86%,' + (40 + near * 14) + '%)';
            ctx.roundRect(x, y, w, blockH, 10);
            ctx.fill();

            // ctx.fillStyle = 'hsl(' + BLOCK_HUE + ',100%,' + (72 + near * 22) + '%)';
            // ctx.fillRect(x + inset, y + lineY0, lineW, lineH);
        }
    }

    function drawParticles() {
        const ps = G.particles;
        for (let i = 0; i < ps.length; i++) {
            const p = ps[i];
            const a = p.life;
            if (a <= 0) continue;
            ctx.fillStyle = 'hsla(' + (p.hue | 0) + ',100%,68%,' + (a * 0.9) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * a, 0, 6.283185);
            ctx.fill();
        }
    }

    let popupFont = '';

    function drawPopups() {
        const pops = G.popups;
        if (!pops.length) return;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = popupFont;
        for (let i = 0; i < pops.length; i++) {
            const p = pops[i];
            const a = Math.min(1, p.life * 1.8);
            if (a <= 0) continue;
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;
    }

    let hudBigFont = '', hudSmallFont = '';

    function drawHUD() {
        const big = Math.round(H * 0.044);
        const small = Math.round(H * 0.019);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillStyle = 'rgba(224,242,254,0.94)';
        ctx.font = hudBigFont;
        ctx.fillText(String(G.score), 20, 18);

        ctx.fillStyle = 'rgba(160,190,220,0.38)';
        ctx.font = hudSmallFont;
        ctx.fillText('SCORE', 23, 20 + big * 0.98);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(160,190,220,0.42)';
        ctx.font = hudSmallFont;
        const modeLabel = A.mode === 'local' ? 'LOCAL TRACK' : 'MUSIC MODE';
        ctx.fillText(modeLabel, W - 22, 24);
        if (A.mode !== 'local') {
            ctx.fillText(G.bpm + ' BPM', W - 22, 24 + small * 1.7);
        }

        if (G.combo > 1) {
            ctx.textAlign = 'center';
            const pop = 1 + G.flash * 0.32;
            const size = Math.round(H * 0.05 * pop);
            ctx.fillStyle = 'rgba(251,191,36,' + (0.55 + G.flash * 0.45) + ')';
            ctx.font = '800 ' + size + 'px ui-sans-serif, system-ui, sans-serif';
            ctx.fillText(G.combo + ' COMBO', W / 2, H * 0.1);
        }

        if (G.state === 'playing') {
            let remain = 0;
            if (A.mode === 'builtin') remain = G.startTime - A.ctx.currentTime;
            else if (A.mode === 'local') remain = A.audioStartAt - A.ctx.currentTime;
            if (remain > 0) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const n = Math.ceil(remain / 0.28);
                const scale = 1 + (remain % 0.28) * 0.9;
                ctx.fillStyle = 'rgba(103,232,249,0.85)';
                ctx.font = '800 ' + Math.round(H * 0.1 * scale) + 'px ui-sans-serif, system-ui, sans-serif';
                ctx.fillText(n <= 3 ? String(n) : 'READY', W / 2, H * 0.36);
            }
        }
    }

    function render() {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        if (G.shake > 0.01) {
            const s = G.shake * 9;
            ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        }

        ctx.fillStyle = bgGrad;
        ctx.fillRect(-20, -20, W + 40, H + 40);

        drawSpectrum();
        drawJudgeBand();
        drawTracks();
        drawBlocks();
        drawParticles();
        drawPopups();
        drawHUD();

        if (G.flash > 0.01) {
            ctx.fillStyle = 'rgba(180,240,255,' + (G.flash * 0.06) + ')';
            ctx.fillRect(-20, -20, W + 40, H + 40);
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       主循环
       ═══════════════════════════════════════════════════════════════ */
    let lastT = performance.now();

    function loop(now) {
        requestAnimationFrame(loop);
        const dt = (now - lastT) / 1000;
        lastT = now;
        if (dt > 0.05) { update(0.05); } else { update(dt); }
        render();
    }

    /* ═══════════════════════════════════════════════════════════════
       流程控制
       ═══════════════════════════════════════════════════════════════ */
    function showLoading(title, tip) {
        $('#loadTitle').textContent = title || '正在分析音频节拍…';
        $('#loadTip').textContent = tip || '节拍识别需要几秒钟，请稍候';
        $('#loading').classList.remove('hidden');
        $('#menu').classList.add('hidden');
        $('#over').classList.add('hidden');
    }
    function hideLoading() { $('#loading').classList.add('hidden'); }

    async function beginGame(mode) {
        hideLoading();
        $('#menu').classList.add('hidden');
        $('#over').classList.add('hidden');
        A.mode = mode;
        G.state = 'playing';
        resetGame();
    }

    async function startBuiltin() {
        try { await initAudio(); } catch (e) { return; }
        if (A.ctx.state === 'suspended') { try { await A.ctx.resume(); } catch (e) { } }
        stopAllAudio();
        await beginGame('builtin');
    }

    async function startLocalFile(file) {
            document.body.requestFullscreen();
        showLoading('正在读取音频文件…', file.name || '');
        try {
            await initAudio();
            if (A.ctx.state === 'suspended') { try { await A.ctx.resume(); } catch (e) { } }
            stopAllAudio();

            const arr = await file.arrayBuffer();
            showLoading('正在加载音频…', '大文件可能需要更久');
            await nextPaint();

            let buffer;
            try { buffer = await A.ctx.decodeAudioData(arr); }
            catch (e) { throw new Error('无法加载该音频格式'); }
            if (!buffer || !buffer.length) throw new Error('音频为空');

            showLoading('正在检测音频能量峰值…', '哪里能量高，哪里出方块');
            await nextPaint();

            let onsets = null;
            try { onsets = analyzeOnsets(buffer); } catch (e) { onsets = null; }
            const dur = buffer.duration;

            if (!onsets || onsets.length < 4) {
                onsets = [];
                for (let t = 0.6; t < dur; t += 0.55) onsets.push({ time: t, band: 1 });
                toast('未识别到明显能量峰值，已使用固定节拍');
            }

            showLoading('正在预排谱面…', '共 ' + onsets.length + ' 个能量点');
            await nextPaint();

            const speed = (G.hitLine + G.blockH) / TRAVEL_TIME;
            const minTrackGap = (G.blockH * TRACK_SAFETY) / speed;

            const chart = buildChart(onsets, minTrackGap);

            A.localBuffer = buffer;
            A.localBeats = onsets;
            A.localChart = chart;
            A.localName = file.name || '本地音频';

            hideLoading();
            await beginGame('local');
        } catch (e) {
            hideLoading();
            $('#menu').classList.remove('hidden');
            toast('音频处理失败：' + (e && e.message ? e.message : e));
            document.exitFullscreen()
        }
    }

    async function retryCurrent() {
        const prevMode = A.mode;
        const keepBuffer = A.localBuffer;
        const keepBeats = A.localBeats;
        const keepChart = A.localChart;
        try { await initAudio(); } catch (e) { return; }
        if (A.ctx.state === 'suspended') { try { await A.ctx.resume(); } catch (e) { } }
        stopAllAudio();

        if (prevMode === 'local' && keepBuffer) {
            A.localBuffer = keepBuffer;
            A.localBeats = keepBeats;
            A.localChart = keepChart;
            await beginGame('local');
            return;
        }
        await beginGame('builtin');
    }

    function backToMenu() {
        G.state = 'menu';
        stopAllAudio();
        clearLocalAsset();
        G.blocks.length = 0;
        for (let i = 0; i < G.particles.length; i++) releaseParticle(G.particles[i]);
        for (let i = 0; i < G.popups.length; i++) releasePopup(G.popups[i]);
        G.particles.length = 0;
        G.popups.length = 0;
        hideLoading();
        $('#over').classList.add('hidden');
        $('#menu').classList.remove('hidden');
    }

    /* ═══════════════════════════════════════════════════════════════
       输入
       ═══════════════════════════════════════════════════════════════ */
    const KEYMAP = {
        d: 0, f: 1, j: 2, k: 3,
        arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3,
    };

    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === ' ' || k === 'enter') {
            if (G.state === 'menu') { e.preventDefault(); startBuiltin(); }
            else if (G.state === 'over') { e.preventDefault(); retryCurrent(); }
            return;
        }
        if (k in KEYMAP) { e.preventDefault(); tryHit(KEYMAP[k]); }
    });

    function handleScreenX(clientX) {
        if (G.state !== 'playing') return;
        const rect = cv.getBoundingClientRect();
        if (!rect.width) return;
        const x = clientX - rect.left;
        const trackW = rect.width / TRACKS;
        const track = Math.max(0, Math.min(TRACKS - 1, Math.floor(x / trackW)));
        tryHit(track);
    }

    if (window.PointerEvent) {
        const seen = new Set();
        cv.addEventListener('pointerdown', (e) => {
            if (G.state !== 'playing') return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            if (seen.has(e.pointerId)) return;
            seen.add(e.pointerId);
            handleScreenX(e.clientX);
        }, { passive: false });
        const clear = (e) => { seen.delete(e.pointerId); };
        cv.addEventListener('pointerup', clear);
        cv.addEventListener('pointercancel', clear);
        cv.addEventListener('pointerleave', clear);
    } else {
        cv.addEventListener('touchstart', (e) => {
            if (G.state !== 'playing') return;
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                handleScreenX(e.changedTouches[i].clientX);
            }
        }, { passive: false });
        cv.addEventListener('mousedown', (e) => {
            if (G.state !== 'playing') return;
            e.preventDefault();
            handleScreenX(e.clientX);
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       按钮绑定
       ═══════════════════════════════════════════════════════════════ */
    $('#btnStart').addEventListener('click', () => startBuiltin());
    $('#btnRetry').addEventListener('click', () => retryCurrent());
    $('#btnMenu').addEventListener('click', backToMenu);

    const fileInput = $('#fileInput');
    $('#btnLocal').addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (f.size > 60 * 1024 * 1024) { toast('文件过大（建议小于 60MB）'); return; }
        startLocalFile(f);
    });

    /* ═══════════════════════════════════════════════════════════════
       启动 / 生命周期
       ═══════════════════════════════════════════════════════════════ */
    function refreshFonts() {
        popupFont = '800 ' + Math.round(H * 0.028) + 'px ui-sans-serif, system-ui, sans-serif';
        hudBigFont = '800 ' + Math.round(H * 0.044) + 'px ui-sans-serif, system-ui, sans-serif';
        hudSmallFont = '600 ' + Math.round(H * 0.019) + 'px ui-sans-serif, system-ui, sans-serif';
    }

    window.addEventListener('resize', () => { resize(); refreshFonts(); });
    window.addEventListener('orientationchange', () => setTimeout(() => window.dispatchEvent(new Event('resize')), 180));

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) lastT = performance.now();
    });

    /* ═══════════════════════════════════════════════════════════════
   难度滑块绑定
   ═══════════════════════════════════════════════════════════════ */
    function bindSlider(id, valId, key, fmt) {
        const s = document.getElementById(id);
        const v = document.getElementById(valId);
        if (!s || !v) return;

        s.value = CFG[key];
        v.textContent = fmt(CFG[key]);

        s.addEventListener('input', () => {
            CFG[key] = parseFloat(s.value);
            v.textContent = fmt(CFG[key]);
            try { localStorage.setItem('btb_cfg', JSON.stringify(CFG)); } catch (e) { }
            applyCfg();
            resize();   /* 刷新 G.speed / G.maxJudgeDist / 判定带精灵 */
        });
    }

    bindSlider('sldTravel', 'valTravel', 'travel', (v) => v.toFixed(2));
    bindSlider('sldJudge', 'valJudge', 'judge', (v) => v.toFixed(2));
    bindSlider('sldDensity', 'valDensity', 'density', (v) => String(v | 0));

    resize();
    refreshFonts();
    requestAnimationFrame(loop);

})();