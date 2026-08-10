(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');

  var overlays = {
    ready: doc.getElementById('overlay-ready'),
    win: doc.getElementById('overlay-win'),
    over: doc.getElementById('overlay-over'),
    paused: doc.getElementById('overlay-paused')
  };
  var winStats = doc.getElementById('win-stats');
  var winCount = doc.getElementById('win-count');
  var deathStats = doc.getElementById('death-stats');
  var soundButton = doc.getElementById('btn-sound');
  var pauseButton = doc.getElementById('btn-pause');
  var stage = doc.getElementById('stage');
  var touchControls = doc.getElementById('touch-controls');

  function showOverlay(name) {
    Object.keys(overlays).forEach(function (key) {
      overlays[key].classList.toggle('overlay--hidden', key !== name);
    });
  }

  function formatStats(g) {
    var p = g.player;
    return '阶段 ' + global.Utils.stageName(p.mass) + ' · 击杀 ' + p.kills + ' · 体型 ' + Math.round(p.mass);
  }

  var game = new global.Game(canvas, {
    onState: function (state, g) {
      if (state === 'win') {
        winStats.textContent = formatStats(g);
        winCount.textContent = g.highWins;
        showOverlay('win');
      } else if (state === 'over') {
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
    }
  });

  showOverlay('ready');
  pauseButton.disabled = true;

  var MOVE_KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };
  var BITE_KEYS = { Space: 1, KeyJ: 1 };

  doc.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
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
      if (game.state === 'over' || game.state === 'win' || game.state === 'playing') {
        game.restart();
      }
    }
  });

  doc.addEventListener('keyup', function (event) {
    if (MOVE_KEYS[event.code]) game.release(MOVE_KEYS[event.code]);
    else if (BITE_KEYS[event.code]) game.release('bite');
  });

  Array.prototype.forEach.call(touchControls.querySelectorAll('[data-hold]'), function (button) {
    var action = button.getAttribute('data-hold');
    button.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      game.press(action);
      if (game.state === 'ready') game.setState('playing');
    });
    button.addEventListener('pointerup', function () {
      game.release(action);
    });
    button.addEventListener('pointercancel', function () {
      game.release(action);
    });
  });

  doc.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');
    if (action === 'start') {
      game.setState('playing');
    } else if (action === 'restart') {
      game.restart();
    } else if (action === 'resume') {
      game.togglePause();
    }
  });

  function toggleSound() {
    var muted = global.Sfx.toggle();
    soundButton.textContent = muted ? '音效：关' : '音效：开';
    soundButton.setAttribute('aria-pressed', String(muted));
  }

  soundButton.addEventListener('click', toggleSound);
  pauseButton.addEventListener('click', function () {
    game.togglePause();
  });

  var resizeTimer = 0;
  global.addEventListener('resize', function () {
    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      game.resize();
    }, 80);
  });

  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden && game.state === 'playing') game.togglePause();
  });

  global.requestAnimationFrame(function () {
    game.resize();
  });
})(window);
