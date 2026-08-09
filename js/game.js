/**
 * 小恐龙快跑 —— 核心逻辑与渲染。
 *
 * 所有坐标都用 600x200 的逻辑单位表示，真实画布按设备像素比缩放，
 * 因此不同屏幕上的手感完全一致。
 */
(function (global) {
  'use strict';

  var S = global.Sprites;
  var Sfx = global.Sfx;

  // ------------------------------------------------------------ 常量

  var GAME_W = 600;
  var GAME_H = 200;
  var PX = 2; // 一个精灵像素 = 2 个逻辑单位
  var GROUND_Y = 168; // 地面基线：角色底部所在的 y
  var HORIZON_Y = 170;

  var GRAVITY = 2600;
  var JUMP_VELOCITY = -740;
  var JUMP_CUT_VELOCITY = -280; // 提前松开跳跃键时保留的上升速度
  var FAST_FALL_GRAVITY = 3400;

  var SPEED_START = 320;
  var SPEED_MAX = 900;
  var SPEED_ACCEL = 7; // 每秒增加的速度
  var SCORE_RATE = 0.03; // 每个逻辑单位的距离换算成多少分

  var LARGE_CACTUS_SCORE = 60;
  var BIRD_SCORE = 250;
  var NIGHT_INTERVAL = 600; // 每隔多少分切换一次昼夜
  var MILESTONE = 100;

  var GROUND_PATTERN_W = 2400;

  var THEME_DAY = { bg: [247, 247, 247], fg: [72, 72, 78], dim: [176, 176, 184] };
  var THEME_NIGHT = { bg: [22, 22, 30], fg: [226, 226, 236], dim: [104, 104, 122] };

  // 角色碰撞盒（相对精灵左上角的逻辑单位），拆成多块让判定更贴合形状
  var BOX_STAND = [
    { x: 22, y: 2, w: 18, h: 18 },
    { x: 6, y: 24, w: 26, h: 18 },
    { x: 12, y: 42, w: 14, h: 6 }
  ];
  var BOX_DUCK = [
    { x: 32, y: 2, w: 18, h: 8 },
    { x: 4, y: 10, w: 36, h: 12 }
  ];

  var BIRD_HEIGHTS = [168, 150, 132]; // 翼龙底边可能出现的高度

  // ------------------------------------------------------------ 工具

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function mixColor(a, b, t) {
    return (
      'rgb(' +
      Math.round(lerp(a[0], b[0], t)) +
      ',' +
      Math.round(lerp(a[1], b[1], t)) +
      ',' +
      Math.round(lerp(a[2], b[2], t)) +
      ')'
    );
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pad(value, size) {
    var s = String(value);
    while (s.length < size) s = '0' + s;
    return s;
  }

  // ------------------------------------------------------------ 游戏

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks || {};

    this.scale = 1;
    this.state = 'ready';
    this.input = { jump: false, duck: false };

    this.highScore = this.loadHighScore();
    this.groundPattern = this.buildGroundPattern();

    this.reset();
    this.resize();

    this.lastTime = 0;
    this.rafId = 0;
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  Game.prototype.loadHighScore = function () {
    try {
      return parseInt(global.localStorage.getItem('dino.highScore'), 10) || 0;
    } catch (err) {
      return 0;
    }
  };

  Game.prototype.saveHighScore = function () {
    try {
      global.localStorage.setItem('dino.highScore', String(this.highScore));
    } catch (err) {
      /* 隐私模式下写入会失败，忽略即可 */
    }
  };

  /** 地面上随机分布的小石子，做成固定长度的图案后循环滚动。 */
  Game.prototype.buildGroundPattern = function () {
    var marks = [];
    for (var x = 0; x < GROUND_PATTERN_W; x += randInt(14, 46)) {
      marks.push({
        x: x,
        w: randInt(2, 9) * PX,
        y: randInt(0, 3) * PX
      });
    }
    return marks;
  };

  Game.prototype.reset = function () {
    this.speed = SPEED_START;
    this.distance = 0;
    this.score = 0;
    this.displayScore = 0;
    this.newRecord = false;

    this.dino = {
      x: 44,
      y: GROUND_Y,
      vy: 0,
      onGround: true,
      ducking: false,
      frameTime: 0,
      frame: 0
    };

    this.obstacles = [];
    this.clouds = [];
    this.stars = [];
    this.groundOffset = 0;
    this.nextObstacleGap = 260;

    this.night = 0;
    this.nightTarget = 0;
    this.moonPhase = 0;
    this.nightsPassed = 0;

    this.flashTimer = 0;
    this.deadTimer = 0;

    for (var i = 0; i < 3; i++) {
      this.clouds.push({
        x: rand(GAME_W * 0.3, GAME_W * 1.6),
        y: rand(20, 78),
        drift: rand(0.28, 0.46)
      });
    }
    for (var j = 0; j < 14; j++) {
      this.stars.push({ x: rand(0, GAME_W), y: rand(12, 96) });
    }
  };

  Game.prototype.setState = function (state) {
    if (this.state === state) return;
    this.state = state;
    if (this.hooks.onState) this.hooks.onState(state, this);
  };

  // ------------------------------------------------------------ 输入

  Game.prototype.press = function (action) {
    if (action === 'jump') {
      this.input.jump = true;
      if (this.state === 'ready') {
        this.setState('playing');
        this.jump();
      } else if (this.state === 'playing') {
        this.jump();
      } else if (this.state === 'over' && this.deadTimer > 0.35) {
        this.restart();
      }
    } else if (action === 'duck') {
      this.input.duck = true;
      if (this.state === 'ready') this.setState('playing');
    }
  };

  Game.prototype.release = function (action) {
    if (action === 'jump') {
      this.input.jump = false;
      // 松手越早跳得越低，给玩家更细腻的控制
      if (this.state === 'playing' && this.dino.vy < JUMP_CUT_VELOCITY) {
        this.dino.vy = JUMP_CUT_VELOCITY;
      }
    } else if (action === 'duck') {
      this.input.duck = false;
    }
  };

  Game.prototype.jump = function () {
    if (!this.dino.onGround) return;
    this.dino.vy = JUMP_VELOCITY;
    this.dino.onGround = false;
    this.dino.ducking = false;
    Sfx.jump();
  };

  Game.prototype.restart = function () {
    this.reset();
    if (this.hooks.onNight) this.hooks.onNight(false);
    this.setState('playing');
  };

  Game.prototype.togglePause = function () {
    if (this.state === 'playing') {
      this.setState('paused');
    } else if (this.state === 'paused') {
      this.setState('playing');
    }
  };

  Game.prototype.pause = function () {
    if (this.state === 'playing') this.setState('paused');
  };

  // ------------------------------------------------------------ 主循环

  Game.prototype.tick = function (now) {
    this.rafId = requestAnimationFrame(this.tick);
    if (!this.lastTime) this.lastTime = now;
    var dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.draw();
  };

  Game.prototype.update = function (dt) {
    if (this.state === 'paused') return;

    if (this.state === 'over') {
      this.deadTimer += dt;
    } else if (this.state === 'playing') {
      this.speed = Math.min(SPEED_MAX, this.speed + SPEED_ACCEL * dt);
      this.distance += this.speed * dt;
      this.updateScore(dt);
      this.updateObstacles(dt);
    }

    if (this.state !== 'over') {
      this.groundOffset = (this.groundOffset + this.speed * dt) % GROUND_PATTERN_W;
      this.updateClouds(dt);
    }

    this.updateDino(dt);
    this.updateNight(dt);

    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
  };

  Game.prototype.updateScore = function (dt) {
    var before = Math.floor(this.score);
    this.score += this.speed * dt * SCORE_RATE;
    var after = Math.floor(this.score);

    if (Math.floor(before / MILESTONE) !== Math.floor(after / MILESTONE) && after > 0) {
      this.flashTimer = 0.7;
      Sfx.point();
    }
    if (after !== before && this.hooks.onScore) this.hooks.onScore(after, this);

    if (after > this.highScore) {
      this.highScore = after;
      this.newRecord = true;
    }
  };

  Game.prototype.updateDino = function (dt) {
    var dino = this.dino;

    if (this.state === 'playing') {
      if (!dino.onGround) {
        var g = this.input.duck ? FAST_FALL_GRAVITY : GRAVITY;
        dino.vy += g * dt;
        dino.y += dino.vy * dt;
        if (dino.y >= GROUND_Y) {
          dino.y = GROUND_Y;
          dino.vy = 0;
          dino.onGround = true;
        }
      }
      dino.ducking = dino.onGround && this.input.duck;
    }

    // 跑步 / 低头的两帧循环
    if (this.state === 'playing' || this.state === 'ready') {
      var rate = this.state === 'ready' ? 0.18 : Math.max(0.055, 0.16 - this.speed / 9000);
      dino.frameTime += dt;
      while (dino.frameTime >= rate) {
        dino.frameTime -= rate;
        dino.frame = (dino.frame + 1) % 2;
      }
    }
  };

  Game.prototype.updateClouds = function (dt) {
    for (var i = this.clouds.length - 1; i >= 0; i--) {
      var cloud = this.clouds[i];
      cloud.x -= this.speed * cloud.drift * dt;
      if (cloud.x + S.cloud.w * PX < 0) this.clouds.splice(i, 1);
    }
    var rightMost = 0;
    for (var j = 0; j < this.clouds.length; j++) {
      rightMost = Math.max(rightMost, this.clouds[j].x);
    }
    if (this.clouds.length < 4 && rightMost < GAME_W - rand(90, 260)) {
      this.clouds.push({
        x: GAME_W + rand(0, 120),
        y: rand(16, 80),
        drift: rand(0.28, 0.46)
      });
    }

    for (var k = 0; k < this.stars.length; k++) {
      var star = this.stars[k];
      star.x -= this.speed * 0.1 * dt;
      if (star.x < -6) {
        star.x = GAME_W + rand(0, 40);
        star.y = rand(12, 96);
      }
    }
  };

  Game.prototype.updateNight = function (dt) {
    var phase = Math.floor(this.score / NIGHT_INTERVAL);
    var wantNight = phase % 2 === 1 ? 1 : 0;
    if (wantNight !== this.nightTarget) {
      this.nightTarget = wantNight;
      if (wantNight === 1) {
        this.moonPhase = this.nightsPassed % 5;
        this.nightsPassed++;
      }
      if (this.hooks.onNight) this.hooks.onNight(wantNight === 1);
    }
    var speedOfChange = dt / 1.6;
    if (this.night < this.nightTarget) {
      this.night = Math.min(this.nightTarget, this.night + speedOfChange);
    } else if (this.night > this.nightTarget) {
      this.night = Math.max(this.nightTarget, this.night - speedOfChange);
    }
  };

  // ------------------------------------------------------------ 障碍物

  Game.prototype.updateObstacles = function (dt) {
    var i;
    for (i = this.obstacles.length - 1; i >= 0; i--) {
      var ob = this.obstacles[i];
      ob.x -= (this.speed + ob.extraSpeed) * dt;
      if (ob.frames.length > 1) {
        ob.frameTime += dt;
        if (ob.frameTime >= ob.frameRate) {
          ob.frameTime -= ob.frameRate;
          ob.frame = (ob.frame + 1) % ob.frames.length;
        }
      }
      if (ob.x + ob.w < -10) this.obstacles.splice(i, 1);
    }

    var right = 0;
    for (i = 0; i < this.obstacles.length; i++) {
      right = Math.max(right, this.obstacles[i].x + this.obstacles[i].w);
    }
    if (this.obstacles.length === 0 || GAME_W - right >= this.nextObstacleGap) {
      this.spawnObstacle();
      var base = this.speed * rand(0.66, 1.15);
      this.nextObstacleGap = Math.max(120, base);
    }

    if (this.checkCollision()) this.die();
  };

  Game.prototype.spawnObstacle = function () {
    var birdChance = this.score >= BIRD_SCORE ? Math.min(0.3, 0.12 + this.score / 6000) : 0;

    if (Math.random() < birdChance) {
      var bird = S.bird[0];
      this.obstacles.push({
        x: GAME_W + 20,
        y: pick(BIRD_HEIGHTS) - bird.h * PX,
        w: bird.w * PX,
        h: bird.h * PX,
        frames: S.bird,
        frame: 0,
        frameTime: 0,
        frameRate: 0.2,
        repeat: 1,
        extraSpeed: pick([0, 0, this.speed * 0.18]),
        boxes: [{ x: 6, y: 12, w: 34, h: 12 }]
      });
      return;
    }

    var useLarge = this.score >= LARGE_CACTUS_SCORE && Math.random() < 0.45;
    var sprite = useLarge ? S.cactusLarge : S.cactusSmall;
    var maxRepeat = useLarge ? 2 : 3;
    var repeat = randInt(1, this.speed > 420 ? maxRepeat : Math.min(2, maxRepeat));
    var w = sprite.w * PX * repeat;
    var h = sprite.h * PX;

    this.obstacles.push({
      x: GAME_W + 10,
      y: GROUND_Y - h,
      w: w,
      h: h,
      frames: [sprite],
      frame: 0,
      frameTime: 0,
      frameRate: 1,
      repeat: repeat,
      extraSpeed: 0,
      boxes: [{ x: 4, y: 4, w: w - 8, h: h - 4 }]
    });
  };

  Game.prototype.dinoBoxes = function () {
    var dino = this.dino;
    var sprite = dino.ducking ? S.dinoDuck[0] : S.dinoIdle;
    var top = dino.y - sprite.h * PX;
    var source = dino.ducking ? BOX_DUCK : BOX_STAND;
    var out = [];
    for (var i = 0; i < source.length; i++) {
      out.push({
        x: dino.x + source[i].x,
        y: top + source[i].y,
        w: source[i].w,
        h: source[i].h
      });
    }
    return out;
  };

  Game.prototype.checkCollision = function () {
    var boxes = this.dinoBoxes();
    for (var i = 0; i < this.obstacles.length; i++) {
      var ob = this.obstacles[i];
      if (ob.x > this.dino.x + 60 || ob.x + ob.w < this.dino.x - 10) continue;
      for (var j = 0; j < ob.boxes.length; j++) {
        var box = {
          x: ob.x + ob.boxes[j].x,
          y: ob.y + ob.boxes[j].y,
          w: ob.boxes[j].w,
          h: ob.boxes[j].h
        };
        for (var k = 0; k < boxes.length; k++) {
          if (overlaps(boxes[k], box)) return true;
        }
      }
    }
    return false;
  };

  Game.prototype.die = function () {
    this.deadTimer = 0;
    this.dino.ducking = false;
    this.saveHighScore();
    Sfx.die();
    this.setState('over');
  };

  // ------------------------------------------------------------ 渲染

  Game.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = global.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(rect.width * dpr));
    var height = Math.round((width * GAME_H) / GAME_W);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.scale = width / GAME_W;
  };

  Game.prototype.colors = function () {
    return {
      bg: mixColor(THEME_DAY.bg, THEME_NIGHT.bg, this.night),
      fg: mixColor(THEME_DAY.fg, THEME_NIGHT.fg, this.night),
      dim: mixColor(THEME_DAY.dim, THEME_NIGHT.dim, this.night)
    };
  };

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    var c = this.colors();

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    if (this.night > 0.05) this.drawSky(ctx, c);
    this.drawClouds(ctx, c);
    this.drawGround(ctx, c);
    this.drawObstacles(ctx, c);
    this.drawDino(ctx, c);
    this.drawScore(ctx, c);
  };

  Game.prototype.drawSky = function (ctx, c) {
    ctx.globalAlpha = Math.min(1, (this.night - 0.05) / 0.55);
    ctx.fillStyle = c.dim;
    for (var i = 0; i < this.stars.length; i++) {
      S.draw(ctx, S.star, Math.round(this.stars[i].x), Math.round(this.stars[i].y), PX);
    }

    // 月亮，每个夜晚换一个月相
    var cx = GAME_W - 90;
    var cy = 46;
    var r = 15;
    ctx.fillStyle = c.fg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    var carve = [r * 0.85, r * 1.35, null, -r * 1.35, -r * 0.85][this.moonPhase];
    if (carve !== null) {
      ctx.fillStyle = c.bg;
      ctx.beginPath();
      ctx.arc(cx + carve, cy, r * 0.98, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Game.prototype.drawClouds = function (ctx, c) {
    ctx.fillStyle = c.dim;
    for (var i = 0; i < this.clouds.length; i++) {
      S.draw(ctx, S.cloud, Math.round(this.clouds[i].x), Math.round(this.clouds[i].y), PX);
    }
  };

  Game.prototype.drawGround = function (ctx, c) {
    ctx.fillStyle = c.fg;
    ctx.fillRect(0, HORIZON_Y, GAME_W, PX);

    ctx.fillStyle = c.dim;
    var offset = this.groundOffset;
    for (var pass = 0; pass < 2; pass++) {
      var base = -offset + pass * GROUND_PATTERN_W;
      if (base > GAME_W) continue;
      for (var i = 0; i < this.groundPattern.length; i++) {
        var mark = this.groundPattern[i];
        var x = base + mark.x;
        if (x < -mark.w || x > GAME_W) continue;
        ctx.fillRect(Math.round(x), HORIZON_Y + PX * 2 + mark.y, mark.w, PX);
      }
    }
  };

  Game.prototype.drawObstacles = function (ctx, c) {
    ctx.fillStyle = c.fg;
    for (var i = 0; i < this.obstacles.length; i++) {
      var ob = this.obstacles[i];
      var sprite = ob.frames[ob.frame];
      for (var r = 0; r < ob.repeat; r++) {
        S.draw(ctx, sprite, Math.round(ob.x) + r * sprite.w * PX, Math.round(ob.y), PX);
      }
    }
  };

  Game.prototype.drawDino = function (ctx, c) {
    var dino = this.dino;
    var sprite;

    if (this.state === 'over') {
      sprite = S.dinoDead;
    } else if (dino.ducking) {
      sprite = S.dinoDuck[dino.frame];
    } else if (this.state === 'ready') {
      sprite = S.dinoIdle;
    } else if (!dino.onGround) {
      sprite = S.dinoIdle;
    } else {
      sprite = S.dinoRun[dino.frame];
    }

    ctx.fillStyle = c.fg;
    S.draw(ctx, sprite, dino.x, Math.round(dino.y - sprite.h * PX), PX);
  };

  Game.prototype.drawScore = function (ctx, c) {
    var score = Math.floor(this.score);
    // 到达整百分时分数闪烁
    var blink = this.flashTimer > 0 && Math.floor(this.flashTimer * 8) % 2 === 0;

    ctx.font = 'bold 13px "Courier New", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    var x = GAME_W - 14;
    if (!blink) {
      ctx.fillStyle = c.fg;
      ctx.fillText(pad(score, 5), x, 14);
    }

    if (this.highScore > 0) {
      ctx.fillStyle = c.dim;
      ctx.fillText('HI ' + pad(this.highScore, 5), x - 52, 14);
    }
  };

  // ------------------------------------------------------------ 导出

  Game.GAME_W = GAME_W;
  Game.GAME_H = GAME_H;
  global.Game = Game;
})(window);
