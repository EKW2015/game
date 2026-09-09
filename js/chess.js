(function (global) {
  'use strict';

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FILES = 'abcdefgh';
  var PIECE_CHARS = {
    wp: 'P', wn: 'N', wb: 'B', wr: 'R', wq: 'Q', wk: 'K',
    bp: 'p', bn: 'n', bb: 'b', br: 'r', bq: 'q', bk: 'k'
  };
  var CHAR_PIECE = {
    P: { t: 'p', c: 'w' }, N: { t: 'n', c: 'w' }, B: { t: 'b', c: 'w' },
    R: { t: 'r', c: 'w' }, Q: { t: 'q', c: 'w' }, K: { t: 'k', c: 'w' },
    p: { t: 'p', c: 'b' }, n: { t: 'n', c: 'b' }, b: { t: 'b', c: 'b' },
    r: { t: 'r', c: 'b' }, q: { t: 'q', c: 'b' }, k: { t: 'k', c: 'b' }
  };
  var KNIGHT_D = [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
  var KING_D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function fileOf(sq) { return sq & 7; }
  function rankOf(sq) { return sq >> 3; }
  function at(f, r) { return r * 8 + f; }
  function opp(c) { return c === 'w' ? 'b' : 'w'; }
  function cloneCastle(c) {
    return { wK: c.wK, wQ: c.wQ, bK: c.bK, bQ: c.bQ };
  }
  function copyPiece(p) {
    return p ? { t: p.t, c: p.c } : null;
  }

  function squareName(sq) {
    return FILES[fileOf(sq)] + (rankOf(sq) + 1);
  }

  function parseSquare(name) {
    if (!name || name.length < 2) return -1;
    var f = FILES.indexOf(name[0]);
    var r = name.charCodeAt(1) - 49;
    if (f < 0 || r < 0 || r > 7) return -1;
    return at(f, r);
  }

  function emptyBoard() {
    var b = new Array(64);
    for (var i = 0; i < 64; i++) b[i] = null;
    return b;
  }

  function findKing(board, color) {
    for (var i = 0; i < 64; i++) {
      var p = board[i];
      if (p && p.t === 'k' && p.c === color) return i;
    }
    return -1;
  }

  function createPosition() {
    return fromFen(START_FEN);
  }

  function fromFen(fen) {
    var parts = (fen || START_FEN).trim().split(/\s+/);
    var board = emptyBoard();
    var ranks = parts[0].split('/');
    for (var r = 0; r < 8; r++) {
      var row = ranks[7 - r] || '';
      var f = 0;
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (ch >= '1' && ch <= '8') {
          f += ch.charCodeAt(0) - 48;
        } else if (CHAR_PIECE[ch]) {
          if (f < 8) board[at(f, r)] = { t: CHAR_PIECE[ch].t, c: CHAR_PIECE[ch].c };
          f++;
        }
      }
    }
    var turn = parts[1] === 'b' ? 'b' : 'w';
    var cr = parts[2] || '-';
    var epName = parts[3] && parts[3] !== '-' ? parts[3] : null;
    var pos = {
      board: board,
      turn: turn,
      castling: {
        wK: cr.indexOf('K') >= 0,
        wQ: cr.indexOf('Q') >= 0,
        bK: cr.indexOf('k') >= 0,
        bQ: cr.indexOf('q') >= 0
      },
      ep: epName ? parseSquare(epName) : -1,
      halfmove: parseInt(parts[4] || '0', 10) || 0,
      fullmove: parseInt(parts[5] || '1', 10) || 1,
      king: { w: findKing(board, 'w'), b: findKing(board, 'b') },
      seen: []
    };
    pos.seen.push(key(pos));
    return pos;
  }

  function toFen(pos) {
    var rows = [];
    for (var r = 7; r >= 0; r--) {
      var empty = 0;
      var row = '';
      for (var f = 0; f < 8; f++) {
        var p = pos.board[at(f, r)];
        if (!p) empty++;
        else {
          if (empty) { row += String(empty); empty = 0; }
          row += PIECE_CHARS[p.c + p.t];
        }
      }
      if (empty) row += String(empty);
      rows.push(row);
    }
    var cr = '';
    if (pos.castling.wK) cr += 'K';
    if (pos.castling.wQ) cr += 'Q';
    if (pos.castling.bK) cr += 'k';
    if (pos.castling.bQ) cr += 'q';
    if (!cr) cr = '-';
    var ep = pos.ep >= 0 ? squareName(pos.ep) : '-';
    return rows.join('/') + ' ' + pos.turn + ' ' + cr + ' ' + ep + ' ' + pos.halfmove + ' ' + pos.fullmove;
  }

  function key(pos) {
    var rows = [];
    for (var r = 7; r >= 0; r--) {
      var empty = 0;
      var row = '';
      for (var f = 0; f < 8; f++) {
        var p = pos.board[at(f, r)];
        if (!p) empty++;
        else {
          if (empty) { row += String(empty); empty = 0; }
          row += PIECE_CHARS[p.c + p.t];
        }
      }
      if (empty) row += String(empty);
      rows.push(row);
    }
    var cr = '';
    if (pos.castling.wK) cr += 'K';
    if (pos.castling.wQ) cr += 'Q';
    if (pos.castling.bK) cr += 'k';
    if (pos.castling.bQ) cr += 'q';
    if (!cr) cr = '-';
    var ep = '-';
    if (pos.ep >= 0 && epIsLegal(pos, pos.ep)) ep = squareName(pos.ep);
    return rows.join('/') + ' ' + pos.turn + ' ' + cr + ' ' + ep;
  }

  function epIsLegal(pos, epSq) {
    var r = rankOf(epSq);
    var f = fileOf(epSq);
    if (pos.turn === 'w' && r === 5) {
      if (f > 0) {
        var p = pos.board[at(f - 1, 4)];
        if (p && p.t === 'p' && p.c === 'w') return true;
      }
      if (f < 7) {
        var q = pos.board[at(f + 1, 4)];
        if (q && q.t === 'p' && q.c === 'w') return true;
      }
    }
    if (pos.turn === 'b' && r === 2) {
      if (f > 0) {
        var p2 = pos.board[at(f - 1, 3)];
        if (p2 && p2.t === 'p' && p2.c === 'b') return true;
      }
      if (f < 7) {
        var q2 = pos.board[at(f + 1, 3)];
        if (q2 && q2.t === 'p' && q2.c === 'b') return true;
      }
    }
    return false;
  }

  function clone(pos) {
    var board = emptyBoard();
    for (var i = 0; i < 64; i++) board[i] = copyPiece(pos.board[i]);
    return {
      board: board,
      turn: pos.turn,
      castling: cloneCastle(pos.castling),
      ep: pos.ep,
      halfmove: pos.halfmove,
      fullmove: pos.fullmove,
      king: { w: pos.king.w, b: pos.king.b },
      seen: pos.seen.slice()
    };
  }

  function onBoard(f, r) {
    return f >= 0 && f < 8 && r >= 0 && r < 8;
  }

  function isAttacked(pos, sq, byColor) {
    var board = pos.board;
    var f = fileOf(sq);
    var r = rankOf(sq);
    var pawnRank = byColor === 'w' ? r - 1 : r + 1;
    if (pawnRank >= 0 && pawnRank < 8) {
      if (f > 0) {
        var lp = board[at(f - 1, pawnRank)];
        if (lp && lp.t === 'p' && lp.c === byColor) return true;
      }
      if (f < 7) {
        var rp = board[at(f + 1, pawnRank)];
        if (rp && rp.t === 'p' && rp.c === byColor) return true;
      }
    }
    var i, nf, nr, p;
    for (i = 0; i < 8; i++) {
      nf = f + KNIGHT_D[i][0];
      nr = r + KNIGHT_D[i][1];
      if (!onBoard(nf, nr)) continue;
      p = board[at(nf, nr)];
      if (p && p.t === 'n' && p.c === byColor) return true;
    }
    for (i = 0; i < 8; i++) {
      nf = f + KING_D[i][0];
      nr = r + KING_D[i][1];
      if (!onBoard(nf, nr)) continue;
      p = board[at(nf, nr)];
      if (p && p.t === 'k' && p.c === byColor) return true;
    }
    if (slideAttack(board, f, r, BISHOP_D, byColor, 'b')) return true;
    if (slideAttack(board, f, r, ROOK_D, byColor, 'r')) return true;
    return false;
  }

  function slideAttack(board, f, r, dirs, byColor, type) {
    for (var d = 0; d < dirs.length; d++) {
      var nf = f + dirs[d][0];
      var nr = r + dirs[d][1];
      while (onBoard(nf, nr)) {
        var p = board[at(nf, nr)];
        if (p) {
          if (p.c === byColor && (p.t === type || p.t === 'q')) return true;
          break;
        }
        nf += dirs[d][0];
        nr += dirs[d][1];
      }
    }
    return false;
  }

  function inCheck(pos, color) {
    var k = pos.king[color];
    if (k < 0) return false;
    return isAttacked(pos, k, opp(color));
  }

  function addMove(list, from, to, piece, captured, extra) {
    var move = {
      from: from,
      to: to,
      piece: piece.t,
      color: piece.c,
      capture: captured ? captured.t : null,
      promotion: null,
      castle: 0,
      ep: false
    };
    if (extra) {
      if (extra.promotion) move.promotion = extra.promotion;
      if (extra.castle) move.castle = extra.castle;
      if (extra.ep) move.ep = true;
    }
    list.push(move);
  }

  function addPawnPromotions(list, from, to, piece, captured) {
    var destRank = rankOf(to);
    if ((piece.c === 'w' && destRank === 7) || (piece.c === 'b' && destRank === 0)) {
      addMove(list, from, to, piece, captured, { promotion: 'q' });
      addMove(list, from, to, piece, captured, { promotion: 'r' });
      addMove(list, from, to, piece, captured, { promotion: 'b' });
      addMove(list, from, to, piece, captured, { promotion: 'n' });
    } else {
      addMove(list, from, to, piece, captured, null);
    }
  }

  function genPseudo(pos) {
    var list = [];
    var board = pos.board;
    var color = pos.turn;
    var dir = color === 'w' ? 1 : -1;
    var startRank = color === 'w' ? 1 : 6;
    var i, p, f, r, k, nf, nr, t, cap;

    for (i = 0; i < 64; i++) {
      p = board[i];
      if (!p || p.c !== color) continue;
      f = fileOf(i);
      r = rankOf(i);

      if (p.t === 'p') {
        nf = f;
        nr = r + dir;
        if (onBoard(nf, nr) && !board[at(nf, nr)]) {
          addPawnPromotions(list, i, at(nf, nr), p, null);
          if (r === startRank) {
            nr = r + dir * 2;
            if (onBoard(nf, nr) && !board[at(nf, nr)]) {
              addMove(list, i, at(nf, nr), p, null, null);
            }
          }
        }
        for (k = -1; k <= 1; k += 2) {
          nf = f + k;
          nr = r + dir;
          if (!onBoard(nf, nr)) continue;
          t = at(nf, nr);
          cap = board[t];
          if (cap && cap.c !== color) addPawnPromotions(list, i, t, p, cap);
          else if (!cap && t === pos.ep) addMove(list, i, t, p, { t: 'p', c: opp(color) }, { ep: true });
        }
      } else if (p.t === 'n') {
        for (k = 0; k < 8; k++) {
          nf = f + KNIGHT_D[k][0];
          nr = r + KNIGHT_D[k][1];
          if (!onBoard(nf, nr)) continue;
          t = at(nf, nr);
          cap = board[t];
          if (!cap || cap.c !== color) addMove(list, i, t, p, cap, null);
        }
      } else if (p.t === 'b' || p.t === 'r' || p.t === 'q') {
        var dirs = p.t === 'b' ? BISHOP_D : p.t === 'r' ? ROOK_D : KING_D;
        for (k = 0; k < dirs.length; k++) {
          nf = f + dirs[k][0];
          nr = r + dirs[k][1];
          while (onBoard(nf, nr)) {
            t = at(nf, nr);
            cap = board[t];
            if (!cap) addMove(list, i, t, p, null, null);
            else {
              if (cap.c !== color) addMove(list, i, t, p, cap, null);
              break;
            }
            nf += dirs[k][0];
            nr += dirs[k][1];
          }
        }
      } else if (p.t === 'k') {
        for (k = 0; k < 8; k++) {
          nf = f + KING_D[k][0];
          nr = r + KING_D[k][1];
          if (!onBoard(nf, nr)) continue;
          t = at(nf, nr);
          cap = board[t];
          if (!cap || cap.c !== color) addMove(list, i, t, p, cap, null);
        }
      }
    }

    genCastling(pos, list);
    return list;
  }

  function genCastling(pos, list) {
    var color = pos.turn;
    var kingSq = pos.king[color];
    if (kingSq < 0) return;
    var board = pos.board;
    var enemy = opp(color);
    if (inCheck(pos, color)) return;
    var rank = color === 'w' ? 0 : 7;
    var e = at(4, rank);
    if (kingSq !== e) return;
    var rook, i, sq;

    if ((color === 'w' && pos.castling.wK) || (color === 'b' && pos.castling.bK)) {
      rook = board[at(7, rank)];
      if (rook && rook.t === 'r' && rook.c === color && !board[at(5, rank)] && !board[at(6, rank)]) {
        if (!isAttacked(pos, at(5, rank), enemy) && !isAttacked(pos, at(6, rank), enemy)) {
          addMove(list, e, at(6, rank), board[e], null, { castle: 1 });
        }
      }
    }
    if ((color === 'w' && pos.castling.wQ) || (color === 'b' && pos.castling.bQ)) {
      rook = board[at(0, rank)];
      if (rook && rook.t === 'r' && rook.c === color && !board[at(1, rank)] && !board[at(2, rank)] && !board[at(3, rank)]) {
        if (!isAttacked(pos, at(3, rank), enemy) && !isAttacked(pos, at(2, rank), enemy)) {
          addMove(list, e, at(2, rank), board[e], null, { castle: -1 });
        }
      }
    }
  }

  function updateCastleRights(pos, from, to, piece, captured) {
    if (piece.t === 'k') {
      if (piece.c === 'w') { pos.castling.wK = false; pos.castling.wQ = false; }
      else { pos.castling.bK = false; pos.castling.bQ = false; }
    }
    if (piece.t === 'r') {
      if (from === 0) pos.castling.wQ = false;
      if (from === 7) pos.castling.wK = false;
      if (from === 56) pos.castling.bQ = false;
      if (from === 63) pos.castling.bK = false;
    }
    if (captured && captured.t === 'r') {
      if (to === 0) pos.castling.wQ = false;
      if (to === 7) pos.castling.wK = false;
      if (to === 56) pos.castling.bQ = false;
      if (to === 63) pos.castling.bK = false;
    }
  }

  function makeMove(pos, move) {
    var board = pos.board;
    var from = move.from;
    var to = move.to;
    var piece = board[from];
    var captured = board[to];
    var undo = {
      from: from,
      to: to,
      piece: copyPiece(piece),
      captured: copyPiece(captured),
      ep: pos.ep,
      castling: cloneCastle(pos.castling),
      halfmove: pos.halfmove,
      fullmove: pos.fullmove,
      king: { w: pos.king.w, b: pos.king.b },
      epCapSq: -1,
      rookFrom: -1,
      rookTo: -1,
      rookPiece: null,
      seenLen: pos.seen.length
    };

    board[from] = null;
    if (move.ep) {
      var capSq = move.color === 'w' ? to - 8 : to + 8;
      undo.captured = copyPiece(board[capSq]);
      undo.epCapSq = capSq;
      board[capSq] = null;
      captured = undo.captured;
    }

    if (move.promotion) {
      board[to] = { t: move.promotion, c: move.color };
    } else {
      board[to] = piece;
    }

    if (move.castle) {
      var rank = rankOf(from);
      if (move.castle === 1) {
        undo.rookFrom = at(7, rank);
        undo.rookTo = at(5, rank);
      } else {
        undo.rookFrom = at(0, rank);
        undo.rookTo = at(3, rank);
      }
      undo.rookPiece = copyPiece(board[undo.rookFrom]);
      board[undo.rookTo] = board[undo.rookFrom];
      board[undo.rookFrom] = null;
    }

    if (piece.t === 'k') pos.king[piece.c] = to;

    if (piece.t === 'p' && Math.abs(to - from) === 16) {
      pos.ep = (from + to) >> 1;
    } else {
      pos.ep = -1;
    }

    updateCastleRights(pos, from, to, piece, captured);

    if (piece.t === 'p' || captured) pos.halfmove = 0;
    else pos.halfmove += 1;
    if (pos.turn === 'b') pos.fullmove += 1;
    pos.turn = opp(pos.turn);
    pos.seen.push(key(pos));
    return undo;
  }

  function unmakeMove(pos, undo) {
    var board = pos.board;
    pos.turn = opp(pos.turn);
    pos.ep = undo.ep;
    pos.castling = undo.castling;
    pos.halfmove = undo.halfmove;
    pos.fullmove = undo.fullmove;
    pos.king = undo.king;
    pos.seen.length = undo.seenLen;

    if (undo.rookFrom >= 0) {
      board[undo.rookFrom] = undo.rookPiece;
      board[undo.rookTo] = null;
    }
    board[undo.from] = undo.piece;
    board[undo.to] = undo.epCapSq >= 0 ? null : undo.captured;
    if (undo.epCapSq >= 0) board[undo.epCapSq] = undo.captured;
  }

  function isLegalAfter(pos, move) {
    var color = pos.turn;
    var undo = makeMove(pos, move);
    var ok = !inCheck(pos, color);
    unmakeMove(pos, undo);
    return ok;
  }

  function moves(pos) {
    var pseudo = genPseudo(pos);
    var legal = [];
    for (var i = 0; i < pseudo.length; i++) {
      if (isLegalAfter(pos, pseudo[i])) legal.push(pseudo[i]);
    }
    return legal;
  }

  function apply(pos, move) {
    var next = clone(pos);
    makeMove(next, move);
    return next;
  }

  function moveKey(move) {
    return squareName(move.from) + squareName(move.to) + (move.promotion || '');
  }

  function findMove(pos, from, to, promotion) {
    var list = moves(pos);
    var found = null;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.from === from && m.to === to) {
        if (!m.promotion) return m;
        if (promotion && m.promotion === promotion) return m;
        if (!found) found = m;
      }
    }
    return found;
  }

  function parseUci(pos, uci) {
    if (!uci || uci.length < 4) return null;
    var from = parseSquare(uci.slice(0, 2));
    var to = parseSquare(uci.slice(2, 4));
    var promo = uci.length > 4 ? uci[4].toLowerCase() : null;
    return findMove(pos, from, to, promo);
  }

  function pieceLetter(t) {
    return { n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K', p: '' }[t] || '';
  }

  function san(pos, move) {
    if (move.castle === 1) {
      var s0 = 'O-O';
      return s0 + sanSuffix(pos, move);
    }
    if (move.castle === -1) {
      var s1 = 'O-O-O';
      return s1 + sanSuffix(pos, move);
    }
    var letter = pieceLetter(move.piece);
    var dest = squareName(move.to);
    var capture = move.capture || move.ep;
    var spec = '';
    if (move.piece === 'p') {
      if (capture) spec = FILES[fileOf(move.from)];
    } else {
      var others = [];
      var list = moves(pos);
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.from !== move.from && m.to === move.to && m.piece === move.piece && m.promotion === move.promotion) {
          others.push(m);
        }
      }
      if (others.length) {
        var sameFile = false;
        var sameRank = false;
        for (var j = 0; j < others.length; j++) {
          if (fileOf(others[j].from) === fileOf(move.from)) sameFile = true;
          if (rankOf(others[j].from) === rankOf(move.from)) sameRank = true;
        }
        if (!sameFile) spec = FILES[fileOf(move.from)];
        else if (!sameRank) spec = String(rankOf(move.from) + 1);
        else spec = FILES[fileOf(move.from)] + (rankOf(move.from) + 1);
      }
    }
    var text = letter + spec + (capture ? 'x' : '') + dest;
    if (move.promotion) text += '=' + pieceLetter(move.promotion);
    return text + sanSuffix(pos, move);
  }

  function sanSuffix(pos, move) {
    var next = apply(pos, move);
    var enemy = next.turn;
    var list = moves(next);
    if (list.length === 0 && inCheck(next, enemy)) return '#';
    if (inCheck(next, enemy)) return '+';
    return '';
  }

  function insufficientMaterial(pos) {
    var pieces = [];
    var bishops = [];
    for (var i = 0; i < 64; i++) {
      var p = pos.board[i];
      if (!p || p.t === 'k') continue;
      if (p.t === 'p' || p.t === 'r' || p.t === 'q') return false;
      pieces.push(p);
      if (p.t === 'b') bishops.push((fileOf(i) + rankOf(i)) & 1);
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (pieces[0].t === 'n' || pieces[0].t === 'b')) return true;
    if (pieces.length === 2 && pieces[0].t === 'b' && pieces[1].t === 'b' && bishops[0] === bishops[1]) return true;
    return false;
  }

  function countKey(pos, k) {
    var n = 0;
    for (var i = 0; i < pos.seen.length; i++) if (pos.seen[i] === k) n++;
    return n;
  }

  function isDraw(pos, legal) {
    if (pos.halfmove >= 100) return '五十回合';
    if (insufficientMaterial(pos)) return '子力不足';
    if (countKey(pos, key(pos)) >= 3) return '三次重复';
    if (legal && legal.length === 0 && !inCheck(pos, pos.turn)) return '逼和';
    return null;
  }

  function status(pos) {
    var legal = moves(pos);
    var check = inCheck(pos, pos.turn);
    if (legal.length === 0) {
      if (check) {
        return {
          state: 'checkmate',
          winner: opp(pos.turn),
          text: pos.turn === 'w' ? '将死 · 黑方胜' : '将死 · 白方胜',
          check: true,
          moves: legal
        };
      }
      return { state: 'draw', winner: null, text: '逼和', check: false, moves: legal };
    }
    var draw = isDraw(pos, legal);
    if (draw) return { state: 'draw', winner: null, text: '和棋 · ' + draw, check: check, moves: legal };
    return {
      state: 'playing',
      winner: null,
      text: check ? (pos.turn === 'w' ? '白方被将军' : '黑方被将军') : (pos.turn === 'w' ? '白方行棋' : '黑方行棋'),
      check: check,
      moves: legal
    };
  }

  function perft(pos, depth) {
    if (depth === 0) return 1;
    var list = moves(pos);
    if (depth === 1) return list.length;
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      var u = makeMove(pos, list[i]);
      n += perft(pos, depth - 1);
      unmakeMove(pos, u);
    }
    return n;
  }

  function material(pos) {
    var val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    var w = 0;
    var b = 0;
    var caps = { w: [], b: [] };
    var count = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    for (var i = 0; i < 64; i++) {
      var p = pos.board[i];
      if (!p || p.t === 'k') continue;
      count[p.c][p.t] += 1;
      if (p.c === 'w') w += val[p.t];
      else b += val[p.t];
    }
    var start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    var types = ['q', 'r', 'b', 'n', 'p'];
    for (var c = 0; c < 2; c++) {
      var color = c === 0 ? 'w' : 'b';
      var other = opp(color);
      for (var t = 0; t < types.length; t++) {
        var kind = types[t];
        var lost = start[kind] - count[other][kind];
        for (var n = 0; n < lost; n++) caps[color].push(kind);
      }
    }
    return { white: w, black: b, diff: w - b, captured: caps };
  }

  global.Chess = {
    START_FEN: START_FEN,
    create: createPosition,
    fromFen: fromFen,
    toFen: toFen,
    clone: clone,
    key: key,
    moves: moves,
    makeMove: makeMove,
    unmakeMove: unmakeMove,
    apply: apply,
    inCheck: inCheck,
    attacked: isAttacked,
    status: status,
    san: san,
    squareName: squareName,
    parseSquare: parseSquare,
    moveKey: moveKey,
    findMove: findMove,
    parseUci: parseUci,
    perft: perft,
    material: material,
    fileOf: fileOf,
    rankOf: rankOf
  };
})(typeof window !== 'undefined' ? window : global);
