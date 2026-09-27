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

  // 魂师等级对应称号
  var RANK_TITLES = [
    { level: 1, title: '魂士' },
    { level: 11, title: '魂师' },
    { level: 21, title: '大魂师' },
    { level: 31, title: '魂尊' },
    { level: 41, title: '魂宗' },
    { level: 51, title: '魂王' },
    { level: 61, title: '魂帝' },
    { level: 71, title: '魂圣' },
    { level: 81, title: '魂斗罗' },
    { level: 91, title: '封号斗罗【圣龙斗罗】' },
    { level: 99, title: '绝世斗罗【光明圣龙】' }
  ];

  function getTitleByLevel(lvl) {
    for (var i = RANK_TITLES.length - 1; i >= 0; i--) {
      if (lvl >= RANK_TITLES[i].level) return RANK_TITLES[i].title;
    }
    return '魂士';
  }

  // 魂环配置：黄、紫、紫、黑、黑、黑、红
  var SOUL_RING_COLORS = [
    0xf6d32d, // 1 黄 (百年)
    0xa347ba, // 2 紫 (千年)
    0xa347ba, // 3 紫 (千年)
    0x2c2c34, // 4 黑 (万年)
    0x2c2c34, // 5 黑 (万年)
    0x2c2c34, // 6 黑 (万年)
    0xe62a35  // 7 红 (十万年)
  ];

  var SOUL_RING_EMISSIVES = [
    0xffe066,
    0xdf80ff,
    0xdf80ff,
    0x5c4d7d,
    0x5c4d7d,
    0x5c4d7d,
    0xff3344
  ];

  global.Utils = {
    clamp: clamp,
    lerp: lerp,
    rand: rand,
    randInt: randInt,
    dist: dist,
    angleTo: angleTo,
    wrapAngle: wrapAngle,
    getTitleByLevel: getTitleByLevel,
    SOUL_RING_COLORS: SOUL_RING_COLORS,
    SOUL_RING_EMISSIVES: SOUL_RING_EMISSIVES
  };
})(window);
