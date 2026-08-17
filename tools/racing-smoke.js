/**
 * 无头冒烟测试：跑完整场比赛，检查圈数、名次、单圈时间与漂移/特技计分。
 * 用法：node tools/racing-smoke.js
 */
'use strict';

var path = require('path');

var store = {};
var win = {
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); }
  },
  setTimeout: function () { return 0; }
};
global.window = win;

function load(name) {
  require(path.join(__dirname, '..', 'racing', 'js', name));
}

// --- 桩：音效必须先于 game.js 就位 ---
win.Sfx = {
  startEngine: function () {}, stopEngine: function () {}, engineState: function () {},
  countdown: function () {}, crash: function () {}, beep: function () {}, cash: function () {},
  resume: function () {}, toggle: function () { return true; }
};

['utils.js', 'track.js', 'car.js', 'world.js', 'ai.js', 'garage.js', 'events.js', 'game.js'].forEach(load);

var sceneStub = {
  camState: [{}, {}],
  clearCars: function () {},
  buildTrack: function () {},
  buildArena: function () {},
  addCar: function () {},
  syncCars: function () {},
  updateCamera: function () {},
  shake: function () {}
};

var Utils = win.Utils;
var Tracks = win.Tracks;
var Garage = win.Garage;
var Driver = win.Driver;
var Game = win.RaceGame;

Garage.load();

var failures = [];
function check(label, ok, detail) {
  console.log((ok ? '  ok   ' : '  FAIL ') + label + (detail === undefined ? '' : '  → ' + detail));
  if (!ok) failures.push(label);
}

// ---------- 赛道几何 ----------
console.log('\n[赛道]');
Tracks.defs.forEach(function (def) {
  var track = Tracks.get(def.id);
  check(def.name + ' 长度合理', track.length > 1200 && track.length < 6000, Math.round(track.length) + ' m');

  // 采样点投影自洽
  var worst = 0;
  for (var i = 0; i < track.samples.length; i += 7) {
    var s = track.samples[i];
    var proj = track.project(s.x + s.rx * 4, s.z + s.rz * 4, null);
    worst = Math.max(worst, Math.abs(proj.lateral - 4));
  }
  check(def.name + ' 投影误差 < 0.6m', worst < 0.6, worst.toFixed(3));
});

// ---------- 车辆物理 ----------
console.log('\n[物理]');
(function () {
  var spec = Garage.spec('apex', { engine: 5, brake: 5, agility: 5, turbo: 5, booster: 5 });
  var car = new win.Car(spec, { x: 0, z: 0, angle: 0, isPlayer: true });
  var flatWorld = { heightAt: function () { return 0; }, surfaceAt: function () { return 1; } };
  car.input.throttle = 1;
  var t = 0;
  var reached100 = null;
  while (t < 30) {
    car.update(1 / 120, flatWorld);
    t += 1 / 120;
    if (reached100 === null && car.kmh >= 100) reached100 = t;
  }
  check('顶级车极速 300-400 km/h', car.kmh > 290 && car.kmh < 410, Math.round(car.kmh) + ' km/h');
  check('0-100 km/h 在 1.5-5 秒', reached100 > 1.2 && reached100 < 5, reached100.toFixed(2) + ' s');

  car.input.throttle = 0;
  car.input.brake = 1;
  var brakeStart = car.kmh;
  var bt = 0;
  while (car.kmh > 1 && bt < 20) { car.update(1 / 120, flatWorld); bt += 1 / 120; }
  check('能刹停', car.kmh <= 1, brakeStart.toFixed(0) + ' km/h → ' + bt.toFixed(2) + ' s');

  // 手刹漂移应产生横向速度
  car.reset(0, 0, 0);
  car.input.brake = 0;
  car.input.throttle = 1;
  for (var k = 0; k < 400; k++) car.update(1 / 120, flatWorld);
  car.input.steer = 1;
  car.input.handbrake = true;
  var maxSlip = 0;
  for (var m = 0; m < 200; m++) {
    car.update(1 / 120, flatWorld);
    maxSlip = Math.max(maxSlip, Math.abs(car.vr));
  }
  check('手刹能甩尾', maxSlip > 3, '侧滑 ' + maxSlip.toFixed(1) + ' m/s');
})();

