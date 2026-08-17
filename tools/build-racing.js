/**
 * 打包单文件 racing.html（内置 Three.js，双击离线可玩），
 * 同时输出 docs/racing.html 供 GitHub Pages 在线玩。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'racing');

const css = fs.readFileSync(path.join(src, 'css/style.css'), 'utf8');
const three = fs.readFileSync(path.join(root, 'js/vendor/three.min.js'), 'utf8');

const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');

// 按 index.html 里的顺序取脚本，避免漏掉新增文件
const scriptOrder = [];
html.replace(/<script src="js\/([^"]+)"><\/script>/g, function (_, file) {
  scriptOrder.push(file);
  return '';
});

const js = scriptOrder.map(function (file) {
  return '/* ===== ' + file + ' ===== */\n' + fs.readFileSync(path.join(src, 'js', file), 'utf8');
}).join('\n');

// 注意：replace 的替换串里 $& 等符号有特殊含义，一律用函数形式
const out = html
  .replace('<link rel="stylesheet" href="css/style.css" />', function () {
    return '<style>' + css + '</style>';
  })
  .replace(/<script src="[^"]+"><\/script>\s*/g, '')
  .trim()
  .replace('</body>', function () {
    return '<script>' + three + '\n<\/script>\n<script>' + js + '\n<\/script>\n</body>';
  });

if (out.indexOf('THREE') < 0 || out.indexOf('RaceGame') < 0) {
  console.error('打包结果缺少必要代码，已中止');
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'racing.html'), out);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/racing.html'), out);

console.log('racing.html', Math.round(out.length / 1024), 'KB（含 ' + scriptOrder.length + ' 个脚本）');
