/**
 * 夜城飙车 - 跳台（纯逻辑，不依赖 THREE）
 *
 * 跳台摆在马路正中，位置由路口坐标哈希决定，所以全世界任何时候
 * 生成结果都一样，物理和渲染不需要同步任何状态。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  var B = CityMap.BLOCK;
  var LENGTH = 15;      // 斜坡长度
  var HEIGHT = 3.4;     // 坡顶高度
  var HALF_WIDTH = 6;   // 坡面半宽：两侧各留 7 米，不想飞可以绕过去
  var DENSITY = 0.2;    // 约 1/5 的路口附近有跳台，开一会儿总能碰上
  var OFFSET = B * 0.34; // 跳台离路口中心的距离

  /** 该路口是否有跳台，有的话朝向哪 */
  function rampAt(i, j) {
    var h = RU.hash2(i, j, 4242);
    if (h > DENSITY) return null;
    var pick = RU.hash2(i, j, 991);
    // 0=+x 1=-x 2=+z 3=-z：车从坡的低端冲上去的方向
    var dir = Math.floor(pick * 4) % 4;
    var alongX = dir === 0 || dir === 1;
    var sign = (dir === 0 || dir === 2) ? 1 : -1;
    return {
      i: i, j: j, dir: dir, alongX: alongX, sign: sign,
      x: i * B + (alongX ? -sign * OFFSET : 0),
      z: j * B + (alongX ? 0 : -sign * OFFSET),
      length: LENGTH,
      height: HEIGHT,
      halfWidth: HALF_WIDTH
    };
  }

  /** 列出某点附近的跳台，供渲染层使用 */
  function near(x, z, radius) {
    var out = [];
    var ci = Math.round(x / B);
    var cj = Math.round(z / B);
    var span = Math.ceil(radius / B);
    for (var i = ci - span; i <= ci + span; i++) {
      for (var j = cj - span; j <= cj + span; j++) {
        var ramp = rampAt(i, j);
        if (!ramp) continue;
        if (Math.hypot(ramp.x - x, ramp.z - z) > radius) continue;
        out.push(ramp);
      }
    }
    return out;
  }

  /** 单个跳台在某点的表面高度，0 表示不在这个跳台上 */
  function rampHeight(ramp, x, z) {
    var along;
    var across;
    if (ramp.alongX) {
      along = (x - ramp.x) * ramp.sign;
      across = z - ramp.z;
    } else {
      along = (z - ramp.z) * ramp.sign;
      across = x - ramp.x;
    }
    if (across < -ramp.halfWidth || across > ramp.halfWidth) return 0;
    if (along < 0 || along > ramp.length) return 0;
    return (along / ramp.length) * ramp.height;
  }

  /** 世界任意点的地面高度（只有跳台会抬高地面） */
  function heightAt(x, z) {
    var ci = Math.round(x / B);
    var cj = Math.round(z / B);
    var best = 0;
    for (var i = ci - 1; i <= ci + 1; i++) {
      for (var j = cj - 1; j <= cj + 1; j++) {
        var ramp = rampAt(i, j);
        if (!ramp) continue;
        var h = rampHeight(ramp, x, z);
        if (h > best) best = h;
      }
    }
    return best;
  }

  global.Ramps = {
    LENGTH: LENGTH,
    HEIGHT: HEIGHT,
    HALF_WIDTH: HALF_WIDTH,
    rampAt: rampAt,
    near: near,
    heightAt: heightAt
  };
})(typeof window !== 'undefined' ? window : global);
