/**
 * 夜城飙车 - 街机风格车辆物理（纯逻辑，不依赖 THREE）
 *
 * 坐标系与 three.js 一致：x 向右、z 向屏幕外、y 向上。
 * 车头朝向由 yaw 表示，前进方向 = (cos yaw, sin yaw)，
 * 车身右侧方向 = (-sin yaw, cos yaw)，yaw 增大即向右转。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  var WHEELBASE = 3.05;
  var BODY_RADIUS = 2.2;

  function Car() {
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.vx = 0;
    this.vz = 0;
    this.yawRate = 0;
    this.steerAngle = 0;

    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handbrake = false;
    this.wantBoost = false;

    this.speed = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.driftAngle = 0;
    this.drifting = false;
    this.boosting = false;
    this.nitro = 0.5;
    this.rpm = 0.15;
    this.wheelSpin = 0;
    this.offRoad = false;
    this.crashImpact = 0;
    this.topSpeed = 0;
  }

  Car.prototype.radius = BODY_RADIUS;

  Car.prototype.reset = function (x, z, yaw) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.vx = 0;
    this.vz = 0;
    this.yawRate = 0;
    this.steerAngle = 0;
    this.speed = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.driftAngle = 0;
    this.drifting = false;
    this.crashImpact = 0;
  };

  /** 卡住时把车放回最近的车道中央 */
  Car.prototype.respawnOnRoad = function () {
    var B = CityMap.BLOCK;
    var lineX = Math.round(this.x / B) * B;
    var lineZ = Math.round(this.z / B) * B;
    var dx = Math.abs(this.x - lineX);
    var dz = Math.abs(this.z - lineZ);
    if (dx < dz) {
      this.reset(lineX, this.z, this.vz >= 0 ? Math.PI / 2 : -Math.PI / 2);
    } else {
      this.reset(this.x, lineZ, Math.cos(this.yaw) >= 0 ? 0 : Math.PI);
    }
  };

  Car.prototype.forward = function () {
    return { x: Math.cos(this.yaw), z: Math.sin(this.yaw) };
  };

  Car.prototype.right = function () {
    return { x: -Math.sin(this.yaw), z: Math.cos(this.yaw) };
  };

  Car.prototype.update = function (dt) {
    var fx = Math.cos(this.yaw);
    var fz = Math.sin(this.yaw);
    var rx = -fz;
    var rz = fx;

    var vf = this.vx * fx + this.vz * fz;
    var vl = this.vx * rx + this.vz * rz;

    this.boosting = this.wantBoost && this.nitro > 0.02 && vf > 2;
    if (this.boosting) this.nitro = Math.max(0, this.nitro - 0.3 * dt);

    // ---- 转向：速度越高方向越沉稳 ----
    var maxSteer = 0.62 - 0.40 * RU.clamp(Math.abs(vf) / 65, 0, 1);
    this.steerAngle = RU.damp(this.steerAngle, this.steer * maxSteer, 11, dt);

    // ---- 纵向：引擎 / 刹车 / 阻力 ----
    var maxV = this.boosting ? 74 : 60;
    var accel = 0;
    if (this.throttle > 0) {
      var falloff = 1 - Math.pow(RU.clamp(vf / maxV, 0, 1), 1.7);
      accel += 15 * this.throttle * falloff * (this.boosting ? 1.6 : 1);
    }
    if (this.brake > 0) {
      if (vf > 0.6) accel -= 36 * this.brake;
      else accel -= 13 * this.brake;
    }
    if (this.throttle <= 0 && this.brake <= 0 && Math.abs(vf) > 0.2) {
      accel -= Math.sign(vf) * 2.6;
    }
    accel -= 0.0011 * vf * Math.abs(vf);

    this.offRoad = !CityMap.onRoad(this.x, this.z);
    if (this.offRoad) accel -= Math.sign(vf) * 5.5;

    vf += accel * dt;
    if (Math.abs(vf) < 0.12 && this.throttle <= 0 && this.brake <= 0) vf = 0;
    if (vf < -16) vf = -16;

    // ---- 偏航：自行车模型 + 手刹甩尾 ----
    var yawTarget = (vf / WHEELBASE) * Math.tan(this.steerAngle);
    if (this.handbrake) yawTarget *= 1.9;
    this.yawRate = RU.damp(this.yawRate, yawTarget, this.handbrake ? 6.5 : 9.5, dt);
    this.yaw = RU.wrapAngle(this.yaw + this.yawRate * dt);

    // ---- 侧向：抓地力决定是抓住还是甩出去 ----
    var slipGain = this.handbrake ? 1.0 : 0.34;
    vl -= this.yawRate * vf * dt * slipGain;

    var grip = this.handbrake ? 2.4 : 13;
    if (this.offRoad) grip *= 0.55;
    if (this.throttle > 0.5 && Math.abs(vf) < 22) grip *= 0.85; // 低速大脚油门更容易滑
    vl = RU.damp(vl, 0, grip, dt);
    if (Math.abs(vl) > 34) vl = Math.sign(vl) * 34;

    // ---- 回到世界坐标 ----
    fx = Math.cos(this.yaw);
    fz = Math.sin(this.yaw);
    this.vx = fx * vf - fz * vl;
    this.vz = fz * vf + fx * vl;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    this.crashImpact = 0;
    var hit = CityMap.resolveCircle(this.x, this.z, BODY_RADIUS);
    if (hit) {
      this.x += hit.nx * hit.push;
      this.z += hit.nz * hit.push;
      var vn = this.vx * hit.nx + this.vz * hit.nz;
      if (vn < 0) {
        this.crashImpact = Math.min(1, -vn / 30);
        this.vx -= hit.nx * vn * 1.25;
        this.vz -= hit.nz * vn * 1.25;
        this.vx *= 0.62;
        this.vz *= 0.62;
        this.yawRate *= 0.35;
      }
    }

    this.forwardSpeed = this.vx * fx + this.vz * fz;
    this.lateralSpeed = this.vx * (-fz) + this.vz * fx;
    this.speed = Math.hypot(this.vx, this.vz);
    this.driftAngle = Math.atan2(Math.abs(this.lateralSpeed), Math.max(1, Math.abs(this.forwardSpeed)));
    this.drifting = this.speed > 11 && this.driftAngle > 0.17;
    if (this.speed > this.topSpeed) this.topSpeed = this.speed;

    var targetRpm = RU.clamp(0.12 + Math.abs(this.forwardSpeed) / 62 + (this.drifting ? 0.25 : 0) +
      (this.throttle > 0 ? 0.12 : 0), 0, 1.15);
    this.rpm = RU.damp(this.rpm, targetRpm, 6, dt);
    this.wheelSpin += (this.forwardSpeed / 0.34) * dt;

    // 漂移会回充氮气
    if (this.drifting) this.nitro = Math.min(1, this.nitro + this.driftAngle * 0.22 * dt);
  };

  /** 撞到其他车辆时的简单冲击 */
  Car.prototype.applyImpact = function (nx, nz, strength) {
    var vn = this.vx * nx + this.vz * nz;
    if (vn > 0) {
      this.vx -= nx * vn * 1.4;
      this.vz -= nz * vn * 1.4;
    }
    this.vx = this.vx * 0.72 + nx * strength;
    this.vz = this.vz * 0.72 + nz * strength;
    this.yawRate += (Math.random() - 0.5) * 1.2;
    this.crashImpact = Math.max(this.crashImpact, Math.min(1, strength / 12));
  };

  global.Car = Car;
})(typeof window !== 'undefined' ? window : global);
