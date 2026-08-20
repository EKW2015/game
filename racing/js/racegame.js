/**
 * 夜城飙车 - 游戏规则：霓虹检查点、漂移计分、氮气、车流碰撞（纯逻辑）
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;
  var Car = global.Car;
  var Traffic = global.Traffic;

  var GATE_RADIUS = 15;
  var GATE_MIN = 200;
  var GATE_MAX = 400;
  var START_TIME = 60;
  var GATE_TIME = 16;
  var MAX_PARTICLES = 160;
  var MAX_MARKS = 220;
  var BEST_KEY = 'nightcity.best.v1';

  function RaceGame() {
    this.car = new Car();
    this.traffic = new Traffic(15);
    this.state = 'ready';
    this.mode = 'time';
    this.events = [];
    this.particles = [];
    this.marks = [];
    this.gate = null;
    this.gateIndex = 0;
    this.reset();
    this.best = this.loadBest();
  }

  RaceGame.prototype.loadBest = function () {
    try {
      return parseInt(global.localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  RaceGame.prototype.saveBest = function () {
    try {
      global.localStorage.setItem(BEST_KEY, String(this.best));
    } catch (e) { /* 隐私模式下忽略 */ }
  };

  RaceGame.prototype.reset = function () {
    this.car.reset(0, 0, 0);
    this.car.nitro = 0.5;
    this.car.topSpeed = 0;
    this.traffic.reset();
    this.particles.length = 0;
    this.marks.length = 0;
    this.events.length = 0;
    this.timeLeft = START_TIME;
    this.elapsed = 0;
    this.score = 0;
    this.gates = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.driftAccum = 0;
    this.driftTime = 0;
    this.lastDrifting = false;
    this.shake = 0;
    this.gateIndex = 0;
    this.pickGate(true);
  };

  RaceGame.prototype.start = function (mode) {
    this.mode = mode || 'time';
    this.reset();
    this.state = 'playing';
  };

  RaceGame.prototype.emit = function (type, value) {
    this.events.push({ type: type, value: value || 0 });
  };

  /** 在前方选一个路口作为下一个检查点 */
  RaceGame.prototype.pickGate = function (initial) {
    var car = this.car;
    var fx = Math.cos(car.yaw);
    var fz = Math.sin(car.yaw);
    var best = null;
    var bestScore = -Infinity;

    for (var attempt = 0; attempt < 40; attempt++) {
      var ang = Math.random() * Math.PI * 2;
      var dist = RU.rand(GATE_MIN, GATE_MAX);
      var tx = car.x + Math.cos(ang) * dist;
      var tz = car.z + Math.sin(ang) * dist;
      var idx = CityMap.nearestIntersection(tx, tz);
      var pos = CityMap.intersectionPos(idx.i, idx.j);
      var dx = pos.x - car.x;
      var dz = pos.z - car.z;
      var d = Math.hypot(dx, dz);
      if (d < GATE_MIN * 0.8 || d > GATE_MAX * 1.2) continue;

      var forward = (dx * fx + dz * fz) / d;
      var score = forward * 1.6 - Math.abs(d - 290) / 320 + Math.random() * 0.35;
      if (initial) score = -Math.abs(d - 260) / 300 + Math.random() * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = { x: pos.x, z: pos.z, i: idx.i, j: idx.j };
      }
    }

    if (!best) {
      var fb = CityMap.nearestIntersection(car.x + fx * 420, car.z + fz * 420);
      var fp = CityMap.intersectionPos(fb.i, fb.j);
      best = { x: fp.x, z: fp.z, i: fb.i, j: fb.j };
    }

    this.gateIndex++;
    this.gate = { x: best.x, z: best.z, radius: GATE_RADIUS, id: this.gateIndex };
  };

  RaceGame.prototype.gateDistance = function () {
    if (!this.gate) return 0;
    return Math.hypot(this.gate.x - this.car.x, this.gate.z - this.car.z);
  };

  /** 检查点相对车头的方位角，用于 HUD 箭头 */
  RaceGame.prototype.gateBearing = function () {
    if (!this.gate) return 0;
    var a = Math.atan2(this.gate.z - this.car.z, this.gate.x - this.car.x);
    return RU.wrapAngle(a - this.car.yaw);
  };

  RaceGame.prototype.spawnSmoke = function (x, z, size, color) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({
      x: x, y: 0.4, z: z,
      vx: RU.rand(-1.6, 1.6), vy: RU.rand(0.6, 2.2), vz: RU.rand(-1.6, 1.6),
      life: 1, size: size, color: color || 0xbfc6d8
    });
  };

  RaceGame.prototype.spawnMark = function (x, z, yaw, strength) {
    if (this.marks.length >= MAX_MARKS) this.marks.shift();
    this.marks.push({ x: x, z: z, yaw: yaw, life: 1, strength: strength });
  };

  RaceGame.prototype.updateFx = function (dt) {
    var i, p;
    for (i = this.particles.length - 1; i >= 0; i--) {
      p = this.particles[i];
      p.life -= dt * 0.85;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy *= 0.97;
    }
    for (i = this.marks.length - 1; i >= 0; i--) {
      var m = this.marks[i];
      m.life -= dt * 0.075;
      if (m.life <= 0) this.marks.splice(i, 1);
    }
  };

  RaceGame.prototype.update = function (dt) {
    if (this.state !== 'playing') return;

    var car = this.car;
    car.update(dt);
    this.elapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);

    // ---- 漂移计分 ----
    if (car.drifting) {
      this.driftAccum += car.driftAngle * car.speed * dt * 0.85;
      this.driftTime += dt;
      var back = -2.0;
      var fx = Math.cos(car.yaw);
      var fz = Math.sin(car.yaw);
      var rx = -fz;
      var rz = fx;
      for (var s = -1; s <= 1; s += 2) {
        var wx = car.x + fx * back + rx * s * 0.95;
        var wz = car.z + fz * back + rz * s * 0.95;
        if (Math.random() < 0.85) this.spawnSmoke(wx, wz, RU.rand(1.3, 2.6));
        if (Math.random() < 0.7) this.spawnMark(wx, wz, car.yaw, RU.clamp(car.driftAngle * 1.6, 0.2, 1));
      }
    } else if (this.lastDrifting) {
      if (this.driftAccum > 12) {
        var gained = Math.round(this.driftAccum * this.combo);
        this.score += gained;
        this.emit('drift', gained);
      }
      this.driftAccum = 0;
      this.driftTime = 0;
    }
    this.lastDrifting = car.drifting;

    if (car.offRoad && car.speed > 8 && Math.random() < 0.5) {
      this.spawnSmoke(car.x - Math.cos(car.yaw) * 2, car.z - Math.sin(car.yaw) * 2, RU.rand(1, 2), 0x9a8c74);
    }

    if (car.crashImpact > 0.08) {
      this.shake = Math.max(this.shake, car.crashImpact);
      this.combo = 1;
      this.comboTimer = 0;
      this.emit('crash', car.crashImpact);
      for (var k = 0; k < 6; k++) this.spawnSmoke(car.x, car.z, RU.rand(0.8, 1.8), 0xffb347);
    }

    // ---- 车流 ----
    this.traffic.update(dt, car.x, car.z, car.yaw);
    for (var i = 0; i < this.traffic.cars.length; i++) {
      var t = this.traffic.cars[i];
      var dx = car.x - t.x;
      var dz = car.z - t.z;
      var d = Math.hypot(dx, dz);
      var minD = car.radius + t.radius + 0.6;
      if (d < minD && d > 0.0001) {
        var nx = dx / d;
        var nz = dz / d;
        car.x += nx * (minD - d);
        car.z += nz * (minD - d);
        var rel = Math.abs(car.speed - t.speed);
        car.applyImpact(nx, nz, RU.clamp(rel * 0.25, 1, 9));
        t.speed = Math.max(3, t.speed * 0.6);
        this.shake = Math.max(this.shake, RU.clamp(rel / 30, 0.15, 1));
        this.combo = 1;
        this.emit('crash', RU.clamp(rel / 30, 0.2, 1));
        for (var q = 0; q < 5; q++) this.spawnSmoke(t.x, t.z, RU.rand(0.8, 1.6), 0xffcc66);
      }
    }

    // ---- 检查点 ----
    if (this.gate && this.gateDistance() < this.gate.radius) {
      this.gates++;
      this.comboTimer = 6;
      this.combo = Math.min(9, this.combo + 1);
      var speedBonus = Math.round(RU.kmh(car.speed));
      var gained2 = 150 * this.combo + speedBonus;
      this.score += gained2;
      if (this.mode === 'time') this.timeLeft = Math.min(80, this.timeLeft + GATE_TIME);
      car.nitro = Math.min(1, car.nitro + 0.34);
      this.emit('gate', gained2);
      this.pickGate(false);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (this.mode === 'time') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = 'over';
        if (this.score > this.best) {
          this.best = this.score;
          this.saveBest();
          this.emit('record', this.score);
        }
        this.emit('over', this.score);
      }
    }

    this.updateFx(dt);
  };

  global.RaceGame = RaceGame;
  global.RaceGame.START_TIME = START_TIME;
  global.RaceGame.GATE_TIME = GATE_TIME;
})(typeof window !== 'undefined' ? window : global);
