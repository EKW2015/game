/**
 * 夜城飙车 - 自动驾驶（演示模式 & 无头测试共用，不依赖 THREE）
 *
 * 走曼哈顿路线：先沿当前这条街开到目标所在的街，再拐弯；
 * 被挤到人行道上就先回到车道中心，顶住墙超过一会儿就倒车脱困。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  function AutoDrive() {
    this.stuck = 0;
    this.backup = 0;
    this.backupSteer = 1;
  }

  AutoDrive.prototype.reset = function () {
    this.stuck = 0;
    this.backup = 0;
  };

  /** 下一个要开往的路点 */
  AutoDrive.prototype.waypoint = function (game) {
    var B = CityMap.BLOCK;
    var car = game.car;
    var gate = game.gate;

    // 掉出马路（撞上人行道）时，先垂直回到最近的车道中心
    if (!CityMap.onRoad(car.x, car.z)) {
      var lineX = Math.round(car.x / B) * B;
      var lineZ = Math.round(car.z / B) * B;
      if (Math.abs(car.x - lineX) < Math.abs(car.z - lineZ)) {
        return { x: lineX, z: car.z, turning: true };
      }
      return { x: car.x, z: lineZ, turning: true };
    }

    var gi = Math.round(gate.x / B);
    var gj = Math.round(gate.z / B);
    var ci = Math.round(car.x / B);
    var cj = Math.round(car.z / B);
    var onXRoad = CityMap.distToRoadAxis(car.z) <= CityMap.HALF_ROAD;

    if (onXRoad && ci !== gi) return { x: gi * B, z: cj * B, turning: true };
    if (!onXRoad && cj !== gj) return { x: ci * B, z: gj * B, turning: true };
    return { x: gate.x, z: gate.z, turning: false };
  };

  AutoDrive.prototype.update = function (game, dt) {
    var car = game.car;
    if (!game.gate) return;

    if (car.speed < 2.5) this.stuck += dt;
    else this.stuck = 0;
    if (this.stuck > 1.2) {
      this.stuck = 0;
      this.backup = 1.2;
    }

    // 倒车脱困：反向打方向，把车头从墙角里拽出来
    if (this.backup > 0) {
      this.backup -= dt;
      car.throttle = 0;
      car.brake = 1;
      car.steer = this.backupSteer;
      car.handbrake = false;
      car.wantBoost = false;
      return;
    }

    var wp = this.waypoint(game);
    var bearing = RU.wrapAngle(Math.atan2(wp.z - car.z, wp.x - car.x) - car.yaw);
    var dist = Math.hypot(wp.x - car.x, wp.z - car.z);

    // 要拐弯就提前减速，否则一定顶到街角
    var wantSpeed = 50;
    if (Math.abs(bearing) > 0.4) wantSpeed = 11;
    else if (wp.turning && dist < 70) wantSpeed = 15;
    else if (dist < 40) wantSpeed = 22;

    this.backupSteer = bearing >= 0 ? -1 : 1;
    car.steer = RU.clamp(bearing * 2.6, -1, 1);
    car.throttle = car.speed < wantSpeed ? 1 : 0;
    car.brake = car.speed > wantSpeed * 1.4 ? 1 : 0;
    car.handbrake = Math.abs(bearing) > 0.55 && car.speed > 20;
    car.wantBoost = Math.abs(bearing) < 0.1 && dist > 130;
  };

  global.AutoDrive = AutoDrive;
})(typeof window !== 'undefined' ? window : global);
