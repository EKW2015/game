(function (global) {
  'use strict';

  var U = global.Utils;

  function updateAI(dino, others, dt, ctx) {
    if (!dino.alive || dino.isPlayer) return;

    if (dino.stunned > 0) return { action: 'stunned' };

    ctx = ctx || {};
    var player = ctx.player;
    var inGrace = ctx.playTime != null && ctx.playTime < (ctx.graceTime || 0);

    if (inGrace) {
      dino.wanderAngle += U.rand(-0.4, 0.4) * dt;
      return { action: 'grace' };
    }

    if (player && player.alive) {
      var distToPlayer = U.dist(dino.x, dino.y, player.x, player.y);
      var biteRange = dino.biteReach() + player.radius * 0.7;
      dino.moveToward(player.x, player.y, 0.82, dt);
      if (distToPlayer < biteRange && dino.tryBite()) {
        return { action: 'bite', target: player };
      }
      if (ctx.skills && dino.characterId && Math.random() < 0.012) {
        var mem = ctx.enemyMember;
        if (mem && mem.skills && mem.skills.length) {
          var sid = mem.skills[0];
          var canTrue = mem.skills.indexOf('trueBody') >= 0 || mem.skills.indexOf('ring7') >= 0;
          if (!dino.avatarMode && canTrue && dino.hp < dino.maxHp * 0.5 && Math.random() < 0.45) {
            sid = mem.skills.indexOf('ring7') >= 0 ? 'ring7' : 'trueBody';
          }
          ctx.skills.castSkill(sid, dino);
        }
      }
      return { action: 'chase', target: player };
    }

    return { action: 'idle' };
  }

  global.AI = { update: updateAI };
})(window);
