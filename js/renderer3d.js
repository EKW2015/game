/**
 * 斗罗大陆：3D光明圣龙与魂师/魂兽世界渲染引擎
 */
(function (global) {
  'use strict';

  var DinoModel = global.DinoModel;
  var World = global.World;

  function createWebGLRenderer(canvas) {
    var attempts = [
      { canvas: canvas, antialias: true, failIfMajorPerformanceCaveat: false, powerPreference: 'high-performance' },
      { canvas: canvas, antialias: false, failIfMajorPerformanceCaveat: false },
      { canvas: canvas, antialias: false, alpha: false, depth: true }
    ];
    var lastErr = 'WebGL 不可用';
    for (var i = 0; i < attempts.length; i++) {
      try {
        var renderer = new THREE.WebGLRenderer(attempts[i]);
        if (renderer.getContext()) return renderer;
        lastErr = 'WebGL 上下文为空';
      } catch (err) {
        lastErr = err && err.message ? err.message : String(err);
      }
    }
    throw new Error(lastErr);
  }

  function Renderer3D(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.meshes = new Map();
    this.particleMeshes = [];
    this.vfxMeshes = []; // 技能投射物与视觉特效网格

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38556b);
    this.scene.fog = new THREE.Fog(0x4a6a80, 250, 2800);

    // 第三人称/自由动作相机视角
    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 2, 6000);
    this.camera.position.set(0, 50, -60);

    this.renderer = createWebGLRenderer(canvas);
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    try {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      this.renderer.shadowMap.enabled = false;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLights();
    this.world = new World(this.scene);
  }

  Renderer3D.prototype.setupLights = function () {
    // 环境天光与地光
    this.ambientLight = new THREE.AmbientLight(0xfff5e0, 0.55);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffeedd, 0x223322, 0.6);
    this.scene.add(this.hemiLight);

    // 太阳神光（圣龙金色主光）
    var sun = new THREE.DirectionalLight(0xffe599, 1.45);
    sun.position.set(300, 600, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far = 1800;
    var s = 800;
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

  Renderer3D.prototype.bindFormAnim = function (group, form) {
    if (!form) {
      group.userData.legs = null;
      group.userData.wings = null;
      group.userData.tail = null;
      group.userData.jaw = null;
      group.userData.goldenShield = null;
      group.userData.streamers = null;
      return;
    }
    group.userData.legs = form.userData.legs;
    group.userData.wings = form.userData.wings;
    group.userData.tail = form.userData.tail;
    group.userData.jaw = form.userData.jaw;
    group.userData.goldenShield = form.userData.goldenShield;
    group.userData.streamers = form.userData.streamers;
  };

  Renderer3D.prototype.createEntityMesh = function (entity) {
    var kind = entity.fighterKind || (entity.isPlayer ? 'dragon' : 'tiger');
    var group = new THREE.Group();
    if (kind === 'tiger' || kind === 'bear' || kind === 'ape') {
      var wild = DinoModel.createSoulBeastMesh(kind);
      group.add(wild);
      group.userData.humanForm = null;
      group.userData.trueForm = wild;
      this.bindFormAnim(group, wild);
    } else {
      var human = DinoModel.createSoulMasterMesh(kind, { uniform: entity.uniform });
      var beast = DinoModel.createTrueFormMesh(kind);
      human.name = 'humanForm';
      beast.name = 'trueForm';
      beast.visible = false;
      group.add(human);
      group.add(beast);
      group.userData.humanForm = human;
      group.userData.trueForm = beast;
      this.bindFormAnim(group, human);
    }
    var rings = DinoModel.createSoulRingsGroup();
    rings.scale.setScalar(0.48);
    group.add(rings);
    group.userData.rings = rings;
    this.scene.add(group);
    this.meshes.set(entity.id, group);
    return group;
  };

  Renderer3D.prototype.updateEntityMesh = function (entity, world, dt) {
    var group = this.meshes.get(entity.id) || this.createEntityMesh(entity);
    if (!entity.alive) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // 默认魂师人形；只有武魂真身才切换魂兽模型并放大
    if (group.userData.humanForm && group.userData.trueForm) {
      var av = !!entity.avatarMode;
      group.userData.humanForm.visible = !av;
      group.userData.trueForm.visible = av;
      this.bindFormAnim(group, av ? group.userData.trueForm : group.userData.humanForm);
      if (group.userData.rings) {
        group.userData.rings.scale.setScalar(av ? 1.05 : 0.48);
      }
    }

    var baseScale = 1.35;
    if (entity.avatarMode) baseScale = entity.isPlayer ? 3.2 : 2.35;
    group.scale.setScalar(baseScale);

    var gy = world.heightAt(entity.x, entity.y);
    var targetY = gy;
    if (entity.isPlayer && entity.isFlying) {
      targetY += 28 + Math.sin(Date.now() * 0.003) * 4; // 圣龙之翼飞行浮空
    }
    group.position.set(entity.x, targetY, entity.y);
    group.rotation.y = -entity.angle + Math.PI / 2;

    // 金身护盾显隐
    if (group.userData.goldenShield) {
      group.userData.goldenShield.visible = !!entity.goldBodyActive;
      if (entity.goldBodyActive) {
        group.userData.goldenShield.rotation.y += dt * 3.0;
      }
    }

    // 魂环律动与升降旋转
    if (group.userData.rings) {
      var rings = group.userData.rings.children;
      var time = Date.now() * 0.002;
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        ring.rotation.z += dt * (ring.userData.speed || 1.0);
        ring.position.y = (ring.userData.baseY || 0.5) + Math.sin(time * (ring.userData.pulseSpeed || 1.5) + r) * 0.35;
        // 真身开启时所有魂环辉映暴闪
        if (entity.avatarMode) {
          ring.material.emissiveIntensity = 1.2 + Math.sin(time * 5) * 0.3;
        }
      }
    }

    // 龙翼振动动画
    if (group.userData.wings && group.userData.wings.userData && group.userData.wings.userData.leftWing) {
      var wings = group.userData.wings.userData;
      var wingFreq = entity.isFlying ? 12 : 3;
      var wingSwing = Math.sin(Date.now() * 0.001 * wingFreq) * (entity.isFlying ? 0.45 : 0.15);
      wings.leftWing.rotation.y = wingSwing;
      if (wings.rightWing) wings.rightWing.rotation.y = -wingSwing;
    }

    // 龙尾优雅摆动
    if (group.userData.tail) {
      var w = Date.now() * 0.004;
      for (var j = 0; j < group.userData.tail.length; j++) {
        group.userData.tail[j].rotation.y = Math.sin(w + j * 0.6) * 0.12;
      }
    }

    // 腿部奔跑/行走动画
    var moving = Math.hypot(entity.vx, entity.vy) > 15;
    if (group.userData.legs && moving && !entity.isFlying) {
      var lt = Date.now() * 0.012;
      for (var k = 0; k < group.userData.legs.length; k++) {
        var swing = Math.sin(lt + (k % 2) * Math.PI) * 0.4;
        group.userData.legs[k].upper.rotation.x = swing;
      }
    }

    // 下颚撕咬/吐息动画
    var bite = entity.biteAnim > 0 ? entity.biteAnim / 0.18 : 0;
    if (group.userData.jaw) {
      group.userData.jaw.rotation.x = bite * 0.4;
    }

    if (group.userData.streamers && group.userData.streamers.length) {
      var stt = Date.now() * 0.004;
      for (var s = 0; s < group.userData.streamers.length; s++) {
        group.userData.streamers[s].rotation.y = stt + s * 0.7;
        group.userData.streamers[s].position.y = 0.52 + Math.sin(stt * 2 + s) * 0.08;
      }
    }
  };

  // 技能法术弹道与特殊视觉对象同步（审判巨剑、太阳神光激光柱、御剑术飞剑、护盾、龙针等）
  Renderer3D.prototype.syncSkillProjectiles = function (projectiles) {
    while (this.vfxMeshes.length > projectiles.length) {
      var oldVfx = this.vfxMeshes.pop();
      this.scene.remove(oldVfx);
    }

    while (this.vfxMeshes.length < projectiles.length) {
      var projGroup = new THREE.Group();
      this.scene.add(projGroup);
      this.vfxMeshes.push(projGroup);
    }

    for (var i = 0; i < projectiles.length; i++) {
      var p = projectiles[i];
      var group = this.vfxMeshes[i];

      // 重建几何体（如果类型改变）
      if (group.userData.type !== p.type) {
        while (group.children.length > 0) {
          group.remove(group.children[0]);
        }
        group.userData.type = p.type;

        if (p.type === 'sword') {
          // 御剑术飞剑
          var blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 4.0),
            new THREE.MeshStandardMaterial({
              color: 0xffea00,
              emissive: 0xffbf00,
              emissiveIntensity: 0.8,
              metalness: 0.9,
              roughness: 0.2
            })
          );
          group.add(blade);
        } else if (p.type === 'judgment') {
          // 光耀审判天降巨剑
          var bigSword = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.6, 18.0),
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0xffea00,
              emissiveIntensity: 1.2,
              metalness: 0.95
            })
          );
          bigSword.rotation.x = Math.PI / 2; // 垂直向下插击
          group.add(bigSword);

          // 巨剑光环
          var halo = new THREE.Mesh(
            new THREE.TorusGeometry(5, 0.3, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0xffe600 })
          );
          halo.rotation.x = Math.PI / 2;
          group.add(halo);
        } else if (p.type === 'laser') {
          // 追踪太阳神光：粗大金色激光柱
          var beam = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2, 1.2, 16.0, 12),
            new THREE.MeshBasicMaterial({ color: 0xfffa80, transparent: true, opacity: 0.9 })
          );
          beam.rotation.x = Math.PI / 2;
          group.add(beam);
        } else if (p.type === 'needle') {
          // 光明龙针
          var needle = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 2.5, 4),
            new THREE.MeshBasicMaterial({ color: 0xfffa90 })
          );
          needle.rotation.x = Math.PI / 2;
          group.add(needle);
        } else if (p.type === 'clawBlade') {
          // 圣龙裂空爪 / 虚空爪光刃
          var arcBlade = new THREE.Mesh(
            new THREE.TorusGeometry(3.2, 0.4, 6, 16, Math.PI * 0.8),
            new THREE.MeshBasicMaterial({ color: 0xffea00 })
          );
          arcBlade.rotation.x = Math.PI / 2;
          group.add(arcBlade);
        } else if (p.type === 'lightShield') {
          // 自创四：光盾守护
          var shield = new THREE.Mesh(
            new THREE.CylinderGeometry(5.0, 5.0, 0.4, 24),
            new THREE.MeshStandardMaterial({
              color: 0xffd700,
              emissive: 0xffaa00,
              emissiveIntensity: 0.9,
              transparent: true,
              opacity: 0.65,
              wireframe: true
            })
          );
          shield.rotation.x = Math.PI / 2;
          group.add(shield);
        } else if (p.type === 'cloneSlash') {
          var cloneCol = p.tint === 'shadow' ? 0x221133 : 0xffe066;
          var cloneEm = p.tint === 'shadow' ? 0x442266 : 0xffaa00;
          var cloneBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.34, 1.6, 6),
            new THREE.MeshStandardMaterial({
              color: cloneCol,
              emissive: cloneEm,
              emissiveIntensity: 0.85,
              transparent: true,
              opacity: 0.82
            })
          );
          group.add(cloneBody);
          var cloneBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 1.8),
            new THREE.MeshBasicMaterial({ color: cloneCol })
          );
          cloneBlade.position.z = 0.9;
          group.add(cloneBlade);
        } else if (p.type === 'sunPhoenix') {
          var fireM = new THREE.MeshStandardMaterial({
            color: 0xff6622,
            emissive: 0xffaa00,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.9
          });
          var phoenixBody = new THREE.Mesh(new THREE.SphereGeometry(4.2, 10, 8), fireM);
          phoenixBody.scale.set(1, 0.7, 1.6);
          group.add(phoenixBody);
          var pWingL = new THREE.Mesh(new THREE.ConeGeometry(2.4, 12, 6), fireM);
          pWingL.rotation.z = 1.1;
          pWingL.position.set(-6, 0, 0);
          group.add(pWingL);
          var pWingR = pWingL.clone();
          pWingR.rotation.z = -1.1;
          pWingR.position.x = 6;
          group.add(pWingR);
        } else {
          // 默认光球/龙羽
          var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffe600 })
          );
          group.add(sphere);
        }
      }

      group.position.set(p.x, p.y || 12, p.z || p.yPos || 10);
      if (p.angle != null) {
        group.rotation.y = -p.angle + Math.PI / 2;
      }
      group.visible = p.life > 0;
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
      m.position.set(p.x, gy + 4 + (p.zOffset || 0) + p.size * 2, p.y);
      m.scale.setScalar(p.size * p.life * 2.5);
      m.material.color.set(p.color);
      m.material.opacity = p.life;
      m.visible = p.life > 0;
    }
  };

  // 第三人称史诗追踪跟随摄像机
  Renderer3D.prototype.updateCamera = function (player, dt) {
    if (!player) return;

    var ground = this.world.heightAt(player.x, player.y);
    var playerHeight = player.avatarMode ? 45 : 18;
    var camDistance = player.avatarMode ? 140 : 65;
    var camHeight = player.avatarMode ? 70 : 35;

    // 相机位于角色后上方
    var camBackAngle = player.angle + Math.PI;
    var idealX = player.x + Math.cos(camBackAngle) * camDistance;
    var idealZ = player.y + Math.sin(camBackAngle) * camDistance;
    var idealY = ground + camHeight;
    if (player.isFlying) {
      idealY += 25;
    }

    var lerp = 1 - Math.pow(0.0005, dt);
    this.camera.position.x += (idealX - this.camera.position.x) * lerp;
    this.camera.position.y += (idealY - this.camera.position.y) * lerp;
    this.camera.position.z += (idealZ - this.camera.position.z) * lerp;

    var lookDist = 40;
    var lookX = player.x + Math.cos(player.angle) * lookDist;
    var lookY = ground + playerHeight;
    var lookZ = player.y + Math.sin(player.angle) * lookDist;
    this.camera.lookAt(lookX, lookY, lookZ);

    this.world.update(player.x, player.y);
    this.world.updateDomainAnim(dt);

    if (this.sun) {
      this.sun.position.set(player.x + 350, 650, player.y + 150);
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

  Renderer3D.prototype.clearEntities = function () {
    this.meshes.forEach(function (g) { this.scene.remove(g); }, this);
    this.meshes.clear();
    this.vfxMeshes.forEach(function (v) { this.scene.remove(v); }, this);
    this.vfxMeshes = [];
  };

  global.Renderer3D = Renderer3D;
})(window);
