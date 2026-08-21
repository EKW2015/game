/**
 * 夜城飙车 - 无头逻辑自测：物理、跳台、碰撞、车流、竞速赛、车库经济
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

const load = (f) => require(path.join(__dirname, '..', 'racing', 'js', f));
load('rutil.js');
load('citymap.js');
load('ramps.js');
load('cars.js');
load('car.js');
load('traffic.js');
load('route.js');
load('autodrive.js');
load('racegame.js');

const RU = global.RU;
const CityMap = global.CityMap;
const Ramps = global.Ramps;
const Cars = global.Cars;
const Route = global.Route;
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

// ---- 跳台 ----
console.log('跳台');
let rampFound = null;
for (let i = -12; i <= 12 && !rampFound; i++) {
  for (let j = -12; j <= 12 && !rampFound; j++) {
    rampFound = Ramps.rampAt(i, j);
  }
}
check('城里能找到跳台', !!rampFound, rampFound ? '(' + rampFound.x.toFixed(0) + ', ' + rampFound.z.toFixed(0) + ')' : '');
check('跳台生成是确定性的',
  JSON.stringify(Ramps.rampAt(3, 4)) === JSON.stringify(Ramps.rampAt(3, 4)));
if (rampFound) {
  const mid = rampFound.alongX
    ? { x: rampFound.x + rampFound.sign * Ramps.LENGTH * 0.5, z: rampFound.z }
    : { x: rampFound.x, z: rampFound.z + rampFound.sign * Ramps.LENGTH * 0.5 };
  const h = Ramps.heightAt(mid.x, mid.z);
  check('坡道中点有高度', h > 0.5 && h < Ramps.HEIGHT, h.toFixed(2) + ' m');
  check('坡道外面是平地', Ramps.heightAt(rampFound.x + 400, rampFound.z + 400) === 0);
}

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

// ---- 升级会变快 ----
const fast = new global.Car({ accel: 21, maxSpeed: 74, grip: 13, brake: 36, turbo: 1.9 });
fast.reset(0, 0, Math.PI / 2);
fast.throttle = 1;
for (let i = 0; i < 60 * 30; i++) fast.update(DT);
check('高性能车型更快', fast.speed > car.speed,
  Math.round(RU.kmh(fast.speed)) + ' vs ' + Math.round(RU.kmh(car.speed)) + ' km/h');

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

// ---- 冲跳台会腾空 ----
if (rampFound) {
  const jumper = new global.Car();
  const runUp = 60;
  const startX = rampFound.alongX ? rampFound.x - rampFound.sign * runUp : rampFound.x;
  const startZ = rampFound.alongX ? rampFound.z : rampFound.z - rampFound.sign * runUp;
  const yaw = rampFound.alongX
    ? (rampFound.sign > 0 ? 0 : Math.PI)
    : (rampFound.sign > 0 ? Math.PI / 2 : -Math.PI / 2);
  jumper.reset(startX, startZ, yaw);
  jumper.throttle = 1;
  jumper.steer = 0;
  let maxY = 0;
  let maxAir = 0;
  let flew = false;
  for (let i = 0; i < 60 * 12; i++) {
    jumper.update(DT);
    maxY = Math.max(maxY, jumper.y);
    maxAir = Math.max(maxAir, jumper.airTime);
    if (jumper.airborne) flew = true;
  }
  check('冲上跳台会腾空', flew, '最高 ' + maxY.toFixed(1) + ' m / 滞空 ' + maxAir.toFixed(2) + ' s');
  check('落地后回到地面', Math.abs(jumper.y - Ramps.heightAt(jumper.x, jumper.z)) < 0.1, jumper.y.toFixed(2) + ' m');
}

// ---- 撞墙 ----
car.reset(CityMap.BLOCK / 2, 0, Math.PI / 2);
car.throttle = 1;
car.steer = 0;
car.handbrake = false;
for (let i = 0; i < 60 * 12; i++) car.update(DT);
check('不会开进建筑里', !CityMap.resolveCircle(car.x, car.z, car.radius - 0.1),
  '(' + car.x.toFixed(1) + ', ' + car.z.toFixed(1) + ')');

// ---- 赛道 ----
console.log('赛道');
const route = Route.create(0, 0, 3, 2, 2);
check('环线路点数正确', route.points.length === 2 * (3 + 2), route.points.length + ' 个');
check('路点都在路口', route.points.every((p) => CityMap.onRoad(p.x, p.z)));
const slot0 = Route.gridSlot(route, 0);
const slot3 = Route.gridSlot(route, 3);
check('起跑格互相错开', Math.hypot(slot0.x - slot3.x, slot0.z - slot3.z) > 5,
  Math.hypot(slot0.x - slot3.x, slot0.z - slot3.z).toFixed(1) + ' m');
check('进度随路点递增',
  Route.progress(route, 1, 2, route.points[2].x, route.points[2].z) >
  Route.progress(route, 1, 1, route.points[1].x, route.points[1].z));

// ---- 车库经济 ----
console.log('车库');
const garage = new Cars.Garage();
check('初始只有入门车', garage.has('street') && !garage.has('hyper'));
check('没钱买不了', !garage.buy('gt'));
garage.earn(20000);
check('赚钱后能买车', garage.buy('gt') && garage.has('gt'));
const before = garage.statsFor('gt').accel;
check('能升级引擎', garage.upgrade('gt', 'engine'));
check('升级后加速更强', garage.statsFor('gt').accel > before,
  before.toFixed(1) + ' -> ' + garage.statsFor('gt').accel.toFixed(1));
check('金币会扣掉', garage.cash < 20000, garage.cash + ' 金币');

// ---- 计时冲关 ----
console.log('计时挑战');

// 开得慢就该被时间淘汰
const slowGame = new global.RaceGame(new Cars.Garage());
const slowPilot = new global.AutoDrive(0.4);
slowGame.start('time');
let slowSteps = 0;
while (slowGame.state === 'playing' && slowSteps < 60 * 200) {
  slowPilot.update(slowGame, DT);
  slowGame.update(DT);
  slowSteps++;
}
check('开得慢会被时间淘汰', slowGame.state === 'over', (slowSteps * DT).toFixed(1) + 's');

const timeGarage = new Cars.Garage();
const game = new global.RaceGame(timeGarage);
const pilot = new global.AutoDrive();
game.start('time');
let steps = 0;
let maxParticles = 0;
let maxMarks = 0;
let stallSteps = 0;
let worstStall = 0;
while (game.state === 'playing' && steps < 60 * 150) {
  pilot.update(game, DT);
  game.update(DT);
  maxParticles = Math.max(maxParticles, game.particles.length);
  maxMarks = Math.max(maxMarks, game.marks.length);
  if (steps > 60 && game.car.speed < 3) stallSteps++;
  else stallSteps = 0;
  worstStall = Math.max(worstStall, stallSteps);
  steps++;
}
check('开得好能靠光门续命', game.state === 'playing' && game.gates > 5,
  game.gates + ' 个光门 / ' + game.timeLeft.toFixed(0) + 's 剩余');
check('得分为正', game.score > 0, game.score);
check('会产生烟雾粒子', maxParticles > 0, '峰值 ' + maxParticles);
check('会留下胎痕', maxMarks > 0, '峰值 ' + maxMarks);
check('不会长时间卡住不动', worstStall * DT < 4.5, '最长停滞 ' + (worstStall * DT).toFixed(1) + 's');
check('漂移与特技能赚钱', timeGarage.cash > 0, timeGarage.cash + ' 金币');

// ---- 竞速赛 ----
console.log('竞速赛');
const raceGarage = new Cars.Garage();
raceGarage.earn(30000);
raceGarage.buy('hyper');
for (let i = 0; i < 5; i++) {
  raceGarage.upgrade('hyper', 'engine');
  raceGarage.upgrade('hyper', 'turbo');
}
const race = new global.RaceGame(raceGarage);
const racePilot = new global.AutoDrive(1);
race.start('race', 0);
check('起跑有倒计时', race.state === 'countdown');
check('有 4 个 AI 对手', race.rivals.length === 4);
check('赛道已生成', !!race.route && race.route.points.length >= 8);

const cashBefore = raceGarage.cash;
let raceSteps = 0;
let sawRivalMove = false;
const rivalStart = { x: race.rivals[0].car.x, z: race.rivals[0].car.z };
while (race.state !== 'over' && raceSteps < 60 * 600) {
  if (race.state === 'playing') racePilot.driveTo(race.car, race.gate.x, race.gate.z, DT);
  race.update(DT);
  if (!sawRivalMove && Math.hypot(race.rivals[0].car.x - rivalStart.x, race.rivals[0].car.z - rivalStart.z) > 50) {
    sawRivalMove = true;
  }
  raceSteps++;
}
check('倒计时后进入比赛', race.elapsed > 0);
check('AI 对手真的会跑', sawRivalMove);
check('比赛会结束', race.state === 'over', (raceSteps * DT).toFixed(1) + 's');
check('跑完了应有圈数', race.lap > race.route.laps, race.lap - 1 + '/' + race.route.laps + ' 圈');
check('名次在 1~5 之间', race.place >= 1 && race.place <= 5, '第 ' + race.place + ' 名');
check('买了顶配车能赢', race.place === 1, '第 ' + race.place + ' 名');
check('完赛发奖金', raceGarage.cash > cashBefore, '+' + (raceGarage.cash - cashBefore) + ' 金币');

// ---- 极速冲刺 ----
console.log('极速冲刺');
const sprintRoute = Route.sprint(0);
check('冲刺路线有足够门点', sprintRoute.points.length >= 10, sprintRoute.points.length + ' 个');
check('冲刺是开环路线', !!sprintRoute.sprint && sprintRoute.laps === 1);
check('冲刺有金牌目标时间', sprintRoute.par >= 18, sprintRoute.par + 's');
check('冲刺门点都在路口', sprintRoute.points.every((p) => CityMap.onRoad(p.x, p.z)));

const sprintGarage = new Cars.Garage();
sprintGarage.earn(30000);
sprintGarage.buy('hyper');
for (let i = 0; i < 5; i++) {
  sprintGarage.upgrade('hyper', 'engine');
  sprintGarage.upgrade('hyper', 'turbo');
}
const sprint = new global.RaceGame(sprintGarage);
const sprintPilot = new global.AutoDrive(1);
sprint.start('sprint', 0);
check('冲刺有倒计时', sprint.state === 'countdown');
check('冲刺无 AI 对手', sprint.rivals.length === 0);
check('冲刺氮气拉满', sprint.car.nitro >= 0.99);
check('冲刺失败时限合理', sprint.sprintFailAt > sprint.sprintPar, sprint.sprintFailAt.toFixed(1) + 's');

const sprintCashBefore = sprintGarage.cash;
let sprintSteps = 0;
while (sprint.state !== 'over' && sprintSteps < 60 * 400) {
  if (sprint.state === 'playing' && sprint.gate) {
    sprintPilot.driveTo(sprint.car, sprint.gate.x, sprint.gate.z, DT);
  }
  sprint.update(DT);
  sprintSteps++;
}
check('冲刺会结束', sprint.state === 'over', (sprintSteps * DT).toFixed(1) + 's');
check('冲刺能跑完全部门点', sprint.finished && sprint.gates === sprint.route.points.length,
  sprint.gates + '/' + sprint.route.points.length);
check('冲刺奖牌判定有效',
  !sprint.finished || ['gold', 'silver', 'bronze', ''].indexOf(sprint.sprintMedal) >= 0,
  sprint.sprintMedal || 'none');
if (sprint.finished && sprint.sprintMedal) {
  check('冲刺奖牌发奖金', sprintGarage.cash > sprintCashBefore,
    '+' + (sprintGarage.cash - sprintCashBefore) + ' 金币');
} else {
  check('冲刺未完赛或无牌不强制奖金', true);
}
check('金牌阈值正确', sprint.sprintMedalFor(sprint.sprintPar) === 'gold');
check('银牌阈值正确', sprint.sprintMedalFor(sprint.sprintPar * 1.2) === 'silver');
check('铜牌阈值正确', sprint.sprintMedalFor(sprint.sprintPar * 1.4) === 'bronze');

// 超时失败
const failSprint = new global.RaceGame(new Cars.Garage());
failSprint.start('sprint', 0);
failSprint.state = 'playing';
failSprint.countdown = 0;
failSprint.elapsed = failSprint.sprintFailAt - 0.05;
failSprint.update(0.1);
check('冲刺超时会失败', failSprint.state === 'over' && !failSprint.finished);

// ---- 自由驾驶 ----
console.log('自由驾驶');
const freeGarage = new Cars.Garage();
const free = new global.RaceGame(freeGarage);
free.start('free');
let coinsSeen = 0;
for (let i = 0; i < 60 * 60; i++) {
  free.car.throttle = 1;
  free.car.steer = Math.sin(i / 90) * 0.6;
  free.update(DT);
  coinsSeen = Math.max(coinsSeen, free.coins.length);
}
check('自由驾驶不会结束', free.state === 'playing');
check('路上会刷金币', coinsSeen > 0, coinsSeen + ' 枚在场');
check('车辆位置有效', isFinite(free.car.x) && isFinite(free.car.z),
  '(' + free.car.x.toFixed(0) + ', ' + free.car.z.toFixed(0) + ')');

console.log('');
if (failures) {
  console.log(failures + ' 项失败');
  process.exit(1);
}
console.log('全部通过');
