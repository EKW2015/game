/**
 * 贪吃蛇冒烟测试：直接从 snake.html 里取出核心规则脚本，在 node 里跑一遍
 * 用法：node tools/snake-smoke.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'snake.html'), 'utf8');

function extractCore() {
  const match = html.match(/<script id="snake-core">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('snake.html 里找不到 <script id="snake-core">');
  const module = { exports: {} };
  new Function('window', 'module', match[1])({}, module);
  return module.exports;
}

const Core = extractCore();

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log('  ✓ ' + name);
  } else {
    failed++;
    console.log('  ✗ ' + name);
  }
}

/** 固定随机数，保证测试可复现 */
function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function headAhead(game) {
  const d = Core.DIRS[game.dir];
  return { x: game.cells[0].x + d.x, y: game.cells[0].y + d.y };
}

console.log('初始状态');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(1) });
  check('蛇有 3 节', game.cells.length === 3);
  check('食物已生成且不在蛇身上', !!game.food && !Core.occupied(game, game.food.x, game.food.y));
  check('普通模式不能穿墙', game.wrap === false);
  check('简单模式可以穿墙', Core.createGame({ level: 'easy' }).wrap === true);
}

console.log('吃食物');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(2) });
  game.food = headAhead(game);
  const event = Core.step(game);
  check('返回 food 事件', event === 'food');
  check('加 10 分', game.score === 10);
  check('新食物换了位置且不在蛇身上', !Core.occupied(game, game.food.x, game.food.y));
  Core.step(game);
  check('下一步身体变长到 4 节', game.cells.length === 4);
}

console.log('金果');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(3) });
  for (let i = 0; i < 5; i++) {
    game.food = headAhead(game);
    Core.step(game);
  }
  check('吃满 5 个果子后出现金果', !!game.bonus);
  const before = game.score;
  game.bonus = { x: headAhead(game).x, y: headAhead(game).y, ttl: 10, life: Core.BONUS_TICKS };
  const event = Core.step(game);
  check('返回 bonus 事件', event === 'bonus');
  check('金果加 50 分', game.score === before + 50);
  game.bonus = { x: 0, y: 0, ttl: 1, life: Core.BONUS_TICKS };
  Core.step(game);
  check('金果倒计时结束后消失', game.bonus === null);
}

console.log('撞墙');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(4) });
  game.food = null;
  let steps = 0;
  while (!game.over && steps < 100) { Core.step(game); steps++; }
  check('普通模式撞墙结束', game.over && game.reason === '撞到墙了');
  check('从左侧起步，撞到右墙前有 17 步反应距离', steps === 17);
}

console.log('穿墙');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'easy', rng: seeded(5) });
  const startX = game.cells[0].x;
  game.food = null;
  for (let i = 0; i < 25; i++) Core.step(game);
  check('简单模式不会撞墙', !game.over);
  check('从左边绕回来', game.cells[0].x === (startX + 25) % 20);
}

console.log('转向');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(6) });
  game.food = null;
  check('不能直接掉头', Core.turn(game, 'left') === false);
  Core.step(game);
  check('掉头无效，方向仍向右', game.dir === 'right' && !game.over);
  check('可以转向上', Core.turn(game, 'up') === true);
  check('连按可排队转向左', Core.turn(game, 'left') === true);
  Core.step(game);
  check('第一步向上', game.dir === 'up');
  Core.step(game);
  check('第二步向左', game.dir === 'left' && !game.over);
}

console.log('咬到自己');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(7) });
  game.food = null;
  game.cells = [
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }
  ];
  game.dir = 'right';
  const event = Core.step(game);
  check('撞到身体结束', event === 'over' && game.reason === '咬到自己了');
}
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(8) });
  game.food = null;
  game.cells = [
    { x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }
  ];
  game.dir = 'right';
  Core.step(game);
  check('尾巴会让位，不算撞到', !game.over && game.cells[0].x === 6 && game.cells[0].y === 5);
}

console.log('满屏通关');
{
  const game = Core.createGame({ cols: 4, rows: 4, level: 'easy', rng: seeded(9) });
  const pathCells = [];
  for (let y = 0; y < 4; y++) {
    for (let i = 0; i < 4; i++) {
      const x = y % 2 === 0 ? i : 3 - i;
      pathCells.push({ x: x, y: y });
    }
  }
  game.cells = pathCells.slice(0, 15).reverse();
  game.dir = 'left';
  game.grow = 3;
  game.food = { x: pathCells[15].x, y: pathCells[15].y };
  Core.step(game);
  check('铺满棋盘算通关', game.over && game.won && game.reason === '满屏通关');
}

