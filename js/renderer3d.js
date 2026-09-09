/**
 * 第三人称斗罗大陆渲染：黄昏光影、魂技专属特效、圣光拖尾。
 */
(function (global) {
  'use strict';

  var UnitModel = global.UnitModel;
  var World = global.World;
  var _up = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
  var _dir = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;

  function NullRenderer() {
    this.world = {
      heightAt: function () { return 0; },
      update: function () {},
      groundMat: { color: { setHex: function () {} } }
    };
    this.meshes = new Map();
    this.fxMeshes = [];
    this.domainMesh = null;
    this.camera = { position: { x: 0, y: 40, z: 0 } };
    this.flash = 0;
    this.shake = 0;
    this.createUnitMesh = function () {};
    this.updateUnitMesh = function () {};
    this.syncFx = function () {};
    this.updateCamera = function () {};
    this.setDomainLook = function () {};
    this.resize = function () {};
    this.render = function () {};
    this.clearUnits = function () {};
  }

  function glowMat(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity == null ? 0.7 : opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  function makeFx(kind) {
    var geo;
    if (kind === 'ring') geo = new THREE.TorusGeometry(1, 0.07, 8, 36);
    else if (kind === 'beam') geo = new THREE.CylinderGeometry(0.45, 0.12, 1, 8);
    else if (kind === 'slash') geo = new THREE.TorusGeometry(1, 0.11, 6, 22, Math.PI * 1.15);
    else if (kind === 'sword') geo = new THREE.ConeGeometry(0.42, 2.6, 5);
    else if (kind === 'disc') geo = new THREE.CircleGeometry(1, 22);
    else if (kind === 'column') geo = new THREE.CylinderGeometry(1, 0.85, 1, 14, 1, true);
    else geo = new THREE.SphereGeometry(1, 8, 8);
    var mesh = new THREE.Mesh(geo, glowMat(0xffe27a, 0.8));
    mesh.userData.kind = kind;
    mesh.visible = false;
    return mesh;
  }

  function Renderer3D(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.meshes = new Map();
    this.fxPool = { sphere: [], ring: [], beam: [], slash: [], sword: [], disc: [], column: [] };
    this.fxUsed = { sphere: 0, ring: 0, beam: 0, slash: 0, sword: 0, disc: 0, column: 0 };

    this.scene = new THREE.Scene();
    this.normalFog = 0x4a3068;
    this.domainFog = 0xf0c45a;
    this.scene.background = new THREE.Color(0x1a1230);
    this.scene.fog = new THREE.Fog(this.normalFog, 160, 2400);

    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 1.2, 5000);
    this.camera.position.set(0, 40, 70);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    if (!this.renderer.getContext()) throw new Error('WebGL 不可用');
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.setupLights();
    this.world = new World(this.scene);
    this.camYaw = 0;
    this.camPitch = 0.42;
    this.shake = 0;
    this.flash = 0;

    this.domainMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(280, 280, 22, 48, 1, true),
      glowMat(0xffe27a, 0.16)
    );
    this.domainMesh.visible = false;
    this.scene.add(this.domainMesh);

    this.domainFloor = new THREE.Mesh(
      new THREE.CircleGeometry(280, 48),
      glowMat(0xffd36a, 0.2)
    );
    this.domainFloor.rotation.x = -Math.PI / 2;
    this.domainFloor.visible = false;
    this.scene.add(this.domainFloor);

    this.domainRing = new THREE.Mesh(
      new THREE.TorusGeometry(270, 2.2, 8, 64),
      glowMat(0xfff1a0, 0.55)
    );
    this.domainRing.rotation.x = Math.PI / 2;
    this.domainRing.visible = false;
    this.scene.add(this.domainRing);

    this.setupSparkles();
    this.setupGodrays();
  }

  Renderer3D.prototype.setupLights = function () {
    this.ambient = new THREE.AmbientLight(0x4a3868, 0.42);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x8866cc, 0x2a1808, 0.55);
    this.scene.add(this.hemi);

    var sun = new THREE.DirectionalLight(0xffc070, 1.55);
    sun.position.set(400, 500, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far = 1800;
    var s = 900;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    sun.target = new THREE.Object3D();
    this.scene.add(sun.target);
    this.sun = sun;

    this.heroLight = new THREE.PointLight(0xffe27a, 1.6, 90, 2);
    this.heroLight.position.set(0, 18, 0);
    this.scene.add(this.heroLight);
  };

  Renderer3D.prototype.setupSparkles = function () {
    this.sparkles = [];
    for (var i = 0; i < 28; i++) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), glowMat(0xfff4c0, 0.85));
      this.scene.add(m);
      this.sparkles.push({
        mesh: m,
        a: Math.random() * Math.PI * 2,
        r: 6 + Math.random() * 8,
        h: 4 + Math.random() * 14,
        spd: 0.6 + Math.random() * 1.4
      });
    }
  };

  Renderer3D.prototype.setupGodrays = function () {
    this.godrays = [];
    var mat = glowMat(0xffe9a0, 0.08);
    for (var i = 0; i < 5; i++) {
      var ray = new THREE.Mesh(new THREE.PlaneGeometry(18, 140), mat);
      ray.position.set(Math.cos(i * 1.25) * 22, 70, Math.sin(i * 1.25) * 22);
      ray.rotation.z = 0.15 * (i % 2 ? 1 : -1);
      this.scene.add(ray);
      this.godrays.push(ray);
    }
  };

  Renderer3D.prototype.takeFx = function (kind) {
    var pool = this.fxPool[kind];
    var i = this.fxUsed[kind]++;
    while (pool.length <= i) {
      var m = makeFx(kind);
      this.scene.add(m);
      pool.push(m);
    }
    return pool[i];
  };

  Renderer3D.prototype.resetFx = function () {
    var k;
    for (k in this.fxUsed) this.fxUsed[k] = 0;
    for (k in this.fxPool) {
      var list = this.fxPool[k];
      for (var i = 0; i < list.length; i++) list[i].visible = false;
    }
  };

  Renderer3D.prototype.placeFx = function (item) {
    var mesh = this.takeFx(item.kind || 'sphere');
    mesh.visible = true;
    mesh.position.set(item.x, item.y, item.z);
    if (item.sx != null) mesh.scale.set(item.sx, item.sy == null ? item.sx : item.sy, item.sz == null ? item.sx : item.sz);
    else mesh.scale.setScalar(Math.max(0.35, item.s || 1));
    mesh.rotation.set(item.rotX || 0, item.rotY || 0, item.rotZ || 0);
    if (item.look && item.vx != null) {
      _dir.set(item.vx, item.vy || 0, item.vz);
      if (_dir.lengthSq() > 0.0001) {
        _dir.normalize();
        mesh.quaternion.setFromUnitVectors(_up, _dir);
      }
    }
    mesh.material.color.set(item.color || '#ffe27a');
    mesh.material.opacity = item.opacity == null ? 0.75 : item.opacity;
  };

  Renderer3D.prototype.createUnitMesh = function (unit) {
    var group = UnitModel.create(unit);
    this.scene.add(group);
    this.meshes.set(unit.id, group);
    return group;
  };

  Renderer3D.prototype.updateUnitMesh = function (unit, world) {
    var group = this.meshes.get(unit.id) || this.createUnitMesh(unit);
    if (!unit.alive) {
      group.visible = false;
      return;
    }
    group.visible = true;

    var gy = world.heightAt(unit.x, unit.y);
    var trueBody = unit.buffs.trueBody > 0;
    var scale = unit.radius / 14;
    group.scale.setScalar(scale);
    group.position.set(unit.x, gy + unit.h, unit.y);
    group.rotation.y = -unit.angle + Math.PI;

    if (group.userData.dragon) {
      group.userData.dragon.scale.setScalar(trueBody ? 2.15 : 1.15);
      group.userData.dragon.position.y = trueBody ? 1.2 : 0;
    }

    if (group.userData.human) group.userData.human.visible = !trueBody;
    if (group.userData.dragon) group.userData.dragon.visible = trueBody;
    if (group.userData.ringPivot) group.userData.ringPivot.visible = !trueBody;

    if (group.userData.wings) {
      group.userData.wings.visible = unit.buffs.wings > 0 && !trueBody;
    }
    if (group.userData.goldAura) {
      group.userData.goldAura.visible = (unit.buffs.golden > 0 || unit.isPlayer) && !trueBody;
      group.userData.goldAura.material.opacity = unit.buffs.golden > 0 ? 0.28 : (unit.isPlayer ? 0.1 : 0);
      group.userData.goldAura.rotation.y += 0.04;
      var pulse = 1 + Math.sin(Date.now() * 0.006) * 0.08;
      group.userData.goldAura.scale.setScalar(unit.buffs.golden > 0 ? pulse * 1.15 : pulse);
    }
    if (group.userData.shieldMesh) {
      group.userData.shieldMesh.visible = unit.buffs.shield > 0 && !trueBody;
      if (unit.buffs.shield > 0) {
        group.userData.shieldMesh.rotation.z += 0.08;
        group.userData.shieldMesh.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.08);
      }
    }
    if (group.userData.halo) {
      group.userData.halo.visible = !!(unit.isPlayer && !trueBody);
      group.userData.halo.rotation.z += 0.02;
    }

    var t = Date.now() * 0.001;
    if (group.userData.ringPivot) {
      group.userData.ringPivot.rotation.y = t * 0.9;
      var rings = group.userData.rings || [];
      for (var r = 0; r < rings.length; r++) {
        rings[r].rotation.z = Math.sin(t * 1.1 + r) * 0.35;
        rings[r].position.y = Math.sin(t * 2 + r) * 0.25;
      }
    }

    var moving = Math.hypot(unit.vx, unit.vy) > 12;
    var attack = unit.attackAnim > 0 ? unit.attackAnim / 0.28 : 0;
    if (group.userData.legs && !trueBody) {
      for (var i = 0; i < group.userData.legs.length; i++) {
        var swing = moving ? Math.sin(t * 8 + (i % 2) * Math.PI) * 0.45 : 0;
        if (group.userData.legs[i].upper) group.userData.legs[i].upper.rotation.x = swing;
        if (group.userData.legs[i].lower && group.userData.legs[i].lower !== group.userData.legs[i].upper) {
          group.userData.legs[i].lower.rotation.x = -swing * 0.5;
        }
      }
    }
    if (group.userData.arms && !trueBody && group.userData.arms[1]) {
      group.userData.arms[1].rotation.x = -attack * 1.4;
      if (group.userData.arms[0]) group.userData.arms[0].rotation.x = attack * 0.3;
    }

    if (!trueBody && group.userData.wingL) {
      var flap = Math.sin(t * 7) * 0.32;
      group.userData.wingL.rotation.y = flap;
      if (group.userData.wingR) group.userData.wingR.rotation.y = -flap;
    }

    if (trueBody && group.userData.dragon) {
      var d = group.userData.dragon;
      var dflap = Math.sin(t * 5.5) * 0.28;
      if (d.userData.wingL) d.userData.wingL.rotation.z = dflap;
      if (d.userData.wingR) d.userData.wingR.rotation.z = -dflap;
      if (d.userData.jaw) d.userData.jaw.rotation.x = 0.12 + Math.sin(t * 3) * 0.08;
      var segs = d.userData.tail || [];
      if (segs[0]) segs[0].rotation.z = Math.sin(t * 2.2) * 0.12;
    }

    if (unit.hitFlash > 0) {
      group.traverse(function (child) {
        if (child.material && child.material.emissive) {
          child.material.emissiveIntensity = 1.15;
        }
      });
    }
  };

  Renderer3D.prototype.syncFx = function (projectiles, effects, particles, world) {
    this.resetFx();
    var i;
    var n;
    for (i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      var py = world.heightAt(p.x, p.y) + (p.h || 10);
      var yaw = Math.atan2(p.vy || 0, p.vx || 1);
      if (p.type === 'judgment') {
        this.placeFx({ kind: 'sword', x: p.x, y: py + 10, z: p.y, sx: 7, sy: 36, sz: 7, color: '#fff6c8', opacity: 0.95 });
        this.placeFx({ kind: 'column', x: p.x, y: py + 50, z: p.y, sx: 7, sy: 110, sz: 7, color: '#ffe27a', opacity: 0.32 });
        this.placeFx({ kind: 'ring', x: p.x, y: py + 2, z: p.y, s: 12, rotX: Math.PI / 2, color: '#fff1a0', opacity: 0.7 });
      } else if (p.type === 'sunbeam') {
        this.placeFx({ kind: 'beam', x: p.x, y: py, z: p.y, sx: 3.2, sy: 22, sz: 3.2, color: '#ffd36a', opacity: 0.92, look: true, vx: p.vx, vy: p.vh, vz: p.vy });
        this.placeFx({ kind: 'sphere', x: p.x, y: py, z: p.y, s: 4.5, color: '#fff8d0', opacity: 0.85 });
        this.placeFx({ kind: 'ring', x: p.x, y: py, z: p.y, s: 3.5, color: '#ffe27a', opacity: 0.6, look: true, vx: p.vx, vy: p.vh, vz: p.vy });
      } else if (p.type === 'blade') {
        this.placeFx({ kind: 'slash', x: p.x, y: py, z: p.y, s: 9, color: '#ffb347', opacity: 0.9, rotY: -yaw, rotX: 0.2 });
        this.placeFx({ kind: 'beam', x: p.x, y: py, z: p.y, sx: 1.6, sy: 14, sz: 1.6, color: '#ffe9a0', opacity: 0.8, look: true, vx: p.vx, vy: 0, vz: p.vy });
      } else if (p.type === 'sword') {
        this.placeFx({ kind: 'sword', x: p.x, y: py, z: p.y, sx: 2.4, sy: 8, sz: 2.4, color: '#ffe27a', opacity: 0.92, look: true, vx: p.vx, vy: p.vh, vz: p.vy });
      } else if (p.type === 'needle') {
        this.placeFx({ kind: 'beam', x: p.x, y: py, z: p.y, sx: 0.55, sy: 7, sz: 0.55, color: '#fff4c0', opacity: 0.95, look: true, vx: p.vx, vy: 0, vz: p.vy });
      } else if (p.type === 'feather') {
        this.placeFx({ kind: 'slash', x: p.x, y: py, z: p.y, s: 3.2, color: '#fff4c0', opacity: 0.8, rotY: -yaw });
        this.placeFx({ kind: 'sphere', x: p.x, y: py, z: p.y, s: 1.6, color: '#ffe9a0', opacity: 0.7 });
      } else {
        this.placeFx({ kind: 'sphere', x: p.x, y: py, z: p.y, s: 3, color: p.color || '#ffe27a', opacity: Math.min(1, p.life) });
      }
    }

    for (i = 0; i < effects.length; i++) {
      var e = effects[i];
      var gy = world.heightAt(e.x, e.y);
      var life = Math.max(0.05, e.life);
      var grow = Math.max(0.2, 1.15 - life * 0.25);
      if (e.type === 'claw') {
        var a = e.angle || 0;
        var fx = e.x + Math.cos(a) * 22;
        var fz = e.y + Math.sin(a) * 22;
        this.placeFx({ kind: 'slash', x: fx, y: gy + 12, z: fz, s: 16, color: '#ffe27a', opacity: 0.95, rotY: -a, rotX: 0.4 });
        this.placeFx({ kind: 'slash', x: fx, y: gy + 10, z: fz, s: 12, color: '#fff8d0', opacity: 0.7, rotY: -a + 0.3, rotX: -0.2 });
        this.placeFx({ kind: 'sphere', x: fx, y: gy + 11, z: fz, s: 5, color: '#ffd36a', opacity: 0.55 });
      } else if (e.type === 'roar') {
        n = (e.r || 110) * grow * 0.09;
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 8, z: e.y, s: n, rotX: Math.PI / 2, color: '#fff4c0', opacity: 0.7 });
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 14, z: e.y, s: n * 0.72, rotX: Math.PI / 2, color: '#e0b0ff', opacity: 0.5 });
        this.placeFx({ kind: 'sphere', x: e.x, y: gy + 10, z: e.y, s: 8, color: '#fff1a0', opacity: 0.35 });
      } else if (e.type === 'burst' || e.type === 'punch') {
        this.placeFx({ kind: 'sphere', x: e.x, y: gy + 10, z: e.y, s: (e.r || 36) * 0.18 * grow, color: '#ffd36a', opacity: 0.7 });
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 3, z: e.y, s: (e.r || 36) * 0.12 * grow, rotX: Math.PI / 2, color: '#fff4c0', opacity: 0.8 });
      } else if (e.type === 'wingsBurst') {
        this.placeFx({ kind: 'disc', x: e.x, y: gy + 14, z: e.y, s: 10, color: '#d9a0ff', opacity: 0.45, rotX: Math.PI / 2 });
        this.placeFx({ kind: 'slash', x: e.x, y: gy + 16, z: e.y, s: 14, color: '#ffe9a0', opacity: 0.7, rotZ: 0.6 });
        this.placeFx({ kind: 'slash', x: e.x, y: gy + 16, z: e.y, s: 14, color: '#ffe9a0', opacity: 0.7, rotZ: -0.6 });
      } else if (e.type === 'golden') {
        this.placeFx({ kind: 'column', x: e.x, y: gy + 18, z: e.y, sx: 6, sy: 36, sz: 6, color: '#ffe27a', opacity: 0.4 });
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 6, z: e.y, s: 8, rotX: Math.PI / 2, color: '#ffd36a', opacity: 0.75 });
      } else if (e.type === 'truebody') {
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 2, z: e.y, s: 11, rotX: Math.PI / 2, color: '#ffe27a', opacity: 0.55 });
        this.placeFx({ kind: 'column', x: e.x, y: gy + 26, z: e.y, sx: 3.2, sy: 48, sz: 3.2, color: '#ffd36a', opacity: 0.16 });
      } else if (e.type === 'tail') {
        this.placeFx({ kind: 'slash', x: e.x, y: gy + 8, z: e.y, s: 18, color: '#e8c35a', opacity: 0.85, rotX: Math.PI / 2 });
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 3, z: e.y, s: 10, rotX: Math.PI / 2, color: '#ffe27a', opacity: 0.55 });
      } else if (e.type === 'shield') {
        this.placeFx({ kind: 'disc', x: e.x, y: gy + 12, z: e.y, s: 8, color: '#ffe27a', opacity: 0.55 });
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 12, z: e.y, s: 7, color: '#fff8d0', opacity: 0.7 });
      } else if (e.type === 'flash' || e.type === 'afterimage') {
        this.placeFx({ kind: 'sphere', x: e.x, y: gy + 10, z: e.y, s: e.type === 'afterimage' ? 6 : 4, color: '#fff4b0', opacity: e.type === 'afterimage' ? 0.35 : 0.8 });
        this.placeFx({ kind: 'column', x: e.x, y: gy + 12, z: e.y, sx: 2, sy: 16, sz: 2, color: '#ffe9a0', opacity: 0.4 });
      } else if (e.type === 'skystrike') {
        this.placeFx({ kind: 'column', x: e.tx || e.x, y: gy + 50, z: e.ty || e.y, sx: 10, sy: 120, sz: 10, color: '#ffcc55', opacity: 0.4 });
        this.placeFx({ kind: 'ring', x: e.tx || e.x, y: gy + 4, z: e.ty || e.y, s: 16, rotX: Math.PI / 2, color: '#fff4c0', opacity: 0.8 });
        this.placeFx({ kind: 'sphere', x: e.tx || e.x, y: gy + 12, z: e.ty || e.y, s: 18, color: '#ffe27a', opacity: 0.5 });
      } else if (e.type === 'gravity') {
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 3, z: e.y, s: 7, rotX: Math.PI / 2, color: '#ff9a3c', opacity: 0.8 });
        this.placeFx({ kind: 'sphere', x: e.x, y: gy + 8, z: e.y, s: 5, color: '#ffb347', opacity: 0.45 });
      } else if (e.type === 'domain') {
        this.placeFx({ kind: 'ring', x: e.x, y: gy + 6, z: e.y, s: 22, rotX: Math.PI / 2, color: '#ffe9a0', opacity: 0.7 });
        this.placeFx({ kind: 'column', x: e.x, y: gy + 30, z: e.y, sx: 16, sy: 70, sz: 16, color: '#ffd36a', opacity: 0.28 });
      } else {
        this.placeFx({ kind: 'sphere', x: e.x, y: gy + 8, z: e.y, s: 5, color: '#ffd36a', opacity: Math.min(0.7, life) });
      }
    }

    for (i = 0; i < particles.length; i++) {
      var part = particles[i];
      this.placeFx({
        kind: 'sphere',
        x: part.x,
        y: world.heightAt(part.x, part.y) + 6 + part.size * 2,
        z: part.y,
        s: Math.max(0.6, part.size * part.life * 2.8),
        color: part.color,
        opacity: Math.min(0.95, part.life * 1.2)
      });
    }
  };

  Renderer3D.prototype.setDomainLook = function (domain, player) {
    var on = !!(domain && domain.life > 0);
    this.domainMesh.visible = on;
    this.domainFloor.visible = on;
    this.domainRing.visible = on;
    var t = Date.now() * 0.001;
    if (on) {
      this.domainMesh.position.set(domain.x, 10, domain.y);
      this.domainFloor.position.set(domain.x, 1.7, domain.y);
      this.domainRing.position.set(domain.x, 4 + Math.sin(t * 2) * 1.2, domain.y);
      this.domainRing.rotation.z = t * 0.4;
      this.scene.fog.color.setHex(this.domainFog);
      this.scene.background.setHex(0xf0c85a);
      this.ambient.color.setHex(0xffe9a0);
      this.ambient.intensity = 0.95;
      this.heroLight.intensity = 3.2;
      this.heroLight.distance = 160;
    } else {
      this.scene.fog.color.setHex(this.normalFog);
      this.scene.background.setHex(0x1a1230);
      this.ambient.color.setHex(0x4a3868);
      this.ambient.intensity = 0.42;
      this.heroLight.intensity = 1.6;
      this.heroLight.distance = 90;
    }
    if (player && this.sun) {
      this.sun.position.set(player.x + 350, 480, player.y + 120);
      this.sun.target.position.set(player.x, 0, player.y);
      this.sun.target.updateMatrixWorld();
      var gy = this.world.heightAt(player.x, player.y);
      this.heroLight.position.set(player.x, gy + player.h + 16, player.y);
      var j;
      for (j = 0; j < this.sparkles.length; j++) {
        var sp = this.sparkles[j];
        sp.a += 0.016 * sp.spd;
          var show = player.alive && !(player.buffs && player.buffs.trueBody > 0);
        sp.mesh.visible = show;
        if (show) {
          sp.mesh.position.set(
            player.x + Math.cos(sp.a) * sp.r,
            gy + player.h + sp.h + Math.sin(t * 2 + j) * 1.4,
            player.y + Math.sin(sp.a * 1.15) * sp.r
          );
        }
      }
      for (j = 0; j < this.godrays.length; j++) {
      this.godrays[j].visible = !(player.buffs && player.buffs.trueBody > 0);
      this.godrays[j].position.x = player.x + Math.cos(t * 0.15 + j) * 26;
      this.godrays[j].position.z = player.y + Math.sin(t * 0.15 + j) * 26;
      this.godrays[j].material.opacity = on ? 0.16 : 0.07;
      }
    }
  };

  Renderer3D.prototype.updateCamera = function (player, dt, look) {
    if (!player) return;
    look = look || {};
    if (look.yaw != null) this.camYaw = look.yaw;
    else this.camYaw = player.angle;

    var ground = this.world.heightAt(player.x, player.y);
    var trueBody = player.buffs.trueBody > 0;
    var dist = trueBody ? 78 : 42;
    var height = trueBody ? 28 : 18;
    var yaw = this.camYaw;
    var side = trueBody ? 16 : 0;
    var idealX = player.x - Math.cos(yaw) * dist + Math.cos(yaw + Math.PI / 2) * side;
    var idealZ = player.y - Math.sin(yaw) * dist + Math.sin(yaw + Math.PI / 2) * side;
    var idealY = ground + player.h + height;

    if (this.shake > 0) {
      idealX += (Math.random() - 0.5) * this.shake * 7;
      idealY += (Math.random() - 0.5) * this.shake * 4;
      this.shake -= dt;
    }
    if (this.flash > 0) this.flash -= dt;

    var lerp = 1 - Math.pow(0.0004, dt);
    this.camera.position.x += (idealX - this.camera.position.x) * lerp;
    this.camera.position.y += (idealY - this.camera.position.y) * lerp;
    this.camera.position.z += (idealZ - this.camera.position.z) * lerp;

    this.camera.lookAt(player.x, ground + player.h + (trueBody ? 14 : 14), player.y);
    this.world.update(player.x, player.y);
  };

  Renderer3D.prototype.resize = function (width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  Renderer3D.prototype.render = function () {
    this.renderer.toneMappingExposure = 1.18 + Math.max(0, this.flash) * 2.4;
    this.renderer.render(this.scene, this.camera);
  };

  Renderer3D.prototype.clearUnits = function () {
    this.meshes.forEach(function (g) { this.scene.remove(g); }, this);
    this.meshes.clear();
  };

  global.Renderer3D = Renderer3D;
  global.NullRenderer = NullRenderer;
})(window);
