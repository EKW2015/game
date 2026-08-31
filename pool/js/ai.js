/**
 * 简单电脑瞄准：找最直的进袋线路，带一点误差。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  function ghostForPocket(ball, pocket) {
    var to = Pool.sub(pocket, ball);
    var n = Pool.norm(to);
    if (Pool.len(to) < 1) return null;
    return {
      x: ball.x - n.x * (ball.r * 2.02),
      y: ball.y - n.y * (ball.r * 2.02),
      dir: n,
      dist: Pool.len(to)
    };
  }

  function pickShot(state) {
    var cue = Pool.Rules.ballById(state.balls, 0);
    var balls = state.balls;
    var i, j, b, g, ghost, score, best = null, aim, power, jitter, toGhost, dn;
    if (!cue || cue.pocketed) return null;

    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (!Pool.Rules.isLegalTarget(state, state.turn, b)) continue;
      for (j = 0; j < Pool.POCKETS.length; j++) {
        g = Pool.POCKETS[j];
        ghost = ghostForPocket(b, g);
        if (!ghost) continue;
        if (ghost.x < b.r + 2 || ghost.x > Pool.TW - b.r - 2) continue;
        if (ghost.y < b.r + 2 || ghost.y > Pool.TH - b.r - 2) continue;
        if (!Pool.pathClear(balls, b, g, b, cue, b.r * 0.92)) continue;
        if (!Pool.pathClear(balls, cue, ghost, cue, b, cue.r * 0.95)) continue;
        toGhost = Pool.sub(ghost, cue);
        if (Pool.len(toGhost) < 8) continue;
        dn = Pool.norm(toGhost);
        score = 1200 - ghost.dist - Pool.len(toGhost) * 0.35;
        score += Pool.dot(dn, ghost.dir) * 260;
        if (b.group === 'eight') score += 40;
        if (!best || score > best.score) {
          best = { score: score, ghost: ghost, ball: b, toGhost: toGhost };
        }
      }
    }

    if (!best) {
      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        if (!Pool.Rules.isLegalTarget(state, state.turn, b)) continue;
        toGhost = Pool.sub(b, cue);
        if (Pool.len(toGhost) < 1) continue;
        best = { score: 0, ghost: b, ball: b, toGhost: toGhost, dump: true };
        break;
      }
    }
    if (!best) return null;

    aim = Pool.norm(best.toGhost);
    jitter = (state.aiLevel || 0.18);
    aim = Pool.norm({
      x: aim.x + (Math.random() - 0.5) * jitter,
      y: aim.y + (Math.random() - 0.5) * jitter
    });
    power = best.dump ? 420 : Pool.clamp(220 + best.ghost.dist * 0.55, 260, 720);
    power *= 0.88 + Math.random() * 0.18;
    return { ax: aim.x, ay: aim.y, power: power };
  }

  Pool.AI = { pickShot: pickShot };
})(typeof window !== 'undefined' ? window : global);
