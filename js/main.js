(function (global) {
  'use strict';

  var doc = global.document;
  var boardEl = doc.getElementById('board');
  var statusEl = doc.getElementById('status-text');
  var turnDot = doc.getElementById('turn-dot');
  var historyEl = doc.getElementById('history');
  var capWhite = doc.getElementById('cap-white');
  var capBlack = doc.getElementById('cap-black');
  var matWhite = doc.getElementById('mat-white');
  var matBlack = doc.getElementById('mat-black');
  var soundBtn = doc.getElementById('btn-sound');
  var overlayReady = doc.getElementById('overlay-ready');
  var overlayOver = doc.getElementById('overlay-over');
  var overlayPromo = doc.getElementById('overlay-promo');
  var overTitle = doc.getElementById('over-title');
  var overHint = doc.getElementById('over-hint');
  var promoChoices = doc.getElementById('promo-choices');
  var thinkingEl = doc.getElementById('thinking');

  var game = new global.Game({
    boardEl: boardEl,
    onChange: onChange
  });

  function hideOverlays() {
    overlayReady.classList.add('overlay--hidden');
    overlayOver.classList.add('overlay--hidden');
    overlayPromo.classList.add('overlay--hidden');
  }

  function showReady() {
    overlayOver.classList.add('overlay--hidden');
    overlayPromo.classList.add('overlay--hidden');
    overlayReady.classList.remove('overlay--hidden');
  }

  function pieceStrip(list, owner) {
    if (!list.length) return '<span class="cap-empty">无</span>';
    return list.map(function (t) {
      return '<span class="cap-piece">' + game.pieceSvg(t, owner === 'w' ? 'b' : 'w') + '</span>';
    }).join('');
  }

  function renderHistory(history) {
    if (!history.length) {
      historyEl.innerHTML = '<p class="history-empty">对局开始后棋谱会显示在这里</p>';
      return;
    }
    var rows = [];
    for (var i = 0; i < history.length; i += 2) {
      var n = (i / 2) + 1;
      var w = history[i] ? history[i].san : '';
      var b = history[i + 1] ? history[i + 1].san : '';
      rows.push(
        '<div class="hist-row">' +
          '<span class="hist-n">' + n + '</span>' +
          '<span class="hist-san">' + w + '</span>' +
          '<span class="hist-san">' + b + '</span>' +
        '</div>'
      );
    }
    historyEl.innerHTML = rows.join('');
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function matText(diff, side) {
    var v = side === 'w' ? diff : -diff;
    if (v <= 0) return '';
    return '+' + v;
  }

  function onChange(snap) {
    var st = snap.status;
    thinkingEl.classList.toggle('is-on', !!snap.thinking);

    if (snap.pendingPromo) {
      overlayReady.classList.add('overlay--hidden');
      overlayOver.classList.add('overlay--hidden');
      overlayPromo.classList.remove('overlay--hidden');
      var color = snap.pos.turn;
      var types = ['q', 'r', 'b', 'n'];
      promoChoices.innerHTML = types.map(function (t) {
        return '<button type="button" class="promo-btn" data-promo="' + t + '">' +
          game.pieceSvg(t, color) + '</button>';
      }).join('');
    } else {
      overlayPromo.classList.add('overlay--hidden');
    }

    if (st.state !== 'playing') {
      hideOverlays();
      overlayOver.classList.remove('overlay--hidden');
      if (st.state === 'checkmate' || st.state === 'resign') {
        overTitle.textContent = st.winner === 'w' ? '白方胜' : '黑方胜';
        overHint.textContent = st.state === 'resign' ? '对方认输' : '将死';
      } else {
        overTitle.textContent = '和棋';
        overHint.textContent = st.text.replace('和棋 · ', '');
      }
      statusEl.textContent = st.text;
    } else if (!snap.pendingPromo && overlayReady.classList.contains('overlay--hidden')) {
      overlayOver.classList.add('overlay--hidden');
      statusEl.textContent = snap.thinking ? '电脑思考中…' : st.text;
    }

    turnDot.className = 'turn-dot turn-dot--' + snap.pos.turn + (st.check ? ' is-check' : '');
    capWhite.innerHTML = pieceStrip(snap.captured.w, 'w');
    capBlack.innerHTML = pieceStrip(snap.captured.b, 'b');
    matWhite.textContent = matText(snap.material.diff, 'w');
    matBlack.textContent = matText(snap.material.diff, 'b');
    renderHistory(snap.history);
  }

  function readStartOptions() {
    var mode = (doc.querySelector('input[name="mode"]:checked') || {}).value || 'ai';
    var human = (doc.querySelector('input[name="color"]:checked') || {}).value || 'w';
    var level = (doc.querySelector('input[name="level"]:checked') || {}).value || 'medium';
    return { mode: mode, human: human, level: level };
  }

  function markChoices() {
    doc.querySelectorAll('.choice').forEach(function (label) {
      var input = label.querySelector('input');
      label.classList.toggle('is-on', !!(input && input.checked));
    });
  }

  function startGame() {
    hideOverlays();
    game.newGame(readStartOptions());
  }

  doc.getElementById('btn-start').addEventListener('click', startGame);
  doc.getElementById('btn-again').addEventListener('click', function () {
    showReady();
  });
  doc.getElementById('btn-new').addEventListener('click', function () {
    showReady();
  });
  doc.getElementById('btn-undo').addEventListener('click', function () { game.undo(); });
  doc.getElementById('btn-resign').addEventListener('click', function () { game.resign(); });
  doc.getElementById('btn-flip').addEventListener('click', function () { game.flip(); });
  doc.getElementById('btn-hint').addEventListener('click', function () { game.hint(); });

  soundBtn.addEventListener('click', function () {
    var muted = global.Sfx.toggle();
    soundBtn.textContent = muted ? '音效：关' : '音效：开';
    soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  });

  promoChoices.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-promo]');
    if (!btn) return;
    game.choosePromotion(btn.getAttribute('data-promo'));
  });

  function syncAiOptions() {
    var mode = (doc.querySelector('input[name="mode"]:checked') || {}).value;
    doc.getElementById('ai-options').classList.toggle('is-disabled', mode !== 'ai');
    markChoices();
  }
  doc.querySelectorAll('input[name="mode"], input[name="color"], input[name="level"]').forEach(function (el) {
    el.addEventListener('change', syncAiOptions);
  });
  syncAiOptions();

  game.render();
  onChange(game.snapshot());
  showReady();
})(window);
