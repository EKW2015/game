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

    // 被眩晕状态无法行动
    if (dino.stunned > 0) return { action: 'stunned' };

    ctx = ctx || {};
    var player = ctx.player;

    // 魂兽AI：如果玩家距离较近且在视野中，主动扑杀玩家或逃跑
    if (player && player.alive) {
      var distToPlayer = U.dist(dino.x, dino.y, player.x, player.y);
      var biteRange = dino.biteReach() + player.radius * 0.7;

      // 如果玩家开启了【光明圣龙真身】或者圣龙金身，弱小魂兽本能恐惧逃窜！
      if (player.avatarMode || player.goldBodyActive) {
        var fearX = dino.x + (dino.x - player.x);
        var fearY = dino.y + (dino.y - player.y);
        dino.moveToward(fearX, fearY, 0.9, dt);
        return { action: 'flee', target: player };
      }

      // 否则在攻击范围内进行扑咬
      if (distToPlayer < 260) {
        dino.moveToward(player.x, player.y, 0.75, dt);
        if (distToPlayer < biteRange && dino.tryBite()) {
          return { action: 'bite', target: player };
        }
        return { action: 'chase', target: player };
      }
    }

    // 魂兽之间日常游荡
    dino.wanderAngle += U.rand(-0.6, 0.6) * dt;
    var wanderX = dino.x + Math.cos(dino.wanderAngle) * 200;
    var wanderY = dino.y + Math.sin(dino.wanderAngle) * 200;
    dino.moveToward(wanderX, wanderY, 0.25, dt);
    return { action: 'wander' };
  }

  global.AI = { update: updateAI };
})(window);