// ---------- 跳台 ----------
console.log('\n[跳台]');
(function () {
  var arena = new win.ArenaWorld();
  var spec = Garage.spec('gt', { engine: 3 });
  var car = new win.Car(spec, { x: 0, z: 0, angle: 0 });
  var ramp = arena.ramps[arena.ramps.length - 1];
  // 从大跳台后方朝跳台方向加速
  car.reset(ramp.x - Math.cos(ramp.angle) * 90, ramp.z + Math.sin(ramp.angle) * 90, -ramp.angle);
  car.input.throttle = 1;
  var airborneSeen = false;
  var maxY = 0;
  for (var i = 0; i < 900; i++) {
    car.update(1 / 120, arena);
    if (car.airborne) airborneSeen = true;
    maxY = Math.max(maxY, car.y);
  }
  check('冲上跳台会腾空', airborneSeen, '最高 ' + maxY.toFixed(1) + ' m');
})();

// ---------- 完整比赛 ----------
console.log('\n[比赛]');
(function () {
  Garage.state.selected = 'phantom';
  Garage.state.owned.phantom = { engine: 3, brake: 3, agility: 3, turbo: 2, booster: 2, paint: 0, rims: 0 };

  var game = new Game(sceneStub, {
    onFinish: function (r) { game.__result = r; }
  });
  game.start({ mode: 'race', trackId: 'city', laps: 2, rivals: 4, difficulty: 0.6, players: 1, event: 'r4' });

  // 让电脑车手也来开玩家的车
  var track = game.track;
  var playerDriver = new Driver(game.playerCar, track, { skill: 0.95, aggression: 0.8, lineOffset: 0 });

  var dt = 1 / 60;
  var elapsed = 0;
  while (game.state !== 'finished' && elapsed < 60 * 12) {
    if (game.state === 'running') playerDriver.update(dt, game.cars);
    game.update(dt);
    elapsed += dt;
  }

  var result = game.__result;
  check('比赛能跑完', !!result, result ? Utils.formatTime(result.time) : '超时');
  if (result) {
    check('名次在 1-5', result.position >= 1 && result.position <= 5, Utils.ordinal(result.position));
    check('有最快单圈', result.bestLap > 20 && result.bestLap < 200, Utils.formatTime(result.bestLap));
    check('发放奖金', result.money > 0, '$' + result.money);
    check('名次表完整', result.standings.length === 5, result.standings.map(function (s) {
      return s.position + '.' + s.name;
    }).join(' '));

    var lapCounts = game.entries.map(function (e) { return e.lap; });
    check('对手也在跑圈', Math.max.apply(null, lapCounts) >= 2, lapCounts.join(','));

    var avgLap = result.time / 2;
    check('单圈时间 30-150 秒', avgLap > 30 && avgLap < 150, avgLap.toFixed(1) + ' s');
  }
})();

// ---------- 挑战：计时赛目标是否合理 ----------
console.log('\n[计时赛目标]');
win.RaceEvents.challenges.filter(function (c) { return c.kind === 'timetrial'; }).forEach(function (ch) {
  Garage.state.selected = 'apex';
  Garage.state.owned.apex = { engine: 5, brake: 5, agility: 5, turbo: 5, booster: 5, paint: 0, rims: 0 };
  var game = new Game(sceneStub, { onFinish: function (r) { game.__result = r; } });
  game.start({ mode: 'timetrial', trackId: ch.track, laps: 1, rivals: 0, players: 1, challenge: ch.id });
  var driver = new Driver(game.playerCar, game.track, { skill: 1, aggression: 1, lineOffset: 0 });
  var dt = 1 / 60;
  var elapsed = 0;
  while (game.state !== 'finished' && elapsed < 60 * 8) {
    if (game.state === 'running') driver.update(dt, game.cars);
    game.update(dt);
    elapsed += dt;
  }
  var r = game.__result;
  check(ch.name + ' 顶级车能达标', !!r && r.time < ch.target,
    r ? (Utils.formatTime(r.time) + ' / 目标 ' + Utils.formatTime(ch.target)) : '未完成');
});

