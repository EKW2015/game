'use strict';

var path = require('path');
var root = path.join(__dirname, '..', 'pool', 'js');
global.window = global;
require(path.join(root, 'physics.js'));
require(path.join(root, 'rules.js'));
require(path.join(root, 'ai.js'));

var P = global.Pool;
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL', msg);
  } else {
    console.log('ok', msg);
  }
}

/* 对心碰撞：静止球被撞走 */
(function () {
  var a = P.makeBall(0, 100, 100, 'cue', '#fff', '');
  var b = P.makeBall(1, 100 + P.R * 2 - 1, 100, 'solid', '#f00', 1);
  a.vx = 200;
  a.vy = 0;
  var i;
  for (i = 0; i < 12; i++) P.collidePair(a, b);
  assert(b.vx > 50, 'object ball gets velocity after head-on hit');
  assert(a.vx < 200, 'cue ball slows after hit');
})();

/* 库边反弹 */
(function () {
  var a = P.makeBall(0, 8, 100, 'cue', '#fff', '');
  a.vx = -120;
  a.vy = 0;
  P.hitCushions([a]);
  assert(a.vx > 0, 'cushion reverses vx');
  assert(a.x >= P.R - 0.01, 'ball stays inside table');
})();

/* 进袋 */
(function () {
  var a = P.makeBall(1, P.POCKETS[0].x, P.POCKETS[0].y, 'solid', '#f00', 1);
  var fallen = P.pocketBalls([a]);
  assert(fallen.length === 1 && a.pocketed, 'ball over pocket is pocketed');
})();

/* 规则：开放球桌先碰到 8 号算犯规 */
(function () {
  var eight = P.makeBall(8, 200, 200, 'eight', '#000', 8);
  var state = { openTable: true, turn: 0, assignment: [null, null], balls: [eight] };
  var r = P.Rules.summarizeShot(state, { firstHit: eight, pocketed: [], cuePocketed: false });
  assert(r.foul, 'hitting 8 first on open table is a foul');
})();

/* 规则：清台后合法打进 8 号获胜 */
(function () {
  var eight = P.makeBall(8, 200, 200, 'eight', '#000', 8);
  eight.pocketed = true;
  var state = {
    openTable: false,
    turn: 0,
    assignment: ['solid', 'stripe'],
    balls: [eight]
  };
  var r = P.Rules.summarizeShot(state, { firstHit: eight, pocketed: [eight], cuePocketed: false });
  assert(r.win && !r.lose, 'clearing 8 after solids wins');
})();

/* 规则：还有目标球时打进 8 号判负 */
(function () {
  var eight = P.makeBall(8, 200, 200, 'eight', '#000', 8);
  eight.pocketed = true;
  var leftover = P.makeBall(3, 100, 100, 'solid', '#f00', 3);
  var state = {
    openTable: false,
    turn: 0,
    assignment: ['solid', 'stripe'],
    balls: [eight, leftover]
  };
  var r = P.Rules.summarizeShot(state, { firstHit: leftover, pocketed: [eight], cuePocketed: false });
  assert(r.lose, 'pocketing 8 early loses');
})();

/* 规则：白球入袋犯规 */
(function () {
  var one = P.makeBall(1, 200, 200, 'solid', '#fc0', 1);
  var cue = P.makeBall(0, 0, 0, 'cue', '#fff', '');
  cue.pocketed = true;
  var state = { openTable: true, turn: 0, assignment: [null, null], balls: [cue, one] };
  var r = P.Rules.summarizeShot(state, { firstHit: one, pocketed: [cue], cuePocketed: true });
  assert(r.foul && !r.win, 'scratch is a foul');
})();

/* AI 在简单局面能给出方向 */
(function () {
  var cue = P.makeBall(0, 100, 200, 'cue', '#fff', '');
  var one = P.makeBall(1, 220, 200, 'solid', '#fc0', 1);
  var state = {
    openTable: true,
    turn: 0,
    assignment: [null, null],
    balls: [cue, one],
    aiLevel: 0
  };
  var shot = P.AI.pickShot(state);
  assert(shot && isFinite(shot.ax) && shot.power > 0, 'AI returns a shot');
})();

require(path.join(root, 'levels.js'));
assert(P.LEVELS && P.LEVELS.length >= 5, 'challenge has several levels');
assert(P.LEVELS[0].balls.length >= 1 && P.LEVELS[0].need === 1, 'first level is a single pocket');
assert(P.LEVELS[0].cue.x > 0, 'first level has a cue spot');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('all pool smoke tests passed');
