/**
 * 夜城飙车 - 输入、HUD、小地图与主循环
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;
  var RaceGame = global.RaceGame;
  var RaceRenderer = global.RaceRenderer;
  var RaceAudio = global.RaceAudio;

  var doc = global.document;
  var game = new RaceGame();
  var renderer = null;
  var input = {
    throttle: false, brake: false, left: false, right: false,
    handbrake: false, boost: false
  };

  var el = {};
  var gaugeLength = 0;
  var driftTimer = 0;
  var toastTimer = 0;
  var lastTime = 0;
  var running = false;

  function $(id) { return doc.getElementById(id); }

  function cacheElements() {
    ['boot-screen', 'boot-msg', 'game', 'stage', 'hud-time', 'hud-score', 'hud-gates', 'hud-best',
      'hud-speed', 'gauge-fill', 'nitro-fill', 'gate-arrow', 'gate-dist', 'drift-banner', 'drift-score',
      'combo-badge', 'toast', 'minimap', 'overlay-ready', 'overlay-over', 'overlay-paused',
      'overlay-error', 'error-msg', 'result-stats', 'btn-sound', 'btn-cam', 'btn-pause']
      .forEach(function (id) {
        el[id] = $(id);
      });
    el.map = el['minimap'].getContext('2d');
  }

  function showOverlay(name) {
    ['overlay-ready', 'overlay-over', 'overlay-paused', 'overlay-error'].forEach(function (id) {
      el[id].classList.toggle('overlay--hidden', id !== name);
    });
  }

  function toast(text, ms) {
    el['toast'].textContent = text;
    el['toast'].classList.add('toast--on');
    toastTimer = (ms || 1200) / 1000;
  }

  function resize() {
    var w = el['stage'].clientWidth || global.innerWidth;
    var h = el['stage'].clientHeight || global.innerHeight;
    if (renderer) renderer.resize(w, h);
  }

  // ---------------- 输入 ----------------
  var KEYS = {
    ArrowUp: 'throttle', KeyW: 'throttle',
    ArrowDown: 'brake', KeyS: 'brake',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'handbrake',
    ShiftLeft: 'boost', ShiftRight: 'boost'
  };

  function bindKeys() {
    doc.addEventListener('keydown', function (e) {
      var action = KEYS[e.code];
      if (action) {
        input[action] = true;
        e.preventDefault();
        return;
      }
      if (e.code === 'KeyC') toggleCamera();
      else if (e.code === 'KeyR') {
        game.car.respawnOnRoad();
        toast('回到路面', 700);
      } else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      else if (e.code === 'KeyM') toggleSound();
      else if (e.code === 'Enter' && game.state !== 'playing') startGame('time');
    });

    doc.addEventListener('keyup', function (e) {
      var action = KEYS[e.code];
      if (action) {
        input[action] = false;
        e.preventDefault();
      }
    });

    global.addEventListener('blur', function () {
      Object.keys(input).forEach(function (k) { input[k] = false; });
    });
  }

  function bindTouch() {
    var buttons = doc.querySelectorAll('[data-hold]');
    Array.prototype.forEach.call(buttons, function (btn) {
      var action = btn.getAttribute('data-hold');
      var set = function (v) {
        return function (e) {
          e.preventDefault();
          input[action] = v;
        };
      };
      btn.addEventListener('touchstart', set(true), { passive: false });
      btn.addEventListener('touchend', set(false), { passive: false });
      btn.addEventListener('touchcancel', set(false), { passive: false });
      btn.addEventListener('mousedown', set(true));
      btn.addEventListener('mouseup', set(false));
      btn.addEventListener('mouseleave', set(false));
    });
  }

  function bindButtons() {
    doc.addEventListener('click', function (e) {
      var action = e.target.getAttribute && e.target.getAttribute('data-action');
      if (!action) return;
      if (action === 'start-time') startGame('time');
      else if (action === 'start-free') startGame('free');
      else if (action === 'restart') startGame(game.mode);
      else if (action === 'resume') togglePause();
    });

    el['btn-sound'].addEventListener('click', toggleSound);
    el['btn-cam'].addEventListener('click', toggleCamera);
    el['btn-pause'].addEventListener('click', togglePause);
  }

  function toggleSound() {
    var muted = RaceAudio.toggle();
    el['btn-sound'].textContent = muted ? '🔇 静音' : '🔊 音效';
  }

  function toggleCamera() {
    if (!renderer) return;
    var mode = renderer.camMode === 'chase' ? 'hood' : 'chase';
    renderer.setCamMode(mode);
    toast(mode === 'hood' ? '车内视角' : '跟车视角', 800);
  }

  function togglePause() {
    if (game.state === 'playing') {
      game.state = 'paused';
      showOverlay('overlay-paused');
    } else if (game.state === 'paused') {
      game.state = 'playing';
      showOverlay(null);
    }
  }

  function startGame(mode) {
    RaceAudio.start();
    game.start(mode);
    showOverlay(null);
    el['hud-time'].parentNode.style.opacity = mode === 'free' ? 0.35 : 1;
    toast(mode === 'free' ? '自由驾驶：随便逛' : '冲向青色光门！', 1500);
  }

  function gameOver() {
    var kmh = Math.round(RU.kmh(game.car.topSpeed));
    el['result-stats'].innerHTML =
      '本局得分 <b>' + game.score + '</b><br>' +
      '通过光门 <b>' + game.gates + '</b> 个<br>' +
      '最高速度 <b>' + kmh + '</b> km/h<br>' +
      '历史最高 <b>' + game.best + '</b>';
    showOverlay('overlay-over');
  }

  // ---------------- HUD ----------------
  function initGauge() {
    var path = el['gauge-fill'];
    gaugeLength = path.getTotalLength();
    path.style.strokeDasharray = gaugeLength;
    path.style.strokeDashoffset = gaugeLength;
  }

  function updateHud(dt) {
    var car = game.car;
    var speed = RU.kmh(car.speed);
    el['hud-speed'].textContent = Math.round(speed);

    var t = RU.clamp(speed / 260, 0, 1);
    el['gauge-fill'].style.strokeDashoffset = gaugeLength * (1 - t);
    el['gauge-fill'].style.stroke = car.boosting ? '#ff2e78' : (speed > 200 ? '#ffd84d' : '#2ee6ff');
    el['nitro-fill'].style.width = Math.round(car.nitro * 100) + '%';

    el['hud-time'].textContent = game.mode === 'free' ? '∞' : game.timeLeft.toFixed(1);
    el['hud-time'].classList.toggle('warn', game.mode === 'time' && game.timeLeft < 8);
    el['hud-score'].textContent = game.score;
    el['hud-gates'].textContent = game.gates;
    el['hud-best'].textContent = game.best;

    var dist = Math.round(game.gateDistance());
    el['gate-dist'].textContent = dist;
    var bearing = game.gateBearing();
    el['gate-arrow'].style.transform = 'rotate(' + (bearing * 180 / Math.PI - 90) + 'deg)';
    el['gate-arrow'].style.color = Math.abs(bearing) < 0.35 ? '#39ff88' : '#2ee6ff';

    var driftLive = Math.round(game.driftAccum * game.combo);
    if (car.drifting && driftLive > 0) {
      el['drift-banner'].classList.add('drift--on');
      el['drift-score'].textContent = '+' + driftLive;
      driftTimer = 0.6;
    } else if (driftTimer > 0) {
      driftTimer -= dt;
      if (driftTimer <= 0) el['drift-banner'].classList.remove('drift--on');
    }

    el['combo-badge'].textContent = 'x' + game.combo;
    el['combo-badge'].classList.toggle('combo--on', game.combo > 1);

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) el['toast'].classList.remove('toast--on');
    }
  }

  function drawMinimap() {
    var ctx = el.map;
    var size = el['minimap'].width;
    var half = size / 2;
    var scale = 0.115;
    var car = game.car;
    var B = CityMap.BLOCK;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(6,8,18,0.75)';
    ctx.fillRect(0, 0, size, size);

    var range = Math.ceil(half / (B * scale)) + 1;
    var ci = Math.round(car.x / B);
    var cj = Math.round(car.z / B);
    ctx.strokeStyle = 'rgba(46,230,255,0.28)';
    ctx.lineWidth = 3;
    for (var i = ci - range; i <= ci + range; i++) {
      var sx = half + (i * B - car.x) * scale;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, size);
      ctx.stroke();
    }
    for (var j = cj - range; j <= cj + range; j++) {
      var sy = half + (j * B - car.z) * scale;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(size, sy);
      ctx.stroke();
    }

    // 车流
    ctx.fillStyle = 'rgba(255,120,120,0.85)';
    for (var t = 0; t < game.traffic.cars.length; t++) {
      var c = game.traffic.cars[t];
      ctx.fillRect(half + (c.x - car.x) * scale - 1.5, half + (c.z - car.z) * scale - 1.5, 3, 3);
    }

    // 下一个光门
    if (game.gate) {
      var gx = RU.clamp(half + (game.gate.x - car.x) * scale, 6, size - 6);
      var gy = RU.clamp(half + (game.gate.z - car.z) * scale, 6, size - 6);
      ctx.fillStyle = '#39ff88';
      ctx.beginPath();
      ctx.arc(gx, gy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(57,255,136,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gx, gy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 玩家
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(car.yaw + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---------------- 主循环 ----------------
  function applyInput() {
    var car = game.car;
    car.throttle = input.throttle ? 1 : 0;
    car.brake = input.brake ? 1 : 0;
    car.steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    car.handbrake = !!input.handbrake;
    car.wantBoost = !!input.boost;
  }

  function drainEvents() {
    while (game.events.length) {
      var ev = game.events.shift();
      if (ev.type === 'gate') {
        RaceAudio.gate();
        toast('光门 +' + ev.value + (game.mode === 'time' ? ' / +' + RaceGame.GATE_TIME + ' 秒' : ''), 1100);
      } else if (ev.type === 'drift') {
        RaceAudio.drift();
      } else if (ev.type === 'crash') {
        RaceAudio.crash(ev.value);
      } else if (ev.type === 'record') {
        toast('新纪录！', 1600);
      } else if (ev.type === 'over') {
        RaceAudio.over();
        gameOver();
      }
    }
  }

  function frame(now) {
    global.requestAnimationFrame(frame);
    if (!lastTime) lastTime = now;
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (dt <= 0) return;

    var wasBoosting = game.car.boosting;
    if (game.state === 'playing') {
      applyInput();
      game.update(dt);
      if (game.car.boosting && !wasBoosting) RaceAudio.boost();
    }
    drainEvents();

    RaceAudio.update(game.car, dt);
    renderer.updateCar(game.car, dt);
    renderer.syncTraffic(game.traffic.cars, dt);
    renderer.updateGate(game.gate, now / 1000);
    renderer.syncParticles(game.particles);
    renderer.syncMarks(game.marks);
    renderer.updateCamera(game.car, dt, game.shake);
    renderer.render();

    updateHud(dt);
    drawMinimap();
  }

  function boot() {
    cacheElements();

    try {
      renderer = new RaceRenderer(el['game']);
    } catch (err) {
      el['boot-screen'].classList.add('boot--hidden');
      el['error-msg'].textContent = String(err && err.message ? err.message : err);
      showOverlay('overlay-error');
      return;
    }

    initGauge();
    bindKeys();
    bindTouch();
    bindButtons();
    resize();
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', resize);

    el['boot-screen'].classList.add('boot--hidden');
    el['hud-best'].textContent = game.best;
    running = true;
    global.requestAnimationFrame(frame);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.NightCity = {
    game: game,
    isRunning: function () { return running; }
  };
})(window);
