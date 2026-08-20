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

// 固定随机数种子，让城市生成、车流与检查点每次都一样，测试结果可复现
let seed = 20260820;
Math.random = function () {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >>> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 4294967296;
};

require(path.join(__dirname, '..', 'racing', 'js', 'rutil.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'citymap.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'car.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'traffic.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'racegame.js'));
require(path.join(__dirname, '..', 'racing', 'js', 'autodrive.js'));

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

// ---- 完整一局（用游戏里演示模式那套自动驾驶来跑） ----
console.log('游戏流程');
const game = new global.RaceGame();
const pilot = new global.AutoDrive();
game.start('time');
let steps = 0;
let gatesSeen = 0;
let maxParticles = 0;
let maxMarks = 0;
let stallSteps = 0;
let worstStall = 0;
while (game.state === 'playing' && steps < 60 * 240) {
  pilot.update(game, DT);
  game.update(DT);
  gatesSeen = game.gates;
  maxParticles = Math.max(maxParticles, game.particles.length);
  maxMarks = Math.max(maxMarks, game.marks.length);
  if (steps > 60 && game.car.speed < 3) stallSteps++;
  else stallSteps = 0;
  worstStall = Math.max(worstStall, stallSteps);
  steps++;
}
check('计时模式会结束', game.state === 'over', (steps * DT).toFixed(1) + 's');
check('自动驾驶能吃到光门', gatesSeen > 0, gatesSeen + ' 个');
check('得分为正', game.score > 0, game.score);
check('有车流生成', game.traffic.cars.length > 0, game.traffic.cars.length + ' 辆');
check('会产生烟雾粒子', maxParticles > 0, '峰值 ' + maxParticles);
check('粒子数量有上限', maxParticles <= 160, '峰值 ' + maxParticles);
check('会留下胎痕', maxMarks > 0, '峰值 ' + maxMarks);
check('胎痕数量有上限', maxMarks <= 220, '峰值 ' + maxMarks);
check('最高分已记录', game.best >= game.score);
check('不会长时间卡住不动', worstStall * DT < 4.5, '最长停滞 ' + (worstStall * DT).toFixed(1) + 's');

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
