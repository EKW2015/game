/**
 * 台球物理：向量、球-球碰撞、库边、袋口。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  var TW = 800;
  var TH = 400;
  var R = 9.2;
  var POCKET_R = 22;
  var CUSHION = 34;
  var FRICTION = 0.78;
  var STOP = 4.5;
  var REST = 0.72;
  var RAIL_REST = 0.78;
  var MAX_SPEED = 980;

  var POCKETS = [
    { x: 2, y: 2, corner: true },
    { x: TW / 2, y: -4, corner: false },
    { x: TW - 2, y: 2, corner: true },
    { x: 2, y: TH - 2, corner: true },
    { x: TW / 2, y: TH + 4, corner: false },
    { x: TW - 2, y: TH - 2, corner: true }
  ];

  function vec(x, y) {
    return { x: x, y: y };
  }

  function add(a, b) {
    return vec(a.x + b.x, a.y + b.y);
  }

  function sub(a, b) {
    return vec(a.x - b.x, a.y - b.y);
  }

  function scale(a, s) {
    return vec(a.x * s, a.y * s);
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function len(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  }

  function dist(a, b) {
    return len(sub(a, b));
  }

  function norm(a) {
    var L = len(a);
    if (L < 1e-8) return vec(0, 0);
    return vec(a.x / L, a.y / L);
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function nearPocket(p, extra) {
    extra = extra || 0;
    var i;
    for (i = 0; i < POCKETS.length; i++) {
      if (dist(p, POCKETS[i]) < POCKET_R + extra) return POCKETS[i];
    }
    return null;
  }

  function makeBall(id, x, y, group, color, label) {
    return {
      id: id,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      r: R,
      group: group,
      color: color,
      label: label,
      pocketed: false
    };
  }

  function moving(ball) {
    return !ball.pocketed && (ball.vx * ball.vx + ball.vy * ball.vy) > STOP * STOP;
  }

  function anyMoving(balls) {
    var i;
    for (i = 0; i < balls.length; i++) {
      if (moving(balls[i])) return true;
    }
    return false;
  }

  function integrate(balls, dt) {
    var i, b, speed, damp;
    damp = Math.exp(-FRICTION * dt);
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= damp;
      b.vy *= damp;
      speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed > MAX_SPEED) {
        b.vx *= MAX_SPEED / speed;
        b.vy *= MAX_SPEED / speed;
      } else if (speed < STOP) {
        b.vx = 0;
        b.vy = 0;
      }
    }
  }

  function hitCushions(balls) {
    var i, b, pk;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed) continue;
      pk = nearPocket(b, 6);
      if (pk) continue;
      if (b.x < R) {
        b.x = R;
        if (b.vx < 0) b.vx = -b.vx * RAIL_REST;
      } else if (b.x > TW - R) {
        b.x = TW - R;
        if (b.vx > 0) b.vx = -b.vx * RAIL_REST;
      }
      if (b.y < R) {
        b.y = R;
        if (b.vy < 0) b.vy = -b.vy * RAIL_REST;
      } else if (b.y > TH - R) {
        b.y = TH - R;
        if (b.vy > 0) b.vy = -b.vy * RAIL_REST;
      }
    }
  }

  function collidePair(a, b) {
    var nx, ny, d, overlap, inv, dvx, dvy, rel, impulse, j;
    nx = b.x - a.x;
    ny = b.y - a.y;
    d = Math.sqrt(nx * nx + ny * ny);
    if (d < 1e-8 || d >= a.r + b.r) return 0;
    inv = 1 / d;
    nx *= inv;
    ny *= inv;
    overlap = a.r + b.r - d;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    dvx = a.vx - b.vx;
    dvy = a.vy - b.vy;
    rel = dvx * nx + dvy * ny;
    if (rel <= 0) return 0;
    j = rel * (1 + REST);
    impulse = j * 0.5;
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
    return Math.abs(j);
  }

  function collideBalls(balls) {
    var i, j, maxHit = 0, hit;
    for (i = 0; i < balls.length; i++) {
      if (balls[i].pocketed) continue;
      for (j = i + 1; j < balls.length; j++) {
        if (balls[j].pocketed) continue;
        hit = collidePair(balls[i], balls[j]);
        if (hit > maxHit) maxHit = hit;
      }
    }
    return maxHit;
  }

  function pocketBalls(balls) {
    var i, b, pk, fallen = [];
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed) continue;
      pk = nearPocket(b, -4);
      if (!pk) continue;
      b.pocketed = true;
      b.vx = 0;
      b.vy = 0;
      fallen.push(b);
    }
    return fallen;
  }

  function firstHit(cue, others, dtHint) {
    /* 用当前速度方向做短射线，找最先碰到的目标球（开球后由记录覆盖） */
    var i, b, rel, t, closest = null, bestT = 1e9, d, nx, ny;
    if (!cue || cue.pocketed) return null;
    var speed = Math.sqrt(cue.vx * cue.vx + cue.vy * cue.vy);
    if (speed < 1) return null;
    var ux = cue.vx / speed;
    var uy = cue.vy / speed;
    for (i = 0; i < others.length; i++) {
      b = others[i];
      if (b.pocketed || b.id === cue.id) continue;
      nx = b.x - cue.x;
      ny = b.y - cue.y;
      t = nx * ux + ny * uy;
      if (t <= 0) continue;
      d = nx * nx + ny * ny - t * t;
      if (d > (cue.r + b.r) * (cue.r + b.r)) continue;
      if (t < bestT) {
        bestT = t;
        closest = b;
      }
    }
    return closest;
  }

  function pathClear(balls, from, to, ignoreA, ignoreB, radius) {
    var i, b, ab, ac, t, L, closest, d;
    ab = sub(to, from);
    L = len(ab);
    if (L < 1e-6) return true;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed || b === ignoreA || b === ignoreB) continue;
      ac = sub(b, from);
      t = clamp(dot(ac, ab) / (L * L), 0, 1);
      closest = add(from, scale(ab, t));
      d = dist(closest, b);
      if (d < b.r + radius - 0.4) return false;
    }
    return true;
  }

  function overlapsAny(balls, x, y, r, ignore) {
    var i, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed || b === ignore) continue;
      if (dist(b, { x: x, y: y }) < b.r + r + 0.2) return true;
    }
    return false;
  }

  Pool.TW = TW;
  Pool.TH = TH;
  Pool.R = R;
  Pool.POCKET_R = POCKET_R;
  Pool.CUSHION = CUSHION;
  Pool.POCKETS = POCKETS;
  Pool.vec = vec;
  Pool.add = add;
  Pool.sub = sub;
  Pool.scale = scale;
  Pool.dot = dot;
  Pool.len = len;
  Pool.dist = dist;
  Pool.norm = norm;
  Pool.clamp = clamp;
  Pool.nearPocket = nearPocket;
  Pool.makeBall = makeBall;
  Pool.moving = moving;
  Pool.anyMoving = anyMoving;
  Pool.integrate = integrate;
  Pool.hitCushions = hitCushions;
  Pool.collidePair = collidePair;
  Pool.collideBalls = collideBalls;
  Pool.pocketBalls = pocketBalls;
  Pool.firstHit = firstHit;
  Pool.pathClear = pathClear;
  Pool.overlapsAny = overlapsAny;
})(typeof window !== 'undefined' ? window : global);
