/**
 * 八球对局：摆球、击打、回合、人机。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});
  var COLORS = Pool.COLORS || {
    1: '#f0c400',
    2: '#1e5ad7',
    3: '#d61f2a',
    4: '#6b2ca0',
    5: '#e07a12',
    6: '#1a8f3c',
    7: '#6b1c1c',
    8: '#111111',
    9: '#f0c400',
    10: '#1e5ad7',
    11: '#d61f2a',
    12: '#6b2ca0',
    13: '#e07a12',
    14: '#1a8f3c',
    15: '#6b1c1c'
  };

  function shuffle(arr) {
    var i, j, t;
    for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function rackBalls() {
    var balls = [];
    var cue = Pool.makeBall(0, Pool.TW * 0.22, Pool.TH * 0.5, 'cue', '#f4f4f0', '');
    balls.push(cue);

    var ids = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    shuffle(ids);
    /* 8 号在三角中心（第 3 排正中，index 4），两底角不同花色 */
    var order = new Array(15);
    order[0] = ids.pop();
    order[4] = 8;
    var rest = ids.filter(function (n) { return n !== 8; });
    var solids = rest.filter(function (n) { return n < 8; });
    var stripes = rest.filter(function (n) { return n > 8; });
    if (Math.random() < 0.5) {
      order[10] = solids.pop();
      order[14] = stripes.pop();
    } else {
      order[10] = stripes.pop();
      order[14] = solids.pop();
    }
    rest = solids.concat(stripes);
    shuffle(rest);
    var k;
    for (k = 0; k < 15; k++) {
      if (order[k] == null) order[k] = rest.pop();
    }

    var gap = Pool.R * 2 + 0.18;
    var apexX = Pool.TW * 0.68;
    var apexY = Pool.TH * 0.5;
    var row, col, idx = 0, x, y;
    for (row = 0; row < 5; row++) {
      for (col = 0; col <= row; col++) {
        x = apexX + row * gap * Math.sqrt(3) / 2;
        y = apexY + (col - row / 2) * gap;
        k = order[idx++];
        balls.push(Pool.makeBall(
          k, x, y,
          k === 8 ? 'eight' : k < 8 ? 'solid' : 'stripe',
          COLORS[k],
          k
        ));
      }
    }
    return balls;
  }

  function Table(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks || {};
    this.C = Pool.CUSHION;
    this.mode = 'menu';
    this.names = ['玩家 1', '玩家 2'];
    this.reset('vsai');
    this.bind();
    this.last = 0;
    this.acc = 0;
    this.loop = this.loop.bind(this);
    global.requestAnimationFrame(this.loop);
  }

  Table.prototype.reset = function (mode, opts) {
    opts = opts || {};
    var keepScore = this.mode === 'challenge' && mode === 'challenge' && !opts.fresh;
    this.mode = mode || this.mode || 'vsai';
    if (opts.fresh) this.levelIndex = 0;
    this.turn = 0;
    this.openTable = true;
    this.assignment = [null, null];
    this.phase = 'aim';
    this.aimX = 1;
    this.aimY = 0;
    this.pull = this.mode === 'challenge' ? 78 : 150;
    this.keys = { left: false, right: false, up: false, down: false, shift: false };
    this.menuOpen = false;
    this.dragging = false;
    this.placing = false;
    this.placeAnywhere = false;
    this.firstHit = null;
    this.shotPocketed = [];
    this.cuePocketed = false;
    this.winner = -1;
    this.foulReason = '';
    this.aiTimer = 0;
    this.aiLevel = this.mode === 'vsai' ? 0.16 : 0.22;
    this.score = keepScore ? (this.score || 0) : 0;
    this.combo = 0;
    this.stars = 0;
    this.shake = 0;
    this.slow = 0;
    this.pops = [];
    this.sparks = [];
    this.levelIndex = this.mode === 'challenge' ? (this.levelIndex || 0) : 0;
    if (this.mode === 'challenge') this.loadChallenge(this.levelIndex);
    else this.balls = rackBalls();
    if (this.mode === 'challenge') this.pull = 78;
    if (this.mode === 'practice') this.names = ['练习', ''];
    else if (this.mode === 'vsai') this.names = ['你', '电脑'];
    else if (this.mode === 'challenge') {
      this.names = ['闯关', '目标'];
    } else this.names = ['玩家 1', '玩家 2'];
    this.msg = this.mode === 'challenge'
      ? (this.levelName + '：' + this.levelInfo)
      : '方向键瞄准，空格击打';
    this.emit();
  };

  Table.prototype.loadChallenge = function (index) {
    var L = Pool.LEVELS[index];
    var i, spec, id, group, cue, first;
    if (!L) L = Pool.LEVELS[0];
    this.levelIndex = index;
    this.levelName = L.name;
    this.levelInfo = L.info;
    this.maxShots = L.shots;
    this.need = L.need;
    this.shotsUsed = 0;
    this.cleared = 0;
    this.placeAnywhere = true;
    cue = Pool.makeBall(0, L.cue.x, L.cue.y, 'cue', '#f4f4f0', '');
    this.balls = [cue];
    for (i = 0; i < L.balls.length; i++) {
      spec = L.balls[i];
      id = spec.id;
      group = id === 8 ? 'eight' : id < 8 ? 'solid' : 'stripe';
      this.balls.push(Pool.makeBall(id, spec.x, spec.y, group, COLORS[id], id));
    }
    first = this.balls[1];
    if (first) {
      this.aimX = first.x - cue.x;
      this.aimY = first.y - cue.y;
      var n = Pool.norm({ x: this.aimX, y: this.aimY });
      this.aimX = n.x || 1;
      this.aimY = n.y || 0;
    }
  };

  Table.prototype.addPop = function (x, y, text, color, size) {
    this.pops.push({ x: x, y: y, text: text, color: color || '#ffe08a', size: size || 20, life: 1, vy: -38 });
  };

  Table.prototype.addSparks = function (x, y, color) {
    var i, a;
    for (i = 0; i < 14; i++) {
      a = Math.random() * Math.PI * 2;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(a) * (40 + Math.random() * 90),
        vy: Math.sin(a) * (40 + Math.random() * 90),
        r: 1.5 + Math.random() * 2.5,
        color: color || '#ffe08a',
        life: 0.7 + Math.random() * 0.4
      });
    }
  };

  Table.prototype.updateFx = function (dt) {
    var i, p, s;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 18);
    if (this.slow > 0) this.slow = Math.max(0, this.slow - dt);
    for (i = this.pops.length - 1; i >= 0; i--) {
      p = this.pops[i];
      p.y += p.vy * dt;
      p.life -= dt * 0.9;
      if (p.life <= 0) this.pops.splice(i, 1);
    }
    for (i = this.sparks.length - 1; i >= 0; i--) {
      s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt;
      s.life -= dt * 1.6;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  };

  Table.prototype.saveBest = function () {
    try {
      var key = 'poolFun.best';
      var best = parseInt(global.localStorage.getItem(key), 10) || 0;
      if (this.score > best) global.localStorage.setItem(key, String(this.score));
    } catch (e) {}
  };

  Table.prototype.cue = function () {
    return Pool.Rules.ballById(this.balls, 0);
  };

  Table.prototype.emit = function () {
    if (this.hooks.onHud) this.hooks.onHud(this);
  };

  Table.prototype.clientToTable = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var sx = this.canvas.width / rect.width;
    var sy = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * sx - this.C,
      y: (clientY - rect.top) * sy - this.C
    };
  };

  Table.prototype.bind = function () {
    var self = this;
    var el = this.canvas;

    function down(ev) {
      ev.preventDefault();
      Pool.Sfx.unlock();
      var p = self.pointer(ev);
      self.onDown(p);
    }
    function move(ev) {
      ev.preventDefault();
      self.onMove(self.pointer(ev));
    }
    function up(ev) {
      ev.preventDefault();
      self.onUp(self.pointer(ev));
    }
    el.addEventListener('mousedown', down);
    global.addEventListener('mousemove', move);
    global.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: false });
    global.addEventListener('touchmove', move, { passive: false });
    global.addEventListener('touchend', up);
    global.addEventListener('keydown', function (ev) {
      self.onKey(ev, true);
    });
    global.addEventListener('keyup', function (ev) {
      self.onKey(ev, false);
    });
    global.addEventListener('blur', function () {
      self.keys.left = self.keys.right = self.keys.up = self.keys.down = false;
    });
  };

  Table.prototype.keyName = function (code) {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyQ') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'KeyE') return 'right';
    if (code === 'ArrowUp' || code === 'KeyW') return 'up';
    if (code === 'ArrowDown' || code === 'KeyS') return 'down';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'shift';
    return '';
  };

  Table.prototype.onKey = function (ev, down) {
    var name = this.keyName(ev.code);
    if (name) {
      this.keys[name] = down;
      if (down && (name === 'left' || name === 'right' || name === 'up' || name === 'down')) {
        ev.preventDefault();
      }
    }
    if (!down) return;
    if (ev.repeat) return;
    if (this.menuOpen) return;
    if (ev.code === 'Space' || ev.code === 'Enter') {
      ev.preventDefault();
      Pool.Sfx.unlock();
      if (this.canPlace()) this.confirmPlace();
      else if (this.canAim()) this.shoot(this.pull > 12 ? this.pull : 150);
    }
  };

  Table.prototype.setHold = function (name, down) {
    if (this.keys[name] === undefined) return;
    this.keys[name] = !!down;
    Pool.Sfx.unlock();
  };

  Table.prototype.rotateAim = function (delta) {
    if (!this.canAim()) return;
    var ang = Math.atan2(this.aimY, this.aimX) + delta;
    this.aimX = Math.cos(ang);
    this.aimY = Math.sin(ang);
  };

  Table.prototype.applyHolds = function (dt) {
    var cue, speed, nx, ny, x, y;
    if (this.canAim()) {
      speed = this.keys.shift ? 0.7 : 2.3;
      if (this.keys.left) this.rotateAim(-speed * dt);
      if (this.keys.right) this.rotateAim(speed * dt);
      if (this.keys.up) this.pull = Pool.clamp(this.pull + 160 * dt, 8, 180);
      if (this.keys.down) this.pull = Pool.clamp(this.pull - 160 * dt, 8, 180);
    }
    if (this.canPlace()) {
      cue = this.cue();
      if (!cue) return;
      nx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      ny = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
      if (!nx && !ny) return;
      x = cue.x + nx * 140 * dt;
      y = cue.y + ny * 140 * dt;
      this.moveCueTo(x, y, false);
    }
  };

  Table.prototype.moveCueTo = function (x, y, snap) {
    var cue = this.cue();
    if (!cue) return false;
    if (this.placeAnywhere) {
      x = Pool.clamp(x, Pool.R + 1, Pool.TW - Pool.R - 1);
    } else {
      x = Pool.clamp(x, Pool.R + 1, Pool.TW * 0.25);
    }
    y = Pool.clamp(y, Pool.R + 1, Pool.TH - Pool.R - 1);
    if (Pool.overlapsAny(this.balls, x, y, Pool.R, cue)) {
      if (snap) {
        this.msg = '这里没空位，换个位置放下白球';
        this.emit();
      }
      return false;
    }
    cue.x = x;
    cue.y = y;
    cue.vx = 0;
    cue.vy = 0;
    cue.pocketed = false;
    return true;
  };

  Table.prototype.confirmPlace = function () {
    var cue = this.cue();
    if (!this.canPlace() || !cue) return;
    if (!this.moveCueTo(cue.x, cue.y, true)) return;
    this.phase = 'aim';
    this.pull = this.mode === 'challenge' ? 78 : 150;
    this.msg = '自由球已放好，方向键瞄准，空格击打';
    this.emit();
  };

  Table.prototype.autoPlaceCue = function () {
    var spots = [
      { x: Pool.TW * 0.22, y: Pool.TH * 0.5 },
      { x: Pool.TW * 0.22, y: Pool.TH * 0.32 },
      { x: Pool.TW * 0.22, y: Pool.TH * 0.68 },
      { x: Pool.TW * 0.18, y: Pool.TH * 0.5 },
      { x: Pool.TW * 0.5, y: Pool.TH * 0.5 }
    ];
    var i;
    this.placeAnywhere = true;
    for (i = 0; i < spots.length; i++) {
      if (this.moveCueTo(spots[i].x, spots[i].y, false)) {
        this.phase = 'aim';
        this.pull = this.mode === 'challenge' ? 78 : 150;
        this.emit();
        return;
      }
    }
    this.phase = 'aim';
    this.emit();
  };

  Table.prototype.pointer = function (ev) {
    var t = ev.touches && ev.touches[0] || ev.changedTouches && ev.changedTouches[0];
    var x = t ? t.clientX : ev.clientX;
    var y = t ? t.clientY : ev.clientY;
    return this.clientToTable(x, y);
  };

  Table.prototype.canAim = function () {
    return this.phase === 'aim' && this.winner < 0 && !this.isAiTurn() && !this.menuOpen;
  };

  Table.prototype.canPlace = function () {
    return this.phase === 'place' && this.winner < 0 && !this.isAiTurn() && !this.menuOpen;
  };

  Table.prototype.isAiTurn = function () {
    return this.mode === 'vsai' && this.turn === 1 && this.winner < 0;
  };

  Table.prototype.onDown = function (p) {
    var cue = this.cue();
    if (this.phase === 'place') {
      this.tryPlace(p);
      return;
    }
    if (!this.canAim() || !cue) return;
    this.updateAim(p, cue);
    this.dragging = true;
    this.pull = 8;
  };

  Table.prototype.onMove = function (p) {
    var cue = this.cue();
    if (this.phase === 'place') return;
    if (!cue || this.phase !== 'aim' || this.winner >= 0) return;
    if (this.isAiTurn()) return;
    if (this.dragging) {
      var away = Pool.dot(Pool.sub(cue, p), Pool.norm({ x: this.aimX, y: this.aimY }));
      this.pull = Pool.clamp(away, 8, 180);
    } else {
      this.updateAim(p, cue);
    }
  };

  Table.prototype.onUp = function () {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.canAim() && this.pull > 10) this.shoot(this.pull);
    else if (this.pull < 20) this.pull = this.mode === 'challenge' ? 78 : 150;
  };

  Table.prototype.updateAim = function (p, cue) {
    var d = Pool.sub(p, cue);
    if (Pool.len(d) > 0.5) {
      var n = Pool.norm(d);
      this.aimX = n.x;
      this.aimY = n.y;
    }
  };

  Table.prototype.tryPlace = function (p) {
    if (!this.canPlace()) return;
    if (!this.moveCueTo(p.x, p.y, true)) return;
    this.confirmPlace();
  };

  Table.prototype.shoot = function (pull) {
    var cue = this.cue();
    if (!cue || this.phase !== 'aim') return;
    var power = 220 + pull * 9;
    cue.vx = this.aimX * power;
    cue.vy = this.aimY * power;
    this.phase = 'rolling';
    this.firstHit = null;
    this.shotPocketed = [];
    this.cuePocketed = false;
    this.recordedFirst = false;
    this.shake = Math.max(this.shake, 3 + pull / 40);
    Pool.Sfx.cue(pull / 180);
    this.msg = '球在滚动…';
    this.emit();
  };

  Table.prototype.stepPhysics = function (dt) {
    var cue = this.cue();
    var i, b, hit, fallen, maxHit, rel, n;
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.pocketed) continue;
      if (!b.trail) b.trail = [];
      if (Pool.moving(b)) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 12) b.trail.shift();
      } else if (b.trail.length) {
        b.trail.shift();
      }
    }
    Pool.integrate(this.balls, dt);
    Pool.hitCushions(this.balls);

    if (!this.recordedFirst && cue && !cue.pocketed) {
      for (i = 1; i < this.balls.length; i++) {
        b = this.balls[i];
        if (b.pocketed) continue;
        if (Pool.dist(cue, b) > cue.r + b.r + 1.2) continue;
        rel = (cue.vx - b.vx) * (b.x - cue.x) + (cue.vy - b.vy) * (b.y - cue.y);
        if (rel > 0) {
          this.firstHit = b;
          this.recordedFirst = true;
          this.shake = Math.max(this.shake, 4);
          break;
        }
      }
    }

    maxHit = 0;
    for (i = 0; i < 8; i++) {
      hit = Pool.collideBalls(this.balls);
      if (hit > maxHit) maxHit = hit;
    }
    if (maxHit > 40) {
      Pool.Sfx.collide(maxHit);
      this.shake = Math.max(this.shake, Math.min(10, maxHit / 80));
    }

    fallen = Pool.pocketBalls(this.balls);
    if (fallen.length) {
      Pool.Sfx.pocket();
      this.slow = Math.max(this.slow, 0.28);
      this.shake = Math.max(this.shake, 7);
      for (i = 0; i < fallen.length; i++) {
        this.shotPocketed.push(fallen[i]);
        if (fallen[i].group === 'cue') this.cuePocketed = true;
        else {
          this.addPop(fallen[i].x, fallen[i].y, '进袋!', '#ffe08a', 22);
          this.addSparks(fallen[i].x, fallen[i].y, fallen[i].color);
        }
      }
      n = fallen.filter(function (b) { return b.group !== 'cue'; }).length;
      if (n >= 2) {
        this.addPop(Pool.TW / 2, Pool.TH / 2, '一杆 ' + n + ' 袋!', '#ffd36a', 28);
        Pool.Sfx.combo(n);
      }
    }
  };

  Table.prototype.awardPockets = function (pocketed) {
    var i, b, n = 0, pts, bonus;
    for (i = 0; i < pocketed.length; i++) {
      b = pocketed[i];
      if (b.group === 'cue') continue;
      n++;
      pts = 100 + (n - 1) * 50;
      if (b.group === 'eight') pts += 50;
      this.score += pts;
    }
    if (n > 0) {
      this.combo += 1;
      if (this.combo >= 2) {
        bonus = this.combo * 40;
        this.score += bonus;
        this.addPop(Pool.TW / 2, 80, '连击 x' + this.combo, '#7ecb8a', 24);
        Pool.Sfx.combo(this.combo);
      }
    } else {
      this.combo = 0;
    }
    this.saveBest();
    return n;
  };

  Table.prototype.finishChallengeShot = function () {
    var n = this.awardPockets(this.shotPocketed);
    this.cleared += n;
    this.shotsUsed += 1;
    if (this.cuePocketed) {
      var cue = this.cue();
      cue.pocketed = false;
      cue.x = Pool.TW * 0.22;
      cue.y = Pool.TH * 0.5;
      cue.vx = 0;
      cue.vy = 0;
      this.combo = 0;
      this.phase = 'place';
      this.placeAnywhere = true;
      this.msg = '白球进袋了！方向键摆好再空格';
    } else {
      this.phase = 'aim';
      this.msg = n ? ('打进 ' + n + ' 颗！空格继续') : '没进，再瞄准一次';
    }
    if (this.cleared >= this.need) {
      this.stars = 1;
      if (this.shotsUsed <= this.maxShots - 1) this.stars = 2;
      if (this.shotsUsed <= Math.max(1, this.maxShots - 2) || n >= 2) this.stars = 3;
      this.winner = 0;
      this.phase = 'over';
      this.score += 200 * this.stars;
      this.saveBest();
      this.msg = this.levelIndex >= Pool.LEVELS.length - 1
        ? ('全部通关！总分 ' + this.score)
        : (this.levelName + ' 过关！' + '★'.repeat(this.stars));
      Pool.Sfx.star();
    } else if (this.shotsUsed >= this.maxShots) {
      this.winner = 1;
      this.phase = 'over';
      this.stars = 0;
      this.msg = '杆数用完了，按 4 重试本关';
      Pool.Sfx.foul();
    }
    this.emit();
  };

  Table.prototype.nextLevel = function () {
    this.levelIndex = (this.levelIndex || 0) + 1;
    if (this.levelIndex >= Pool.LEVELS.length) {
      this.winner = 0;
      this.phase = 'over';
      this.msg = '全部通关！总分 ' + this.score;
      this.emit();
      return false;
    }
    this.reset('challenge');
    return true;
  };

  Table.prototype.finishShot = function () {
    if (this.mode === 'challenge') {
      this.finishChallengeShot();
      return;
    }

    var shot = {
      firstHit: this.firstHit,
      pocketed: this.shotPocketed,
      cuePocketed: this.cuePocketed
    };
    var result = Pool.Rules.summarizeShot(this, shot);
    if (this.mode !== 'practice') {
      Pool.Rules.applyGroups(this, this.shotPocketed, this.turn);
    }
    if (this.mode === 'practice' || this.turn === 0) this.awardPockets(this.shotPocketed);

    if (result.win) {
      this.winner = this.turn;
      this.phase = 'over';
      this.msg = this.names[this.turn] + ' 打进 8 号，获胜！';
      if (this.turn === 0) this.addPop(Pool.TW / 2, Pool.TH / 2, '胜利!', '#ffe08a', 32);
      Pool.Sfx.win();
      this.emit();
      return;
    }
    if (result.lose) {
      this.winner = this.turn === 0 && this.mode !== 'practice' ? 1 : 0;
      if (this.mode === 'practice') this.winner = 1;
      this.phase = 'over';
      this.msg = result.reason || '8 号入袋判负';
      Pool.Sfx.foul();
      this.emit();
      return;
    }

    if (this.cuePocketed) {
      var cue = this.cue();
      cue.pocketed = false;
      cue.x = Pool.TW * 0.22;
      cue.y = Pool.TH * 0.5;
      cue.vx = 0;
      cue.vy = 0;
    }

    if (this.mode === 'practice') {
      this.phase = this.cuePocketed ? 'place' : 'aim';
      this.placeAnywhere = true;
      this.turn = 0;
      this.msg = this.cuePocketed ? '白球入袋，方向键移动白球，空格放下' : (result.ownIn ? '打进了！空格继续' : '方向键瞄准，空格击打');
      this.emit();
      return;
    }

    if (result.foul) {
      this.turn = 1 - this.turn;
      this.phase = 'place';
      this.placeAnywhere = true;
      this.msg = '犯规：' + result.reason + '。方向键移动白球，空格放下';
      Pool.Sfx.foul();
    } else if (result.ownIn) {
      this.phase = 'aim';
      this.msg = '打进了，空格继续击打';
    } else {
      this.turn = 1 - this.turn;
      this.phase = 'aim';
      this.msg = '换人：方向键瞄准，空格击打';
    }
    this.emit();
  };

  Table.prototype.update = function (dt) {
    this.applyHolds(dt);
    this.updateFx(dt);
    if (this.phase === 'rolling') {
      var phys = this.slow > 0 ? dt * 0.38 : dt;
      this.stepPhysics(phys);
      if (!Pool.anyMoving(this.balls)) this.finishShot();
    }
    if (this.phase === 'place' && this.isAiTurn()) {
      this.autoPlaceCue();
    }
    if (this.phase === 'aim' && this.isAiTurn() && this.winner < 0) {
      this.aiTimer += dt;
      if (this.aiTimer > 0.7) {
        this.aiTimer = 0;
        this.aiShoot();
      }
    }
  };

  Table.prototype.aiShoot = function () {
    var shot = Pool.AI.pickShot(this);
    if (!shot) {
      this.aimX = 1;
      this.aimY = 0;
      this.shoot(90);
      return;
    }
    this.aimX = shot.ax;
    this.aimY = shot.ay;
    this.shoot((shot.power - 220) / 9);
  };

  Table.prototype.draw = function () {
    var ctx = this.ctx;
    var C = this.C;
    var w = Pool.TW + C * 2;
    var h = Pool.TH + C * 2;
    var i, cue, sx = 0, sy = 0;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
    }
    ctx.save();
    ctx.translate(sx, sy);
    Pool.Render.drawTable(ctx, C);
    if (this.mode === 'challenge') Pool.Render.drawTargets(ctx, this.balls, C);
    for (i = 0; i < this.balls.length; i++) Pool.Render.drawTrail(ctx, this.balls[i], C);
    cue = this.cue();
    if (this.phase === 'aim' && cue && !cue.pocketed && this.winner < 0 && !this.isAiTurn()) {
      Pool.Render.drawAim(ctx, cue, this.aimX, this.aimY, this.balls, C);
      Pool.Render.drawCue(ctx, cue, this.aimX, this.aimY, this.pull, C);
      Pool.Render.drawPower(ctx, this.pull, C);
    }
    for (i = 0; i < this.balls.length; i++) Pool.Render.drawBall(ctx, this.balls[i], C);
    Pool.Render.drawSparks(ctx, this.sparks || [], C);
    Pool.Render.drawPops(ctx, this.pops || [], C);
    Pool.Render.drawHudStrip(ctx, this, C);
    ctx.restore();
  };

  Table.prototype.loop = function (now) {
    if (!this.last) this.last = now;
    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    while (this.acc >= 1 / 120) {
      this.update(1 / 120);
      this.acc -= 1 / 120;
    }
    this.draw();
    global.requestAnimationFrame(this.loop);
  };

  Pool.Table = Table;
})(typeof window !== 'undefined' ? window : global);
