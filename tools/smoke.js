'use strict';

var path = require('path');

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

var noop = function () {};
var ctxStub = new Proxy({}, {
  get: function (t, p) { return t[p] === undefined ? noop : t[p]; },
  set: function (t, p, v) { t[p] = v; return true; }
});
var canvasStub = {
  width: 1920,
  height: 1280,
  getContext: function () { return ctxStub; },
  getBoundingClientRect: function () { return { width: 960, height: 640 }; }
};

require(path.join(__dirname, '..', 'js', 'utils.js'));
require(path.join(__dirname, '..', 'js', 'audio.js'));
require(path.join(__dirname, '..', 'js', 'dino.js'));
require(path.join(__dirname, '..', 'js', 'ai.js'));
require(path.join(__dirname, '..', 'js', 'game.js'));

win.Sfx.setMuted(true);
var Game = win.Game;
var DT = 1 / 60;

var game = new Game(canvasStub, {});
game.setState('playing');

var steps = 0;
while (game.state === 'playing' && steps < 60 * 120) {
  var p = game.player;
  p.press = function () {};
  game.input.up = true;
  game.input.bite = true;
  game.update(DT);
  steps++;
}

console.log('state', game.state, 'alive', game.aliveDinos().length, 'playerMass', Math.round(game.player.mass));
if (game.aliveDinos().length < INITIAL_NPC + 1) {
  console.log('combat working: dinosaurs eliminated');
}
console.log('steps', steps);
