/**
 * 闯关关卡：短布局，几杆内打进指定数量。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  Pool.COLORS = {
    1: '#f0c400',
    2: '#1e5ad7',
    3: '#d61f2a',
    4: '#6b2ca0',
    5: '#e07a12',
    6: '#1a8f3c',
    7: '#6b1c1c',
    8: '#111111',
    9: '#f0c400',
    10: '#1e5ad7',
    11: '#d61f2a',
    12: '#6b2ca0',
    13: '#e07a12',
    14: '#1a8f3c',
    15: '#6b1c1c'
  };

  Pool.LEVELS = [
    {
      name: '开门红',
      info: '瞄准黄球，空格一杆推进右下角袋',
      shots: 3,
      need: 1,
      cue: { x: 240, y: 180 },
      balls: [{ id: 1, x: 700, y: 350 }]
    },
    {
      name: '左右开弓',
      info: '两颗球都要打进（4 杆内）',
      shots: 4,
      need: 2,
      cue: { x: 400, y: 210 },
      balls: [
        { id: 3, x: 140, y: 80 },
        { id: 2, x: 660, y: 80 }
      ]
    },
    {
      name: '清台小试',
      info: '三颗彩球，打进其中两颗',
      shots: 5,
      need: 2,
      cue: { x: 180, y: 200 },
      balls: [
        { id: 1, x: 500, y: 90 },
        { id: 5, x: 560, y: 200 },
        { id: 6, x: 500, y: 310 }
      ]
    },
    {
      name: '黑八点心',
      info: '把 8 号推进右下角，别把白球打进',
      shots: 4,
      need: 1,
      cue: { x: 260, y: 160 },
      balls: [
        { id: 8, x: 690, y: 345 },
        { id: 9, x: 430, y: 230 }
      ]
    },
    {
      name: '大满贯',
      info: '五颗球，打进三颗即可过关',
      shots: 6,
      need: 3,
      cue: { x: 170, y: 200 },
      balls: [
        { id: 1, x: 420, y: 80 },
        { id: 3, x: 520, y: 140 },
        { id: 8, x: 560, y: 200 },
        { id: 11, x: 520, y: 260 },
        { id: 15, x: 420, y: 320 }
      ]
    }
  ];
})(typeof window !== 'undefined' ? window : global);
