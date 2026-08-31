/**
 * 八球规则：开球、花色分配、犯规、胜负。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  var SOLIDS = [1, 2, 3, 4, 5, 6, 7];
  var STRIPES = [9, 10, 11, 12, 13, 14, 15];

  function remaining(balls, group) {
    var i, n = 0, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed || b.group !== group) continue;
      n++;
    }
    return n;
  }

  function ballById(balls, id) {
    var i;
    for (i = 0; i < balls.length; i++) if (balls[i].id === id) return balls[i];
    return null;
  }

  function legalGroup(state, player) {
    if (state.openTable) return null;
    return state.assignment[player];
  }

  function remainingAtStart(balls, group, pocketed) {
    var n = remaining(balls, group);
    var i, b;
    for (i = 0; i < (pocketed || []).length; i++) {
      b = pocketed[i];
      if (b.group === group) n++;
    }
    return n;
  }

  function ballGroupLegal(state, player, ball) {
    if (!ball || ball.group === 'cue') return false;
    if (ball.group === 'eight') {
      var g = legalGroup(state, player);
      if (state.openTable) return false;
      return !!(g && remaining(state.balls, g) === 0);
    }
    if (state.openTable) return ball.group === 'solid' || ball.group === 'stripe';
    return ball.group === legalGroup(state, player);
  }

  function isLegalTarget(state, player, ball) {
    if (!ball || ball.pocketed) return false;
    return ballGroupLegal(state, player, ball);
  }

  function summarizeShot(state, shot) {
    /* shot: { firstHit, pocketed: Ball[], cuePocketed, scratchPlacement } */
    var player = state.turn;
    var pocketed = shot.pocketed || [];
    var cueIn = shot.cuePocketed;
    var first = shot.firstHit;
    var eightIn = false;
    var ownIn = false;
    var anyObj = false;
    var i, b, g, foul, reason, win, lose;

    for (i = 0; i < pocketed.length; i++) {
      b = pocketed[i];
      if (b.group === 'cue') continue;
      anyObj = true;
      if (b.group === 'eight') eightIn = true;
      else if (state.openTable && (b.group === 'solid' || b.group === 'stripe')) ownIn = true;
      else if (b.group === legalGroup(state, player)) ownIn = true;
    }

    var ownGroup = legalGroup(state, player);
    var ownLeft = ownGroup ? remainingAtStart(state.balls, ownGroup, pocketed) : 99;

    foul = false;
    reason = '';
    if (cueIn) {
      foul = true;
      reason = '白球入袋';
    } else if (!first) {
      foul = true;
      reason = '没有碰到任何球';
    } else if (first.group === 'eight') {
      if (state.openTable || ownLeft > 0) {
        foul = true;
        reason = '还有目标球时先碰到了 8 号';
      }
    } else if (!ballGroupLegal(state, player, first)) {
      foul = true;
      reason = '先碰到了对方的球';
    }

    win = false;
    lose = false;
    if (eightIn) {
      g = ownGroup;
      if (foul || state.openTable || !g || ownLeft > 0) {
        lose = true;
        reason = reason ? reason + '，8 号入袋判负' : '8 号过早入袋';
      } else {
        win = true;
      }
    }

    return {
      foul: foul,
      reason: reason,
      win: win,
      lose: lose,
      ownIn: ownIn && !foul && !eightIn,
      anyObj: anyObj,
      eightIn: eightIn,
      cueIn: cueIn,
      first: first
    };
  }

  function applyGroups(state, pocketed, player) {
    var i, b;
    if (!state.openTable) return;
    for (i = 0; i < pocketed.length; i++) {
      b = pocketed[i];
      if (b.group !== 'solid' && b.group !== 'stripe') continue;
      state.openTable = false;
      state.assignment[player] = b.group;
      state.assignment[1 - player] = b.group === 'solid' ? 'stripe' : 'solid';
      return;
    }
  }

  function groupLabel(g) {
    if (g === 'solid') return '全色';
    if (g === 'stripe') return '花色';
    if (g === 'eight') return '8 号';
    return '开球自由';
  }

  Pool.Rules = {
    SOLIDS: SOLIDS,
    STRIPES: STRIPES,
    remaining: remaining,
    remainingAtStart: remainingAtStart,
    ballById: ballById,
    legalGroup: legalGroup,
    ballGroupLegal: ballGroupLegal,
    isLegalTarget: isLegalTarget,
    summarizeShot: summarizeShot,
    applyGroups: applyGroups,
    groupLabel: groupLabel
  };
})(typeof window !== 'undefined' ? window : global);
