/**
 * 启动、界面流程与输入。
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var Utils = global.Utils;
  var Garage = global.Garage;
  var RaceEvents = global.RaceEvents;
  var Tracks = global.Tracks;
  var Sfx = global.Sfx;

  var scene = null;
  var game = null;
  var hud1 = null;
  var hud2 = null;
  var screenMode = 'menu'; // menu | garage | racing
  var lastConfig = null;
  var keys = {};
  var touch = { left: false, right: false, gas: false, brake: false, nos: false };
  var toastTimer = 0;
  var selectedGarageCar = null;

  var el = {
    boot: doc.getElementById('boot'),
    bootMsg: doc.getElementById('boot-msg'),
    bootErr: doc.getElementById('boot-err'),
    canvas: doc.getElementById('view'),
    hud1: doc.getElementById('hud-p1'),
    hud2: doc.getElementById('hud-p2'),
    countdown: doc.getElementById('countdown'),
    toast: doc.getElementById('toast'),
    wrongway: doc.getElementById('wrongway'),
    raceBar: doc.getElementById('race-bar'),
    eventList: doc.getElementById('event-list'),
    challengeList: doc.getElementById('challenge-list'),
    resultBox: doc.getElementById('result-box'),
    menuMoney: doc.getElementById('menu-money'),
    garageCars: doc.getElementById('garage-cars'),
    garageName: doc.getElementById('garage-name'),
    garageStats: doc.getElementById('garage-stats'),
    garageTune: doc.getElementById('garage-tune'),
    garagePaints: doc.getElementById('garage-paints'),
    garageRims: doc.getElementById('garage-rims'),
    garageAction: doc.getElementById('garage-action'),
    touch: doc.getElementById('touch')
  };

  var screens = {
    menu: doc.getElementById('screen-menu'),
    events: doc.getElementById('screen-events'),
    challenges: doc.getElementById('screen-challenges'),
    garage: doc.getElementById('screen-garage'),
    results: doc.getElementById('screen-results'),
    pause: doc.getElementById('screen-pause'),
    help: doc.getElementById('screen-help')
  };

  // ---------- 界面切换 ----------

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('hidden', key !== name);
    });
    var racing = name === null;
    el.raceBar.classList.toggle('hidden', !racing);
    el.hud1.classList.toggle('hidden', !racing);
    var split = racing && lastConfig && lastConfig.players > 1;
    el.hud2.classList.toggle('hidden', !split);
    doc.body.classList.toggle('split', !!split);
    if (racing && isTouchDevice()) el.touch.classList.remove('hidden');
    else el.touch.classList.add('hidden');
  }

  function isTouchDevice() {
    return ('ontouchstart' in global) || (global.navigator && global.navigator.maxTouchPoints > 0);
  }

  function refreshMoney() {
    var text = Utils.formatMoney(Garage.money());
    el.menuMoney.textContent = text;
    Array.prototype.forEach.call(doc.querySelectorAll('[data-money]'), function (node) {
      node.textContent = text;
    });
  }

  function toMenu() {
    if (game && game.state !== 'idle') {
      if (lastConfig && (lastConfig.mode === 'free')) {
        var cash = game.cashOut();
        if (cash.money > 0) toast('自由驾驶收入 ' + Utils.formatMoney(cash.money), 'stunt');
      }
      game.stop();
    }
    screenMode = 'menu';
    scene.buildShowroom();
    scene.showCar(Garage.spec(Garage.state.selected));
    refreshMoney();
    showScreen('menu');
  }

  function toast(text, kind) {
    el.toast.textContent = text;
    el.toast.className = 'show ' + (kind || '');
    toastTimer = 2.2;
  }

  // ---------- 赛事 / 挑战列表 ----------

  function renderEvents(kind) {
    var list = el.eventList;
    list.innerHTML = '';
    doc.querySelector('#screen-events .panel__title').textContent =
      kind === 'versus' ? '双人分屏 · 选择赛道' : '赛事 · 16 场';

    if (kind === 'versus') {
      Tracks.defs.forEach(function (def) {
        var track = Tracks.get(def.id);
        var card = doc.createElement('button');
        card.className = 'card';
        card.innerHTML = '<div class="card__name">' + def.name + '</div>' +
          '<div class="card__meta">' + def.desc + '<br>长度 ' + Math.round(track.length) + ' 米 · 3 圈 · 2 名玩家 + 3 电脑</div>';
        card.addEventListener('click', function () {
          startSession({ mode: 'race', trackId: def.id, laps: 3, rivals: 3, difficulty: 0.5, players: 2 });
        });
        list.appendChild(card);
      });
      return;
    }

    RaceEvents.races.forEach(function (race, index) {
      var unlocked = RaceEvents.unlocked(index, Garage.state.events);
      var done = Garage.state.events[race.id];
      var track = Tracks.get(race.track);
      var card = doc.createElement('button');
      card.className = 'card';
      card.disabled = !unlocked;
      card.innerHTML =
        '<div class="card__name">' + (index + 1) + '. ' + race.name + (unlocked ? '' : ' 🔒') + '</div>' +
        '<div class="card__meta">' + track.name + ' · ' + race.laps + ' 圈 · ' + race.rivals + ' 名对手<br>' +
        '冠军奖金 <span class="card__prize">' + Utils.formatMoney(race.prize[0]) + '</span></div>' +
        (done ? '<div class="card__done">✔ 已完成（' + Utils.ordinal(done) + '）</div>' : '');
      card.addEventListener('click', function () {
        if (!unlocked) return;
        startSession({
          mode: 'race', trackId: race.track, laps: race.laps, rivals: race.rivals,
          difficulty: race.difficulty, players: 1, event: race.id
        });
      });
      list.appendChild(card);
    });
  }

  function renderChallenges() {
    var list = el.challengeList;
    list.innerHTML = '';
    RaceEvents.challenges.forEach(function (ch) {
      var done = Garage.state.events[ch.id];
      var targetText = ch.kind === 'timetrial'
        ? '目标 ' + Utils.formatTime(ch.target)
        : '目标 ' + ch.target + ' 分 / ' + ch.duration + ' 秒';
      var card = doc.createElement('button');
      card.className = 'card';
      card.innerHTML =
        '<div class="card__name">' + ch.name + '</div>' +
        '<div class="card__meta">' + ch.desc + '<br>' + targetText +
        '<br>奖励 <span class="card__prize">' + Utils.formatMoney(ch.reward) + '</span></div>' +
        (done ? '<div class="card__done">✔ 已达成，可重复挑战</div>' : '');
      card.addEventListener('click', function () {
        var config = { mode: ch.kind, trackId: ch.track, challenge: ch.id, players: 1, rivals: 0 };
        if (ch.kind === 'timetrial') config.laps = 1;
        if (ch.duration) config.duration = ch.duration;
        startSession(config);
      });
      list.appendChild(card);
    });
  }

  // ---------- 车库 ----------

  function openGarage() {
    screenMode = 'garage';
    selectedGarageCar = selectedGarageCar || Garage.state.selected;
    scene.buildShowroom();
    renderGarage();
    showScreen('garage');
  }

  function renderGarage() {
    var carId = selectedGarageCar;
    var car = Garage.car(carId);
    var owned = Garage.owns(carId);
    var tune = Garage.tuning(carId);

    el.garageCars.innerHTML = '';
    Garage.CARS.forEach(function (c) {
      var btn = doc.createElement('button');
      var isOwned = Garage.owns(c.id);
      btn.className = 'carbtn' + (c.id === carId ? ' carbtn--active' : '') + (isOwned ? '' : ' carbtn--locked');
      var color = '#' + Garage.paintColor(c, Garage.tuning(c.id)).toString(16).padStart(6, '0');
      btn.innerHTML =
        '<span class="carbtn__chip" style="background:' + color + ';color:' + color + '"></span>' +
        '<span><span class="carbtn__name">' + c.name + '</span><br>' +
        '<span class="carbtn__price">' + (isOwned ? (Garage.state.selected === c.id ? '使用中' : '已拥有') : Utils.formatMoney(c.price)) + '</span></span>';
      btn.addEventListener('click', function () {
        selectedGarageCar = c.id;
        renderGarage();
      });
      el.garageCars.appendChild(btn);
    });

    el.garageName.textContent = car.name;
    scene.showCar(Garage.spec(carId, tune));

    var stats = Garage.displayStats(carId, tune);
    var labels = { speed: '极速', accel: '加速', brake: '刹车', grip: '抓地', nos: '氮气' };
    el.garageStats.innerHTML = Object.keys(labels).map(function (key) {
      return '<div class="stat"><div class="stat__label"><span>' + labels[key] + '</span><span>' + stats[key] + '</span></div>' +
        '<div class="stat__bar"><div class="stat__fill" style="width:' + stats[key] + '%"></div></div></div>';
    }).join('');

    el.garageTune.innerHTML = '';
    Garage.UPGRADES.forEach(function (up) {
      var level = tune[up.id] || 0;
      var cost = Garage.upgradeCost(carId, level);
      var maxed = level >= Garage.MAX_LEVEL;
      var row = doc.createElement('div');
      row.className = 'tune__row';
      var pips = '';
      for (var i = 0; i < Garage.MAX_LEVEL; i++) pips += '<span class="pip' + (i < level ? ' pip--on' : '') + '"></span>';
      row.innerHTML =
        '<div><div class="tune__name">' + up.name + '</div><div class="tune__desc">' + up.desc + '</div>' +
        '<div class="pips">' + pips + '</div></div>';
      var btn = doc.createElement('button');
      btn.className = 'btn btn--small';
      btn.textContent = maxed ? '满级' : Utils.formatMoney(cost);
      btn.disabled = !owned || maxed || Garage.money() < cost;
      btn.addEventListener('click', function () {
        var res = Garage.upgrade(carId, up.id);
        if (res.ok) {
          Sfx.cash();
          toast(up.name + ' 升到 ' + res.level + ' 级', 'stunt');
        } else {
          toast(res.reason, 'drift');
        }
        refreshMoney();
        renderGarage();
      });
      row.appendChild(btn);
      el.garageTune.appendChild(row);
    });

    el.garagePaints.innerHTML = '';
    Garage.PAINTS.forEach(function (paint, index) {
      var sw = doc.createElement('button');
      var hex = '#' + paint.color.toString(16).padStart(6, '0');
      sw.className = 'swatch' + ((tune.paint || 0) === index ? ' swatch--active' : '');
      sw.style.background = hex;
      sw.style.color = hex;
      sw.title = paint.name;
      sw.disabled = !owned;
      sw.addEventListener('click', function () {
        Garage.setPaint(carId, index);
        renderGarage();
      });
      el.garagePaints.appendChild(sw);
    });

    el.garageRims.innerHTML = '';
    Garage.RIMS.forEach(function (rim, index) {
      var sw = doc.createElement('button');
      var hex = '#' + rim.color.toString(16).padStart(6, '0');
      sw.className = 'swatch' + ((tune.rims || 0) === index ? ' swatch--active' : '');
      sw.style.background = hex;
      sw.style.color = hex;
      sw.title = rim.name + (rim.price ? ' ' + Utils.formatMoney(rim.price) : '');
      sw.disabled = !owned;
      sw.addEventListener('click', function () {
        var res = Garage.buyRims(carId, index);
        if (!res.ok) toast(res.reason, 'drift');
        refreshMoney();
        renderGarage();
      });
      el.garageRims.appendChild(sw);
    });

    if (!owned) {
      el.garageAction.textContent = '购买 ' + Utils.formatMoney(car.price);
      el.garageAction.disabled = Garage.money() < car.price;
      el.garageAction.onclick = function () {
        var res = Garage.buyCar(carId);
        if (res.ok) {
          Sfx.cash();
          toast('已购入 ' + car.name, 'stunt');
        } else {
          toast(res.reason, 'drift');
        }
        refreshMoney();
        renderGarage();
      };
    } else if (Garage.state.selected === carId) {
      el.garageAction.textContent = '使用中';
      el.garageAction.disabled = true;
      el.garageAction.onclick = null;
    } else {
      el.garageAction.textContent = '选择这台';
      el.garageAction.disabled = false;
      el.garageAction.onclick = function () {
        Garage.select(carId);
        toast('已选择 ' + car.name, 'lap');
        renderGarage();
      };
    }

    refreshMoney();
  }

  // ---------- 开始一局 ----------

  function startSession(config) {
    lastConfig = config;
    screenMode = 'racing';
    showScreen(null);
    el.wrongway.classList.add('hidden');
    Sfx.resume();
    game.start(config);
    resize();
    var track = config.trackId === 'arena' ? null : Tracks.get(config.trackId);
    hud1.setTrack(track);
    hud2.setTrack(track);
    if (config.mode === 'free') toast('自由驾驶：随便撞随便跳，退出时结算金币', 'stunt');
  }

  // ---------- 结果 ----------

  function showResults(result) {
    var html = '';
    if (result.mode === 'race') {
      var win = result.position === 1;
      html += '<h2 class="result__title ' + (win ? 'result__title--win' : 'result__title--lose') + '">' +
        Utils.ordinal(result.position) + '</h2>';
      html += '<div class="result__rows">' +
        row('总用时', Utils.formatTime(result.time)) +
        row('最快单圈', Utils.formatTime(result.bestLap)) +
        row('名次奖金', Utils.formatMoney(result.prize)) +
        row('漂移奖励', Utils.formatMoney(result.driftBonus)) +
        row('特技奖励', Utils.formatMoney(result.stuntBonus)) +
        '</div>';
      html += '<div class="result__money">+' + Utils.formatMoney(result.money) + '</div>';
      html += '<div class="standings">' + result.standings.map(function (s) {
        return '<div class="standings__row' + (s.isPlayer ? ' standings__row--me' : '') + '">' +
          '<span>' + s.position + '. ' + s.name + '</span>' +
          '<span>' + (s.time ? Utils.formatTime(s.time) : '') + '</span></div>';
      }).join('') + '</div>';
    } else if (result.mode === 'timetrial') {
      html += '<h2 class="result__title ' + (result.success ? 'result__title--win' : 'result__title--lose') + '">' +
        (result.success ? '挑战成功' : '差一点') + '</h2>';
      html += '<div class="result__rows">' +
        row('你的时间', Utils.formatTime(result.time)) +
        row('目标时间', Utils.formatTime(result.target)) +
        '</div>';
      html += '<div class="result__money">+' + Utils.formatMoney(result.money) + '</div>';
    } else {
      html += '<h2 class="result__title ' + (result.success ? 'result__title--win' : 'result__title--lose') + '">' +
        (result.success ? '挑战成功' : '时间到') + '</h2>';
      html += '<div class="result__rows">' +
        row('得分', String(result.score)) +
        row('目标', String(result.target)) +
        '</div>';
      html += '<div class="result__money">+' + Utils.formatMoney(result.money) + '</div>';
    }

    html += '<div class="result__actions">' +
      '<button class="btn btn--small btn--primary" data-result="retry">再来一次</button>' +
      '<button class="btn btn--small" data-result="garage">去车库</button>' +
      '<button class="btn btn--small btn--ghost" data-result="menu">主菜单</button>' +
      '</div>';

    el.resultBox.innerHTML = html;
    showScreen('results');
    refreshMoney();
  }

  function row(label, value) {
    return '<div class="result__row"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  // ---------- 输入 ----------

  function readInputs() {
    if (!game || !lastConfig) return;
    var split = lastConfig.players > 1;

    var p0 = game.playerInput(0);
    if (p0) {
      if (split) {
        setInput(p0, keys.ArrowUp, keys.ArrowDown, keys.ArrowLeft, keys.ArrowRight, keys.KeyM, keys.Slash || keys.ShiftRight);
        game.lookBack0 = !!keys.KeyL;
      } else {
        setInput(p0,
          keys.ArrowUp || keys.KeyW || touch.gas,
          keys.ArrowDown || keys.KeyS || touch.brake,
          keys.ArrowLeft || keys.KeyA || touch.left,
          keys.ArrowRight || keys.KeyD || touch.right,
          keys.ShiftLeft || keys.ShiftRight || touch.nos,
          keys.Space);
        game.lookBack0 = !!keys.KeyT;
      }
    }

    var p1 = game.playerInput(1);
    if (p1 && split) {
      setInput(p1, keys.KeyW, keys.KeyS, keys.KeyA, keys.KeyD, keys.ShiftLeft, keys.KeyG);
      game.lookBack1 = !!keys.KeyT;
    }
  }

  function setInput(input, up, down, left, right, nos, handbrake) {
    input.throttle = up ? 1 : 0;
    input.brake = down ? 1 : 0;
    input.steer = (right ? 1 : 0) - (left ? 1 : 0);
    input.nos = !!nos;
    input.handbrake = !!handbrake;
  }

  function bindKeys() {
    doc.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var code = event.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(code) >= 0) event.preventDefault();
      keys[code] = true;
      if (event.repeat) return;

      var split = lastConfig && lastConfig.players > 1;
      if (screenMode === 'racing') {
        if (code === 'KeyP' || code === 'Escape') togglePause();
        else if (code === 'KeyN') toggleSound();
        else if (!split && code === 'KeyC') toast('视角：' + scene.cycleCamera(0), 'lap');
        else if (!split && code === 'KeyR') game.respawn(0);
        else if (split && code === 'KeyK') toast('P1 视角：' + scene.cycleCamera(0), 'lap');
        else if (split && code === 'KeyO') game.respawn(0);
        else if (split && code === 'KeyC') toast('P2 视角：' + scene.cycleCamera(1), 'lap');
        else if (split && code === 'KeyR') game.respawn(1);
      } else if (code === 'Escape') {
        if (!screens.menu.classList.contains('hidden')) return;
        toMenu();
      }
    });

    doc.addEventListener('keyup', function (event) {
      keys[event.code] = false;
    });

    global.addEventListener('blur', function () { keys = {}; });
  }

  function bindTouch() {
    Array.prototype.forEach.call(el.touch.querySelectorAll('[data-touch]'), function (btn) {
      var action = btn.getAttribute('data-touch');
      var on = function (event) { event.preventDefault(); touch[action] = true; };
      var off = function () { touch[action] = false; };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    });
  }

  function togglePause() {
    if (!game || game.state === 'idle' || game.state === 'finished') return;
    if (game.state === 'paused') {
      game.pause(false);
      showScreen(null);
    } else {
      game.pause(true);
      showScreen('pause');
    }
  }

  function toggleSound() {
    var muted = Sfx.toggle();
    doc.getElementById('btn-sound').textContent = muted ? '音效 关' : '音效 开';
  }

  function bindUi() {
    doc.addEventListener('click', function (event) {
      var target = event.target.closest('[data-go]');
      if (target) {
        var go = target.getAttribute('data-go');
        Sfx.resume();
        if (go === 'menu') toMenu();
        else if (go === 'events') { renderEvents('race'); showScreen('events'); }
        else if (go === 'versus') { renderEvents('versus'); showScreen('events'); }
        else if (go === 'challenges') { renderChallenges(); showScreen('challenges'); }
        else if (go === 'garage') openGarage();
        else if (go === 'help') showScreen('help');
        else if (go === 'free') startSession({ mode: 'free', trackId: 'arena', players: 1, rivals: 0 });
        return;
      }

      var res = event.target.closest('[data-result]');
      if (res) {
        var action = res.getAttribute('data-result');
        if (action === 'retry') startSession(lastConfig);
        else if (action === 'garage') { if (game) game.stop(); openGarage(); }
        else toMenu();
      }
    });

    doc.getElementById('btn-pause').addEventListener('click', togglePause);
    doc.getElementById('btn-sound').addEventListener('click', toggleSound);
    doc.getElementById('btn-camera').addEventListener('click', function () {
      toast('视角：' + scene.cycleCamera(0), 'lap');
    });
    doc.getElementById('btn-resume').addEventListener('click', togglePause);
    doc.getElementById('btn-restart').addEventListener('click', function () { startSession(lastConfig); });
    doc.getElementById('btn-quit').addEventListener('click', toMenu);
  }

  // ---------- 循环 ----------

  function resize() {
    var w = global.innerWidth;
    var h = global.innerHeight;
    scene.resize(w, h, !!(lastConfig && lastConfig.players > 1 && screenMode === 'racing'));
  }

  var last = 0;
  function loop(now) {
    global.requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) el.toast.className = '';
    }

    if (screenMode === 'racing' && game.state !== 'idle') {
      readInputs();
      game.update(dt);
    } else {
      scene.updateShowroom(dt);
    }

    scene.render(screenMode === 'racing' && lastConfig && lastConfig.players > 1);
  }

  // ---------- 启动 ----------

  function boot() {
    Garage.load();

    try {
      scene = new global.Scene3D(el.canvas);
    } catch (err) {
      el.bootMsg.textContent = '启动失败';
      el.bootErr.classList.remove('hidden');
      el.bootErr.innerHTML = (err && err.message ? err.message : 'WebGL 不可用') +
        '<br><br>请用 <b>Chrome 浏览器</b> 打开，并确认没有关闭硬件加速。';
      return;
    }

    hud1 = new global.Hud(el.hud1);
    hud2 = new global.Hud(el.hud2, { compact: true });

    game = new global.RaceGame(scene, {
      onCountdown: function (step) {
        if (step > 0) {
          el.countdown.textContent = String(step);
          el.countdown.classList.add('show');
        } else if (step === 0) {
          el.countdown.textContent = 'GO!';
          el.countdown.classList.add('show');
          global.setTimeout(function () { el.countdown.classList.remove('show'); }, 700);
        }
      },
      onMessage: function (msg) { toast(msg.text, msg.kind); },
      onHud: function (g) {
        var d1 = g.hudData(0);
        if (d1) {
          hud1.update(d1);
          el.wrongway.classList.toggle('hidden', !d1.wrongWay);
        }
        if (lastConfig && lastConfig.players > 1) {
          var d2 = g.hudData(1);
          if (d2) hud2.update(d2);
        }
      },
      onFinish: function (result) { showResults(result); }
    });

    bindKeys();
    bindTouch();
    bindUi();
    global.addEventListener('resize', resize);

    // 供调试/自动化测试使用（也方便玩家在控制台里查看状态）
    global.NightCityRacing = {
      game: game, scene: scene, garage: Garage,
      start: startSession, toMenu: toMenu
    };

    el.boot.classList.add('hidden');
    toMenu();
    resize();
    global.requestAnimationFrame(loop);
  }

  boot();
})(window);
