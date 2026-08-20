/**
 * 夜城飙车 - 城市布局（纯数据，不依赖 THREE）
 *
 * 城市是无限的规则网格：马路中心线位于坐标为 BLOCK 整数倍的位置，
 * 街区（建筑）位于两条马路之间。因为布局有规律，碰撞检测只需要
 * 对「最近的一个街区方块」做圆 vs 矩形判定，代价极低。
 */
(function (global) {
  'use strict';

  var RU = global.RU;

  var BLOCK = 130;      // 路口间距
  var ROAD = 26;        // 马路宽度
  var SIDEWALK = 6;     // 人行道宽度（可以开上去，但很颠）
  var HALF_ROAD = ROAD / 2;
  var SOLID = HALF_ROAD + SIDEWALK;        // 建筑外墙到马路中心线的距离
  var BLOCK_HALF = BLOCK / 2 - SOLID;      // 街区实体的半径

  /** 坐标 v 到最近马路中心线的距离 */
  function distToRoadAxis(v) {
    var m = v - Math.round(v / BLOCK) * BLOCK;
    return Math.abs(m);
  }

  /** 是否在柏油路面上（含十字路口） */
  function onRoad(x, z) {
    return distToRoadAxis(x) <= HALF_ROAD || distToRoadAxis(z) <= HALF_ROAD;
  }

  /** 是否在人行道上（会掉速 + 抖动） */
  function onSidewalk(x, z) {
    return !onRoad(x, z) && (distToRoadAxis(x) <= SOLID || distToRoadAxis(z) <= SOLID);
  }

  /** 最近街区中心（街区索引 i,j 对应中心 (i+0.5)*BLOCK ） */
  function nearestBlock(x, z) {
    return {
      i: Math.floor(x / BLOCK),
      j: Math.floor(z / BLOCK)
    };
  }

  function blockCenter(i, j) {
    return { x: (i + 0.5) * BLOCK, z: (j + 0.5) * BLOCK };
  }

  /**
   * 把半径为 r 的圆推出最近的建筑方块。
   * 返回 null 表示没有碰撞，否则返回 { nx, nz, push }（单位法线与推出距离）。
   */
  function resolveCircle(x, z, r) {
    var b = nearestBlock(x, z);
    var c = blockCenter(b.i, b.j);
    var dx = x - c.x;
    var dz = z - c.z;
    var h = BLOCK_HALF;

    if (h <= 0) return null;

    var insideX = Math.abs(dx) < h;
    var insideZ = Math.abs(dz) < h;

    if (insideX && insideZ) {
      // 圆心已经在建筑内部：沿最近的一面墙推出去
      var outX = h - Math.abs(dx);
      var outZ = h - Math.abs(dz);
      if (outX < outZ) {
        return { nx: dx < 0 ? -1 : 1, nz: 0, push: outX + r };
      }
      return { nx: 0, nz: dz < 0 ? -1 : 1, push: outZ + r };
    }

    var qx = RU.clamp(dx, -h, h);
    var qz = RU.clamp(dz, -h, h);
    var ox = dx - qx;
    var oz = dz - qz;
    var d = Math.hypot(ox, oz);
    if (d >= r || d === 0) return null;

    return { nx: ox / d, nz: oz / d, push: r - d };
  }

  /** 距离玩家最近的路口坐标 */
  function nearestIntersection(x, z) {
    return {
      i: Math.round(x / BLOCK),
      j: Math.round(z / BLOCK)
    };
  }

  function intersectionPos(i, j) {
    return { x: i * BLOCK, z: j * BLOCK };
  }

  /**
   * 某个街区里的建筑描述（确定性生成，用于渲染 & 霓虹广告牌）
   * 返回 [{ x, z, w, d, h, style, neon }]
   */
  function buildingsIn(i, j) {
    var out = [];
    var c = blockCenter(i, j);
    var rnd = RU.seeded(Math.floor(RU.hash2(i, j, 7) * 4294967295) || 1);
    var span = BLOCK_HALF * 2;
    var count = 1 + Math.floor(rnd() * 3);

    // 公园地块：偶尔留空，城市不至于太密
    if (RU.hash2(i, j, 31) < 0.07) return out;

    if (count === 1) {
      var h1 = 24 + Math.pow(rnd(), 2.2) * 170;
      out.push({
        x: c.x, z: c.z,
        w: span * (0.72 + rnd() * 0.24),
        d: span * (0.72 + rnd() * 0.24),
        h: h1,
        style: Math.floor(rnd() * 6),
        neon: rnd() < 0.72 ? Math.floor(rnd() * 8) : -1
      });
      return out;
    }

    // 2~3 栋：沿一条轴切分地块
    var vertical = rnd() < 0.5;
    for (var k = 0; k < count; k++) {
      var t = (k + 0.5) / count;
      var offset = (t - 0.5) * span * 0.92;
      var slot = (span / count) * 0.82;
      var other = span * (0.6 + rnd() * 0.32);
      out.push({
        x: c.x + (vertical ? offset : 0),
        z: c.z + (vertical ? 0 : offset),
        w: vertical ? slot : other,
        d: vertical ? other : slot,
        h: 18 + Math.pow(rnd(), 2.4) * 150,
        style: Math.floor(rnd() * 6),
        neon: rnd() < 0.6 ? Math.floor(rnd() * 8) : -1
      });
    }
    return out;
  }

  global.CityMap = {
    BLOCK: BLOCK,
    ROAD: ROAD,
    HALF_ROAD: HALF_ROAD,
    SIDEWALK: SIDEWALK,
    SOLID: SOLID,
    BLOCK_HALF: BLOCK_HALF,
    distToRoadAxis: distToRoadAxis,
    onRoad: onRoad,
    onSidewalk: onSidewalk,
    nearestBlock: nearestBlock,
    blockCenter: blockCenter,
    resolveCircle: resolveCircle,
    nearestIntersection: nearestIntersection,
    intersectionPos: intersectionPos,
    buildingsIn: buildingsIn
  };
})(typeof window !== 'undefined' ? window : global);
