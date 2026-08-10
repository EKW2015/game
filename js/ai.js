(function (global) {
  'use strict';

  var U = global.Utils;

  function nearest(dino, others) {
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (!o.alive || o.id === dino.id) continue;
      var d = U.dist(dino.x, dino.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return { target: best, dist: bestD };
  }

  function updateAI(dino, others, dt) {
    if (!dino.alive || dino.isPlayer) return;

    var hunt = nearest(dino, others);
    var target = hunt.target;
    var biteRange = dino.biteReach() + (target ? target.radius : 0);

    if (target) {
      var ratio = dino.eatRatio(target);
      var canEat = dino.canEat(target);
      var similar = ratio > 0.75 && ratio < 1.12;

      if (canEat && hunt.dist < dino.radius + target.radius + 30) {
        dino.moveToward(target.x, target.y, 1, dt);
        if (hunt.dist < biteRange && dino.tryBite()) {
          return { action: 'bite', target: target };
        }
        return { action: 'chase', target: target };
      }

      if (target.canEat(dino) && hunt.dist < target.radius * 3) {
        var fleeX = dino.x + (dino.x - target.x);
        var fleeY = dino.y + (dino.y - target.y);
        dino.moveToward(fleeX, fleeY, 1.1, dt);
        return { action: 'flee', target: target };
      }

      if (similar && hunt.dist < dino.radius * 4) {
        if (hunt.dist < biteRange && dino.tryBite()) {
          return { action: 'bite', target: target };
        }
        if (Math.random() < 0.02) dino.moveToward(target.x, target.y, 0.7, dt);
        else dino.wanderAngle += U.rand(-0.8, 0.8) * dt;
        return { action: 'fight', target: target };
      }
    }

    // 漫游
    dino.wanderAngle += U.rand(-1, 1) * dt;
    var wx = dino.x + Math.cos(dino.wanderAngle) * 200;
    var wy = dino.y + Math.sin(dino.wanderAngle) * 200;
    dino.moveToward(wx, wy, 0.35, dt);
    return { action: 'wander' };
  }

  global.AI = { update: updateAI };
})(window);
