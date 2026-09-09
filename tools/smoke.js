'use strict';

var path = require('path');
var assert = require('assert');

var store = {};
var win = {
  devicePixelRatio: 1,
  requestAnimationFrame: function () { return 0; },
  localStorage: {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); }
  }
};
global.window = win;
global.THREE = undefined;

require(path.join(__dirname, '..', 'js', 'utils.js'));
require(path.join(__dirname, '..', 'js', 'audio.js'));
require(path.join(__dirname, '..', 'js', 'unit.js'));
require(path.join(__dirname, '..', 'js', 'skills.js'));
require(path.join(__dirname, '..', 'js', 'ai.js'));
require(path.join(__dirname, '..', 'js', 'renderer3d.js'));
require(path.join(__dirname, '..', 'js', 'game.js'));

win.Sfx.setMuted(true);

var Game = win.Game;
var Skills = win.Skills;
var canvasStub = {
  width: 1920,
  height: 1280,
  getContext: function () { return null; },
  getBoundingClientRect: function () { return { width: 960, height: 640 }; }
};

var game = new Game(canvasStub, {});
game.setState('playing');

assert.ok(game.player, 'player exists');
assert.strictEqual(game.player.martialSoul, 'brightDragon');
assert.strictEqual(game.player.rings, 7);
assert.strictEqual(game.player.hasBadge, true);
assert.strictEqual(game.player.rank, '七环魂帝');
assert.ok(Skills.list.length === 17, '17 skills');

var soulBefore = game.player.soul;
var ok = game.tryCast('claw');
assert.ok(ok, 'cast claw');
assert.ok(game.player.soul < soulBefore, 'soul spent');
assert.ok(game.player.cooldowns.claw > 0, 'claw cooldown');

game.player.soul = 2000;
game.player.cooldowns = {};
game.tryCast('wings');
assert.ok(game.player.buffs.wings > 0, 'wings buff');

game.player.soul = 2000;
game.player.cooldowns = {};
game.tryCast('golden');
assert.ok(game.player.buffs.golden > 0, 'golden body');

game.player.soul = 5000;
game.player.cooldowns = {};
game.tryCast('truebody');
assert.ok(game.player.buffs.trueBody > 0, 'true body');
var atk = game.player.getAtk();
assert.ok(atk >= game.player.baseAtk * 3.9, 'true body 300% stats, atk=' + atk);

var freeBefore = game.player.soul;
game.tryCast('roar');
assert.strictEqual(game.player.soul, freeBefore, 'true body makes soul skills free');

game.player.soul = 5000;
game.player.cooldowns = {};
game.tryCast('domain');
assert.ok(game.domain && game.domain.life > 0, 'domain started');

var enemy = game.enemiesOf(game.player)[0];
assert.ok(enemy, 'has enemy');
enemy.x = game.player.x;
enemy.y = game.player.y;
enemy.hasBadge = false;
enemy.attr = 'dark';
game.updateDomain(1);
assert.ok(enemy.buffs.domainCurse > 0, 'enemy cursed in domain');

var light = game.spawnUnit({
  x: game.player.x, y: game.player.y,
  attr: 'light', name: '光系测试', hp: 400, atk: 10, def: 10
});
var hp0 = light.hp;
game.updateDomain(1);
assert.ok(light.buffs.domainCurse > 0, 'light martial soul still -50%');
assert.ok(light.hp === hp0, 'light martial soul no burn');

var ally = game.units.filter(function (u) { return u.isAlly && !u.isPlayer; })[0];
assert.ok(ally.hasBadge, 'ally has badge');
ally.x = game.player.x;
ally.y = game.player.y;
game.updateDomain(1);
assert.ok(ally.buffs.blessing > 0, 'badge ally blessed');
assert.ok(ally.buffs.domainCurse === 0, 'badge immune to domain harm');

game.player.buffs.trueBody = 0;
game.player.buffs.golden = 0;
var dummy = game.spawnUnit({
  x: game.player.x + 20,
  y: game.player.y,
  attr: 'dark',
  name: '木桩',
  hp: 500,
  atk: 1,
  def: 1,
  radius: 12
});
dummy.team = 'dark';
game.player.angle = 0;
game.player.lookYaw = 0;
var hits = game.hitCone(game.player, 80, 0.9, 50, { vsDark: true });
assert.ok(hits >= 1, 'claw cone hits, hits=' + hits);

var DT = 1 / 60;
for (var i = 0; i < 30; i++) game.update(DT);
assert.strictEqual(game.state, 'playing');
assert.ok(game.aliveUnits().length >= 2, 'units alive');

console.log('smoke ok', {
  skills: Skills.list.length,
  units: game.aliveUnits().length,
  kills: game.player.kills,
  domain: !!game.domain,
  playerHp: Math.round(game.player.hp)
});
