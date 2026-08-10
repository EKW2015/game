(function (global) {
  'use strict';

  var U = global.Utils;

  function nearest(dino, others, skipPlayer) {
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (!o.alive || o.id === dino.id) continue;
      if (skipPlayer && o.isPlayer) continue;
      var d = U.dist(dino.x, dino.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return { target: best, dist: bestD };
  }

  function updateAI(dino, others, dt, ctx) {
    if (!dino.alive || dino.isPlayer) return;

    ctx = ctx || {};
    var inGrace = ctx.playTime != null && ctx.playTime < (ctx.graceTime || 0);

    // 简单模式：保护期内只漫游，不攻击
    if (inGrace) {
      dino.wanderAngle += U.rand(-0.6, 0.6) * dt;
      var wx = dino.x + Math.cos(dino.wanderAngle) * 200;
      var wy = dino.y + Math.sin(dino.wanderAngle) * 200;
      dino.moveToward(wx, wy, 0.2, dt);
      return { action: 'grace' };
    }

    // 简单模式：AI 基本无视玩家，只互相打闹
    var hunt = nearest(dino, others, true);
    var target = hunt.target;
    var biteRange = dino.biteReach() + (target ? target.radius : 0);

    if (target) {
      var canEat = dino.canEat(target);
      var ratio = dino.eatRatio(target);
      var similar = ratio > 0.75 && ratio < 1.12;

      if (canEat && hunt.dist < dino.radius + target.radius + 30) {
        dino.moveToward(target.x, target.y, 0.6, dt);
        if (hunt.dist < biteRange && dino.tryBite()) {
          return { action: 'bite', target: target };
        }
        return { action: 'chase', target: target };
      }

      if (target.canEat(dino) && hunt.dist < target.radius * 2) {
        var fleeX = dino.x + (dino.x - target.x);
        var fleeY = dino.y + (dino.y - target.y);
        dino.moveToward(fleeX, fleeY, 0.8, dt);
        return { action: 'flee', target: target };
      }

      if (similar && hunt.dist < dino.radius * 3 && Math.random() < 0.008) {
        if (hunt.dist < biteRange && dino.tryBite()) {
          return { action: 'bite', target: target };
        }
      }
    }

    dino.wanderAngle += U.rand(-0.8, 0.8) * dt;
    var wanderX = dino.x + Math.cos(dino.wanderAngle) * 200;
    var wanderY = dino.y + Math.sin(dino.wanderAngle) * 200;
    dino.moveToward(wanderX, wanderY, 0.22, dt);
    return { action: 'wander' };
  }

  global.AI = { update: updateAI };
})(window);
