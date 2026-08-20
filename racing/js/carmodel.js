/**
 * 夜城飙车 - 车辆模型（THREE）
 *
 * 做法：先画出车的侧面轮廓线，沿车宽方向挤出成实体（带倒角），
 * 再按「俯视半宽」和「车顶收窄」两个函数去改顶点 —— 方盒子就变成了
 * 前低后翘、腰线外扩的跑车轮廓。座舱是另一块深色玻璃挤出体。
 */
(function (global) {
  'use strict';

  var bodyCache = {};
  var wheelParts = null;
  var rimTex = null;
  var glowTex = null;

  var SHAPES = {
    /** 玩家超跑：低矮、长车头、宽尾 */
    super: {
      width: 1.98,
      body: [
        [2.36, 0.28], [2.44, 0.44], [2.32, 0.64], [1.60, 0.70], [0.88, 0.80],
        [0.10, 0.86], [-1.10, 0.90], [-1.88, 0.94], [-2.30, 0.86], [-2.44, 0.56],
        [-2.36, 0.28], [-1.20, 0.20], [1.20, 0.20]
      ],
      canopyWidth: 1.6,
      canopy: [
        [0.94, 0.76], [0.16, 1.22], [-0.72, 1.26], [-1.52, 0.96], [-1.60, 0.76]
      ],
      taperK: 0.2, taperP: 2.2, haunch: 0.055, haunchZ: 1.42,
      wheelR: 0.4, wheelW: 0.24, wheelX: 0.88, frontZ: 1.42, rearZ: -1.5,
      lightY: 0.62, tailY: 0.72, roofSign: false, wing: true, mirrors: true
    },
    /** 车流：普通轿车 */
    sedan: {
      width: 1.84,
      body: [
        [2.06, 0.34], [2.14, 0.60], [1.90, 0.84], [1.20, 0.90], [0.72, 0.96],
        [-1.30, 0.98], [-1.92, 0.94], [-2.10, 0.62], [-2.02, 0.34], [-1.0, 0.24], [1.0, 0.24]
      ],
      canopyWidth: 1.58,
      canopy: [
        [0.78, 0.94], [0.26, 1.40], [-0.88, 1.42], [-1.44, 1.0], [-1.5, 0.94]
      ],
      taperK: 0.16, taperP: 2.6, haunch: 0.02, haunchZ: 1.3,
      wheelR: 0.36, wheelW: 0.22, wheelX: 0.82, frontZ: 1.3, rearZ: -1.34,
      lightY: 0.66, tailY: 0.74, roofSign: false, wing: false, mirrors: true
    },
    /** 车流：小面包 / 出租 */
    van: {
      width: 1.9,
      body: [
        [1.92, 0.36], [2.0, 0.68], [1.86, 1.02], [1.3, 1.10], [0.9, 1.16],
        [-1.5, 1.18], [-2.0, 1.12], [-2.12, 0.66], [-2.04, 0.36], [-1.0, 0.26], [1.0, 0.26]
      ],
      canopyWidth: 1.7,
      canopy: [
        [1.0, 1.14], [0.66, 1.66], [-1.3, 1.68], [-1.86, 1.4], [-1.92, 1.14]
      ],
      taperK: 0.1, taperP: 3, haunch: 0, haunchZ: 1.3,
      wheelR: 0.38, wheelW: 0.22, wheelX: 0.84, frontZ: 1.32, rearZ: -1.4,
      lightY: 0.74, tailY: 0.9, roofSign: true, wing: false, mirrors: true
    }
  };

  function canvas2d(size) {
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }

  /** 轮圈贴图：五辐轮毂，省掉一堆辐条网格 */
  function rimTexture() {
    if (rimTex) return rimTex;
    var c = canvas2d(128);
    var ctx = c.getContext('2d');
    var m = 64;
    ctx.fillStyle = '#0c0d11';
    ctx.beginPath();
    ctx.arc(m, m, 62, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8e98a8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m, m, 54, 0, Math.PI * 2);
    ctx.stroke();

    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(m, m);
      ctx.rotate(a);
      var grd = ctx.createLinearGradient(0, 0, 0, -54);
      grd.addColorStop(0, '#b9c3d2');
      grd.addColorStop(1, '#79839a');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-15, -52);
      ctx.lineTo(15, -52);
      ctx.lineTo(9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#cfd8e6';
    ctx.beginPath();
    ctx.arc(m, m, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8264c';
    ctx.beginPath();
    ctx.arc(m, m, 6, 0, Math.PI * 2);
    ctx.fill();

    rimTex = new THREE.CanvasTexture(c);
    if ('colorSpace' in rimTex && THREE.SRGBColorSpace) rimTex.colorSpace = THREE.SRGBColorSpace;
    return rimTex;
  }

  /** 柔和圆形渐变，用于车底霓虹光晕 */
  function glowTexture() {
    if (glowTex) return glowTex;
    var c = canvas2d(64);
    var ctx = c.getContext('2d');
    var grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }

  /**
   * 把 (z, y) 侧面轮廓挤出成车体，并按俯视半宽 / 车顶收窄修顶点。
   * opts: { width, taperK, taperP, haunch, haunchZ, roofFrom, roofTaper }
   */
  function extrudeProfile(points, opts) {
    var shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: opts.width,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 2,
      curveSegments: 2,
      steps: 1
    });
    geo.translate(0, 0, -opts.width / 2);
    geo.rotateY(-Math.PI / 2);

    var maxZ = 0;
    var p = geo.attributes.position;
    var k;
    for (k = 0; k < p.count; k++) maxZ = Math.max(maxZ, Math.abs(p.getZ(k)));

    for (k = 0; k < p.count; k++) {
      var x = p.getX(k);
      var y = p.getY(k);
      var z = p.getZ(k);
      var t = Math.abs(z) / (maxZ || 1);
      var factor = 1 - opts.taperK * Math.pow(t, opts.taperP);
      if (opts.haunch) {
        var d = (Math.abs(z) - opts.haunchZ) / 0.6;
        factor += opts.haunch * Math.exp(-d * d);
      }
      if (opts.roofTaper && y > opts.roofFrom) {
        var r = Math.min(1, (y - opts.roofFrom) / 0.5);
        factor *= 1 - opts.roofTaper * r;
      }
      p.setX(k, x * factor);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  function bodyGeometries(name) {
    if (bodyCache[name]) return bodyCache[name];
    var s = SHAPES[name];
    var body = extrudeProfile(s.body, {
      width: s.width, taperK: s.taperK, taperP: s.taperP,
      haunch: s.haunch, haunchZ: s.haunchZ, roofFrom: 0.7, roofTaper: 0.1
    });
    var canopy = extrudeProfile(s.canopy, {
      width: s.canopyWidth, taperK: 0.34, taperP: 1.9,
      haunch: 0, haunchZ: 0, roofFrom: s.canopy[0][1], roofTaper: 0.3
    });
    bodyCache[name] = { body: body, canopy: canopy };
    return bodyCache[name];
  }

  function wheelGeometries(radius, width) {
    var key = radius + '_' + width;
    if (!wheelParts) wheelParts = {};
    if (wheelParts[key]) return wheelParts[key];
    var tire = new THREE.TorusGeometry(radius - width * 0.42, width * 0.42, 8, 20);
    tire.rotateY(Math.PI / 2);
    var hub = new THREE.CylinderGeometry(radius - width * 0.7, radius - width * 0.7, width * 0.9, 14);
    hub.rotateZ(Math.PI / 2);
    var face = new THREE.CircleGeometry(radius - width * 0.66, 20);
    face.rotateY(Math.PI / 2);
    wheelParts[key] = { tire: tire, hub: hub, face: face };
    return wheelParts[key];
  }

  function makeWheel(cfg, side) {
    var geos = wheelGeometries(cfg.wheelR, cfg.wheelW);
    var wheel = new THREE.Group();

    wheel.add(new THREE.Mesh(geos.tire, new THREE.MeshStandardMaterial({
      color: 0x101218, roughness: 0.92, metalness: 0.05
    })));
    wheel.add(new THREE.Mesh(geos.hub, new THREE.MeshStandardMaterial({
      color: 0x1b1e26, roughness: 0.7, metalness: 0.3
    })));

    var rim = new THREE.Mesh(geos.face, new THREE.MeshStandardMaterial({
      map: rimTexture(), roughness: 0.34, metalness: 0.9,
      emissive: 0x141a24, emissiveIntensity: 0.8
    }));
    rim.position.x = side * cfg.wheelW * 0.5;
    rim.rotation.y = side > 0 ? 0 : Math.PI;
    wheel.add(rim);

    return wheel;
  }

  /**
   * 创建一辆车。opts: { shape, color, accent, player }
   * 车头朝向模型局部 +Z。
   */
  function create(opts) {
    opts = opts || {};
    var name = SHAPES[opts.shape] ? opts.shape : (opts.player ? 'super' : 'sedan');
    var cfg = SHAPES[name];
    var paint = opts.color == null ? 0xe01b4c : opts.color;
    var accent = opts.accent == null ? 0x2ee6ff : opts.accent;

    var car = new THREE.Group();
    var geos = bodyGeometries(name);

    // 车漆：夜里没有主光源，靠一点自发光提亮
    var bodyMat = new THREE.MeshStandardMaterial({
      color: paint, roughness: 0.26, metalness: 0.62,
      emissive: new THREE.Color(paint).multiplyScalar(0.16)
    });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.65, metalness: 0.25 });
    var glassMat = new THREE.MeshStandardMaterial({
      color: 0x080d16, roughness: 0.08, metalness: 0.95,
      emissive: 0x0b1725, emissiveIntensity: 0.75
    });

    var body = new THREE.Mesh(geos.body, bodyMat);
    car.add(body);
    var canopy = new THREE.Mesh(geos.canopy, glassMat);
    car.add(canopy);

    var halfW = cfg.width / 2;

    // 前铲 / 后扩散器
    var splitter = new THREE.Mesh(new THREE.BoxGeometry(cfg.width * 0.94, 0.07, 0.5), darkMat);
    splitter.position.set(0, 0.19, cfg.body[0][0] - 0.16);
    car.add(splitter);
    var diffuser = new THREE.Mesh(new THREE.BoxGeometry(cfg.width * 0.9, 0.22, 0.42), darkMat);
    diffuser.position.set(0, 0.26, -cfg.body[0][0] + 0.1);
    car.add(diffuser);

    // 侧裙
    for (var sk = -1; sk <= 1; sk += 2) {
      var skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 2.3), darkMat);
      skirt.position.set(sk * (halfW - 0.06), 0.22, -0.05);
      car.add(skirt);
    }

    // LED 大灯 + 贯穿式尾灯
    var headMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 3, roughness: 0.25
    });
    var tailMat = new THREE.MeshStandardMaterial({
      color: 0x2a0008, emissive: 0xff1f3c, emissiveIntensity: 1.5, roughness: 0.35
    });
    var noseZ = cfg.body[0][0];
    for (var h = -1; h <= 1; h += 2) {
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.075, 0.12), headMat);
      head.position.set(h * (halfW - 0.34), cfg.lightY, noseZ - 0.12);
      head.rotation.z = h * 0.12;
      car.add(head);
      // 日行灯竖条
      var drl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.08), headMat);
      drl.position.set(h * (halfW - 0.12), cfg.lightY - 0.08, noseZ - 0.2);
      car.add(drl);
    }
    var tailBar = new THREE.Mesh(new THREE.BoxGeometry(cfg.width * 0.82, 0.085, 0.07), tailMat);
    tailBar.position.set(0, cfg.tailY, -noseZ + 0.02);
    car.add(tailBar);

    // 后视镜
    if (cfg.mirrors) {
      for (var mi = -1; mi <= 1; mi += 2) {
        var mirror = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.13), darkMat);
        mirror.position.set(mi * (halfW + 0.02), cfg.canopy[0][1] + 0.06, cfg.canopy[0][0] - 0.16);
        mirror.rotation.y = mi * 0.2;
        car.add(mirror);
      }
    }

    // 尾翼与排气
    if (cfg.wing) {
      var wing = new THREE.Mesh(new THREE.BoxGeometry(cfg.width * 0.9, 0.06, 0.36), darkMat);
      wing.position.set(0, 1.06, -2.02);
      wing.rotation.x = -0.14;
      car.add(wing);
      for (var ws = -1; ws <= 1; ws += 2) {
        var stand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), darkMat);
        stand.position.set(ws * cfg.width * 0.36, 0.96, -1.98);
        car.add(stand);
      }
      var ductMat = new THREE.MeshStandardMaterial({ color: 0x05060a, roughness: 0.9 });
      for (var d2 = -1; d2 <= 1; d2 += 2) {
        var duct = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.6), ductMat);
        duct.position.set(d2 * 0.42, 0.9, -1.35);
        car.add(duct);
      }
    }
    var pipeMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.4, metalness: 0.9 });
    for (var pi = -1; pi <= 1; pi += 2) {
      var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.16, 10), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(pi * 0.4, 0.36, -noseZ + 0.06);
      car.add(pipe);
    }

    // 车顶灯箱（出租车）
    if (cfg.roofSign) {
      var sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.13, 0.2), new THREE.MeshStandardMaterial({
        color: 0xffcc44, emissive: 0xffaa22, emissiveIntensity: 1.6
      }));
      sign.position.set(0, cfg.canopy[2][1] + 0.08, 0.1);
      car.add(sign);
    }

    // 侧身霓虹条
    var stripMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 });
    for (var g2 = -1; g2 <= 1; g2 += 2) {
      var strip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 2.1), stripMat);
      strip.position.set(g2 * (halfW - 0.02), 0.36, -0.05);
      car.add(strip);
    }

    // 车轮
    var wheels = [];
    var spots = [
      { x: -cfg.wheelX, z: cfg.frontZ, front: true, side: -1 },
      { x: cfg.wheelX, z: cfg.frontZ, front: true, side: 1 },
      { x: -cfg.wheelX, z: cfg.rearZ, front: false, side: -1 },
      { x: cfg.wheelX, z: cfg.rearZ, front: false, side: 1 }
    ];
    for (var i = 0; i < spots.length; i++) {
      var holder = new THREE.Group();
      holder.position.set(spots[i].x, cfg.wheelR, spots[i].z);
      var wheel = makeWheel(cfg, spots[i].side);
      holder.add(wheel);
      holder.userData.front = spots[i].front;
      holder.userData.wheel = wheel;
      car.add(holder);
      wheels.push(holder);
    }

    car.userData.wheels = wheels;
    car.userData.tailMat = tailMat;
    car.userData.headMat = headMat;
    car.userData.bodyMat = bodyMat;
    car.userData.stripMat = stripMat;

    if (opts.player) {
      var glow = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8, 7.6),
        new THREE.MeshBasicMaterial({
          map: glowTexture(), color: accent, transparent: true, opacity: 0.34,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.05;
      car.add(glow);
      car.userData.underglow = glow;

      var flames = [];
      for (var f = -1; f <= 1; f += 2) {
        var flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 1.4, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0x66ddff, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        flame.rotation.x = Math.PI / 2;
        flame.position.set(f * 0.4, 0.36, -noseZ - 0.6);
        flame.visible = false;
        car.add(flame);
        flames.push(flame);
      }
      car.userData.flames = flames;
    }

    return car;
  }

  /** 换车漆：车身颜色与霓虹条一起改 */
  function repaint(car, color, accent) {
    if (!car || !car.userData.bodyMat) return;
    car.userData.bodyMat.color.setHex(color);
    car.userData.bodyMat.emissive.setHex(color).multiplyScalar(0.16);
    if (accent != null) {
      if (car.userData.stripMat) car.userData.stripMat.color.setHex(accent);
      if (car.userData.underglow) car.userData.underglow.material.color.setHex(accent);
    }
  }

  global.CarModel = {
    create: create,
    repaint: repaint,
    shapes: Object.keys(SHAPES)
  };
})(window);
