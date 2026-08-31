(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('table');
  var overlay = doc.getElementById('overlay');
  var overlayTitle = doc.getElementById('overlay-title');
  var overlayMsg = doc.getElementById('overlay-msg');
  var modes = doc.getElementById('modes');
  var btnSound = doc.getElementById('btn-sound');
  var btnReset = doc.getElementById('btn-reset');
  var p0 = doc.getElementById('p0');
  var p1 = doc.getElementById('p1');
  var turnEl = doc.getElementById('turn');
  var p0balls = doc.getElementById('p0-balls');
  var p1balls = doc.getElementById('p1-balls');

  var table = null;

  function chipHtml(ball) {
    var cls = 'chip' + (ball.pocketed ? ' gone' : '');
    var bg = ball.color;
    var label = ball.label;
    if (ball.group === 'stripe') {
      return '<span class="' + cls + '" style="background:linear-gradient(#fff 32%,' + bg + ' 32%,' + bg + ' 68%,#fff 68%)">' + label + '</span>';
    }
    return '<span class="' + cls + '" style="background:' + bg + ';color:' + (ball.group === 'eight' ? '#fff' : '#111') + '">' + label + '</span>';
  }

  function ballsOf(g, group) {
    return g.balls.filter(function (b) { return b.group === group; })
      .sort(function (a, b) { return a.id - b.id; })
      .map(chipHtml).join('');
  }

  function renderHud(g) {
    var a0 = g.assignment[0];
    var a1 = g.assignment[1];
    doc.getElementById('p0-name').textContent = g.names[0] || '玩家 1';
    doc.getElementById('p1-name').textContent = g.names[1] || '玩家 2';
    doc.getElementById('p0-group').textContent = g.mode === 'practice'
      ? ('任意球 · 分 ' + (g.score || 0))
      : g.mode === 'challenge'
        ? (g.levelName + ' · 分 ' + (g.score || 0))
        : (g.openTable ? '尚未分色' : Pool.Rules.groupLabel(a0));
    doc.getElementById('p1-group').textContent = g.mode === 'practice'
      ? '—'
      : g.mode === 'challenge'
        ? ('第 ' + ((g.levelIndex || 0) + 1) + '/' + Pool.LEVELS.length + ' 关')
        : (g.openTable ? '尚未分色' : Pool.Rules.groupLabel(a1));

    p0balls.innerHTML = g.mode === 'challenge'
      ? ballsOf(g, 'solid') + ballsOf(g, 'stripe') + ballsOf(g, 'eight')
      : a0 ? ballsOf(g, a0) : ballsOf(g, 'solid') + ballsOf(g, 'stripe');
    if (g.mode === 'practice' || g.mode === 'challenge') p1balls.innerHTML = '';
    else p1balls.innerHTML = a1 ? ballsOf(g, a1) : '';

    p0.classList.toggle('active', g.turn === 0 && g.winner < 0);
    p1.classList.toggle('active', g.turn === 1 && g.winner < 0 && g.mode !== 'practice' && g.mode !== 'challenge');

    var shoot = doc.getElementById('btn-shoot');
    var pad = doc.getElementById('pad');
    if (shoot) {
      shoot.innerHTML = g.phase === 'place'
        ? '放下白球<br><small>空格</small>'
        : '击打<br><small>空格</small>';
    }
    if (pad) pad.classList.toggle('is-place', g.phase === 'place');

    var t = g.msg;
    if (g.winner >= 0) t = g.msg;
    else if (g.phase === 'place') t = '方向键移动白球，空格放下';
    else if (g.isAiTurn()) t = '电脑瞄准中…';
    turnEl.innerHTML = '<strong>' + t + '</strong>';

    var nextBtn = doc.getElementById('btn-next');
    if (g.winner >= 0) {
      overlay.classList.remove('hidden');
      if (g.mode === 'challenge') {
        overlayTitle.textContent = g.winner === 0 ? g.msg : '再试一次';
        overlayMsg.textContent = g.winner === 0
          ? ('得分 ' + g.score + (g.stars ? '　' + '★'.repeat(g.stars) : '') + '。回车下一关，4 重试。')
          : '按 4 重试本关，或换模式。';
        if (nextBtn) {
          nextBtn.classList.toggle('hidden', !(g.winner === 0 && g.levelIndex < Pool.LEVELS.length - 1));
        }
      } else {
        overlayTitle.textContent = g.mode === 'vsai'
          ? (g.winner === 0 ? '你赢了！' : '电脑赢了')
          : g.names[g.winner] + ' 获胜';
        overlayMsg.textContent = '再来一局，或换个模式。';
        if (nextBtn) nextBtn.classList.add('hidden');
      }
      modes.style.display = '';
    } else if (nextBtn) {
      nextBtn.classList.add('hidden');
    }
  }

  function start(mode) {
    overlay.classList.add('hidden');
    if (!table) {
      table = new Pool.Table(canvas, { onHud: renderHud });
    }
    table.menuOpen = false;
    if (mode === 'challenge-next') {
      if (!table.nextLevel()) {
        overlay.classList.remove('hidden');
        overlayTitle.textContent = '全部通关！';
        overlayMsg.textContent = '总分 ' + table.score + '。按 4 再闯一次。';
        renderHud(table);
        return;
      }
      renderHud(table);
      return;
    }
    if (mode === 'challenge') {
      if (!(table.mode === 'challenge' && table.winner === 1)) table.levelIndex = 0;
    }
    table.reset(mode, { fresh: mode === 'challenge' && table.winner !== 1 });
    renderHud(table);
  }

  function openMenu() {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '八球台球';
    overlayMsg.textContent = '按 4 闯关（推荐）。1 对战电脑，2 双人，3 练习。方向键瞄准，空格击打。';
    modes.style.display = '';
    if (table) table.menuOpen = true;
  }

  modes.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-mode]');
    if (!btn) return;
    start(btn.getAttribute('data-mode'));
  });

  btnReset.addEventListener('click', openMenu);

  btnSound.addEventListener('click', function () {
    var muted = Pool.Sfx.toggle();
    btnSound.textContent = muted ? '音效：关' : '音效：开';
  });

  doc.addEventListener('keydown', function (ev) {
    if (ev.repeat) return;
    if (!overlay.classList.contains('hidden')) {
      if (ev.code === 'Digit1' || ev.key === '1') start('vsai');
      else if (ev.code === 'Digit2' || ev.key === '2') start('hotseat');
      else if (ev.code === 'Digit3' || ev.key === '3') start('practice');
      else if (ev.code === 'Digit4' || ev.key === '4') start('challenge');
      else if (ev.code === 'Enter' && table && table.mode === 'challenge' && table.winner === 0) {
        start('challenge-next');
      }
      return;
    }
    if (ev.code === 'Escape' || ev.code === 'KeyM') {
      ev.preventDefault();
      openMenu();
    }
  });

  var pad = doc.getElementById('pad');
  pad.addEventListener('pointerdown', function (ev) {
    var hold = ev.target.closest('[data-hold]');
    var shoot = ev.target.closest('#btn-shoot');
    if (hold) {
      ev.preventDefault();
      hold.classList.add('is-down');
      hold.setPointerCapture(ev.pointerId);
      if (table) table.setHold(hold.getAttribute('data-hold'), true);
    } else if (shoot) {
      ev.preventDefault();
      if (!table) return;
      Pool.Sfx.unlock();
      if (table.canPlace()) table.confirmPlace();
      else if (table.canAim()) table.shoot(table.pull > 12 ? table.pull : 150);
    }
  });
  pad.addEventListener('pointerup', function (ev) {
    var hold = ev.target.closest('[data-hold]');
    if (hold) {
      hold.classList.remove('is-down');
      if (table) table.setHold(hold.getAttribute('data-hold'), false);
    }
  });
  pad.addEventListener('pointercancel', function () {
    ['left', 'right', 'up', 'down'].forEach(function (k) {
      if (table) table.setHold(k, false);
    });
    Array.prototype.forEach.call(pad.querySelectorAll('.is-down'), function (el) {
      el.classList.remove('is-down');
    });
  });

  overlay.classList.remove('hidden');
})(window);
