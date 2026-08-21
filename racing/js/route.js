/**
 * 夜城飙车 - 竞速赛道（纯逻辑，不依赖 THREE）
 *
 * 赛道就是城市网格上的一个矩形环线，路点都落在路口，
 * 所以人和 AI 都能沿着真实马路跑完一圈。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  var B = CityMap.BLOCK;
  var REACH = 26; // 进入这个半径就算过了这个路点

  /** 生成一条环线：从 (i0,j0) 出发，宽 w 格、高 h 格 */
  function create(i0, j0, w, h, laps) {
    // 沿矩形四边逐个路口排点，相邻路点必须是网格上的邻居，AI 才能顺着马路跑
    var points = [];
    var i;
    var j;
    for (i = 0; i <= w; i++) points.push({ i: i0 + i, j: j0 });
    for (j = 1; j <= h; j++) points.push({ i: i0 + w, j: j0 + j });
    for (i = w - 1; i >= 0; i--) points.push({ i: i0 + i, j: j0 + h });
    for (j = h - 1; j >= 1; j--) points.push({ i: i0, j: j0 + j });

    var list = points.map(function (p) {
      return { x: p.i * B, z: p.j * B, i: p.i, j: p.j };
    });

    return {
      points: list,
      laps: laps || 2,
      reach: REACH,
      length: list.length
    };
  }

  /** 随机生成一条赛道（关卡编号决定规模，越往后越长） */
  function forLevel(level) {
    var n = Math.max(0, level | 0);
    var w = 3 + (n % 3);
    var h = 2 + Math.floor(n / 3) % 3;
    var i0 = RU.randInt(-6, 6);
    var j0 = RU.randInt(-6, 6);
    return create(i0, j0, w, h, 2 + (n >= 4 ? 1 : 0));
  }

  /**
   * 极速冲刺路线：一条开环冲刺道，大多笔直偶尔拐弯。
   * 路点间距是路口，人和 AI 都能顺着马路一口气冲到底。
   * 返回 { points, reach, length, par } —— par 是金牌目标用时（秒）。
   */
  function sprint(level) {
    var n = Math.max(0, level | 0);
    var gates = 10 + Math.min(6, n * 2); // 10~16 个门
    var i = RU.randInt(-4, 4);
    var j = RU.randInt(-4, 4);
    // 初始朝向：四向之一
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var dir = dirs[RU.randInt(0, 3)];
    var points = [{ i: i, j: j }];
    var straight = 0;

    while (points.length < gates) {
      // 笔直跑 3~5 格后再允许拐弯，冲刺感才够
      if (straight >= RU.randInt(3, 5) && Math.random() < 0.55) {
        // 左转或右转（相对当前方向）
        dir = Math.random() < 0.5 ? [-dir[1], dir[0]] : [dir[1], -dir[0]];
        straight = 0;
      }
      i += dir[0];
      j += dir[1];
      points.push({ i: i, j: j });
      straight++;
    }

    var list = points.map(function (p) {
      return { x: p.i * B, z: p.j * B, i: p.i, j: p.j };
    });

    // 金牌用时：按路线长度估算，按约 140 km/h 平均速度
    var dist = 0;
    for (var k = 1; k < list.length; k++) {
      dist += Math.hypot(list[k].x - list[k - 1].x, list[k].z - list[k - 1].z);
    }
    var par = Math.max(18, Math.round(dist / 38)); // 约 137 km/h 均速

    return {
      points: list,
      laps: 1,
      reach: REACH,
      length: list.length,
      par: par,
      sprint: true
    };
  }

  /** 起跑格：沿着首条直道排开，避免开局互相碰撞 */
  function gridSlot(route, index) {
    var start = route.points[0];
    var next = route.points[1 % route.points.length];
    var dx = next.x - start.x;
    var dz = next.z - start.z;
    var len = Math.hypot(dx, dz) || 1;
    var fx = dx / len;
    var fz = dz / len;
    var rx = -fz;
    var rz = fx;
    var row = Math.floor(index / 2);
    var col = index % 2 === 0 ? -1 : 1;
    return {
      x: start.x - fx * (14 + row * 9) + rx * col * 4.5,
      z: start.z - fz * (14 + row * 9) + rz * col * 4.5,
      yaw: Math.atan2(fz, fx)
    };
  }

  /**
   * 赛道进度：圈数 * 路点数 + 已过路点数 + 当前段完成比例。
   * 数值越大排名越前，直接比大小就能排位。
   */
  function progress(route, lap, index, x, z) {
    var target = route.points[index % route.points.length];
    var prev = route.points[(index - 1 + route.points.length) % route.points.length];
    var segLen = Math.hypot(target.x - prev.x, target.z - prev.z) || 1;
    var left = Math.hypot(target.x - x, target.z - z);
    var frac = RU.clamp(1 - left / segLen, 0, 1);
    return lap * route.points.length + index + frac;
  }

  global.Route = {
    create: create,
    forLevel: forLevel,
    sprint: sprint,
    gridSlot: gridSlot,
    progress: progress,
    REACH: REACH
  };
})(typeof window !== 'undefined' ? window : global);
