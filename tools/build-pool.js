/**
 * 打包单文件 pool.html（离线双击可玩）并复制到 docs/
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'pool');
const css = fs.readFileSync(path.join(dir, 'css/pool.css'), 'utf8');
const jsFiles = [
  'physics.js', 'audio.js', 'rules.js', 'ai.js', 'render.js', 'levels.js', 'game.js', 'main.js'
];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(dir, 'js', f), 'utf8');
}).join('\n');

const body = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const html = body
  .replace('<link rel="stylesheet" href="css/pool.css" />', '<style>' + css + '</style>')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .trim()
  .replace('</body>', function () {
    return '<script>' + js + '<\/script>\n</body>';
  });

fs.writeFileSync(path.join(root, 'pool.html'), html);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'pool.html'), html);
console.log('pool.html', Math.round(html.length / 1024), 'KB');
