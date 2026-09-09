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

  var Roster = global.Roster;

  var GRACE_TIME = 1.2;

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
    this.roundIndex = 0;
    this.teamWins = 0;
    this.enemyTeamIndex = 0;
    this.pendingRoundEnd = false;
    this.lastResult = '';
    this.moveTarget = null;

    if (this.r3d) this.r3d.clearEntities();
    if (this.skills) {
      this.skills.projectiles = [];
      this.skills.domainActive = false;
      this.skills.iceDomainTimer = 0;
      this.skills.lifeDomainTimer = 0;
    }

    this.playerTeam = Roster.cloneTeam(Roster.PLAYER_TEAM);
    this.startNextOpponent();
    this.player = null;
  };

  Game.prototype.startNextOpponent = function () {
    var list = Roster.ENEMY_TEAMS;
    var tmpl = list[this.enemyTeamIndex % list.length];
    this.enemyTeam = Roster.cloneTeam(tmpl);
    this.roundIndex = 0;
    this.addMessage('下一场对手：【' + this.enemyTeam.name + '】', 3.0);
  };

  Game.prototype.aliveMembers = function (team) {
    var out = [];
    for (var i = 0; i < team.members.length; i++) {
      if (!team.members[i].eliminated) out.push(team.members[i]);
    }
    return out;
  };

  Game.prototype.findMember = function (team, id) {
    for (var i = 0; i < team.members.length; i++) {
      if (team.members[i].id === id) return team.members[i];
    }
    return null;
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
      beastType: opts.beastType,
      fighterKind: opts.fighterKind,
      characterId: opts.characterId,
      kit: opts.kit,
      ringText: opts.ringText,
      role: opts.role,
      uniform: opts.uniform
    });
    this.dinos.push(entity);
    if (this.r3d) this.r3d.createEntityMesh(entity);
    return entity;
  };

  Game.prototype.spawnFromMember = function (member, isPlayer, x, y, face) {
    var e = this.spawnEntity({
      isPlayer: isPlayer,
      x: x,
      y: y,
      level: member.level,
      hp: member.hp,
      mp: member.mp,
      attack: member.attack,
      defense: member.defense,
      name: member.name,
      martialSoul: member.soul,
      fighterKind: member.model,
      characterId: member.id,
      kit: member.kit || 'member',
      ringText: member.rings,
      role: member.role || member.title,
      uniform: member.uniform || ''
    });
    e.maxHp = member.maxHp;
    e.maxMp = member.maxMp;
    e.hp = member.hp;
    e.mp = member.mp;
    e.angle = face;
    e.hasBadge = !!isPlayer;
    return e;
  };

  Game.prototype.startRound = function (playerMemberId) {
    var mine = this.findMember(this.playerTeam, playerMemberId);
    if (!mine || mine.eliminated) return false;

    var foes = this.aliveMembers(this.enemyTeam);
    if (!foes.length) return false;
    var foe = foes[0];

    this.dinos = [];
    this.particles = [];
    this.skills.projectiles = [];
    this.skills.domainActive = false;
    this.skills.iceDomainTimer = 0;
    this.skills.lifeDomainTimer = 0;
    if (this.r3d) {
      this.r3d.clearEntities();
      this.world.setDomainActive(false, 0, 0);
    }

    this.roundIndex += 1;
    this.playTime = 0;
    this.pendingRoundEnd = false;

    this.player = this.spawnFromMember(mine, true, -20, 0, 0);
    this.opponent = this.spawnFromMember(foe, false, 20, 0, Math.PI);
    this.currentPlayerId = mine.id;
    this.currentEnemyId = foe.id;
    if (this.r3d && this.r3d.snapCombatCamera) this.r3d.snapCombatCamera();

    this.addMessage('第 ' + this.roundIndex + ' 局 1v1：' + mine.name + ' VS ' + foe.name, 3.2);
    if (mine.id === 'chen' && this.playerTeam && this.playerTeam.slogan) {
      this.addMessage(this.playerTeam.slogan, 3.6);
    }
    this.moveTarget = null;
    this.setState('playing');
    return true;
  };

  Game.prototype.preferredFighterId = function () {
    var chen = this.findMember(this.playerTeam, 'chen');
    if (chen && !chen.eliminated) return chen.id;
    var alive = this.aliveMembers(this.playerTeam);
    return alive.length ? alive[0].id : null;
  };

  Game.prototype.startDefaultRound = function () {
    var id = this.preferredFighterId();
    return id ? this.startRound(id) : false;
  };

  Game.prototype.setMoveTargetFromClient = function (clientX, clientY) {
    if (!this.canvas || !this.r3d || !this.r3d.pickGround) return;
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    var hit = this.r3d.pickGround(ndcX, ndcY);
    if (hit) this.moveTarget = hit;
  };

  Game.prototype.saveFighterHp = function (entity, team, memberId) {
    if (!entity) return;
    var m = this.findMember(team, memberId);
    if (!m) return;
    m.hp = Math.max(1, entity.hp);
    m.mp = Math.max(0, entity.mp);
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
    this.state = state;
    if (this.hooks.onState) this.hooks.onState(state, this);
  };

  Game.prototype.press = function (action) {
    if (action === 'bite') this.input.bite = true;
    else if (action in this.input) this.input[action] = true;

    if (this.state === 'ready' || this.state === 'pick') this.startDefaultRound();
    else if (this.state === 'over') {
      this.reset();
      this.startDefaultRound();
    }
  };

  Game.prototype.release = function (action) {
    if (action === 'bite') this.input.bite = false;
    else if (action in this.input) this.input[action] = false;
  };

  Game.prototype.restart = function () {
    this.reset();
    if (!this.startDefaultRound()) this.setState('pick');
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

    this.r3d.updateCamera(this.player, dt, this.opponent);

    if (this.state !== 'playing') {
      return;
    }

    this.playTime += dt;

    if (this.player && this.player.alive && this.player.hp < this.player.maxHp) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28 * dt);
    }

    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.skills.update(dt);
    this.resolveCombat();
    this.collectDeaths();
  };

  Game.prototype.updatePlayer = function (dt) {
    var p = this.player;
    if (!p.alive) return;

    var ax = 0, ay = 0;
    if (this.input.left) ax -= 1;
    if (this.input.right) ax += 1;
    if (this.input.up) ay -= 1;
    if (this.input.down) ay += 1;

    var usingKeys = ax !== 0 || ay !== 0;
    if (usingKeys) this.moveTarget = null;
    else if (this.moveTarget) {
      var tdx = this.moveTarget.x - p.x;
      var tdy = this.moveTarget.y - p.y;
      var tdist = Math.hypot(tdx, tdy);
      if (tdist > 8) {
        ax = tdx / tdist;
        ay = tdy / tdist;
      } else {
        this.moveTarget = null;
      }
    }

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
    var ctx = { playTime: this.playTime, graceTime: GRACE_TIME, player: this.player, skills: this.skills, enemyMember: this.findMember(this.enemyTeam, this.currentEnemyId) };
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
      if (victim.isPlayer) dmg *= 0.42;

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
    if (this.pendingRoundEnd) return;
    this.pendingRoundEnd = true;
    this.finishRound(victim, killer);
  };

  Game.prototype.finishRound = function (loser) {
    var playerWon = !loser.isPlayer;
    var myMem = this.findMember(this.playerTeam, this.currentPlayerId);
    var enMem = this.findMember(this.enemyTeam, this.currentEnemyId);

    if (playerWon) {
      if (enMem) enMem.eliminated = true;
      if (this.player && this.player.alive) this.saveFighterHp(this.player, this.playerTeam, this.currentPlayerId);
      Sfx.absorb();
      this.lastResult = 'win';
      this.addMessage(this.player.name + ' 击败 ' + loser.name + '！可换人继续 1v1', 3.0);
    } else {
      if (myMem) myMem.eliminated = true;
      if (this.opponent && this.opponent.alive) this.saveFighterHp(this.opponent, this.enemyTeam, this.currentEnemyId);
      Sfx.die();
      this.lastResult = 'lose';
      this.addMessage(loser.name + ' 战败退场！请换下一名队员', 3.0);
    }

    var myLeft = this.aliveMembers(this.playerTeam).length;
    var enLeft = this.aliveMembers(this.enemyTeam).length;

    var self = this;
    setTimeout(function () {
      if (myLeft <= 0) {
        self.setState('over');
        self.addMessage((self.playerTeam && self.playerTeam.name ? self.playerTeam.name : '圣龙神辉战队') + '全员战败… 按 R 再战', 4);
        return;
      }
      if (enLeft <= 0) {
        self.teamWins += 1;
        self.enemyTeamIndex += 1;
        self.playerTeam = Roster.cloneTeam(Roster.PLAYER_TEAM);
        self.startNextOpponent();
        self.addMessage('赢下团队赛！连战下一队【' + self.enemyTeam.name + '】，全员复活换人', 4);
        self.setState('pick');
        return;
      }
      self.setState('pick');
    }, 900);
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
