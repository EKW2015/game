/**
 * 世界规则（纯逻辑）：赛道路面/护栏碰撞，自由驾驶场地的跳台高度。
 * 渲染层 scene.js 会按同样的数据把 3D 场景搭出来。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;

  /** 赛道世界：路面 + 路肩 + 两侧护栏 */
  function TrackWorld(track) {
    this.track = track;
    this.shoulder = 4.5;
    this.hints = {};
    this.isArena = false;
  }

  TrackWorld.prototype._project = function (x, z, key) {
    // 每台车一个独立的搜索起点，否则互相污染会导致误判出界
    var hint = key === undefined || key === null ? null : this.hints[key];
    var proj = this.track.project(x, z, hint === undefined ? null : hint);
    if (key !== undefined && key !== null) this.hints[key] = proj.index;
    return proj;
  };

  TrackWorld.prototype.heightAt = function () {
    return 0;
  };

  /** 1 = 柏油路，越小抓地越差 */
  TrackWorld.prototype.surfaceAt = function (x, z, key) {
    var proj = this._project(x, z, key === undefined ? null : key);
    var over = Math.abs(proj.lateral) - this.track.halfWidth;
    if (over <= 0) return 1;
    if (over < 1.2) return 0.9;
    return 0.55;
  };

  /** 护栏碰撞：把车挡在路肩以内 */
  TrackWorld.prototype.collide = function (car) {
    var proj = this._project(car.x, car.z, car.key);
    var limit = this.track.halfWidth + this.shoulder;
    var over = Math.abs(proj.lateral) - limit;
    if (over <= 0) return 0;

    var sample = this.track.samples[proj.index];
    var sign = proj.lateral > 0 ? 1 : -1;
    var nx = -sample.rx * sign;
    var nz = -sample.rz * sign;
    return car.hitWall(nx, nz, over + 0.05);
  };

  TrackWorld.prototype.respawn = function (car) {
    var proj = this._project(car.x, car.z, car.key);
    var sample = this.track.sampleAt(proj.s - 6);
    car.x = sample.x;
    car.z = sample.z;
    car.y = 0;
    car.vy = 0;
    car.vf = Math.min(Math.abs(car.vf) * 0.3, 12);
    car.vr = 0;
    car.airborne = false;
    car.angle = sample.heading;
  };

  /** 自由驾驶场地：开阔停车场 + 跳台 + 环形墙 */
  function ArenaWorld() {
    this.isArena = true;
    this.radius = 460;
    this.ramps = [];

    var seed = Utils.seeded(20240119);
    var angles = 12;
    for (var i = 0; i < angles; i++) {
      var a = (i / angles) * Math.PI * 2;
      var dist = 120 + seed() * 220;
      this.ramps.push({
        x: Math.cos(a) * dist,
        z: Math.sin(a) * dist,
        angle: a + Math.PI / 2 + (seed() - 0.5) * 0.6,
        length: 26 + seed() * 20,
        width: 16 + seed() * 10,
        height: 4.5 + seed() * 5.5,
        kind: seed() > 0.72 ? 'kicker' : 'ramp'
      });
    }

    // 中心大跳台
    this.ramps.push({ x: 0, z: -60, angle: 0, length: 46, width: 26, height: 11, kind: 'ramp' });
    this.ramps.push({ x: 0, z: 60, angle: Math.PI, length: 46, width: 26, height: 11, kind: 'ramp' });
  }

  ArenaWorld.prototype.heightAt = function (x, z) {
    var best = 0;
    for (var i = 0; i < this.ramps.length; i++) {
      var r = this.ramps[i];
      var dx = x - r.x;
      var dz = z - r.z;
      var cs = Math.cos(-r.angle);
      var sn = Math.sin(-r.angle);
      // 旋转到跳台本地坐标：+x 为上坡方向
      var lx = dx * cs - dz * sn;
      var lz = dx * sn + dz * cs;
      if (Math.abs(lz) > r.width / 2) continue;
      if (lx < -r.length / 2 || lx > r.length / 2) continue;
      var t = (lx + r.length / 2) / r.length;
      var h = r.kind === 'kicker' ? r.height * Math.pow(t, 1.7) : r.height * t;
      if (h > best) best = h;
    }
    return best;
  };

  ArenaWorld.prototype.surfaceAt = function () {
    return 1;
  };

  ArenaWorld.prototype.collide = function (car) {
    var dist = Math.hypot(car.x, car.z);
    var over = dist - this.radius;
    if (over <= 0) return 0;
    var nx = -car.x / (dist || 1);
    var nz = -car.z / (dist || 1);
    return car.hitWall(nx, nz, over + 0.05);
  };

  ArenaWorld.prototype.respawn = function (car) {
    car.x = 0;
    car.z = 0;
    car.y = 0;
    car.vy = 0;
    car.vf = 0;
    car.vr = 0;
    car.airborne = false;
    car.angle = -Math.PI / 2;
  };

  global.TrackWorld = TrackWorld;
  global.ArenaWorld = ArenaWorld;
})(typeof window !== 'undefined' ? window : globalThis);
