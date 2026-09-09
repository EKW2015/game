(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');
  var Skills = global.Skills;

  var overlays = {
    ready: doc.getElementById('overlay-ready'),
    over: doc.getElementById('overlay-over'),
    paused: doc.getElementById('overlay-paused'),
    error: doc.getElementById('overlay-error')
  };
  var deathStats = doc.getElementById('death-stats');
  var errorMsg = doc.getElementById('error-msg');
  var soundButton = doc.getElementById('btn-sound');
  var pauseButton = doc.getElementById('btn-pause');
  var touchControls = doc.getElementById('touch-controls');
  var toast = doc.getElementById('toast');
  var skillBar = doc.getElementById('skill-bar');
  var soulRings = doc.getElementById('soul-rings');
  var hudBuffs = doc.getElementById('hud-buffs');
  var hudHp = doc.getElementById('hud-hp');
  var hudSoul = doc.getElementById('hud-soul');
  var barHp = doc.getElementById('bar-hp');
  var barSoul = doc.getElementById('bar-soul');
  var hudKills = doc.getElementById('hud-kills');
  var hudBest = doc.getElementById('hud-best');
  var hudTarget = doc.getElementById('hud-target');
  var bootScreen = doc.getElementById('boot-screen');
  var bootMsg = doc.getElementById('boot-msg');
  var bootEnter = doc.getElementById('boot-enter');

  var game = null;
  var skillButtons = {};

  function hideBoot() {
    if (bootScreen) bootScreen.style.display = 'none';
  }

  function showBootError(msg) {
    if (bootMsg) {
      bootMsg.style.color = '#ff8888';
      bootMsg.innerHTML = msg;
    }
  }

  function showOverlay(name) {
    Object.keys(overlays).forEach(function (key) {
      if (!overlays[key]) return;
      overlays[key].classList.toggle('overlay--hidden', key !== name);
    });
  }

  function formatStats(g) {
    var p = g.player;
    return (p.title || '魂帝') + ' · 击杀 ' + p.kills + ' · 魂力 ' + Math.round(p.soul);
  }

  function buildRings() {
    if (!soulRings) return;
    soulRings.innerHTML = '';
    for (var i = 0; i < 7; i++) {
      var el = doc.createElement('i');
      el.style.background = global.Utils.RING_COLORS[i];
      soulRings.appendChild(el);
    }
  }

  function buildSkills() {
    if (!skillBar || !Skills) return;
    skillBar.innerHTML = '';
    Skills.list.forEach(function (sk) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'sk';
      btn.dataset.skill = sk.id;
      btn.innerHTML = '<span class="sk-key">' + sk.hotkey + '</span><span class="sk-name">' + sk.name + '</span><small>' + (
        sk.group === 'soul' ? '魂技' : sk.group === 'self' ? '自创' : sk.group === 'bone' ? '魂骨' : '领域'
      ) + '</small>';
      btn.title = sk.desc;
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (game) game.tryCast(sk.id);
      });
      skillBar.appendChild(btn);
      skillButtons[sk.id] = btn;
    });
  }

  var BUFF_LABELS = {
    wings: '光翼',
    golden: '金身',
    trueBody: '真身',
    shield: '光盾',
    blessing: '圣龙祝福',
    stun: '眩晕',
    blind: '致盲',
    defDown: '破防',
    burn: '灼烧',
    gravity: '重力',
    sealed: '封穴',
    domainCurse: '领域压制'
  };

  function bindControls() {
    var MOVE_KEYS = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right'
    };

    doc.addEventListener('keydown', function (event) {
      if (!game || event.metaKey || event.ctrlKey || event.altKey) return;
      var code = event.code;

      if (MOVE_KEYS[code]) {
        event.preventDefault();
        if (!event.repeat) game.press(MOVE_KEYS[code]);
        return;
      }
      if (code === 'Space') {
        event.preventDefault();
        if (!event.repeat) game.press('jump');
        return;
      }
      if (code === 'KeyJ' || code === 'KeyK') {
        event.preventDefault();
        if (!event.repeat) game.press('attack');
        return;
      }
      if (Skills.byKey[code]) {
        event.preventDefault();
        if (!event.repeat) game.tryCast(Skills.byKey[code].id);
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        event.preventDefault();
        game.togglePause();
      } else if (code === 'KeyM') {
        toggleSound();
      } else if (code === 'KeyB') {
        event.preventDefault();
        if (game.state === 'over' || game.state === 'playing') game.restart();
      }
    });

    doc.addEventListener('keyup', function (event) {
      if (!game) return;
      if (MOVE_KEYS[event.code]) game.release(MOVE_KEYS[event.code]);
      else if (event.code === 'Space') game.release('jump');
      else if (event.code === 'KeyJ' || event.code === 'KeyK') game.release('attack');
    });

    canvas.addEventListener('click', function () {
      if (canvas.requestPointerLock) canvas.requestPointerLock();
      if (game && game.state === 'ready') game.setState('playing');
    });

    doc.addEventListener('mousemove', function (event) {
      if (!game || doc.pointerLockElement !== canvas) return;
      game.lookYaw += event.movementX * 0.005;
      game.player.angle = game.lookYaw;
    });

    canvas.addEventListener('mousedown', function (event) {
      if (!game) return;
      if (event.button === 0) game.press('attack');
    });
    canvas.addEventListener('mouseup', function (event) {
      if (!game) return;
      if (event.button === 0) game.release('attack');
    });

    Array.prototype.forEach.call(touchControls.querySelectorAll('[data-hold]'), function (button) {
      var action = button.getAttribute('data-hold');
      button.addEventListener('pointerdown', function (event) {
        if (!game) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        game.press(action);
        if (game.state === 'ready') game.setState('playing');
      });
      button.addEventListener('pointerup', function () { if (game) game.release(action); });
      button.addEventListener('pointercancel', function () { if (game) game.release(action); });
    });

    doc.addEventListener('click', function (event) {
      if (!game) return;
      var target = event.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');
      if (action === 'start') game.setState('playing');
      else if (action === 'restart') game.restart();
      else if (action === 'resume') game.togglePause();
    });

    soundButton.addEventListener('click', toggleSound);
    pauseButton.addEventListener('click', function () { if (game) game.togglePause(); });

    var resizeTimer = 0;
    global.addEventListener('resize', function () {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(function () { if (game) game.resize(); }, 80);
    });

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden && game && game.state === 'playing') game.togglePause();
    });
  }

  function toggleSound() {
    var muted = global.Sfx.toggle();
    soundButton.textContent = muted ? '音效：关' : '音效：开';
    soundButton.setAttribute('aria-pressed', String(muted));
  }

  function updateHud(g) {
    var p = g.player;
    if (!p) return;
    hudHp.textContent = Math.max(0, Math.round(p.hp)) + ' / ' + Math.round(p.maxHp);
    hudSoul.textContent = Math.max(0, Math.round(p.soul)) + ' / ' + Math.round(p.maxSoul);
    barHp.style.transform = 'scaleX(' + (p.hp / p.maxHp) + ')';
    barSoul.style.transform = 'scaleX(' + (p.soul / p.maxSoul) + ')';
    hudKills.textContent = p.kills;
    hudBest.textContent = g.highKills;
    if (g.lockTarget && g.lockTarget.alive) {
      hudTarget.textContent = '锁定：' + g.lockTarget.name + '（' + g.lockTarget.rank + '）';
    } else {
      hudTarget.textContent = '锁定：无';
    }

    var bits = [];
    for (var k in BUFF_LABELS) {
      if (p.buffs[k] > 0) bits.push('<b>' + BUFF_LABELS[k] + '</b>');
    }
    hudBuffs.innerHTML = bits.join('');

    for (var id in skillButtons) {
      var sk = Skills.byId[id];
      var cd = p.cooldowns[id] || 0;
      var btn = skillButtons[id];
      btn.classList.toggle('is-cd', cd > 0);
      var small = btn.querySelector('small');
      if (small) small.textContent = cd > 0 ? cd.toFixed(1) + 's' : sk.hotkey + ' · ' + (sk.group === 'soul' ? '魂技' : sk.group === 'self' ? '自创' : sk.group === 'bone' ? '魂骨' : '领域');
    }

    var vignette = doc.getElementById('fx-vignette');
    var flashEl = doc.getElementById('fx-flash');
    if (vignette) vignette.classList.toggle('is-on', !!(g.domain && g.domain.life > 0));
    if (flashEl) flashEl.classList.toggle('is-on', !!(g.r3d && g.r3d.flash > 0.12));

    if (g.messages.length > 0) {
      toast.textContent = g.messages[g.messages.length - 1].text;
      toast.style.opacity = '1';
    } else {
      toast.style.opacity = '0';
    }
  }

  function startGame() {
    if (typeof THREE === 'undefined') {
      showBootError('3D 引擎加载失败<br><br>请重新下载 play.html<br>用 Chrome 浏览器双击打开');
      if (errorMsg) errorMsg.textContent = '3D 引擎没加载。请下载 play.html 用 Chrome 打开。';
      showOverlay('error');
      return;
    }

    try {
      if (bootMsg) bootMsg.textContent = '武魂凝聚中…';
      buildRings();
      buildSkills();
      game = new global.Game(canvas, {
        onState: function (state, g) {
          if (state === 'over') {
            deathStats.textContent = formatStats(g);
            showOverlay('over');
          } else if (state === 'paused') {
            showOverlay('paused');
          } else if (state === 'ready') {
            showOverlay('ready');
          } else {
            showOverlay(null);
          }
          pauseButton.textContent = state === 'paused' ? '继续' : '暂停';
          pauseButton.disabled = state === 'ready';
        },
        onHud: updateHud
      });

      showOverlay('ready');
      pauseButton.disabled = true;
      hideBoot();
      global.requestAnimationFrame(function () {
        game.resize();
        game.setState('playing');
      });
    } catch (err) {
      console.error(err);
      showBootError('3D 启动失败：' + (err.message || 'WebGL 不可用') + '<br><br>请换 <b>Chrome 浏览器</b> 打开');
      if (errorMsg) errorMsg.textContent = err.message || 'WebGL 不可用，请用 Chrome 浏览器';
      showOverlay('error');
    }
  }

  bindControls();
  if (bootEnter) {
    bootEnter.addEventListener('click', function () {
      hideBoot();
      if (game && game.state === 'ready') game.setState('playing');
    });
  }
  startGame();
})(window);
