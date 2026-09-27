/**
 * 斗罗大陆：光明圣龙 3D 音效生成器 (Web Audio API 合成)
 */
(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;

  function ensureContext() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function tone(opts) {
    if (muted) return;
    var ac = ensureContext();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();

    var t0 = ac.currentTime + (opts.delay || 0);
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.duration);
    var vol = opts.volume == null ? 0.1 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  function noise(opts) {
    if (muted) return;
    var ac = ensureContext();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();

    var bufferSize = ac.sampleRate * (opts.duration || 0.2);
    var buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    var noiseSource = ac.createBufferSource();
    noiseSource.buffer = buffer;

    var filter = ac.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opts.freq || 800, ac.currentTime + (opts.delay || 0));

    var gain = ac.createGain();
    var t0 = ac.currentTime + (opts.delay || 0);
    var vol = opts.volume == null ? 0.08 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.duration || 0.2));

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    noiseSource.start(t0);
    noiseSource.stop(t0 + (opts.duration || 0.2) + 0.02);
  }

  global.Sfx = {
    // 普攻 / 撕咬
    bite: function () {
      tone({ type: 'triangle', from: 220, to: 110, duration: 0.1, volume: 0.1 });
    },
    // 击中敌人
    hit: function () {
      noise({ duration: 0.12, freq: 500, volume: 0.12 });
      tone({ type: 'sawtooth', from: 180, to: 60, duration: 0.1, volume: 0.12 });
    },
    // 魂力恢复 / 吸收
    absorb: function () {
      tone({ from: 400, to: 800, duration: 0.2, volume: 0.08 });
      tone({ from: 600, to: 1200, duration: 0.25, volume: 0.06, delay: 0.1 });
    },
    // 第1魂技：光明龙爪
    claw: function () {
      tone({ type: 'sawtooth', from: 600, to: 200, duration: 0.18, volume: 0.14 });
      noise({ duration: 0.15, freq: 1200, volume: 0.1 });
    },
    // 第2魂技：圣龙之翼（振翅飞行+发射光羽）
    wing: function () {
      tone({ type: 'sine', from: 300, to: 700, duration: 0.25, volume: 0.12 });
      tone({ type: 'triangle', from: 800, to: 1400, duration: 0.2, volume: 0.1, delay: 0.08 });
    },
    // 第3魂技：光明龙啸（龙吟震荡）
    roar: function () {
      tone({ type: 'sawtooth', from: 260, to: 110, duration: 0.7, volume: 0.2 });
      tone({ type: 'square', from: 320, to: 140, duration: 0.6, volume: 0.15, delay: 0.05 });
      noise({ duration: 0.5, freq: 400, volume: 0.15 });
    },
    // 第4魂技：圣龙金身
    goldBody: function () {
      tone({ type: 'sine', from: 200, to: 600, duration: 0.35, volume: 0.16 });
      tone({ type: 'triangle', from: 400, to: 900, duration: 0.4, volume: 0.14, delay: 0.1 });
      tone({ type: 'sine', from: 800, to: 1200, duration: 0.45, volume: 0.12, delay: 0.2 });
    },
    // 第5魂技：光耀审判击（天降巨剑轰击）
    judgment: function () {
      tone({ type: 'sine', from: 1200, to: 300, duration: 0.4, volume: 0.18 });
      noise({ duration: 0.6, freq: 300, volume: 0.22, delay: 0.3 });
      tone({ type: 'sawtooth', from: 180, to: 45, duration: 0.5, volume: 0.25, delay: 0.3 });
    },
    // 第6魂技：追踪太阳神光（激光持续破空）
    laser: function () {
      tone({ type: 'sawtooth', from: 900, to: 400, duration: 0.4, volume: 0.16 });
      tone({ type: 'sine', from: 1400, to: 600, duration: 0.35, volume: 0.12, delay: 0.05 });
    },
    // 第7魂技：光明圣龙真身（百米金龙怒吼变身）
    avatar: function () {
      tone({ type: 'sawtooth', from: 160, to: 90, duration: 1.2, volume: 0.28 });
      tone({ type: 'square', from: 240, to: 120, duration: 1.0, volume: 0.25, delay: 0.1 });
      tone({ type: 'sine', from: 523, to: 1046, duration: 0.8, volume: 0.2, delay: 0.3 });
      noise({ duration: 0.9, freq: 600, volume: 0.2 });
    },
    // 魂骨技：圣龙裂空爪
    voidClaw: function () {
      tone({ type: 'sawtooth', from: 800, to: 150, duration: 0.25, volume: 0.18 });
      noise({ duration: 0.2, freq: 1600, volume: 0.15 });
    },
    // 魂骨技：太阳重力拳
    gravityPunch: function () {
      tone({ type: 'square', from: 180, to: 40, duration: 0.35, volume: 0.22 });
      noise({ duration: 0.4, freq: 250, volume: 0.2 });
    },
    // 领域：圣龙主迹领域展开
    domain: function () {
      tone({ type: 'sine', from: 261, to: 523, duration: 0.8, volume: 0.15 });
      tone({ type: 'sine', from: 392, to: 784, duration: 0.8, volume: 0.15, delay: 0.2 });
      tone({ type: 'sine', from: 523, to: 1046, duration: 1.0, volume: 0.18, delay: 0.4 });
    },
    // 自创魂技音效
    comboPunch: function () {
      tone({ type: 'triangle', from: 300, to: 120, duration: 0.15, volume: 0.15 });
      noise({ duration: 0.15, freq: 800, volume: 0.12, delay: 0.1 });
    },
    blink: function () {
      tone({ type: 'sine', from: 500, to: 1200, duration: 0.15, volume: 0.12 });
    },
    sword: function () {
      tone({ type: 'triangle', from: 700, to: 1100, duration: 0.2, volume: 0.12 });
    },
    levelUp: function () {
      tone({ from: 523, duration: 0.15, volume: 0.14 });
      tone({ from: 659, duration: 0.15, volume: 0.14, delay: 0.15 });
      tone({ from: 784, duration: 0.18, volume: 0.16, delay: 0.3 });
      tone({ from: 1046, duration: 0.3, volume: 0.2, delay: 0.45 });
    },
    die: function () {
      tone({ type: 'sawtooth', from: 300, to: 40, duration: 0.6, volume: 0.2 });
    },
    isMuted: function () {
      return muted;
    },
    toggle: function () {
      muted = !muted;
      return muted;
    },
    setMuted: function (value) {
      muted = !!value;
      return muted;
    }
  };
})(window);
