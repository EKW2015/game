/**
 * 把游戏和页面 UI 连起来：键盘、触屏、浮层、按钮。
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');

  var overlays = {
    ready: doc.getElementById('overlay-ready'),
    over: doc.getElementById('overlay-over'),
    paused: doc.getElementById('overlay-paused')
  };
  var finalScore = doc.getElementById('final-score');
  var recordBadge = doc.getElementById('record-badge');
  var soundButton = doc.getElementById('btn-sound');
  var pauseButton = doc.getElementById('btn-pause');
  var stage = doc.getElementById('stage');
  var touchControls = doc.getElementById('touch-controls');

  function showOverlay(name) {
    Object.keys(overlays).forEach(function (key) {
      overlays[key].classList.toggle('overlay--hidden', key !== name);
    });
  }

  var game = new global.Game(canvas, {
    onState: function (state, g) {
      if (state === 'over') {
        finalScore.textContent = Math.floor(g.score);
        recordBadge.hidden = !g.newRecord;
        showOverlay('over');
      } else if (state === 'paused') {
        showOverlay('paused');
      } else if (state === 'ready') {
        showOverlay('ready');
      } else {
        showOverlay(null);
      }
      pauseButton.textContent = state === 'paused' ? '继续' : '暂停';
      pauseButton.disabled = state === 'ready' || state === 'over';
    },
    onNight: function (isNight) {
      doc.body.classList.toggle('is-night', isNight);
    }
  });

  showOverlay('ready');
  pauseButton.disabled = true;

  // ------------------------------------------------------------ 键盘

  var JUMP_KEYS = { Space: 1, ArrowUp: 1, KeyW: 1, Enter: 1 };
  var DUCK_KEYS = { ArrowDown: 1, KeyS: 1 };

  doc.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var code = event.code;

    if (JUMP_KEYS[code]) {
      event.preventDefault();
      if (!event.repeat) game.press('jump');
      return;
    }
    if (DUCK_KEYS[code]) {
      event.preventDefault();
      game.press('duck');
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
    if (JUMP_KEYS[event.code]) game.release('jump');
    else if (DUCK_KEYS[event.code]) game.release('duck');
  });

  // ------------------------------------------------------------ 指针 / 触屏

  stage.addEventListener('pointerdown', function (event) {
    if (event.target.closest('button')) return;
    event.preventDefault();
    game.press('jump');
  });

  global.addEventListener('pointerup', function () {
    game.release('jump');
  });

  touchControls.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  Array.prototype.forEach.call(touchControls.querySelectorAll('[data-hold]'), function (button) {
    var action = button.getAttribute('data-hold');
    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      game.press(action);
    });
    button.addEventListener('pointerup', function () {
      game.release(action);
    });
    button.addEventListener('pointercancel', function () {
      game.release(action);
    });
  });

  // ------------------------------------------------------------ 浮层按钮

  doc.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'start') game.press('jump');
    else if (action === 'restart') game.restart();
    else if (action === 'resume') game.togglePause();
  });

  // ------------------------------------------------------------ 顶部按钮

  function toggleSound() {
    var muted = global.Sfx.toggle();
    soundButton.textContent = muted ? '音效：关' : '音效：开';
    soundButton.setAttribute('aria-pressed', String(muted));
  }

  soundButton.addEventListener('click', toggleSound);
  pauseButton.addEventListener('click', function () {
    game.togglePause();
  });

  // ------------------------------------------------------------ 窗口事件

  var resizeTimer = 0;
  global.addEventListener('resize', function () {
    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      game.resize();
    }, 80);
  });

  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) game.pause();
  });

  global.addEventListener('blur', function () {
    game.release('jump');
    game.release('duck');
    game.pause();
  });

  // 首帧布局完成后再量一次尺寸，避免字体加载导致的偏差
  global.requestAnimationFrame(function () {
    game.resize();
  });
})(window);
