(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');

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

  var hudStage = doc.getElementById('hud-stage');
  var hudMass = doc.getElementById('hud-mass');
  var hudKills = doc.getElementById('hud-kills');
  var hudBest = doc.getElementById('hud-best');
  var bootScreen = doc.getElementById('boot-screen');
  var bootMsg = doc.getElementById('boot-msg');

  var game = null;

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
    return '阶段 ' + global.Utils.stageName(p.mass) + ' · 击杀 ' + p.kills + ' · 体型 ' + Math.round(p.mass);
  }

  function bindControls() {
    var MOVE_KEYS = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right'
    };
    var BITE_KEYS = { Space: 1, KeyJ: 1 };

    doc.addEventListener('keydown', function (event) {
      if (!game || event.metaKey || event.ctrlKey || event.altKey) return;
      var code = event.code;

      if (MOVE_KEYS[code]) {
        event.preventDefault();
        if (!event.repeat) game.press(MOVE_KEYS[code]);
        return;
      }
      if (BITE_KEYS[code]) {
        event.preventDefault();
        if (!event.repeat) game.press('bite');
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        event.preventDefault();
        game.togglePause();
      } else if (code === 'KeyM') {
        toggleSound();
      } else if (code === 'KeyR') {
        if (game.state === 'over' || game.state === 'playing') game.restart();
      }
    });

    doc.addEventListener('keyup', function (event) {
      if (!game) return;
      if (MOVE_KEYS[event.code]) game.release(MOVE_KEYS[event.code]);
      else if (BITE_KEYS[event.code]) game.release('bite');
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

  function startGame() {
    if (typeof THREE === 'undefined') {
      showBootError('3D 引擎加载失败<br><br>请重新下载 play.html（约700KB）<br>用 Chrome 浏览器双击打开<br><br>❌ 不要直接在 GitHub 网页里打开');
      if (errorMsg) errorMsg.textContent = '3D 引擎没加载。请下载 play.html 用 Chrome 打开。';
      showOverlay('error');
      return;
    }

    try {
      if (bootMsg) bootMsg.textContent = '正在创建 3D 世界…';
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
        onHud: function (g) {
          var p = g.player;
          if (!p) return;
          hudStage.textContent = global.Utils.stageName(p.mass);
          hudMass.textContent = Math.round(p.mass);
          hudKills.textContent = p.kills;
          hudBest.textContent = g.highKills;

          if (g.messages.length > 0) {
            toast.textContent = g.messages[0].text;
            toast.style.opacity = '1';
          } else {
            toast.style.opacity = '0';
          }
        }
      });

      showOverlay('ready');
      pauseButton.disabled = true;
      hideBoot();
      global.requestAnimationFrame(function () {
        game.resize();
        // 打开即玩，无需再点按钮
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
  startGame();
})(window);
