/**
 * 夜城飙车 - 通用数学工具（不依赖 THREE，可在 Node 中直接测试）
 */
(function (global) {
  'use strict';

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** 与帧率无关的指数逼近 */
  function damp(current, target, rate, dt) {
    return lerp(current, target, 1 - Math.exp(-rate * dt));
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /** 稳定的二维哈希：同一坐标永远得到同一个 0~1 值，用于程序化生成城市 */
  function hash2(x, y, salt) {
    var h = x * 374761393 + y * 668265263 + (salt || 0) * 2147483647;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  /** 由种子派生的确定性随机数发生器 */
  function seeded(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function kmh(speedMetersPerSecond) {
    return speedMetersPerSecond * 3.6;
  }

  global.RU = {
    clamp: clamp,
    lerp: lerp,
    damp: damp,
    wrapAngle: wrapAngle,
    rand: rand,
    randInt: randInt,
    pick: pick,
    hash2: hash2,
    seeded: seeded,
    kmh: kmh
  };
})(typeof window !== 'undefined' ? window : global);
