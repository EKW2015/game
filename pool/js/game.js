/**
 * 八球对局：摆球、击打、回合、人机。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});
  var COLORS = {
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

  Table.prototype.reset = function (mode) {
    this.mode = mode || this.mode || 'vsai';
    this.balls = rackBalls();
    this.turn = 0;
    this.openTable = true;
    this.assignment = [null, null];
    this.phase = 'aim';
    this.aimX = 1;
    this.aimY = 0;
    this.pull = 0;
    this.dragging = false;
    this.placing = false;
    this.placeAnywhere = false;
    this.firstHit = null;
    this.shotPocketed = [];
    this.cuePocketed = false;
    this.msg = '瞄准后拉杆击打';
    this.winner = -1;
    this.foulReason = '';
    this.aiTimer = 0;
    this.aiLevel = this.mode === 'vsai' ? 0.16 : 0.22;
    if (this.mode === 'practice') this.names = ['练习', ''];
    else if (this.mode === 'vsai') this.names = ['你', '电脑'];
    else this.names = ['玩家 1', '玩家 2'];
    this.emit();
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
      if (ev.code === 'Space') {
        if (self.canAim()) {
          ev.preventDefault();
          self.shoot(self.pull > 12 ? self.pull : 125);
        }
      } else if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') {
        self.rotateAim(-0.06);
      } else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') {
        self.rotateAim(0.06);
      } else if (ev.code === 'ArrowUp' || ev.code === 'KeyW') {
        if (self.canAim()) self.pull = Pool.clamp(self.pull + 8, 8, 180);
      } else if (ev.code === 'ArrowDown' || ev.code === 'KeyS') {
        if (self.canAim()) self.pull = Pool.clamp(self.pull - 8, 8, 180);
      }
    });
  };

  Table.prototype.rotateAim = function (delta) {
    if (!this.canAim()) return;
    var ang = Math.atan2(this.aimY, this.aimX) + delta;
    this.aimX = Math.cos(ang);
    this.aimY = Math.sin(ang);
  };

  Table.prototype.pointer = function (ev) {
    var t = ev.touches && ev.touches[0] || ev.changedTouches && ev.changedTouches[0];
    var x = t ? t.clientX : ev.clientX;
    var y = t ? t.clientY : ev.clientY;
    return this.clientToTable(x, y);
  };

  Table.prototype.canAim = function () {
    return this.phase === 'aim' && this.winner < 0 && !this.isAiTurn();
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
    this.pull = 0;
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
    var cue = this.cue();
    var x = Pool.clamp(p.x, Pool.R + 1, Pool.TW * 0.25);
    var y = Pool.clamp(p.y, Pool.R + 1, Pool.TH - Pool.R - 1);
    if (this.placeAnywhere) {
      x = Pool.clamp(p.x, Pool.R + 1, Pool.TW - Pool.R - 1);
    }
    if (Pool.overlapsAny(this.balls, x, y, Pool.R, cue)) {
      this.msg = '这里没空位，换个位置放下白球';
      this.emit();
      return;
    }
    cue.x = x;
    cue.y = y;
    cue.vx = 0;
    cue.vy = 0;
    cue.pocketed = false;
    this.phase = 'aim';
    this.msg = '自由球已放好，请击打';
    this.emit();
  };

  Table.prototype.shoot = function (pull) {
    var cue = this.cue();
    if (!cue || this.phase !== 'aim') return;
    var power = 80 + pull * 4.2;
    cue.vx = this.aimX * power;
    cue.vy = this.aimY * power;
    this.phase = 'rolling';
    this.firstHit = null;
    this.shotPocketed = [];
    this.cuePocketed = false;
    this.recordedFirst = false;
    Pool.Sfx.cue(pull / 180);
    this.msg = '球在滚动…';
    this.emit();
  };

  Table.prototype.stepPhysics = function (dt) {
    var cue = this.cue();
    var i, b, hit, fallen, maxHit, rel;
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
          break;
        }
      }
    }

    maxHit = 0;
    for (i = 0; i < 8; i++) {
      hit = Pool.collideBalls(this.balls);
      if (hit > maxHit) maxHit = hit;
    }
    if (maxHit > 40) Pool.Sfx.collide(maxHit);

    fallen = Pool.pocketBalls(this.balls);
    if (fallen.length) {
      Pool.Sfx.pocket();
      for (i = 0; i < fallen.length; i++) {
        this.shotPocketed.push(fallen[i]);
        if (fallen[i].group === 'cue') this.cuePocketed = true;
      }
    }
  };

  Table.prototype.finishShot = function () {
    var shot = {
      firstHit: this.firstHit,
      pocketed: this.shotPocketed,
      cuePocketed: this.cuePocketed
    };
    var result = Pool.Rules.summarizeShot(this, shot);
    if (this.mode !== 'practice') {
      Pool.Rules.applyGroups(this, this.shotPocketed, this.turn);
    }

    if (result.win) {
      this.winner = this.turn;
      this.phase = 'over';
      this.msg = this.names[this.turn] + ' 打进 8 号，获胜！';
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
      this.msg = this.cuePocketed ? '白球入袋，点击开球区放置' : (result.ownIn ? '打进了！继续' : '继续练习');
      this.emit();
      return;
    }

    if (result.foul) {
      this.turn = 1 - this.turn;
      this.phase = 'place';
      this.placeAnywhere = true;
      this.msg = '犯规：' + result.reason + '。对方自由球';
      Pool.Sfx.foul();
    } else if (result.ownIn) {
      this.phase = 'aim';
      this.msg = '打进了，继续击打';
    } else {
      this.turn = 1 - this.turn;
      this.phase = 'aim';
      this.msg = '交换击打';
    }
    this.emit();
  };

  Table.prototype.update = function (dt) {
    if (this.phase === 'rolling') {
      this.stepPhysics(dt);
      if (!Pool.anyMoving(this.balls)) this.finishShot();
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
      this.shoot(40);
      return;
    }
    this.aimX = shot.ax;
    this.aimY = shot.ay;
    this.shoot((shot.power - 80) / 4.2);
  };

  Table.prototype.draw = function () {
    var ctx = this.ctx;
    var C = this.C;
    var w = Pool.TW + C * 2;
    var h = Pool.TH + C * 2;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    Pool.Render.drawTable(ctx, C);
    var i, cue = this.cue();
    if (this.phase === 'aim' && cue && !cue.pocketed && this.winner < 0 && !this.isAiTurn()) {
      Pool.Render.drawAim(ctx, cue, this.aimX, this.aimY, this.balls, C);
      Pool.Render.drawCue(ctx, cue, this.aimX, this.aimY, this.pull, C);
      if (this.dragging) Pool.Render.drawPower(ctx, this.pull, C);
    }
    for (i = 0; i < this.balls.length; i++) Pool.Render.drawBall(ctx, this.balls[i], C);
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
