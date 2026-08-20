/**
 * 夜城飙车 - 街道上的 AI 车流（纯逻辑）
 * 车流永远沿着车道直行，靠右行驶，驶出视野后回收再利用。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  var B = CityMap.BLOCK;
  var LANE = CityMap.ROAD / 4;
  var DESPAWN = 620;

  var COLORS = [0x2a2f3a, 0x8a1f2d, 0x1f4f8a, 0xb8b0a0, 0x2d6b4a, 0x6b3f8a, 0xc99a2e];

  /** dir: 0=+x 1=+z 2=-x 3=-z */
  function laneFor(dir, line) {
    // 返回该方向车道的固定横坐标与朝向
    if (dir === 0) return { fixed: line * B + LANE, yaw: 0 };
    if (dir === 2) return { fixed: line * B - LANE, yaw: Math.PI };
    if (dir === 1) return { fixed: line * B - LANE, yaw: Math.PI / 2 };
    return { fixed: line * B + LANE, yaw: -Math.PI / 2 };
  }

  function Traffic(count) {
    this.cars = [];
    this.max = count || 14;
  }

  Traffic.prototype.spawnOne = function (px, pz, playerYaw, minDist, maxDist) {
    for (var attempt = 0; attempt < 24; attempt++) {
      var dir = RU.randInt(0, 3);
      var alongX = dir === 0 || dir === 2;
      var line = Math.round((alongX ? pz : px) / B) + RU.randInt(-2, 2);
      var lane = laneFor(dir, line);
      var base = alongX ? px : pz;
      var dist = RU.rand(minDist, maxDist);
      var along = base + (Math.random() < 0.5 ? dist : -dist);

      var x = alongX ? along : lane.fixed;
      var z = alongX ? lane.fixed : along;
      if (Math.hypot(x - px, z - pz) < minDist) continue;

      var tooClose = false;
      for (var i = 0; i < this.cars.length; i++) {
        if (Math.hypot(this.cars[i].x - x, this.cars[i].z - z) < 26) { tooClose = true; break; }
      }
      if (tooClose) continue;

      this.cars.push({
        x: x, z: z, yaw: lane.yaw, dir: dir,
        speed: RU.rand(11, 21),
        cruise: 0,
        color: RU.pick(COLORS),
        radius: 2.3
      });
      this.cars[this.cars.length - 1].cruise = this.cars[this.cars.length - 1].speed;
      return true;
    }
    return false;
  };

  Traffic.prototype.reset = function () {
    this.cars.length = 0;
  };

  Traffic.prototype.update = function (dt, px, pz, playerYaw) {
    var i, c;

    for (i = this.cars.length - 1; i >= 0; i--) {
      c = this.cars[i];
      if (Math.hypot(c.x - px, c.z - pz) > DESPAWN) {
        this.cars.splice(i, 1);
      }
    }

    while (this.cars.length < this.max) {
      if (!this.spawnOne(px, pz, playerYaw, 150, 480)) break;
    }

    for (i = 0; i < this.cars.length; i++) {
      c = this.cars[i];
      var fx = Math.cos(c.yaw);
      var fz = Math.sin(c.yaw);

      // 前方有车就减速，避免叠在一起
      var target = c.cruise;
      for (var j = 0; j < this.cars.length; j++) {
        if (j === i) continue;
        var o = this.cars[j];
        if (o.dir !== c.dir) continue;
        var ahead = (o.x - c.x) * fx + (o.z - c.z) * fz;
        var side = Math.abs((o.x - c.x) * -fz + (o.z - c.z) * fx);
        if (ahead > 0 && ahead < 22 && side < 3) {
          target = Math.min(target, o.speed * 0.8);
        }
      }
      c.speed = RU.damp(c.speed, target, 1.6, dt);
      c.x += fx * c.speed * dt;
      c.z += fz * c.speed * dt;
    }
  };

  global.Traffic = Traffic;
})(typeof window !== 'undefined' ? window : global);
