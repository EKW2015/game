/**
 * 夜城飙车 - 霓虹夜城场景（THREE）
 *
 * 城市是规则网格，所以路面、人行道、车道线、路灯光斑全部烘到一张
 * 可平铺的贴图里，用一块大地面搞定；建筑按街区流式生成并缓存复用。
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var CityMap = global.CityMap;

  var B = CityMap.BLOCK;
  var VIEW_BLOCKS = 4;            // 建筑可见半径（街区数）
  var CACHE_LIMIT = 420;
  var LAMP_OFFSET = B * 0.3;
  var TILE_W = 22;                // 建筑外墙贴图对应的实际宽度（米）
  var TILE_H = 22;

  var NEON_WORDS = ['夜城', '霓虹', '拉面', '酒吧', '东区', '飙速', '不夜', '电玩', '寿司', '赛博'];
  var NEON_COLORS = ['#ff2e78', '#22e6ff', '#ffe14d', '#8a5cff', '#39ff88', '#ff7a1a', '#ff4de0', '#4dd2ff'];

  function quantize(v, step) {
    return Math.max(step, Math.round(v / step) * step);
  }

  function canvasTexture(w, h, draw, repeat) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    var tex = new THREE.CanvasTexture(canvas);
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    if ('colorSpace' in tex && global.THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 一个街区单元的路面贴图（中心是十字路口） */
  function roadTexture() {
    var SIZE = 512;
    var ppm = SIZE / B;
    return canvasTexture(SIZE, SIZE, function (ctx) {
      var c = SIZE / 2;
      var halfRoad = CityMap.HALF_ROAD * ppm;
      var solid = CityMap.SOLID * ppm;

      ctx.fillStyle = '#101018';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // 街区地面（建筑基座）稍微亮一点，有点湿地反光的感觉
      ctx.fillStyle = '#16161f';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // 人行道
      ctx.fillStyle = '#2b2d38';
      ctx.fillRect(0, c - solid, SIZE, solid * 2);
      ctx.fillRect(c - solid, 0, solid * 2, SIZE);

      // 沥青
      ctx.fillStyle = '#22232b';
      ctx.fillRect(0, c - halfRoad, SIZE, halfRoad * 2);
      ctx.fillRect(c - halfRoad, 0, halfRoad * 2, SIZE);

      // 沥青噪点
      var i;
      for (i = 0; i < 2600; i++) {
        var nx = Math.random() * SIZE;
        var ny = Math.random() * SIZE;
        var onRoad = Math.abs(ny - c) < halfRoad || Math.abs(nx - c) < halfRoad;
        if (!onRoad) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.03) + ')';
        ctx.fillRect(nx, ny, 2, 2);
      }

      // 路缘石
      ctx.strokeStyle = '#454a5a';
      ctx.lineWidth = Math.max(1, 0.35 * ppm);
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(0, c + s * halfRoad);
        ctx.lineTo(SIZE, c + s * halfRoad);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c + s * halfRoad, 0);
        ctx.lineTo(c + s * halfRoad, SIZE);
        ctx.stroke();
      });

      // 车道虚线（双黄线中间断开留出路口）
      ctx.strokeStyle = '#d9c96a';
      ctx.lineWidth = Math.max(1, 0.32 * ppm);
      ctx.setLineDash([4 * ppm, 4 * ppm]);
      [-1, 1].forEach(function (s) {
        var off = s * 0.55 * ppm;
        ctx.beginPath();
        ctx.moveTo(0, c + off);
        ctx.lineTo(c - halfRoad, c + off);
        ctx.moveTo(c + halfRoad, c + off);
        ctx.lineTo(SIZE, c + off);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c + off, 0);
        ctx.lineTo(c + off, c - halfRoad);
        ctx.moveTo(c + off, c + halfRoad);
        ctx.lineTo(c + off, SIZE);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 人行横道
      ctx.fillStyle = 'rgba(226,232,240,0.55)';
      var stripeW = 0.7 * ppm;
      var gap = 1.5 * ppm;
      var zebraLen = 3.4 * ppm;
      for (i = -halfRoad + gap; i < halfRoad - gap; i += gap) {
        ctx.fillRect(c + i, c - halfRoad - zebraLen, stripeW, zebraLen);
        ctx.fillRect(c + i, c + halfRoad, stripeW, zebraLen);
        ctx.fillRect(c - halfRoad - zebraLen, c + i, zebraLen, stripeW);
        ctx.fillRect(c + halfRoad, c + i, zebraLen, stripeW);
      }

      // 路灯洒下的光斑 + 霓虹在湿路面的反光
      ctx.globalCompositeOperation = 'lighter';
      var pools = [
        { x: c + LAMP_OFFSET * ppm, y: c, color: '255,214,150' },
        { x: c - LAMP_OFFSET * ppm, y: c, color: '255,214,150' },
        { x: c, y: c + LAMP_OFFSET * ppm, color: '255,214,150' },
        { x: c, y: c - LAMP_OFFSET * ppm, color: '255,214,150' }
      ];
      pools.forEach(function (p) {
        var r = 13 * ppm;
        var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grd.addColorStop(0, 'rgba(' + p.color + ',0.4)');
        grd.addColorStop(0.45, 'rgba(' + p.color + ',0.13)');
        grd.addColorStop(1, 'rgba(' + p.color + ',0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      // 路口中心一圈青色反光
      var neon = ctx.createRadialGradient(c, c, 0, c, c, halfRoad * 1.6);
      neon.addColorStop(0, 'rgba(90,200,255,0.16)');
      neon.addColorStop(1, 'rgba(90,200,255,0)');
      ctx.fillStyle = neon;
      ctx.fillRect(c - halfRoad * 1.6, c - halfRoad * 1.6, halfRoad * 3.2, halfRoad * 3.2);
      ctx.globalCompositeOperation = 'source-over';
    }, true);
  }

  /** 建筑外墙：map = 熄灯的楼体，emissiveMap = 亮着的窗户 */
  function facadeTextures(variant) {
    var W = 256;
    var H = 256;
    var cols = 8;
    var rows = 12;
    var rnd = RU.seeded(1000 + variant * 977);
    var baseColors = ['#20212b', '#1b2028', '#24202c', '#191d24', '#221d28', '#1e2230'];
    var litColors = ['255,214,152', '176,222,255', '255,238,190', '160,196,255', '255,196,224', '196,255,222'];
    var cells = [];

    var cw = W / cols;
    var ch = H / rows;

    var map = canvasTexture(W, H, function (ctx) {
      ctx.fillStyle = baseColors[variant % baseColors.length];
      ctx.fillRect(0, 0, W, H);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var on = rnd() < 0.42;
          cells.push(on ? {
            color: litColors[Math.floor(rnd() * litColors.length)],
            alpha: 0.35 + rnd() * 0.55
          } : null);
          ctx.fillStyle = on ? 'rgba(70,76,92,1)' : 'rgba(16,18,24,1)';
          ctx.fillRect(c * cw + cw * 0.2, r * ch + ch * 0.22, cw * 0.6, ch * 0.46);
        }
      }
      // 楼层分隔线，让高楼有层次
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (var y = 0; y < rows; y++) ctx.fillRect(0, y * ch + ch * 0.8, W, Math.max(1, ch * 0.1));
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (var x = 0; x < cols; x++) ctx.fillRect(x * cw, 0, Math.max(1, cw * 0.08), H);
    }, true);

    var idx = 0;
    var emissive = canvasTexture(W, H, function (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var cell = cells[idx++];
          if (!cell) continue;
          ctx.fillStyle = 'rgba(' + cell.color + ',' + cell.alpha.toFixed(2) + ')';
          ctx.fillRect(c * cw + cw * 0.2, r * ch + ch * 0.22, cw * 0.6, ch * 0.46);
        }
      }
    }, true);

    return { map: map, emissive: emissive };
  }

  function neonTexture(variant) {
    return canvasTexture(256, 128, function (ctx, w, h) {
      var color = NEON_COLORS[variant % NEON_COLORS.length];
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(6,6,10,0.72)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.strokeRect(9, 9, w - 18, h - 18);
      ctx.fillStyle = color;
      ctx.font = 'bold 58px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(NEON_WORDS[variant % NEON_WORDS.length], w / 2, h / 2 + 3);
    });
  }

  function skylineTexture() {
    return canvasTexture(2048, 320, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      var x = 0;
      while (x < w) {
        var bw = 26 + Math.random() * 90;
        var bh = 60 + Math.pow(Math.random(), 1.7) * 230;
        ctx.fillStyle = 'rgba(11,12,22,0.96)';
        ctx.fillRect(x, h - bh, bw, bh);
        for (var wy = h - bh + 8; wy < h - 6; wy += 11) {
          for (var wx = x + 5; wx < x + bw - 6; wx += 9) {
            if (Math.random() < 0.38) {
              ctx.fillStyle = Math.random() < 0.25 ? 'rgba(120,220,255,0.75)' : 'rgba(255,206,140,0.6)';
              ctx.fillRect(wx, wy, 4, 5);
            }
          }
        }
        // 楼顶红色航空灯
        if (bh > 210 && Math.random() < 0.5) {
          ctx.fillStyle = 'rgba(255,70,70,0.9)';
          ctx.fillRect(x + bw / 2 - 2, h - bh - 4, 4, 4);
        }
        x += bw + 3 + Math.random() * 16;
      }
    }, true);
  }

  /** 等距柱状投影：贴图上半部分是天顶，正中间(0.5)才是地平线 */
  function skyTexture() {
    return canvasTexture(64, 512, function (ctx, w, h) {
      var grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#03030a');
      grd.addColorStop(0.3, '#070714');
      grd.addColorStop(0.42, '#1a1030');
      grd.addColorStop(0.48, '#3d1740');
      grd.addColorStop(0.5, '#6b2450');
      grd.addColorStop(0.54, '#2a1030');
      grd.addColorStop(1, '#08060f');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function City3D(scene, renderer) {
    this.scene = scene;
    this.blocks = new Map();
    this.order = [];
    this.cell = { i: 9999, j: 9999 };
    this.maxAniso = renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;

    this.buildSky();
    this.buildGround();
    this.buildMaterials();
    this.buildLamps();
  }

  City3D.prototype.buildSky = function () {
    var sky = skyTexture();
    sky.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = sky;

    // 星星
    var count = 420;
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var y = 0.25 + Math.random() * 0.75;
      var r = Math.sqrt(1 - y * y * 0.6) * 1800;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 300 + y * 900;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xbfd4ff, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.7, fog: false
    }));
    this.scene.add(this.stars);

    // 远处天际线，避免地平线空荡荡
    var tex = skylineTexture();
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    this.skyline = new THREE.Mesh(
      new THREE.CylinderGeometry(1500, 1500, 400, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false
      })
    );
    this.skyline.position.y = 170;
    this.scene.add(this.skyline);
  };

  City3D.prototype.buildGround = function () {
    var span = 30 * B;
    var tex = roadTexture();
    tex.repeat.set(30, -30);
    tex.offset.set(0.5, 0.5);
    tex.anisotropy = this.maxAniso;
    this.groundMat = new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
  };

  City3D.prototype.buildMaterials = function () {
    this.facades = [];
    var roofMat = new THREE.MeshLambertMaterial({ color: 0x0d0e14 });
    for (var v = 0; v < 6; v++) {
      var t = facadeTextures(v);
      t.map.anisotropy = this.maxAniso;
      var side = new THREE.MeshLambertMaterial({
        map: t.map,
        emissive: 0xffffff,
        emissiveMap: t.emissive
      });
      this.facades.push([side, side, roofMat, roofMat, side, side]);
    }

    this.neonMats = [];
    for (var n = 0; n < 8; n++) {
      this.neonMats.push(new THREE.MeshBasicMaterial({
        map: neonTexture(n), transparent: true, side: THREE.DoubleSide, depthWrite: false
      }));
    }

    this.geoCache = new Map();
  };

  /** 建筑几何体按尺寸分档缓存，并按面缩放 UV，让窗户密度保持一致 */
  City3D.prototype.buildingGeometry = function (w, h, d) {
    var qw = quantize(w, 6);
    var qh = quantize(h, 12);
    var qd = quantize(d, 6);
    var key = qw + '_' + qh + '_' + qd;
    var cached = this.geoCache.get(key);
    if (cached) return cached;

    var geo = new THREE.BoxGeometry(qw, qh, qd);
    var uv = geo.attributes.uv;
    var scales = [
      [qd / TILE_W, qh / TILE_H],
      [qd / TILE_W, qh / TILE_H],
      [qw / TILE_W, qd / TILE_W],
      [qw / TILE_W, qd / TILE_W],
      [qw / TILE_W, qh / TILE_H],
      [qw / TILE_W, qh / TILE_H]
    ];
    for (var f = 0; f < 6; f++) {
      for (var k = 0; k < 4; k++) {
        var i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * scales[f][0], uv.getY(i) * scales[f][1]);
      }
    }
    uv.needsUpdate = true;
    this.geoCache.set(key, geo);
    return geo;
  };

  City3D.prototype.buildLamps = function () {
    var max = Math.pow(VIEW_BLOCKS * 2 + 2, 2) * 4;
    var poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 8, 6);
    poleGeo.translate(0, 4, 0);
    var armGeo = new THREE.BoxGeometry(0.16, 0.16, 2.2);
    armGeo.translate(0, 7.9, 0.9);
    var headGeo = new THREE.SphereGeometry(0.45, 8, 6);
    headGeo.translate(0, 7.75, 1.9);

    this.lampPoles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x23252e }), max);
    this.lampArms = new THREE.InstancedMesh(armGeo, new THREE.MeshLambertMaterial({ color: 0x23252e }), max);
    this.lampHeads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), max);
    this.lampPoles.frustumCulled = false;
    this.lampArms.frustumCulled = false;
    this.lampHeads.frustumCulled = false;
    this.scene.add(this.lampPoles);
    this.scene.add(this.lampArms);
    this.scene.add(this.lampHeads);
    this.lampMatrix = new THREE.Matrix4();
    this.lampEuler = new THREE.Euler();
    this.lampQuat = new THREE.Quaternion();
    this.lampScale = new THREE.Vector3(1, 1, 1);
    this.lampPos = new THREE.Vector3();
  };

  City3D.prototype.refreshLamps = function (ci, cj) {
    var n = 0;
    var R = VIEW_BLOCKS;
    var side = CityMap.HALF_ROAD + 1.4;
    for (var i = ci - R; i <= ci + R; i++) {
      for (var j = cj - R; j <= cj + R; j++) {
        var ox = i * B;
        var oz = j * B;
        // 每个路口 4 根灯柱，灯头朝向马路中心
        var spots = [
          { x: ox + LAMP_OFFSET, z: oz + side, ry: Math.PI },
          { x: ox - LAMP_OFFSET, z: oz - side, ry: 0 },
          { x: ox + side, z: oz - LAMP_OFFSET, ry: -Math.PI / 2 },
          { x: ox - side, z: oz + LAMP_OFFSET, ry: Math.PI / 2 }
        ];
        for (var s = 0; s < spots.length; s++) {
          if (n >= this.lampPoles.count) break;
          this.lampPos.set(spots[s].x, 0, spots[s].z);
          this.lampEuler.set(0, spots[s].ry, 0);
          this.lampQuat.setFromEuler(this.lampEuler);
          this.lampMatrix.compose(this.lampPos, this.lampQuat, this.lampScale);
          this.lampPoles.setMatrixAt(n, this.lampMatrix);
          this.lampArms.setMatrixAt(n, this.lampMatrix);
          this.lampHeads.setMatrixAt(n, this.lampMatrix);
          n++;
        }
      }
    }
    this.lampPoles.count = n;
    this.lampArms.count = n;
    this.lampHeads.count = n;
    this.lampPoles.instanceMatrix.needsUpdate = true;
    this.lampArms.instanceMatrix.needsUpdate = true;
    this.lampHeads.instanceMatrix.needsUpdate = true;
  };

  City3D.prototype.blockGroup = function (i, j) {
    var key = i + ',' + j;
    var group = this.blocks.get(key);
    if (group) return group;

    group = new THREE.Group();
    var list = CityMap.buildingsIn(i, j);
    for (var b = 0; b < list.length; b++) {
      var info = list[b];
      var geo = this.buildingGeometry(info.w, info.h, info.d);
      var mesh = new THREE.Mesh(geo, this.facades[info.style % this.facades.length]);
      var qh = quantize(info.h, 12);
      mesh.position.set(info.x, qh / 2, info.z);
      group.add(mesh);

      if (info.neon >= 0) {
        var qw = quantize(info.w, 6);
        var qd = quantize(info.d, 6);
        var sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(qw, qd) * 0.62, Math.min(qw, qd) * 0.31),
          this.neonMats[info.neon % this.neonMats.length]);
        var faceZ = RU.hash2(i, j, 91) < 0.5;
        var h = 8 + RU.hash2(i, j, 55) * Math.max(6, qh - 16);
        if (faceZ) {
          sign.position.set(info.x, h, info.z + qd / 2 + 0.4);
        } else {
          sign.position.set(info.x + qw / 2 + 0.4, h, info.z);
          sign.rotation.y = Math.PI / 2;
        }
        group.add(sign);
      }
    }

    this.scene.add(group);
    this.blocks.set(key, group);
    this.order.push(key);
    if (this.order.length > CACHE_LIMIT) {
      var oldKey = this.order.shift();
      var old = this.blocks.get(oldKey);
      if (old) {
        this.scene.remove(old);
        this.blocks.delete(oldKey);
      }
    }
    return group;
  };

  City3D.prototype.update = function (px, pz) {
    var snapX = Math.round(px / B) * B;
    var snapZ = Math.round(pz / B) * B;
    this.ground.position.set(snapX, 0, snapZ);
    this.skyline.position.set(px, 170, pz);
    if (this.stars) this.stars.position.set(px, 0, pz);

    var ci = Math.round(px / B);
    var cj = Math.round(pz / B);
    if (ci === this.cell.i && cj === this.cell.j) return;
    this.cell.i = ci;
    this.cell.j = cj;

    this.refreshLamps(ci, cj);

    var R = VIEW_BLOCKS;
    var wanted = new Set();
    for (var i = ci - R; i <= ci + R; i++) {
      for (var j = cj - R; j <= cj + R; j++) {
        wanted.add(i + ',' + j);
        this.blockGroup(i, j).visible = true;
      }
    }
    this.blocks.forEach(function (group, key) {
      if (!wanted.has(key)) group.visible = false;
    });
  };

  global.City3D = City3D;
})(window);
