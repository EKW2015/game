(function (global) {
  'use strict';

  var Chess = global.Chess;

  function svgEl(type, color) {
    var w = color === 'w';
    var fill = w ? '#f4ead8' : '#2b221c';
    var stroke = w ? '#3d3226' : '#120e0b';
    var line = w ? '#3d3226' : '#e7d7c2';
    var sw = '1.5';
    var body =
      '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round">';
    if (type === 'p') {
      body +=
        '<path d="M22.5 11.2a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2z"/>' +
        '<path d="M15.2 24.2c3 2.8 11.6 2.8 14.6 0C31.4 28.6 30 33 28.4 35.4c-2.2 1.6-9.6 1.6-11.8 0C15 33 13.6 28.6 15.2 24.2z"/>' +
        '<path d="M12.5 36.2h20l1.2 3.2H11.3z"/>';
    } else if (type === 'r') {
      body +=
        '<path d="M11 14.2h5.2v5.6h3.4V14.2h6.8v5.6h3.4V14.2H35v8.4l-2.4 2.2v9.4H12.4v-9.4L10 22.6z"/>' +
        '<path d="M12.2 36.4h20.6L34.2 40H10.8z"/>' +
        '<path d="M16.4 27.2h12.2" fill="none" stroke="' + line + '" stroke-width="1.3"/>';
    } else if (type === 'n') {
      body +=
        '<path d="M11.2 36.4h23.2v3.4H11.2z"/>' +
        '<path d="M15.4 34.6c.2-8 1.8-12.6 7.4-16.2.4-4.8 2.6-9.2 8.6-12.2 1.2 2.4-.2 5.4-.6 7.2 3 .6 6.4 3.2 6.8 7.4.4 3.2-1.4 5.8-4.2 7v2.4h-4.2c0 1.6.8 3.2 2.2 4.2H16.6z"/>' +
        '<circle cx="28.4" cy="16.8" r="1.15" fill="' + stroke + '" stroke="none"/>' +
        '<path d="M18.6 22.4c1.6 1 3.8.6 4.8-.8" fill="none" stroke="' + line + '" stroke-width="1.2"/>';
    } else if (type === 'b') {
      body +=
        '<path d="M22.5 9.2c4.4 4.2 8.8 10.6 8.8 16.4 0 5.2-3.8 8.2-8.8 8.2s-8.8-3-8.8-8.2c0-5.8 4.4-12.2 8.8-16.4z"/>' +
        '<path d="M14.2 35.6h16.6l1.6 4.2H12.6z"/>' +
        '<circle cx="22.5" cy="12.2" r="2.1"/>' +
        '<path d="M19.4 22.6 25.6 28.4M25.6 22.6 19.4 28.4" fill="none" stroke="' + line + '" stroke-width="1.4"/>';
    } else if (type === 'q') {
      body +=
        '<circle cx="8.8" cy="14.2" r="2.15"/>' +
        '<circle cx="16.2" cy="10.4" r="2.15"/>' +
        '<circle cx="22.5" cy="8.6" r="2.25"/>' +
        '<circle cx="28.8" cy="10.4" r="2.15"/>' +
        '<circle cx="36.2" cy="14.2" r="2.15"/>' +
        '<path d="M10.2 15.6 14.8 30.2h15.4l4.6-14.6-6.4 8.2-5.9-10.4-5.9 10.4z"/>' +
        '<path d="M15.4 31.4h14.2c1.4 2.2 1.6 4.4.8 5.8H14.6c-.8-1.4-.6-3.6.8-5.8z"/>' +
        '<path d="M13 37.4h19l1.4 2.8H11.6z"/>';
    } else {
      body +=
        '<path d="M22.5 6.2v7.2M19.2 9.4h6.6" fill="none" stroke="' + stroke + '" stroke-width="1.8"/>' +
        '<circle cx="22.5" cy="15.4" r="2.3"/>' +
        '<path d="M13.6 18.4h17.8l-1.6 4.6c3 2.4 3.4 6.8.4 10.2H14.8c-3-3.4-2.6-7.8.4-10.2z"/>' +
        '<path d="M14.4 34.8h16.2c1.2 1.6 1.4 3.2.6 4.6H13.8c-.8-1.4-.6-3 .6-4.6z"/>' +
        '<path d="M12.4 39.4h20.2l1.2 2.4H11.2z"/>' +
        '<path d="M17.4 24.8h10.2" fill="none" stroke="' + line + '" stroke-width="1.3"/>';
    }
    body += '</g>';
    return (
      '<svg class="piece-svg" viewBox="0 0 45 45" aria-hidden="true">' + body + '</svg>'
    );
  }

  function Game(opts) {
    this.boardEl = opts.boardEl;
    this.onChange = opts.onChange || function () {};
    this.squares = [];
    this.pos = Chess.create();
    this.history = [];
    this.selected = -1;
    this.legalFromSel = [];
    this.orientation = 'w';
    this.mode = 'ai';
    this.human = 'w';
    this.level = 'medium';
    this.lastMove = null;
    this.pendingPromo = null;
    this.thinking = false;
    this.ended = null;
    this.buildBoard();
    this.bind();
  }

  Game.prototype.buildBoard = function () {
    var self = this;
    this.boardEl.innerHTML = '';
    this.squares = [];
    for (var i = 0; i < 64; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sq';
      btn.setAttribute('data-vis', String(i));
      btn.addEventListener('click', function (ev) {
        self.onSquareClick(ev.currentTarget);
      });
      this.boardEl.appendChild(btn);
      this.squares.push(btn);
    }
  };

  Game.prototype.bind = function () {
    var self = this;
    this.boardEl.addEventListener('pointerdown', function () {
      if (global.Sfx && global.Sfx.isMuted && !global.Sfx._armed) {
        global.Sfx._armed = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.selected = -1;
        self.pendingPromo = null;
        self.render();
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        self.undo();
      }
    });
  };

  Game.prototype.visToSq = function (vis) {
    var row = (vis / 8) | 0;
    var col = vis % 8;
    var flipped = this.orientation === 'b';
    var rank = flipped ? row : 7 - row;
    var file = flipped ? 7 - col : col;
    return rank * 8 + file;
  };

  Game.prototype.sqToVis = function (sq) {
    var file = Chess.fileOf(sq);
    var rank = Chess.rankOf(sq);
    var flipped = this.orientation === 'b';
    var row = flipped ? rank : 7 - rank;
    var col = flipped ? 7 - file : file;
    return row * 8 + col;
  };

  Game.prototype.newGame = function (opts) {
    opts = opts || {};
    this.pos = Chess.create();
    this.history = [];
    this.selected = -1;
    this.legalFromSel = [];
    this.lastMove = null;
    this.pendingPromo = null;
    this.thinking = false;
    this.ended = null;
    this.mode = opts.mode || 'ai';
    this.human = opts.human || 'w';
    this.level = opts.level || 'medium';
    this.orientation = this.mode === 'ai' ? this.human : 'w';
    this.render();
    this.onChange(this.snapshot());
    if (this.isAiTurn()) this.scheduleAi();
  };

  Game.prototype.isAiTurn = function () {
    var st = this.getStatus();
    return this.mode === 'ai' && st.state === 'playing' && this.pos.turn !== this.human && !this.thinking;
  };

  Game.prototype.getStatus = function () {
    if (this.ended) return this.ended;
    return Chess.status(this.pos);
  };

  Game.prototype.snapshot = function () {
    var st = this.getStatus();
    return {
      pos: this.pos,
      status: st,
      history: this.history,
      lastMove: this.lastMove,
      selected: this.selected,
      pendingPromo: this.pendingPromo,
      thinking: this.thinking,
      mode: this.mode,
      human: this.human,
      level: this.level,
      orientation: this.orientation,
      material: Chess.material(this.pos),
      captured: capturedFromHistory(this.history)
    };
  };

  function capturedFromHistory(history) {
    var caps = { w: [], b: [] };
    for (var i = 0; i < history.length; i++) {
      var m = history[i].move;
      if (m.capture || m.ep) caps[m.color].push(m.capture || 'p');
    }
    var order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
    function sortCaps(a, b) { return (order[a] || 9) - (order[b] || 9); }
    caps.w.sort(sortCaps);
    caps.b.sort(sortCaps);
    return caps;
  }

  Game.prototype.playSound = function (move, statusAfter) {
    var Sfx = global.Sfx;
    if (!Sfx) return;
    if (statusAfter.state === 'checkmate') Sfx.win();
    else if (statusAfter.state === 'draw') Sfx.draw();
    else if (statusAfter.check) Sfx.check();
    else if (move.promotion) Sfx.promote();
    else if (move.castle) Sfx.castle();
    else if (move.capture || move.ep) Sfx.capture();
    else Sfx.move();
  };

  Game.prototype.commit = function (move) {
    var san = Chess.san(this.pos, move);
    this.pos = Chess.apply(this.pos, move);
    this.history.push({
      san: san,
      move: move,
      color: move.color,
      key: Chess.moveKey(move)
    });
    this.lastMove = move;
    this.selected = -1;
    this.legalFromSel = [];
    this.pendingPromo = null;
    var st = this.getStatus();
    this.playSound(move, st);
    this.render();
    this.onChange(this.snapshot());
    if (st.state === 'playing' && this.mode === 'ai' && this.pos.turn !== this.human) {
      this.scheduleAi();
    }
  };

  Game.prototype.scheduleAi = function () {
    var self = this;
    if (this.thinking) return;
    this.thinking = true;
    this.onChange(this.snapshot());
    this.render();
    setTimeout(function () {
      var move = global.ChessAI.choose(self.pos, self.level);
      self.thinking = false;
      if (move) self.commit(move);
      else {
        self.render();
        self.onChange(self.snapshot());
      }
    }, 280);
  };

  Game.prototype.onSquareClick = function (btn) {
    if (this.thinking) return;
    var st = this.getStatus();
    if (st.state !== 'playing') return;
    if (this.pendingPromo) return;
    if (this.mode === 'ai' && this.pos.turn !== this.human) return;

    var vis = parseInt(btn.getAttribute('data-vis'), 10);
    var sq = this.visToSq(vis);
    var piece = this.pos.board[sq];

    if (this.selected >= 0) {
      var promoMoves = [];
      var list = this.legalFromSel;
      for (var i = 0; i < list.length; i++) {
        if (list[i].to === sq) promoMoves.push(list[i]);
      }
      if (promoMoves.length === 1) {
        this.commit(promoMoves[0]);
        return;
      }
      if (promoMoves.length > 1) {
        this.pendingPromo = { from: this.selected, to: sq, moves: promoMoves };
        this.render();
        this.onChange(this.snapshot());
        return;
      }
      if (piece && piece.c === this.pos.turn) {
        this.selectSquare(sq);
        return;
      }
      this.selected = -1;
      this.legalFromSel = [];
      if (global.Sfx) global.Sfx.illegal();
      this.render();
      return;
    }

    if (piece && piece.c === this.pos.turn) this.selectSquare(sq);
  };

  Game.prototype.selectSquare = function (sq) {
    this.selected = sq;
    this.legalFromSel = Chess.moves(this.pos).filter(function (m) { return m.from === sq; });
    if (global.Sfx) global.Sfx.select();
    this.render();
    this.onChange(this.snapshot());
  };

  Game.prototype.choosePromotion = function (type) {
    if (!this.pendingPromo) return;
    var moves = this.pendingPromo.moves;
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].promotion === type) {
        this.commit(moves[i]);
        return;
      }
    }
  };

  Game.prototype.undo = function () {
    if (this.thinking) return;
    if (!this.history.length) return;
    this.ended = null;
    var steps = this.mode === 'ai' && this.history.length >= 2 ? 2 : 1;
    if (this.mode === 'ai' && this.history.length === 1 && this.human === 'b') steps = 1;
    while (steps-- && this.history.length) this.history.pop();
    this.pos = Chess.create();
    for (var i = 0; i < this.history.length; i++) {
      var mv = Chess.parseUci(this.pos, this.history[i].key);
      if (mv) this.pos = Chess.apply(this.pos, mv);
    }
    var last = this.history[this.history.length - 1];
    this.lastMove = last ? last.move : null;
    this.selected = -1;
    this.legalFromSel = [];
    this.pendingPromo = null;
    this.render();
    this.onChange(this.snapshot());
    if (this.isAiTurn()) this.scheduleAi();
  };

  Game.prototype.resign = function () {
    if (this.thinking) return;
    if (this.getStatus().state !== 'playing') return;
    var loser = this.mode === 'ai' ? this.human : this.pos.turn;
    var winner = loser === 'w' ? 'b' : 'w';
    this.pendingPromo = null;
    this.selected = -1;
    this.thinking = false;
    this.ended = {
      state: 'resign',
      winner: winner,
      text: (winner === 'w' ? '白方胜' : '黑方胜') + ' · 对方认输',
      check: false,
      moves: []
    };
    this.render();
    this.onChange(this.snapshot());
    if (global.Sfx) global.Sfx.win();
  };

  Game.prototype.flip = function () {
    this.orientation = this.orientation === 'w' ? 'b' : 'w';
    this.render();
    this.onChange(this.snapshot());
  };

  Game.prototype.hint = function () {
    if (this.thinking) return;
    var st = this.getStatus();
    if (st.state !== 'playing') return;
    var move = global.ChessAI.choose(this.pos, 'medium');
    if (!move) return;
    this.selected = move.from;
    this.legalFromSel = [move];
    this._hintTo = move.to;
    this.render();
    this.onChange(this.snapshot());
  };

  Game.prototype.render = function () {
    var st = this.getStatus();
    var kingSq = st.check ? this.pos.king[this.pos.turn] : -1;
    var dests = {};
    var i;
    for (i = 0; i < this.legalFromSel.length; i++) dests[this.legalFromSel[i].to] = this.legalFromSel[i];

    for (i = 0; i < 64; i++) {
      var btn = this.squares[i];
      var sq = this.visToSq(i);
      var piece = this.pos.board[sq];
      var file = Chess.fileOf(sq);
      var rank = Chess.rankOf(sq);
      var light = ((file + rank) & 1) === 1;
      var cls = 'sq ' + (light ? 'sq--light' : 'sq--dark');
      if (this.selected === sq) cls += ' sq--sel';
      if (this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq)) cls += ' sq--last';
      if (kingSq === sq) cls += ' sq--check';
      if (this._hintTo === sq) cls += ' sq--hint';
      btn.className = cls;
      btn.setAttribute('aria-label', Chess.squareName(sq));

      var showFile = (this.orientation === 'w' && rank === 0) || (this.orientation === 'b' && rank === 7);
      var showRank = (this.orientation === 'w' && file === 0) || (this.orientation === 'b' && file === 7);
      var html = '';
      if (showFile) html += '<span class="coord coord--file">' + 'abcdefgh'.charAt(file) + '</span>';
      if (showRank) html += '<span class="coord coord--rank">' + (rank + 1) + '</span>';
      if (dests[sq]) {
        html += dests[sq].capture || dests[sq].ep
          ? '<span class="hint hint--cap"></span>'
          : '<span class="hint hint--move"></span>';
      }
      if (piece) {
        html += '<span class="piece piece--' + piece.c + '" data-piece="' + piece.c + piece.t + '">' +
          svgEl(piece.t, piece.c) + '</span>';
      }
      btn.innerHTML = html;
    }
    this._hintTo = -1;
  };

  Game.prototype.pieceSvg = svgEl;

  global.Game = Game;
})(typeof window !== 'undefined' ? window : global);
