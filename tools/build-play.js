/**
 * 打包单文件 play.html（含 Three.js，离线双击可玩）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const three = fs.readFileSync(path.join(root, 'js/vendor/three.min.js'), 'utf8');
const jsFiles = [
  'utils.js', 'audio.js', 'dinomodel.js', 'roster.js', 'skills.js', 'dino.js', 'world.js',
  'ai.js', 'renderer3d.js', 'game.js', 'main.js'
];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(root, 'js', f), 'utf8');
}).join('\n');

const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let html = body
  .replace('<link rel="stylesheet" href="css/style.css" />', '<style>' + css + '</style>')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .replace('<script src="js/vendor/three.min.js"></script>', '')
  .trim();
if (html.indexOf(css.slice(0, 40)) < 0) {
  html = html.replace('</head>', '<style>' + css + '</style>\n</head>');
}
html = html.replace('</body>', function () {
  return '<script>' + three + '<\/script>\n<script>' + js + '<\/script>\n</body>';
});

if (html.indexOf('--page-bg') < 0 || html.indexOf('function beginPlay') < 0) {
  throw new Error('play.html 打包不完整：缺少样式或开战逻辑');
}

fs.writeFileSync(path.join(root, 'play.html'), html);
console.log('play.html', Math.round(html.length / 1024), 'KB');
