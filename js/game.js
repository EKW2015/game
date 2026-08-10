/**
 * 无限 3D 恐龙世界 —— 自由探索、捕食、进化。
 */
(function (global) {
  'use strict';

  var U = global.Utils;
  var Dino = global.Dino;
  var AI = global.AI;
  var Sfx = global.Sfx;
  var Renderer3D = global.Renderer3D;

  var GRACE_TIME = 10;
  var PLAYER_START_MASS = 45;
  var MAX_NPC = 10;
  var SPAWN_MIN = 280;
  var SPAWN_MAX = 750;
  var DESPAWN_DIST = 1400;

  var AI_NAMES = [
    '暴龙', '迅猛龙', '棘龙', '甲龙', '剑龙',
    '异特龙', '镰刀龙', '三角龙', '双脊龙', '禽龙', '重爪龙', '角龙'
  ];

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.hooks = hooks || {};
    this.state = 'ready';
    this.input = { up: false, down: false, left: false, right: false, bite: false };
    this.particles = [];
    this.messages = [];
    this.nextId = 1;
    this.evolveFlash = 0;
    this.playTime = 0;
    this.highKills = this.loadHighKills();

    this.r3d = new Renderer3D(canvas);
    this.world = this.r3d.world;

    this.reset();
    this.resize();
    this.lastTime = 0;
    this.tick = this.tick.bind(this);
    global.requestAnimationFrame(this.tick);
  }

  Game.prototype.loadHighKills = function () {
    try {
      return parseInt(global.localStorage.getItem('dinoWorld.kills'), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  Game.prototype.saveHighKills = function () {
    try {
      global.localStorage.setItem('dinoWorld.kills', String(this.highKills));
    } catch (e) {}
  };

  Game.prototype.reset = function () {
    this.dinos = [];
    this.particles = [];
    this.messages = [];
    this.nextId = 1;
    this.evolveFlash = 0;
    this.playTime = 0;

    if (this.r3d) this.r3d.clearDinos();

    this.player = this.spawnDino({
      isPlayer: true,
      x: 0,
      y: 0,
      mass: PLAYER_START_MASS,
      hp: 250,
      name: '你'
    });

    for (var i = 0; i < 6; i++) {
      this.spawnNpcNearPlayer();
    }
  };

  Game.prototype.spawnDino = function (opts) {
    var dino = new Dino({
      id: this.nextId++,
      isPlayer: opts.isPlayer,
      x: opts.x,
      y: opts.y,
      mass: opts.mass || U.rand(12, 28),
      angle: U.rand(0, Math.PI * 2),
      hp: opts.hp,
      name: opts.name || '恐龙'
    });
    dino.syncStats();
    this.dinos.push(dino);
    if (this.r3d) this.r3d.createDinoMesh(dino);
    return dino;
  };

  Game.prototype.spawnNpcNearPlayer = function () {
    if (!this.player) return null;
    var angle = U.rand(0, Math.PI * 2);
    var dist = U.rand(SPAWN_MIN, SPAWN_MAX);
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;

    var mass = U.rand(10, 22);
    if (Math.random() < 0.25) mass = U.rand(this.player.mass * 0.55, this.player.mass * 0.95);

    return this.spawnDino({
      x: x,
      y: y,
      mass: mass,
      name: AI_NAMES[U.randInt(0, AI_NAMES.length - 1)]
    });
  };

  Game.prototype.nearbyNpcCount = function () {
    var n = 0;
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive || d.isPlayer) continue;
      if (U.dist(d.x, d.y, this.player.x, this.player.y) < SPAWN_MAX + 200) n++;
    }
    return n;
  };

  Game.prototype.cleanupFar = function () {
    var p = this.player;
    for (var i = this.dinos.length - 1; i >= 0; i--) {
      var d = this.dinos[i];
      if (d.isPlayer || !d.alive) continue;
      if (U.dist(d.x, d.y, p.x, p.y) > DESPAWN_DIST) {
        d.alive = false;
        this.r3d.meshes.delete(d.id);
        this.dinos.splice(i, 1);
      }
    }
  };

  Game.prototype.maintainPopulation = function () {
    this.cleanupFar();
    while (this.nearbyNpcCount() < MAX_NPC) {
      this.spawnNpcNearPlayer();
    }
  };

  Game.prototype.aliveDinos = function () {
    var out = [];
    for (var i = 0; i < this.dinos.length; i++) {
      if (this.dinos[i].alive) out.push(this.dinos[i]);
    }
    return out;
  };

  Game.prototype.setState = function (state) {
    if (this.state === state) return;
    var was = this.state;
    this.state = state;
    if (state === 'playing' && was === 'ready') {
      this.addMessage('无限世界：自由探索，变大变强！', 3);
    }
    if (this.hooks.onState) this.hooks.onState(state, this);
  };

  Game.prototype.press = function (action) {
    if (action === 'bite') this.input.bite = true;
    else if (action in this.input) this.input[action] = true;
    if (this.state === 'ready') this.setState('playing');
    else if (this.state === 'over') {
      this.reset();
      this.setState('playing');
    }
  };

  Game.prototype.release = function (action) {
    if (action === 'bite') this.input.bite = false;
    else if (action in this.input) this.input[action] = false;
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

  Game.prototype.tick = function (now) {
    global.requestAnimationFrame(this.tick);
    if (!this.lastTime) this.lastTime = now;
    var dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw(dt);
  };

  Game.prototype.update = function (dt) {
    if (this.state === 'paused') return;
    if (this.evolveFlash > 0) this.evolveFlash -= dt;

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

    this.r3d.updateCamera(this.player, dt);

    if (this.state !== 'playing') {
      if (this.state === 'ready') this.simulateAmbient(dt);
      return;
    }

    this.playTime += dt;

    if (this.player.alive && this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10 * dt);
    }

    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.resolveCombat();
    this.resolveEating();
    this.maintainPopulation();
  };

  Game.prototype.simulateAmbient = function (dt) {
    var alive = this.aliveDinos();
    var ctx = { playTime: 0, graceTime: GRACE_TIME, player: this.player };
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive || d.isPlayer) continue;
      AI.update(d, alive, dt, ctx);
      d.applyFriction(dt);
      d.updateMotion(this.world, dt);
    }
  };

  Game.prototype.updatePlayer = function (dt) {
    var p = this.player;
    if (!p.alive) return;

    var ax = 0, ay = 0;
    if (this.input.left) ax -= 1;
    if (this.input.right) ax += 1;
    if (this.input.up) ay -= 1;
    if (this.input.down) ay += 1;

    if (ax !== 0 || ay !== 0) {
      var len = Math.hypot(ax, ay);
      ax /= len; ay /= len;
      var spd = p.speed();
      p.vx += ax * spd * dt * 4;
      p.vy += ay * spd * dt * 4;
      p.angle = Math.atan2(ay, ax);
    }

    if (this.input.bite && p.tryBite()) Sfx.bite();
    p.applyFriction(dt);
    p.updateMotion(this.world, dt);
  };

  Game.prototype.updateNPCs = function (dt) {
    var alive = this.aliveDinos();
    var ctx = { playTime: this.playTime, graceTime: GRACE_TIME, player: this.player };
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive || d.isPlayer) continue;
      AI.update(d, alive, dt, ctx);
      d.applyFriction(dt);
      d.updateMotion(this.world, dt);
    }
  };

  Game.prototype.resolveCombat = function () {
    for (var i = 0; i < this.dinos.length; i++) {
      var attacker = this.dinos[i];
      if (!attacker.alive || attacker.biteAnim <= 0) continue;

      for (var j = 0; j < this.dinos.length; j++) {
        var victim = this.dinos[j];
        if (!victim.alive || victim.id === attacker.id) continue;

        var d = U.dist(attacker.x, attacker.y, victim.x, victim.y);
        if (d > attacker.biteReach() + victim.radius * 0.6) continue;

        var angleToVictim = U.angleTo(attacker.x, attacker.y, victim.x, victim.y);
        if (Math.abs(U.wrapAngle(angleToVictim - attacker.angle)) > Math.PI * 0.55) continue;
        if (attacker.canEat(victim)) continue;

        var dmg = attacker.biteDamage();
        if (victim.isPlayer) dmg *= 0.3;

        if (victim.takeDamage(dmg, attacker)) {
          this.killDino(victim, attacker);
        }
        this.addParticles(victim.x, victim.y, '#ff6060', 4);
      }
    }
  };

  Game.prototype.resolveEating = function () {
    for (var i = 0; i < this.dinos.length; i++) {
      var eater = this.dinos[i];
      if (!eater.alive) continue;

      for (var j = 0; j < this.dinos.length; j++) {
        var prey = this.dinos[j];
        if (!prey.alive || prey.id === eater.id) continue;

        var d = U.dist(eater.x, eater.y, prey.x, prey.y);
        if (d > eater.radius + prey.radius * (eater.isPlayer ? 0.8 : 0.55)) continue;
        if (!eater.canEat(prey)) continue;

        var evolved = eater.absorb(prey);
        prey.alive = false;
        Sfx.eat();
        this.addParticles(prey.x, prey.y, eater.colors().body, 12);
        this.addMessage(eater.isPlayer ? '吞食 ' + prey.name + '！' : prey.name + ' 被吞食', 1.8);

        if (evolved && eater.isPlayer) {
          Sfx.evolve();
          this.evolveFlash = 0.6;
          this.addMessage('进化 → ' + U.stageName(eater.mass) + '！', 2.5);
        }

        if (eater.isPlayer) {
          if (eater.kills > this.highKills) {
            this.highKills = eater.kills;
            this.saveHighKills();
          }
        }
      }
    }
  };

  Game.prototype.killDino = function (victim, killer) {
    victim.alive = false;
    this.addParticles(victim.x, victim.y, '#888888', 8);

    if (killer) {
      killer.kills += 1;
      killer.mass += victim.mass * 0.25;
      if (killer.syncStats() && killer.isPlayer) {
        Sfx.evolve();
        this.addMessage('进化 → ' + U.stageName(killer.mass) + '！', 2.5);
      }
    }

    if (victim.isPlayer) {
      Sfx.die();
      this.setState('over');
      this.addMessage('你被击败了… 按 R 重新开始', 4);
    }
  };

  Game.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.round(w * 9 / 16);
    this.r3d.resize(w, h);
  };

  Game.prototype.draw = function () {
    var w = this.world;
    for (var i = 0; i < this.dinos.length; i++) {
      this.r3d.updateDinoMesh(this.dinos[i], w);
    }
    this.r3d.syncParticles(this.particles, w);
    this.r3d.render();
    if (this.hooks.onHud) this.hooks.onHud(this);
  };

  global.Game = Game;
})(window);
