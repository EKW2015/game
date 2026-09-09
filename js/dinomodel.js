/**
 * 斗罗大陆：3D光明圣龙模型与魂环、光翼、金龙鳞甲生成工厂
 */
(function (global) {
  'use strict';

  var U = global.Utils;

  function mat(opts) {
    return new THREE.MeshStandardMaterial(opts);
  }

  // 创建魂环组（7枚魂环：黄、紫、紫、黑、黑、黑、红）
  function createSoulRingsGroup(customColors) {
    var ringsGroup = new THREE.Group();
    ringsGroup.name = 'soulRings';

    var ringColors = customColors || U.SOUL_RING_COLORS;
    var ringEmissives = U.SOUL_RING_EMISSIVES;

    for (var i = 0; i < 7; i++) {
      var radius = 2.4 + i * 0.45;
      var tube = 0.08 + (i === 6 ? 0.05 : 0);
      var ringGeo = new THREE.TorusGeometry(radius, tube, 12, 36);
      var ringMat = new THREE.MeshStandardMaterial({
        color: ringColors[i],
        emissive: ringEmissives[i],
        emissiveIntensity: i === 6 ? 0.9 : 0.6,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.88
      });
      var ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.4 + i * 0.45;
      ringMesh.userData = {
        baseY: ringMesh.position.y,
        speed: 0.8 + i * 0.2,
        pulseSpeed: 1.5 + i * 0.3,
        ringIndex: i
      };
      ringsGroup.add(ringMesh);
    }
    return ringsGroup;
  }

  // 创建圣龙之翼（发光金光羽翼）
  function createHolyWings() {
    var wingsGroup = new THREE.Group();
    wingsGroup.name = 'holyWings';

    var wingMat = new THREE.MeshStandardMaterial({
      color: 0xffea88,
      emissive: 0xffaa00,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    // 左翼
    var leftWing = new THREE.Group();
    for (var i = 0; i < 4; i++) {
      var featherGeo = new THREE.ConeGeometry(0.35 - i * 0.04, 3.5 - i * 0.4, 5);
      var feather = new THREE.Mesh(featherGeo, wingMat);
      feather.rotation.z = Math.PI * 0.35 + i * 0.18;
      feather.position.set(-1.2 - i * 0.7, 1.2 - i * 0.2, -i * 0.3);
      feather.castShadow = true;
      leftWing.add(feather);
    }
    leftWing.position.set(-0.8, 3.2, -0.6);
    wingsGroup.add(leftWing);

    // 右翼
    var rightWing = new THREE.Group();
    for (var j = 0; j < 4; j++) {
      var featherGeoR = new THREE.ConeGeometry(0.35 - j * 0.04, 3.5 - j * 0.4, 5);
      var featherR = new THREE.Mesh(featherGeoR, wingMat);
      featherR.rotation.z = -(Math.PI * 0.35 + j * 0.18);
      featherR.position.set(1.2 + j * 0.7, 1.2 - j * 0.2, -j * 0.3);
      featherR.castShadow = true;
      rightWing.add(featherR);
    }
    rightWing.position.set(0.8, 3.2, -0.6);
    wingsGroup.add(rightWing);

    wingsGroup.userData = {
      leftWing: leftWing,
      rightWing: rightWing
    };
    return wingsGroup;
  }

  // 创建光明圣龙 3D 模型
  function createSacredDragonMesh(isAvatar) {
    var group = new THREE.Group();

    // 材质定义
    var scaleColor = isAvatar ? 0xfff2a0 : 0xe6b800; // 金光龙鳞
    var goldBellyColor = isAvatar ? 0xfffae0 : 0xffdc73;
    var emissiveColor = isAvatar ? 0xffaa00 : 0xcc8800;
    var emissiveIntensity = isAvatar ? 0.75 : 0.35;

    var dragonScaleMat = mat({
      color: scaleColor,
      roughness: 0.3,
      metalness: 0.6,
      emissive: emissiveColor,
      emissiveIntensity: emissiveIntensity
    });

    var dragonBellyMat = mat({
      color: goldBellyColor,
      roughness: 0.4,
      metalness: 0.3,
      emissive: emissiveColor,
      emissiveIntensity: emissiveIntensity * 0.6
    });

    var darkGoldMat = mat({
      color: 0x996600,
      roughness: 0.4,
      metalness: 0.7
    });

    var eyeGlowMat = mat({
      color: 0x00ffff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.0
    });

    var hornMat = mat({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xffcc33,
      emissiveIntensity: 0.5
    });

    // 1. 雄伟躯干
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 4.2, 12), dragonScaleMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 3.2, 0);
    torso.castShadow = true;
    group.add(torso);

    var belly = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), dragonBellyMat);
    belly.position.set(0, 2.6, 0.4);
    belly.scale.set(1.2, 0.8, 1.6);
    belly.castShadow = true;
    group.add(belly);

    // 2. 龙颈 (由下至上优雅弯曲)
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 2.8, 10), dragonScaleMat);
    neck.rotation.x = -0.55;
    neck.position.set(0, 4.6, 2.2);
    neck.castShadow = true;
    group.add(neck);

    // 3. 霸气龙头
    var headGroup = new THREE.Group();
    headGroup.position.set(0, 5.8, 3.5);

    var headSkull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 2.4), dragonScaleMat);
    headSkull.castShadow = true;
    headGroup.add(headSkull);

    var snout = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.2), dragonScaleMat);
    snout.position.set(0, -0.2, 1.8);
    snout.castShadow = true;
    headGroup.add(snout);

    // 下颚 (支持咬合动画)
    var jaw = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.0), darkGoldMat);
    jaw.position.set(0, -0.7, 1.7);
    headGroup.add(jaw);
    group.userData.jaw = jaw;

    // 龙须 (圣龙金须)
    var whiskerGeo = new THREE.CylinderGeometry(0.04, 0.08, 2.2, 6);
    var whiskerL = new THREE.Mesh(whiskerGeo, hornMat);
    whiskerL.rotation.z = 0.5;
    whiskerL.rotation.x = 0.4;
    whiskerL.position.set(-0.7, -0.5, 2.6);
    headGroup.add(whiskerL);

    var whiskerR = whiskerL.clone();
    whiskerR.rotation.z = -0.5;
    whiskerR.position.x = 0.7;
    headGroup.add(whiskerR);

    // 威严龙角 (一对破空巨角 + 侧副角)
    var mainHornGeo = new THREE.ConeGeometry(0.24, 2.6, 8);
    var hornL = new THREE.Mesh(mainHornGeo, hornMat);
    hornL.rotation.x = -0.8;
    hornL.rotation.z = -0.35;
    hornL.position.set(-0.75, 1.2, -0.6);
    hornL.castShadow = true;
    headGroup.add(hornL);

    var hornR = hornL.clone();
    hornR.rotation.z = 0.35;
    hornR.position.x = 0.75;
    headGroup.add(hornR);

    // 侧角
    var subHornGeo = new THREE.ConeGeometry(0.15, 1.4, 6);
    var subHornL = new THREE.Mesh(subHornGeo, hornMat);
    subHornL.rotation.x = -0.5;
    subHornL.rotation.z = -0.8;
    subHornL.position.set(-1.0, 0.6, -0.4);
    headGroup.add(subHornL);

    var subHornR = subHornL.clone();
    subHornR.rotation.z = 0.8;
    subHornR.position.x = 1.0;
    headGroup.add(subHornR);

    // 龙睛 (湛蓝极光神眸)
    var eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
    var eyeL = new THREE.Mesh(eyeGeo, eyeGlowMat);
    eyeL.position.set(-0.75, 0.25, 0.6);
    headGroup.add(eyeL);

    var eyeR = eyeL.clone();
    eyeR.position.x = 0.75;
    headGroup.add(eyeR);

    group.add(headGroup);
    group.userData.head = headGroup;

    // 4. 龙背脊刺 (金色神圣剑刺)
    for (var s = 0; s < 7; s++) {
      var spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1.2 - s * 0.1, 4),
        hornMat
      );
      spine.rotation.x = -0.3;
      spine.position.set(0, 4.2 - s * 0.18, 1.0 - s * 0.85);
      group.add(spine);
    }

    // 5. 圣龙巨尾 (流线多节，摆动自如)
    group.userData.tail = [];
    var tailSegments = 6;
    for (var t = 0; t < tailSegments; t++) {
      var progress = t / tailSegments;
      var segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          1.5 - progress * 1.1,
          1.7 - progress * 1.1,
          1.6,
          8
        ),
        dragonScaleMat
      );
      segMesh.rotation.x = Math.PI / 2;
      segMesh.position.set(0, 3.0 - progress * 0.6, -2.4 - t * 1.4);
      segMesh.castShadow = true;
      group.add(segMesh);
      group.userData.tail.push(segMesh);

      // 尾尖金刃 (圣龙尾刺)
      if (t === tailSegments - 1) {
        var tailBlade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.0, 4), hornMat);
        tailBlade.rotation.x = -Math.PI / 2;
        tailBlade.position.set(0, 0, -1.5);
        segMesh.add(tailBlade);
      }
    }

    // 6. 强悍四肢与龙爪 (前爪带撕裂金光)
    group.userData.legs = [];
    var legPositions = [
      [1.4, 1.2, 1.5, 'fl'],
      [-1.4, 1.2, 1.5, 'fr'],
      [1.3, 1.0, -1.2, 'bl'],
      [-1.3, 1.0, -1.2, 'br']
    ];

    for (var l = 0; l < legPositions.length; l++) {
      var lx = legPositions[l][0];
      var ly = legPositions[l][1];
      var lz = legPositions[l][2];

      var upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 2.2, 8), dragonScaleMat);
      upperLeg.position.set(lx, 2.4, lz);
      upperLeg.castShadow = true;
      group.add(upperLeg);

      var lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.0, 8), darkGoldMat);
      lowerLeg.position.set(lx * 1.05, 1.0, lz - 0.2);
      lowerLeg.castShadow = true;
      group.add(lowerLeg);

      // 龙爪 (三趾前爪 + 后趾)
      var footGroup = new THREE.Group();
      footGroup.position.set(lx * 1.05, 0.2, lz + 0.3);
      for (var clawIdx = -1; clawIdx <= 1; clawIdx++) {
        var claw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 4), hornMat);
        claw.rotation.x = Math.PI * 0.4;
        claw.rotation.y = clawIdx * 0.25;
        claw.position.set(clawIdx * 0.3, 0, 0.3);
        footGroup.add(claw);
      }
      group.add(footGroup);

      group.userData.legs.push({
        upper: upperLeg,
        lower: lowerLeg,
        foot: footGroup,
        baseX: lx,
        baseZ: lz
      });
    }

    // 7. 附带圣龙双翼
    var wings = createHolyWings();
    group.add(wings);
    group.userData.wings = wings;

    // 8. 圣龙脚底祥云金芒光环
    var auraRing = new THREE.Mesh(
      new THREE.RingGeometry(3.5, 4.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: isAvatar ? 0.75 : 0.4,
        side: THREE.DoubleSide
      })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.15;
    group.add(auraRing);
    group.userData.auraRing = auraRing;

    // 9. 金身护盾模型 (圣龙金身激活时显示)
    var goldenShield = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 24, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.45,
        wireframe: true
      })
    );
    goldenShield.position.set(0, 3.2, 0);
    goldenShield.visible = false;
    group.add(goldenShield);
    group.userData.goldenShield = goldenShield;

    group.userData.isAvatar = !!isAvatar;
    return group;
  }

  // 创建魂兽模型 (暗影邪魔虎、万年鳞甲兽、千钧蚁皇等)
  function createSoulBeastMesh(beastType) {
    var group = new THREE.Group();

    // 默认为暗夜魔虎/凶暴魂兽造型
    var bodyColor = 0x332244;
    var eyeColor = 0xff2222;
    var stripeColor = 0x8833aa;

    if (beastType === 'tiger') { // 暗魔邪神虎
      bodyColor = 0x221133;
      eyeColor = 0xff0044;
      stripeColor = 0xaa22bb;
    } else if (beastType === 'bear') { // 暗金恐爪熊
      bodyColor = 0x4a3622;
      eyeColor = 0xffaa00;
      stripeColor = 0xd4a017;
    } else if (beastType === 'ape') { // 泰坦巨猿
      bodyColor = 0x2a2a2e;
      eyeColor = 0xff6600;
      stripeColor = 0x665544;
    }

    var beastSkin = mat({ color: bodyColor, roughness: 0.7, metalness: 0.2 });
    var beastStripe = mat({ color: stripeColor, roughness: 0.5, metalness: 0.4 });
    var beastEye = mat({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8 });

    // 兽躯
    var torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 4.2), beastSkin);
    torso.position.set(0, 2.5, 0);
    torso.castShadow = true;
    group.add(torso);

    // 兽头
    var head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 2.2), beastSkin);
    head.position.set(0, 3.4, 2.6);
    head.castShadow = true;
    group.add(head);

    // 兽吻
    var muzzle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.4), beastStripe);
    muzzle.position.set(0, 3.0, 3.8);
    group.add(muzzle);

    // 獠牙
    var fangGeo = new THREE.ConeGeometry(0.14, 0.8, 4);
    var fangL = new THREE.Mesh(fangGeo, mat({ color: 0xffffff, roughness: 0.2 }));
    fangL.position.set(-0.4, 2.6, 4.0);
    fangL.rotation.x = Math.PI;
    group.add(fangL);

    var fangR = fangL.clone();
    fangR.position.x = 0.4;
    group.add(fangR);

    // 邪眸
    var eyeGeo = new THREE.SphereGeometry(0.18, 6, 6);
    var eyeL = new THREE.Mesh(eyeGeo, beastEye);
    eyeL.position.set(-0.6, 3.7, 3.3);
    group.add(eyeL);

    var eyeR = eyeL.clone();
    eyeR.position.x = 0.6;
    group.add(eyeR);

    // 尖耳
    var earGeo = new THREE.ConeGeometry(0.25, 0.8, 4);
    var earL = new THREE.Mesh(earGeo, beastSkin);
    earL.position.set(-0.7, 4.4, 2.2);
    group.add(earL);

    var earR = earL.clone();
    earR.position.x = 0.7;
    group.add(earR);

    // 兽足
    group.userData.legs = [];
    var legCoords = [
      [1.0, 1.2, 1.4],
      [-1.0, 1.2, 1.4],
      [1.0, 1.2, -1.4],
      [-1.0, 1.2, -1.4]
    ];
    for (var k = 0; k < legCoords.length; k++) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 2.2, 6), beastSkin);
      leg.position.set(legCoords[k][0], 1.1, legCoords[k][2]);
      leg.castShadow = true;
      group.add(leg);
      group.userData.legs.push({ upper: leg });
    }

    // 兽尾
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 3.0, 6), beastStripe);
    tail.rotation.x = -Math.PI / 3;
    tail.position.set(0, 2.6, -2.8);
    group.add(tail);

    // 魂兽头顶年份光环(千年紫/万年黑/十万年红)
    var beastRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.08, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0xaa22bb,
        emissive: 0xaa22bb,
        emissiveIntensity: 0.6
      })
    );
    beastRing.rotation.x = Math.PI / 2;
    beastRing.position.set(0, 5.0, 0);
    group.add(beastRing);
    group.userData.beastRing = beastRing;

    var beastShield = new THREE.Mesh(
      new THREE.SphereGeometry(4.0, 16, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      })
    );
    beastShield.position.y = 2.5;
    beastShield.visible = false;
    group.add(beastShield);
    group.userData.goldenShield = beastShield;

    return group;
  }

  function tintMat(color, emissive, intensity) {
    return mat({
      color: color,
      roughness: 0.45,
      metalness: 0.35,
      emissive: emissive || 0x000000,
      emissiveIntensity: intensity || 0
    });
  }

  function addFootAura(group, color) {
    var aura = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.45, 24),
      new THREE.MeshBasicMaterial({
        color: color || 0xffd700,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide
      })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.08;
    group.add(aura);
  }

  function addGoldenShield(group, radius, y) {
    var goldenShield = new THREE.Mesh(
      new THREE.SphereGeometry(radius || 2.4, 16, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffe066,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      })
    );
    goldenShield.position.y = y != null ? y : 2.2;
    goldenShield.visible = false;
    group.add(goldenShield);
    group.userData.goldenShield = goldenShield;
  }

  // 魂师人形：头、发、衣、双臂双腿。武魂只作为兵器/法器，不直接变成魂兽。
  function createHumanoidBase(opts) {
    opts = opts || {};
    var cloth = opts.cloth != null ? opts.cloth : 0x3a4a5a;
    var accent = opts.accent != null ? opts.accent : 0x8a7a4a;
    var hairCol = opts.hair != null ? opts.hair : 0x1a120c;
    var skinCol = opts.skin != null ? opts.skin : 0xe0b090;
    var group = new THREE.Group();
    var skinM = tintMat(skinCol);
    var clothM = tintMat(cloth, opts.emissive, opts.emissiveInt);
    var accentM = tintMat(accent);
    var hairM = tintMat(hairCol);
    var bootM = tintMat(0x1c1c22);

    var hips = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.38, 8), clothM);
    hips.position.y = 1.52;
    group.add(hips);

    group.userData.legs = [];
    [[-0.26, 0], [0.26, 0]].forEach(function (p) {
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.82, 6), clothM);
      upper.position.set(p[0], 1.04, 0);
      upper.castShadow = true;
      group.add(upper);
      var boot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.68, 6), bootM);
      boot.position.set(p[0], 0.36, 0.04);
      group.add(boot);
      group.userData.legs.push({ upper: upper });
    });

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.52, 1.28, 8), clothM);
    torso.position.y = 2.3;
    torso.castShadow = true;
    group.add(torso);

    var chest = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.42), accentM);
    chest.position.set(0, 2.5, 0.16);
    group.add(chest);

    var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.12, 6), clothM);
    armL.rotation.z = 0.2;
    armL.position.set(-0.6, 2.18, 0);
    group.add(armL);
    var armR = armL.clone();
    armR.rotation.z = -0.2;
    armR.position.x = 0.6;
    group.add(armR);
    group.userData.armL = armL;
    group.userData.armR = armR;

    var handL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), skinM);
    handL.position.set(-0.76, 1.62, 0.06);
    group.add(handL);
    var handR = handL.clone();
    handR.position.x = 0.76;
    group.add(handR);
    group.userData.handL = handL;
    group.userData.handR = handR;

    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 6), skinM);
    neck.position.y = 3.06;
    group.add(neck);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), skinM);
    head.position.y = 3.44;
    head.castShadow = true;
    group.add(head);

    var hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), hairM);
    hairCap.position.y = 3.56;
    hairCap.scale.set(1.08, 0.58, 1.08);
    group.add(hairCap);

    if (opts.hairStyle === 'long') {
      var hairBack = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.35, 6), hairM);
      hairBack.position.set(0, 2.62, -0.22);
      hairBack.rotation.x = 0.22;
      group.add(hairBack);
    } else if (opts.hairStyle === 'tail') {
      var ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.05, 6), hairM);
      ponytail.rotation.x = 0.55;
      ponytail.position.set(0, 3.12, -0.42);
      group.add(ponytail);
    }

    var eyeM = tintMat(0x1a1a22);
    var eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), eyeM);
    eyeL.position.set(-0.11, 3.44, 0.3);
    group.add(eyeL);
    var eyeR = eyeL.clone();
    eyeR.position.x = 0.11;
    group.add(eyeR);

    addGoldenShield(group, 2.35, 2.15);
    addFootAura(group, opts.aura || 0xffd700);
    if (opts.uniform === 'male' || opts.uniform === 'female') {
      applyPlatinumUniform(group, opts.uniform);
    }
    return group;
  }

  function applyPlatinumUniform(group, style) {
    var plat = tintMat(0xf4f0e6, 0xfff6d8, 0.2);
    var gold = tintMat(0xd4af37, 0xffcc55, 0.55);
    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 6, 16), gold);
    collar.position.y = 2.98;
    collar.rotation.x = Math.PI / 2;
    group.add(collar);

    if (style === 'male') {
      var robe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.9, 10), plat);
      robe.position.y = 1.12;
      group.add(robe);
      if (group.userData.handL) {
        var cuffL = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 6, 10), gold);
        cuffL.position.copy(group.userData.handL.position);
        cuffL.position.y += 0.16;
        group.add(cuffL);
        var cuffR = cuffL.clone();
        cuffR.position.x = group.userData.handR.position.x;
        group.add(cuffR);
      }
      var badge = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), gold);
      badge.position.set(0, 2.52, -0.44);
      badge.rotation.y = Math.PI;
      group.add(badge);
      var mark = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 5), tintMat(0xffe066, 0xffaa00, 0.85));
      mark.position.set(0, 2.58, -0.48);
      group.add(mark);
    } else {
      var skirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.4, 1.18, 12),
        new THREE.MeshStandardMaterial({
          color: 0xf4f0e6,
          roughness: 0.32,
          metalness: 0.48,
          emissive: 0xfff6d8,
          emissiveIntensity: 0.22,
          transparent: true,
          opacity: 0.93
        })
      );
      skirt.position.y = 1.04;
      group.add(skirt);
      group.userData.streamers = [];
      for (var i = 0; i < 5; i++) {
        var ang = i * 1.256;
        var st = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 1.4),
          new THREE.MeshBasicMaterial({
            color: 0xfff2aa,
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide
          })
        );
        st.position.set(Math.cos(ang) * 0.58, 0.52, Math.sin(ang) * 0.58);
        group.add(st);
        group.userData.streamers.push(st);
      }
    }
  }

  function createSoulMasterMesh(kind, look) {
    look = look || {};
    var uni = look.uniform;
    var plat = uni ? {
      cloth: 0xf4f0e6,
      accent: 0xd4af37,
      uniform: uni,
      emissive: 0xfff6d8,
      emissiveInt: 0.16
    } : {};
    var group;
    if (kind === 'dragon') {
      group = createHumanoidBase(Object.assign({
        cloth: 0xc9a227, accent: 0xffe066, hair: 0x3a2208, aura: 0xffd700
      }, plat));
      var claw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.15, 5), tintMat(0xfff2a0, 0xffaa00, 0.7));
      claw.rotation.x = 1.15;
      claw.position.set(0.92, 1.55, 0.55);
      group.add(claw);
      var claw2 = claw.clone();
      claw2.position.x = 0.72;
      claw2.rotation.y = 0.25;
      group.add(claw2);
    } else if (kind === 'assassin') {
      group = createHumanoidBase(Object.assign({
        cloth: 0x1a1028, accent: 0x442266, hair: 0x0a0610, hairStyle: 'tail', aura: 0x8866ff
      }, plat));
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.7), tintMat(0x8866ff, 0x4422aa, 0.65));
      blade.position.set(0.86, 1.7, 0.7);
      group.add(blade);
      var blade2 = blade.clone();
      blade2.position.set(-0.86, 1.7, 0.55);
      group.add(blade2);
    } else if (kind === 'phoenix') {
      group = createHumanoidBase(Object.assign({
        cloth: 0xaa2200, accent: 0xffaa33, hair: 0x4a0a00, hairStyle: 'long', aura: 0xff4400
      }, plat));
      var fan = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.12, 8), tintMat(0xff6622, 0xff2200, 0.7));
      fan.rotation.x = 1.2;
      fan.position.set(0.9, 1.72, 0.35);
      group.add(fan);
    } else if (kind === 'ice') {
      group = createHumanoidBase(Object.assign({
        cloth: 0x88ccee, accent: 0xccffff, hair: 0xddeeff, hairStyle: 'long', skin: 0xf0d8c8, aura: 0x66eeff
      }, plat));
      var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), tintMat(0x88eeff, 0x2288ff, 0.5));
      staff.position.set(0.82, 2.15, 0.2);
      group.add(staff);
      var bud = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), tintMat(0x66eeff, 0x2288ff, 0.85));
      bud.position.set(0.82, 3.3, 0.2);
      group.add(bud);
    } else if (kind === 'mammoth') {
      group = createHumanoidBase(Object.assign({
        cloth: 0x8a6a22, accent: 0xd4a017, hair: 0x2a1a08, aura: 0xd4a017
      }, plat));
      var gaunt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.5), tintMat(0xc9a227, 0xaa7700, 0.25));
      gaunt.position.set(0.86, 1.62, 0.18);
      group.add(gaunt);
    } else if (kind === 'lamp') {
      group = createHumanoidBase(Object.assign({
        cloth: 0x6644aa, accent: 0xffcc66, hair: 0x221133, hairStyle: 'long', aura: 0xffaa33
      }, plat));
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), tintMat(0xffaa33, 0xff6600, 0.95));
      lamp.position.set(-0.78, 1.85, 0.22);
      group.add(lamp);
    } else if (kind === 'bird') {
      group = createHumanoidBase(Object.assign({
        cloth: 0x228844, accent: 0x88ffaa, hair: 0xf5e6c8, hairStyle: 'long', aura: 0x66ff99
      }, plat));
      var wand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.8, 6), tintMat(0x66ff99, 0x22aa44, 0.45));
      wand.position.set(0.82, 2.05, 0.18);
      group.add(wand);
      var gem = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), tintMat(0x88ffcc, 0x33ff88, 0.9));
      gem.position.set(0.82, 3.0, 0.18);
      group.add(gem);
    } else {
      group = createHumanoidBase(Object.assign({ cloth: 0x4a4038, accent: 0x6a5a4a }, plat));
    }
    return group;
  }

  function createPhoenixBeast() {
    var group = new THREE.Group();
    var fireM = tintMat(0xff4400, 0xff2200, 0.75);
    var goldM = tintMat(0xffcc44, 0xff8800, 0.55);
    var body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), fireM);
    body.scale.set(1.0, 0.85, 1.45);
    body.position.y = 2.4;
    body.castShadow = true;
    group.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), goldM);
    head.position.set(0, 3.15, 1.55);
    group.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 6), tintMat(0xffee88));
    beak.rotation.x = 1.2;
    beak.position.set(0, 3.0, 2.15);
    group.add(beak);
    var wingL = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 6), fireM);
    wingL.rotation.z = 1.15;
    wingL.position.set(-1.7, 2.7, -0.2);
    group.add(wingL);
    var wingR = wingL.clone();
    wingR.rotation.z = -1.15;
    wingR.position.x = 1.7;
    group.add(wingR);
    group.userData.wings = { userData: { leftWing: wingL, rightWing: wingR } };
    var tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 6), goldM);
    tail.rotation.x = 1.15;
    tail.position.set(0, 1.6, -2.1);
    group.add(tail);
    group.userData.tail = [tail];
    group.userData.legs = [];
    [[-0.35, 0.7], [0.35, 0.7]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.3, 6), goldM);
      leg.position.set(p[0], 0.7, 0.4);
      group.add(leg);
      group.userData.legs.push({ upper: leg });
    });
    addGoldenShield(group, 3.4, 2.4);
    return group;
  }

  function createIceSerpent() {
    var group = new THREE.Group();
    var iceM = tintMat(0x88eeff, 0x2288ff, 0.7);
    group.userData.tail = [];
    for (var i = 0; i < 6; i++) {
      var seg = new THREE.Mesh(new THREE.SphereGeometry(0.7 - i * 0.08, 8, 8), iceM);
      seg.position.set(0, 1.4 + i * 0.15, 1.6 - i * 0.85);
      group.add(seg);
      group.userData.tail.push(seg);
    }
    var head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 6), iceM);
    head.rotation.x = 1.2;
    head.position.set(0, 2.2, 2.4);
    group.add(head);
    var crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), tintMat(0xccffff, 0x66ddff, 0.9));
    crystal.position.set(0, 3.6, 0.2);
    group.add(crystal);
    group.userData.legs = [];
    addGoldenShield(group, 3.0, 2.0);
    return group;
  }

  function createMammothBeast() {
    var group = new THREE.Group();
    var torso = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 3.6), tintMat(0xd4a017, 0xaa7700, 0.2));
    torso.position.y = 2.4;
    torso.castShadow = true;
    group.add(torso);
    var head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), tintMat(0xc9a227));
    head.position.set(0, 3.4, 2.2);
    group.add(head);
    var tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.6, 6), tintMat(0xfff4d2));
    tuskL.rotation.x = 2.4;
    tuskL.position.set(-0.6, 2.4, 2.8);
    group.add(tuskL);
    var tuskR = tuskL.clone();
    tuskR.position.x = 0.6;
    group.add(tuskR);
    group.userData.legs = [];
    [[-0.9, 1.1], [0.9, 1.1], [-0.9, -1.1], [0.9, -1.1]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 2.0, 8), tintMat(0xb8860b));
      leg.position.set(p[0], 1.0, p[1]);
      group.add(leg);
      group.userData.legs.push({ upper: leg });
    });
    addGoldenShield(group, 4.2, 2.6);
    return group;
  }

  function createLampSpirit() {
    var group = new THREE.Group();
    var core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 12), tintMat(0xffaa33, 0xff6600, 1.0));
    core.position.y = 2.4;
    group.add(core);
    var shade = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 8), tintMat(0x6644aa, 0xaa66ff, 0.45));
    shade.position.y = 3.5;
    group.add(shade);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8), tintMat(0xffcc66));
    base.position.y = 1.4;
    group.add(base);
    group.userData.legs = [];
    addGoldenShield(group, 3.2, 2.4);
    return group;
  }

  function createJadeBird() {
    var group = new THREE.Group();
    var feather = tintMat(0x33cc66, 0x22aa44, 0.55);
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), feather);
    body.scale.set(1.0, 0.85, 1.35);
    body.position.y = 2.2;
    body.castShadow = true;
    group.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), tintMat(0x88ffaa, 0x44dd77, 0.4));
    head.position.set(0, 2.85, 1.2);
    group.add(head);
    var wingL = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 6), feather);
    wingL.rotation.z = 1.05;
    wingL.position.set(-1.4, 2.4, -0.15);
    group.add(wingL);
    var wingR = wingL.clone();
    wingR.rotation.z = -1.05;
    wingR.position.x = 1.4;
    group.add(wingR);
    group.userData.wings = { userData: { leftWing: wingL, rightWing: wingR } };
    group.userData.legs = [];
    [[-0.25, 0.55], [0.25, 0.55]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 5), tintMat(0x226633));
      leg.position.set(p[0], 0.6, 0.25);
      group.add(leg);
      group.userData.legs.push({ upper: leg });
    });
    addGoldenShield(group, 2.8, 2.2);
    return group;
  }

  function createTrueFormMesh(kind) {
    if (kind === 'dragon') return createSacredDragonMesh(true);
    if (kind === 'assassin') return createSoulBeastMesh('tiger');
    if (kind === 'phoenix') return createPhoenixBeast();
    if (kind === 'ice') return createIceSerpent();
    if (kind === 'mammoth') return createMammothBeast();
    if (kind === 'lamp') return createLampSpirit();
    if (kind === 'bird') return createJadeBird();
    return createSoulBeastMesh('tiger');
  }

  function createFighterMesh(kind) {
    return createSoulMasterMesh(kind);
  }

  global.DinoModel = {
    createSacredDragonMesh: createSacredDragonMesh,
    createSoulRingsGroup: createSoulRingsGroup,
    createHolyWings: createHolyWings,
    createSoulBeastMesh: createSoulBeastMesh,
    createSoulMasterMesh: createSoulMasterMesh,
    createTrueFormMesh: createTrueFormMesh,
    createFighterMesh: createFighterMesh,
    create: function () {
      return createSoulMasterMesh('dragon');
    }
  };
})(window);
