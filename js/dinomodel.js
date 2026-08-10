/**
 * 真实感 3D 恐龙模型工厂（T-Rex 风格）。
 */
(function (global) {
  'use strict';

  function hex(h) {
    return parseInt(h.replace('#', ''), 16);
  }

  function mat(color, roughness) {
    return new THREE.MeshStandardMaterial({
      color: hex(color),
      roughness: roughness == null ? 0.72 : roughness,
      metalness: 0.04
    });
  }

  function createRealisticDino(colors) {
    var group = new THREE.Group();
    var skin = mat(colors.body);
    var belly = mat(colors.belly, 0.82);
    var dark = mat(colors.eye, 0.65);
    var claw = mat('#2a2a2a', 0.5);

    // 躯干
    var torso = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 3.8), skin);
    torso.position.set(0, 2.8, 0);
    torso.castShadow = true;
    group.add(torso);

    var chest = new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 10), belly);
    chest.position.set(0, 2.4, 0.4);
    chest.scale.set(1.4, 0.9, 1.5);
    chest.castShadow = true;
    group.add(chest);

    // 骨盆
    var pelvis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 2.2), skin);
    pelvis.position.set(0, 2.5, -1.4);
    pelvis.castShadow = true;
    group.add(pelvis);

    // 颈
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 1.8, 10), skin);
    neck.rotation.x = -0.45;
    neck.position.set(0, 3.6, 1.8);
    neck.castShadow = true;
    group.add(neck);

    // 头
    var head = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.25, 2.4), skin);
    head.position.set(0, 4.25, 3.1);
    head.castShadow = true;
    group.add(head);
    group.userData.head = head;

    var snout = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.75, 1.8), skin);
    snout.position.set(0, 4.05, 4.35);
    snout.castShadow = true;
    group.add(snout);

    var jaw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.7), dark);
    jaw.position.set(0, 3.75, 4.25);
    group.add(jaw);
    group.userData.jaw = jaw;

    // 牙（简化）
    for (var ti = 0; ti < 5; ti++) {
      var tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), new THREE.MeshStandardMaterial({ color: 0xf0f0e8 }));
      tooth.position.set(-0.35 + ti * 0.18, 3.62, 4.9 + ti * 0.05);
      group.add(tooth);
    }

    // 眼
    var eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    eyeW.position.set(0.48, 4.55, 3.85);
    group.add(eyeW);
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), dark);
    eye.position.set(0.52, 4.55, 3.95);
    group.add(eye);

    // 小臂
    var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 6), skin);
    armL.rotation.z = 0.8;
    armL.position.set(-1.05, 3.0, 1.2);
    group.add(armL);
    var armR = armL.clone();
    armR.position.x = 1.05;
    armR.rotation.z = -0.8;
    group.add(armR);

    // 尾巴（多节，更真实）
    group.userData.tail = [];
    var tailLen = 5;
    for (var i = 0; i < tailLen; i++) {
      var t = i / tailLen;
      var seg = new THREE.Mesh(
        new THREE.SphereGeometry(1.1 - t * 0.85, 10, 8),
        skin
      );
      seg.scale.set(1.1 - t * 0.3, 0.75 - t * 0.2, 1.3 - t * 0.5);
      seg.position.set(0, 2.6 - t * 0.3, -2.6 - i * 1.35);
      seg.castShadow = true;
      group.add(seg);
      group.userData.tail.push(seg);
    }

    // 四条粗腿
    group.userData.legs = [];
    var legPos = [
      [0.95, 0, 1.1, 'fl'],
      [-0.95, 0, 1.1, 'fr'],
      [0.85, 0, -1.0, 'bl'],
      [-0.85, 0, -1.0, 'br']
    ];
    for (var li = 0; li < legPos.length; li++) {
      var lx = legPos[li][0];
      var lz = legPos[li][2];
      var upper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.6, 10), skin);
      upper.position.set(lx, 1.6, lz);
      upper.castShadow = true;
      group.add(upper);

      var lower = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.5, 10), skin);
      lower.position.set(lx, 0.55, lz + 0.15);
      lower.castShadow = true;
      group.add(lower);

      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.85), claw);
      foot.position.set(lx, 0.12, lz + 0.35);
      foot.castShadow = true;
      group.add(foot);

      group.userData.legs.push({ upper: upper, lower: lower, foot: foot });
    }

    return group;
  }

  global.DinoModel = { create: createRealisticDino, hex: hex };
})(window);
