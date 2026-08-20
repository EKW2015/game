/**
 * 夜城飙车 - 渲染层：相机、灯光、检查点光门、漂移烟雾与胎痕
 */
(function (global) {
  'use strict';

  var RU = global.RU;
  var City3D = global.City3D;
  var CarModel = global.CarModel;

  var FOG_COLOR = 0x180f28;
  var GATE_COLOR = 0x28e6ff;
  var MAX_SPRITES = 160;
  var MAX_MARKS = 220;

  function softTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  /** 细长的胎痕贴图：两侧柔和、中间实心 */
  function streakTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var grd = ctx.createLinearGradient(0, 0, 32, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.95)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 32, 64);
    var fade = ctx.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, 'rgba(0,0,0,0.5)');
    fade.addColorStop(0.25, 'rgba(0,0,0,0)');
    fade.addColorStop(0.75, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 32, 64);
    return new THREE.CanvasTexture(canvas);
  }

  function RaceRenderer(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    if (!this.renderer.getContext()) throw new Error('WebGL 不可用');
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    if ('useLegacyLights' in this.renderer) this.renderer.useLegacyLights = true;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(FOG_COLOR, 70, 640);

    this.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.4, 4000);
    this.camera.position.set(0, 5, -12);
    this.camMode = 'chase';
    this.camYaw = 0;
    this.camPos = new THREE.Vector3(0, 5, -12);
    this.lookAt = new THREE.Vector3();
    this.fov = 70;

    this.setupLights();
    this.city = new City3D(this.scene, this.renderer);
    this.setupCar();
    this.setupGate();
    this.setupFx();
    this.trafficMeshes = [];
  }

  RaceRenderer.prototype.setupLights = function () {
    this.scene.add(new THREE.AmbientLight(0x2b3350, 0.85));
    this.scene.add(new THREE.HemisphereLight(0x3a2d5a, 0x0b0b12, 0.75));
    var moon = new THREE.DirectionalLight(0x6f86c8, 0.5);
    moon.position.set(-180, 320, 120);
    this.scene.add(moon);
    this.moon = moon;
  };

  RaceRenderer.prototype.setupCar = function () {
    this.carMesh = CarModel.create({ color: 0xe01b4c, accent: 0x2ee6ff, player: true });
    this.scene.add(this.carMesh);

    // 大灯：两束不投影的聚光灯 + 可见光锥
    this.headlights = [];
    for (var s = -1; s <= 1; s += 2) {
      var light = new THREE.SpotLight(0xfff0d0, 2.6, 110, 0.52, 0.65, 1);
      light.position.set(s * 0.6, 0.72, 2.2);
      var target = new THREE.Object3D();
      target.position.set(s * 1.6, -1.2, 40);
      this.carMesh.add(target);
      light.target = target;
      this.carMesh.add(light);
      this.headlights.push(light);

      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(3.4, 26, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfff2d6, transparent: true, opacity: 0.03,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
        })
      );
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(s * 0.6, 0.62, 15);
      this.carMesh.add(cone);
    }

    // 跟随车身的补光，否则夜里车只剩一个黑影
    var fill = new THREE.PointLight(0xbcd0ff, 1.1, 16, 1.4);
    fill.position.set(0, 3.4, -0.6);
    this.carMesh.add(fill);
  };

  RaceRenderer.prototype.setupGate = function () {
    var group = new THREE.Group();

    var ringGeo = new THREE.TorusGeometry(14, 0.85, 6, 44);
    ringGeo.rotateX(-Math.PI / 2);
    this.gateRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: GATE_COLOR, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    group.add(this.gateRing);

    // 冲天光柱：楼再高也挡不住，玩家一眼就知道往哪开
    this.gateBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 5.5, 600, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: GATE_COLOR, transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
      })
    );
    this.gateBeacon.position.y = 300;
    group.add(this.gateBeacon);

    var pillarMat = new THREE.MeshBasicMaterial({
      color: GATE_COLOR, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    this.gatePillars = [];
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 60, 8, 1, true), pillarMat);
      pillar.position.set(Math.cos(a) * 13, 30, Math.sin(a) * 13);
      group.add(pillar);
      this.gatePillars.push(pillar);
    }

    this.gateCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false })
    );
    this.gateCore.position.y = 7;
    group.add(this.gateCore);

    var glow = new THREE.Mesh(
      new THREE.CircleGeometry(15, 40),
      new THREE.MeshBasicMaterial({
        color: GATE_COLOR, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    group.add(glow);

    this.gateGroup = group;
    this.scene.add(group);
  };

  RaceRenderer.prototype.setupFx = function () {
    var tex = softTexture();
    this.sprites = [];
    for (var i = 0; i < MAX_SPRITES; i++) {
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.NormalBlending
      }));
      sprite.visible = false;
      this.scene.add(sprite);
      this.sprites.push(sprite);
    }

    var markGeo = new THREE.PlaneGeometry(0.62, 2.2);
    markGeo.rotateX(-Math.PI / 2);
    var markTex = streakTexture();
    this.marks = [];
    for (var m = 0; m < MAX_MARKS; m++) {
      var mark = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({
        map: markTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false
      }));
      mark.rotation.order = 'YXZ';
      mark.position.y = 0.03;
      mark.visible = false;
      this.scene.add(mark);
      this.marks.push(mark);
    }
  };

  RaceRenderer.prototype.updateCar = function (car, dt) {
    var mesh = this.carMesh;
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = Math.PI / 2 - car.yaw;

    // 车身随加速与漂移轻微侧倾
    var roll = RU.clamp(-car.lateralSpeed / 30, -0.5, 0.5) * 0.18;
    var pitch = RU.clamp(car.forwardSpeed / 60, -1, 1) * 0.02;
    mesh.rotation.z = RU.damp(mesh.rotation.z, roll, 6, dt);
    mesh.rotation.x = RU.damp(mesh.rotation.x, pitch, 5, dt);

    var wheels = mesh.userData.wheels;
    for (var i = 0; i < wheels.length; i++) {
      var holder = wheels[i];
      if (holder.userData.front) holder.rotation.y = car.steerAngle;
      holder.userData.wheel.rotation.x = -car.wheelSpin;
    }

    var tail = mesh.userData.tailMat;
    if (tail) tail.emissiveIntensity = car.brake > 0 ? 3.4 : 1.1;

    var glow = mesh.userData.underglow;
    if (glow) glow.material.opacity = 0.26 + (car.drifting ? 0.22 : 0) + car.nitro * 0.12;

    var flames = mesh.userData.flames;
    if (flames) {
      for (var f = 0; f < flames.length; f++) {
        flames[f].visible = car.boosting;
        if (car.boosting) {
          flames[f].scale.set(1, 0.7 + Math.random() * 0.6, 1);
          flames[f].material.opacity = 0.6 + Math.random() * 0.4;
        }
      }
    }
  };

  RaceRenderer.prototype.syncTraffic = function (cars, dt) {
    while (this.trafficMeshes.length < cars.length) {
      var mesh = CarModel.create({ color: 0x555a66, accent: 0xff6644 });
      this.scene.add(mesh);
      this.trafficMeshes.push(mesh);
    }
    for (var i = 0; i < this.trafficMeshes.length; i++) {
      var m = this.trafficMeshes[i];
      var c = cars[i];
      if (!c) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(c.x, 0, c.z);
      m.rotation.y = Math.PI / 2 - c.yaw;
      // 每辆车模型自带独立材质，复用时只要改颜色
      if (m.userData.paintedColor !== c.color) {
        m.userData.bodyMat.color.setHex(c.color);
        m.userData.paintedColor = c.color;
      }
      var wheels = m.userData.wheels;
      for (var w = 0; w < wheels.length; w++) {
        wheels[w].userData.wheel.rotation.x -= (c.speed / 0.37) * dt;
      }
    }
  };

  RaceRenderer.prototype.updateGate = function (gate, time) {
    if (!gate) { this.gateGroup.visible = false; return; }
    this.gateGroup.visible = true;
    this.gateGroup.position.set(gate.x, 0, gate.z);
    this.gateRing.rotation.y = time * 0.6;
    this.gateCore.rotation.y = time * 1.6;
    this.gateCore.rotation.x = time * 1.1;
    this.gateCore.position.y = 7 + Math.sin(time * 2) * 0.8;
    var pulse = 0.16 + Math.sin(time * 3) * 0.05;
    this.gatePillars[0].material.opacity = pulse;
    this.gateBeacon.material.opacity = 0.12 + Math.sin(time * 2.2) * 0.035;
    this.gateBeacon.rotation.y = time * 0.25;
  };

  RaceRenderer.prototype.syncParticles = function (particles) {
    for (var i = 0; i < this.sprites.length; i++) {
      var s = this.sprites[i];
      var p = particles[i];
      if (!p) { s.visible = false; continue; }
      s.visible = true;
      s.position.set(p.x, p.y + (1 - p.life) * 1.4, p.z);
      var scale = p.size * (1.6 - p.life * 0.7) * 2.2;
      s.scale.set(scale, scale, 1);
      s.material.color.setHex(p.color);
      s.material.opacity = Math.max(0, p.life * 0.55);
    }
  };

  RaceRenderer.prototype.syncMarks = function (marks) {
    for (var i = 0; i < this.marks.length; i++) {
      var m = this.marks[i];
      var d = marks[i];
      if (!d) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(d.x, 0.03, d.z);
      m.rotation.y = Math.PI / 2 - d.yaw;
      m.material.opacity = Math.max(0, Math.min(1, d.life * 1.1) * 0.92 * d.strength);
    }
  };

  RaceRenderer.prototype.setCamMode = function (mode) {
    this.camMode = mode;
  };

  RaceRenderer.prototype.updateCamera = function (car, dt, shake) {
    var speedT = RU.clamp(car.speed / 60, 0, 1);

    if (this.camMode === 'hood') {
      var fx = Math.cos(car.yaw);
      var fz = Math.sin(car.yaw);
      this.camPos.set(car.x + fx * 0.35, 1.28, car.z + fz * 0.35);
      this.camera.position.copy(this.camPos);
      this.lookAt.set(car.x + fx * 40, 1.3, car.z + fz * 40);
      this.fov = RU.damp(this.fov, 74 + speedT * 14, 3, dt);
    } else {
      // 相机追着车头，但漂移时稍微偏向车身侧面，能看到甩尾
      var driftLean = RU.clamp(car.lateralSpeed / 26, -1, 1) * 0.35;
      var targetYaw = car.yaw - driftLean;
      this.camYaw += RU.wrapAngle(targetYaw - this.camYaw) * (1 - Math.exp(-4.2 * dt));

      var dist = 9.5 + speedT * 3.2;
      var height = 4.1 + speedT * 0.7;
      var idealX = car.x - Math.cos(this.camYaw) * dist;
      var idealZ = car.z - Math.sin(this.camYaw) * dist;
      var rate = 1 - Math.exp(-9 * dt);
      this.camPos.x += (idealX - this.camPos.x) * rate;
      this.camPos.z += (idealZ - this.camPos.z) * rate;
      this.camPos.y += (height - this.camPos.y) * rate;
      this.camera.position.copy(this.camPos);
      this.lookAt.set(
        car.x + Math.cos(car.yaw) * 9,
        1.7,
        car.z + Math.sin(car.yaw) * 9
      );
      this.fov = RU.damp(this.fov, 68 + speedT * 16 + (car.boosting ? 6 : 0), 3.5, dt);
    }

    var amp = shake * 0.55 + (car.offRoad ? speedT * 0.16 : 0) + (car.boosting ? 0.05 : 0);
    if (amp > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * amp;
      this.camera.position.y += (Math.random() - 0.5) * amp;
      this.camera.position.z += (Math.random() - 0.5) * amp;
    }

    this.camera.lookAt(this.lookAt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    if (this.moon) {
      this.moon.position.set(car.x - 180, 320, car.z + 120);
    }
    this.city.update(car.x, car.z);
  };

  RaceRenderer.prototype.resize = function (width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  RaceRenderer.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
  };

  global.RaceRenderer = RaceRenderer;
})(window);
