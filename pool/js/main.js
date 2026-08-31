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
      ? '任意球'
      : (g.openTable ? '尚未分色' : Pool.Rules.groupLabel(a0));
    doc.getElementById('p1-group').textContent = g.mode === 'practice'
      ? '—'
      : (g.openTable ? '尚未分色' : Pool.Rules.groupLabel(a1));

    p0balls.innerHTML = a0 ? ballsOf(g, a0) : ballsOf(g, 'solid') + ballsOf(g, 'stripe');
    if (g.mode === 'practice') p1balls.innerHTML = '';
    else p1balls.innerHTML = a1 ? ballsOf(g, a1) : '';

    p0.classList.toggle('active', g.turn === 0 && g.winner < 0);
    p1.classList.toggle('active', g.turn === 1 && g.winner < 0 && g.mode !== 'practice');

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

    if (g.winner >= 0) {
      overlay.classList.remove('hidden');
      overlayTitle.textContent = g.mode === 'vsai'
        ? (g.winner === 0 ? '你赢了！' : '电脑赢了')
        : g.names[g.winner] + ' 获胜';
      overlayMsg.textContent = '再来一局，或换个模式。';
      modes.style.display = '';
    }
  }

  function start(mode) {
    overlay.classList.add('hidden');
    if (!table) {
      table = new Pool.Table(canvas, { onHud: renderHud });
    }
    table.menuOpen = false;
    table.reset(mode);
    renderHud(table);
  }

  function openMenu() {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '八球台球';
    overlayMsg.textContent = '没有鼠标也能玩：按 1 对战电脑，2 双人，3 练习。方向键瞄准，空格击打。';
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
    if (overlay.classList.contains('hidden')) return;
    if (ev.repeat) return;
    if (ev.code === 'Digit1' || ev.key === '1') start('vsai');
    else if (ev.code === 'Digit2' || ev.key === '2') start('hotseat');
    else if (ev.code === 'Digit3' || ev.key === '3') start('practice');
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
      else if (table.canAim()) table.shoot(table.pull > 12 ? table.pull : 125);
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
