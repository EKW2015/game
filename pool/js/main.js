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

    var t = g.msg;
    if (g.winner >= 0) t = g.msg;
    else if (g.phase === 'place') t = '点击球桌放置白球';
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
    table.reset(mode);
    renderHud(table);
  }

  modes.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-mode]');
    if (!btn) return;
    start(btn.getAttribute('data-mode'));
  });

  btnReset.addEventListener('click', function () {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = '八球台球';
    overlayMsg.textContent = '拉杆瞄准击打。先打进的花色归你，打完再打 8 号。';
    modes.style.display = '';
  });

  btnSound.addEventListener('click', function () {
    var muted = Pool.Sfx.toggle();
    btnSound.textContent = muted ? '音效：关' : '音效：开';
  });

  overlay.classList.remove('hidden');
})(window);
