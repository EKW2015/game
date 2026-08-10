(function (global) {
  'use strict';

  var U = global.Utils;

  var STAGE_COLORS = [
    { body: '#4caf7a', belly: '#8fd4a8', eye: '#1a3d2e' },
    { body: '#4a8fd4', belly: '#9ec8f0', eye: '#1a2d4a' },
    { body: '#e07a3a', belly: '#f0b878', eye: '#4a2010' },
    { body: '#d44a4a', belly: '#f09090', eye: '#3a1010' }
  ];

  var PLAYER_COLORS = { body: '#5cd65c', belly: '#b8f0b8', eye: '#1a4a1a' };

  function Dino(opts) {
    this.id = opts.id;
    this.isPlayer = !!opts.isPlayer;
    this.x = opts.x;
    this.y = opts.y;
    this.vx = 0;
    this.vy = 0;
    this.angle = opts.angle || 0;
    this.mass = opts.mass || 18;
    this.radius = U.radiusFromMass(this.mass);
    this.stage = U.evolutionStage(this.mass);
    this.hp = opts.hp || 100;
    this.maxHp = this.hp;
    this.biteCooldown = 0;
    this.biteAnim = 0;
    this.alive = true;
    this.kills = 0;
    this.ai = opts.ai || null;
    this.wanderAngle = U.rand(0, Math.PI * 2);
    this.name = opts.name || (this.isPlayer ? '你' : '恐龙');
  }

  Dino.prototype.syncStats = function () {
    this.radius = U.radiusFromMass(this.mass);
    var newStage = U.evolutionStage(this.mass);
    if (newStage !== this.stage) {
      this.stage = newStage;
      this.maxHp = 80 + this.stage * 35 + this.mass * 0.4;
      this.hp = Math.min(this.hp + 25, this.maxHp);
      return true;
    }
    return false;
  };

  Dino.prototype.speed = function () {
    var base = 140 + this.stage * 18 - this.mass * 0.35;
    return this.isPlayer ? base * 1.35 : base * 0.85;
  };

  Dino.prototype.biteDamage = function () {
    return 12 + this.stage * 8 + this.mass * 0.15;
  };

  Dino.prototype.canEat = function (other) {
    if (this.isPlayer) {
      return this.radius > other.radius * 1.02 && this.mass > other.mass * 1.05;
    }
    return this.radius > other.radius * 1.12 && this.mass > other.mass * 1.15;
  };

  Dino.prototype.eatRatio = function (other) {
    return this.radius / other.radius;
  };

  Dino.prototype.moveToward = function (tx, ty, power, dt) {
    var a = U.angleTo(this.x, this.y, tx, ty);
    this.angle = a;
    var spd = this.speed() * power;
    this.vx += Math.cos(a) * spd * dt * 3.5;
    this.vy += Math.sin(a) * spd * dt * 3.5;
  };

  Dino.prototype.applyFriction = function (dt) {
    var drag = Math.pow(0.12, dt);
    this.vx *= drag;
    this.vy *= drag;
    var max = this.speed() * 1.1;
    var v = Math.hypot(this.vx, this.vy);
    if (v > max) {
      this.vx = (this.vx / v) * max;
      this.vy = (this.vy / v) * max;
    }
  };

  Dino.prototype.updateMotion = function (arena, dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    var pad = this.radius + 4;
    if (this.x < pad) {
      this.x = pad;
      this.vx = Math.abs(this.vx) * 0.3;
    }
    if (this.x > arena.w - pad) {
      this.x = arena.w - pad;
      this.vx = -Math.abs(this.vx) * 0.3;
    }
    if (this.y < pad) {
      this.y = pad;
      this.vy = Math.abs(this.vy) * 0.3;
    }
    if (this.y > arena.h - pad) {
      this.y = arena.h - pad;
      this.vy = -Math.abs(this.vy) * 0.3;
    }

    if (Math.hypot(this.vx, this.vy) > 8) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    if (this.biteCooldown > 0) this.biteCooldown -= dt;
    if (this.biteAnim > 0) this.biteAnim -= dt;
  };

  Dino.prototype.tryBite = function () {
    if (this.biteCooldown > 0) return false;
    this.biteCooldown = 0.38 - this.stage * 0.04;
    this.biteAnim = 0.18;
    return true;
  };

  Dino.prototype.biteReach = function () {
    return this.radius * 1.55;
  };

  Dino.prototype.takeDamage = function (amount, from) {
    this.hp -= amount;
    if (from) {
      var push = 120 + from.mass * 0.5;
      var a = U.angleTo(from.x, from.y, this.x, this.y);
      this.vx += Math.cos(a) * push;
      this.vy += Math.sin(a) * push;
    }
    return this.hp <= 0;
  };

  Dino.prototype.absorb = function (other) {
    this.mass += other.mass * 0.85;
    this.kills += 1;
    var evolved = this.syncStats();
    this.hp = Math.min(this.maxHp, this.hp + other.mass * 0.3);
    return evolved;
  };

  Dino.prototype.colors = function () {
    if (this.isPlayer) return PLAYER_COLORS;
    return STAGE_COLORS[this.stage];
  };

  Dino.prototype.draw = function (ctx) {
    if (!this.alive) return;

    var c = this.colors();
    var r = this.radius;
    var bite = this.biteAnim > 0 ? this.biteAnim / 0.18 : 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 尾巴
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, 0);
    ctx.lineTo(-r * 1.35, -r * 0.22);
    ctx.lineTo(-r * 1.1, 0);
    ctx.lineTo(-r * 1.35, r * 0.22);
    ctx.closePath();
    ctx.fill();

    // 身体
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(r * 0.05, 0, r * 0.82, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // 头
    var headX = r * 0.72 + bite * r * 0.25;
    ctx.beginPath();
    ctx.arc(headX, 0, r * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // 嘴
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.moveTo(headX + r * 0.2, -r * 0.12);
    ctx.lineTo(headX + r * 0.55 + bite * r * 0.2, -r * 0.05);
    ctx.lineTo(headX + r * 0.55 + bite * r * 0.2, r * 0.05);
    ctx.lineTo(headX + r * 0.2, r * 0.12);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headX + r * 0.08, -r * 0.18, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(headX + r * 0.12, -r * 0.18, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // 腿（俯视小点）
    ctx.fillStyle = c.body;
    var leg = r * 0.18;
    ctx.fillRect(-r * 0.15, -r * 0.55, leg, leg);
    ctx.fillRect(-r * 0.15, r * 0.38, leg, leg);
    ctx.fillRect(r * 0.2, -r * 0.45, leg, leg);
    ctx.fillRect(r * 0.2, r * 0.28, leg, leg);

  ctx.restore();

    // 血条（受伤或玩家时显示）
    if (this.hp < this.maxHp || this.isPlayer) {
      var barW = r * 1.6;
      var bx = this.x - barW / 2;
      var by = this.y - r - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx, by, barW, 5);
      ctx.fillStyle = this.isPlayer ? '#5cd65c' : '#e06060';
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), 5);
    }

    // 玩家标记
    if (this.isPlayer) {
      ctx.fillStyle = '#5cd65c';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('你', this.x, this.y - r - 16);
    }
  };

  global.Dino = Dino;
})(window);
