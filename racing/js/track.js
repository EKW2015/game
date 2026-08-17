/**
 * 赛道：由控制点生成闭合样条，按弧长均匀采样，供渲染、AI 与判定使用。
 * 纯数学，不依赖 Three.js，可在 Node 里跑测试。
 *
 * 坐标：世界 XZ 平面，车辆朝向 angle 对应前向量 (cos a, sin a)，
 * 右向量为 (-sin a, cos a) 的等价形式 right = (-fz, fx)。
 */
(function (global) {
  'use strict';

  var SPACING = 3; // 采样间距（米）

  var TRACK_DEFS = [
    {
      id: 'city',
      name: '霓虹市区环线',
      desc: '窄街、直角弯、满街霓虹',
      width: 19,
      theme: { road: 0x1b1b22, rail: 0x00e5ff, rail2: 0xff2fb9, sky: 0x05060f },
      density: 1.0,
      points: [
        [0, 0], [230, 10], [430, -30], [575, -150], [615, -330], [530, -480],
        [345, -530], [185, -480], [70, -365], [-85, -340], [-225, -395],
        [-340, -305], [-370, -150], [-285, -30], [-140, 25]
      ]
    },
    {
      id: 'harbor',
      name: '港口高速',
      desc: '长直道飙极速，海风与集装箱',
      width: 23,
      theme: { road: 0x17181f, rail: 0x39ff9e, rail2: 0x00b3ff, sky: 0x03080f },
      density: 0.7,
      points: [
        [0, 0], [620, 20], [910, -70], [1060, -300], [985, -565], [700, -690],
        [385, -665], [125, -560], [-125, -625], [-390, -545], [-470, -300],
        [-385, -80], [-165, 25]
      ]
    },
    {
      id: 'airfield',
      name: '机场跑道',
      desc: '超宽跑道 + 两个发夹弯',
      width: 27,
      theme: { road: 0x1a1c1e, rail: 0xffc400, rail2: 0xff5c00, sky: 0x060a14 },
      density: 0.35,
      points: [
        [0, 0], [830, 0], [1035, -70], [1105, -235], [990, -370], [700, -405],
        [405, -385], [155, -335], [-70, -390], [-250, -305], [-290, -140], [-165, -20]
      ]
    }
  ];

  /** 闭合 Catmull-Rom 插值 */
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t;
    var t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  function Track(def) {
    this.id = def.id;
    this.name = def.name;
    this.desc = def.desc || '';
    this.width = def.width;
    this.halfWidth = def.width / 2;
    this.theme = def.theme;
    this.density = def.density === undefined ? 1 : def.density;
    this.points = def.points;
    this.build();
  }

  Track.prototype.build = function () {
    var pts = this.points;
    var n = pts.length;
    var dense = [];
    var STEPS = 24;

    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n];
      var p1 = pts[i];
      var p2 = pts[(i + 1) % n];
      var p3 = pts[(i + 2) % n];
      for (var k = 0; k < STEPS; k++) {
        var t = k / STEPS;
        dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
      }
    }
    dense.push([dense[0][0], dense[0][1]]);

    // 按弧长均匀重采样
    var cum = [0];
    for (var j = 1; j < dense.length; j++) {
      cum.push(cum[j - 1] + Math.hypot(dense[j][0] - dense[j - 1][0], dense[j][1] - dense[j - 1][1]));
    }
    var total = cum[cum.length - 1];
    var count = Math.max(64, Math.round(total / SPACING));
    var step = total / count;

    var samples = [];
    var seg = 0;
    for (var m = 0; m < count; m++) {
      var target = m * step;
      while (seg < cum.length - 2 && cum[seg + 1] < target) seg++;
      var segLen = cum[seg + 1] - cum[seg] || 1;
      var f = (target - cum[seg]) / segLen;
      samples.push({
        x: dense[seg][0] + (dense[seg + 1][0] - dense[seg][0]) * f,
        z: dense[seg][1] + (dense[seg + 1][1] - dense[seg][1]) * f,
        s: target,
        fx: 0, fz: 0, rx: 0, rz: 0, curve: 0
      });
    }

    // 切线 / 右向量
    for (var q = 0; q < count; q++) {
      var a = samples[(q - 1 + count) % count];
      var b = samples[(q + 1) % count];
      var dx = b.x - a.x;
      var dz = b.z - a.z;
      var len = Math.hypot(dx, dz) || 1;
      var cur = samples[q];
      cur.fx = dx / len;
      cur.fz = dz / len;
      cur.rx = -cur.fz;
      cur.rz = cur.fx;
      cur.heading = Math.atan2(cur.fz, cur.fx);
    }

    // 曲率：前后切线夹角 / 弧长
    for (var c = 0; c < count; c++) {
      var prev = samples[(c - 2 + count) % count];
      var next = samples[(c + 2) % count];
      var da = Math.atan2(next.fz, next.fx) - Math.atan2(prev.fz, prev.fx);
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      samples[c].curve = da / (4 * step);
    }

    this.samples = samples;
    this.step = step;
    this.length = total;
  };

  Track.prototype.sampleAt = function (s) {
    var count = this.samples.length;
    var idx = Math.floor(((s % this.length) + this.length) % this.length / this.step);
    return this.samples[idx % count];
  };

  /** 位置 -> 赛道坐标；hint 为上一帧的采样下标，避免全表扫描 */
  Track.prototype.project = function (x, z, hint) {
    var samples = this.samples;
    var count = samples.length;
    var best = -1;
    var bestDist = Infinity;
    var start = 0;
    var end = count;
    var window = 40;

    if (hint !== undefined && hint !== null && hint >= 0) {
      start = hint - window;
      end = hint + window;
    }

    for (var i = start; i < end; i++) {
      var idx = ((i % count) + count) % count;
      var sp = samples[idx];
      var d = (sp.x - x) * (sp.x - x) + (sp.z - z) * (sp.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    }

    // 窗口内没找到靠谱的（例如刚被传送），退化为全表扫描
    if (hint !== undefined && bestDist > 90000) {
      bestDist = Infinity;
      for (var j = 0; j < count; j++) {
        var s2 = samples[j];
        var d2 = (s2.x - x) * (s2.x - x) + (s2.z - z) * (s2.z - z);
        if (d2 < bestDist) { bestDist = d2; best = j; }
      }
    }

    var sp2 = samples[best];
    var dx = x - sp2.x;
    var dz = z - sp2.z;
    var along = dx * sp2.fx + dz * sp2.fz;
    var lateral = dx * sp2.rx + dz * sp2.rz;

    return {
      index: best,
      s: (sp2.s + along + this.length) % this.length,
      lateral: lateral,
      heading: sp2.heading,
      curve: sp2.curve,
      onRoad: Math.abs(lateral) <= this.halfWidth
    };
  };

  /** 前方 dist 米处的曲率（AI 用来提前减速） */
  Track.prototype.curveAhead = function (s, dist) {
    var worst = 0;
    for (var d = 0; d <= dist; d += 12) {
      var c = this.sampleAt(s + d).curve;
      if (Math.abs(c) > Math.abs(worst)) worst = c;
    }
    return worst;
  };

  /** 发车位：起跑线后方交错排列 */
  Track.prototype.gridPose = function (slot) {
    var row = Math.floor(slot / 2);
    var side = slot % 2 === 0 ? -1 : 1;
    var s = this.length - 18 - row * 12;
    var sp = this.sampleAt(s);
    return {
      x: sp.x + sp.rx * side * this.halfWidth * 0.42,
      z: sp.z + sp.rz * side * this.halfWidth * 0.42,
      angle: sp.heading,
      s: s
    };
  };

  var Tracks = {
    defs: TRACK_DEFS,
    Track: Track,
    cache: {},
    get: function (id) {
      if (!Tracks.cache[id]) {
        var def = null;
        for (var i = 0; i < TRACK_DEFS.length; i++) {
          if (TRACK_DEFS[i].id === id) def = TRACK_DEFS[i];
        }
        if (!def) def = TRACK_DEFS[0];
        Tracks.cache[id] = new Track(def);
      }
      return Tracks.cache[id];
    }
  };

  global.Tracks = Tracks;
})(typeof window !== 'undefined' ? window : globalThis);
