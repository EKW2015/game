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
  function createSoulRingsGroup() {
    var ringsGroup = new THREE.Group();
    ringsGroup.name = 'soulRings';

    var ringColors = U.SOUL_RING_COLORS;
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

    return group;
  }

  global.DinoModel = {
    createSacredDragonMesh: createSacredDragonMesh,
    createSoulRingsGroup: createSoulRingsGroup,
    createHolyWings: createHolyWings,
    createSoulBeastMesh: createSoulBeastMesh,
    create: function () {
      return createSacredDragonMesh(false);
    }
  };
})(window);
