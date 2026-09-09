(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function angleTo(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function facingDot(unit, tx, ty) {
    var dx = tx - unit.x;
    var dy = ty - unit.y;
    var len = Math.hypot(dx, dy) || 1;
    return (Math.cos(unit.angle) * dx + Math.sin(unit.angle) * dy) / len;
  }

  var RING_COLORS = ['#ffd24a', '#c56bff', '#c56bff', '#4a4a52', '#4a4a52', '#4a4a52', '#ff4d4d'];
  var RING_GLOW = ['#ffe27a', '#e0b0ff', '#e0b0ff', '#8a8a96', '#8a8a96', '#8a8a96', '#ff7a7a'];

  global.Utils = {
    clamp: clamp,
    lerp: lerp,
    rand: rand,
    randInt: randInt,
    dist: dist,
    angleTo: angleTo,
    wrapAngle: wrapAngle,
    facingDot: facingDot,
    RING_COLORS: RING_COLORS,
    RING_GLOW: RING_GLOW
  };
})(window);
