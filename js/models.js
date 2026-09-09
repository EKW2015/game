/**
 * 斗罗大陆单位模型：魂师、魂兽、光明圣龙真身。
 */
(function (global) {
  'use strict';

  function hex(h) {
    return parseInt(String(h).replace('#', ''), 16);
  }

  function mat(color, roughness, metalness, emissive) {
    var m = new THREE.MeshStandardMaterial({
      color: hex(color),
      roughness: roughness == null ? 0.7 : roughness,
      metalness: metalness == null ? 0.08 : metalness
    });
    if (emissive) {
      m.emissive = new THREE.Color(hex(emissive));
      m.emissiveIntensity = 0.55;
    }
    return m;
  }

  function glowMat(color, opacity) {
    return new THREE.MeshBasicMaterial({
      color: hex(color),
      transparent: true,
      opacity: opacity == null ? 0.55 : opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  function addSoulRings(parent, count) {
    var pivot = new THREE.Group();
    pivot.position.y = 7.2;
    var rings = [];
    var n = count || 7;
    for (var i = 0; i < n; i++) {
      var col = global.Utils.RING_GLOW[Math.min(i, 6)];
      var torus = new THREE.Mesh(
        new THREE.TorusGeometry(4.6 + i * 0.62, 0.34, 8, 36),
        glowMat(col, 0.95)
      );
      torus.rotation.x = Math.PI / 2;
      torus.rotation.z = i * 0.15;
      pivot.add(torus);
      rings.push(torus);
    }
    parent.add(pivot);
    parent.userData.ringPivot = pivot;
    parent.userData.rings = rings;
    return pivot;
  }

  function createHumanoid(colors, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var human = new THREE.Group();
    g.add(human);
    g.userData.human = human;

    var holy = opts.holy;
    var skin = mat(holy ? '#f0d7b0' : colors.body, 0.62, 0.04);
    var robe = holy
      ? mat('#c9a227', 0.45, 0.28, '#8a6a18')
      : mat(colors.robe, 0.78, 0.06);
    var trim = mat(colors.trim, 0.28, 0.55, colors.trim);
    var hairM = mat(colors.hair, 0.55, 0.08);
    var gold = mat('#e8c35a', 0.22, 0.78, '#ffd36a');
    var inner = mat(holy ? '#fff8e8' : colors.accent, 0.7, 0.05);

    var hips = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 1.5), robe);
    hips.position.y = 5.1;
    hips.castShadow = true;
    human.add(hips);

    var torso = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.2, 1.7), robe);
    torso.position.y = 7.3;
    torso.castShadow = true;
    human.add(torso);

    var chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.45), gold);
    chest.position.set(0, 7.6, 0.95);
    if (holy) human.add(chest);

    var collar = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 1.9), trim);
    collar.position.y = 8.9;
    human.add(collar);

    var cape = new THREE.Mesh(new THREE.BoxGeometry(3.1, 4.2, 0.18), inner);
    cape.position.set(0, 6.6, -1.05);
    cape.rotation.x = 0.12;
    human.add(cape);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), skin);
    head.position.y = 10.3;
    head.castShadow = true;
    human.add(head);
    g.userData.head = head;

    var hair = new THREE.Mesh(new THREE.SphereGeometry(1.08, 10, 8), hairM);
    hair.position.y = 10.7;
    hair.scale.set(1.08, 0.95, 1.2);
    human.add(hair);

    var hornL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.35, 6), gold);
    hornL.position.set(-0.45, 11.45, 0.05);
    hornL.rotation.z = 0.25;
    if (holy) human.add(hornL);
    var hornR = hornL.clone();
    hornR.position.x = 0.45;
    hornR.rotation.z = -0.25;
    if (holy) human.add(hornR);

    var eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), mat('#fff8e0', 0.4));
    eyeL.position.set(-0.32, 10.35, 0.82);
    human.add(eyeL);
    var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(colors.eye, 0.3, 0.2, colors.trim));
    pupil.position.set(-0.32, 10.35, 0.92);
    human.add(pupil);
    var eyeR = eyeL.clone();
    eyeR.position.x = 0.32;
    human.add(eyeR);
    var pupilR = pupil.clone();
    pupilR.position.x = 0.32;
    human.add(pupilR);

    g.userData.legs = [];
    var legX = [0.7, -0.7];
    for (var i = 0; i < 2; i++) {
      var upper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.75), robe);
      upper.position.set(legX[i], 3.6, 0);
      upper.castShadow = true;
      human.add(upper);
      var lower = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.0, 0.7), robe);
      lower.position.set(legX[i], 1.6, 0.05);
      lower.castShadow = true;
      human.add(lower);
      var boot = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 1.05), trim);
      boot.position.set(legX[i], 0.35, 0.18);
      human.add(boot);
      g.userData.legs.push({ upper: upper, lower: lower });
    }

    g.userData.arms = [];
    var armX = [1.7, -1.7];
    for (var a = 0; a < 2; a++) {
      var arm = new THREE.Group();
      arm.position.set(armX[a], 8.4, 0);
      var ua = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.8, 0.55), robe);
      ua.position.y = -0.7;
      arm.add(ua);
      var la = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.6, 0.48), skin);
      la.position.y = -2.2;
      arm.add(la);
      var claw = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 5), gold);
      claw.rotation.x = Math.PI;
      claw.position.set(0, -3.15, 0.15);
      arm.add(claw);
      var claw2 = claw.clone();
      claw2.position.x = 0.18;
      arm.add(claw2);
      human.add(arm);
      g.userData.arms.push(arm);
    }

    var wings = new THREE.Group();
    wings.visible = false;
    var wingM = new THREE.MeshBasicMaterial({
      color: 0xffe9a0,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var wL = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.6), wingM);
    wL.position.set(-4.2, 8.4, -0.4);
    wL.rotation.y = 0.45;
    wL.rotation.z = 0.25;
    var wR = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.6), wingM.clone());
    wR.position.set(4.2, 8.4, -0.4);
    wR.rotation.y = -0.45;
    wR.rotation.z = -0.25;
    wings.add(wL);
    wings.add(wR);
    g.add(wings);
    g.userData.wings = wings;
    g.userData.wingL = wL;
    g.userData.wingR = wR;

    var shield = new THREE.Mesh(new THREE.CircleGeometry(3.8, 28), glowMat('#ffe27a', 0.55));
    shield.position.set(0, 7.2, 2.8);
    shield.visible = false;
    g.add(shield);
    g.userData.shieldMesh = shield;

    var goldAura = new THREE.Mesh(
      new THREE.SphereGeometry(4.1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffe27a,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: true
      })
    );
    goldAura.position.y = 7;
    goldAura.visible = false;
    g.add(goldAura);
    g.userData.goldAura = goldAura;

    var halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 24), glowMat('#fff4c0', 0.85));
    halo.position.y = 12.1;
    halo.rotation.x = Math.PI / 2;
    halo.visible = !!holy;
    g.add(halo);
    g.userData.halo = halo;

    if (opts.rings) addSoulRings(g, opts.rings);

    var dragon = createDragon(true);
    dragon.visible = false;
    dragon.scale.setScalar(1.15);
    dragon.position.y = 0;
    g.add(dragon);
    g.userData.dragon = dragon;

    return g;
  }

  function radiusAlongDragon(t) {
    if (t < 0.06) return 0.95 + t * 8;
    if (t < 0.2) return 1.55 + (0.2 - t) * 0.6;
    if (t < 0.38) return 1.72;
    if (t < 0.62) return 1.72 - (t - 0.38) * 1.35;
    return Math.max(0.14, 1.15 * Math.pow(1 - t, 1.05));
  }

  function createSerpentBody(points, radiusFn, tubular, radial) {
    var curve = new THREE.CatmullRomCurve3(points);
    var positions = [];
    var colors = [];
    var uvs = [];
    var indices = [];
    var goldC = new THREE.Color(0xe8c35a);
    var paleC = new THREE.Color(0xfff4cc);
    var tmp = new THREE.Color();
    var tangent = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var worldUp = new THREE.Vector3(0, 1, 0);

    for (var i = 0; i <= tubular; i++) {
      var t = i / tubular;
      var p = curve.getPointAt(t);
      tangent.copy(curve.getTangentAt(t)).normalize();
      binormal.crossVectors(tangent, worldUp);
      if (binormal.lengthSq() < 1e-6) binormal.set(1, 0, 0);
      binormal.normalize();
      normal.crossVectors(binormal, tangent).normalize();
      var r = radiusFn(t);
      for (var j = 0; j <= radial; j++) {
        var v = (j / radial) * Math.PI * 2;
        var side = Math.sin(v);
        var up = Math.cos(v);
        var nx = up * normal.x + side * binormal.x;
        var ny = up * normal.y + side * binormal.y;
        var nz = up * normal.z + side * binormal.z;
        positions.push(p.x + r * nx, p.y + r * ny, p.z + r * nz);
        uvs.push(t * 4, j / radial);
        var belly = Math.max(0, Math.min(1, (-up + 0.15) * 0.85));
        tmp.copy(goldC).lerp(paleC, belly);
        colors.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (i = 0; i < tubular; i++) {
      for (j = 0; j < radial; j++) {
        var a = i * (radial + 1) + j;
        var b = a + radial + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return { geo: geo, curve: curve };
  }

  function createDragon(playerGold) {
    var g = new THREE.Group();
    var gold = mat(playerGold ? '#e8c35a' : '#c9a227', 0.28, 0.65, '#ffd36a');
    var pale = mat('#fff6d0', 0.42, 0.28, '#fff1b0');
    var hornM = mat('#fff8e8', 0.35, 0.2);
    var dark = mat('#5a4018', 0.55, 0.2);
    var clawM = mat('#fff3c0', 0.3, 0.45, '#ffe27a');
    var maneM = mat('#fff1a0', 0.4, 0.35, '#ffd36a');
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.52,
      emissive: new THREE.Color(playerGold ? 0x7a5a14 : 0x5a4010),
      emissiveIntensity: 0.38,
      vertexColors: true
    });
    var wingM = new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0x8a5a10,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      roughness: 0.32,
      metalness: 0.22
    });

    var spine = [
      new THREE.Vector3(0.0, 7.6, 13.2),
      new THREE.Vector3(0.35, 7.1, 9.4),
      new THREE.Vector3(1.45, 6.4, 5.4),
      new THREE.Vector3(-0.15, 6.0, 1.2),
      new THREE.Vector3(-1.55, 5.7, -3.2),
      new THREE.Vector3(0.55, 5.5, -7.8),
      new THREE.Vector3(1.35, 5.3, -12.6),
      new THREE.Vector3(-0.55, 5.0, -17.8),
      new THREE.Vector3(0.25, 4.8, -23.2),
      new THREE.Vector3(0.0, 5.6, -29.4)
    ];
    var bodyBuilt = createSerpentBody(spine, radiusAlongDragon, 72, 12);
    var bodyMesh = new THREE.Mesh(bodyBuilt.geo, bodyMat);
    bodyMesh.castShadow = true;
    g.add(bodyMesh);
    var curve = bodyBuilt.curve;

    var p = new THREE.Vector3();
    var tan = new THREE.Vector3();
    for (var sp = 0; sp <= 20; sp++) {
      var st = 0.05 + sp / 20 * 0.9;
      p.copy(curve.getPointAt(st));
      tan.copy(curve.getTangentAt(st));
      var spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.16 + (1 - st) * 0.16, 1.05 + (1 - st) * 0.7, 5),
        hornM
      );
      spike.position.set(p.x, p.y + radiusAlongDragon(st) + 0.45, p.z);
      spike.rotation.x = -Math.atan2(tan.y, Math.hypot(tan.x, tan.z)) * 0.5;
      spike.castShadow = true;
      g.add(spike);
    }

    var headRoot = new THREE.Group();
    p.copy(curve.getPointAt(0));
    headRoot.position.copy(p);
    g.add(headRoot);
    g.userData.headRoot = headRoot;

    function hadd(mesh, x, y, z, shadow) {
      mesh.position.set(x, y, z);
      if (shadow !== false) mesh.castShadow = true;
      headRoot.add(mesh);
      return mesh;
    }

    var skull = new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 10), gold);
    skull.scale.set(1.05, 1.0, 1.25);
    hadd(skull, 0, 0.55, 1.35);
    g.userData.head = skull;

    var brow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.1), dark);
    hadd(brow, 0, 1.45, 1.7);

    var snout = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.15, 3.15), pale);
    hadd(snout, 0, 0.15, 3.35);

    var nose = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), gold);
    hadd(nose, 0, 0.55, 4.85);

    var mouthIn = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 2.2), dark);
    hadd(mouthIn, 0, -0.35, 3.4, false);

    var jaw = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 2.7), dark);
    jaw.position.set(0, -0.72, 3.15);
    jaw.castShadow = true;
    headRoot.add(jaw);
    g.userData.jaw = jaw;

    for (var ti = 0; ti < 8; ti++) {
      var tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 4), hornM);
      tooth.position.set(-0.55 + ti * 0.16, -0.48, 4.35 + (ti % 2) * 0.12);
      headRoot.add(tooth);
    }

    function addHorn(x, zRot, xRot, len, r) {
      var horn = new THREE.Mesh(new THREE.ConeGeometry(r, len, 6), hornM);
      horn.rotation.z = zRot;
      horn.rotation.x = xRot;
      hadd(horn, x, 2.15, 0.85);
    }
    addHorn(-0.55, 0.32, -0.72, 3.6, 0.28);
    addHorn(0.55, -0.32, -0.72, 3.6, 0.28);
    addHorn(-0.95, 0.7, -0.35, 2.1, 0.16);
    addHorn(0.95, -0.7, -0.35, 2.1, 0.16);

    var antlerL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.6, 5), hornM);
    antlerL.rotation.z = 1.05;
    antlerL.rotation.x = -0.4;
    hadd(antlerL, -1.35, 3.15, 0.2);
    var antlerR = antlerL.clone();
    antlerR.rotation.z = -1.05;
    hadd(antlerR, 1.35, 3.15, 0.2);

    function addWhisker(side) {
      var w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 3.4, 5), pale);
      w1.rotation.z = side * 1.2;
      w1.rotation.x = 0.55;
      hadd(w1, side * 1.55, 0.05, 3.7, false);
      var w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 2.6, 5), pale);
      w2.rotation.z = side * 1.35;
      w2.rotation.x = 0.15;
      hadd(w2, side * 3.1, 0.35, 4.6, false);
    }
    addWhisker(-1);
    addWhisker(1);

    var beard = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 5), maneM);
    hadd(beard, 0, -1.25, 3.9);

    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), mat('#fffde8', 0.2, 0.1, '#fffde8'));
    hadd(eye, 0.72, 0.85, 2.35, false);
    var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), mat('#3a2008', 0.3, 0.1, '#ff9a3c'));
    hadd(pupil, 0.82, 0.85, 2.55, false);
    var eye2 = eye.clone();
    hadd(eye2, -0.72, 0.85, 2.35, false);
    var pupil2 = pupil.clone();
    hadd(pupil2, -0.82, 0.85, 2.55, false);

    for (var mi = 0; mi < 9; mi++) {
      var mane = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.8 - mi * 0.08, 5), maneM);
      var ma = -0.9 + mi * 0.22;
      mane.rotation.x = 0.85;
      mane.rotation.z = ma * 0.35;
      hadd(mane, Math.sin(ma) * 0.9, 1.1, -0.15 + mi * 0.04, false);
    }

    g.userData.legs = [];
    function addLeg(t, side, front) {
      p.copy(curve.getPointAt(t));
      var lg = new THREE.Group();
      lg.position.set(p.x + side * 0.85, p.y - 0.15, p.z);
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 2.35, 7), gold);
      upper.position.set(side * 0.15, -1.15, front ? 0.2 : -0.15);
      upper.rotation.z = side * 0.18;
      upper.castShadow = true;
      lg.add(upper);
      var lower = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.05, 7), gold);
      lower.position.set(side * 0.35, -2.85, front ? 0.45 : 0.1);
      lower.castShadow = true;
      lg.add(lower);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 1.05), dark);
      foot.position.set(side * 0.35, -3.85, front ? 0.75 : 0.4);
      lg.add(foot);
      for (var c = 0; c < 3; c++) {
        var claw = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 4), clawM);
        claw.rotation.x = Math.PI / 2;
        claw.position.set(side * 0.35 - 0.18 + c * 0.18, -3.72, front ? 1.2 : 0.85);
        lg.add(claw);
      }
      g.add(lg);
      g.userData.legs.push({ upper: upper, lower: lower });
    }
    addLeg(0.2, 1, true);
    addLeg(0.2, -1, true);
    addLeg(0.48, 1, false);
    addLeg(0.48, -1, false);

    function makeWing(side) {
      var wg = new THREE.Group();
      p.copy(curve.getPointAt(0.18));
      wg.position.set(p.x + side * 0.35, p.y + 0.4, p.z);

      var shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(2.2, 3.8, 5.5, 7.4, 3.2, 10.6);
      shape.bezierCurveTo(0.4, 12.2, -4.5, 10.4, -8.8, 7.2);
      shape.bezierCurveTo(-12.5, 4.2, -14.2, 0.6, -11.4, -1.6);
      shape.bezierCurveTo(-7.2, -3.0, -3.2, -1.8, 0, -0.35);
      var membrane = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingM);
      membrane.rotation.y = Math.PI / 2;
      membrane.position.x = side * 0.9;
      wg.add(membrane);

      var membrane2 = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingM);
      membrane2.rotation.y = Math.PI / 2 + side * 0.42;
      membrane2.position.set(side * 1.6, 0.2, -0.4);
      wg.add(membrane2);

      var bones = [
        [0.2, 4.8, -1.2, 0.55],
        [-3.4, 3.6, -4.2, 0.85],
        [-6.8, 1.8, -6.5, 1.05],
        [-9.2, -0.2, -8.4, 1.25]
      ];
      for (var bi = 0; bi < bones.length; bi++) {
        var bone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 8.4 - bi * 0.6, 5), dark);
        bone.rotation.x = bones[bi][3];
        bone.position.set(side * 0.95, bones[bi][1], bones[bi][2]);
        wg.add(bone);
      }
      g.add(wg);
      return wg;
    }
    g.userData.wingL = makeWing(-1);
    g.userData.wingR = makeWing(1);

    var tailRoot = new THREE.Group();
    p.copy(curve.getPointAt(0.92));
    tailRoot.position.copy(p);
    g.add(tailRoot);
    g.userData.tailRoot = tailRoot;
    g.userData.tail = [tailRoot];

    var tailFin = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.6, 4), wingM);
    tailFin.rotation.x = Math.PI / 2;
    tailFin.position.set(0, 0.6, -2.4);
    tailRoot.add(tailFin);
    var tailFin2 = tailFin.clone();
    tailFin2.scale.set(0.45, 1.1, 1.35);
    tailFin2.rotation.z = Math.PI / 2;
    tailFin2.position.set(0, 0.2, -1.8);
    tailRoot.add(tailFin2);
    var tailFlame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 6), maneM);
    tailFlame.rotation.x = Math.PI / 2;
    tailFlame.position.set(0, 0.35, -4.2);
    tailRoot.add(tailFlame);

    return g;
  }

  function createWolf(colors) {
    var g = new THREE.Group();
    var fur = mat(colors.body, 0.85, 0.04);
    var accent = mat(colors.accent, 0.5, 0.15, colors.trim);

    var body = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), fur);
    body.scale.set(1.3, 0.9, 1.9);
    body.position.y = 2.4;
    body.castShadow = true;
    g.add(body);

    var head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), fur);
    head.position.set(0, 3.1, 2.5);
    g.add(head);
    g.userData.head = head;

    var snout = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.3), accent);
    snout.position.set(0, 2.7, 3.4);
    g.add(snout);

    var earL = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 5), fur);
    earL.position.set(-0.55, 4.1, 2.3);
    g.add(earL);
    var earR = earL.clone();
    earR.position.x = 0.55;
    g.add(earR);

    g.userData.legs = [];
    var pts = [[0.8, 1.2], [-0.8, 1.2], [0.75, -1.1], [-0.75, -1.1]];
    for (var i = 0; i < pts.length; i++) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 6), fur);
      leg.position.set(pts[i][0], 1.1, pts[i][1]);
      g.add(leg);
      g.userData.legs.push({ upper: leg, lower: leg });
    }

    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), fur);
    tail.scale.set(0.7, 0.6, 2.2);
    tail.position.set(0, 2.6, -2.6);
    g.add(tail);
    g.userData.tail = [tail];
    addSoulRings(g, 3);
    return g;
  }

  function createApe(colors) {
    var g = new THREE.Group();
    var fur = mat(colors.body, 0.88, 0.02);
    var gold = mat(colors.trim, 0.4, 0.4);

    var torso = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), fur);
    torso.position.y = 4.2;
    torso.scale.set(1.15, 1.3, 0.9);
    torso.castShadow = true;
    g.add(torso);

    var head = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), fur);
    head.position.y = 7.4;
    g.add(head);
    g.userData.head = head;

    var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4.2, 8), fur);
    armL.position.set(-2.6, 3.6, 0.4);
    armL.rotation.z = 0.35;
    g.add(armL);
    var armR = armL.clone();
    armR.position.x = 2.6;
    armR.rotation.z = -0.35;
    g.add(armR);
    g.userData.arms = [armL, armR];

    g.userData.legs = [];
    var l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3.2, 8), fur);
    l1.position.set(0.9, 1.5, 0);
    g.add(l1);
    var l2 = l1.clone();
    l2.position.x = -0.9;
    g.add(l2);
    g.userData.legs.push({ upper: l1, lower: l1 }, { upper: l2, lower: l2 });

    var band = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 16), gold);
    band.position.y = 7.4;
    band.rotation.x = Math.PI / 2;
    g.add(band);
    addSoulRings(g, 5);
    return g;
  }

  function create(unit) {
    var c = unit.colors();
    if (unit.kind === 'wolf') return createWolf(c);
    if (unit.kind === 'ape') return createApe(c);
    if (unit.kind === 'dragon') return createDragon(unit.attr === 'light');
    return createHumanoid(c, { rings: unit.isPlayer ? 7 : unit.rings, holy: unit.isPlayer || unit.martialSoul === 'brightDragon' });
  }

  global.UnitModel = { create: create, hex: hex, mat: mat };
})(window);
