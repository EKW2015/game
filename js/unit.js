(function (global) {
  'use strict';

  var U = global.Utils;

  function emptyBuffs() {
    return {
      wings: 0,
      golden: 0,
      trueBody: 0,
      shield: 0,
      stun: 0,
      blind: 0,
      defDown: 0,
      burn: 0,
      gravity: 0,
      sealed: 0,
      blessing: 0,
      domainCurse: 0,
      reflectPulse: 0
    };
  }

  function Unit(opts) {
    opts = opts || {};
    this.id = opts.id;
    this.isPlayer = !!opts.isPlayer;
    this.isAlly = !!opts.isAlly;
    this.kind = opts.kind || 'master';
    this.martialSoul = opts.martialSoul || 'shadow';
    this.attr = opts.attr || 'beast';
    this.hasBadge = !!opts.hasBadge;
    this.name = opts.name || '魂师';
    this.title = opts.title || '';
    this.rank = opts.rank || '魂尊';
    this.rings = opts.rings || 4;

    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.h = opts.h || 0;
    this.vx = 0;
    this.vy = 0;
    this.vh = 0;
    this.angle = opts.angle || 0;
    this.yaw = this.angle;

    this.baseHp = opts.hp || 400;
    this.baseAtk = opts.atk || 40;
    this.baseDef = opts.def || 24;
    this.baseSpd = opts.spd || 120;
    this.baseSoul = opts.soul || 200;

    this.maxHp = this.baseHp;
    this.hp = this.baseHp;
    this.maxSoul = this.baseSoul;
    this.soul = this.baseSoul;

    this.radius = opts.radius || (this.kind === 'ape' ? 22 : this.kind === 'wolf' ? 16 : 16);
    this.alive = true;
    this.kills = 0;
    this.hitFlash = 0;
    this.attackAnim = 0;
    this.attackCd = 0;
    this.castLock = 0;
    this.wanderAngle = U.rand(0, Math.PI * 2);
    this.buffs = emptyBuffs();
    this.cooldowns = {};
    this.wantReflect = false;
    this.pendingHit = false;
    this.team = this.isPlayer || this.isAlly ? 'light' : 'dark';
  }

  Unit.prototype.mul = function () {
    var m = 1;
    if (this.buffs.trueBody > 0) m *= 4;
    if (this.buffs.blessing > 0) m *= 1.3;
    if (this.buffs.domainCurse > 0) m *= 0.5;
    return m;
  };

  Unit.prototype.getAtk = function () {
    var v = this.baseAtk * this.mul();
    if (this.buffs.wings > 0) v *= 1.08;
    return v;
  };

  Unit.prototype.getDef = function () {
    var v = this.baseDef * this.mul();
    if (this.buffs.defDown > 0) v *= 0.55;
    if (this.buffs.golden > 0) v *= 1.8;
    return v;
  };

  Unit.prototype.getSpd = function () {
    if (this.buffs.stun > 0 || this.buffs.gravity > 0) {
      return this.buffs.gravity > 0 && this.buffs.stun <= 0 ? this.baseSpd * 0.12 : 0;
    }
    var v = this.baseSpd * this.mul();
    if (this.buffs.wings > 0) v *= 1.85;
    if (this.buffs.sealed > 0) v *= 0.75;
    if (this.isPlayer) v *= 1.12;
    return v;
  };

  Unit.prototype.canAct = function () {
    return this.alive && this.buffs.stun <= 0 && this.castLock <= 0;
  };

  Unit.prototype.isImmune = function () {
    return this.buffs.trueBody > 0 || this.buffs.golden > 0;
  };

  Unit.prototype.immuneCC = function () {
    return this.buffs.trueBody > 0 || this.buffs.golden > 0;
  };

  Unit.prototype.applyBuff = function (name, duration) {
    if (this.immuneCC() && (name === 'stun' || name === 'blind' || name === 'gravity' || name === 'sealed')) {
      return false;
    }
    this.buffs[name] = Math.max(this.buffs[name] || 0, duration);
    return true;
  };

  Unit.prototype.tickBuffs = function (dt) {
    var b = this.buffs;
    for (var k in b) {
      if (b[k] > 0) {
        b[k] -= dt;
        if (b[k] < 0) b[k] = 0;
      }
    }
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.castLock > 0) this.castLock -= dt;
    for (var id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dt;
        if (this.cooldowns[id] < 0) this.cooldowns[id] = 0;
      }
    }
  };

  Unit.prototype.regen = function (dt) {
    if (!this.alive) return;
    var hpRate = this.isPlayer ? 18 : 8;
    var soulRate = this.isPlayer ? 28 : 10;
    if (this.buffs.blessing > 0) {
      hpRate += 35;
      soulRate += 90;
    }
    this.hp = Math.min(this.maxHp, this.hp + hpRate * dt);
    this.soul = Math.min(this.maxSoul, this.soul + soulRate * dt);
    if (this.buffs.burn > 0) {
      this.hp -= (12 + this.maxHp * 0.008) * dt;
    }
  };

  Unit.prototype.moveToward = function (tx, ty, power, dt) {
    if (this.buffs.stun > 0) return;
    var a = U.angleTo(this.x, this.y, tx, ty);
    this.angle = a;
    this.yaw = a;
    var spd = this.getSpd() * power;
    this.vx += Math.cos(a) * spd * dt * 3.4;
    this.vy += Math.sin(a) * spd * dt * 3.4;
  };

  Unit.prototype.applyFriction = function (dt) {
    var drag = Math.pow(0.08, dt);
    this.vx *= drag;
    this.vy *= drag;
    this.vh *= Math.pow(0.18, dt);
    var max = Math.max(40, this.getSpd() * 1.15);
    var v = Math.hypot(this.vx, this.vy);
    if (v > max) {
      this.vx = (this.vx / v) * max;
      this.vy = (this.vy / v) * max;
    }
  };

  Unit.prototype.updateMotion = function (world, dt) {
    if (this.buffs.stun > 0) {
      this.vx = 0;
      this.vy = 0;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.h += this.vh * dt;

    var flying = this.buffs.wings > 0 || this.buffs.trueBody > 0;
    if (!flying) {
      this.vh -= 220 * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
      }
    } else {
      this.h = U.clamp(this.h, 0, this.buffs.trueBody > 0 ? 90 : 70);
    }

    if (Math.hypot(this.vx, this.vy) > 8 && this.buffs.stun <= 0) {
      this.angle = Math.atan2(this.vy, this.vx);
    }
  };

  Unit.prototype.tryAttack = function () {
    if (this.attackCd > 0 || this.buffs.stun > 0) return false;
    this.attackCd = 0.42;
    this.attackAnim = 0.2;
    this.pendingHit = true;
    return true;
  };

  Unit.prototype.attackReach = function () {
    return this.radius * 1.7 + (this.buffs.trueBody > 0 ? 28 : 0);
  };

  Unit.prototype.takeDamage = function (amount, from, opts) {
    opts = opts || {};
    if (!this.alive) return false;
    if (this.buffs.trueBody > 0 && !opts.trueDmg) {
      this.hitFlash = 0.08;
      return false;
    }

    if (this.buffs.golden > 0 && !opts.trueDmg) {
      amount *= 0.1;
      this.wantReflect = true;
    }

    if (this.buffs.shield > 0 && from && !opts.trueDmg) {
      if (U.facingDot(this, from.x, from.y) > 0.15) {
        amount *= 0.12;
      }
    }

    var def = this.getDef();
    amount = amount * (90 / (90 + def));
    if (opts.vsDark && this.attr === 'dark') amount *= 1.65;
    if (opts.penetrate) amount *= 1.35;

    this.hp -= amount;
    this.hitFlash = 0.16;
    if (from && !this.buffs.gravity) {
      var push = (opts.knock || 80) * (this.buffs.gravity > 0 ? 0.2 : 1);
      var a = U.angleTo(from.x, from.y, this.x, this.y);
      this.vx += Math.cos(a) * push;
      this.vy += Math.sin(a) * push;
    }
    return this.hp <= 0;
  };

  Unit.prototype.colors = function () {
    if (this.isPlayer || this.martialSoul === 'brightDragon') {
      return { body: '#f4e6c1', robe: '#f7f1de', trim: '#e8c35a', accent: '#fff4c2', eye: '#3a2a10', hair: '#f2ead2' };
    }
    if (this.attr === 'light') {
      return { body: '#efe8d8', robe: '#dce8f8', trim: '#8ec5ff', accent: '#c9e4ff', eye: '#244060', hair: '#f0e8c8' };
    }
    if (this.kind === 'wolf') {
      return { body: '#2a2438', robe: '#1a1228', trim: '#6b3cff', accent: '#4b2a88', eye: '#c040ff', hair: '#1a1020' };
    }
    if (this.kind === 'ape') {
      return { body: '#4a3828', robe: '#3a2a1c', trim: '#8a6030', accent: '#c09050', eye: '#201000', hair: '#2a1c10' };
    }
    return { body: '#2c2434', robe: '#1c1428', trim: '#6a4a88', accent: '#3a2050', eye: '#e8d8ff', hair: '#120c18' };
  };

  global.Unit = Unit;
})(window);
