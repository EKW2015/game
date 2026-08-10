/**
 * Three.js 3D 渲染：场景、相机、恐龙模型、粒子。
 */
(function (global) {
  'use strict';

  var U = global.Utils;

  function Renderer3D(canvas, arena) {
    this.arena = arena;
    this.meshes = new Map();
    this.particleMeshes = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b8e8);
    this.scene.fog = new THREE.Fog(0x87b8e8, 400, 1400);

    this.camera = new THREE.PerspectiveCamera(55, arena.w / arena.h, 1, 3000);
    this.camera.position.set(arena.w * 0.5, 420, arena.h * 0.5 + 380);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    this.setupGround();
    this.setupDecor();
  }

  Renderer3D.prototype.setupLights = function () {
    var ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    var sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
    sun.position.set(300, 600, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 100;
    sun.shadow.camera.far = 1600;
    sun.shadow.camera.left = -600;
    sun.shadow.camera.right = 600;
    sun.shadow.camera.top = 600;
    sun.shadow.camera.bottom = -600;
    this.scene.add(sun);

    var fill = new THREE.DirectionalLight(0x9ec8ff, 0.35);
    fill.position.set(-200, 300, -300);
    this.scene.add(fill);
  };

  Renderer3D.prototype.setupGround = function () {
    var w = this.arena.w;
    var h = this.arena.h;

    var groundGeo = new THREE.PlaneGeometry(w + 40, h + 40, 32, 24);
    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d7a4a,
      roughness: 0.92,
      metalness: 0.02
    });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w * 0.5, 0, h * 0.5);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 边界墙（低围栏）
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x2a5235, roughness: 1 });
    var wallH = 18;
    var wallT = 8;
    this.addWall(w * 0.5, wallH * 0.5, -wallT * 0.5, w + 40, wallH, wallT, wallMat);
    this.addWall(w * 0.5, wallH * 0.5, h + wallT * 0.5, w + 40, wallH, wallT, wallMat);
    this.addWall(-wallT * 0.5, wallH * 0.5, h * 0.5, wallT, wallH, h + 40, wallMat);
    this.addWall(w + wallT * 0.5, wallH * 0.5, h * 0.5, wallT, wallH, h + 40, wallMat);
  };

  Renderer3D.prototype.addWall = function (x, y, z, w, h, d, mat) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  };

  Renderer3D.prototype.setupDecor = function () {
    var w = this.arena.w;
    var h = this.arena.h;
    var treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a3d });
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d1a });

    for (var i = 0; i < 16; i++) {
      var tx = U.rand(40, w - 40);
      var tz = U.rand(40, h - 40);
      if (Math.hypot(tx - w * 0.5, tz - h * 0.5) < 100) continue;

      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 14, 6), trunkMat);
      trunk.position.set(tx, 7, tz);
      trunk.castShadow = true;
      this.scene.add(trunk);

      var crown = new THREE.Mesh(new THREE.ConeGeometry(U.rand(10, 16), U.rand(18, 26), 7), treeMat);
      crown.position.set(tx, 22, tz);
      crown.castShadow = true;
      this.scene.add(crown);
    }

    var rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.95 });
    for (var j = 0; j < 10; j++) {
      var rx = U.rand(30, w - 30);
      var rz = U.rand(30, h - 30);
      var rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(U.rand(6, 12), 0),
        rockMat
      );
      rock.position.set(rx, 4, rz);
      rock.rotation.set(U.rand(0, 1), U.rand(0, 3), U.rand(0, 1));
      rock.castShadow = true;
      this.scene.add(rock);
    }
  };

  Renderer3D.prototype.hexColor = function (hex) {
    return parseInt(hex.replace('#', ''), 16);
  };

  Renderer3D.prototype.createDinoMesh = function (dino) {
    var group = new THREE.Group();
    var c = dino.colors();
    var bodyColor = this.hexColor(c.body);
    var bellyColor = this.hexColor(c.belly);

    var bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.65,
      metalness: 0.05
    });
    var bellyMat = new THREE.MeshStandardMaterial({
      color: bellyColor,
      roughness: 0.7
    });

    // 身体
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1.6, 4, 10), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    group.add(body);
    group.userData.body = body;

    // 肚子
    var belly = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), bellyMat);
    belly.position.set(0, -0.35, 0);
    belly.scale.set(1.1, 0.5, 0.9);
    belly.castShadow = true;
    group.add(belly);

    // 头
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), bodyMat);
    head.position.set(1.35, 0.15, 0);
    head.castShadow = true;
    group.add(head);
    group.userData.head = head;

    // 嘴
    var jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.18, 0.35),
      new THREE.MeshStandardMaterial({ color: this.hexColor(c.eye) })
    );
    jaw.position.set(1.75, 0, 0);
    group.add(jaw);
    group.userData.jaw = jaw;

    // 眼睛
    var eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    eyeWhite.position.set(1.5, 0.28, 0.22);
    group.add(eyeWhite);
    var eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color: this.hexColor(c.eye) })
    );
    eye.position.set(1.55, 0.28, 0.28);
    group.add(eye);

    // 尾巴
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), bodyMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-1.3, 0.1, 0);
    tail.castShadow = true;
    group.add(tail);

    // 四条腿
    var legGeo = new THREE.BoxGeometry(0.28, 0.55, 0.28);
    var legs = [
      [0.45, -0.55, 0.45],
      [0.45, -0.55, -0.45],
      [-0.35, -0.55, 0.4],
      [-0.35, -0.55, -0.4]
    ];
    group.userData.legs = [];
    for (var i = 0; i < legs.length; i++) {
      var leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(legs[i][0], legs[i][1], legs[i][2]);
      leg.castShadow = true;
      group.add(leg);
      group.userData.legs.push(leg);
    }

    // 玩家光环
    if (dino.isPlayer) {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.35, 24),
        new THREE.MeshBasicMaterial({ color: 0x5cd65c, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);
      group.userData.ring = ring;
    }

    // 血条（精灵 billboard）
    var hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
    );
    hpBg.position.y = 2.2;
    group.add(hpBg);
    group.userData.hpBg = hpBg;

    var hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.22),
      new THREE.MeshBasicMaterial({
        color: dino.isPlayer ? 0x5cd65c : 0xe06060,
        transparent: true,
        opacity: 0.9
      })
    );
    hpFill.position.set(0, 2.2, 0.01);
    group.add(hpFill);
    group.userData.hpFill = hpFill;

    this.scene.add(group);
    this.meshes.set(dino.id, group);
    return group;
  };

  Renderer3D.prototype.updateDinoMesh = function (dino) {
    var group = this.meshes.get(dino.id);
    if (!group) {
      group = this.createDinoMesh(dino);
    }

    if (!dino.alive) {
      group.visible = false;
      return;
    }
    group.visible = true;

    var scale = dino.radius / 14;
    group.scale.setScalar(scale);
    group.position.set(dino.x, 0, dino.y);
    group.rotation.y = -dino.angle + Math.PI / 2;

    // 撕咬动画
    var bite = dino.biteAnim > 0 ? dino.biteAnim / 0.18 : 0;
    if (group.userData.jaw) {
      group.userData.jaw.position.x = 1.75 + bite * 0.35;
    }
    if (group.userData.head) {
      group.userData.head.position.x = 1.35 + bite * 0.15;
    }

    // 跑步摆腿
    if (group.userData.legs && Math.hypot(dino.vx, dino.vy) > 20) {
      var t = Date.now() * 0.012;
      group.userData.legs[0].position.y = -0.55 + Math.sin(t) * 0.12;
      group.userData.legs[1].position.y = -0.55 + Math.sin(t + Math.PI) * 0.12;
      group.userData.legs[2].position.y = -0.55 + Math.sin(t + Math.PI) * 0.12;
      group.userData.legs[3].position.y = -0.55 + Math.sin(t) * 0.12;
    }

    // 血条
    var showHp = dino.isPlayer || dino.hp < dino.maxHp;
    group.userData.hpBg.visible = showHp;
    group.userData.hpFill.visible = showHp;
    if (showHp) {
      var ratio = dino.hp / dino.maxHp;
      group.userData.hpFill.scale.x = Math.max(0.01, ratio);
      group.userData.hpFill.position.x = -(1 - ratio) * 1.1 * scale;
      group.userData.hpBg.lookAt(this.camera.position);
      group.userData.hpFill.lookAt(this.camera.position);
    }
  };

  Renderer3D.prototype.removeDinoMesh = function (dinoId) {
    var group = this.meshes.get(dinoId);
    if (group) {
      this.scene.remove(group);
      this.meshes.delete(dinoId);
    }
  };

  Renderer3D.prototype.syncParticles = function (particles) {
    while (this.particleMeshes.length > particles.length) {
      var extra = this.particleMeshes.pop();
      this.scene.remove(extra);
    }
    while (this.particleMeshes.length < particles.length) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      this.scene.add(mesh);
      this.particleMeshes.push(mesh);
    }
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var m = this.particleMeshes[i];
      m.position.set(p.x, 8 + p.size * 2, p.y);
      m.scale.setScalar(p.size * p.life * 2);
      m.material.color.set(p.color);
      m.material.opacity = p.life;
      m.material.transparent = true;
      m.visible = p.life > 0;
    }
  };

  Renderer3D.prototype.updateCamera = function (player, dt) {
    if (!player || !player.alive) return;

    var targetX = player.x;
    var targetZ = player.y;
    var dist = 280 + player.radius * 1.2;
    var height = 220 + player.radius * 0.8;

    var idealX = targetX - Math.sin(player.angle) * dist * 0.3;
    var idealZ = targetZ - Math.cos(player.angle) * dist;
    var idealY = height;

    var lerp = 1 - Math.pow(0.001, dt);
    this.camera.position.x += (idealX - this.camera.position.x) * lerp;
    this.camera.position.y += (idealY - this.camera.position.y) * lerp;
    this.camera.position.z += (idealZ - this.camera.position.z) * lerp;

    this.camera.lookAt(targetX, player.radius * 0.3 + 8, targetZ);
  };

  Renderer3D.prototype.resize = function (width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  Renderer3D.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
  };

  global.Renderer3D = Renderer3D;
})(window);
