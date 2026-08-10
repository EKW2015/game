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

  function radiusFromMass(mass) {
    return Math.sqrt(mass) * 2.8 + 8;
  }

  function massFromRadius(r) {
    return Math.max(1, ((r - 8) / 2.8) * ((r - 8) / 2.8));
  }

  function evolutionStage(mass) {
    if (mass < 35) return 0;
    if (mass < 90) return 1;
    if (mass < 180) return 2;
    return 3;
  }

  var STAGE_NAMES = ['幼龙', '猎手', '霸主', '传说'];

  global.Utils = {
    clamp: clamp,
    lerp: lerp,
    rand: rand,
    randInt: randInt,
    dist: dist,
    angleTo: angleTo,
    wrapAngle: wrapAngle,
    radiusFromMass: radiusFromMass,
    massFromRadius: massFromRadius,
    evolutionStage: evolutionStage,
    stageName: function (mass) {
      return STAGE_NAMES[evolutionStage(mass)];
    }
  };
})(window);