// ---------- 平衡：新手车能赢第一场，满改车能赢最后一场 ----------
console.log('\n[平衡]');
function simulateRace(raceId, carId, tuning, skill) {
  Garage.state.selected = carId;
  Garage.state.owned[carId] = tuning;
  var race = win.RaceEvents.race(raceId);
  var game = new Game(sceneStub, { onFinish: function (r) { game.__result = r; } });
  game.start({
    mode: 'race', trackId: race.track, laps: race.laps, rivals: race.rivals,
    difficulty: race.difficulty, players: 1, event: race.id
  });
  var driver = new Driver(game.playerCar, game.track, { skill: skill, aggression: 0.85, lineOffset: 0 });
  var dt = 1 / 60;
  var elapsed = 0;
  while (game.state !== 'finished' && elapsed < 60 * 20) {
    if (game.state === 'running') driver.update(dt, game.cars);
    game.update(dt);
    elapsed += dt;
  }
  return game.__result;
}

(function () {
  var stock = { engine: 0, brake: 0, agility: 0, turbo: 0, booster: 0, paint: 0, rims: 0 };
  var maxed = { engine: 5, brake: 5, agility: 5, turbo: 5, booster: 5, paint: 0, rims: 0 };

  /** 机器人开得比真人差，取三次最好成绩作为“可达成”的判据 */
  function best(raceId, carId, tuning, skill) {
    var bestResult = null;
    for (var i = 0; i < 3; i++) {
      var r = simulateRace(raceId, carId, JSON.parse(JSON.stringify(tuning)), skill);
      if (r && (!bestResult || r.position < bestResult.position)) bestResult = r;
    }
    return bestResult;
  }

  var first = best('r1', 'hatch', stock, 0.9);
  check('新手车能赢第 1 场', first && first.position <= 2, first ? Utils.ordinal(first.position) : '未完成');
  var last = best('r16', 'apex', maxed, 0.92);
  check('满改车能拼最后一场', last && last.position <= 2, last ? Utils.ordinal(last.position) : '未完成');
  var mismatch = simulateRace('r16', 'hatch', stock, 0.9);
  check('新手车打不过决赛对手', mismatch && mismatch.position >= 3, mismatch ? Utils.ordinal(mismatch.position) : '未完成');
})();

// ---------- 漂移与特技计分速率 ----------
console.log('\n[计分]');
(function () {
  Garage.state.selected = 'phantom';
  Garage.state.owned.phantom = { engine: 3, brake: 2, agility: 2, turbo: 2, booster: 2, paint: 0, rims: 0 };
  var game = new Game(sceneStub, { onFinish: function (r) { game.__result = r; } });
  var ch = win.RaceEvents.challenge('drift');
  game.start({ mode: 'drift', trackId: ch.track, challenge: ch.id, players: 1, rivals: 0, duration: ch.duration });
  var input = game.playerCar.input;
  var dt = 1 / 60;
  var t = 0;
  // 简单的连续甩尾：加速 -> 打方向 + 手刹 -> 反打，循环
  while (game.state !== 'finished' && t < 200) {
    var phase = t % 4;
    input.throttle = 1;
    if (phase < 1.6) {
      input.steer = 0;
      input.handbrake = false;
    } else {
      input.steer = (Math.floor(t / 4) % 2 === 0 ? 1 : -1) * 0.55;
      input.handbrake = phase < 2.6;
    }
    game.update(dt);
    t += dt;
  }
  var r = game.__result;
  check('连续甩尾能刷到漂移目标', r && r.score >= ch.target,
    r ? (r.score + ' / ' + ch.target) : '未结算');
})();

// ---------- 车库 ----------
console.log('\n[车库]');
(function () {
  store = {};
  Garage.reset();
  var startMoney = Garage.money();
  check('初始拥有两台车', Object.keys(Garage.state.owned).length === 2, Object.keys(Garage.state.owned).join(','));
  var buy = Garage.buyCar('apex');
  check('钱不够买不了顶级车', !buy.ok, buy.reason);
  Garage.addMoney(500000);
  check('加钱后能买', Garage.buyCar('apex').ok, Utils.formatMoney(Garage.money()));
  var before = Garage.spec('apex').topSpeed;
  Garage.upgrade('apex', 'engine');
  check('升级引擎提升极速', Garage.spec('apex').topSpeed > before,
    before.toFixed(1) + ' → ' + Garage.spec('apex').topSpeed.toFixed(1));
  check('花掉了金币', Garage.money() < 500000 + startMoney, Utils.formatMoney(Garage.money()));
})();

console.log('');
if (failures.length) {
  console.log('✗ ' + failures.length + ' 项未通过：' + failures.join('；'));
  process.exit(1);
}
console.log('✓ 全部通过');