console.log('绘制用的折线');
{
  const copy = (cells) => cells.map((c) => ({ x: c.x, y: c.y }));
  const gaps = (pts) => {
    let worst = 0;
    for (let i = 1; i < pts.length; i++) {
      worst = Math.max(worst, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    return worst;
  };

  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(11) });
  let prev = copy(game.cells);
  Core.step(game);
  const mid = Core.pathPoints(game, prev, 0.5);
  check('普通模式：相邻两节始终挨着', gaps(mid) <= 1.001);
  check('插值到一半时蛇头位于两格中间', Math.abs(mid[0].x - (game.cells[0].x - 0.5)) < 1e-9);

  // 简单模式一路向右，穿过右边界的那一步最容易画裂
  const wrapGame = Core.createGame({ cols: 20, rows: 20, level: 'easy', rng: seeded(12) });
  wrapGame.food = null;
  let worstGap = 0;
  let wrapped = false;
  for (let i = 0; i < 30; i++) {
    prev = copy(wrapGame.cells);
    Core.step(wrapGame);
    if (wrapGame.wrapped) wrapped = true;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      worstGap = Math.max(worstGap, gaps(Core.pathPoints(wrapGame, prev, t)));
    }
  }
  check('确实穿了墙', wrapped);
  check('穿墙过程中身体不会断开', worstGap <= 1.001);

  // 平移副本要能盖住露在棋盘外的那一截
  const covered = (min, max, span) => {
    const shifts = Core.shiftRange(min, max, span);
    let left = min;
    let ok = true;
    shifts.forEach((k) => {
      if (k * span + max < 0 || k * span + min > span) ok = false; // 画了看不见的副本
    });
    // 棋盘上每个位置都要被某一份副本覆盖到
    for (let x = 0; x <= span; x += span / 40) {
      if (!shifts.some((k) => x >= k * span + min - 1e-9 && x <= k * span + max + 1e-9)) {
        if (x >= min && x <= max) ok = false;
      }
      left = x;
    }
    return ok && left >= 0;
  };
  check('身体没出界时只画一份', Core.shiftRange(40, 360, 400).join() === '0');
  check('探出左边界时补画右侧副本', Core.shiftRange(-30, 360, 400).join() === '0,1');
  check('探出右边界时补画左侧副本', Core.shiftRange(40, 430, 400).join() === '-1,0');
  check('副本能覆盖整块棋盘', covered(-30, 360, 400) && covered(40, 430, 400));
}

console.log('速度');
{
  const game = Core.createGame({ cols: 20, rows: 20, level: 'normal', rng: seeded(10) });
  const slow = Core.tickInterval(game);
  game.eaten = 30;
  const fast = Core.tickInterval(game);
  check('吃得越多走得越快', fast < slow);
  check('速度有下限', fast >= Core.LEVELS.normal.min);
  check('速度等级 1~10', Core.speedLevel(game) >= 1 && Core.speedLevel(game) <= 10);
}

console.log('随机对局 200 局');
{
  const dirs = ['up', 'down', 'left', 'right'];
  let totalSteps = 0;
  let broken = 0;
  let maxScore = 0;
  for (let g = 0; g < 200; g++) {
    const rng = seeded(1000 + g);
    const game = Core.createGame({ cols: 20, rows: 20, level: g % 2 ? 'easy' : 'hard', rng: rng });
    let steps = 0;
    while (!game.over && steps < 3000) {
      if (rng() < 0.25) Core.turn(game, dirs[Math.floor(rng() * 4) % 4]);
      Core.step(game);
      steps++;
      if (game.food && Core.occupied(game, game.food.x, game.food.y)) broken++;
      if (game.bonus && Core.occupied(game, game.bonus.x, game.bonus.y) && !game.over) broken++;
      const seen = {};
      for (const c of game.cells) {
        const key = c.x + ',' + c.y;
        if (seen[key]) { broken++; break; }
        seen[key] = true;
      }
      if (game.cells[0].x < 0 || game.cells[0].y < 0 || game.cells[0].x >= game.cols || game.cells[0].y >= game.rows) broken++;
    }
    totalSteps += steps;
    maxScore = Math.max(maxScore, game.score);
  }
  check('没有出现非法状态（重叠 / 出界 / 食物长在身上）', broken === 0);
  check('对局能正常进行（共 ' + totalSteps + ' 步，最高 ' + maxScore + ' 分）', totalSteps > 5000 && maxScore > 0);
}

console.log('页面脚本语法');
{
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  let ok = true;
  scripts.forEach(function (block) {
    const code = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try { new Function(code); } catch (e) { ok = false; console.log('    ' + e.message); }
  });
  check('snake.html 里的 ' + scripts.length + ' 段脚本都能通过语法检查', ok && scripts.length === 2);
}

console.log(failed ? '\n失败 ' + failed + ' 项' : '\n全部通过');
process.exit(failed ? 1 : 0);
