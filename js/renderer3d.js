/**
 * 无限 3D 世界渲染：真实恐龙、区块地形、第一人称相机。
 */
(function (global) {
  'use strict';

  var DinoModel = global.DinoModel;
  var World = global.World;

  function Renderer3D(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.meshes = new Map();
    this.particleMeshes = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7ec8f0);
    this.scene.fog = new THREE.Fog(0xa8daf5, 280, 3200);

    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 2, 5000);
    this.camera.position.set(0, 80, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    if (!this.renderer.getContext()) throw new Error('WebGL 不可用');
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.setupLights();
    this.world = new World(this.scene);
  }

  Renderer3D.prototype.setupLights = function () {
    this.scene.add(new THREE.AmbientLight(0xbfd4ff, 0.45));
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d5c32, 0.55));

    var sun = new THREE.DirectionalLight(0xfff0cc, 1.35);
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

  Renderer3D.prototype.createDinoMesh = function (dino) {
    var group = DinoModel.create(dino.colors());
    if (dino.isPlayer) {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(2.8, 3.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x66ff66, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.2;
      group.add(ring);
    }
    this.scene.add(group);
    this.meshes.set(dino.id, group);
    return group;
  };

  Renderer3D.prototype.updateDinoMesh = function (dino, world) {
    if (dino.isPlayer) {
      var existing = this.meshes.get(dino.id);
      if (existing) existing.visible = false;
      return;
    }

    var group = this.meshes.get(dino.id) || this.createDinoMesh(dino);
    if (!dino.alive) {
      group.visible = false;
      return;
    }
    group.visible = true;

    var scale = dino.radius / 34;
    group.scale.setScalar(scale);
    var gy = world.heightAt(dino.x, dino.y);
    group.position.set(dino.x, gy, dino.y);
    group.rotation.y = -dino.angle + Math.PI / 2;

    var bite = dino.biteAnim > 0 ? dino.biteAnim / 0.18 : 0;
    if (group.userData.jaw) {
      group.userData.jaw.position.z = 4.25 + bite * 0.5;
      group.userData.jaw.rotation.x = bite * 0.35;
    }
    if (group.userData.head) {
      group.userData.head.rotation.x = -bite * 0.12;
    }

    var moving = Math.hypot(dino.vx, dino.vy) > 15;
    if (group.userData.legs && moving) {
      var t = Date.now() * 0.009;
      for (var i = 0; i < group.userData.legs.length; i++) {
        var swing = Math.sin(t + (i % 2) * Math.PI) * 0.35;
        group.userData.legs[i].upper.rotation.x = swing;
        group.userData.legs[i].lower.rotation.x = -swing * 0.6;
      }
    }

    if (group.userData.tail) {
      var w = Date.now() * 0.005;
      for (var j = 0; j < group.userData.tail.length; j++) {
        group.userData.tail[j].rotation.y = Math.sin(w + j * 0.6) * 0.08;
      }
    }
  };

  Renderer3D.prototype.syncParticles = function (particles, world) {
    while (this.particleMeshes.length > particles.length) {
      this.scene.remove(this.particleMeshes.pop());
    }
    while (this.particleMeshes.length < particles.length) {
      var m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
      );
      this.scene.add(m);
      this.particleMeshes.push(m);
    }
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var m = this.particleMeshes[i];
      var gy = world.heightAt(p.x, p.y);
      m.position.set(p.x, gy + 6 + p.size * 3, p.y);
      m.scale.setScalar(p.size * p.life * 3);
      m.material.color.set(p.color);
      m.material.opacity = p.life;
      m.visible = p.life > 0;
    }
  };

  Renderer3D.prototype.updateCamera = function (player, dt) {
    if (!player) return;

    var ground = this.world.heightAt(player.x, player.y);
    var eyeHeight = player.radius * 0.55 + 16;
    var idealX = player.x;
    var idealY = ground + eyeHeight;
    var idealZ = player.y;

    var lerp = 1 - Math.pow(0.0008, dt);
    this.camera.position.x += (idealX - this.camera.position.x) * lerp;
    this.camera.position.y += (idealY - this.camera.position.y) * lerp;
    this.camera.position.z += (idealZ - this.camera.position.z) * lerp;

    var lookDist = 140;
    var lookX = player.x + Math.cos(player.angle) * lookDist;
    var lookY = ground + eyeHeight * 0.95;
    var lookZ = player.y + Math.sin(player.angle) * lookDist;
    this.camera.lookAt(lookX, lookY, lookZ);

    this.world.update(player.x, player.y);

    if (this.sun) {
      this.sun.position.set(player.x + 350, 650, player.y + 120);
      this.sun.target.position.set(player.x, 0, player.y);
      this.sun.target.updateMatrixWorld();
    }
  };

  Renderer3D.prototype.resize = function (width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  Renderer3D.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
  };

  Renderer3D.prototype.clearDinos = function () {
    this.meshes.forEach(function (g) { this.scene.remove(g); }, this);
    this.meshes.clear();
  };

  global.Renderer3D = Renderer3D;
})(window);
