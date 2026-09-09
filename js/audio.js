(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;

  function ensureContext() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try { ctx = new Ctor(); } catch (e) { ctx = null; }
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
    var vol = opts.volume == null ? 0.08 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  global.Sfx = {
    move: function () {
      tone({ type: 'triangle', from: 420, to: 280, duration: 0.07, volume: 0.05 });
    },
    capture: function () {
      tone({ type: 'square', from: 220, to: 90, duration: 0.1, volume: 0.06 });
      tone({ type: 'triangle', from: 160, to: 70, duration: 0.12, volume: 0.04, delay: 0.03 });
    },
    castle: function () {
      tone({ type: 'triangle', from: 330, duration: 0.08, volume: 0.05 });
      tone({ type: 'triangle', from: 440, duration: 0.1, volume: 0.05, delay: 0.07 });
    },
    check: function () {
      tone({ type: 'sawtooth', from: 520, to: 360, duration: 0.12, volume: 0.05 });
      tone({ type: 'triangle', from: 720, duration: 0.1, volume: 0.04, delay: 0.08 });
    },
    promote: function () {
      tone({ from: 523, duration: 0.09, volume: 0.06 });
      tone({ from: 659, duration: 0.1, volume: 0.06, delay: 0.08 });
      tone({ from: 784, duration: 0.14, volume: 0.07, delay: 0.16 });
    },
    win: function () {
      tone({ from: 523, duration: 0.12, volume: 0.08 });
      tone({ from: 659, duration: 0.12, volume: 0.08, delay: 0.12 });
      tone({ from: 784, duration: 0.18, volume: 0.09, delay: 0.24 });
      tone({ from: 1046, duration: 0.28, volume: 0.08, delay: 0.4 });
    },
    draw: function () {
      tone({ type: 'triangle', from: 392, duration: 0.16, volume: 0.06 });
      tone({ type: 'triangle', from: 349, duration: 0.22, volume: 0.05, delay: 0.16 });
    },
    illegal: function () {
      tone({ type: 'square', from: 140, to: 90, duration: 0.08, volume: 0.04 });
    },
    select: function () {
      tone({ type: 'sine', from: 640, to: 520, duration: 0.04, volume: 0.03 });
    },
    isMuted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      return muted;
    },
    setMuted: function (value) {
      muted = !!value;
      return muted;
    }
  };
})(typeof window !== 'undefined' ? window : global);
