/**
 * 恐龙生存竞技场 —— 移动、捕食、战斗、进化，最后一只存活获胜。
 */
(function (global) {
  'use strict';

  var U = global.Utils;
  var Dino = global.Dino;
  var AI = global.AI;
  var Sfx = global.Sfx;

  var ARENA_W = 960;
  var ARENA_H = 640;
  var INITIAL_NPC = 11;

  var AI_NAMES = [
    '暴龙', '迅猛龙', '棘龙', '甲龙', '剑龙',
    '异特龙', '镰刀龙', '三角龙', '双脊龙', '禽龙', '重爪龙', '角龙'
  ];

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks || {};
    this.arena = { w: ARENA_W, h: ARENA_H };
    this.scale = 1;
    this.state = 'ready';
    this.input = { up: false, down: false, left: false, right: false, bite: false };
    this.particles = [];
    this.messages = [];
    this.nextId = 1;

    this.highWins = this.loadHighWins();

    this.reset();
    this.resize();
    this.lastTime = 0;
    this.tick = this.tick.bind(this);
    global.requestAnimationFrame(this.tick);
  }

  Game.prototype.loadHighWins = function () {
    try {
      return parseInt(global.localStorage.getItem('dinoSurvival.wins'), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  Game.prototype.saveHighWins = function () {
    try {
      global.localStorage.setItem('dinoSurvival.wins', String(this.highWins));
    } catch (e) {}
  };

  Game.prototype.reset = function () {
    this.dinos = [];
    this.particles = [];
    this.messages = [];
    this.nextId = 1;
    this.evolveFlash = 0;

    this.player = this.spawnDino({
      isPlayer: true,
      x: ARENA_W * 0.5,
      y: ARENA_H * 0.5,
      mass: 18,
      name: '你'
    });

    for (var i = 0; i < INITIAL_NPC; i++) {
      this.spawnNpc();
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
      name: opts.name || '恐龙'
    });
    dino.syncStats();
    this.dinos.push(dino);
    return dino;
  };

  Game.prototype.spawnNpc = function () {
    var pad = 60;
    var x, y, safe;
    var tries = 0;
    do {
      x = U.rand(pad, ARENA_W - pad);
      y = U.rand(pad, ARENA_H - pad);
      safe = true;
      if (this.player && this.player.alive) {
        safe = U.dist(x, y, this.player.x, this.player.y) > 120;
      }
      tries++;
    } while (!safe && tries < 20);

    var mass = U.rand(14, 32);
    if (this.player && this.player.alive && Math.random() < 0.35) {
      mass = U.rand(this.player.mass * 0.7, this.player.mass * 1.3);
    }

    return this.spawnDino({
      x: x,
      y: y,
      mass: mass,
      name: AI_NAMES[U.randInt(0, AI_NAMES.length - 1)]
    });
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
    this.state = state;
    if (this.hooks.onState) this.hooks.onState(state, this);
  };

  Game.prototype.press = function (action) {
    if (action === 'bite') this.input.bite = true;
    else if (action in this.input) this.input[action] = true;

    if (this.state === 'ready') {
      this.setState('playing');
    } else if (this.state === 'over' || this.state === 'win') {
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
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: U.rand(0.3, 0.7),
        color: color,
        size: U.rand(2, 5)
      });
    }
  };

  // ------------------------------------------------------------ 主循环

  Game.prototype.tick = function (now) {
    global.requestAnimationFrame(this.tick);
    if (!this.lastTime) this.lastTime = now;
    var dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw();
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

    if (this.state !== 'playing') return;

    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.resolveCombat();
    this.resolveEating();
    this.checkEnd();
  };

  Game.prototype.updatePlayer = function (dt) {
    var p = this.player;
    if (!p.alive) return;

    var ax = 0;
    var ay = 0;
    if (this.input.left) ax -= 1;
    if (this.input.right) ax += 1;
    if (this.input.up) ay -= 1;
    if (this.input.down) ay += 1;

    if (ax !== 0 || ay !== 0) {
      var len = Math.hypot(ax, ay);
      ax /= len;
      ay /= len;
      var spd = p.speed();
      p.vx += ax * spd * dt * 4;
      p.vy += ay * spd * dt * 4;
      p.angle = Math.atan2(ay, ax);
    }

    if (this.input.bite && p.tryBite()) {
      Sfx.bite();
    }

    p.applyFriction(dt);
    p.updateMotion(this.arena, dt);
  };

  Game.prototype.updateNPCs = function (dt) {
    var alive = this.aliveDinos();
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive || d.isPlayer) continue;

      var result = AI.update(d, alive, dt);
      if (result && result.action === 'bite') Sfx.bite();

      d.applyFriction(dt);
      d.updateMotion(this.arena, dt);
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

        // 咬击必须在面朝方向
        var angleToVictim = U.angleTo(attacker.x, attacker.y, victim.x, victim.y);
        var diff = Math.abs(U.wrapAngle(angleToVictim - attacker.angle));
        if (diff > Math.PI * 0.55) continue;

        if (attacker.canEat(victim)) continue; // 能直接吞就不咬

        var dmg = attacker.biteDamage();
        if (victim.radius > attacker.radius * 0.9) dmg *= 0.65;

        var killed = victim.takeDamage(dmg, attacker);
        this.addParticles(victim.x, victim.y, '#ff6060', 4);

        if (killed) {
          this.killDino(victim, attacker);
        }
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
        if (d > eater.radius + prey.radius * 0.55) continue;
        if (!eater.canEat(prey)) continue;

        var evolved = eater.absorb(prey);
        prey.alive = false;
        Sfx.eat();
        this.addParticles(prey.x, prey.y, eater.colors().body, 10);
        this.addMessage(eater.isPlayer ? '吞食 ' + prey.name + '！' : prey.name + ' 被吞食', 1.8);

        if (evolved) {
          if (eater.isPlayer) {
            Sfx.evolve();
            this.evolveFlash = 0.6;
            this.addMessage('进化 → ' + U.stageName(eater.mass) + '！', 2.5);
          }
        }

        if (eater.isPlayer) {
          if (this.hooks.onStats) this.hooks.onStats(this);
        }
      }
    }
  };

  Game.prototype.killDino = function (victim, killer) {
    victim.alive = false;
    this.addParticles(victim.x, victim.y, '#888', 8);

    if (killer) {
      killer.kills += 1;
      killer.mass += victim.mass * 0.25;
      var evolved = killer.syncStats();
      if (killer.isPlayer && evolved) {
        Sfx.evolve();
        this.addMessage('进化 → ' + U.stageName(killer.mass) + '！', 2.5);
      }
    }

    if (victim.isPlayer) {
      Sfx.die();
      this.setState('over');
      this.addMessage('你被击败了…', 3);
    }
  };

  Game.prototype.checkEnd = function () {
    var alive = this.aliveDinos();
    if (!this.player.alive) return;

    var npcCount = 0;
    for (var i = 0; i < alive.length; i++) {
      if (!alive[i].isPlayer) npcCount++;
    }

    if (npcCount === 0) {
      Sfx.win();
      this.highWins += 1;
      this.saveHighWins();
      this.setState('win');
      this.addMessage('你是最后的恐龙！胜利！', 4);
    }
  };

  // ------------------------------------------------------------ 渲染

  Game.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = global.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.round((width * ARENA_H) / ARENA_W);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.scale = width / ARENA_W;
  };

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    var w = ARENA_W;
    var h = ARENA_H;

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    // 草地背景
    ctx.fillStyle = '#2d5a3d';
    ctx.fillRect(0, 0, w, h);

    // 草地纹理
    ctx.fillStyle = '#346648';
    for (var gx = 0; gx < w; gx += 40) {
      for (var gy = 0; gy < h; gy += 40) {
        if ((gx + gy) % 80 === 0) {
          ctx.fillRect(gx, gy, 20, 20);
        }
      }
    }

    // 边界
    ctx.strokeStyle = '#1a3d28';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // 粒子
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 恐龙（小的先画，大的后画）
    var sorted = this.dinos.slice().sort(function (a, b) {
      return a.radius - b.radius;
    });
    for (var d = 0; d < sorted.length; d++) {
      sorted[d].draw(ctx);
    }

    if (this.evolveFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,200,' + this.evolveFlash * 0.35 + ')';
      ctx.fillRect(0, 0, w, h);
    }

    this.drawHUD(ctx);

    // 浮动消息
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    for (var m = 0; m < this.messages.length; m++) {
      var msg = this.messages[m];
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillText(msg.text, w / 2 + 1, 52 + m * 22 + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(msg.text, w / 2, 52 + m * 22);
    }
  };

  Game.prototype.drawHUD = function (ctx) {
    var p = this.player;
    if (!p) return;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(10, 10, 200, 72);
    ctx.fillStyle = '#e8f0e8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('阶段: ' + U.stageName(p.mass), 18, 28);
    ctx.fillText('体型: ' + Math.round(p.mass), 18, 44);
    ctx.fillText('击杀: ' + p.kills, 18, 60);
    ctx.fillText('存活: ' + this.aliveDinos().length, 18, 76);

    // 右上角存活数
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(ARENA_W - 110, 10, 100, 28);
    ctx.fillStyle = '#ffcc66';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('剩余 ' + this.aliveDinos().length + ' 只', ARENA_W - 18, 28);
  };

  Game.ARENA_W = ARENA_W;
  Game.ARENA_H = ARENA_H;
  global.Game = Game;
})(window);
