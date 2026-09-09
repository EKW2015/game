(function (global) {
  'use strict';

  var Chess = global.Chess;
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  var PST = {
    p: [
      0, 0, 0, 0, 0, 0, 0, 0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0,
      5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5,
      0, 0, 0, 0, 0, 0, 0, 0
    ],
    n: [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50
    ],
    b: [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -20, -10, -10, -10, -10, -10, -10, -20
    ],
    r: [
      0, 0, 0, 0, 0, 0, 0, 0,
      5, 10, 10, 10, 10, 10, 10, 5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5,
      0, 0, 0, 5, 5, 0, 0, 0
    ],
    q: [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20
    ],
    k: [
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20,
      -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20,
      20, 30, 10, 0, 0, 10, 30, 20
    ]
  };

  var BOOK = {
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': ['d7d5', 'g8f6', 'e7e6'],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'f1c4', 'b1c3'],
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'b1c3', 'c2c3'],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': ['b8c6', 'g8f6'],
    'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['f1b5', 'f1c4', 'd2d4'],
    'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['f3e5', 'd2d4', 'b1c3'],
    'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['e4d5'],
    'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['d2d4', 'd2d3'],
    'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq -': ['b1c3', 'e4d5'],
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c2c4', 'g1f3']
  };

  var LEVELS = {
    easy: { depth: 1, time: 80, noise: 80, book: true },
    medium: { depth: 2, time: 280, noise: 18, book: true },
    hard: { depth: 3, time: 700, noise: 0, book: true }
  };

  function pstVal(t, sq, color) {
    var table = PST[t];
    if (!table) return 0;
    var idx = color === 'w' ? sq ^ 56 : sq;
    return table[idx];
  }

  function evaluate(pos) {
    var score = 0;
    var board = pos.board;
    var i, p;
    for (i = 0; i < 64; i++) {
      p = board[i];
      if (!p) continue;
      var s = VAL[p.t] + pstVal(p.t, i, p.c);
      score += p.c === 'w' ? s : -s;
    }
    if (Chess.inCheck(pos, pos.turn)) {
      score += pos.turn === 'w' ? -35 : 35;
    }
    return pos.turn === 'w' ? score : -score;
  }

  function mvvLva(move) {
    var victim = move.capture ? VAL[move.capture] : 0;
    if (move.ep) victim = VAL.p;
    var promo = move.promotion ? VAL[move.promotion] - VAL.p : 0;
    return victim * 10 - VAL[move.piece] + promo + (move.castle ? 20 : 0);
  }

  function orderMoves(list) {
    list.sort(function (a, b) { return mvvLva(b) - mvvLva(a); });
    return list;
  }

  function search(pos, depth, alpha, beta, ply) {
    if (depth <= 0) return evaluate(pos);
    var list = Chess.moves(pos);
    if (!list.length) {
      if (Chess.inCheck(pos, pos.turn)) return -100000 + ply;
      return 0;
    }
    if (pos.halfmove >= 100) return 0;
    orderMoves(list);
    var best = -999999;
    for (var i = 0; i < list.length; i++) {
      var u = Chess.makeMove(pos, list[i]);
      var score = -search(pos, depth - 1, -beta, -alpha, ply + 1);
      Chess.unmakeMove(pos, u);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  function pickBook(pos, noise) {
    var k = Chess.key(pos);
    var entries = BOOK[k];
    if (!entries || !entries.length) return null;
    var choices = entries.slice();
    if (noise > 40) {
      var i = Math.floor(Math.random() * choices.length);
      return Chess.parseUci(pos, choices[i]);
    }
    return Chess.parseUci(pos, choices[0]);
  }

  function choose(pos, levelName) {
    var level = LEVELS[levelName] || LEVELS.medium;
    if (level.book) {
      var booked = pickBook(pos, level.noise);
      if (booked) return booked;
    }
    var list = Chess.moves(pos);
    if (!list.length) return null;
    orderMoves(list);

    var bestMove = list[0];
    var bestScore = -999999;
    var ranked = [];
    var start = Date.now();
    var depth = level.depth;

    for (var i = 0; i < list.length; i++) {
      var u = Chess.makeMove(pos, list[i]);
      var score = -search(pos, depth - 1, -999999, 999999, 1);
      Chess.unmakeMove(pos, u);
      ranked.push({ move: list[i], score: score });
      if (score > bestScore) {
        bestScore = score;
        bestMove = list[i];
      }
      if (Date.now() - start > level.time && i > 0) break;
    }

    if (level.noise && ranked.length > 1) {
      ranked.sort(function (a, b) { return b.score - a.score; });
      var cutoff = ranked[0].score - level.noise;
      var pool = ranked.filter(function (x) { return x.score >= cutoff; });
      bestMove = pool[Math.floor(Math.random() * pool.length)].move;
    }
    return bestMove;
  }

  global.ChessAI = {
    choose: choose,
    evaluate: evaluate,
    LEVELS: LEVELS
  };
})(typeof window !== 'undefined' ? window : global);
