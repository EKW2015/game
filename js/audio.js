/**
 * 用 WebAudio 合成的 8-bit 音效，不依赖任何音频文件。
 * 浏览器要求用户交互后才能播放声音，所以 AudioContext 在第一次 play() 时才创建。
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
    } catch (err) {
      ctx = null;
    }
    return ctx;
  }

  /** 一段带包络的方波 / 锯齿波。 */
  function tone(opts) {
    if (muted) return;
    var ac = ensureContext();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume();

    var t0 = ac.currentTime + (opts.delay || 0);
    var duration = opts.duration;
    var osc = ac.createOscillator();
    var gain = ac.createGain();

    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + duration);
    }

    var volume = opts.volume == null ? 0.12 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  global.Sfx = {
    jump: function () {
      tone({ from: 420, to: 760, duration: 0.12, volume: 0.1 });
    },
    point: function () {
      tone({ from: 880, duration: 0.07, volume: 0.08 });
      tone({ from: 1320, duration: 0.09, volume: 0.08, delay: 0.09 });
    },
    die: function () {
      tone({ type: 'sawtooth', from: 520, to: 90, duration: 0.55, volume: 0.14 });
    },
    isMuted: function () {
      return muted;
    },
    setMuted: function (value) {
      muted = !!value;
      return muted;
    },
    toggle: function () {
      muted = !muted;
      return muted;
    }
  };
})(window);
