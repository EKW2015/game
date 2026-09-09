/**
 * 打包单文件 play.html（离线双击可玩），并同步 docs/index.html 供 GitHub Pages 发布
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const jsFiles = ['chess.js', 'ai.js', 'audio.js', 'game.js', 'main.js'];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(root, 'js', f), 'utf8');
}).join('\n');

const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const html = body
  .replace('<link rel="stylesheet" href="css/style.css" />', '<style>' + css + '</style>')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .trim()
  .replace('</body>', function () {
    return '<script>' + js + '<\/script>\n</body>';
  });

fs.writeFileSync(path.join(root, 'play.html'), html);
const docsDir = path.join(root, 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);
fs.writeFileSync(path.join(docsDir, 'index.html'), html);
console.log('play.html', Math.round(html.length / 1024), 'KB');
console.log('docs/index.html', Math.round(html.length / 1024), 'KB');
