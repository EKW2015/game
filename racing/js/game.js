/**
 * 比赛主逻辑：发车倒计时、圈数与名次、漂移/特技计分、奖金结算。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;
  var Car = global.Car;
  var Driver = global.Driver;
  var Tracks = global.Tracks;
  var Garage = global.Garage;
  var RaceEvents = global.RaceEvents;
  var Sfx = global.Sfx;

  var CAR_RADIUS = 2.1;

  function Game(scene, hooks) {
    this.scene = scene;
    this.hooks = hooks || {};
    this.state = 'idle';
    this.cars = [];
    this.entries = [];
    this.drivers = [];
    this.players = [];
    this.config = null;
    this.time = 0;
    this.countdown = 0;
    this.messageTimer = 0;
  }

  Game.prototype.emit = function (name, payload) {
    if (typeof this.hooks[name] === 'function') this.hooks[name](payload);
  };

  Game.prototype.message = function (text, kind) {
    this.emit('onMessage', { text: text, kind: kind || 'info' });
  };

  /**
   * config: { mode, trackId, laps, rivals, difficulty, players, event, challenge }
   * mode: race | timetrial | drift | stunt | free
   */
  Game.prototype.start = function (config) {
    this.config = config;
    this.cars = [];
    this.entries = [];
    this.drivers = [];
    this.players = [];
    this.time = 0;
    this.raceTime = 0;
    this.finishOrder = [];
    this.results = null;
    this.driftScore = 0;
    this.driftCombo = 0;
    this.driftChain = 0;
    this.stuntScore = 0;
    this.sessionTimeLeft = config.duration || 0;

    var scene = this.scene;
    scene.clearCars();

    if (config.trackId === 'arena') {
      this.track = null;
      this.world = new global.ArenaWorld();
      scene.buildArena(this.world);
    } else {
      this.track = Tracks.get(config.trackId);
      this.world = new global.TrackWorld(this.track);
      scene.buildTrack(this.track);
    }

    var playerCount = config.players || 1;
    var slots = [];
    var totalCars = playerCount + (config.rivals || 0);

    // 发车位：玩家排在中后段，给点超车空间
    for (var i = 0; i < totalCars; i++) slots.push(i);

    var selected = Garage.state.selected;
    var playerSpecs = [];
    for (var p = 0; p < playerCount; p++) {
      var spec = Garage.spec(selected);
      if (p === 1) {
        spec = Garage.spec(selected);
        spec.color = 0x39ff9e;
      }
      playerSpecs.push(spec);
    }

    // 玩家排在发车网格中段：既有超车空间，也不至于毫无希望
    var playerSlot = config.rivals ? Math.floor(config.rivals / 2) : 0;
    var freeSlots = [];
    for (var f = 0; f < totalCars; f++) {
      if (f < playerSlot || f >= playerSlot + playerCount) freeSlots.push(f);
    }

    for (var s = 0; s < totalCars; s++) {
      var isPlayer = s >= totalCars - playerCount;
      var slotIndex = isPlayer ? playerSlot + (s - (totalCars - playerCount)) : freeSlots.shift();
      var pose = this.track ? this.track.gridPose(slotIndex) : { x: (s - totalCars / 2) * 6, z: 40, angle: -Math.PI / 2 };

      var carSpec;
      var name;
      if (isPlayer) {
        carSpec = playerSpecs[s - (totalCars - playerCount)];
        name = playerCount > 1 ? ('玩家' + (s - (totalCars - playerCount) + 1)) : '你';
      } else {
        var color = RaceEvents.rivalColors[s % RaceEvents.rivalColors.length];
        carSpec = Garage.rivalSpec(config.difficulty || 0.4, color);
        name = RaceEvents.rivalNames[s % RaceEvents.rivalNames.length];
      }

      var car = new Car(carSpec, {
        x: pose.x, z: pose.z, angle: pose.angle,
        isPlayer: isPlayer, name: name, index: s, color: carSpec.color
      });
      this.cars.push(car);
      scene.addCar(car);

      var entry = {
        car: car,
        name: name,
        isPlayer: isPlayer,
        lap: 0,
        prevS: this.track ? (pose.s % this.track.length) : 0,
        hint: null,
        lapStart: 0,
        lastLap: null,
        bestLap: null,
        finished: false,
        finishTime: null,
        totalDist: 0,
        position: s + 1,
        wrongWay: false
      };
      this.entries.push(entry);
      if (isPlayer) this.players.push(entry);

      if (!isPlayer && this.track) {
        var skill = Utils.clamp(0.4 + (config.difficulty || 0.4) * 0.48 + Utils.randRange(-0.05, 0.05), 0.2, 0.95);
        this.drivers.push(new Driver(car, this.track, {
          skill: skill,
          aggression: Utils.randRange(0.4, 0.9),
          lineOffset: Utils.randRange(-this.track.halfWidth * 0.35, this.track.halfWidth * 0.35)
        }));
      }
    }

    this.playerCar = this.players[0] ? this.players[0].car : this.cars[0];

    var needsCountdown = config.mode === 'race' || config.mode === 'timetrial';
    this.state = needsCountdown ? 'countdown' : 'running';
    this.countdown = needsCountdown ? 3.99 : 0;
    this.countStep = -1;

    scene.camState.forEach(function (st) {
      st.x = this.playerCar.x;
      st.y = this.playerCar.y + 4;
      st.z = this.playerCar.z;
    }, this);

    Sfx.startEngine();
    this.emit('onStart', config);
    return this;
  };

  Game.prototype.playerInput = function (slot) {
    var entry = this.players[slot];
    return entry ? entry.car.input : null;
  };

  Game.prototype.respawn = function (slot) {
    var entry = this.players[slot];
    if (!entry) return;
    this.world.respawn(entry.car);
    this.message('回到赛道', 'info');
  };

  Game.prototype.update = function (dt) {
    if (this.state === 'idle' || this.state === 'paused' || this.state === 'finished') return;
    this.time += dt;

    if (this.state === 'countdown') {
      this.countdown -= dt;
      var step = Math.ceil(this.countdown);
      if (step !== this.countStep) {
        this.countStep = step;
        if (step >= 0) Sfx.countdown(step);
        this.emit('onCountdown', step);
      }
      if (this.countdown <= 0) {
        this.state = 'running';
        this.entries.forEach(function (e) { e.lapStart = 0; });
      }
      // 倒计时期间只允许原地热胎
      for (var q = 0; q < this.cars.length; q++) {
        var c = this.cars[q];
        if (!c.isPlayer) { c.input.throttle = 0; c.input.brake = 0; c.input.steer = 0; }
        c.input.nos = false;
        c.update(dt, this.world);
        this.world.collide(c);
      }
      this.updateCameras(dt);
      this.scene.syncCars(dt, this.config.players > 1);
      this.updateHud();
      return;
    }

    this.raceTime += dt;
    if (this.sessionTimeLeft > 0) {
      this.sessionTimeLeft -= dt;
      if (this.sessionTimeLeft <= 0) {
        this.sessionTimeLeft = 0;
        this.finishChallenge();
        return;
      }
    }

    for (var i = 0; i < this.drivers.length; i++) {
      this.drivers[i].update(dt, this.cars);
    }

    for (var j = 0; j < this.cars.length; j++) {
      var car = this.cars[j];
      car.update(dt, this.world);
      var impact = this.world.collide(car);
      if (impact > 6) {
        if (car === this.playerCar) {
          this.scene.shake(0, Math.min(0.9, impact / 40));
          Sfx.crash(impact);
        }
      }
    }

    this.resolveCarCollisions();
    this.updateProgress(dt);
    this.updateScores(dt);

    this.updateCameras(dt);
    this.scene.syncCars(dt, this.config.players > 1);
    this.updateAudio();
    this.updateHud();
  };

  Game.prototype.resolveCarCollisions = function () {
    var cars = this.cars;
    for (var i = 0; i < cars.length; i++) {
      for (var j = i + 1; j < cars.length; j++) {
        var a = cars[i];
        var b = cars[j];
        var dx = b.x - a.x;
        var dz = b.z - a.z;
        var dist = Math.hypot(dx, dz);
        var min = CAR_RADIUS * 2;
        if (dist >= min || dist < 0.0001) continue;
        if (Math.abs(a.y - b.y) > 1.6) continue;

        var nx = dx / dist;
        var nz = dz / dist;
        var push = (min - dist) / 2;
        a.x -= nx * push; a.z -= nz * push;
        b.x += nx * push; b.z += nz * push;

        var va = a.velocity();
        var vb = b.velocity();
        var rel = (vb.x - va.x) * nx + (vb.z - va.z) * nz;
        if (rel < 0) {
          var imp = rel * 0.55;
          a.applyImpulse(nx * imp, nz * imp);
          b.applyImpulse(-nx * imp, -nz * imp);
          if ((a === this.playerCar || b === this.playerCar) && Math.abs(rel) > 6) {
            Sfx.crash(Math.abs(rel));
            this.scene.shake(0, 0.35);
          }
        }
      }
    }
  };

  Game.prototype.updateProgress = function () {
    if (!this.track) return;
    var track = this.track;
    var laps = this.config.laps || 1;

    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      if (e.finished) continue;
      var proj = track.project(e.car.x, e.car.z, e.hint);
      e.hint = proj.index;
      e.lateral = proj.lateral;

      var s = proj.s;
      var half = track.length / 2;
      var crossed = e.prevS > track.length * 0.72 && s < track.length * 0.28;
      var backwards = e.prevS < track.length * 0.28 && s > track.length * 0.72;

      if (crossed) {
        if (e.lap === 0) {
          e.lap = 1;
          e.lapStart = this.raceTime;
        } else {
          var lapTime = this.raceTime - e.lapStart;
          e.lastLap = lapTime;
          if (e.bestLap === null || lapTime < e.bestLap) e.bestLap = lapTime;
          e.lapStart = this.raceTime;
          e.lap++;
          if (e.isPlayer) {
            this.emit('onLap', { lap: e.lap, lapTime: lapTime, best: e.bestLap });
            if (e.lap <= laps) this.message('第 ' + e.lap + ' 圈 · ' + Utils.formatTime(lapTime), 'lap');
          }
          if (e.lap > laps) this.finishCar(e);
        }
      } else if (backwards && e.lap > 0) {
        e.lap--;
      }

      e.prevS = s;
      e.totalDist = Math.max(0, e.lap - 1) * track.length + s + (e.lap > 0 ? 0 : -track.length);

      // 逆行提示
      var f = e.car.forward();
      var sample = track.samples[proj.index];
      var dot = f.x * sample.fx + f.z * sample.fz;
      e.wrongWay = dot < -0.35 && Math.abs(e.car.vf) > 6;
      void half;
    }

    // 名次
    var sorted = this.entries.slice().sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalDist - a.totalDist;
    });
    for (var k = 0; k < sorted.length; k++) sorted[k].position = k + 1;
    this.standings = sorted;
  };

  Game.prototype.finishCar = function (entry) {
    entry.finished = true;
    entry.finishTime = this.raceTime;
    this.finishOrder.push(entry);
    if (entry.isPlayer) {
      if (this.config.mode === 'timetrial') this.finishTimeTrial(entry);
      else this.finishRace(entry);
    }
  };

  Game.prototype.updateScores = function (dt) {
    var player = this.players[0];
    if (!player) return;
    var car = player.car;

    // 漂移连击
    if (car.driftTime > 0.25 && !car.airborne) {
      this.driftChain += dt;
      this.driftCombo = Math.min(5, 1 + this.driftChain * 0.35);
      var gain = Math.abs(car.vf) * car.driftAmount * this.driftCombo * dt * 6;
      this.driftScore += gain;
    } else if (this.driftChain > 0) {
      if (this.driftChain > 1.2) {
        this.message('漂移 +' + Math.round(this.driftChain * 100) + ' 连击 x' + this.driftCombo.toFixed(1), 'drift');
      }
      this.driftChain = 0;
      this.driftCombo = 0;
    }

    // 特技（落地结算）
    if (car.stuntEvent) {
      var ev = car.stuntEvent;
      var spins = Math.floor(ev.spin / (Math.PI * 2));
      var score = ev.airTime * 520 + spins * 900;
      this.stuntScore += score;
      var label = spins > 0 ? (spins + ' 圈旋转! ') : '';
      this.message(label + '滞空 ' + ev.airTime.toFixed(1) + 's  +' + Math.round(score), 'stunt');
      Sfx.beep(660 + spins * 180, 0.18, 'triangle', 0.16);
    }
  };

  Game.prototype.updateCameras = function (dt) {
    var split = this.config.players > 1;
    this.scene.updateCamera(0, this.players[0] ? this.players[0].car : this.playerCar, dt, this.lookBack0);
    if (split && this.players[1]) {
      this.scene.updateCamera(1, this.players[1].car, dt, this.lookBack1);
    }
  };

  Game.prototype.updateAudio = function () {
    var car = this.playerCar;
    if (!car) return;
    var rpm = Utils.clamp(Math.abs(car.vf) / car.spec.topSpeed, 0, 1);
    Sfx.engineState(rpm, car.input.throttle, car.driftAmount, car.nosActive);
  };

  Game.prototype.gearFor = function (car) {
    var ratio = Math.abs(car.vf) / car.spec.topSpeed;
    if (car.vf < -0.5) return 'R';
    if (ratio < 0.02) return 'N';
    return String(Math.min(6, 1 + Math.floor(ratio * 5.6)));
  };

  Game.prototype.hudData = function (slot) {
    var entry = this.players[slot];
    if (!entry) return null;
    var car = entry.car;
    var laps = this.config.laps || 1;
    var mode = this.config.mode;

    var data = {
      kmh: car.kmh,
      rpm: Utils.clamp(Math.abs(car.vf) / car.spec.topSpeed, 0, 1),
      nos: car.nos,
      boosting: car.nosActive,
      gear: this.gearFor(car),
      name: entry.name,
      lapText: this.track ? (Math.max(1, entry.lap) + ' / ' + laps) : '--',
      posText: mode === 'race' ? (entry.position + ' / ' + this.entries.length) : '--',
      timeText: this.sessionTimeLeft > 0
        ? Utils.formatTime(this.sessionTimeLeft)
        : Utils.formatTime(this.raceTime),
      lastText: Utils.formatTime(entry.lastLap),
      bestText: Utils.formatTime(entry.bestLap),
      cars: this.cars,
      focus: car,
      wrongWay: entry.wrongWay
    };

    if (mode === 'drift') {
      data.scoreLabel = '漂移分';
      data.scoreText = Math.round(this.driftScore) + (this.driftCombo > 1 ? '  x' + this.driftCombo.toFixed(1) : '');
    } else if (mode === 'stunt' || mode === 'free') {
      data.scoreLabel = '特技分';
      data.scoreText = String(Math.round(this.stuntScore + this.driftScore));
    } else {
      data.scoreLabel = '漂移分';
      data.scoreText = String(Math.round(this.driftScore));
    }
    return data;
  };

  Game.prototype.updateHud = function () {
    this.emit('onHud', this);
  };

  // ---------- 结算 ----------

  Game.prototype.finishRace = function (entry) {
    var config = this.config;
    var position = entry.position;
    // 玩家冲线即结束，其余按当前进度排名
    var others = this.entries.filter(function (e) { return e !== entry; })
      .sort(function (a, b) { return b.totalDist - a.totalDist; });
    var order = [entry].concat(others);
    // 已经先冲线的对手排在玩家前面
    order.sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalDist - a.totalDist;
    });
    for (var i = 0; i < order.length; i++) order[i].position = i + 1;
    position = entry.position;

    var event = config.event ? RaceEvents.race(config.event) : null;
    var prize = 0;
    if (event) {
      prize = event.prize[position - 1] || Math.round(event.prize[2] * 0.4);
    } else {
      prize = Math.max(200, 1500 - (position - 1) * 400);
    }
    var driftBonus = Math.round(this.driftScore / 12);
    var stuntBonus = Math.round(this.stuntScore / 12);
    var total = prize + driftBonus + stuntBonus;

    Garage.addMoney(total);
    Garage.state.totalRaces++;
    if (position === 1) Garage.state.totalWins++;
    if (event && position <= 3) Garage.state.events[event.id] = Math.min(3, position);
    if (entry.bestLap !== null) {
      var key = config.trackId;
      if (!Garage.state.bestLaps[key] || entry.bestLap < Garage.state.bestLaps[key]) {
        Garage.state.bestLaps[key] = entry.bestLap;
      }
    }
    Garage.persist();

    this.results = {
      mode: 'race',
      position: position,
      total: this.entries.length,
      time: entry.finishTime,
      bestLap: entry.bestLap,
      prize: prize,
      driftBonus: driftBonus,
      stuntBonus: stuntBonus,
      money: total,
      standings: order.map(function (e) {
        return { name: e.name, position: e.position, isPlayer: e.isPlayer, time: e.finishTime, bestLap: e.bestLap };
      }),
      event: event,
      success: position === 1
    };
    this.state = 'finished';
    Sfx.cash();
    this.emit('onFinish', this.results);
  };

  Game.prototype.finishTimeTrial = function (entry) {
    var challenge = RaceEvents.challenge(this.config.challenge);
    var time = entry.finishTime;
    var target = challenge ? challenge.target : 60;
    var success = time <= target;
    var reward = success ? challenge.reward : Math.round(challenge.reward * 0.25);
    Garage.addMoney(reward);
    if (success) Garage.state.events[challenge.id] = 1;
    var key = this.config.trackId;
    if (!Garage.state.bestLaps[key] || time < Garage.state.bestLaps[key]) Garage.state.bestLaps[key] = time;
    Garage.persist();

    this.results = {
      mode: 'timetrial',
      success: success,
      time: time,
      target: target,
      money: reward,
      challenge: challenge
    };
    this.state = 'finished';
    Sfx.cash();
    this.emit('onFinish', this.results);
  };

  Game.prototype.finishChallenge = function () {
    var challenge = RaceEvents.challenge(this.config.challenge);
    var score = this.config.mode === 'drift'
      ? this.driftScore
      : this.stuntScore + this.driftScore * 0.5;
    var target = challenge ? challenge.target : 5000;
    var success = score >= target;
    var reward = success
      ? challenge.reward + Math.round((score - target) / 20)
      : Math.round(score / 18);
    Garage.addMoney(reward);
    if (success) Garage.state.events[challenge.id] = 1;
    Garage.persist();

    this.results = {
      mode: this.config.mode,
      success: success,
      score: Math.round(score),
      target: target,
      money: reward,
      challenge: challenge
    };
    this.state = 'finished';
    Sfx.cash();
    this.emit('onFinish', this.results);
  };

  /** 自由驾驶：退出时把特技分换成金币 */
  Game.prototype.cashOut = function () {
    var score = this.stuntScore + this.driftScore;
    var money = Math.round(score / 14);
    if (money > 0) {
      Garage.addMoney(money);
      Sfx.cash();
    }
    return { score: Math.round(score), money: money };
  };

  Game.prototype.stop = function () {
    this.state = 'idle';
    Sfx.stopEngine();
    this.scene.clearCars();
    this.cars = [];
    this.entries = [];
    this.drivers = [];
    this.players = [];
  };

  Game.prototype.pause = function (paused) {
    if (this.state === 'finished' || this.state === 'idle') return;
    this.state = paused ? 'paused' : (this.countdown > 0 ? 'countdown' : 'running');
  };

  global.RaceGame = Game;
})(typeof window !== 'undefined' ? window : globalThis);
