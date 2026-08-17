/**
 * 街机风格车辆物理：前后/横向速度分解 + 抓地力衰减产生漂移，
 * 另有氮气、腾空与翻滚，供特技模式使用。纯逻辑，可在 Node 中测试。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;
  var GRAVITY = 24;
  var WHEELBASE = 2.7;

  function Car(spec, options) {
    options = options || {};
    this.spec = spec;
    this.name = options.name || '车手';
    this.isPlayer = !!options.isPlayer;
    this.color = options.color === undefined ? 0xff2f6d : options.color;
    this.index = options.index || 0;
    this.key = options.key || ('car' + this.index);

    this.input = { throttle: 0, brake: 0, steer: 0, nos: false, handbrake: false };
    this.reset(options.x || 0, options.z || 0, options.angle || 0);
  }

  Car.prototype.reset = function (x, z, angle) {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.angle = angle;
    this.vf = 0;
    this.vr = 0;
    this.yawRate = 0;
    this.steerAngle = 0;
    this.wheelSpin = 0;
    this.airborne = false;
    this.airTime = 0;
    this.pitch = 0;
    this.roll = 0;
    this.flipSpin = 0;
    this.nos = 1;
    this.nosActive = false;
    this.driftAmount = 0;
    this.driftTime = 0;
    this.offRoad = false;
    this.lastLanding = 0;
    this.stuntEvent = null;
  };

  Object.defineProperty(Car.prototype, 'speed', {
    get: function () { return Math.hypot(this.vf, this.vr); }
  });

  /** km/h，仪表盘用 */
  Object.defineProperty(Car.prototype, 'kmh', {
    get: function () { return Math.abs(this.vf) * 3.6; }
  });

  Car.prototype.forward = function () {
    return { x: Math.cos(this.angle), z: Math.sin(this.angle) };
  };

  Car.prototype.velocity = function () {
    var f = this.forward();
    return {
      x: f.x * this.vf - f.z * this.vr,
      z: f.z * this.vf + f.x * this.vr
    };
  };

  Car.prototype.setVelocity = function (vx, vz) {
    var f = this.forward();
    this.vf = vx * f.x + vz * f.z;
    this.vr = vx * -f.z + vz * f.x;
  };

  Car.prototype.update = function (dt, world) {
    var spec = this.spec;
    var input = this.input;
    var surface = world && world.surfaceAt ? world.surfaceAt(this.x, this.z, this.key) : 1;
    this.offRoad = surface < 0.9;

    // --- 氮气 ---
    var wantNos = input.nos && this.nos > 0.02 && this.vf > -1;
    this.nosActive = wantNos;
    if (wantNos) {
      this.nos = Math.max(0, this.nos - dt / spec.nosDuration);
    } else {
      var regen = (this.driftTime > 0.3 ? 0.11 : 0.055) * spec.nosRegen;
      this.nos = Math.min(1, this.nos + regen * dt);
    }

    var boost = wantNos ? spec.nosPower : 1;
    var topSpeed = spec.topSpeed * (wantNos ? 1.22 : 1) * (this.offRoad ? 0.72 : 1);

    // --- 转向角（车速越高转向越收敛） ---
    var speedRatio = Utils.clamp(Math.abs(this.vf) / spec.topSpeed, 0, 1);
    var maxSteer = 0.62 * (1 - 0.55 * speedRatio) * spec.handling;
    var steerTarget = Utils.clamp(input.steer, -1, 1) * maxSteer;
    var steerRate = this.airborne ? 3 : 9;
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, steerRate * dt);

    // --- 纵向力 ---
    if (!this.airborne) {
      if (input.throttle > 0) {
        var head = 1 - Utils.clamp(Math.abs(this.vf) / topSpeed, 0, 1);
        this.vf += spec.accel * boost * input.throttle * head * surface * dt;
      }
      if (input.brake > 0) {
        if (this.vf > 0.5) {
          this.vf -= spec.brakePower * input.brake * surface * dt;
          if (this.vf < 0) this.vf = 0;
        } else {
          // 停住后继续按刹车 = 倒车
          this.vf -= spec.accel * 0.45 * input.brake * dt;
          if (this.vf < -spec.topSpeed * 0.22) this.vf = -spec.topSpeed * 0.22;
        }
      }
      var idleDrag = (input.throttle > 0 ? 0.03 : 0.85) + (this.offRoad ? 1.8 : 0);
      this.vf -= this.vf * idleDrag * dt;
      this.vf -= this.vf * Math.abs(this.vf) * 0.00006 * dt;
    } else {
      this.airTime += dt;
      this.vf -= this.vf * 0.08 * dt;
    }

    // --- 偏航（自行车模型） ---
    var grounded = !this.airborne;
    var turnSpeedFactor = Utils.clamp(Math.abs(this.vf) / 6, 0, 1);
    var yaw = grounded
      ? (this.vf / WHEELBASE) * Math.tan(this.steerAngle) * turnSpeedFactor * spec.handling
      : this.yawRate * 0.985 + input.steer * 1.2 * dt;
    this.yawRate = yaw;
    var dTheta = yaw * dt;
    this.angle = Utils.wrapAngle(this.angle + dTheta);

    // 航向改变后，世界速度不变 -> 在新坐标系里产生横向分量（打滑）
    var cs = Math.cos(dTheta);
    var sn = Math.sin(dTheta);
    var nvf = this.vf * cs + this.vr * sn;
    var nvr = -this.vf * sn + this.vr * cs;
    this.vf = nvf;
    this.vr = nvr;

    // --- 横向抓地 ---
    if (grounded) {
      var gripRate = spec.grip * (input.handbrake ? 0.3 : 1) * (this.offRoad ? 0.45 : 1);
      var keep = Math.exp(-gripRate * dt);
      var scrub = this.vr * (1 - keep);
      this.vr *= keep;
      // 一部分侧滑能量转成前进，漂移时才不会掉速太狠
      this.vf += Math.abs(scrub) * 0.35 * (this.vf >= 0 ? 1 : -1);
    } else {
      this.vr *= Math.exp(-0.4 * dt);
    }

    // --- 漂移量 ---
    var slip = Math.abs(this.vr);
    this.driftAmount = Utils.damp(this.driftAmount, Utils.clamp(slip / 9, 0, 1), 0.02, dt);
    if (grounded && slip > 2.6 && Math.abs(this.vf) > 6) this.driftTime += dt;
    else this.driftTime = 0;

    // --- 位移 ---
    var vel = this.velocity();
    this.x += vel.x * dt;
    this.z += vel.z * dt;
    this.wheelSpin += this.vf * dt * 1.6;

    // --- 垂直方向 / 跳跃 ---
    var groundH = world && world.heightAt ? world.heightAt(this.x, this.z) : 0;
    this.stuntEvent = null;

    if (!this.airborne) {
      var climb = (groundH - this.y) / Math.max(dt, 0.0001);
      this.y = groundH;
      if (climb > 2.5) {
        var f = this.forward();
        var lookAhead = Math.max(4, Math.abs(this.vf) * 0.22);
        var aheadH = world && world.heightAt ? world.heightAt(this.x + f.x * lookAhead, this.z + f.z * lookAhead) : 0;
        if (aheadH < groundH - 0.3) {
          this.airborne = true;
          this.airTime = 0;
          this.flipSpin = 0;
          this.vy = Math.min(climb, 26);
        }
      }
    } else {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      this.flipSpin += Math.abs(dTheta);
      if (this.y <= groundH) {
        this.y = groundH;
        this.vy = 0;
        this.airborne = false;
        if (this.airTime > 0.45) {
          this.stuntEvent = { airTime: this.airTime, spin: this.flipSpin };
        }
        this.airTime = 0;
        this.vf *= 0.94;
      }
    }

    // --- 姿态（仅视觉） ---
    var targetPitch = this.airborne
      ? Utils.clamp(this.vy * 0.035, -0.5, 0.5)
      : Utils.clamp(-(input.throttle - input.brake) * 0.035, -0.06, 0.06);
    var targetRoll = Utils.clamp(-this.vr * 0.02 - this.steerAngle * 0.06, -0.22, 0.22);
    this.pitch = Utils.damp(this.pitch, targetPitch, 0.02, dt);
    this.roll = Utils.damp(this.roll, targetRoll, 0.02, dt);
  };

  /** 撞墙：推回路面，去掉撞向墙的速度分量（贴着墙滑，不会卡死） */
  Car.prototype.hitWall = function (nx, nz, push) {
    this.x += nx * push;
    this.z += nz * push;
    var vel = this.velocity();
    var dot = vel.x * nx + vel.z * nz;
    if (dot >= 0) return 0;

    vel.x -= nx * dot;
    vel.z -= nz * dot;
    var loss = Utils.clamp(1 - Math.abs(dot) * 0.02, 0.6, 0.98);
    this.setVelocity(vel.x * loss, vel.z * loss);
    return Math.abs(dot);
  };

  Car.prototype.applyImpulse = function (ix, iz) {
    var vel = this.velocity();
    this.setVelocity(vel.x + ix, vel.z + iz);
  };

  global.Car = Car;
})(typeof window !== 'undefined' ? window : globalThis);
