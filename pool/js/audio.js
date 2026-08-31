/**
 * 台球音效（Web Audio，无需外部文件）。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});
  var ctx = null;
  var muted = false;

  function ac() {
    if (!ctx) {
      var C = global.AudioContext || global.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, gain, freqEnd) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
    g.gain.setValueAtTime(gain || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }

  Pool.Sfx = {
    unlock: function () { ac(); },
    toggle: function () {
      muted = !muted;
      return muted;
    },
    isMuted: function () { return muted; },
    cue: function (power) {
      beep(90 + power * 40, 0.08, 'sine', 0.07 + power * 0.06, 50);
    },
    collide: function (force) {
      var f = Pool.clamp(force / 400, 0.15, 1);
      beep(180 + f * 120, 0.05, 'triangle', 0.03 + f * 0.05);
    },
    rail: function () {
      beep(140, 0.04, 'square', 0.02);
    },
    pocket: function () {
      beep(220, 0.18, 'sine', 0.09, 90);
    },
    win: function () {
      beep(440, 0.15, 'sine', 0.08);
      setTimeout(function () { beep(554, 0.18, 'sine', 0.08); }, 120);
      setTimeout(function () { beep(659, 0.28, 'sine', 0.09); }, 240);
    },
    foul: function () {
      beep(160, 0.2, 'sawtooth', 0.05, 80);
    }
  };
})(typeof window !== 'undefined' ? window : global);
