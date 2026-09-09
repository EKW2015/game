/**
 * 第三人称斗罗大陆渲染：魂师、魂环、魂技特效、领域金界。
 */
(function (global) {
  'use strict';

  var UnitModel = global.UnitModel;
  var World = global.World;

  function NullRenderer() {
    var self = this;
    this.world = {
      heightAt: function () { return 0; },
      update: function () {},
      groundMat: { color: { setHex: function () {} } }
    };
    this.meshes = new Map();
    this.fxMeshes = [];
    this.domainMesh = null;
    this.camera = { position: { x: 0, y: 40, z: 0 } };
    this.createUnitMesh = function () {};
    this.updateUnitMesh = function () {};
    this.syncFx = function () {};
    this.updateCamera = function () {};
    this.setDomainLook = function () {};
    this.resize = function () {};
    this.render = function () {};
    this.clearUnits = function () {};
  }

  function Renderer3D(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.meshes = new Map();
    this.fxMeshes = [];
    this.particleMeshes = [];

    this.scene = new THREE.Scene();
    this.normalFog = 0xc9b882;
    this.domainFog = 0xf0d56a;
    this.scene.background = new THREE.Color(0x8eb4d4);
    this.scene.fog = new THREE.Fog(this.normalFog, 220, 2800);

    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 1.2, 5000);
    this.camera.position.set(0, 40, 70);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    if (!this.renderer.getContext()) throw new Error('WebGL 不可用');
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.setupLights();
    this.world = new World(this.scene);
    this.camYaw = 0;
    this.camPitch = 0.42;
    this.shake = 0;

    this.domainMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(280, 280, 16, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe27a,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.domainMesh.visible = false;
    this.scene.add(this.domainMesh);

    this.domainFloor = new THREE.Mesh(
      new THREE.CircleGeometry(280, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffd36a,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.domainFloor.rotation.x = -Math.PI / 2;
    this.domainFloor.visible = false;
    this.scene.add(this.domainFloor);
  }

  Renderer3D.prototype.setupLights = function () {
    this.ambient = new THREE.AmbientLight(0xfff2d0, 0.48);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x9ec8ff, 0x6a7a40, 0.55);
    this.scene.add(this.hemi);

    var sun = new THREE.DirectionalLight(0xfff0cc, 1.4);
    sun.position.set(400, 700, 200);
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
    var scale = (unit.radius / 14) * (trueBody ? 3.4 : 1);
    group.scale.setScalar(scale);
    group.position.set(unit.x, gy + unit.h, unit.y);
    group.rotation.y = -unit.angle + Math.PI;

    if (group.userData.human) group.userData.human.visible = !trueBody;
    if (group.userData.dragon) group.userData.dragon.visible = trueBody;
    if (group.userData.ringPivot) group.userData.ringPivot.visible = !trueBody;

    if (group.userData.wings) {
      group.userData.wings.visible = unit.buffs.wings > 0 && !trueBody;
    }
    if (group.userData.goldAura) {
      group.userData.goldAura.visible = unit.buffs.golden > 0 && !trueBody;
      group.userData.goldAura.rotation.y += 0.03;
    }
    if (group.userData.shieldMesh) {
      group.userData.shieldMesh.visible = unit.buffs.shield > 0 && !trueBody;
    }

    var t = Date.now() * 0.001;
    if (group.userData.ringPivot) {
      group.userData.ringPivot.rotation.y = t * 0.7;
      var rings = group.userData.rings || [];
      for (var r = 0; r < rings.length; r++) {
        rings[r].rotation.z = Math.sin(t * 0.8 + r) * 0.25;
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

    if (group.userData.wingL) {
      var flap = Math.sin(t * 6) * 0.25;
      group.userData.wingL.rotation.y = flap;
      if (group.userData.wingR) group.userData.wingR.rotation.y = -flap;
    }

    if (trueBody && group.userData.dragon && group.userData.dragon.userData.body) {
      var segs = group.userData.dragon.userData.body;
      for (var s = 0; s < segs.length; s++) {
        segs[s].position.x = Math.sin(t * 3 + s * 0.5) * 0.35;
      }
    }

    if (unit.hitFlash > 0) {
      group.traverse(function (child) {
        if (child.material && child.material.emissive) {
          child.material.emissiveIntensity = 0.8;
        }
      });
    }
  };

  Renderer3D.prototype.allocFx = function (n) {
    while (this.fxMeshes.length < n) {
      var m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.8 })
      );
      this.scene.add(m);
      this.fxMeshes.push(m);
    }
    for (var i = n; i < this.fxMeshes.length; i++) this.fxMeshes[i].visible = false;
  };

  Renderer3D.prototype.syncFx = function (projectiles, effects, particles, world) {
    var items = [];
    var i;
    for (i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      items.push({
        x: p.x,
        y: world.heightAt(p.x, p.y) + (p.h || 10),
        z: p.y,
        s: p.type === 'judgment' ? 14 : p.type === 'blade' ? 8 : p.type === 'sword' ? 5 : 3,
        color: p.color || '#ffe27a',
        opacity: Math.min(1, p.life)
      });
    }
    for (i = 0; i < effects.length; i++) {
      var e = effects[i];
      var gy = world.heightAt(e.x, e.y);
      var size = e.r ? e.r * 0.08 : 6;
      if (e.type === 'roar' || e.type === 'tail' || e.type === 'burst') size = (e.r || 40) * 0.12 * (1.2 - e.life);
      items.push({
        x: e.x,
        y: gy + 8,
        z: e.y,
        s: size,
        color: e.type === 'roar' ? '#fff4c0' : '#ffd36a',
        opacity: Math.min(0.7, e.life)
      });
    }
    for (i = 0; i < particles.length; i++) {
      var part = particles[i];
      items.push({
        x: part.x,
        y: world.heightAt(part.x, part.y) + 6 + part.size * 2,
        z: part.y,
        s: part.size * part.life * 2.5,
        color: part.color,
        opacity: part.life
      });
    }

    this.allocFx(items.length);
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var mesh = this.fxMeshes[i];
      mesh.visible = true;
      mesh.position.set(it.x, it.y, it.z);
      mesh.scale.setScalar(Math.max(0.4, it.s));
      mesh.material.color.set(it.color);
      mesh.material.opacity = it.opacity;
    }
  };

  Renderer3D.prototype.setDomainLook = function (domain, player) {
    var on = !!(domain && domain.life > 0);
    this.domainMesh.visible = on;
    this.domainFloor.visible = on;
    if (on) {
      this.domainMesh.position.set(domain.x, 8, domain.y);
      this.domainFloor.position.set(domain.x, 1.6, domain.y);
      this.scene.fog.color.setHex(this.domainFog);
      this.scene.background.setHex(0xf0c85a);
      this.ambient.color.setHex(0xffe9a0);
      this.ambient.intensity = 0.85;
    } else {
      this.scene.fog.color.setHex(this.normalFog);
      this.scene.background.setHex(0x8eb4d4);
      this.ambient.color.setHex(0xfff2d0);
      this.ambient.intensity = 0.48;
    }
    if (player && this.sun) {
      this.sun.position.set(player.x + 350, 650, player.y + 120);
      this.sun.target.position.set(player.x, 0, player.y);
      this.sun.target.updateMatrixWorld();
    }
  };

  Renderer3D.prototype.updateCamera = function (player, dt, look) {
    if (!player) return;
    look = look || {};
    if (look.yaw != null) this.camYaw = look.yaw;
    else this.camYaw = player.angle;

    var ground = this.world.heightAt(player.x, player.y);
    var trueBody = player.buffs.trueBody > 0;
    var dist = trueBody ? 130 : 42;
    var height = trueBody ? 58 : 18;
    var yaw = this.camYaw;
    var idealX = player.x - Math.cos(yaw) * dist;
    var idealZ = player.y - Math.sin(yaw) * dist;
    var idealY = ground + player.h + height;

    if (this.shake > 0) {
      idealX += (Math.random() - 0.5) * this.shake * 4;
      idealY += (Math.random() - 0.5) * this.shake * 2;
      this.shake -= dt;
    }

    var lerp = 1 - Math.pow(0.0004, dt);
    this.camera.position.x += (idealX - this.camera.position.x) * lerp;
    this.camera.position.y += (idealY - this.camera.position.y) * lerp;
    this.camera.position.z += (idealZ - this.camera.position.z) * lerp;

    this.camera.lookAt(player.x, ground + player.h + (trueBody ? 24 : 14), player.y);
    this.world.update(player.x, player.y);
  };

  Renderer3D.prototype.resize = function (width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  Renderer3D.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
  };

  Renderer3D.prototype.clearUnits = function () {
    this.meshes.forEach(function (g) { this.scene.remove(g); }, this);
    this.meshes.clear();
  };

  global.Renderer3D = Renderer3D;
  global.NullRenderer = NullRenderer;
})(window);
