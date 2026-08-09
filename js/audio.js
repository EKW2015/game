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
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.duration);
    var vol = opts.volume == null ? 0.1 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  global.Sfx = {
    bite: function () {
      tone({ type: 'sawtooth', from: 180, to: 90, duration: 0.08, volume: 0.08 });
    },
    eat: function () {
      tone({ from: 320, to: 640, duration: 0.15, volume: 0.1 });
      tone({ from: 520, to: 880, duration: 0.12, volume: 0.08, delay: 0.08 });
    },
    evolve: function () {
      tone({ from: 440, duration: 0.1, volume: 0.09 });
      tone({ from: 660, duration: 0.1, volume: 0.09, delay: 0.1 });
      tone({ from: 880, duration: 0.18, volume: 0.1, delay: 0.2 });
    },
    win: function () {
      tone({ from: 523, duration: 0.12, volume: 0.1 });
      tone({ from: 659, duration: 0.12, volume: 0.1, delay: 0.12 });
      tone({ from: 784, duration: 0.25, volume: 0.12, delay: 0.24 });
    },
    die: function () {
      tone({ type: 'sawtooth', from: 400, to: 60, duration: 0.5, volume: 0.12 });
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
