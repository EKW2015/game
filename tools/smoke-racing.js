/**
 * 夜城飙车 - 无头逻辑自测：物理、碰撞、车流、检查点计分
 * 运行：node tools/smoke-racing.js
 */
'use strict';

const path = require('path');

const store = {};
global.window = global;
global.localStorage = {
  getItem: function (k) { return store[k] || null; },
  setItem: function (k, v) { store[k] = String(v); }
};

require(path.join(__dirname, '..', 'racing', 'js', 'rutil.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'citymap.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'car.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'traffic.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'racegame.js'));

const RU = global.RU;
const CityMap = global.CityMap;
const DT = 1 / 60;
let failures = 0;

function check(name, ok, extra) {
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra === undefined ? '' : ' -> ' + extra));
  if (!ok) failures++;
}

// ---- 城市布局 ----
console.log('城市布局');
check('路口在马路上', CityMap.onRoad(0, 0) && CityMap.onRoad(CityMap.BLOCK, 0));
check('街区中心不是马路', !CityMap.onRoad(CityMap.BLOCK / 2, CityMap.BLOCK / 2));
check('街区中心会被推出', !!CityMap.resolveCircle(CityMap.BLOCK / 2, CityMap.BLOCK / 2, 2.2));
check('路面中央不碰撞', CityMap.resolveCircle(0, 0, 2.2) === null);
check('建筑生成是确定性的',
  JSON.stringify(CityMap.buildingsIn(3, -7)) === JSON.stringify(CityMap.buildingsIn(3, -7)));

// ---- 直线加速 ----
console.log('车辆物理');
const car = new global.Car();
car.reset(0, 0, Math.PI / 2); // 沿 +z 方向的马路
car.throttle = 1;
let t = 0;
let timeTo100 = null;
while (t < 30) {
  car.update(DT);
  t += DT;
  if (!timeTo100 && RU.kmh(car.speed) >= 100) timeTo100 = t;
}
const topKmh = RU.kmh(car.speed);
check('极速在 170~240 km/h 之间', topKmh > 170 && topKmh < 240, Math.round(topKmh) + ' km/h');
check('0-100 km/h 在 2~7 秒', timeTo100 > 2 && timeTo100 < 7, timeTo100 && timeTo100.toFixed(2) + 's');
check('沿车道直行不偏移', Math.abs(car.x) < 0.5, car.x.toFixed(3));

// ---- 刹车 ----
car.throttle = 0;
car.brake = 1;
let brakeSteps = 0;
while (car.speed > 1 && brakeSteps < 60 * 20) { car.update(DT); brakeSteps++; }
check('能刹停', car.speed <= 1, (brakeSteps * DT).toFixed(2) + 's');

// ---- 手刹漂移 ----
car.reset(0, 0, Math.PI / 2);
car.brake = 0;
car.throttle = 1;
for (let i = 0; i < 60 * 5; i++) car.update(DT);
car.steer = 1;
car.handbrake = true;
let drifted = false;
let maxDrift = 0;
for (let i = 0; i < 60 * 2; i++) {
  car.update(DT);
  maxDrift = Math.max(maxDrift, car.driftAngle);
  if (car.drifting) drifted = true;
}
check('手刹能甩出漂移', drifted, '最大滑移角 ' + (maxDrift * 180 / Math.PI).toFixed(1) + '°');

// ---- 撞墙 ----
car.reset(CityMap.BLOCK / 2, 0, Math.PI / 2);
car.throttle = 1;
car.steer = 0;
car.handbrake = false;
for (let i = 0; i < 60 * 12; i++) car.update(DT);
check('不会开进建筑里', !CityMap.resolveCircle(car.x, car.z, car.radius - 0.1),
  '(' + car.x.toFixed(1) + ', ' + car.z.toFixed(1) + ')');

/**
 * 沿马路网格导航的自动驾驶：先沿当前这条路开到目标所在的路，再拐弯。
 * 用来验证「光门确实开得到」，顺便当作曼哈顿路线的可达性测试。
 */
function autopilot(g) {
  const B = CityMap.BLOCK;
  const car = g.car;
  const gi = Math.round(g.gate.x / B);
  const gj = Math.round(g.gate.z / B);
  const ci = Math.round(car.x / B);
  const cj = Math.round(car.z / B);
  const onXRoad = CityMap.distToRoadAxis(car.z) <= CityMap.HALF_ROAD;

  let wx;
  let wz;
  if (onXRoad && ci !== gi) {
    wx = gi * B;
    wz = cj * B;
  } else if (!onXRoad && cj !== gj) {
    wx = ci * B;
    wz = gj * B;
  } else {
    wx = g.gate.x;
    wz = g.gate.z;
  }

  const bearing = RU.wrapAngle(Math.atan2(wz - car.z, wx - car.x) - car.yaw);
  const distW = Math.hypot(wx - car.x, wz - car.z);
  const wantSpeed = Math.abs(bearing) > 0.45 ? 12 : (distW < 45 ? 22 : 42);
  car.steer = RU.clamp(bearing * 2.6, -1, 1);
  car.throttle = car.speed < wantSpeed ? 1 : 0;
  car.brake = car.speed > wantSpeed * 1.35 ? 1 : 0;
  car.handbrake = false;
  car.wantBoost = Math.abs(bearing) < 0.12 && distW > 120;
}

// ---- 完整一局 ----
console.log('游戏流程');
const game = new global.RaceGame();
game.start('time');
let steps = 0;
let gatesSeen = 0;
while (game.state === 'playing' && steps < 60 * 240) {
  autopilot(game);
  game.update(DT);
  gatesSeen = game.gates;
  steps++;
}
check('计时模式会结束', game.state === 'over', (steps * DT).toFixed(1) + 's');
check('自动驾驶能吃到光门', gatesSeen > 0, gatesSeen + ' 个');
check('得分为正', game.score > 0, game.score);
check('有车流生成', game.traffic.cars.length > 0, game.traffic.cars.length + ' 辆');
check('粒子数量有上限', game.particles.length <= 160, game.particles.length);
check('胎痕数量有上限', game.marks.length <= 220, game.marks.length);
check('最高分已记录', game.best >= game.score);

// ---- 自由驾驶模式 ----
const free = new global.RaceGame();
free.start('free');
for (let i = 0; i < 60 * 30; i++) {
  free.car.throttle = 1;
  free.car.steer = Math.sin(i / 90) * 0.6;
  free.update(DT);
}
check('自由驾驶不会结束', free.state === 'playing');
check('自由驾驶车辆位置有效', isFinite(free.car.x) && isFinite(free.car.z),
  '(' + free.car.x.toFixed(0) + ', ' + free.car.z.toFixed(0) + ')');

console.log('');
if (failures) {
  console.log(failures + ' 项失败');
  process.exit(1);
}
console.log('全部通过');
