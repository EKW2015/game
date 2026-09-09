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
  'ring1', 'ring2', 'ring3', 'ring4', 'ring5', 'ring6', 'ring7', 'trueBody',
  'custom1', 'custom2', 'custom3', 'custom4', 'custom5', 'custom6', 'custom7',
  'boneL', 'boneR', 'domain'
];
expectedIds.forEach(function (id) {
  assert.ok(SKILLS_DATA[id], 'missing skill ' + id);
  assert.ok(SKILLS_DATA[id].name, 'skill ' + id + ' has no name');
  assert.ok(SKILLS_DATA[id].cost > 0, 'skill ' + id + ' cost');
});
assert.ok(Object.keys(SKILLS_DATA).length >= 17);
assert.ok(require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').indexOf('css/style.css') >= 0, 'index.html must link stylesheet');
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

player.goldBodyActive = false;
player.avatarMode = true;
var hpBeforeAvatar = player.hp;
player.takeDamage(400, dummy);
assert.ok(player.hp < hpBeforeAvatar, 'true body is tanky but not immortal');
assert.ok(player.alive);

player.avatarMode = false;
player.goldBodyActive = false;
player.hp = 3500;
player.mp = 1200;

assert.ok(win.Roster.ENEMY_TEAMS[0].members[0].attack >= 280, 'first opponent hits harder');
dummy.mp = 1000;
dummy.cooldowns = {};
dummy.avatarMode = false;
dummy.hp = 5000;
dummy.maxHp = 5000;
assert.strictEqual(win.AI.pickSkill(dummy, { skills: ['ring1', 'ring3', 'trueBody'] }, 90, 40), 'ring1');
dummy.hp = 2000;
assert.strictEqual(win.AI.pickSkill(dummy, { skills: ['ring1', 'ring3', 'trueBody'] }, 90, 40), 'trueBody');

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

player.avatarMode = false;
player.avatarTime = 0;
player.mp = 1200;
player.cooldowns = {};
assert.strictEqual(skills.castSkill('trueBody'), true);
assert.strictEqual(player.avatarMode, true, 'trueBody transforms soul master into martial soul');

win.Roster.PLAYER_TEAM.members.forEach(function (m) {
  if (m.id === 'chen') {
    assert.ok(m.skills.indexOf('ring7') >= 0, 'chen has 光明圣龙真身');
  } else {
    assert.ok(m.skills.indexOf('trueBody') >= 0, m.name + ' has 武魂真身');
  }
});
var clonedEnemy = win.Roster.cloneTeam(win.Roster.ENEMY_TEAMS[0]);
assert.ok(clonedEnemy.members[0].skills.indexOf('trueBody') >= 0, 'enemy saints also get 武魂真身');

assert.strictEqual(win.Roster.PLAYER_TEAM.name, '圣龙神辉战队');
assert.ok(win.Roster.PLAYER_TEAM.slogan.indexOf('圣龙出世') >= 0);
assert.strictEqual(win.Roster.PLAYER_TEAM.members[0].uniform, 'male');
assert.strictEqual(win.Roster.PLAYER_TEAM.members[2].uniform, 'female');
assert.ok(SKILLS_DATA.fusionTwin && SKILLS_DATA.fusionPhoenix);

gameStub.playerTeam = win.Roster.cloneTeam(win.Roster.PLAYER_TEAM);
gameStub.findMember = function (team, id) {
  if (!team) return null;
  for (var i = 0; i < team.members.length; i++) {
    if (team.members[i].id === id) return team.members[i];
  }
  return null;
};
player.characterId = 'chen';
player.avatarMode = false;
player.mp = 1200;
player.cooldowns = {};
assert.strictEqual(skills.castSkill('fusionTwin'), true, 'fusionTwin with 墨影 on roster');
assert.ok(skills.projectiles.length >= 9, 'nine dragon-man clones');

player.mp = 1200;
player.cooldowns = {};
gameStub.playerTeam.members.forEach(function (m) {
  if (m.id === 'yanhuang') m.eliminated = true;
});
assert.strictEqual(skills.castSkill('fusionPhoenix'), false, 'fusionPhoenix needs 焱凰 in team');

player.mp = 1200;
player.cooldowns = {};
gameStub.playerTeam.members.forEach(function (m) {
  if (m.id === 'yanhuang') m.eliminated = false;
});
assert.strictEqual(skills.castSkill('fusionPhoenix'), true, 'fusionPhoenix with 焱凰 on roster');

player.hp = 3500;
player.avatarMode = false;
player.goldBodyActive = false;
player.x = 0;
player.y = 0;
dummy.x = 40;
dummy.y = 0;
skills.projectiles.push({
  type: 'bolt',
  x: 1,
  z: 0,
  vx: 0,
  vy: 0,
  life: 1,
  damage: 300,
  owner: dummy
});
var hpHit = player.hp;
skills.update(0.016);
assert.ok(player.hp < hpHit, 'enemy projectile can hit the player');

dummy.cooldowns = dummy.cooldowns || {};
dummy.cooldowns.ring1 = 2;
dummy.mp = 1000;
assert.strictEqual(skills.castSkill('ring1', dummy, { silentFail: true }), false, 'silent fail on cooldown');

dummy.stunned = 0;
dummy.heavyDebuff = 0;
dummy.domainDebuff = false;
dummy.avatarMode = false;
dummy.isFlying = false;
assert.ok(dummy.getSpeed() >= 170, 'enemy chase speed is competitive');

console.log('smoke ok');
console.log('skills', Object.keys(SKILLS_DATA).length);
console.log('playerTitle', player.title);
console.log('roarStun', dummy.stunned);
console.log('domainActive', skills.domainActive);
