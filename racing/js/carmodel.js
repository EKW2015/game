/**
 * 夜城飙车 - 低多边形跑车模型（THREE）
 */
(function (global) {
  'use strict';

  var sharedWheel = null;
  var sharedRim = null;

  /** 把方盒前端收窄下压，做出楔形跑车轮廓 */
  function wedgeBox(w, h, l, taper, drop) {
    var g = new THREE.BoxGeometry(w, h, l);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i);
      var y = p.getY(i);
      var z = p.getZ(i);
      var t = (z / (l / 2) + 1) / 2;
      if (y > 0) {
        p.setX(i, x * (1 - taper * t));
        p.setY(i, y - h * drop * t);
      } else {
        p.setX(i, x * (1 - taper * 0.35 * t));
      }
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  function wheelGeometries() {
    if (!sharedWheel) {
      sharedWheel = new THREE.CylinderGeometry(0.37, 0.37, 0.28, 16);
      sharedWheel.rotateZ(Math.PI / 2);
      sharedRim = new THREE.CylinderGeometry(0.21, 0.21, 0.3, 12);
      sharedRim.rotateZ(Math.PI / 2);
    }
    return { tire: sharedWheel, rim: sharedRim };
  }

  function makeWheel(rimColor) {
    var geos = wheelGeometries();
    var group = new THREE.Group();
    var tire = new THREE.Mesh(geos.tire, new THREE.MeshStandardMaterial({
      color: 0x14161c, roughness: 0.9, metalness: 0.1
    }));
    var rim = new THREE.Mesh(geos.rim, new THREE.MeshStandardMaterial({
      color: rimColor || 0xb9c2d0, roughness: 0.35, metalness: 0.85,
      emissive: 0x223344, emissiveIntensity: 0.35
    }));
    group.add(tire);
    group.add(rim);
    group.userData.spinner = tire;
    group.userData.rim = rim;
    return group;
  }

  /**
   * 创建一辆车。opts: { color, accent, player }
   * 车头朝向模型局部 +Z。
   */
  function create(opts) {
    opts = opts || {};
    var paint = opts.color == null ? 0xd8264f : opts.color;
    var accent = opts.accent == null ? 0x36e2ff : opts.accent;

    var car = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({
      color: paint, roughness: 0.32, metalness: 0.55
    });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x0d0f14, roughness: 0.6, metalness: 0.3 });
    var glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1420, roughness: 0.12, metalness: 0.9,
      emissive: 0x0a1a2a, emissiveIntensity: 0.6
    });

    var body = new THREE.Mesh(wedgeBox(1.92, 0.62, 4.5, 0.20, 0.34), bodyMat);
    body.position.y = 0.66;
    car.add(body);

    var skirt = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.26, 3.9), darkMat);
    skirt.position.y = 0.36;
    car.add(skirt);

    var cabin = new THREE.Mesh(wedgeBox(1.6, 0.52, 2.05, 0.22, 0.30), glassMat);
    cabin.position.set(0, 1.15, -0.1);
    car.add(cabin);

    var roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.1, 1.1), bodyMat);
    roof.position.set(0, 1.42, -0.45);
    car.add(roof);

    // 尾翼
    var wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.42), darkMat);
    wing.position.set(0, 1.16, -2.16);
    car.add(wing);
    for (var s = -1; s <= 1; s += 2) {
      var stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.12), darkMat);
      stand.position.set(s * 0.7, 1.0, -2.1);
      car.add(stand);
    }

    // 车灯
    var headMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 2.6, roughness: 0.3
    });
    var tailMat = new THREE.MeshStandardMaterial({
      color: 0x330008, emissive: 0xff1f3c, emissiveIntensity: 1.4, roughness: 0.4
    });
    for (var h = -1; h <= 1; h += 2) {
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.1), headMat);
      head.position.set(h * 0.58, 0.72, 2.24);
      car.add(head);
    }
    var tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.08), tailMat);
    tail.position.set(0, 0.86, -2.27);
    car.add(tail);

    // 侧身霓虹条，夜里更好看
    var stripMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 });
    for (var g2 = -1; g2 <= 1; g2 += 2) {
      var strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 3.0), stripMat);
      strip.position.set(g2 * 1.0, 0.5, -0.1);
      car.add(strip);
    }

    // 车轮
    var wheels = [];
    var positions = [
      { x: -0.94, z: 1.42, front: true },
      { x: 0.94, z: 1.42, front: true },
      { x: -0.99, z: -1.5, front: false },
      { x: 0.99, z: -1.5, front: false }
    ];
    for (var i = 0; i < positions.length; i++) {
      var holder = new THREE.Group();
      holder.position.set(positions[i].x, 0.37, positions[i].z);
      var wheel = makeWheel(opts.player ? accent : 0x8f98a6);
      holder.add(wheel);
      holder.userData.front = positions[i].front;
      holder.userData.wheel = wheel;
      car.add(holder);
      wheels.push(holder);
    }

    car.userData.wheels = wheels;
    car.userData.tailMat = tailMat;
    car.userData.headMat = headMat;
    car.userData.bodyMat = bodyMat;

    if (opts.player) {
      // 车底霓虹光晕
      var glow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 6.2),
        new THREE.MeshBasicMaterial({
          color: accent, transparent: true, opacity: 0.34,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.06;
      car.add(glow);
      car.userData.underglow = glow;

      // 氮气尾焰
      var flames = [];
      for (var f = -1; f <= 1; f += 2) {
        var flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.18, 1.5, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0x66ddff, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        flame.rotation.x = Math.PI / 2;
        flame.position.set(f * 0.42, 0.42, -2.9);
        flame.visible = false;
        car.add(flame);
        flames.push(flame);
      }
      car.userData.flames = flames;
    }

    return car;
  }

  global.CarModel = { create: create, wedgeBox: wedgeBox };
})(window);
