/**
 * 夜城 3D 场景：路面、霓虹护栏、摩天楼、路灯、起跑门与相机。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;
  var CarModel = global.CarModel;

  // dist = 相机在车后方多少米（负数表示车头前方）
  var CAMERA_MODES = [
    { id: 'chase', name: '第三人称', dist: 10.5, height: 3.9, fov: 74 },
    { id: 'far', name: '远景', dist: 16, height: 6.4, fov: 70 },
    { id: 'hood', name: '引擎盖', dist: -1.1, height: 1.34, fov: 78 },
    { id: 'cockpit', name: '第一人称', dist: 0.15, height: 1.22, fov: 84, hideCar: true },
    { id: 'top', name: '俯视', dist: 9, height: 24, fov: 62 }
  ];

  // ---------- 贴图（全部用 canvas 生成，保证单文件离线可玩） ----------

  function makeCanvas(w, h) {
    var c = global.document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function roadTexture(theme) {
    var c = makeCanvas(256, 512);
    var g = c.getContext('2d');
    g.fillStyle = '#1a1b21';
    g.fillRect(0, 0, 256, 512);

    for (var i = 0; i < 5000; i++) {
      var v = 20 + Math.random() * 26;
      g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 6) + ',0.6)';
      g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    }
    // 湿滑反光条
    for (var k = 0; k < 40; k++) {
      g.fillStyle = 'rgba(90,120,170,0.05)';
      g.fillRect(Math.random() * 256, Math.random() * 512, 30 + Math.random() * 60, 3);
    }
    // 边线
    g.fillStyle = 'rgba(235,240,255,0.85)';
    g.fillRect(6, 0, 5, 512);
    g.fillRect(245, 0, 5, 512);
    // 中央虚线
    g.fillStyle = 'rgba(245,240,200,0.75)';
    for (var y = 0; y < 512; y += 128) g.fillRect(125, y, 6, 76);

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  function groundTexture() {
    var c = makeCanvas(256, 256);
    var g = c.getContext('2d');
    g.fillStyle = '#07080d';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(60,90,140,0.16)';
    g.lineWidth = 1;
    for (var i = 0; i <= 256; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(90, 90);
    return tex;
  }

  /** 自由驾驶场地的水泥地：比城市地面亮，能看清车影和跳台 */
  function lotTexture() {
    var c = makeCanvas(256, 256);
    var g = c.getContext('2d');
    g.fillStyle = '#2a3040';
    g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 4000; i++) {
      var v = 38 + Math.random() * 26;
      g.fillStyle = 'rgba(' + v + ',' + (v + 4) + ',' + (v + 14) + ',0.7)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    g.strokeStyle = 'rgba(150,190,255,0.22)';
    g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,160,230,0.12)';
    g.lineWidth = 2;
    for (var k = 64; k < 256; k += 64) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(26, 26);
    return tex;
  }

  function buildingTextures() {
    var c = makeCanvas(128, 256);
    var g = c.getContext('2d');
    g.fillStyle = '#0a0c14';
    g.fillRect(0, 0, 128, 256);

    var e = makeCanvas(128, 256);
    var ge = e.getContext('2d');
    ge.fillStyle = '#000';
    ge.fillRect(0, 0, 128, 256);

    var colors = ['#ffd98a', '#9fd2ff', '#ffb0e0', '#c6ff9f', '#fff3c4'];
    for (var y = 6; y < 250; y += 12) {
      for (var x = 6; x < 122; x += 12) {
        var lit = Math.random();
        if (lit > 0.45) {
          var col = colors[(Math.random() * colors.length) | 0];
          ge.fillStyle = col;
          ge.globalAlpha = 0.35 + Math.random() * 0.65;
          ge.fillRect(x, y, 7, 7);
          ge.globalAlpha = 1;
          g.fillStyle = 'rgba(40,50,70,0.9)';
          g.fillRect(x, y, 7, 7);
        } else {
          g.fillStyle = 'rgba(18,22,34,0.9)';
          g.fillRect(x, y, 7, 7);
        }
      }
    }

    var map = new THREE.CanvasTexture(c);
    var emissive = new THREE.CanvasTexture(e);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
    return { map: map, emissive: emissive };
  }

  function signTexture(text, color) {
    var c = makeCanvas(256, 128);
    var g = c.getContext('2d');
    g.clearRect(0, 0, 256, 128);
    g.font = 'bold 74px "PingFang SC","Microsoft YaHei",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, 128, 66);
    g.fillStyle = '#ffffff';
    g.shadowBlur = 12;
    g.fillText(text, 128, 66);
    return new THREE.CanvasTexture(c);
  }

  function skyTexture(theme) {
    var c = makeCanvas(64, 256);
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#01020a');
    grad.addColorStop(0.45, '#0a0f28');
    grad.addColorStop(0.78, '#2a1450');
    grad.addColorStop(0.92, '#5a1f5e');
    grad.addColorStop(1, '#0d1030');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  }

  // ---------- 场景 ----------

  function Scene3D(canvas) {
    if (typeof THREE === 'undefined') throw new Error('Three.js 未加载');

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    if (!this.renderer.getContext()) throw new Error('WebGL 不可用');
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    // 夜景几乎全靠霓虹与自发光，实时阴影收益很小却容易在软件渲染下出问题，
    // 改用车底的假阴影（见 carmodel.js），顺便省下一遍渲染。
    this.renderer.shadowMap.enabled = false;
    if ('outputColorSpace' in this.renderer) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0c1c, 0.0016);

    this.cameras = [
      new THREE.PerspectiveCamera(74, 16 / 9, 0.5, 6000),
      new THREE.PerspectiveCamera(74, 16 / 9, 0.5, 6000)
    ];
    this.camState = [
      { mode: 0, shake: 0, fov: 74, x: 0, y: 5, z: 20 },
      { mode: 0, shake: 0, fov: 74, x: 0, y: 5, z: 20 }
    ];

    this.trackGroup = null;
    this.carEntries = [];
    this.hiddenFor = [null, null];
    this.textures = { building: buildingTextures(), ground: groundTexture() };
    this.time = 0;

    this.setupSky();
    this.setupLights();
  }

  Scene3D.CAMERA_MODES = CAMERA_MODES;

  Scene3D.prototype.setupSky = function () {
    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(4000, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    this.scene.add(sky);

    var starGeo = new THREE.BufferGeometry();
    var count = 900;
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.random() * Math.PI * 0.42;
      var r = 3000;
      pos[i * 3] = Math.cos(theta) * Math.sin(phi + 0.1) * r;
      pos[i * 3 + 1] = Math.cos(phi) * r * 0.9;
      pos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi + 0.1) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xbfd4ff, size: 12, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.85
    })));

    var moon = new THREE.Mesh(
      new THREE.CircleGeometry(150, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8f0ff, fog: false, transparent: true, opacity: 0.92 })
    );
    moon.position.set(-2200, 1300, -2000);
    moon.lookAt(0, 0, 0);
    this.scene.add(moon);
  };

  Scene3D.prototype.setupLights = function () {
    this.scene.add(new THREE.AmbientLight(0x33456e, 1.5));
    this.scene.add(new THREE.HemisphereLight(0x2a3f7a, 0x090a12, 1.1));

    var moon = new THREE.DirectionalLight(0x9db4ff, 1.25);
    moon.position.set(-600, 700, -500);
    this.scene.add(moon);
    this.scene.add(moon.target);
    this.moon = moon;

    // 玩家车头灯
    this.headlight = new THREE.SpotLight(0xdceaff, 6.5, 220, 0.62, 0.55, 0.9);
    this.scene.add(this.headlight);
    this.scene.add(this.headlight.target);
  };

  Scene3D.prototype.clearWorld = function () {
    if (this.trackGroup) {
      this.disposeGroup(this.trackGroup);
      this.scene.remove(this.trackGroup);
    }
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
  };

  Scene3D.prototype.disposeGroup = function (group) {
    group.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(function (m) { m.dispose(); });
      }
    });
  };

  // ---------- 赛道 ----------

  Scene3D.prototype.buildTrack = function (track) {
    this.clearWorld();
    var theme = track.theme;
    this.scene.fog.color.setHex(0x0a0c1c);

    this.addGround(track);
    this.addRoad(track);
    this.addRails(track, theme);
    this.addStartLine(track, theme);
    this.addCity(track);
    this.addLamps(track);
  };

  Scene3D.prototype.addGround = function (track) {
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshStandardMaterial({ map: this.textures.ground, color: 0x141824, roughness: 0.9, metalness: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    this.trackGroup.add(ground);
  };

  Scene3D.prototype.addRoad = function (track) {
    var samples = track.samples;
    var n = samples.length;
    var half = track.halfWidth;
    var shoulder = 4.5;

    var positions = [];
    var uvs = [];
    var indices = [];

    for (var i = 0; i <= n; i++) {
      var sp = samples[i % n];
      var w = half + shoulder * 0.55;
      positions.push(sp.x + sp.rx * -w, 0.02, sp.z + sp.rz * -w);
      positions.push(sp.x + sp.rx * w, 0.02, sp.z + sp.rz * w);
      var v = (i * track.step) / 14;
      uvs.push(0, v, 1, v);
    }
    for (var j = 0; j < n; j++) {
      var a = j * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    var tex = roadTexture(track.theme);
    var road = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.42, metalness: 0.45, color: 0xffffff
    }));
    this.trackGroup.add(road);
  };

  Scene3D.prototype.addRails = function (track, theme) {
    var samples = track.samples;
    var n = samples.length;
    var limit = track.halfWidth + 4.5;

    [-1, 1].forEach(function (side) {
      var color = side < 0 ? theme.rail : theme.rail2;
      var positions = [];
      var indices = [];
      for (var i = 0; i <= n; i++) {
        var sp = samples[i % n];
        var x = sp.x + sp.rx * limit * side;
        var z = sp.z + sp.rz * limit * side;
        positions.push(x, 0.05, z, x, 1.15, z);
      }
      for (var j = 0; j < n; j++) {
        var a = j * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      var geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      var wall = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
        color: 0x0d1018, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide
      }));
      this.trackGroup.add(wall);

      // 护栏顶部霓虹条
      var neonPos = [];
      var neonIdx = [];
      for (var k = 0; k <= n; k++) {
        var s2 = samples[k % n];
        var nx = s2.x + s2.rx * limit * side;
        var nz = s2.z + s2.rz * limit * side;
        neonPos.push(nx, 1.16, nz, nx, 1.45, nz);
      }
      for (var m = 0; m < n; m++) {
        var b = m * 2;
        neonIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
      var neonGeo = new THREE.BufferGeometry();
      neonGeo.setAttribute('position', new THREE.Float32BufferAttribute(neonPos, 3));
      neonGeo.setIndex(neonIdx);
      var neon = new THREE.Mesh(neonGeo, new THREE.MeshBasicMaterial({
        color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      this.trackGroup.add(neon);
    }, this);
  };

  Scene3D.prototype.addStartLine = function (track, theme) {
    var sp = track.sampleAt(0);
    var half = track.halfWidth;

    var c = makeCanvas(128, 32);
    var g = c.getContext('2d');
    for (var y = 0; y < 32; y += 8) {
      for (var x = 0; x < 128; x += 8) {
        g.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#f2f5ff' : '#0b0c12';
        g.fillRect(x, y, 8, 8);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    var line = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2, 5),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0x222222, emissiveIntensity: 0.4 })
    );
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = -sp.heading;
    line.position.set(sp.x, 0.05, sp.z);
    this.trackGroup.add(line);

    // 起跑门
    var gantry = new THREE.Group();
    var pillarMat = new THREE.MeshStandardMaterial({ color: 0x11141d, roughness: 0.5, metalness: 0.7 });
    var neonMat = new THREE.MeshBasicMaterial({ color: theme.rail, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    var span = half + 6;
    [-1, 1].forEach(function (side) {
      var pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 11, 1.2), pillarMat);
      pillar.position.set(0, 5.5, side * span);
      gantry.add(pillar);
      var strip = new THREE.Mesh(new THREE.BoxGeometry(1.35, 8, 0.24), neonMat);
      strip.position.set(0, 5.5, side * (span - 0.72));
      gantry.add(strip);
    });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, span * 2), pillarMat);
    beam.position.set(0, 11.4, 0);
    gantry.add(beam);
    var beamNeon = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, span * 2 - 1), neonMat);
    beamNeon.position.set(0, 10.5, 0);
    gantry.add(beamNeon);

    var signMat = new THREE.MeshBasicMaterial({ map: signTexture('START', '#ff2fb9'), transparent: true, depthWrite: false });
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), signMat);
    sign.position.set(-1.2, 11.4, 0);
    sign.rotation.y = -Math.PI / 2;
    gantry.add(sign);

    gantry.position.set(sp.x, 0, sp.z);
    gantry.rotation.y = -sp.heading;
    this.trackGroup.add(gantry);
  };

  Scene3D.prototype.addCity = function (track) {
    var samples = track.samples;
    var rand = Utils.seeded(1337 + track.samples.length);
    var tex = this.textures.building;

    var slots = [];
    var stepEvery = Math.max(6, Math.round(26 / track.step));
    for (var i = 0; i < samples.length; i += stepEvery) {
      var sp = samples[i];
      for (var side = -1; side <= 1; side += 2) {
        var rows = rand() < track.density ? (rand() < 0.45 ? 2 : 1) : 0;
        for (var r = 0; r < rows; r++) {
          var offset = track.halfWidth + 16 + r * 34 + rand() * 16;
          var jitter = (rand() - 0.5) * 14;
          slots.push({
            x: sp.x + sp.rx * offset * side + sp.fx * jitter,
            z: sp.z + sp.rz * offset * side + sp.fz * jitter,
            w: 12 + rand() * 16,
            d: 12 + rand() * 16,
            h: 18 + rand() * (r === 0 ? 70 : 150),
            rot: -sp.heading + (rand() - 0.5) * 0.25,
            tint: rand()
          });
        }
      }
    }

    var geom = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1.15,
      color: 0x8792a8, roughness: 0.75, metalness: 0.25
    });
    var mesh = new THREE.InstancedMesh(geom, mat, slots.length);
    var dummy = new THREE.Object3D();
    var tintColor = new THREE.Color();

    for (var k = 0; k < slots.length; k++) {
      var b = slots[k];
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      tintColor.setHSL(0.55 + b.tint * 0.25, 0.35, 0.16 + b.tint * 0.1);
      mesh.setColorAt(k, tintColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.trackGroup.add(mesh);

    this.addSigns(track, slots, rand);
  };

  Scene3D.prototype.addSigns = function (track, slots, rand) {
    var words = [
      { t: '夜城', c: '#ff2fb9' }, { t: '拉面', c: '#ffcc33' }, { t: 'NEON', c: '#18e0ff' },
      { t: '酒', c: '#ff4d4d' }, { t: '电玩', c: '#9dff2f' }, { t: 'SPEED', c: '#ff7a00' },
      { t: '極', c: '#b388ff' }, { t: 'TURBO', c: '#39ff9e' }
    ];
    var mats = words.map(function (w) {
      return new THREE.MeshBasicMaterial({
        map: signTexture(w.t, w.c), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
    });

    var geomLarge = new THREE.PlaneGeometry(16, 8);
    var placed = 0;
    for (var i = 0; i < slots.length && placed < 60; i++) {
      if (rand() > 0.28) continue;
      var b = slots[i];
      var sign = new THREE.Mesh(geomLarge, mats[(rand() * mats.length) | 0]);
      var faceAngle = b.rot + Math.PI / 2;
      sign.position.set(
        b.x + Math.sin(faceAngle) * (b.d / 2 + 0.4),
        8 + rand() * Math.max(6, b.h - 16),
        b.z + Math.cos(faceAngle) * (b.d / 2 + 0.4)
      );
      sign.rotation.y = faceAngle;
      this.trackGroup.add(sign);
      placed++;
    }
  };

  Scene3D.prototype.addLamps = function (track) {
    var samples = track.samples;
    var every = Math.max(8, Math.round(52 / track.step));
    var count = Math.floor(samples.length / every) + 1;

    var poleGeo = new THREE.BoxGeometry(0.3, 9, 0.3);
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x0e1119, roughness: 0.6, metalness: 0.7 });
    var poles = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);

    var headGeo = new THREE.BoxGeometry(2.4, 0.28, 0.7);
    var headMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.95 });
    var heads = new THREE.InstancedMesh(headGeo, headMat, count * 2);

    var glowGeo = new THREE.PlaneGeometry(9, 9);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd08a, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var glows = new THREE.InstancedMesh(glowGeo, glowMat, count * 2);

    var dummy = new THREE.Object3D();
    var idx = 0;
    for (var i = 0; i < samples.length; i += every) {
      var sp = samples[i];
      for (var side = -1; side <= 1; side += 2) {
        if (idx >= count * 2) break;
        var off = track.halfWidth + 6.2;
        var px = sp.x + sp.rx * off * side;
        var pz = sp.z + sp.rz * off * side;

        dummy.position.set(px, 4.5, pz);
        dummy.rotation.set(0, -sp.heading, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        poles.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(px - sp.rx * 1.1 * side, 8.9, pz - sp.rz * 1.1 * side);
        dummy.updateMatrix();
        heads.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(px - sp.rx * 1.4 * side, 0.12, pz - sp.rz * 1.4 * side);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        glows.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    poles.count = idx;
    heads.count = idx;
    glows.count = idx;
    poles.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    glows.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(poles);
    this.trackGroup.add(heads);
    this.trackGroup.add(glows);
  };

  // ---------- 自由驾驶场地 ----------

  Scene3D.prototype.buildArena = function (arena) {
    this.clearWorld();

    if (!this.textures.lot) this.textures.lot = lotTexture();
    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(arena.radius, 64),
      new THREE.MeshStandardMaterial({ map: this.textures.lot, color: 0xa8b3cd, roughness: 0.62, metalness: 0.25 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.trackGroup.add(floor);

    // 地面霓虹圆环，夜里也能判断距离
    [110, 230, 350].forEach(function (radius, i) {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.6, 96),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xff2fb9 : 0x18e0ff, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      this.trackGroup.add(ring);
    }, this);

    var outer = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000),
      new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 1 })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.2;
    this.trackGroup.add(outer);

    // 圆形霓虹围墙
    var wall = new THREE.Mesh(
      new THREE.CylinderGeometry(arena.radius, arena.radius, 4, 72, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x11141f, roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide })
    );
    wall.position.y = 2;
    this.trackGroup.add(wall);

    var neonRing = new THREE.Mesh(
      new THREE.CylinderGeometry(arena.radius - 0.1, arena.radius - 0.1, 0.5, 72, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x18e0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    neonRing.position.y = 4;
    this.trackGroup.add(neonRing);

    var rampMat = new THREE.MeshStandardMaterial({
      color: 0x3a4258, roughness: 0.5, metalness: 0.4,
      emissive: 0x14203a, emissiveIntensity: 1, side: THREE.DoubleSide
    });
    var edgeMat = new THREE.MeshBasicMaterial({ color: 0xff2fb9, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    var sideMat = new THREE.MeshBasicMaterial({ color: 0x18e0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });

    arena.ramps.forEach(function (r) {
      var geom = new THREE.BufferGeometry();
      var hl = r.length / 2;
      var hw = r.width / 2;
      var v = new Float32Array([
        -hl, 0, -hw, hl, r.height, -hw, hl, r.height, hw,
        -hl, 0, -hw, hl, r.height, hw, -hl, 0, hw,
        // 背面挡板
        hl, 0, -hw, hl, 0, hw, hl, r.height, hw,
        hl, 0, -hw, hl, r.height, hw, hl, r.height, -hw,
        // 两侧
        -hl, 0, -hw, hl, r.height, -hw, hl, 0, -hw,
        -hl, 0, hw, hl, 0, hw, hl, r.height, hw
      ]);
      geom.setAttribute('position', new THREE.BufferAttribute(v, 3));
      geom.computeVertexNormals();
      var mesh = new THREE.Mesh(geom, rampMat);
      mesh.position.set(r.x, 0, r.z);
      mesh.rotation.y = -r.angle;
      this.trackGroup.add(mesh);

      var lip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, r.width), edgeMat);
      lip.position.set(r.x + Math.cos(r.angle) * hl, r.height + 0.1, r.z - Math.sin(r.angle) * hl);
      lip.rotation.y = -r.angle;
      this.trackGroup.add(lip);

      // 坡面两侧的霓虹导引线，远处也能看清跳台在哪
      [-1, 1].forEach(function (side) {
        var stripe = new THREE.Mesh(new THREE.PlaneGeometry(r.length, 0.4), sideMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.rotation.z = -r.angle + Math.PI / 2;
        stripe.position.set(
          r.x - Math.sin(-r.angle) * side * hw,
          0.06,
          r.z - Math.cos(-r.angle) * side * hw
        );
        this.trackGroup.add(stripe);

        var rail = new THREE.Mesh(new THREE.BoxGeometry(r.length * 1.02, 0.16, 0.16), sideMat);
        rail.position.set(
          r.x - Math.sin(-r.angle) * side * hw,
          r.height / 2 + 0.2,
          r.z - Math.cos(-r.angle) * side * hw
        );
        rail.rotation.y = -r.angle;
        rail.rotation.z = Math.atan2(r.height, r.length);
        this.trackGroup.add(rail);
      }, this);
    }, this);

    // 场地外围城市剪影
    var rand = Utils.seeded(99);
    var tex = this.textures.building;
    var mat = new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1.1,
      color: 0x7d879c, roughness: 0.8, metalness: 0.2
    });
    var mesh2 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 120);
    var dummy = new THREE.Object3D();
    for (var i = 0; i < 120; i++) {
      var a = rand() * Math.PI * 2;
      var d = arena.radius + 60 + rand() * 420;
      var h = 30 + rand() * 170;
      dummy.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(16 + rand() * 22, h, 16 + rand() * 22);
      dummy.updateMatrix();
      mesh2.setMatrixAt(i, dummy.matrix);
    }
    mesh2.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(mesh2);
  };

  // ---------- 车库展台 ----------

  Scene3D.prototype.buildShowroom = function () {
    this.clearWorld();
    this.showroomAngle = 0.6;

    var floor = new THREE.Mesh(
      new THREE.CircleGeometry(220, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c0f1a, roughness: 0.24, metalness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    this.trackGroup.add(floor);

    var stage = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.6, 0.35, 48),
      new THREE.MeshStandardMaterial({ color: 0x161b2c, roughness: 0.3, metalness: 0.9 })
    );
    stage.position.y = -0.18;
    this.trackGroup.add(stage);

    [[6.9, 0x18e0ff], [8.1, 0xff2fb9]].forEach(function (ring) {
      var mesh = new THREE.Mesh(
        new THREE.RingGeometry(ring[0], ring[0] + 0.28, 64),
        new THREE.MeshBasicMaterial({ color: ring[1], transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.03;
      this.trackGroup.add(mesh);
    }, this);

    var key = new THREE.SpotLight(0xdce8ff, 3200, 70, 0.85, 0.7, 1.2);
    key.position.set(6, 14, 8);
    key.target.position.set(0, 0.6, 0);
    this.trackGroup.add(key);
    this.trackGroup.add(key.target);

    var fillA = new THREE.PointLight(0x18e0ff, 2600, 60, 2);
    fillA.position.set(-9, 4, -6);
    this.trackGroup.add(fillA);
    var fillB = new THREE.PointLight(0xff2fb9, 2600, 60, 2);
    fillB.position.set(9, 4, -7);
    this.trackGroup.add(fillB);

    // 背景高楼
    var rand = Utils.seeded(7);
    var tex = this.textures.building;
    var mat = new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 1.1,
      color: 0x6d7a94, roughness: 0.8, metalness: 0.2
    });
    var mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 70);
    var dummy = new THREE.Object3D();
    for (var i = 0; i < 70; i++) {
      var a = rand() * Math.PI * 2;
      var d = 150 + rand() * 400;
      var h = 40 + rand() * 190;
      dummy.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(18 + rand() * 20, h, 18 + rand() * 20);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(mesh);
  };

  /** 车库里展示一台车（spec 变了就重建） */
  Scene3D.prototype.showCar = function (spec) {
    if (this.showcase) {
      this.scene.remove(this.showcase);
      this.disposeGroup(this.showcase);
      this.showcase = null;
    }
    if (!spec) return;
    this.showcase = CarModel.create(spec);
    this.showcase.position.set(0, 0, 0);
    this.scene.add(this.showcase);
  };

  Scene3D.prototype.updateShowroom = function (dt) {
    this.showroomAngle = (this.showroomAngle || 0) + dt * 0.32;
    var cam = this.cameras[0];
    var r = 9.5;
    cam.fov = 44;
    cam.updateProjectionMatrix();
    cam.position.set(Math.cos(this.showroomAngle) * r, 2.9 + Math.sin(this.showroomAngle * 0.6) * 0.5, Math.sin(this.showroomAngle) * r);
    // 视线压低一点，让车出现在画面上半部分（下半部分被信息卡挡住）
    cam.lookAt(0, -1.7, 0);
    if (this.showcase) this.showcase.rotation.y += dt * 0.12;
    this.headlight.position.set(0, -50, 0);
    this.headlight.target.position.set(0, -60, 0);
    this.headlight.target.updateMatrixWorld();
  };

  // ---------- 车辆 ----------

  Scene3D.prototype.clearCars = function () {
    this.carEntries.forEach(function (entry) {
      this.scene.remove(entry.group);
      this.disposeGroup(entry.group);
    }, this);
    this.carEntries = [];
  };

  Scene3D.prototype.addCar = function (car) {
    var group = CarModel.create(car.spec);
    this.scene.add(group);
    this.carEntries.push({ car: car, group: group });
    return group;
  };

  Scene3D.prototype.syncCars = function (dt, split) {
    this.time += dt;
    this.updateParticles(dt);
    for (var i = 0; i < this.carEntries.length; i++) {
      var entry = this.carEntries[i];
      CarModel.sync(entry.group, entry.car, this.time);
      // 第一人称时藏起自己的车；分屏下要两个视角都是第一人称才藏
      var hidden = this.hiddenFor[0] === entry.car && (!split || this.hiddenFor[1] === entry.car);
      entry.group.visible = !hidden;
    }
  };

  // ---------- 粒子：轮胎烟、火花 ----------

  Scene3D.prototype.initParticles = function () {
    if (this.particles) return;
    var c = makeCanvas(64, 64);
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);

    this.particles = [];
    for (var i = 0; i < 90; i++) {
      var mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0
      });
      var sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.particles.push({ sprite: sprite, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, grow: 1 });
    }
    this.particleCursor = 0;
  };

  Scene3D.prototype.spawnParticle = function (x, y, z, color, size, life, spread, rise) {
    if (!this.particles) this.initParticles();
    var p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % this.particles.length;

    p.sprite.position.set(x, y, z);
    p.sprite.scale.setScalar(size);
    p.sprite.material.color.setHex(color);
    p.sprite.material.opacity = 0.85;
    p.sprite.visible = true;
    p.life = life;
    p.maxLife = life;
    p.grow = size * 2.2;
    p.vx = (Math.random() - 0.5) * spread;
    p.vy = rise * (0.5 + Math.random());
    p.vz = (Math.random() - 0.5) * spread;
  };

  Scene3D.prototype.updateParticles = function (dt) {
    if (!this.particles) return;
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      var t = p.life / p.maxLife;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      p.sprite.material.opacity = t * 0.8;
      p.sprite.scale.setScalar(p.sprite.scale.x + p.grow * dt);
    }
  };

  /** 漂移时后轮冒烟 */
  Scene3D.prototype.emitDriftSmoke = function (car) {
    var f = car.forward();
    var back = 1.6;
    for (var side = -1; side <= 1; side += 2) {
      this.spawnParticle(
        car.x - f.x * back - f.z * side * 0.9,
        car.y + 0.25,
        car.z - f.z * back + f.x * side * 0.9,
        0x8fa6c8, 1.1, 0.75, 2.2, 1.4
      );
    }
  };

  Scene3D.prototype.emitSparks = function (car, strength) {
    var count = Math.min(6, 2 + Math.round(strength / 6));
    for (var i = 0; i < count; i++) {
      this.spawnParticle(car.x, car.y + 0.45, car.z, i % 2 ? 0xffc24d : 0xff7a1f, 0.5, 0.4, 9, 2.4);
    }
  };

  // ---------- 相机 ----------

  Scene3D.prototype.cameraModeName = function (slot) {
    return CAMERA_MODES[this.camState[slot].mode].name;
  };

  Scene3D.prototype.cycleCamera = function (slot) {
    var st = this.camState[slot];
    st.mode = (st.mode + 1) % CAMERA_MODES.length;
    return CAMERA_MODES[st.mode].name;
  };

  Scene3D.prototype.shake = function (slot, amount) {
    this.camState[slot].shake = Math.min(1.4, this.camState[slot].shake + amount);
  };

  Scene3D.prototype.updateCamera = function (slot, car, dt, lookBack) {
    var cam = this.cameras[slot];
    var st = this.camState[slot];
    var mode = CAMERA_MODES[st.mode];
    if (!car) return;

    var dir = lookBack ? -1 : 1;
    var f = car.forward();
    var speedRatio = Utils.clamp(Math.abs(car.vf) / 70, 0, 1);

    var desiredFov = mode.fov + speedRatio * 10 + (car.nosActive ? 7 : 0);
    st.fov = Utils.damp(st.fov, desiredFov, 0.05, dt);
    cam.fov = st.fov;
    cam.updateProjectionMatrix();

    var back = mode.dist * dir;
    var targetX = car.x - f.x * back;
    var targetZ = car.z - f.z * back;
    var targetY = car.y + mode.height + (mode.id === 'top' ? 0 : speedRatio * 0.35);

    if (mode.id === 'chase' || mode.id === 'far' || mode.id === 'top') {
      // 平滑跟随，漂移时相机稍稍滞后，画面更有速度感
      var follow = mode.id === 'top' ? 0.0005 : 0.0002;
      st.x = Utils.damp(st.x, targetX, follow, dt);
      st.y = Utils.damp(st.y, targetY, 0.0005, dt);
      st.z = Utils.damp(st.z, targetZ, follow, dt);
    } else {
      var side = mode.id === 'cockpit' ? 0.34 : 0;
      st.x = targetX - f.z * side;
      st.y = targetY;
      st.z = targetZ + f.x * side;
    }

    this.hiddenFor[slot] = mode.hideCar ? car : null;

    st.shake = Math.max(0, st.shake - dt * 2.4);
    var jitter = st.shake * 0.35 + (car.nosActive ? 0.06 : 0) + car.driftAmount * 0.05;
    cam.position.set(
      st.x + (Math.random() - 0.5) * jitter,
      st.y + (Math.random() - 0.5) * jitter,
      st.z + (Math.random() - 0.5) * jitter
    );

    var lookDist = mode.id === 'top' ? 26 : 18;
    var lookY = car.y + (mode.id === 'top' ? 0 : 1.1);
    cam.lookAt(
      car.x + f.x * lookDist * dir,
      lookY,
      car.z + f.z * lookDist * dir
    );

    if (slot === 0) {
      this.moon.position.set(car.x - 500, 620, car.z - 420);
      this.moon.target.position.set(car.x, 0, car.z);
      this.moon.target.updateMatrixWorld();

      this.headlight.position.set(car.x + f.x * 1.6, car.y + 0.75, car.z + f.z * 1.6);
      this.headlight.target.position.set(car.x + f.x * 42, car.y, car.z + f.z * 42);
      this.headlight.target.updateMatrixWorld();
    }
  };

  Scene3D.prototype.resize = function (width, height, split) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    var aspect = split ? width / (height / 2) : width / height;
    this.cameras[0].aspect = aspect;
    this.cameras[0].updateProjectionMatrix();
    this.cameras[1].aspect = aspect;
    this.cameras[1].updateProjectionMatrix();
  };

  Scene3D.prototype.render = function (split) {
    var r = this.renderer;
    if (!split) {
      r.setScissorTest(false);
      r.setViewport(0, 0, this.width, this.height);
      r.render(this.scene, this.cameras[0]);
      return;
    }
    var h = this.height / 2;
    r.setScissorTest(true);
    r.setViewport(0, h, this.width, h);
    r.setScissor(0, h, this.width, h);
    r.render(this.scene, this.cameras[0]);
    r.setViewport(0, 0, this.width, h);
    r.setScissor(0, 0, this.width, h);
    r.render(this.scene, this.cameras[1]);
    r.setScissorTest(false);
  };

  global.Scene3D = Scene3D;
})(window);
