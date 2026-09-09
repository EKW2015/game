'use strict';

var path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'js', 'chess.js'));
require(path.join(__dirname, '..', 'js', 'ai.js'));

var Chess = global.Chess;
var ChessAI = global.ChessAI;
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

function play(fen, ucis) {
  var pos = fen ? Chess.fromFen(fen) : Chess.create();
  (ucis || []).forEach(function (uci) {
    var mv = Chess.parseUci(pos, uci);
    assert(!!mv, 'legal ' + uci + ' in ' + Chess.toFen(pos));
    if (mv) pos = Chess.apply(pos, mv);
  });
  return pos;
}

function expectPerft(fen, depth, expected, label) {
  var pos = Chess.fromFen(fen);
  var n = Chess.perft(pos, depth);
  assert(n === expected, (label || fen) + ' perft(' + depth + ')=' + n + ' expected ' + expected);
}

var START = Chess.START_FEN;
expectPerft(START, 1, 20, 'start');
expectPerft(START, 2, 400, 'start');
expectPerft(START, 3, 8902, 'start');
expectPerft(START, 4, 197281, 'start');

var KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
expectPerft(KIWIPETE, 1, 48, 'kiwipete');
expectPerft(KIWIPETE, 2, 2039, 'kiwipete');
expectPerft(KIWIPETE, 3, 97862, 'kiwipete');

var POS3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
expectPerft(POS3, 1, 14, 'pos3');
expectPerft(POS3, 2, 191, 'pos3');
expectPerft(POS3, 3, 2812, 'pos3');
expectPerft(POS3, 4, 43238, 'pos3');

var POS4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
expectPerft(POS4, 1, 6, 'pos4');
expectPerft(POS4, 2, 264, 'pos4');
expectPerft(POS4, 3, 9467, 'pos4');

var pos = play(null, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
var st = Chess.status(pos);
assert(st.state === 'checkmate' && st.winner === 'b', 'fool mate');

pos = play(null, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1']);
assert(pos.board[Chess.parseSquare('g1')].t === 'k', 'castle king g1');
assert(pos.board[Chess.parseSquare('f1')].t === 'r', 'castle rook f1');
assert(Chess.san(play(null, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5']), Chess.parseUci(play(null, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5']), 'e1g1')) === 'O-O', 'SAN O-O');

pos = play(null, ['e2e4', 'e7e6', 'e4e5', 'd7d5']);
var ep = Chess.parseUci(pos, 'e5d6');
assert(!!ep && ep.ep, 'en passant e5xd6');
pos = Chess.apply(pos, ep);
assert(!pos.board[Chess.parseSquare('d5')], 'ep captured pawn gone');
assert(pos.board[Chess.parseSquare('d6')].t === 'p', 'ep pawn on d6');

pos = Chess.fromFen('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
var promo = Chess.parseUci(pos, 'e7e8q');
assert(!!promo && promo.promotion === 'q', 'promotion move');
pos = Chess.apply(pos, promo);
assert(pos.board[Chess.parseSquare('e8')].t === 'q', 'promoted to queen');

pos = Chess.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
st = Chess.status(pos);
assert(st.state === 'draw' && /逼和/.test(st.text), 'stalemate: ' + st.text);

pos = Chess.fromFen('8/8/8/8/8/8/8/4K2k w - - 0 1');
st = Chess.status(pos);
assert(st.state === 'draw' && /子力不足/.test(st.text), 'insufficient: ' + st.text);

pos = Chess.create();
assert(Chess.san(pos, Chess.parseUci(pos, 'e2e4')) === 'e4', 'SAN e4');
assert(Chess.moves(pos).length === 20, '20 opening moves');

var aiMove = ChessAI.choose(Chess.create(), 'easy');
assert(!!aiMove, 'AI returns a move');
assert(!!Chess.parseUci(Chess.create(), Chess.moveKey(aiMove)), 'AI move is legal');

var matePos = Chess.fromFen('6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1');
var mateMove = ChessAI.choose(matePos, 'medium');
assert(!!mateMove, 'AI finds a move in Q ending');
var after = Chess.apply(matePos, mateMove);
var afterStatus = Chess.status(after);
assert(
  afterStatus.state === 'checkmate' || Chess.inCheck(after, 'b') || mateMove.piece === 'q',
  'AI uses the queen in mate-ish position'
);

console.log('failed', failed);
if (failed) process.exit(1);
