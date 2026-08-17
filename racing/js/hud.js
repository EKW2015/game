/**
 * HUD：转速表 / 时速、氮气条、圈数名次、小地图、提示文字。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;

  function Hud(root, options) {
    options = options || {};
    this.root = root;
    this.compact = !!options.compact;
    this.el = {
      speed: root.querySelector('[data-hud="speed"]'),
      gear: root.querySelector('[data-hud="gear"]'),
      nos: root.querySelector('[data-hud="nos"]'),
      lap: root.querySelector('[data-hud="lap"]'),
      pos: root.querySelector('[data-hud="pos"]'),
      time: root.querySelector('[data-hud="time"]'),
      last: root.querySelector('[data-hud="last"]'),
      best: root.querySelector('[data-hud="best"]'),
      score: root.querySelector('[data-hud="score"]'),
      scoreLabel: root.querySelector('[data-hud="score-label"]'),
      name: root.querySelector('[data-hud="name"]'),
      dial: root.querySelector('[data-hud="dial"]'),
      map: root.querySelector('[data-hud="map"]')
    };
    this.dialCtx = this.el.dial ? this.el.dial.getContext('2d') : null;
    this.mapCtx = this.el.map ? this.el.map.getContext('2d') : null;
    this.mapBounds = null;
  }

  Hud.prototype.setTrack = function (track) {
    var box = this.el.map ? this.el.map.parentNode : null;
    if (!track || !track.samples) {
      // 自由驾驶没有赛道，直接把小地图收起来
      this.mapBounds = null;
      this.track = null;
      if (this.mapCtx) this.mapCtx.clearRect(0, 0, this.el.map.width, this.el.map.height);
      if (box) box.style.display = 'none';
      return;
    }
    if (box) box.style.display = '';
    var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < track.samples.length; i++) {
      var s = track.samples[i];
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.z < minZ) minZ = s.z;
      if (s.z > maxZ) maxZ = s.z;
    }
    this.track = track;
    this.mapBounds = { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ };
  };

  Hud.prototype.drawDial = function (kmh, rpm, nos, boosting) {
    var ctx = this.dialCtx;
    if (!ctx) return;
    var w = this.el.dial.width;
    var h = this.el.dial.height;
    var cx = w / 2;
    var cy = h / 2;
    var radius = Math.min(w, h) / 2 - 8;

    ctx.clearRect(0, 0, w, h);

    var start = Math.PI * 0.75;
    var end = Math.PI * 2.25;

    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(120,160,220,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.stroke();

    var value = Utils.clamp(rpm, 0, 1);
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, boosting ? '#a970ff' : '#18e0ff');
    grad.addColorStop(1, value > 0.85 ? '#ff2f6d' : '#ff2fb9');
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + (end - start) * value);
    ctx.stroke();

    // 氮气环
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(90,120,180,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, start, end);
    ctx.stroke();
    ctx.strokeStyle = boosting ? '#ffe45c' : '#39ff9e';
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, start, start + (end - start) * Utils.clamp(nos, 0, 1));
    ctx.stroke();
  };

  Hud.prototype.drawMap = function (cars, focus) {
    var ctx = this.mapCtx;
    if (!ctx || !this.mapBounds || !this.track) return;
    var w = this.el.map.width;
    var h = this.el.map.height;
    var b = this.mapBounds;
    var pad = 10;
    var scale = Math.min((w - pad * 2) / (b.maxX - b.minX || 1), (h - pad * 2) / (b.maxZ - b.minZ || 1));
    var ox = (w - (b.maxX - b.minX) * scale) / 2 - b.minX * scale;
    var oy = (h - (b.maxZ - b.minZ) * scale) / 2 - b.minZ * scale;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(24,224,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    var samples = this.track.samples;
    for (var i = 0; i <= samples.length; i += 2) {
      var s = samples[i % samples.length];
      var x = s.x * scale + ox;
      var y = s.z * scale + oy;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 起跑线
    var st = samples[0];
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(st.x * scale + ox - 2, st.z * scale + oy - 2, 5, 5);

    for (var j = 0; j < cars.length; j++) {
      var car = cars[j];
      var px = car.x * scale + ox;
      var py = car.z * scale + oy;
      ctx.beginPath();
      ctx.arc(px, py, car === focus ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = car === focus ? '#ffffff' : '#ff5f8f';
      ctx.fill();
      if (car === focus) {
        ctx.strokeStyle = '#18e0ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  Hud.prototype.update = function (data) {
    var el = this.el;
    if (el.speed) el.speed.textContent = String(Math.round(data.kmh));
    if (el.gear) el.gear.textContent = data.gear;
    if (el.nos) el.nos.style.width = Math.round(Utils.clamp(data.nos, 0, 1) * 100) + '%';
    if (el.lap) el.lap.textContent = data.lapText;
    if (el.pos) el.pos.textContent = data.posText;
    if (el.time) el.time.textContent = data.timeText;
    if (el.last) el.last.textContent = data.lastText;
    if (el.best) el.best.textContent = data.bestText;
    if (el.name) el.name.textContent = data.name || '';
    if (el.score) el.score.textContent = data.scoreText || '';
    if (el.scoreLabel) el.scoreLabel.textContent = data.scoreLabel || '';
    this.drawDial(data.kmh, data.rpm, data.nos, data.boosting);
    if (data.cars) this.drawMap(data.cars, data.focus);
  };

  global.Hud = Hud;
})(window);
