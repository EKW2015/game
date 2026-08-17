/**
 * 通用工具：数学、存档、格式化。
 */
(function (global) {
  'use strict';

  var Utils = {
    clamp: function (v, lo, hi) {
      return v < lo ? lo : (v > hi ? hi : v);
    },

    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },

    /** 指数平滑，与帧率无关 */
    damp: function (a, b, rate, dt) {
      return Utils.lerp(a, b, 1 - Math.pow(rate, dt));
    },

    /** 把角度规范到 [-PI, PI] */
    wrapAngle: function (a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    },

    randRange: function (lo, hi) {
      return lo + Math.random() * (hi - lo);
    },

    /** 确定性伪随机，保证每次生成的城市一模一样 */
    seeded: function (seed) {
      var s = seed >>> 0 || 1;
      return function () {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
      };
    },

    /** 秒 -> 1:23.456 */
    formatTime: function (sec) {
      if (sec === null || sec === undefined || !isFinite(sec)) return '--:--.---';
      var neg = sec < 0;
      var t = Math.abs(sec);
      var m = Math.floor(t / 60);
      var s = Math.floor(t % 60);
      var ms = Math.floor((t * 1000) % 1000);
      return (neg ? '-' : '') + m + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
    },

    formatMoney: function (n) {
      return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    ordinal: function (n) {
      return ['第1名', '第2名', '第3名', '第4名', '第5名', '第6名', '第7名', '第8名'][n - 1] || ('第' + n + '名');
    },

    load: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem(key);
        if (!raw) return fallback;
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (err) {
        return fallback;
      }
    },

    save: function (key, value) {
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        return false;
      }
    }
  };

  global.Utils = Utils;
})(typeof window !== 'undefined' ? window : globalThis);
