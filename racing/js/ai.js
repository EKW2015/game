/**
 * 电脑车手：沿赛道理想线行驶，提前判断弯道减速，直道放氮气，并躲避前车。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;

  function Driver(car, track, options) {
    options = options || {};
    this.car = car;
    this.track = track;
    this.skill = options.skill === undefined ? 0.8 : options.skill;
    this.aggression = options.aggression === undefined ? 0.6 : options.aggression;
    this.lineOffset = options.lineOffset || 0;
    this.hint = options.hint === null || options.hint === undefined ? null : options.hint;
    this.nosTimer = Utils.randRange(2, 8);
    this.mistakeTimer = Utils.randRange(6, 20);
    this.mistake = 0;
    this.wanderPhase = Math.random() * Math.PI * 2;
  }

  Driver.prototype.update = function (dt, cars) {
    var car = this.car;
    var track = this.track;
    var proj = track.project(car.x, car.z, this.hint);
    this.hint = proj.index;
    this.proj = proj;

    var speed = Math.abs(car.vf);
    var lookAhead = Utils.clamp(speed * 1.05 + 12, 16, 85);

    // 理想线：入弯外侧、出弯贴内侧
    this.wanderPhase += dt * 0.35;
    var curveNow = track.curveAhead(proj.s, 45);
    var apexPull = Utils.clamp(curveNow * 260, -1, 1);
    var half = track.halfWidth;
    var targetOffset = Utils.clamp(this.lineOffset + apexPull * half * 0.5 + Math.sin(this.wanderPhase) * 1.2, -half * 0.72, half * 0.72);

    // 避让：前方有车就往旁边挪
    var avoid = 0;
    if (cars) {
      for (var i = 0; i < cars.length; i++) {
        var other = cars[i];
        if (other === car) continue;
        var dx = other.x - car.x;
        var dz = other.z - car.z;
        var dist = Math.hypot(dx, dz);
        if (dist > 26 || dist < 0.001) continue;
        var f = car.forward();
        var ahead = (dx * f.x + dz * f.z);
        if (ahead < 1) continue;
        var side = dx * -f.z + dz * f.x;
        avoid += (side > 0 ? -1 : 1) * (26 - dist) * 0.35;
      }
    }
    targetOffset = Utils.clamp(targetOffset + avoid, -half * 0.86, half * 0.86);

    var aim = track.sampleAt(proj.s + lookAhead);
    var tx = aim.x + aim.rx * targetOffset;
    var tz = aim.z + aim.rz * targetOffset;

    var toTarget = Math.atan2(tz - car.z, tx - car.x);
    var diff = Utils.wrapAngle(toTarget - car.angle);
    var steer = Utils.clamp(diff * 2.1, -1, 1);

    // 目标车速：弯越急越慢
    var curveAhead = Math.abs(track.curveAhead(proj.s + 8, Utils.clamp(speed * 1.5, 40, 140)));
    var latAccel = 12 + this.skill * 9;
    var cornerSpeed = curveAhead > 0.0006 ? Math.sqrt(latAccel / curveAhead) : 999;
    var maxSpeed = car.spec.topSpeed * (0.82 + this.skill * 0.2);
    var targetSpeed = Math.min(cornerSpeed, maxSpeed) * (1 - this.mistake * 0.35);

    // 偏离赛道时先回到路面
    if (Math.abs(proj.lateral) > half) targetSpeed = Math.min(targetSpeed, 22);

    var input = car.input;
    if (speed < targetSpeed - 1.5) {
      input.throttle = 1;
      input.brake = 0;
    } else if (speed > targetSpeed + 3) {
      input.throttle = 0;
      input.brake = Utils.clamp((speed - targetSpeed) / 14, 0.2, 1);
    } else {
      input.throttle = 0.55;
      input.brake = 0;
    }
    input.steer = steer;
    input.handbrake = Math.abs(diff) > 0.85 && speed > 26;

    // 直道放氮气
    this.nosTimer -= dt;
    var straight = curveAhead < 0.0018;
    if (straight && car.nos > 0.55 && this.nosTimer <= 0 && speed > maxSpeed * 0.45) {
      input.nos = true;
      if (car.nos < 0.08) {
        input.nos = false;
        this.nosTimer = Utils.randRange(5, 12);
      }
    } else if (!straight || car.nos < 0.06) {
      input.nos = false;
    }

    // 偶尔失误，让比赛有来有回
    this.mistakeTimer -= dt;
    if (this.mistakeTimer <= 0) {
      this.mistake = Math.random() < 0.55 - this.skill * 0.35 ? Utils.randRange(0.15, 0.4) : 0;
      this.mistakeTimer = Utils.randRange(5, 14);
    }
    this.mistake = Math.max(0, this.mistake - dt * 0.25);
  };

  global.Driver = Driver;
})(typeof window !== 'undefined' ? window : globalThis);
