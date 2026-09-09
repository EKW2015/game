(function (global) {
  'use strict';

  var U = global.Utils;

  var LIST = [
    { id: 'claw', name: '光明龙爪', group: 'soul', slot: 1, key: 'Digit1', hotkey: '1', cost: 70, cd: 2.4, color: '#f5c542', desc: '右爪凝聚金光，净化撕裂，克制黑暗' },
    { id: 'wings', name: '圣龙之翼', group: 'soul', slot: 2, key: 'Digit2', hotkey: '2', cost: 130, cd: 14, duration: 9, color: '#b44cff', desc: '光翼飞行，大幅加速，龙羽覆盖打击' },
    { id: 'roar', name: '光明龙啸', group: 'soul', slot: 3, key: 'Digit3', hotkey: '3', cost: 150, cd: 8, color: '#b44cff', desc: '龙吟音波，范围内眩晕致盲并削防' },
    { id: 'golden', name: '圣龙金身', group: 'soul', slot: 4, key: 'Digit4', hotkey: '4', cost: 210, cd: 16, duration: 6, color: '#222222', desc: '金纹龙鳞，免疫大部伤害与控制并反震' },
    { id: 'judgment', name: '光耀审判击', group: 'soul', slot: 5, key: 'Digit5', hotkey: '5', cost: 190, cd: 9, color: '#222222', desc: '锁定目标，天空光剑贯穿并灼烧生命' },
    { id: 'sunbeam', name: '追踪太阳神光', group: 'soul', slot: 6, key: 'Digit6', hotkey: '6', cost: 170, cd: 8, color: '#222222', desc: '金光光柱锁定后弯曲追踪直至命中' },
    { id: 'truebody', name: '光明圣龙真身', group: 'soul', slot: 7, key: 'Digit7', hotkey: '7', cost: 420, cd: 28, duration: 10, color: '#e23b3b', desc: '化身百米圣龙，全属性+300%，免疫伤害，前六魂技无消耗' },
    { id: 'punch', name: '圣龙爆破拳', group: 'self', slot: 1, key: 'KeyE', hotkey: 'E', cost: 55, cd: 2.8, color: '#ffd36a', desc: '拳中压缩圣力，命中二次金光爆炸' },
    { id: 'flash', name: '光影瞬步', group: 'self', slot: 2, key: 'KeyQ', hotkey: 'Q', cost: 40, cd: 3.2, color: '#fff4b0', desc: '光折射瞬移，原地残影迷惑敌人' },
    { id: 'tail', name: '圣龙摆尾', group: 'self', slot: 3, key: 'KeyR', hotkey: 'R', cost: 85, cd: 5.5, color: '#e8c35a', desc: '金龙尾横扫，击退周围敌人' },
    { id: 'shield', name: '光盾守护', group: 'self', slot: 4, key: 'KeyF', hotkey: 'F', cost: 95, cd: 10, duration: 5, color: '#ffe27a', desc: '双手合十，身前展开日轮金盾' },
    { id: 'needles', name: '光明龙针', group: 'self', slot: 5, key: 'KeyT', hotkey: 'T', cost: 75, cd: 6, color: '#fff1a8', desc: '金针点穴封穴，破防并短暂定身' },
    { id: 'swords', name: '御剑术·光芒', group: 'self', slot: 6, key: 'KeyY', hotkey: 'Y', cost: 115, cd: 7.5, color: '#f0d56a', desc: '魂力金剑在空中穿梭斩杀' },
    { id: 'skystrike', name: '圣龙破天击', group: 'self', slot: 7, key: 'KeyC', hotkey: 'C', cost: 230, cd: 14, color: '#ffcc55', desc: '化龙冲天再砸落，高额范围终结' },
    { id: 'rending', name: '圣龙裂空爪', group: 'bone', slot: 1, key: 'KeyZ', hotkey: 'Z', cost: 140, cd: 7, color: '#ffb347', desc: '九万年左臂骨：金龙爪刃远程撕裂' },
    { id: 'gravity', name: '太阳重力拳', group: 'bone', slot: 2, key: 'KeyX', hotkey: 'X', cost: 150, cd: 8, color: '#ff9a3c', desc: '九万年右臂骨：暴增力量，命中重力枷锁' },
    { id: 'domain', name: '圣龙主迹领域', group: 'domain', slot: 1, key: 'KeyV', hotkey: 'V', cost: 360, cd: 26, duration: 12, color: '#ffe9a0', desc: '千米金界。无徽章者光焰灼烧且属性-50%；有徽章者圣龙祝福' }
  ];

  var BY_ID = {};
  var BY_KEY = {};
  for (var i = 0; i < LIST.length; i++) {
    BY_ID[LIST[i].id] = LIST[i];
    BY_KEY[LIST[i].key] = LIST[i];
  }

  function soulFree(caster, skill) {
    return caster.buffs.trueBody > 0 && skill.group === 'soul' && skill.id !== 'truebody';
  }

  function pay(caster, skill) {
    if (soulFree(caster, skill)) return true;
    if (caster.soul < skill.cost) return false;
    caster.soul -= skill.cost;
    return true;
  }

  var Cast = {
    claw: function (ctx) {
      var c = ctx.caster;
      c.attackAnim = 0.28;
      ctx.game.addEffect({ type: 'claw', x: c.x, y: c.y, angle: c.angle, owner: c.id, life: 0.55 });
      ctx.game.addParticles(c.x, c.y, '#ffe27a', 22);
      ctx.game.hitCone(c, 58, 0.72, c.getAtk() * 1.35, {
        vsDark: true,
        knock: 140,
        purify: true
      });
    },
    wings: function (ctx) {
      var c = ctx.caster;
      c.applyBuff('wings', 9);
      ctx.game.addEffect({ type: 'wingsBurst', x: c.x, y: c.y, owner: c.id, life: 1.1 });
      ctx.game.addParticles(c.x, c.y, '#d9a0ff', 26);
    },
    roar: function (ctx) {
      var c = ctx.caster;
      ctx.game.addEffect({ type: 'roar', x: c.x, y: c.y, owner: c.id, life: 1.05, r: 110 });
      ctx.game.addParticles(c.x, c.y, '#fff4c0', 30);
      var foes = ctx.game.enemiesOf(c);
      for (var i = 0; i < foes.length; i++) {
        var e = foes[i];
        if (U.dist(c.x, c.y, e.x, e.y) > 110) continue;
        ctx.game.hurt(c, e, c.getAtk() * 0.85, { knock: 40 });
        e.applyBuff('stun', 1.6);
        e.applyBuff('blind', 2.4);
        e.applyBuff('defDown', 4);
      }
    },
    golden: function (ctx) {
      ctx.caster.applyBuff('golden', 6);
      ctx.game.addEffect({ type: 'golden', x: ctx.caster.x, y: ctx.caster.y, owner: ctx.caster.id, life: 1.2 });
      ctx.game.addParticles(ctx.caster.x, ctx.caster.y, '#ffd36a', 28);
    },
    judgment: function (ctx) {
      var t = ctx.target;
      if (!t) return;
      ctx.game.addProjectile({
        type: 'judgment',
        x: t.x,
        y: t.y,
        h: 160,
        vx: 0,
        vy: 0,
        vh: -220,
        life: 1.1,
        owner: ctx.caster.id,
        targetId: t.id,
        damage: ctx.caster.getAtk() * 2.2,
        penetrate: true,
        burn: 5,
        color: '#ffe27a',
        radius: 10
      });
    },
    sunbeam: function (ctx) {
      var t = ctx.target;
      if (!t) return;
      var c = ctx.caster;
      var a = U.angleTo(c.x, c.y, t.x, t.y);
      ctx.game.addProjectile({
        type: 'sunbeam',
        x: c.x + Math.cos(a) * 16,
        y: c.y + Math.sin(a) * 16,
        h: 18 + c.h,
        vx: Math.cos(a) * 320,
        vy: Math.sin(a) * 320,
        vh: 0,
        life: 2.4,
        owner: c.id,
        targetId: t.id,
        homing: 780,
        damage: c.getAtk() * 1.7,
        color: '#ffd36a',
        radius: 6
      });
    },
    truebody: function (ctx) {
      var c = ctx.caster;
      c.applyBuff('trueBody', 10);
      c.h = Math.max(c.h, 4);
      ctx.game.addEffect({ type: 'truebody', x: c.x, y: c.y, owner: c.id, life: 1.6 });
      ctx.game.addParticles(c.x, c.y, '#ff6b6b', 8);
    },
    punch: function (ctx) {
      var c = ctx.caster;
      c.attackAnim = 0.24;
      ctx.game.addEffect({ type: 'punch', x: c.x, y: c.y, angle: c.angle, owner: c.id, life: 0.35 });
      var hit = ctx.game.hitCone(c, 42, 0.55, c.getAtk() * 1.15, { knock: 90 });
      if (hit > 0) {
        var fx = c.x + Math.cos(c.angle) * 28;
        var fy = c.y + Math.sin(c.angle) * 28;
        ctx.game.addEffect({ type: 'burst', x: fx, y: fy, life: 0.4, r: 36 });
        ctx.game.aoe(c, fx, fy, 36, c.getAtk() * 0.7, { knock: 160 });
      }
    },
    flash: function (ctx) {
      var c = ctx.caster;
      ctx.game.addEffect({ type: 'afterimage', x: c.x, y: c.y, angle: c.angle, h: c.h, owner: c.id, life: 0.7 });
      var dist = 92;
      c.x += Math.cos(c.angle) * dist;
      c.y += Math.sin(c.angle) * dist;
      c.vx += Math.cos(c.angle) * 120;
      c.vy += Math.sin(c.angle) * 120;
      ctx.game.addEffect({ type: 'flash', x: c.x, y: c.y, life: 0.25 });
    },
    tail: function (ctx) {
      var c = ctx.caster;
      ctx.game.addEffect({ type: 'tail', x: c.x, y: c.y, owner: c.id, life: 0.45, r: 70 });
      ctx.game.aoe(c, c.x, c.y, 70, c.getAtk() * 1.05, { knock: 280 });
    },
    shield: function (ctx) {
      ctx.caster.applyBuff('shield', 5);
      ctx.game.addEffect({ type: 'shield', x: ctx.caster.x, y: ctx.caster.y, owner: ctx.caster.id, life: 0.5 });
    },
    needles: function (ctx) {
      var c = ctx.caster;
      var t = ctx.target;
      var a = t ? U.angleTo(c.x, c.y, t.x, t.y) : c.angle;
      for (var i = 0; i < 9; i++) {
        var spread = (i - 4) * 0.07;
        var ang = a + spread;
        ctx.game.addProjectile({
          type: 'needle',
          x: c.x + Math.cos(ang) * 10,
          y: c.y + Math.sin(ang) * 10,
          h: 12 + c.h,
          vx: Math.cos(ang) * 420,
          vy: Math.sin(ang) * 420,
          vh: 0,
          life: 1.1,
          owner: c.id,
          damage: c.getAtk() * 0.28,
          seal: 1.4,
          defDown: 3.5,
          color: '#fff4c0',
          radius: 2.2
        });
      }
    },
    swords: function (ctx) {
      var c = ctx.caster;
      for (var i = 0; i < 5; i++) {
        ctx.game.addProjectile({
          type: 'sword',
          x: c.x,
          y: c.y,
          h: 22 + i * 4 + c.h,
          vx: 0,
          vy: 0,
          vh: 0,
          life: 3.2,
          owner: c.id,
          delay: 0.18 * i,
          homing: 520,
          damage: c.getAtk() * 0.72,
          color: '#ffe27a',
          radius: 4,
          orbit: true
        });
      }
    },
    skystrike: function (ctx) {
      var c = ctx.caster;
      var t = ctx.target;
      var tx = t ? t.x : c.x + Math.cos(c.angle) * 140;
      var ty = t ? t.y : c.y + Math.sin(c.angle) * 140;
      c.castLock = 1.15;
      ctx.game.addEffect({
        type: 'skystrike',
        x: c.x,
        y: c.y,
        tx: tx,
        ty: ty,
        owner: c.id,
        life: 1.15,
        phase: 0
      });
      c.h = 70;
      c.x = tx;
      c.y = ty;
      ctx.game.aoe(c, tx, ty, 95, c.getAtk() * 2.4, { knock: 320 });
    },
    rending: function (ctx) {
      var c = ctx.caster;
      var a = c.angle;
      ctx.game.addProjectile({
        type: 'blade',
        x: c.x + Math.cos(a) * 18,
        y: c.y + Math.sin(a) * 18,
        h: 14 + c.h,
        vx: Math.cos(a) * 480,
        vy: Math.sin(a) * 480,
        vh: 0,
        life: 1.3,
        owner: c.id,
        damage: c.getAtk() * 1.9,
        color: '#ffd36a',
        radius: 8,
        pierce: 4
      });
    },
    gravity: function (ctx) {
      var c = ctx.caster;
      c.attackAnim = 0.3;
      ctx.game.addEffect({ type: 'gravity', x: c.x, y: c.y, angle: c.angle, owner: c.id, life: 0.4 });
      var foes = ctx.game.hitConeUnits(c, 40, 0.5);
      for (var i = 0; i < foes.length; i++) {
        ctx.game.hurt(c, foes[i], c.getAtk() * 1.6, { knock: 40 });
        foes[i].applyBuff('gravity', 3.2);
      }
    },
    domain: function (ctx) {
      var c = ctx.caster;
      ctx.game.startDomain(c, 12, 280);
    }
  };

  global.Skills = {
    list: LIST,
    byId: BY_ID,
    byKey: BY_KEY,
    soulFree: soulFree,
    pay: pay,
    cast: Cast
  };
})(window);
