(function (global) {
  'use strict';

  var U = global.Utils;

  function nearestEnemy(unit, others) {
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (!o.alive || o.id === unit.id) continue;
      if (o.team === unit.team) continue;
      var d = U.dist(unit.x, unit.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return { target: best, dist: bestD };
  }

  function updateAI(unit, others, dt, ctx) {
    if (!unit.alive || unit.isPlayer) return;
    if (unit.buffs.stun > 0) return { action: 'stun' };

    ctx = ctx || {};
    var hunt = nearestEnemy(unit, others);
    var target = hunt.target;
    var range = unit.attackReach() + (target ? target.radius : 0);

    if (unit.isAlly && ctx.player) {
      var pd = U.dist(unit.x, unit.y, ctx.player.x, ctx.player.y);
      if (pd > 220) {
        unit.moveToward(ctx.player.x, ctx.player.y, 0.7, dt);
        return { action: 'follow' };
      }
    }

    if (unit.buffs.gravity > 0) {
      return { action: 'heavy' };
    }

    if (target && hunt.dist < 260) {
      if (unit.buffs.blind > 0 && Math.random() < 0.45) {
        unit.wanderAngle += U.rand(-1, 1) * dt;
        unit.moveToward(
          unit.x + Math.cos(unit.wanderAngle) * 80,
          unit.y + Math.sin(unit.wanderAngle) * 80,
          0.35,
          dt
        );
        return { action: 'blind' };
      }

      if (hunt.dist > range * 0.85) {
        unit.moveToward(target.x, target.y, 0.72, dt);
        return { action: 'chase', target: target };
      }
      unit.angle = U.angleTo(unit.x, unit.y, target.x, target.y);
      if (unit.tryAttack()) return { action: 'attack', target: target };
      return { action: 'engage', target: target };
    }

    if (unit.isAlly && ctx.player) {
      var ax = ctx.player.x + Math.cos(unit.wanderAngle) * 50;
      var ay = ctx.player.y + Math.sin(unit.wanderAngle) * 50;
      unit.wanderAngle += dt * 0.4;
      unit.moveToward(ax, ay, 0.28, dt);
      return { action: 'guard' };
    }

    unit.wanderAngle += U.rand(-0.8, 0.8) * dt;
    unit.moveToward(
      unit.x + Math.cos(unit.wanderAngle) * 180,
      unit.y + Math.sin(unit.wanderAngle) * 180,
      0.22,
      dt
    );
    return { action: 'wander' };
  }

  global.AI = { update: updateAI };
})(window);
