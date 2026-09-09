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
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + opts.duration);
    var vol = opts.volume == null ? 0.1 : opts.volume;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  function chord(base, steps) {
    for (var i = 0; i < steps.length; i++) {
      tone({ from: base * steps[i], duration: 0.16, volume: 0.05, delay: i * 0.05, type: 'triangle' });
    }
  }

  global.Sfx = {
    attack: function () {
      tone({ type: 'sawtooth', from: 240, to: 90, duration: 0.09, volume: 0.07 });
    },
    skill: function (kind) {
      if (kind === 'claw') {
        tone({ type: 'sawtooth', from: 520, to: 180, duration: 0.14, volume: 0.08 });
        tone({ type: 'triangle', from: 880, to: 440, duration: 0.12, volume: 0.05, delay: 0.04 });
      } else if (kind === 'wings') {
        chord(392, [1, 1.25, 1.5]);
      } else if (kind === 'roar') {
        tone({ type: 'sawtooth', from: 140, to: 55, duration: 0.45, volume: 0.12 });
      } else if (kind === 'golden') {
        chord(523, [1, 1.26, 1.5, 2]);
      } else if (kind === 'judgment') {
        tone({ type: 'square', from: 220, to: 880, duration: 0.28, volume: 0.09 });
      } else if (kind === 'sunbeam') {
        tone({ type: 'sine', from: 660, to: 1320, duration: 0.35, volume: 0.07 });
      } else if (kind === 'truebody') {
        chord(220, [1, 1.5, 2, 3]);
        tone({ type: 'triangle', from: 110, to: 330, duration: 0.6, volume: 0.1, delay: 0.1 });
      } else if (kind === 'flash') {
        tone({ type: 'sine', from: 980, to: 1960, duration: 0.08, volume: 0.06 });
      } else if (kind === 'domain') {
        chord(174, [1, 1.5, 2, 2.5, 3]);
      } else {
        tone({ type: 'triangle', from: 480, to: 240, duration: 0.16, volume: 0.07 });
      }
    },
    hit: function () {
      tone({ type: 'square', from: 160, to: 70, duration: 0.07, volume: 0.06 });
    },
    win: function () {
      chord(523, [1, 1.25, 1.5, 2]);
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
