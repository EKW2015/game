/**
 * 音效：合成引擎声（随转速变调）、轮胎尖叫、氮气、撞击与倒计时提示音。
 */
(function (global) {
  'use strict';

  var ctx = null;
  var muted = false;
  var master = null;
  var engine = null;
  var screech = null;
  var noiseBuffer = null;

  function ensure() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (err) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function makeNoise() {
    if (noiseBuffer) return noiseBuffer;
    var len = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  var Sfx = {
    resume: function () {
      var c = ensure();
      if (c && c.state === 'suspended') c.resume();
    },

    toggle: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },

    isMuted: function () {
      return muted;
    },

    startEngine: function () {
      var c = ensure();
      if (!c || engine) return;

      var gain = c.createGain();
      gain.gain.value = 0;
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      gain.connect(filter);
      filter.connect(master);

      var osc1 = c.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 60;
      var osc2 = c.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 30;
      var sub = c.createGain();
      sub.gain.value = 0.4;
      osc1.connect(gain);
      osc2.connect(sub);
      sub.connect(gain);
      osc1.start();
      osc2.start();

      engine = { gain: gain, osc1: osc1, osc2: osc2, filter: filter };

      var noise = c.createBufferSource();
      noise.buffer = makeNoise();
      noise.loop = true;
      var band = c.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2200;
      band.Q.value = 2.5;
      var sgain = c.createGain();
      sgain.gain.value = 0;
      noise.connect(band);
      band.connect(sgain);
      sgain.connect(master);
      noise.start();
      screech = { gain: sgain, filter: band };
    },

    stopEngine: function () {
      if (!engine) return;
      try {
        engine.osc1.stop();
        engine.osc2.stop();
      } catch (err) { /* 已停止 */ }
      engine = null;
      if (screech) screech.gain.gain.value = 0;
    },

    /** 每帧更新：rpm 0~1，负载 0~1 */
    engineState: function (rpm, load, drift, nos) {
      if (!engine || !ctx) return;
      var base = 55 + rpm * 240 + (nos ? 40 : 0);
      var now = ctx.currentTime;
      engine.osc1.frequency.setTargetAtTime(base, now, 0.05);
      engine.osc2.frequency.setTargetAtTime(base * 0.5, now, 0.05);
      engine.filter.frequency.setTargetAtTime(600 + rpm * 2600, now, 0.08);
      engine.gain.gain.setTargetAtTime(0.05 + load * 0.14 + rpm * 0.05, now, 0.08);
      if (screech) {
        screech.gain.gain.setTargetAtTime(drift * 0.22, now, 0.06);
        screech.filter.frequency.setTargetAtTime(1800 + drift * 1600, now, 0.06);
      }
    },

    beep: function (freq, duration, type, volume) {
      var c = ensure();
      if (!c || muted) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume === undefined ? 0.18 : volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(c.currentTime + duration + 0.02);
    },

    crash: function (force) {
      var c = ensure();
      if (!c || muted) return;
      var src = c.createBufferSource();
      src.buffer = makeNoise();
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500 + force * 40;
      var gain = c.createGain();
      var vol = Math.min(0.4, 0.05 + force * 0.02);
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
      src.stop(c.currentTime + 0.4);
    },

    nos: function () {
      Sfx.beep(180, 0.5, 'sawtooth', 0.1);
    },

    countdown: function (step) {
      Sfx.beep(step === 0 ? 880 : 440, step === 0 ? 0.6 : 0.22, 'square', 0.22);
    },

    cash: function () {
      Sfx.beep(1046, 0.12, 'triangle', 0.2);
      global.setTimeout(function () { Sfx.beep(1568, 0.18, 'triangle', 0.18); }, 90);
    }
  };

  global.Sfx = Sfx;
})(window);
