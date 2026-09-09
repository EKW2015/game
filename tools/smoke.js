'use strict';

var path = require('path');
var assert = require('assert');

var store = {};
var win = {
  devicePixelRatio: 1,
  requestAnimationFrame: function () { return 0; },
  AudioContext: function () {
    throw new Error('no audio in smoke');
  },
  localStorage: {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); }
  }
};
global.window = win;

require(path.join(__dirname, '..', 'js', 'utils.js'));
require(path.join(__dirname, '..', 'js', 'audio.js'));
require(path.join(__dirname, '..', 'js', 'roster.js'));
require(path.join(__dirname, '..', 'js', 'dino.js'));
require(path.join(__dirname, '..', 'js', 'skills.js'));
require(path.join(__dirname, '..', 'js', 'ai.js'));

var U = win.Utils;
var Dino = win.Dino;
var SkillManager = win.SkillManager;
var SKILLS_DATA = win.SKILLS_DATA;
var Sfx = win.Sfx;
Sfx.setMuted(true);

assert.strictEqual(U.getTitleByLevel(78), '魂圣');
assert.strictEqual(U.getTitleByLevel(91), '封号斗罗【圣龙斗罗】');
assert.strictEqual(U.SOUL_RING_COLORS.length, 7);

var expectedIds = [
  'ring1', 'ring2', 'ring3', 'ring4', 'ring5', 'ring6', 'ring7',
  'custom1', 'custom2', 'custom3', 'custom4', 'custom5', 'custom6', 'custom7',
  'boneL', 'boneR', 'domain'
];
expectedIds.forEach(function (id) {
  assert.ok(SKILLS_DATA[id], 'missing skill ' + id);
  assert.ok(SKILLS_DATA[id].name, 'skill ' + id + ' has no name');
  assert.ok(SKILLS_DATA[id].cost > 0, 'skill ' + id + ' cost');
});
assert.ok(Object.keys(SKILLS_DATA).length >= 17);
assert.strictEqual(win.Roster.PLAYER_TEAM.members.length, 7);
assert.strictEqual(win.Roster.PLAYER_TEAM.members[0].name, '陈凯威');
assert.strictEqual(win.Roster.PLAYER_TEAM.members[6].name, '白依依');

var player = new Dino({
  id: 1,
  isPlayer: true,
  x: 0,
  y: 0,
  level: 78,
  hp: 3500,
  mp: 1200,
  attack: 240,
  defense: 160,
  name: '圣龙斗罗'
});
assert.strictEqual(player.title, '魂圣');
assert.strictEqual(player.hasBadge, true);
assert.ok(player.getSpeed() > 0);

player.avatarMode = true;
assert.ok(player.getEffectiveAttack() >= 240 * 4);
player.goldBodyActive = true;
var dummy = new Dino({ id: 2, x: 10, y: 0, hp: 5000, attack: 80, defense: 20, name: '暗魔邪神虎' });
var died = player.takeDamage(400, dummy);
assert.strictEqual(died, false, 'avatar + gold body should be immune');
assert.ok(player.hp > 3400);
assert.ok(dummy.alive, 'reflect should not instantly kill a tanky beast');

player.avatarMode = false;
player.goldBodyActive = false;
player.mp = 1200;

var gameStub = {
  player: player,
  dinos: [player, dummy],
  world: { setDomainActive: function () {} },
  addMessage: function () {},
  addParticles: function () {}
};

var skills = new SkillManager(gameStub);
assert.strictEqual(skills.castSkill('ring1'), true);
assert.ok(player.mp < 1200, 'ring1 consumes mp');
assert.ok(player.cooldowns.ring1 > 0);

player.mp = 1200;
player.avatarMode = true;
var mpBefore = player.mp;
assert.strictEqual(skills.castSkill('ring3'), true);
assert.strictEqual(player.mp, mpBefore, 'avatar makes first six rings free');
assert.ok(dummy.stunned > 0, 'dragon roar should stun');

player.mp = 1200;
assert.strictEqual(skills.castSkill('domain'), true);
assert.strictEqual(skills.domainActive, true);
assert.strictEqual(player.domainBlessing, true);

skills.update(0.2);
assert.strictEqual(dummy.domainDebuff, true, 'enemies without badge get domain debuff');

console.log('smoke ok');
console.log('skills', Object.keys(SKILLS_DATA).length);
console.log('playerTitle', player.title);
console.log('roarStun', dummy.stunned);
console.log('domainActive', skills.domainActive);
