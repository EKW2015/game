/**
 * 进球后下一杆可用的超能力。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  Pool.POWERS = [
    { id: 'burst', name: '爆发杆', info: '打得很用力很用力很用力', color: '#ff6a3a' },
    { id: 'clone', name: '分身杆', info: '白球分身，连续打三次', color: '#7ecbff' },
    { id: 'precision', name: '精准清台', info: '瞄准所有目标球，一杆清台', color: '#ffe08a' }
  ];

  Pool.powerById = function (id) {
    var i;
    for (i = 0; i < Pool.POWERS.length; i++) {
      if (Pool.POWERS[i].id === id) return Pool.POWERS[i];
    }
    return null;
  };

  Pool.nextPowerId = function (id) {
    var i;
    for (i = 0; i < Pool.POWERS.length; i++) {
      if (Pool.POWERS[i].id === id) {
        return Pool.POWERS[(i + 1) % Pool.POWERS.length].id;
      }
    }
    return Pool.POWERS[0].id;
  };

  Pool.pickPowerId = function (avoid) {
    var list = Pool.POWERS.filter(function (p) { return p.id !== avoid; });
    if (!list.length) list = Pool.POWERS;
    return list[Math.floor(Math.random() * list.length)].id;
  };
})(typeof window !== 'undefined' ? window : global);
