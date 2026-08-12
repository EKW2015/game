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
  'utils.js', 'audio.js', 'dino.js', 'dinomodel.js', 'world.js',
  'ai.js', 'renderer3d.js', 'game.js', 'main.js'
];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(root, 'js', f), 'utf8');
}).join('\n');

const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const html = body
  .replace('<link rel="stylesheet" href="css/style.css" />', '<style>' + css + '</style>')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .replace('<script src="js/vendor/three.min.js"></script>', '')
  .trim()
  .replace('</body>', function () {
    return '<script>' + three + '<\/script>\n<script>' + js + '<\/script>\n</body>';
  });

fs.writeFileSync(path.join(root, 'play.html'), html);
console.log('play.html', Math.round(html.length / 1024), 'KB');
