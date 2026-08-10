/**
 * 打包单文件 play.html（含 Three.js，离线双击可玩）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const three = fs.readFileSync(path.join(root, 'js/vendor/three.min.js'), 'utf8');
const jsFiles = ['utils.js', 'audio.js', 'dino.js', 'ai.js', 'renderer3d.js', 'game.js', 'main.js'];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(root, 'js', f), 'utf8');
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>恐龙生存竞技场 3D</title>
<style>${css}</style>
</head>
<body>
<main class="page">
<header class="page__header">
<h1 class="page__title">恐龙生存竞技场 <span class="badge-3d">3D</span></h1>
<div class="page__tools">
<button id="btn-sound" class="tool" type="button">音效：开</button>
<button id="btn-pause" class="tool" type="button">暂停</button>
</div>
</header>
<div class="stage" id="stage">
<canvas id="game" class="stage__canvas"></canvas>
<div class="hud" id="hud">
<div class="hud__panel">
<div>阶段: <strong id="hud-stage">幼龙</strong></div>
<div>体型: <strong id="hud-mass">32</strong></div>
<div>击杀: <strong id="hud-kills">0</strong></div>
</div>
<div class="hud__remain">剩余 <strong id="hud-alive">6</strong> 只</div>
</div>
<div class="toast" id="toast"></div>
<div class="overlay" id="overlay-ready">
<p class="overlay__title">简单模式 3D 🎮</p>
<p class="overlay__hint">第三人称 3D 视角 · 靠近小恐龙就能吃</p>
<p class="overlay__hint">只有 5 只敌人 · 前 12 秒不会打你</p>
<button class="overlay__button" type="button" data-action="start">开始战斗</button>
</div>
<div class="overlay overlay--hidden" id="overlay-win">
<p class="overlay__title overlay__title--win">胜利！</p>
<p class="overlay__score">你是最后的恐龙 <span class="overlay__record" id="win-stats"></span></p>
<p class="overlay__hint">胜场 <strong id="win-count">0</strong></p>
<button class="overlay__button" type="button" data-action="restart">再来一局</button>
</div>
<div class="overlay overlay--hidden" id="overlay-over">
<p class="overlay__title">你被击败了</p>
<p class="overlay__score" id="death-stats"></p>
<button class="overlay__button" type="button" data-action="restart">再来一局</button>
</div>
<div class="overlay overlay--hidden" id="overlay-paused">
<p class="overlay__title">已暂停</p>
<button class="overlay__button" type="button" data-action="resume">继续游戏</button>
</div>
<div class="overlay overlay--hidden" id="overlay-error">
<p class="overlay__title">3D 加载失败</p>
<p class="overlay__hint" id="error-msg">你的浏览器不支持 WebGL</p>
</div>
</div>
<div class="touch" id="touch-controls">
<div class="touch__dpad">
<button class="touch__btn touch__btn--up" type="button" data-hold="up">↑</button>
<button class="touch__btn touch__btn--left" type="button" data-hold="left">←</button>
<button class="touch__btn touch__btn--right" type="button" data-hold="right">→</button>
<button class="touch__btn touch__btn--down" type="button" data-hold="down">↓</button>
</div>
<button class="touch__bite" type="button" data-hold="bite">撕咬</button>
</div>
<section class="legend">
<h2 class="legend__title">怎么玩</h2>
<ul class="legend__list">
<li>方向键移动，靠近小恐龙就能吃</li>
<li>吃掉 5 只就赢了</li>
</ul>
</section>
</main>
<script>${three}<\/script>
<script>${js}<\/script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'play.html'), html);
console.log('play.html', Math.round(html.length / 1024), 'KB');
