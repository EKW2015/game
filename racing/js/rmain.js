/**
 * 夜城飙车 - 输入、菜单、车库、HUD 与主循环
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;
  var Cars = global.Cars;
  var RaceGame = global.RaceGame;
  var RaceRenderer = global.RaceRenderer;
  var RaceAudio = global.RaceAudio;
  var Ramps = global.Ramps;

  var doc = global.document;
  var garage = new Cars.Garage();
  var game = new RaceGame(garage);
  var renderer = null;
  var input = {
    throttle: false, brake: false, left: false, right: false,
    handbrake: false, boost: false
  };

  var PAINTS = [
    { name: '烈焰红', color: 0xe01b4c, accent: 0x2ee6ff },
    { name: '霓虹青', color: 0x14c8d8, accent: 0xff2e78 },
    { name: '暗夜紫', color: 0x7a3cff, accent: 0x39ff88 },
    { name: '荧光绿', color: 0x39e05a, accent: 0xffd84d },
    { name: '流光橙', color: 0xff7a1a, accent: 0x2ee6ff },
    { name: '珠光白', color: 0xe8ecf5, accent: 0x8a5cff }
  ];

  var el = {};
  var gaugeLength = 0;
  var driftTimer = 0;
  var toastTimer = 0;
  var countdownTimer = 0;
  var lastTime = 0;
  var running = false;
  var crashed = false;
  var autoDrive = null;
  var stuckTime = 0;
  var hintCooldown = 0;
  var raceLevel = 0;

  function $(id) { return doc.getElementById(id); }

  function cacheElements() {
    ['boot-screen', 'boot-msg', 'game', 'stage', 'hud-time', 'hud-score', 'hud-place', 'hud-lap',
      'hud-cash', 'hud-best', 'hud-speed', 'gauge-fill', 'nitro-fill', 'gate-arrow', 'gate-dist',
      'drift-banner', 'drift-label', 'drift-score', 'combo-badge', 'toast', 'minimap', 'countdown',
      'row-time', 'row-place', 'row-lap', 'label-time', 'label-lap', 'paint-swatches', 'menu-cash', 'race-laps',
      'garage-cash', 'garage-cars', 'garage-upgrades', 'garage-current',
      'overlay-ready', 'overlay-garage', 'overlay-over', 'overlay-paused', 'overlay-error',
      'error-msg', 'result-stats', 'over-title', 'btn-sound', 'btn-cam', 'btn-pause']
      .forEach(function (id) {
        el[id] = $(id);
      });
    el.map = el['minimap'].getContext('2d');
  }

  var OVERLAYS = ['overlay-ready', 'overlay-garage', 'overlay-over', 'overlay-paused', 'overlay-error'];

  function showOverlay(name) {
    OVERLAYS.forEach(function (id) {
      el[id].classList.toggle('overlay--hidden', id !== name);
    });
  }

  function hex(value) {
    return '#' + ('000000' + value.toString(16)).slice(-6);
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

  // ---------------- 车漆 ----------------
  function applyPaint(index, remember) {
    var i = ((index % PAINTS.length) + PAINTS.length) % PAINTS.length;
    garage.paint = i;
    var paint = PAINTS[i];
    if (renderer) renderer.setCarPaint(paint.color, paint.accent);
    var swatches = el['paint-swatches'].children;
    for (var s = 0; s < swatches.length; s++) {
      swatches[s].classList.toggle('swatch--on', s === i);
    }
    if (remember) garage.save();
  }

  function buildPaintPicker() {
    PAINTS.forEach(function (paint, i) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.title = paint.name;
      btn.style.background = hex(paint.color);
      btn.style.color = hex(paint.accent);
      btn.addEventListener('click', function () {
        applyPaint(i, true);
      });
      el['paint-swatches'].appendChild(btn);
    });
    applyPaint(garage.paint, false);
  }

  // ---------------- 车库 ----------------
  function bar(label, value, max) {
    var filled = Math.round(RU.clamp(value / max, 0, 1) * 5);
    var pips = '';
    for (var i = 0; i < 5; i++) {
      pips += '<i class="pip' + (i < filled ? ' pip--on' : '') + '"></i>';
    }
    return '<span class="stat">' + label + '<span class="pips">' + pips + '</span></span>';
  }

  function renderGarage() {
    el['garage-cash'].textContent = garage.cash;
    el['menu-cash'].textContent = garage.cash;
    el['hud-cash'].textContent = garage.cash;

    var carsHtml = '';
    Cars.list.forEach(function (car) {
      var owned = garage.has(car.id);
      var picked = garage.selected === car.id;
      var stats = garage.statsFor(car.id);
      carsHtml += '<button class="card' + (picked ? ' card--on' : '') + (owned ? '' : ' card--locked') +
        '" type="button" data-car="' + car.id + '">' +
        '<b>' + car.name + (picked ? ' ✓' : '') + '</b>' +
        '<i>' + car.desc + '</i>' +
        bar('加速', stats.accel, 26) +
        bar('极速', stats.maxSpeed, 82) +
        bar('抓地', stats.grip, 20) +
        '<em>' + (owned ? (picked ? '使用中' : '点击选用') : '🔒 ' + car.price + ' 金币') + '</em>' +
        '</button>';
    });
    el['garage-cars'].innerHTML = carsHtml;

    var current = Cars.find(garage.selected);
    el['garage-current'].textContent = current.name;
    var upHtml = '';
    Cars.upgrades.forEach(function (up) {
      var level = garage.level(garage.selected, up.id);
      var full = level >= up.max;
      var price = Cars.upgradePrice(up, level);
      upHtml += '<button class="card" type="button" data-upgrade="' + up.id + '">' +
        '<b>' + up.name + '</b>' +
        '<i>' + up.unit + ' Lv.' + level + ' / ' + up.max + '</i>' +
        bar('等级', level, up.max) +
        '<em>' + (full ? '已满级' : price + ' 金币升一级') + '</em>' +
        '</button>';
    });
    el['garage-upgrades'].innerHTML = upHtml;
  }

  function applyGarageToCar() {
    game.car.setStats(garage.stats());
    if (renderer) renderer.setCarShape(garage.stats().shape);
    applyPaint(garage.paint, false);
  }

  function bindGarage() {
    el['garage-cars'].addEventListener('click', function (e) {
      var node = e.target;
      while (node && node !== el['garage-cars'] && !node.getAttribute('data-car')) node = node.parentNode;
      var id = node && node.getAttribute && node.getAttribute('data-car');
      if (!id) return;
      if (garage.has(id)) {
        garage.select(id);
        toast('已选择 ' + Cars.find(id).name, 1000);
      } else if (garage.buy(id)) {
        RaceAudio.gate();
        toast('买到了 ' + Cars.find(id).name + '！', 1400);
      } else {
        toast('金币不够，还差 ' + (Cars.find(id).price - garage.cash), 1600);
        return;
      }
      applyGarageToCar();
      renderGarage();
    });

    el['garage-upgrades'].addEventListener('click', function (e) {
      var node = e.target;
      while (node && node !== el['garage-upgrades'] && !node.getAttribute('data-upgrade')) node = node.parentNode;
      var id = node && node.getAttribute && node.getAttribute('data-upgrade');
      if (!id) return;
      if (garage.upgrade(garage.selected, id)) {
        RaceAudio.gate();
        toast('升级成功', 900);
        applyGarageToCar();
      } else {
        toast('金币不够或已满级', 1400);
      }
      renderGarage();
    });
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
      else if (e.code === 'KeyT') {
        if (renderer) renderer.setLookBack(true);
      } else if (e.code === 'KeyR') {
        game.car.respawnOnRoad();
        toast('回到路面', 700);
      } else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      else if (e.code === 'KeyM') toggleSound();
    });

    doc.addEventListener('keyup', function (e) {
      var action = KEYS[e.code];
      if (action) {
        input[action] = false;
        e.preventDefault();
      } else if (e.code === 'KeyT' && renderer) {
        renderer.setLookBack(false);
      }
    });

    global.addEventListener('blur', function () {
      for (var k in input) input[k] = false;
      if (renderer) renderer.setLookBack(false);
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
      var node = e.target;
      while (node && !node.getAttribute) node = node.parentNode;
      var action = node && node.getAttribute('data-action');
      if (!action && node && node.parentNode && node.parentNode.getAttribute) {
        action = node.parentNode.getAttribute('data-action');
      }
      if (!action) return;
      if (action === 'start-race') startGame('race');
      else if (action === 'start-sprint') startGame('sprint');
      else if (action === 'start-time') startGame('time');
      else if (action === 'start-free') startGame('free');
      else if (action === 'restart') startGame(game.mode);
      else if (action === 'resume') togglePause();
      else if (action === 'menu') openMenu();
      else if (action === 'garage') {
        renderGarage();
        showOverlay('overlay-garage');
      } else if (action === 'close-garage') openMenu();
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
    toast(renderer.cycleCamMode(), 800);
  }

  function togglePause() {
    if (game.state === 'playing' || game.state === 'countdown') {
      game.pausedFrom = game.state;
      game.state = 'paused';
      showOverlay('overlay-paused');
    } else if (game.state === 'paused') {
      game.state = game.pausedFrom || 'playing';
      showOverlay(null);
    }
  }

  function openMenu() {
    game.state = 'ready';
    el['menu-cash'].textContent = garage.cash;
    el['race-laps'].textContent = 2;
    showOverlay('overlay-ready');
  }

  function startGame(mode) {
    RaceAudio.start();
    applyGarageToCar();
    game.start(mode, (mode === 'race' || mode === 'sprint') ? raceLevel : 0);
    showOverlay(null);

    el['row-time'].style.display = (mode === 'time' || mode === 'sprint') ? '' : 'none';
    el['row-place'].style.display = mode === 'race' ? '' : 'none';
    el['row-lap'].style.display = (mode === 'race' || mode === 'sprint') ? '' : 'none';
    el['label-time'].textContent = mode === 'sprint' ? '用时' : '时间';
    el['label-lap'].textContent = mode === 'sprint' ? '门点' : '圈数';

    if (mode === 'race') toast('准备起跑！', 900);
    else if (mode === 'sprint') toast('极速冲刺：一路冲到底！', 1600);
    else if (mode === 'free') toast('自由驾驶：冲跳台、捡金币', 1800);
    else toast('冲向青色光门！', 1500);
  }

  function gameOver() {
    var kmh = Math.round(RU.kmh(game.car.topSpeed));
    var html = '';
    if (game.mode === 'race') {
      var names = ['🥇 第一名', '🥈 第二名', '🥉 第三名', '第四名', '第五名'];
      el['over-title'].textContent = game.place <= 3 ? '冲线！' : '完赛';
      html = '<b>' + names[Math.min(4, game.place - 1)] + '</b><br>' +
        '用时 <b>' + game.elapsed.toFixed(1) + '</b> 秒<br>' +
        '奖金 <b>' + game.cashEarned + '</b> 金币<br>' +
        '最高速度 <b>' + kmh + '</b> km/h';
      if (game.place <= 3) raceLevel++;
    } else if (game.mode === 'sprint') {
      var medals = { gold: '🥇 金牌', silver: '🥈 银牌', bronze: '🥉 铜牌' };
      var medal = game.sprintMedal;
      el['over-title'].textContent = medal ? '冲刺完成！' : '时间到';
      html = medal
        ? '<b>' + medals[medal] + '</b><br>'
        : '<b>未拿到奖牌</b><br>';
      html += '用时 <b>' + game.elapsed.toFixed(1) + '</b> 秒' +
        '（金牌 ≤ <b>' + game.sprintPar + '</b> 秒）<br>' +
        '门点 <b>' + game.gates + '/' + (game.route ? game.route.points.length : 0) + '</b><br>' +
        '奖金 <b>' + game.cashEarned + '</b> 金币<br>' +
        '得分 <b>' + game.score + '</b><br>' +
        '最高速度 <b>' + kmh + '</b> km/h';
      if (medal === 'gold' || medal === 'silver') raceLevel++;
    } else {
      el['over-title'].textContent = '时间到';
      html = '本局得分 <b>' + game.score + '</b><br>' +
        '通过光门 <b>' + game.gates + '</b> 个<br>' +
        '赚到 <b>' + game.cashEarned + '</b> 金币<br>' +
        '最高速度 <b>' + kmh + '</b> km/h<br>' +
        '历史最高 <b>' + game.best + '</b>';
    }
    el['result-stats'].innerHTML = html;
    renderGarage();
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

    var t = RU.clamp(speed / 280, 0, 1);
    el['gauge-fill'].style.strokeDashoffset = gaugeLength * (1 - t);
    el['gauge-fill'].style.stroke = car.boosting ? '#ff2e78' : (speed > 200 ? '#ffd84d' : '#2ee6ff');
    el['nitro-fill'].style.width = Math.round(car.nitro * 100) + '%';

    el['hud-time'].textContent = game.mode === 'time' ? game.timeLeft.toFixed(1) : game.elapsed.toFixed(1);
    el['hud-time'].classList.toggle('warn',
      (game.mode === 'time' && game.timeLeft < 8) ||
      (game.mode === 'sprint' && game.sprintFailAt > 0 && game.elapsed > game.sprintFailAt - 8));
    el['hud-score'].textContent = game.score;
    el['hud-cash'].textContent = garage.cash;
    el['hud-best'].textContent = game.best;
    if (game.mode === 'race' && game.route) {
      el['hud-place'].textContent = game.place + '/' + (game.rivals.length + 1);
      el['hud-lap'].textContent = Math.min(game.lap, game.route.laps) + '/' + game.route.laps;
    } else if (game.mode === 'sprint' && game.route) {
      el['hud-lap'].textContent = Math.min(game.gates, game.route.points.length) + '/' + game.route.points.length;
    }

    var dist = Math.round(game.gateDistance());
    el['gate-dist'].textContent = dist;
    var bearing = game.gateBearing();
    el['gate-arrow'].style.transform = 'rotate(' + (bearing * 180 / Math.PI - 90) + 'deg)';
    el['gate-arrow'].style.color = Math.abs(bearing) < 0.35 ? '#39ff88' : '#2ee6ff';

    var driftLive = Math.round(game.driftAccum * game.combo);
    if (car.drifting && driftLive > 0) {
      el['drift-label'].textContent = 'DRIFT';
      el['drift-score'].textContent = '+' + driftLive;
      el['drift-banner'].classList.add('drift--on');
      driftTimer = 0.6;
    } else if (car.airborne && car.airTime > 0.3) {
      el['drift-label'].textContent = 'AIR';
      el['drift-score'].textContent = car.airTime.toFixed(1) + 's';
      el['drift-banner'].classList.add('drift--on');
      driftTimer = 0.6;
    } else if (driftTimer > 0) {
      driftTimer -= dt;
      if (driftTimer <= 0) el['drift-banner'].classList.remove('drift--on');
    }

    el['combo-badge'].textContent = 'x' + game.combo;
    el['combo-badge'].classList.toggle('combo--on', game.combo > 1);

    if (game.state === 'countdown') {
      var n = Math.ceil(game.countdown);
      el['countdown'].textContent = n > 0 ? String(n) : 'GO!';
      el['countdown'].classList.add('countdown--on');
      countdownTimer = 0.8;
    } else if (countdownTimer > 0) {
      countdownTimer -= dt;
      el['countdown'].textContent = 'GO!';
      if (countdownTimer <= 0) el['countdown'].classList.remove('countdown--on');
    }

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
    var i;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(6,8,18,0.75)';
    ctx.fillRect(0, 0, size, size);

    var range = Math.ceil(half / (B * scale)) + 1;
    var ci = Math.round(car.x / B);
    var cj = Math.round(car.z / B);
    ctx.strokeStyle = 'rgba(46,230,255,0.28)';
    ctx.lineWidth = 3;
    for (i = ci - range; i <= ci + range; i++) {
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

    // 赛道环线
    if (game.route) {
      ctx.strokeStyle = 'rgba(255,216,77,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i <= game.route.points.length; i++) {
        var p = game.route.points[i % game.route.points.length];
        var px = half + (p.x - car.x) * scale;
        var py = half + (p.z - car.z) * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 金币
    ctx.fillStyle = '#ffd84d';
    for (i = 0; i < game.coins.length; i++) {
      ctx.fillRect(half + (game.coins[i].x - car.x) * scale - 1.5,
        half + (game.coins[i].z - car.z) * scale - 1.5, 3, 3);
    }

    // 对手
    for (i = 0; i < game.rivals.length; i++) {
      var r = game.rivals[i];
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(half + (r.car.x - car.x) * scale, half + (r.car.z - car.z) * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 车流
    ctx.fillStyle = 'rgba(255,120,120,0.7)';
    for (i = 0; i < game.traffic.cars.length; i++) {
      var c = game.traffic.cars[i];
      ctx.fillRect(half + (c.x - car.x) * scale - 1.5, half + (c.z - car.z) * scale - 1.5, 3, 3);
    }

    // 跳台
    if (Ramps) {
      var ramps = Ramps.near(car.x, car.z, half / scale);
      ctx.fillStyle = 'rgba(120,220,255,0.9)';
      for (i = 0; i < ramps.length; i++) {
        ctx.fillRect(half + (ramps[i].x - car.x) * scale - 2, half + (ramps[i].z - car.z) * scale - 2, 4, 4);
      }
    }

    // 目标点
    if (game.gate) {
      var gx = RU.clamp(half + (game.gate.x - car.x) * scale, 6, size - 6);
      var gy = RU.clamp(half + (game.gate.z - car.z) * scale, 6, size - 6);
      ctx.fillStyle = '#39ff88';
      ctx.beginPath();
      ctx.arc(gx, gy, 4.5, 0, Math.PI * 2);
      ctx.fill();
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
        if (game.mode === 'time') {
          toast('光门 +' + ev.value + ' / +' + RaceGame.GATE_TIME + ' 秒', 1100);
        } else if (game.mode === 'sprint') {
          toast('冲刺门 +' + ev.value, 900);
        } else {
          toast('光门 +' + ev.value, 1100);
        }
      } else if (ev.type === 'coin') {
        RaceAudio.coin();
      } else if (ev.type === 'stunt') {
        RaceAudio.gate();
        toast(ev.text + '  +' + ev.value, 1300);
      } else if (ev.type === 'drift') {
        RaceAudio.drift();
      } else if (ev.type === 'crash') {
        RaceAudio.crash(ev.value);
      } else if (ev.type === 'lap') {
        RaceAudio.gate();
        toast('第 ' + ev.value + ' 圈', 1200);
      } else if (ev.type === 'countdown') {
        if (ev.value > 0) RaceAudio.beep(660);
        else RaceAudio.beep(1180);
      } else if (ev.type === 'record') {
        toast('新纪录！', 1600);
      } else if (ev.type === 'finish') {
        RaceAudio.win();
        gameOver();
      } else if (ev.type === 'over') {
        RaceAudio.over();
        gameOver();
      }
    }
  }

  /** 顶着墙踩油门半天没动？提示玩家有一键回到路面的键 */
  function checkStuck(dt) {
    if (hintCooldown > 0) hintCooldown -= dt;
    if (game.car.speed < 2 && (input.throttle || input.brake)) stuckTime += dt;
    else stuckTime = 0;
    if (stuckTime > 2.5 && hintCooldown <= 0) {
      stuckTime = 0;
      hintCooldown = 10;
      toast('卡住了？按 R 回到路面', 1800);
    }
  }

  function step(now, dt) {
    var wasBoosting = game.car.boosting;
    if (game.state === 'playing' || game.state === 'countdown') {
      applyInput();
      if (autoDrive) autoDrive.update(game, dt);
      if (game.state === 'countdown') {
        game.car.throttle = 0;
        game.car.brake = 1;
      }
      game.update(dt);
      if (game.car.boosting && !wasBoosting) RaceAudio.boost();
      checkStuck(dt);
    }
    drainEvents();

    RaceAudio.update(game.car, dt);
    renderer.updateCar(game.car, dt);
    renderer.syncTraffic(game.traffic.cars, dt);
    renderer.syncRivals(game.rivals, dt);
    renderer.syncCoins(game.coins);
    renderer.updateGate(game.gate, now / 1000);
    renderer.syncParticles(game.particles);
    renderer.syncMarks(game.marks);
    renderer.updateCamera(game.car, dt, game.shake);
    renderer.render();

    updateHud(dt);
    drawMinimap();
  }

  function frame(now) {
    if (crashed) return;
    global.requestAnimationFrame(frame);
    if (!lastTime) lastTime = now;
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (dt <= 0) return;

    try {
      step(now, dt);
    } catch (err) {
      crashed = true;
      fail(err);
    }
  }

  /** 把失败原因显示在屏幕上，不要让玩家对着加载页干等 */
  function fail(err) {
    var reason = String(err && err.message ? err.message : err);
    var webgl = '未知';
    try {
      var probe = doc.createElement('canvas');
      webgl = (probe.getContext('webgl2') || probe.getContext('webgl')) ? '可用' : '不可用';
    } catch (e) {
      webgl = '不可用';
    }
    if (el['boot-screen']) el['boot-screen'].classList.add('boot--hidden');
    if (el['error-msg']) {
      el['error-msg'].innerHTML = '原因：' + reason +
        '<br>WebGL（3D 支持）：' + webgl +
        '<br><br>请改用电脑版 Chrome 打开，并在设置里开启「使用硬件加速」。' +
        '<br>微信、QQ 内置浏览器不支持 3D。' +
        '<br><br><span style="font-size:11px;opacity:.6">' + navigator.userAgent + '</span>';
    }
    showOverlay('overlay-error');
  }

  function boot() {
    cacheElements();

    var watchdog = global.setTimeout(function () {
      if (!running) fail('加载超时（10 秒）');
    }, 10000);

    try {
      renderer = new RaceRenderer(el['game']);
      initGauge();
      buildPaintPicker();
      renderGarage();
      applyGarageToCar();
      bindKeys();
      bindTouch();
      bindButtons();
      bindGarage();
      resize();
      global.addEventListener('resize', resize);
      global.addEventListener('orientationchange', resize);
    } catch (err) {
      global.clearTimeout(watchdog);
      fail(err);
      return;
    }

    global.clearTimeout(watchdog);
    el['boot-screen'].classList.add('boot--hidden');
    running = true;

    // 打开 index.html#demo 就让 AI 自己开，方便看效果
    if (String(global.location.hash || '').indexOf('demo') >= 0) {
      autoDrive = new global.AutoDrive();
      var hash = String(global.location.hash);
      var demoMode = 'free';
      if (hash.indexOf('sprint') >= 0) demoMode = 'sprint';
      else if (hash.indexOf('race') >= 0) demoMode = 'race';
      else if (hash.indexOf('time') >= 0) demoMode = 'time';
      startGame(demoMode);
      toast('演示模式：AI 自动驾驶', 2000);
    }

    global.requestAnimationFrame(frame);
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.NightCity = {
    game: game,
    garage: garage,
    isRunning: function () { return running; }
  };
})(window);
