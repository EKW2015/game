/**
 * 球桌与球体绘制。
 */
(function (global) {
  'use strict';

  var Pool = global.Pool || (global.Pool = {});

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTable(ctx, C) {
    var TW = Pool.TW;
    var TH = Pool.TH;
    var W = TW + C * 2;
    var H = TH + C * 2;
    var wood = ctx.createLinearGradient(0, 0, W, H);
    wood.addColorStop(0, '#6a3a16');
    wood.addColorStop(0.5, '#4a2610');
    wood.addColorStop(1, '#3a1c0c');
    ctx.fillStyle = wood;
    roundRect(ctx, 0, 0, W, H, 18);
    ctx.fill();

    var felt = ctx.createRadialGradient(W * 0.45, H * 0.4, 40, W * 0.5, H * 0.5, W * 0.7);
    felt.addColorStop(0, '#14945c');
    felt.addColorStop(1, '#0a5a38');
    ctx.fillStyle = felt;
    ctx.fillRect(C, C, TW, TH);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C + TW * 0.25, C + 8);
    ctx.lineTo(C + TW * 0.25, C + TH - 8);
    ctx.stroke();

    var diamonds = [0.25, 0.5, 0.75];
    var i, d;
    ctx.fillStyle = '#e8d19a';
    for (i = 0; i < diamonds.length; i++) {
      d = diamonds[i];
      diamond(ctx, C + TW * d, C * 0.45, 5);
      diamond(ctx, C + TW * d, H - C * 0.45, 5);
    }
    diamond(ctx, C * 0.45, C + TH * 0.5, 5);
    diamond(ctx, W - C * 0.45, C + TH * 0.5, 5);

    for (i = 0; i < Pool.POCKETS.length; i++) drawPocket(ctx, Pool.POCKETS[i], C);
  }

  function diamond(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.fill();
  }

  function drawPocket(ctx, p, C) {
    var x = C + p.x;
    var y = C + p.y;
    ctx.beginPath();
    ctx.arc(x, y, Pool.POCKET_R + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1408';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, Pool.POCKET_R - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#050503';
    ctx.fill();
  }

  function drawBall(ctx, b, C) {
    if (b.pocketed) return;
    var x = C + b.x;
    var y = C + b.y;
    var r = b.r;
    ctx.beginPath();
    ctx.arc(x + 1.4, y + 2.2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (b.group === 'cue') {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#d7d7d0');
    } else if (b.group === 'stripe') {
      g.addColorStop(0, '#fff');
      g.addColorStop(0.45, '#f4f4f4');
      g.addColorStop(0.45, b.color);
      g.addColorStop(1, shade(b.color, -40));
    } else {
      g.addColorStop(0, shade(b.color, 50));
      g.addColorStop(1, shade(b.color, -35));
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    if (b.group === 'stripe') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = b.color;
      ctx.fillRect(x - r, y - r * 0.38, r * 2, r * 0.76);
      ctx.restore();
    }

    if (b.label) {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = '#f6f6f2';
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold ' + Math.max(7, r * 0.72) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(b.label), x, y + 0.4);
    }

    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }

  function shade(hex, amt) {
    var n = hex.replace('#', '');
    if (n.length === 3) n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2];
    var num = parseInt(n, 16);
    var r = Math.max(0, Math.min(255, (num >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (num & 255) + amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function drawCue(ctx, cue, aimX, aimY, pull, C) {
    if (!cue || cue.pocketed) return;
    var n = Pool.norm({ x: aimX, y: aimY });
    if (!n.x && !n.y) return;
    var back = Pool.scale(n, -1);
    var start = 16 + pull * 0.12;
    var x0 = C + cue.x + back.x * start;
    var y0 = C + cue.y + back.y * start;
    var x1 = x0 + back.x * 210;
    var y1 = y0 + back.y * 210;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a210e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x0 + back.x * 18, y0 + back.y * 18);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#c9a24a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + back.x * 22, y0 + back.y * 22);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x0, y0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAim(ctx, cue, aimX, aimY, balls, C) {
    var n = Pool.norm({ x: aimX, y: aimY });
    if (!n.x && !n.y) return;
    var i, t, x, y, hit = null, minT = 1e9, b, ox, oy, A, B, Cc, disc, t1;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.pocketed || b.id === 0) continue;
      ox = cue.x - b.x;
      oy = cue.y - b.y;
      A = 1;
      B = 2 * (n.x * ox + n.y * oy);
      Cc = ox * ox + oy * oy - (cue.r + b.r) * (cue.r + b.r);
      disc = B * B - 4 * A * Cc;
      if (disc < 0) continue;
      t1 = (-B - Math.sqrt(disc)) / 2;
      if (t1 > 1 && t1 < minT) {
        minT = t1;
        hit = b;
      }
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,220,0.55)';
    ctx.setLineDash([6, 7]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(C + cue.x, C + cue.y);
    t = Math.min(minT, 520);
    ctx.lineTo(C + cue.x + n.x * t, C + cue.y + n.y * t);
    ctx.stroke();
    ctx.restore();
    x = cue.x + n.x * Math.min(minT, 520);
    y = cue.y + n.y * Math.min(minT, 520);
    ctx.beginPath();
    ctx.arc(C + x, C + y, cue.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (hit) {
      var gn = Pool.norm(Pool.sub(hit, { x: x, y: y }));
      ctx.strokeStyle = 'rgba(255, 210, 90, 0.7)';
      ctx.beginPath();
      ctx.moveTo(C + hit.x, C + hit.y);
      ctx.lineTo(C + hit.x + gn.x * 48, C + hit.y + gn.y * 48);
      ctx.stroke();
    }
  }

  function drawPower(ctx, pull, C) {
    var x = C + 16;
    var y = C + Pool.TH - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y, 140, 10, 5);
    ctx.fill();
    ctx.fillStyle = pull > 70 ? '#ff8a7a' : '#e4c27a';
    roundRect(ctx, x, y, 140 * Pool.clamp(pull / 180, 0, 1), 10, 5);
    ctx.fill();
  }

  Pool.Render = {
    drawTable: drawTable,
    drawBall: drawBall,
    drawCue: drawCue,
    drawAim: drawAim,
    drawPower: drawPower
  };
})(typeof window !== 'undefined' ? window : global);
