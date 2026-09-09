/**
 * 斗罗大陆：魂师（光明圣龙）与魂兽角色实体类
 */
(function (global) {
  'use strict';

  var U = global.Utils;

  function SoulEntity(opts) {
    this.id = opts.id;
    this.isPlayer = !!opts.isPlayer;
    this.name = opts.name || (this.isPlayer ? '圣龙斗罗' : '星斗魂兽');
    this.martialSoul = opts.martialSoul || (this.isPlayer ? '光明圣龙' : '暗夜魔兽');
    this.beastType = opts.beastType || 'tiger';

    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = opts.angle || 0;

    // 魂力境界与属性
    this.level = opts.level || (this.isPlayer ? 78 : 55); // 七环魂圣
    this.title = U.getTitleByLevel(this.level);
    this.maxHp = opts.hp || (this.isPlayer ? 2400 : 1200);
    this.hp = this.maxHp;
    this.maxMp = opts.mp || (this.isPlayer ? 1000 : 500); // 魂力值 (MP)
    this.mp = this.maxMp;

    this.attack = opts.attack || (this.isPlayer ? 180 : 90);
    this.defense = opts.defense || (this.isPlayer ? 120 : 60);
    this.radius = opts.radius || (this.isPlayer ? 32 : 28);

    this.alive = true;
    this.kills = 0;
    this.biteCooldown = 0;
    this.biteAnim = 0;
    this.wanderAngle = U.rand(0, Math.PI * 2);
    this.domainBlessing = false;
    this._credited = false;

    // 状态标记
    this.isFlying = false;        // 圣龙之翼飞行中
    this.flightTime = 0;
    this.goldBodyActive = false;   // 圣龙金身 (免伤 + 反弹)
    this.goldBodyTime = 0;
    this.avatarMode = false;       // 武魂真身：人形魂师化作武魂本体
    this.avatarTime = 0;
    this.shieldActive = false;     // 光盾守护
    this.shieldHp = 0;

    // 减益与控制状态
    this.stunned = 0;              // 眩晕时间
    this.blinded = 0;              // 失明时间
    this.heavyDebuff = 0;          // 太阳重力拳减速/定身
    this.domainDebuff = false;     // 处于敌对领域属性减半
    this.domainBurnTime = 0;       // 圣龙火焰灼烧
    this.hasBadge = this.isPlayer; // 圣龙徽章持有者（免疫领域伤害，获圣龙祝福）

    // 技能冷却记录
    this.cooldowns = {};
    this.fighterKind = opts.fighterKind || (this.isPlayer ? 'dragon' : 'tiger');
    this.characterId = opts.characterId || '';
    this.kit = opts.kit || 'full';
    this.ringText = opts.ringText || '黄 紫 紫 黑 黑 黑 红';
    this.role = opts.role || '';
    this.uniform = opts.uniform || '';
  }

  SoulEntity.prototype.getSpeed = function () {
    var base = this.isPlayer ? 180 : 110;
    if (this.avatarMode) base *= 1.6;
    if (this.isFlying) base *= 1.8;
    if (this.heavyDebuff > 0) base *= 0.35; // 太阳重力拳：身体瞬间变沉重
    if (this.domainDebuff) base *= 0.5;   // 圣龙领域：所有属性削弱一半
    if (this.stunned > 0) return 0;
    return base;
  };

  SoulEntity.prototype.getEffectiveAttack = function () {
    var atk = this.attack;
    if (this.avatarMode) atk *= 4.0; // 全属性暴增300% (即4倍)
    if (this.domainDebuff) atk *= 0.5;
    if (this.hasBadge && this.domainBlessing) atk *= 1.3; // 圣龙祝福 全属性提升30%
    return atk;
  };

  SoulEntity.prototype.getEffectiveDefense = function () {
    var def = this.defense;
    if (this.avatarMode) def *= 4.0;
    if (this.goldBodyActive) def *= 99.0; // 圣龙金身免伤
    if (this.domainDebuff) def *= 0.5;
    if (this.hasBadge && this.domainBlessing) def *= 1.3;
    return def;
  };

  SoulEntity.prototype.moveToward = function (tx, ty, power, dt) {
    if (this.stunned > 0) return;
    var a = U.angleTo(this.x, this.y, tx, ty);
    this.angle = a;
    var spd = this.getSpeed() * power;
    this.vx += Math.cos(a) * spd * dt * 4;
    this.vy += Math.sin(a) * spd * dt * 4;
  };

  SoulEntity.prototype.applyFriction = function (dt) {
    var drag = Math.pow(0.1, dt);
    this.vx *= drag;
    this.vy *= drag;
    var max = this.getSpeed() * 1.2;
    var v = Math.hypot(this.vx, this.vy);
    if (v > max) {
      this.vx = (this.vx / v) * max;
      this.vy = (this.vy / v) * max;
    }
  };

  SoulEntity.prototype.updateMotion = function (world, dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (Math.hypot(this.vx, this.vy) > 10) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    if (this.biteCooldown > 0) this.biteCooldown -= dt;
    if (this.biteAnim > 0) this.biteAnim -= dt;
    if (this.stunned > 0) this.stunned -= dt;
    if (this.blinded > 0) this.blinded -= dt;
    if (this.heavyDebuff > 0) this.heavyDebuff -= dt;

    // 飞行时间倒计时
    if (this.isFlying) {
      this.flightTime -= dt;
      if (this.flightTime <= 0) this.isFlying = false;
    }

    // 金身时间
    if (this.goldBodyActive) {
      this.goldBodyTime -= dt;
      if (this.goldBodyTime <= 0) this.goldBodyActive = false;
    }

    // 真身时间
    if (this.avatarMode) {
      this.avatarTime -= dt;
      if (this.avatarTime <= 0) this.avatarMode = false;
    }

    // 冷却倒计时更新
    for (var k in this.cooldowns) {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] -= dt;
        if (this.cooldowns[k] < 0) this.cooldowns[k] = 0;
      }
    }

    // 魂力被动自然恢复
    if (this.alive && this.mp < this.maxMp) {
      var regen = 15;
      if (this.hasBadge && this.domainBlessing) regen += 45; // 领域内圣龙祝福：魂力持续快速恢复
      this.mp = Math.min(this.maxMp, this.mp + regen * dt);
    }
  };

  SoulEntity.prototype.tryBite = function () {
    if (this.biteCooldown > 0 || this.stunned > 0) return false;
    this.biteCooldown = 0.35;
    this.biteAnim = 0.18;
    return true;
  };

  SoulEntity.prototype.biteReach = function () {
    return this.radius * (this.avatarMode ? 2.5 : 1.6);
  };

  SoulEntity.prototype.biteDamage = function () {
    return this.getEffectiveAttack() * 0.8;
  };

  SoulEntity.prototype.takeDamage = function (amount, from) {
    if (this.goldBodyActive || (this.avatarMode && this.isPlayer)) {
      // 圣龙金身 / 圣龙真身 免疫伤害！反弹冲击波
      if (this.goldBodyActive && from) {
        var reflectDmg = amount * 0.6;
        from.takeDamage(reflectDmg, null);
      }
      return false;
    }

    // 光盾吸收伤害
    if (this.shieldActive && this.shieldHp > 0) {
      if (this.shieldHp >= amount) {
        this.shieldHp -= amount;
        return false;
      } else {
        amount -= this.shieldHp;
        this.shieldHp = 0;
        this.shieldActive = false;
      }
    }

    var def = this.getEffectiveDefense();
    var realDamage = Math.max(10, amount * (100 / (100 + def)));
    this.hp -= realDamage;

    // 击退受力
    if (from) {
      var push = 120;
      var a = U.angleTo(from.x, from.y, this.x, this.y);
      this.vx += Math.cos(a) * push;
      this.vy += Math.sin(a) * push;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  };

  global.Dino = SoulEntity;
})(window);
