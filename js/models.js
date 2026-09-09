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

  function createDragon(playerGold) {
    var g = new THREE.Group();
    var gold = mat(playerGold ? '#e8c35a' : '#c9a227', 0.28, 0.65, '#ffd36a');
    var pale = mat('#fff6d0', 0.42, 0.28, '#fff1b0');
    var hornM = mat('#fff8e8', 0.35, 0.2);
    var dark = mat('#5a4018', 0.55, 0.2);
    var clawM = mat('#fff3c0', 0.3, 0.45, '#ffe27a');
    var wingM = new THREE.MeshStandardMaterial({
      color: 0xffe9a0,
      emissive: 0x8a6a18,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.2
    });

    function add(mesh, x, y, z, shadow) {
      mesh.position.set(x, y, z);
      if (shadow !== false) mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    }

    // 胸腔 + 腰，连成一条龙身，而不是一串珠子
    var chest = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), gold);
    chest.scale.set(2.05, 1.85, 2.35);
    add(chest, 0, 5.4, 1.35);

    var belly = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), pale);
    belly.scale.set(1.55, 1.35, 2.0);
    add(belly, 0, 4.55, 1.1);

    var torso = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), gold);
    torso.scale.set(1.85, 1.65, 2.5);
    add(torso, 0, 5.15, -0.9);

    var hips = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), gold);
    hips.scale.set(1.55, 1.4, 1.7);
    add(hips, 0, 4.7, -3.0);

    // 背棘
    for (var sp = 0; sp < 7; sp++) {
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.15 - sp * 0.08, 5), hornM);
      add(spike, 0, 7.05 - sp * 0.12, 2.4 - sp * 0.95);
    }

    // 颈
    var neck1 = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 2.2, 10), gold);
    neck1.rotation.x = 0.75;
    add(neck1, 0, 6.5, 3.15);
    var neck2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.8, 10), gold);
    neck2.rotation.x = 0.35;
    add(neck2, 0, 7.7, 4.45);

    // 头
    var head = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.85, 2.6), gold);
    add(head, 0, 8.55, 5.85);
    g.userData.head = head;

    var brow = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.45, 0.9), dark);
    add(brow, 0, 9.35, 6.15);

    var snout = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 2.3), pale);
    add(snout, 0, 8.15, 7.55);

    var jaw = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 2.0), dark);
    add(jaw, 0, 7.45, 7.35);
    g.userData.jaw = jaw;

    for (var ti = 0; ti < 6; ti++) {
      var tooth = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 4), hornM);
      add(tooth, -0.5 + ti * 0.2, 7.62, 8.15 + (ti % 2) * 0.08, false);
    }

    var hornL = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.8, 6), hornM);
    hornL.rotation.z = 0.28;
    hornL.rotation.x = -0.35;
    add(hornL, -0.7, 10.5, 5.35);
    var hornR = hornL.clone();
    hornR.rotation.z = -0.28;
    add(hornR, 0.7, 10.5, 5.35);

    var hornL2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.6, 5), hornM);
    hornL2.rotation.z = 0.55;
    add(hornL2, -1.05, 9.7, 5.0);
    var hornR2 = hornL2.clone();
    hornR2.rotation.z = -0.55;
    add(hornR2, 1.05, 9.7, 5.0);

    var whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 5), pale);
    whisker.rotation.z = 1.15;
    whisker.rotation.y = 0.4;
    add(whisker, -1.7, 8.1, 7.4, false);
    var whiskerR = whisker.clone();
    whiskerR.rotation.z = -1.15;
    add(whiskerR, 1.7, 8.1, 7.4, false);

    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat('#fffde8', 0.2, 0.1, '#fffde8'));
    add(eye, 0.78, 8.85, 6.75, false);
    var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat('#3a2008', 0.3, 0.1, '#ff9a3c'));
    add(pupil, 0.88, 8.85, 6.95, false);
    var eye2 = eye.clone();
    add(eye2, -0.78, 8.85, 6.75, false);
    var pupil2 = pupil.clone();
    add(pupil2, -0.88, 8.85, 6.95, false);

    // 四足
    g.userData.legs = [];
    var legs = [
      [1.15, 1.9, 0.35],
      [-1.15, 1.9, -0.35],
      [1.05, -2.5, 0.2],
      [-1.05, -2.5, -0.2]
    ];
    for (var li = 0; li < 4; li++) {
      var lx = legs[li][0];
      var lz = legs[li][1];
      var tilt = legs[li][2];
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.5, 8), gold);
      upper.rotation.z = tilt;
      add(upper, lx, 3.7, lz);
      var lower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.15, 8), gold);
      add(lower, lx + tilt * 0.8, 1.55, lz + 0.2);
      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.34, 1.15), dark);
      add(foot, lx + tilt * 0.8, 0.45, lz + 0.45);
      for (var c = 0; c < 3; c++) {
        var claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), clawM);
        claw.rotation.x = Math.PI / 2;
        add(claw, lx + tilt * 0.8 - 0.18 + c * 0.18, 0.62, lz + 0.9, false);
      }
      g.userData.legs.push({ upper: upper, lower: lower });
    }

    // 膜翼：骨骼 + 翼膜，不再是一张薄片
    function makeWing(side) {
      var wg = new THREE.Group();
      var bone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 6.8, 6), dark);
      bone1.rotation.z = side * 1.05;
      bone1.position.set(side * 2.8, 2.0, 0);
      wg.add(bone1);
      var bone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.4, 6), dark);
      bone2.rotation.z = side * 0.55;
      bone2.position.set(side * 6.2, 4.0, -0.4);
      wg.add(bone2);
      var membrane = new THREE.Mesh(new THREE.CircleGeometry(6.6, 7, 0, Math.PI * 0.95), wingM);
      membrane.rotation.y = side * 0.28;
      membrane.rotation.z = side * 0.12;
      membrane.position.set(side * 4.6, 2.0, -0.25);
      wg.add(membrane);
      var membrane2 = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 5.2), wingM);
      membrane2.position.set(side * 5.0, 2.8, -0.8);
      membrane2.rotation.y = side * 0.45;
      wg.add(membrane2);
      wg.position.set(side * 1.5, 6.1, 0.6);
      g.add(wg);
      return wg;
    }
    g.userData.wingL = makeWing(-1);
    g.userData.wingR = makeWing(1);

    // 龙尾：一根收细的锥体，不要一串珠子
    g.userData.body = [];
    g.userData.tail = [];
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.15, 9.2, 10), gold);
    tail.rotation.x = Math.PI / 2;
    add(tail, 0, 4.15, -7.4);
    g.userData.tail.push(tail);
    var tailUnder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.75, 8.4, 8), pale);
    tailUnder.rotation.x = Math.PI / 2;
    add(tailUnder, 0, 3.75, -7.3);
    var tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 6), hornM);
    tailTip.rotation.x = Math.PI / 2;
    add(tailTip, 0, 3.95, -12.4);
    var tailFin = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.6, 4), wingM);
    tailFin.rotation.x = Math.PI / 2;
    add(tailFin, 0, 4.55, -11.6, false);

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
