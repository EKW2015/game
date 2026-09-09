/**
 * 斗罗大陆 · 光明圣龙魂帝 3D 战斗。
 */
(function (global) {
  'use strict';

  var U = global.Utils;
  var Unit = global.Unit;
  var AI = global.AI;
  var Sfx = global.Sfx;
  var Skills = global.Skills;
  var Renderer3D = global.Renderer3D;
  var NullRenderer = global.NullRenderer;

  var GRACE_TIME = 6;
  var MAX_NPC = 9;
  var SPAWN_MIN = 160;
  var SPAWN_MAX = 620;
  var DESPAWN_DIST = 1300;

  var ENEMY_TYPES = [
    { name: '暗影魂师', kind: 'master', martialSoul: 'shadow', attr: 'dark', rank: '魂王', rings: 5, hp: 520, atk: 48, def: 28, spd: 110, soul: 180, radius: 14 },
    { name: '幽冥魔狼', kind: 'wolf', martialSoul: 'darkWolf', attr: 'dark', rank: '千年魂兽', rings: 3, hp: 380, atk: 42, def: 18, spd: 150, soul: 80, radius: 16 },
    { name: '邪火魂师', kind: 'master', martialSoul: 'shadow', attr: 'dark', rank: '魂帝', rings: 6, hp: 780, atk: 62, def: 36, spd: 100, soul: 240, radius: 15 },
    { name: '光明凤魂师', kind: 'master', martialSoul: 'lightBird', attr: 'light', rank: '魂王', rings: 5, hp: 560, atk: 44, def: 30, spd: 125, soul: 200, radius: 14 },
    { name: '泰坦猿', kind: 'ape', martialSoul: 'titanApe', attr: 'beast', rank: '万年魂兽', rings: 5, hp: 1400, atk: 80, def: 55, spd: 85, soul: 120, radius: 24 }
  ];

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.hooks = hooks || {};
    this.state = 'ready';
    this.input = {
      up: false, down: false, left: false, right: false,
      jump: false, attack: false
    };
    this.particles = [];
    this.projectiles = [];
    this.effects = [];
    this.messages = [];
    this.nextId = 1;
    this.playTime = 0;
    this.highKills = this.loadHighKills();
    this.domain = null;
    this.lockTarget = null;
    this.lookYaw = 0;

    if (typeof THREE !== 'undefined' && canvas && canvas.getContext) {
      try {
        this.r3d = new Renderer3D(canvas);
      } catch (err) {
        this.r3d = new NullRenderer();
      }
    } else {
      this.r3d = new NullRenderer();
    }
    this.world = this.r3d.world;

    this.reset();
    this.resize();
    this.lastTime = 0;
    this.tick = this.tick.bind(this);
    if (global.requestAnimationFrame) global.requestAnimationFrame(this.tick);
  }

  Game.prototype.loadHighKills = function () {
    try {
      return parseInt(global.localStorage.getItem('douluo.kills'), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  Game.prototype.saveHighKills = function () {
    try {
      global.localStorage.setItem('douluo.kills', String(this.highKills));
    } catch (e) {}
  };

  Game.prototype.reset = function () {
    this.units = [];
    this.particles = [];
    this.projectiles = [];
    this.effects = [];
    this.messages = [];
    this.nextId = 1;
    this.playTime = 0;
    this.domain = null;
    this.lockTarget = null;
    this.lookYaw = 0;
    if (this.r3d && this.r3d.clearUnits) this.r3d.clearUnits();

    this.player = this.spawnUnit({
      isPlayer: true,
      isAlly: true,
      x: 0,
      y: 12,
      kind: 'master',
      martialSoul: 'brightDragon',
      attr: 'light',
      hasBadge: true,
      name: '你',
      title: '光明圣龙魂帝',
      rank: '七环魂帝',
      rings: 7,
      hp: 2200,
      atk: 160,
      def: 110,
      spd: 155,
      soul: 1200,
      radius: 18
    });
    this.lookYaw = this.player.angle;

    this.spawnUnit({
      isAlly: true,
      x: 40,
      y: -20,
      kind: 'master',
      martialSoul: 'lightBird',
      attr: 'light',
      hasBadge: true,
      name: '徽章护卫',
      title: '圣龙徽章',
      rank: '魂王',
      rings: 5,
      hp: 700,
      atk: 50,
      def: 32,
      spd: 120,
      soul: 260,
      radius: 14
    });

    for (var i = 0; i < 6; i++) this.spawnNpcNearPlayer();
  };

  Game.prototype.spawnUnit = function (opts) {
    opts = opts || {};
    opts.id = this.nextId++;
    var unit = new Unit(opts);
    this.units.push(unit);
    if (this.r3d && this.r3d.createUnitMesh) this.r3d.createUnitMesh(unit);
    return unit;
  };

  Game.prototype.spawnNpcNearPlayer = function () {
    if (!this.player) return null;
    var angle = U.rand(0, Math.PI * 2);
    var dist = U.rand(SPAWN_MIN, SPAWN_MAX);
    var t = ENEMY_TYPES[U.randInt(0, ENEMY_TYPES.length - 1)];
    var u = this.spawnUnit({
      x: this.player.x + Math.cos(angle) * dist,
      y: this.player.y + Math.sin(angle) * dist,
      kind: t.kind,
      martialSoul: t.martialSoul,
      attr: t.attr,
      name: t.name,
      rank: t.rank,
      rings: t.rings,
      hp: t.hp * U.rand(0.85, 1.2),
      atk: t.atk,
      def: t.def,
      spd: t.spd,
      soul: t.soul,
      radius: t.radius
    });
    return u;
  };

  Game.prototype.nearbyNpcCount = function () {
    var n = 0;
    for (var i = 0; i < this.units.length; i++) {
      var d = this.units[i];
      if (!d.alive || d.isPlayer || d.isAlly) continue;
      if (U.dist(d.x, d.y, this.player.x, this.player.y) < SPAWN_MAX + 200) n++;
    }
    return n;
  };

  Game.prototype.cleanupFar = function () {
    var p = this.player;
    for (var i = this.units.length - 1; i >= 0; i--) {
      var d = this.units[i];
      if (d.isPlayer || d.isAlly || !d.alive) continue;
      if (U.dist(d.x, d.y, p.x, p.y) > DESPAWN_DIST) {
        d.alive = false;
        if (this.r3d.meshes) this.r3d.meshes.delete(d.id);
        this.units.splice(i, 1);
      }
    }
  };

  Game.prototype.maintainPopulation = function () {
    this.cleanupFar();
    while (this.nearbyNpcCount() < MAX_NPC) this.spawnNpcNearPlayer();
  };

  Game.prototype.aliveUnits = function () {
    var out = [];
    for (var i = 0; i < this.units.length; i++) {
      if (this.units[i].alive) out.push(this.units[i]);
    }
    return out;
  };

  Game.prototype.enemiesOf = function (unit) {
    var out = [];
    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i];
      if (!u.alive || u.id === unit.id) continue;
      if (u.team === unit.team) continue;
      out.push(u);
    }
    return out;
  };

  Game.prototype.unitById = function (id) {
    for (var i = 0; i < this.units.length; i++) {
      if (this.units[i].id === id) return this.units[i];
    }
    return null;
  };

  Game.prototype.getTarget = function (caster, range) {
    range = range || 320;
    var best = null;
    var bestScore = -999;
    var foes = this.enemiesOf(caster);
    for (var i = 0; i < foes.length; i++) {
      var e = foes[i];
      var d = U.dist(caster.x, caster.y, e.x, e.y);
      if (d > range) continue;
      var face = U.facingDot(caster, e.x, e.y);
      var score = face * 2 - d / range;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  };

  Game.prototype.setState = function (state) {
    if (this.state === state) return;
    var was = this.state;
    this.state = state;
    if (state === 'playing' && was === 'ready') {
      this.addMessage('武魂：光明圣龙 · 七环魂帝出征！', 3);
    }
    if (this.hooks.onState) this.hooks.onState(state, this);
  };

  Game.prototype.press = function (action) {
    if (action in this.input) this.input[action] = true;
    if (this.state === 'ready') this.setState('playing');
    else if (this.state === 'over') {
      this.reset();
      this.setState('playing');
    }
  };

  Game.prototype.release = function (action) {
    if (action in this.input) this.input[action] = false;
  };

  Game.prototype.restart = function () {
    this.reset();
    this.setState('playing');
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') this.setState('paused');
    else if (this.state === 'paused') this.setState('playing');
  };

  Game.prototype.addMessage = function (text, duration) {
    this.messages.push({ text: text, life: duration || 2.2 });
    if (this.messages.length > 3) this.messages.shift();
  };

  Game.prototype.addParticles = function (x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = U.rand(0, Math.PI * 2);
      var spd = U.rand(40, 180);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: U.rand(0.3, 0.7), color: color, size: U.rand(2, 6)
      });
    }
  };

  Game.prototype.addEffect = function (e) {
    this.effects.push(e);
  };

  Game.prototype.addProjectile = function (p) {
    p.hit = p.hit || {};
    this.projectiles.push(p);
  };

  Game.prototype.hurt = function (attacker, victim, dmg, opts) {
    opts = opts || {};
    if (!victim || !victim.alive) return false;
    if (victim.takeDamage(dmg, attacker, opts)) {
      this.killUnit(victim, attacker);
      return true;
    }
    if (victim.buffs.trueBody > 0 && !opts.trueDmg) return false;
    if (opts.burn) victim.applyBuff('burn', opts.burn);
    if (opts.seal) victim.applyBuff('sealed', opts.seal);
    if (opts.defDown) victim.applyBuff('defDown', opts.defDown);
    this.addParticles(victim.x, victim.y, '#ffe27a', 3);
    Sfx.hit();
    if (victim.wantReflect && attacker && attacker.alive) {
      victim.wantReflect = false;
      this.addEffect({ type: 'burst', x: victim.x, y: victim.y, life: 0.35, r: 48 });
      this.aoe(victim, victim.x, victim.y, 55, victim.getAtk() * 0.45, { knock: 120 });
    }
    return false;
  };

  Game.prototype.hitConeUnits = function (caster, range, halfDot) {
    var out = [];
    var foes = this.enemiesOf(caster);
    var minDot = 1 - halfDot;
    for (var i = 0; i < foes.length; i++) {
      var e = foes[i];
      var d = U.dist(caster.x, caster.y, e.x, e.y);
      if (d > range + e.radius) continue;
      if (U.facingDot(caster, e.x, e.y) < minDot) continue;
      out.push(e);
    }
    return out;
  };

  Game.prototype.hitCone = function (caster, range, halfDot, dmg, opts) {
    var list = this.hitConeUnits(caster, range, halfDot);
    for (var i = 0; i < list.length; i++) this.hurt(caster, list[i], dmg, opts);
    return list.length;
  };

  Game.prototype.aoe = function (caster, x, y, r, dmg, opts) {
    var foes = this.enemiesOf(caster);
    var n = 0;
    for (var i = 0; i < foes.length; i++) {
      if (U.dist(x, y, foes[i].x, foes[i].y) <= r + foes[i].radius) {
        this.hurt(caster, foes[i], dmg, opts);
        n++;
      }
    }
    return n;
  };

  Game.prototype.startDomain = function (caster, duration, radius) {
    this.domain = {
      ownerId: caster.id,
      x: caster.x,
      y: caster.y,
      r: radius,
      life: duration,
      max: duration
    };
    this.addEffect({ type: 'domain', x: caster.x, y: caster.y, life: 1.2, r: radius });
    this.addMessage('十万年·圣龙主迹领域！', 3);
    if (this.r3d.shake != null) this.r3d.shake = 0.4;
  };

  Game.prototype.tryCast = function (skillId) {
    if (this.state !== 'playing') {
      if (this.state === 'ready') this.setState('playing');
      else return false;
    }
    var caster = this.player;
    if (!caster || !caster.alive || caster.buffs.stun > 0 || caster.castLock > 0) return false;
    var skill = Skills.byId[skillId];
    if (!skill) return false;
    if ((caster.cooldowns[skill.id] || 0) > 0) return false;
    var target = this.getTarget(caster, skill.id === 'judgment' || skill.id === 'sunbeam' || skill.id === 'skystrike' ? 420 : 240);
    this.lockTarget = target;
    if ((skill.id === 'judgment' || skill.id === 'sunbeam') && !target) {
      this.addMessage('没有锁定目标', 1.2);
      return false;
    }
    if (!Skills.pay(caster, skill)) {
      this.addMessage('魂力不足', 1.2);
      return false;
    }
    caster.cooldowns[skill.id] = skill.cd;
    Skills.cast[skill.id]({ game: this, caster: caster, target: target });
    Sfx.skill(skill.id);
    var tag = skill.group === 'soul' ? '第' + skill.slot + '魂技' : skill.group === 'self' ? '自创魂技' : skill.group === 'bone' ? '魂骨技能' : '领域';
    this.addMessage(tag + ' · ' + skill.name + '！', 2.1);
    this.addParticles(caster.x, caster.y, skill.color, 10);
    if (this.r3d.shake != null && (skill.id === 'truebody' || skill.id === 'skystrike' || skill.id === 'domain' || skill.id === 'roar')) {
      this.r3d.shake = 0.35;
    }
    return true;
  };

  Game.prototype.killUnit = function (victim, killer) {
    victim.alive = false;
    this.addParticles(victim.x, victim.y, '#888888', 10);
    if (killer) {
      killer.kills += 1;
      killer.soul = Math.min(killer.maxSoul, killer.soul + 80);
      killer.hp = Math.min(killer.maxHp, killer.hp + 40);
    }
    if (victim.isPlayer) {
      Sfx.die();
      this.setState('over');
      this.addMessage('你倒下了… 点按钮或按 B 重入魂殿', 4);
    } else if (killer && killer.isPlayer) {
      this.addMessage('击败 ' + victim.name + ' · ' + victim.rank, 1.8);
      if (killer.kills > this.highKills) {
        this.highKills = killer.kills;
        this.saveHighKills();
      }
    }
  };

  Game.prototype.tick = function (now) {
    if (global.requestAnimationFrame) global.requestAnimationFrame(this.tick);
    if (!this.lastTime) this.lastTime = now;
    var dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw(dt);
  };

  Game.prototype.update = function (dt) {
    if (this.state === 'paused') return;

    for (var m = this.messages.length - 1; m >= 0; m--) {
      this.messages[m].life -= dt;
      if (this.messages[m].life <= 0) this.messages.splice(m, 1);
    }
    for (var p = this.particles.length - 1; p >= 0; p--) {
      var part = this.particles[p];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.92;
      part.vy *= 0.92;
      if (part.life <= 0) this.particles.splice(p, 1);
    }
    for (var e = this.effects.length - 1; e >= 0; e--) {
      this.effects[e].life -= dt;
      if (this.effects[e].life <= 0) this.effects.splice(e, 1);
    }

    this.r3d.updateCamera(this.player, dt, { yaw: this.lookYaw });
    this.r3d.setDomainLook(this.domain, this.player);

    if (this.state !== 'playing') return;

    this.playTime += dt;
    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.updateProjectiles(dt);
    this.updateDomain(dt);
    this.updateWingsFeathers(dt);
    this.resolveMelee();
    this.maintainPopulation();

    this.lockTarget = this.getTarget(this.player, 360);
  };

  Game.prototype.updatePlayer = function (dt) {
    var p = this.player;
    if (!p.alive) return;
    p.tickBuffs(dt);
    p.regen(dt);

    var yaw = this.lookYaw;
    var ax = 0;
    var ay = 0;
    if (this.input.up) {
      ax += Math.cos(yaw);
      ay += Math.sin(yaw);
    }
    if (this.input.down) {
      ax -= Math.cos(yaw);
      ay -= Math.sin(yaw);
    }
    if (this.input.left) {
      ax += Math.cos(yaw - Math.PI / 2);
      ay += Math.sin(yaw - Math.PI / 2);
    }
    if (this.input.right) {
      ax += Math.cos(yaw + Math.PI / 2);
      ay += Math.sin(yaw + Math.PI / 2);
    }
    if (ax !== 0 || ay !== 0) {
      var len = Math.hypot(ax, ay);
      ax /= len;
      ay /= len;
      var spd = p.getSpd();
      p.vx += ax * spd * dt * 4.2;
      p.vy += ay * spd * dt * 4.2;
      p.angle = Math.atan2(ay, ax);
    } else {
      p.angle = yaw;
    }

    if (this.input.jump) {
      if (p.buffs.wings > 0 || p.buffs.trueBody > 0) {
        p.vh = 70;
        p.h = Math.min(p.h + 40 * dt, 80);
      } else if (p.h <= 0.2) {
        p.vh = 92;
      }
    }

    if (this.input.attack && p.tryAttack()) {
      Sfx.attack();
      this.hitCone(p, p.attackReach(), 0.62, p.getAtk() * 0.7, { knock: 70 });
    }

    p.applyFriction(dt);
    p.updateMotion(this.world, dt);
  };

  Game.prototype.updateNPCs = function (dt) {
    var alive = this.aliveUnits();
    var ctx = { playTime: this.playTime, graceTime: GRACE_TIME, player: this.player };
    for (var i = 0; i < this.units.length; i++) {
      var d = this.units[i];
      if (!d.alive || d.isPlayer) continue;
      d.tickBuffs(dt);
      d.regen(dt);
      if (this.playTime < GRACE_TIME && !d.isAlly) {
        d.wanderAngle += U.rand(-0.5, 0.5) * dt;
        d.moveToward(d.x + Math.cos(d.wanderAngle) * 120, d.y + Math.sin(d.wanderAngle) * 120, 0.18, dt);
      } else {
        AI.update(d, alive, dt, ctx);
      }
      d.applyFriction(dt);
      d.updateMotion(this.world, dt);
    }
  };

  Game.prototype.updateWingsFeathers = function (dt) {
    var p = this.player;
    if (!p || p.buffs.wings <= 0) return;
    p._featherT = (p._featherT || 0) + dt;
    if (p._featherT < 0.28) return;
    p._featherT = 0;
    var t = this.getTarget(p, 260);
    if (!t) return;
    var a = U.angleTo(p.x, p.y, t.x, t.y) + U.rand(-0.25, 0.25);
    this.addProjectile({
      type: 'feather',
      x: p.x,
      y: p.y,
      h: 16 + p.h,
      vx: Math.cos(a) * 380,
      vy: Math.sin(a) * 380,
      vh: 0,
      life: 1.0,
      owner: p.id,
      damage: p.getAtk() * 0.22,
      color: '#fff4c0',
      radius: 3
    });
  };

  Game.prototype.updateProjectiles = function (dt) {
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i];
      if (p.delay > 0) {
        p.delay -= dt;
        var owner = this.unitById(p.owner);
        if (owner && p.orbit) {
          var ang = Date.now() * 0.004 + i;
          p.x = owner.x + Math.cos(ang) * 18;
          p.y = owner.y + Math.sin(ang) * 18;
          p.h = 18 + owner.h;
        }
        continue;
      }
      if (p.homing && p.targetId) {
        var tgt = this.unitById(p.targetId);
        if (tgt && tgt.alive) {
          var dx = tgt.x - p.x;
          var dy = tgt.y - p.y;
          var dh = 12 - p.h;
          var len = Math.hypot(dx, dy) || 1;
          var spd = Math.hypot(p.vx, p.vy) || 300;
          var wantX = (dx / len) * spd;
          var wantY = (dy / len) * spd;
          var k = Math.min(1, (p.homing * dt) / spd);
          p.vx += (wantX - p.vx) * k;
          p.vy += (wantY - p.vy) * k;
          p.vh += dh * dt * 8;
        }
      }
      if (p.type === 'judgment') {
        var jt = this.unitById(p.targetId);
        if (jt) {
          p.x = jt.x;
          p.y = jt.y;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.h += (p.vh || 0) * dt;
      p.life -= dt;
      var dead = p.life <= 0;
      var caster = this.unitById(p.owner);
      if (caster) {
        var foes = this.enemiesOf(caster);
        for (var f = 0; f < foes.length; f++) {
          var e = foes[f];
          if (p.hit[e.id]) continue;
          var dist = U.dist(p.x, p.y, e.x, e.y);
          if (dist < (p.radius || 4) + e.radius && Math.abs((p.h || 0) - e.h) < 28) {
            this.hurt(caster, e, p.damage || 20, {
              penetrate: p.penetrate,
              burn: p.burn,
              seal: p.seal,
              defDown: p.defDown,
              knock: 50
            });
            p.hit[e.id] = true;
            if (!p.pierce) {
              dead = true;
              break;
            }
            p.pierce -= 1;
            if (p.pierce <= 0) {
              dead = true;
              break;
            }
          }
        }
      }
      if (p.type === 'judgment' && p.h <= 4) {
        var jtgt = this.unitById(p.targetId);
        if (jtgt && jtgt.alive && caster) {
          this.hurt(caster, jtgt, p.damage, { penetrate: true, burn: p.burn, knock: 40 });
        }
        this.addEffect({ type: 'burst', x: p.x, y: p.y, life: 0.45, r: 40 });
        dead = true;
      }
      if (dead) this.projectiles.splice(i, 1);
    }
  };

  Game.prototype.updateDomain = function (dt) {
    if (!this.domain) return;
    this.domain.life -= dt;
    if (this.domain.life <= 0) {
      this.domain = null;
      for (var i = 0; i < this.units.length; i++) {
        this.units[i].buffs.blessing = 0;
        this.units[i].buffs.domainCurse = 0;
      }
      return;
    }
    var d = this.domain;
    var owner = this.unitById(d.ownerId);
    if (owner && owner.alive) {
      d.x = owner.x;
      d.y = owner.y;
    }
    this._domainTick = (this._domainTick || 0) + dt;
    var pulse = this._domainTick >= 1;
    if (pulse) this._domainTick = 0;
    for (var u = 0; u < this.units.length; u++) {
      var unit = this.units[u];
      if (!unit.alive) continue;
      var inside = U.dist(unit.x, unit.y, d.x, d.y) <= d.r;
      if (!inside) {
        unit.buffs.blessing = 0;
        unit.buffs.domainCurse = 0;
        continue;
      }
      if (unit.hasBadge) {
        unit.applyBuff('blessing', 1.2);
      } else {
        unit.applyBuff('domainCurse', 1.2);
        if (pulse && unit.attr !== 'light') {
          unit.hp -= unit.maxHp * 0.03 + 18;
          if (unit.hp <= 0) this.killUnit(unit, owner);
        }
      }
    }
  };

  Game.prototype.resolveMelee = function () {
    for (var i = 0; i < this.units.length; i++) {
      var attacker = this.units[i];
      if (!attacker.alive || attacker.isPlayer || !attacker.pendingHit) continue;
      attacker.pendingHit = false;
      var foes = this.enemiesOf(attacker);
      for (var j = 0; j < foes.length; j++) {
        var victim = foes[j];
        var d = U.dist(attacker.x, attacker.y, victim.x, victim.y);
        if (d > attacker.attackReach() + victim.radius * 0.5) continue;
        if (U.facingDot(attacker, victim.x, victim.y) < 0.15) continue;
        var dmg = attacker.getAtk() * (victim.isPlayer ? 0.45 : 0.9);
        this.hurt(attacker, victim, dmg, { knock: 60 });
      }
    }
  };

  Game.prototype.resize = function () {
    if (!this.canvas || !this.canvas.getBoundingClientRect) return;
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.round(w * 9 / 16);
    this.r3d.resize(w, h);
  };

  Game.prototype.draw = function () {
    var w = this.world;
    for (var i = 0; i < this.units.length; i++) {
      this.r3d.updateUnitMesh(this.units[i], w);
    }
    this.r3d.syncFx(this.projectiles, this.effects, this.particles, w);
    this.r3d.render();
    if (this.hooks.onHud) this.hooks.onHud(this);
  };

  global.Game = Game;
})(window);
