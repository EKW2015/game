(function (global) {
  'use strict';

  var U = global.Utils;

  var RANGED = [
    'phoenixMeteor', 'ring5', 'ring6', 'ring1', 'shadowStrike', 'bladeStorm',
    'iceVines', 'fireCage', 'absoluteZero', 'mammothStomp', 'ring3', 'ring2'
  ];
  var CLOSE = [
    'ring3', 'mammothStomp', 'absoluteZero', 'bladeStorm', 'ring1',
    'shadowStrike', 'iceVines', 'fireCage', 'custom3'
  ];

  function skillReady(dino, sid) {
    var data = global.SKILLS_DATA && global.SKILLS_DATA[sid];
    if (!data) return false;
    if ((dino.cooldowns[sid] || 0) > 0) return false;
    var cost = data.cost;
    if (dino.avatarMode && data.type === 'ring' && sid !== 'ring7' && sid !== 'trueBody') cost = 0;
    return dino.mp >= cost;
  }

  function pickSkill(dino, mem, dist, biteRange) {
    var skills = (mem && mem.skills) ? mem.skills : [];
    var hpRatio = dino.maxHp > 0 ? dino.hp / dino.maxHp : 1;
    var i;
    var sid;

    if (!dino.avatarMode && hpRatio < 0.78) {
      if (skillReady(dino, 'trueBody')) return 'trueBody';
      if (skillReady(dino, 'ring7')) return 'ring7';
    }
    if (hpRatio < 0.42) {
      if (skillReady(dino, 'goldShield')) return 'goldShield';
      if (skillReady(dino, 'emeraldWave')) return 'emeraldWave';
      if (skillReady(dino, 'ring4')) return 'ring4';
      if (skillReady(dino, 'lifeDomain')) return 'lifeDomain';
    }
    if (dino.mp < dino.maxMp * 0.28 && skillReady(dino, 'mpSurge')) return 'mpSurge';

    var pool = dist > biteRange * 1.12 ? RANGED : CLOSE;
    for (i = 0; i < pool.length; i++) {
      sid = pool[i];
      if (skills.indexOf(sid) >= 0 && skillReady(dino, sid)) return sid;
    }
    for (i = 0; i < skills.length; i++) {
      sid = skills[i];
      if (sid === 'trueBody' || sid === 'ring7' || sid === 'purify') continue;
      if (skillReady(dino, sid)) return sid;
    }
    return null;
  }

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

      var tx = player.x;
      var ty = player.y;
      dino._strafeT = (dino._strafeT || 0) + dt;
      if (dino._strafeT > 0.65) {
        dino._strafeT = 0;
        dino._strafe = (Math.random() < 0.5 ? 1 : -1) * (18 + Math.random() * 16);
      }
      if (distToPlayer < 110 && distToPlayer > 22) {
        var side = U.angleTo(dino.x, dino.y, player.x, player.y) + Math.PI * 0.5;
        tx += Math.cos(side) * (dino._strafe || 0);
        ty += Math.sin(side) * (dino._strafe || 0);
      }
      dino.moveToward(tx, ty, distToPlayer > biteRange ? 1.12 : 0.95, dt);

      if (distToPlayer < biteRange && dino.tryBite()) {
        return { action: 'bite', target: player };
      }

      dino.aiTimer = (dino.aiTimer || 0) - dt;
      if (ctx.skills && dino.aiTimer <= 0) {
        var mem = ctx.enemyMember;
        var sid = pickSkill(dino, mem, distToPlayer, biteRange);
        if (sid) {
          ctx.skills.castSkill(sid, dino, { silentFail: true });
          dino.aiTimer = 0.42;
        } else {
          dino.aiTimer = 0.08;
        }
      }
      return { action: 'chase', target: player };
    }

    return { action: 'idle' };
  }

  global.AI = { update: updateAI, pickSkill: pickSkill, skillReady: skillReady };
})(window);
