/**
 * 打包单文件 racing.html（含 Three.js，离线双击即玩），并同步到 docs/ 供在线访问
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'racing/css/racing.css'), 'utf8');
const three = fs.readFileSync(path.join(root, 'js/vendor/three.min.js'), 'utf8');

const jsFiles = [
  'rutil.js', 'citymap.js', 'ramps.js', 'cars.js', 'car.js', 'traffic.js',
  'route.js', 'autodrive.js', 'racegame.js',
  'carmodel.js', 'city3d.js', 'rrender.js', 'raudio.js', 'rmain.js'
];
const js = jsFiles.map(function (f) {
  return fs.readFileSync(path.join(root, 'racing/js', f), 'utf8');
}).join('\n');

const html = fs.readFileSync(path.join(root, 'racing/index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="css/racing.css" />', '<style>' + css + '</style>')
  .replace('<script src="../js/vendor/three.min.js"></script>', '')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .trim()
  .replace('</body>', function () {
    return '<script>' + three + '<\/script>\n<script>' + js + '<\/script>\n</body>';
  });

fs.writeFileSync(path.join(root, 'racing.html'), html);
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/racing.html'), html);
console.log('racing.html', Math.round(html.length / 1024), 'KB');
