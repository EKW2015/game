/**
 * 斗罗大陆：3D光明圣龙对战与游戏世界核心引擎
 */
(function (global) {
  'use strict';

  var U = global.Utils;
  var Dino = global.Dino;
  var AI = global.AI;
  var Sfx = global.Sfx;
  var Renderer3D = global.Renderer3D;
  var SkillManager = global.SkillManager;

  var MAX_NPC = 12;
  var SPAWN_MIN = 350;
  var SPAWN_MAX = 800;
  var DESPAWN_DIST = 1600;

  var SOUL_BEAST_NAMES = [
    { name: '万年·暗魔邪神虎', type: 'tiger', level: 68, hp: 3200, atk: 140 },
    { name: '五万年·暗金恐爪熊', type: 'bear', level: 75, hp: 4500, atk: 180 },
    { name: '八万年·泰坦巨猿', type: 'ape', level: 82, hp: 6000, atk: 220 },
    { name: '万年·幽冥影豹', type: 'tiger', level: 60, hp: 2500, atk: 120 },
    { name: '千年·炽火烈龙兽', type: 'bear', level: 52, hp: 2000, atk: 95 },
    { name: '十万年·暗影狂魔', type: 'ape', level: 90, hp: 8500, atk: 280 }
  ];

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.hooks = hooks || {};
    this.state = 'ready';
    this.input = { up: false, down: false, left: false, right: false, bite: false };
    this.particles = [];
    this.messages = [];
    this.nextId = 1;
    this.playTime = 0;
    this.highKills = this.loadHighKills();

    this.r3d = new Renderer3D(canvas);
    this.world = this.r3d.world;
    this.skills = new SkillManager(this);

    this.reset();
    this.resize();
    this.lastTime = 0;
    this.tick = this.tick.bind(this);
    global.requestAnimationFrame(this.tick);
  }

  Game.prototype.loadHighKills = function () {
    try {
      return parseInt(global.localStorage.getItem('douluo3d.kills'), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  Game.prototype.saveHighKills = function () {
    try {
      global.localStorage.setItem('douluo3d.kills', String(this.highKills));
    } catch (e) {}
  };

  Game.prototype.reset = function () {
    this.dinos = [];
    this.particles = [];
    this.messages = [];
    this.nextId = 1;
    this.playTime = 0;

    if (this.r3d) this.r3d.clearEntities();
    if (this.skills) {
      this.skills.projectiles = [];
      this.skills.domainActive = false;
    }

    // 初始化玩家：七环魂帝·光明圣龙魂师
    this.player = this.spawnEntity({
      isPlayer: true,
      x: 0,
      y: 0,
      level: 78, // 七环魂圣
      hp: 3500,
      mp: 1200,
      attack: 240,
      defense: 160,
      name: '圣龙斗罗',
      martialSoul: '光明圣龙'
    });

    for (var i = 0; i < 7; i++) {
      this.spawnNpcNearPlayer();
    }
  };

  Game.prototype.spawnEntity = function (opts) {
    var entity = new Dino({
      id: this.nextId++,
      isPlayer: opts.isPlayer,
      x: opts.x,
      y: opts.y,
      level: opts.level,
      hp: opts.hp,
      mp: opts.mp,
      attack: opts.attack,
      defense: opts.defense,
      name: opts.name,
      martialSoul: opts.martialSoul,
      beastType: opts.beastType
    });
    this.dinos.push(entity);
    if (this.r3d) this.r3d.createEntityMesh(entity);
    return entity;
  };

  Game.prototype.spawnNpcNearPlayer = function () {
    if (!this.player) return null;
    var angle = U.rand(0, Math.PI * 2);
    var dist = U.rand(SPAWN_MIN, SPAWN_MAX);
    var x = this.player.x + Math.cos(angle) * dist;
    var y = this.player.y + Math.sin(angle) * dist;

    var tmpl = SOUL_BEAST_NAMES[U.randInt(0, SOUL_BEAST_NAMES.length - 1)];

    return this.spawnEntity({
      x: x,
      y: y,
      level: tmpl.level,
      hp: tmpl.hp,
      mp: 500,
      attack: tmpl.atk,
      defense: tmpl.level * 1.5,
      name: tmpl.name,
      beastType: tmpl.type
    });
  };

  Game.prototype.nearbyNpcCount = function () {
    var n = 0;
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive || d.isPlayer) continue;
      if (U.dist(d.x, d.y, this.player.x, this.player.y) < SPAWN_MAX + 300) n++;
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
        var mesh = this.r3d.meshes.get(d.id);
        if (mesh) this.r3d.scene.remove(mesh);
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

  Game.prototype.aliveEntities = function () {
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
      this.addMessage('武魂觉醒：光明圣龙！按数字键1-7释放七大魂技！', 3.5);
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

  Game.prototype.addParticles = function (x, y, color, count, zOffset) {
    for (var i = 0; i < count; i++) {
      var a = U.rand(0, Math.PI * 2);
      var spd = U.rand(50, 240);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: U.rand(0.4, 0.9),
        color: color || '#ffd700',
        size: U.rand(2, 6),
        zOffset: zOffset || 0
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
      return;
    }

    this.playTime += dt;

    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.skills.update(dt);
    this.resolveCombat();
    this.collectDeaths();
    this.maintainPopulation();
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
      var spd = p.getSpeed();
      p.vx += ax * spd * dt * 4.5;
      p.vy += ay * spd * dt * 4.5;
      p.angle = Math.atan2(ay, ax);
    }

    // 普通攻击：圣龙爪击 / 扑咬
    if (this.input.bite && p.tryBite()) {
      Sfx.bite();
      this.performPlayerMeleeAttack();
    }

    p.applyFriction(dt);
    p.updateMotion(this.world, dt);
  };

  Game.prototype.performPlayerMeleeAttack = function () {
    var p = this.player;
    var reach = p.biteReach();
    for (var i = 0; i < this.dinos.length; i++) {
      var beast = this.dinos[i];
      if (!beast.alive || beast.isPlayer) continue;

      var d = U.dist(p.x, p.y, beast.x, beast.y);
      if (d < reach + beast.radius) {
        var aToB = U.angleTo(p.x, p.y, beast.x, beast.y);
        if (Math.abs(U.wrapAngle(aToB - p.angle)) < Math.PI * 0.5) {
          var dmg = p.biteDamage();
          if (beast.takeDamage(dmg, p)) {
            this.killEntity(beast, p);
          } else {
            Sfx.hit();
            this.addParticles(beast.x, beast.y, '#ffd700', 8);
          }
        }
      }
    }
  };

  Game.prototype.updateNPCs = function (dt) {
    var alive = this.aliveEntities();
    var ctx = { playTime: this.playTime, player: this.player };
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
      if (!attacker.alive || attacker.isPlayer || attacker.biteAnim <= 0) continue;

      var victim = this.player;
      if (!victim || !victim.alive) continue;

      var d = U.dist(attacker.x, attacker.y, victim.x, victim.y);
      if (d > attacker.biteReach() + victim.radius * 0.7) continue;

      var dmg = attacker.biteDamage();
      if (victim.takeDamage(dmg, attacker)) {
        this.killEntity(victim, attacker);
      } else {
        Sfx.hit();
        this.addParticles(victim.x, victim.y, '#ff4444', 6);
      }
    }
  };

  Game.prototype.collectDeaths = function () {
    for (var i = 0; i < this.dinos.length; i++) {
      var d = this.dinos[i];
      if (!d.alive && !d._credited) {
        this.killEntity(d, d.isPlayer ? null : this.player);
      }
    }
  };

  Game.prototype.killEntity = function (victim, killer) {
    if (!victim || victim._credited) return;
    victim._credited = true;
    victim.alive = false;
    this.addParticles(victim.x, victim.y, '#ffd700', 30);

    if (killer && killer.isPlayer) {
      killer.kills += 1;
      killer.mp = Math.min(killer.maxMp, killer.mp + 150); // 击杀魂兽恢复大量魂力
      killer.hp = Math.min(killer.maxHp, killer.hp + 200);

      // 击杀吸收魂环，提升魂力等级与战力
      killer.level += 1;
      killer.title = U.getTitleByLevel(killer.level);
      killer.attack += 15;
      killer.defense += 10;
      killer.maxHp += 120;
      killer.hp += 120;
      Sfx.absorb();
      this.addMessage('击杀【' + victim.name + '】！吸收魂环，等级提升至 ' + killer.level + ' 级（' + killer.title + '）！', 3.0);

      if (killer.kills > this.highKills) {
        this.highKills = killer.kills;
        this.saveHighKills();
      }
    }

    if (victim.isPlayer) {
      Sfx.die();
      this.setState('over');
      this.addMessage('魂力耗尽倒下… 按 R 重新开始', 4);
    }
  };

  Game.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.round(w * 9 / 16);
    this.r3d.resize(w, h);
  };

  Game.prototype.draw = function (dt) {
    var w = this.world;
    for (var i = 0; i < this.dinos.length; i++) {
      this.r3d.updateEntityMesh(this.dinos[i], w, dt);
    }
    this.r3d.syncSkillProjectiles(this.skills.projectiles);
    this.r3d.syncParticles(this.particles, w);
    this.r3d.render();
    if (this.hooks.onHud) this.hooks.onHud(this);
  };

  global.Game = Game;
})(window);
