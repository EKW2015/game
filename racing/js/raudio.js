/**
 * 夜城飙车 - 引擎声、轮胎尖叫、检查点提示音（WebAudio 程序化生成）
 */
(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;
  var started = false;
  var master = null;
  var engine = null;
  var tire = null;
  var noiseBuffer = null;

  function ensure() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function makeNoise(ac) {
    if (noiseBuffer) return noiseBuffer;
    var len = Math.floor(ac.sampleRate * 1.5);
    noiseBuffer = ac.createBuffer(1, len, ac.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  /** 引擎：两个锯齿波叠加，经低通滤波，频率跟随转速 */
  function buildEngine(ac) {
    var gain = ac.createGain();
    gain.gain.value = 0;
    var filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 6;

    var oscA = ac.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 60;
    var oscB = ac.createOscillator();
    oscB.type = 'square';
    oscB.frequency.value = 30;
    var subGain = ac.createGain();
    subGain.gain.value = 0.4;

    oscA.connect(filter);
    oscB.connect(subGain);
    subGain.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscA.start();
    oscB.start();

    return { gain: gain, filter: filter, oscA: oscA, oscB: oscB };
  }

  function buildTire(ac) {
    var src = ac.createBufferSource();
    src.buffer = makeNoise(ac);
    src.loop = true;
    var filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 3.5;
    var gain = ac.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    return { gain: gain, filter: filter };
  }

  function start() {
    var ac = ensure();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    if (started) return;
    engine = buildEngine(ac);
    tire = buildTire(ac);
    started = true;
  }

  function burst(opts) {
    var ac = ensure();
    if (!ac || muted) return;
    var src = ac.createBufferSource();
    src.buffer = makeNoise(ac);
    var filter = ac.createBiquadFilter();
    filter.type = opts.type || 'lowpass';
    filter.frequency.setValueAtTime(opts.from, ac.currentTime);
    filter.frequency.exponentialRampToValueAtTime(opts.to || opts.from, ac.currentTime + opts.duration);
    var gain = ac.createGain();
    gain.gain.setValueAtTime(opts.volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + opts.duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    src.stop(ac.currentTime + opts.duration + 0.05);
  }

  function tone(from, to, duration, volume, type) {
    var ac = ensure();
    if (!ac || muted) return;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, ac.currentTime);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, ac.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ac.currentTime + duration + 0.05);
  }

  global.RaceAudio = {
    start: start,

    /** 每帧根据车辆状态更新引擎与轮胎噪声 */
    update: function (car, dt) {
      if (!started || !ctx) return;
      var vol = muted ? 0 : 1;
      var rpm = car.rpm;
      var freq = 42 + rpm * 165 + (car.boosting ? 30 : 0);
      var target = muted ? 0 : (0.055 + rpm * 0.075);
      engine.oscA.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
      engine.oscB.frequency.setTargetAtTime(freq * 0.5, ctx.currentTime, 0.05);
      engine.filter.frequency.setTargetAtTime(500 + rpm * 2200, ctx.currentTime, 0.08);
      engine.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.06);

      var slip = car.drifting ? Math.min(1, car.driftAngle * 2.2) : 0;
      if (car.offRoad && car.speed > 6) slip = Math.max(slip, 0.35);
      tire.gain.gain.setTargetAtTime(slip * 0.09 * vol, ctx.currentTime, 0.05);
      tire.filter.frequency.setTargetAtTime(1600 + slip * 2400, ctx.currentTime, 0.1);
    },

    gate: function () {
      tone(760, 1180, 0.16, 0.16, 'triangle');
      tone(1180, 1560, 0.18, 0.1, 'sine');
    },
    coin: function () {
      tone(1180, 1760, 0.09, 0.11, 'square');
    },
    beep: function (freq) {
      tone(freq || 660, null, 0.16, 0.16, 'square');
    },
    win: function () {
      tone(523, null, 0.14, 0.14, 'triangle');
      tone(659, null, 0.14, 0.14, 'triangle');
      tone(784, null, 0.3, 0.16, 'triangle');
    },
    crash: function (strength) {
      burst({ from: 900, to: 90, duration: 0.28, volume: Math.min(0.4, 0.12 + strength * 0.3) });
      tone(120, 55, 0.22, 0.16, 'sawtooth');
    },
    drift: function () {
      tone(520, 900, 0.2, 0.12, 'triangle');
    },
    boost: function () {
      burst({ type: 'bandpass', from: 400, to: 3200, duration: 0.45, volume: 0.18 });
    },
    over: function () {
      tone(440, 180, 0.5, 0.18, 'sawtooth');
    },
    isMuted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      if (started && ctx) {
        engine.gain.gain.setTargetAtTime(muted ? 0 : 0.06, ctx.currentTime, 0.05);
        tire.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
      return muted;
    },
    setMuted: function (v) { muted = !!v; return muted; }
  };
})(window);
