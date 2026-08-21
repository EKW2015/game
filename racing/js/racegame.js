/**
 * 夜城飙车 - 游戏规则（纯逻辑，不依赖 THREE）
 *
 * 四种模式：
 *   race   —— 环城赛道，和 4 个 AI 对手跑 2~3 圈，按名次拿奖金
 *   sprint —— 极速冲刺，固定门点开环赛道，比用时拿金银铜牌
 *   time   —— 计时冲关，穿霓虹光门续命
 *   free   —— 自由驾驶，跳台特技、漂移、捡金币
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;
  var Car = global.Car;
  var Traffic = global.Traffic;
  var Cars = global.Cars;
  var Route = global.Route;
  var AutoDrive = global.AutoDrive;

  var GATE_RADIUS = 15;
  var GATE_MIN = 200;
  var GATE_MAX = 400;
  var START_TIME = 60;
  var GATE_TIME = 16;
  var MAX_PARTICLES = 160;
  var MAX_MARKS = 220;
  var BEST_KEY = 'nightcity.best.v1';
  var RIVAL_COUNT = 4;
  var RIVAL_COLORS = [0x2ee6ff, 0x39e05a, 0xffd84d, 0xff7a1a, 0xe8ecf5];
  var RIVAL_NAMES = ['青焰', '毒蛇', '闪电', '夜枭', '铁拳'];
  var COIN_VALUE = 25;
  var COIN_TARGET = 10;
  var PRIZES = [1000, 600, 350, 180, 90];
  // 极速冲刺：金 / 银 / 铜 奖金
  var SPRINT_PRIZES = { gold: 800, silver: 450, bronze: 200 };

  function RaceGame(garage) {
    this.garage = garage || new Cars.Garage();
    this.car = new Car(this.garage.stats());
    this.traffic = new Traffic(14);
    this.rivals = [];
    this.coins = [];
    this.state = 'ready';
    this.mode = 'time';
    this.events = [];
    this.particles = [];
    this.marks = [];
    this.gate = null;
    this.gateIndex = 0;
    this.route = null;
    this.level = 0;
    this.best = this.loadBest();
    this.reset();
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

  RaceGame.prototype.emit = function (type, value, text) {
    this.events.push({ type: type, value: value || 0, text: text || '' });
  };

  RaceGame.prototype.reset = function () {
    this.car.setStats(this.garage.stats());
    this.car.reset(0, 0, 0);
    this.car.nitro = 0.5;
    this.car.topSpeed = 0;
    this.traffic.reset();
    this.rivals.length = 0;
    this.coins.length = 0;
    this.particles.length = 0;
    this.marks.length = 0;
    this.events.length = 0;
    this.timeLeft = START_TIME;
    this.elapsed = 0;
    this.score = 0;
    this.cashEarned = 0;
    this.gates = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.driftAccum = 0;
    this.driftTime = 0;
    this.markDist = 0;
    this.lastDrifting = false;
    this.shake = 0;
    this.gateIndex = 0;
    this.coinsTaken = 0;
    this.bestAir = 0;
    this.countdown = 0;
    this.lap = 1;
    this.wp = 0;
    this.place = 1;
    this.finishedCount = 0;
    this.myProgress = 0;
    this.finished = false;
    this.route = null;
    this.gate = null;
    this.sprintPar = 0;
    this.sprintFailAt = 0;
    this.sprintMedal = '';
    this.sprintSpeedScore = 0;
  };

  RaceGame.prototype.start = function (mode, level) {
    this.mode = mode || 'time';
    this.level = level || 0;
    this.reset();
    this.traffic.max = (this.mode === 'race' || this.mode === 'sprint') ? 0 : 14;

    if (this.mode === 'race') {
      this.setupRace();
      this.state = 'countdown';
      this.countdown = 3;
    } else if (this.mode === 'sprint') {
      this.setupSprint();
      this.state = 'countdown';
      this.countdown = 3;
    } else {
      this.pickGate(true);
      this.state = 'playing';
    }
  };

  // ---------------- 竞速赛 ----------------

  RaceGame.prototype.setupRace = function () {
    this.route = Route.forLevel(this.level);
    this.traffic.max = 0;
    this.traffic.reset();

    var slot = Route.gridSlot(this.route, 0);
    this.car.reset(slot.x, slot.z, slot.yaw);
    this.wp = 0;
    this.lap = 1;

    // AI 难度随关卡上升，但始终留一点余量给玩家
    var difficulty = 0.82 + Math.min(0.16, this.level * 0.03);
    for (var r = 0; r < RIVAL_COUNT; r++) {
      var stats = this.garage.statsFor(r % 2 === 0 ? 'gt' : 'drift');
      var rival = {
        name: RIVAL_NAMES[r % RIVAL_NAMES.length],
        color: RIVAL_COLORS[r % RIVAL_COLORS.length],
        car: new Car({
          accel: stats.accel * difficulty,
          maxSpeed: stats.maxSpeed * difficulty,
          grip: stats.grip,
          brake: stats.brake,
          turbo: stats.turbo
        }),
        pilot: new AutoDrive(difficulty + r * 0.02),
        wp: 0,
        lap: 1,
        finished: false,
        progress: 0
      };
      var rslot = Route.gridSlot(this.route, r + 1);
      rival.car.reset(rslot.x, rslot.z, rslot.yaw);
      rival.car.nitro = 1;
      this.rivals.push(rival);
    }
    this.updateGateFromRoute();
  };

  RaceGame.prototype.updateGateFromRoute = function () {
    var p = this.route.points[this.wp % this.route.points.length];
    this.gate = { x: p.x, z: p.z, radius: this.route.reach, id: this.wp };
  };

  /** 推进一个车手的赛道进度，返回是否刚刚完赛 */
  RaceGame.prototype.advanceRacer = function (racer, x, z) {
    var route = this.route;
    var target = route.points[racer.wp % route.points.length];
    var done = false;
    if (Math.hypot(target.x - x, target.z - z) < route.reach) {
      racer.wp++;
      if (racer.wp % route.points.length === 0) {
        racer.lap++;
        if (racer.lap > route.laps) done = true;
      }
    }
    // 进度要在完赛那一帧也算出来，否则排名会把刚冲线的车手当成最后一名
    racer.progress = Route.progress(route, racer.lap, racer.wp, x, z);
    return done;
  };

  RaceGame.prototype.updateRace = function (dt) {
    var route = this.route;
    var i;

    // 玩家进度
    var me = { wp: this.wp, lap: this.lap, progress: 0 };
    var done = this.advanceRacer(me, this.car.x, this.car.z);
    if (me.wp !== this.wp) {
      if (me.lap !== this.lap) this.emit('lap', me.lap);
      this.wp = me.wp;
      this.lap = me.lap;
      this.updateGateFromRoute();
    }
    this.myProgress = me.progress;

    // 对手
    for (i = 0; i < this.rivals.length; i++) {
      var rival = this.rivals[i];
      if (rival.finished) continue;
      var target = route.points[rival.wp % route.points.length];
      rival.pilot.driveTo(rival.car, target.x, target.z, dt);
      rival.car.update(dt);
      if (this.advanceRacer(rival, rival.car.x, rival.car.z)) {
        rival.finished = true;
        rival.finishPlace = ++this.finishedCount;
      }

      // 和玩家的碰撞
      var dx = this.car.x - rival.car.x;
      var dz = this.car.z - rival.car.z;
      var d = Math.hypot(dx, dz);
      var minD = this.car.radius + rival.car.radius + 0.4;
      if (d < minD && d > 0.0001 && Math.abs(this.car.y - rival.car.y) < 2) {
        var nx = dx / d;
        var nz = dz / d;
        this.car.x += nx * (minD - d) * 0.5;
        this.car.z += nz * (minD - d) * 0.5;
        rival.car.x -= nx * (minD - d) * 0.5;
        rival.car.z -= nz * (minD - d) * 0.5;
        var rel = Math.abs(this.car.speed - rival.car.speed);
        this.car.applyImpact(nx, nz, RU.clamp(rel * 0.18, 1, 7));
        rival.car.applyImpact(-nx, -nz, RU.clamp(rel * 0.18, 1, 7));
        this.shake = Math.max(this.shake, 0.35);
        this.emit('crash', 0.4);
      }
    }

    // 排名
    var ahead = 0;
    for (i = 0; i < this.rivals.length; i++) {
      if (this.rivals[i].progress > this.myProgress) ahead++;
    }
    this.place = ahead + 1;

    if (done) {
      this.finished = true;
      this.state = 'over';
      this.place = ++this.finishedCount;
      var prize = PRIZES[Math.min(PRIZES.length - 1, this.place - 1)];
      this.cashEarned += prize;
      this.garage.earn(prize);
      this.emit('finish', this.place);
    }
  };

  // ---------------- 极速冲刺 ----------------

  RaceGame.prototype.setupSprint = function () {
    this.route = Route.sprint(this.level);
    this.sprintPar = this.route.par;
    this.sprintFailAt = this.route.par * 1.8;
    this.sprintMedal = '';
    this.sprintSpeedScore = 0;
    this.traffic.max = 0;
    this.traffic.reset();

    var slot = Route.gridSlot(this.route, 0);
    this.car.reset(slot.x, slot.z, slot.yaw);
    this.car.nitro = 1;
    this.wp = 0;
    this.lap = 1;
    this.gates = 0;
    this.updateGateFromRoute();
  };

  /** 冲刺奖牌：金 ≤ par，银 ≤ 1.25par，铜 ≤ 1.5par */
  RaceGame.prototype.sprintMedalFor = function (t) {
    var par = this.sprintPar || 1;
    if (t <= par) return 'gold';
    if (t <= par * 1.25) return 'silver';
    if (t <= par * 1.5) return 'bronze';
    return '';
  };

  RaceGame.prototype.updateSprint = function (dt) {
    var route = this.route;
    var car = this.car;
    if (!route) return;

    // 高速段额外得分，鼓励一直踩油门
    var kmh = RU.kmh(car.speed);
    if (kmh > 160 && !car.airborne) {
      var bonus = Math.round((kmh - 160) * dt * 2.2);
      if (bonus > 0) {
        this.score += bonus;
        this.sprintSpeedScore += bonus;
      }
    }

    var target = route.points[this.wp % route.points.length];
    if (Math.hypot(target.x - car.x, target.z - car.z) < route.reach) {
      this.wp++;
      this.gates++;
      this.comboTimer = 5;
      this.combo = Math.min(9, this.combo + 1);
      var gateScore = 120 * this.combo + Math.round(kmh * 0.8);
      this.score += gateScore;
      car.nitro = Math.min(1, car.nitro + 0.45);
      this.emit('gate', gateScore);

      if (this.wp >= route.points.length) {
        this.finished = true;
        this.state = 'over';
        this.sprintMedal = this.sprintMedalFor(this.elapsed);
        var prize = SPRINT_PRIZES[this.sprintMedal] || 0;
        if (prize > 0) {
          this.cashEarned += prize;
          this.garage.earn(prize);
        }
        this.emit('finish', this.sprintMedal || 'none');
        return;
      }
      this.updateGateFromRoute();
    }

    if (this.elapsed >= this.sprintFailAt) {
      this.state = 'over';
      this.sprintMedal = '';
      this.emit('over', this.score);
    }
  };

  // ---------------- 计时冲关 ----------------

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
        best = { x: pos.x, z: pos.z };
      }
    }

    if (!best) {
      var fb = CityMap.nearestIntersection(car.x + fx * 420, car.z + fz * 420);
      var fp = CityMap.intersectionPos(fb.i, fb.j);
      best = { x: fp.x, z: fp.z };
    }

    this.gateIndex++;
    this.gate = { x: best.x, z: best.z, radius: GATE_RADIUS, id: this.gateIndex };
  };

  /** 当前该往哪开：竞速看路点，其他模式看光门 */
  RaceGame.prototype.target = function () {
    return this.gate;
  };

  RaceGame.prototype.gateDistance = function () {
    if (!this.gate) return 0;
    return Math.hypot(this.gate.x - this.car.x, this.gate.z - this.car.z);
  };

  RaceGame.prototype.gateBearing = function () {
    if (!this.gate) return 0;
    var a = Math.atan2(this.gate.z - this.car.z, this.gate.x - this.car.x);
    return RU.wrapAngle(a - this.car.yaw);
  };

  // ---------------- 金币 ----------------

  RaceGame.prototype.updateCoins = function (dt) {
    var car = this.car;
    var i;
    for (i = this.coins.length - 1; i >= 0; i--) {
      var c = this.coins[i];
      c.spin += dt * 3;
      var d = Math.hypot(c.x - car.x, c.z - car.z);
      if (d < 5 && Math.abs(car.y - 0.9) < 3.5) {
        this.coins.splice(i, 1);
        this.coinsTaken++;
        this.cashEarned += COIN_VALUE;
        this.garage.earn(COIN_VALUE);
        this.emit('coin', COIN_VALUE);
        continue;
      }
      if (d > 560) this.coins.splice(i, 1);
    }

    while (this.coins.length < COIN_TARGET) {
      var B = CityMap.BLOCK;
      var alongX = Math.random() < 0.5;
      var line = Math.round((alongX ? car.z : car.x) / B) + RU.randInt(-2, 2);
      var base = alongX ? car.x : car.z;
      var along = base + (Math.random() < 0.5 ? 1 : -1) * RU.rand(90, 420);
      var x = alongX ? along : line * B;
      var z = alongX ? line * B : along;
      if (!CityMap.onRoad(x, z)) continue;
      this.coins.push({ x: x, z: z, spin: Math.random() * 6 });
    }
  };

  // ---------------- 特效 ----------------

  RaceGame.prototype.spawnSmoke = function (x, z, size, color) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({
      x: x, y: 0.4 + this.car.y, z: z,
      vx: RU.rand(-1.6, 1.6), vy: RU.rand(0.6, 2.2), vz: RU.rand(-1.6, 1.6),
      life: 1, size: size, color: color || 0xbfc6d8
    });
  };

  RaceGame.prototype.spawnMark = function (x, z, yaw, strength) {
    if (this.marks.length >= MAX_MARKS) this.marks.shift();
    this.marks.push({ x: x, z: z, y: this.car.y, yaw: yaw, life: 1, strength: strength });
  };

  RaceGame.prototype.updateFx = function (dt) {
    var i;
    for (i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
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

  // ---------------- 主更新 ----------------

  RaceGame.prototype.update = function (dt) {
    if (this.state === 'countdown') {
      var before = Math.ceil(this.countdown);
      this.countdown -= dt;
      var after = Math.ceil(this.countdown);
      if (after !== before) this.emit('countdown', Math.max(0, after));
      // 起步前只更新对手的物理（它们也在等灯）
      if (this.countdown <= 0) this.state = 'playing';
      return;
    }
    if (this.state !== 'playing') return;

    var car = this.car;
    car.update(dt);
    this.elapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);

    // ---- 腾空特技 ----
    if (car.airborne) {
      this.bestAir = Math.max(this.bestAir, car.airTime);
    } else if (car.landImpact > 0) {
      this.shake = Math.max(this.shake, car.landImpact);
      if (car.airTime > 0.45) {
        var stunt = Math.round(car.airTime * 120 + RU.kmh(car.speed) * 1.4);
        this.score += stunt;
        if (this.mode !== 'race' && this.mode !== 'sprint') {
          this.cashEarned += Math.round(stunt / 8);
          this.garage.earn(Math.round(stunt / 8));
        }
        this.emit('stunt', stunt, '腾空 ' + car.airTime.toFixed(1) + ' 秒');
      }
      car.airTime = 0;
    }

    // ---- 漂移计分与痕迹 ----
    var hardBrake = car.brake > 0.5 && car.speed > 18;
    if ((car.drifting || hardBrake) && !car.airborne) {
      this.markDist += car.speed * dt;
      var laying = this.markDist >= 1.1;
      if (laying) this.markDist = 0;

      var fx = Math.cos(car.yaw);
      var fz = Math.sin(car.yaw);
      var rx = -fz;
      var rz = fx;
      var strength = car.drifting ? RU.clamp(car.driftAngle * 1.8, 0.35, 1) : 0.45;
      for (var s = -1; s <= 1; s += 2) {
        var wx = car.x - fx * 2.0 + rx * s * 0.95;
        var wz = car.z - fz * 2.0 + rz * s * 0.95;
        if (laying) this.spawnMark(wx, wz, car.yaw, strength);
        if (car.drifting && Math.random() < 0.8) this.spawnSmoke(wx, wz, RU.rand(1.4, 2.8));
      }
    }

    if (car.drifting) {
      this.driftAccum += car.driftAngle * car.speed * dt * 0.85;
      this.driftTime += dt;
    } else if (this.lastDrifting) {
      if (this.driftAccum > 12) {
        var gained = Math.round(this.driftAccum * this.combo);
        this.score += gained;
        if (this.mode !== 'race' && this.mode !== 'sprint') {
          this.cashEarned += Math.round(gained / 10);
          this.garage.earn(Math.round(gained / 10));
        }
        this.emit('drift', gained);
      }
      this.driftAccum = 0;
      this.driftTime = 0;
    }
    this.lastDrifting = car.drifting;

    if (car.offRoad && car.speed > 8 && !car.airborne && Math.random() < 0.5) {
      this.spawnSmoke(car.x - Math.cos(car.yaw) * 2, car.z - Math.sin(car.yaw) * 2, RU.rand(1, 2), 0x9a8c74);
    }

    if (car.crashImpact > 0.08) {
      this.shake = Math.max(this.shake, car.crashImpact);
      this.combo = 1;
      this.comboTimer = 0;
      this.emit('crash', car.crashImpact);
      for (var k = 0; k < 6; k++) this.spawnSmoke(car.x, car.z, RU.rand(0.8, 1.8), 0xffb347);
    }

    // ---- 车流（竞速赛里清空，免得挡道） ----
    this.traffic.update(dt, car.x, car.z, car.yaw);
    for (var i = 0; i < this.traffic.cars.length; i++) {
      var t = this.traffic.cars[i];
      var dx = car.x - t.x;
      var dz = car.z - t.z;
      var d = Math.hypot(dx, dz);
      var minD = car.radius + t.radius + 0.6;
      if (d < minD && d > 0.0001 && car.y < 1.6) {
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

    if (this.mode === 'race') {
      this.updateRace(dt);
    } else if (this.mode === 'sprint') {
      this.updateSprint(dt);
    } else {
      this.updateCoins(dt);
      this.updateGateMode(dt);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    this.updateFx(dt);
  };

  RaceGame.prototype.updateGateMode = function (dt) {
    var car = this.car;

    if (this.gate && this.gateDistance() < this.gate.radius) {
      this.gates++;
      this.comboTimer = 6;
      this.combo = Math.min(9, this.combo + 1);
      var gained = 150 * this.combo + Math.round(RU.kmh(car.speed));
      this.score += gained;
      if (this.mode === 'time') this.timeLeft = Math.min(80, this.timeLeft + GATE_TIME);
      car.nitro = Math.min(1, car.nitro + 0.34);
      this.emit('gate', gained);
      this.pickGate(false);
    }

    if (this.mode !== 'time') return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.state = 'over';
      var prize = Math.round(this.score / 12);
      this.cashEarned += prize;
      this.garage.earn(prize);
      if (this.score > this.best) {
        this.best = this.score;
        this.saveBest();
        this.emit('record', this.score);
      }
      this.emit('over', this.score);
    }
  };

  global.RaceGame = RaceGame;
  global.RaceGame.START_TIME = START_TIME;
  global.RaceGame.GATE_TIME = GATE_TIME;
  global.RaceGame.PRIZES = PRIZES;
  global.RaceGame.SPRINT_PRIZES = SPRINT_PRIZES;
  global.RaceGame.COIN_VALUE = COIN_VALUE;
})(typeof window !== 'undefined' ? window : global);
