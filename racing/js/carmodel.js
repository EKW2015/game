/**
 * 程序化生成的低多边形超跑模型（车头朝 +X）。
 * 车身、座舱玻璃、大灯、尾灯、地灯、尾翼、氮气尾焰、可转向前轮。
 */
(function (global) {
  'use strict';

  var BODIES = {
    hatch: { len: 3.9, width: 1.78, height: 0.62, cabin: 0.62, cabinLen: 1.7, cabinShift: -0.15, spoiler: 0, nose: 0.86 },
    coupe: { len: 4.4, width: 1.86, height: 0.58, cabin: 0.56, cabinLen: 1.7, cabinShift: -0.3, spoiler: 0.1, nose: 0.8 },
    sport: { len: 4.6, width: 1.94, height: 0.52, cabin: 0.5, cabinLen: 1.6, cabinShift: -0.35, spoiler: 0.22, nose: 0.72 },
    muscle: { len: 4.8, width: 2.0, height: 0.66, cabin: 0.54, cabinLen: 1.8, cabinShift: -0.35, spoiler: 0.16, nose: 0.9 },
    super: { len: 4.7, width: 2.02, height: 0.46, cabin: 0.46, cabinLen: 1.5, cabinShift: -0.3, spoiler: 0.3, nose: 0.64 }
  };

  var cache = {};

  function geo(key, make) {
    if (!cache[key]) cache[key] = make();
    return cache[key];
  }

  /**
   * 上窄下宽的“梯形盒子”——低多边形车身全靠它撑起造型。
   * topX / topZ 为顶面相对底面的缩放。
   */
  function taperedBox(width, height, depth, topX, topZ, shiftTop) {
    var g = new THREE.BoxGeometry(width, height, depth);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) {
        pos.setX(i, pos.getX(i) * topX + (shiftTop || 0));
        pos.setZ(i, pos.getZ(i) * topZ);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  /** 车底假阴影用的径向渐变贴图 */
  function shadowTexture() {
    if (cache.shadowTex) return cache.shadowTex;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    var g = canvas.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    cache.shadowTex = new THREE.CanvasTexture(canvas);
    return cache.shadowTex;
  }

  function makeWheel(radius, rimColor) {
    var group = new THREE.Group();
    var tire = new THREE.Mesh(
      geo('tire' + radius.toFixed(2), function () {
        var g = new THREE.CylinderGeometry(radius, radius, 0.34, 18);
        g.rotateX(Math.PI / 2);
        return g;
      }),
      new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.85, metalness: 0.1 })
    );
    group.add(tire);

    var rim = new THREE.Mesh(
      geo('rim' + radius.toFixed(2), function () {
        var g = new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, 0.36, 12);
        g.rotateX(Math.PI / 2);
        return g;
      }),
      new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.25, metalness: 0.95, emissive: rimColor, emissiveIntensity: 0.18 })
    );
    group.add(rim);
    return group;
  }

  var CarModel = {
    bodies: BODIES,

    create: function (spec) {
      var shape = BODIES[spec.body] || BODIES.coupe;
      var color = spec.color === undefined ? 0xff2f6d : spec.color;
      var rimColor = spec.rimColor === undefined ? 0xb8c0cc : spec.rimColor;

      var group = new THREE.Group();
      var wheelR = 0.38;
      var bodyY = wheelR + 0.1;

      var paint = new THREE.MeshStandardMaterial({
        color: color, roughness: 0.28, metalness: 0.72,
        emissive: color, emissiveIntensity: 0.06
      });
      var dark = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.5, metalness: 0.6 });
      var glass = new THREE.MeshStandardMaterial({
        color: 0x0a1420, roughness: 0.08, metalness: 0.4,
        transparent: true, opacity: 0.82, emissive: 0x0d2436, emissiveIntensity: 0.4
      });

      // 主车身：上窄下宽
      var hull = new THREE.Mesh(
        taperedBox(shape.len * 0.94, shape.height, shape.width, 0.94, 0.86),
        paint
      );
      hull.position.y = bodyY + shape.height / 2;
      group.add(hull);

      // 车头：低矮前倾的楔形
      var nose = new THREE.Mesh(
        taperedBox(shape.len * 0.34, shape.height * 0.66, shape.width * shape.nose, 1.25, 1.12),
        paint
      );
      nose.position.set(shape.len * 0.55, bodyY + shape.height * 0.3, 0);
      nose.rotation.z = 0.06;
      group.add(nose);

      // 前唇 / 后扩散器
      var splitter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, shape.width * 0.92), dark);
      splitter.position.set(shape.len * 0.68, bodyY - 0.04, 0);
      group.add(splitter);

      var tail = new THREE.Mesh(new THREE.BoxGeometry(shape.len * 0.14, shape.height * 0.62, shape.width * 0.94), dark);
      tail.position.set(-shape.len * 0.53, bodyY + shape.height * 0.28, 0);
      group.add(tail);

      // 座舱：前挡风向后收，做出溜背
      var cabin = new THREE.Mesh(
        taperedBox(shape.cabinLen, shape.cabin, shape.width * 0.84, 0.6, 0.72, -shape.cabinLen * 0.12),
        glass
      );
      cabin.position.set(shape.cabinShift, bodyY + shape.height + shape.cabin / 2 - 0.05, 0);
      group.add(cabin);

      var roof = new THREE.Mesh(
        new THREE.BoxGeometry(shape.cabinLen * 0.5, 0.08, shape.width * 0.62),
        paint
      );
      roof.position.set(shape.cabinShift - shape.cabinLen * 0.14, bodyY + shape.height + shape.cabin - 0.06, 0);
      group.add(roof);

      // 轮眉：把车轮包进车身，避免“板子加四个圈”的感觉
      var axleX = shape.len * 0.33;
      [[axleX, 1], [axleX, -1], [-axleX, 1], [-axleX, -1]].forEach(function (pos) {
        var arch = new THREE.Mesh(
          taperedBox(wheelR * 2.5, shape.height * 0.92, 0.42, 0.72, 0.8),
          paint
        );
        arch.position.set(pos[0], bodyY + shape.height * 0.42, pos[1] * (shape.width * 0.5 - 0.04));
        group.add(arch);
      });

      // 侧裙 + 进气口
      [-1, 1].forEach(function (side) {
        var skirt = new THREE.Mesh(new THREE.BoxGeometry(shape.len * 0.5, 0.13, 0.16), dark);
        skirt.position.set(0, wheelR * 0.5, side * (shape.width * 0.5 + 0.02));
        group.add(skirt);

        var intake = new THREE.Mesh(new THREE.BoxGeometry(0.6, shape.height * 0.4, 0.12), dark);
        intake.position.set(-shape.len * 0.16, bodyY + shape.height * 0.55, side * (shape.width * 0.48));
        group.add(intake);
      });

      // 尾翼
      if (shape.spoiler > 0) {
        var wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, shape.width * 0.92), dark);
        wing.position.set(-shape.len * 0.48, bodyY + shape.height + shape.spoiler + 0.12, 0);
        group.add(wing);
        [-1, 1].forEach(function (side) {
          var stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, shape.spoiler + 0.12, 0.08), dark);
          stand.position.set(-shape.len * 0.48, bodyY + shape.height + (shape.spoiler + 0.12) / 2, side * shape.width * 0.34);
          group.add(stand);
        });
      }

      // 大灯
      var headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe8ff, emissiveIntensity: 2.6, roughness: 0.3 });
      [-1, 1].forEach(function (side) {
        var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.42), headMat);
        lamp.position.set(shape.len * 0.7, bodyY + shape.height * 0.42, side * shape.width * 0.3);
        group.add(lamp);
      });

      // 尾灯
      var tailMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1133, emissiveIntensity: 1.4 });
      [-1, 1].forEach(function (side) {
        var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), tailMat);
        lamp.position.set(-shape.len * 0.63, bodyY + shape.height * 0.62, side * shape.width * 0.28);
        group.add(lamp);
      });

      // 车底假阴影
      var shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture(), transparent: true, opacity: 0.55, depthWrite: false, color: 0x000000
      });
      var blob = new THREE.Mesh(new THREE.PlaneGeometry(shape.len * 1.25, shape.width * 1.7), shadowMat);
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.03;
      blob.renderOrder = -1;
      group.add(blob);

      // 车底霓虹
      var glowMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var glow = new THREE.Mesh(new THREE.PlaneGeometry(shape.len * 0.88, shape.width * 1.05), glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.06;
      group.add(glow);

      // 氮气尾焰
      var flames = [];
      var flameMat = new THREE.MeshBasicMaterial({
        color: 0x66ddff, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      [-1, 1].forEach(function (side) {
        var flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.1, 8), flameMat);
        flame.rotation.z = Math.PI / 2;
        flame.position.set(-shape.len * 0.62 - 0.5, bodyY + 0.14, side * shape.width * 0.22);
        flame.visible = false;
        group.add(flame);
        flames.push(flame);
      });

      // 车轮
      var wheels = [];
      var frontWheels = [];
      [[axleX, 1], [axleX, -1], [-axleX, 1], [-axleX, -1]].forEach(function (pos, i) {
        var wheel = makeWheel(wheelR, rimColor);
        wheel.position.set(pos[0], wheelR, pos[1] * (shape.width * 0.5 + 0.04));
        group.add(wheel);
        wheels.push(wheel);
        if (i < 2) frontWheels.push(wheel);
      });

      group.userData = {
        wheels: wheels,
        frontWheels: frontWheels,
        blob: blob,
        blobMat: shadowMat,
        paint: paint,
        tailMat: tailMat,
        glow: glowMat,
        flames: flames,
        flameMat: flameMat,
        shape: shape,
        wheelR: wheelR
      };
      return group;
    },

    /** 每帧把物理状态同步到模型上 */
    sync: function (group, car, time) {
      group.position.set(car.x, car.y, car.z);
      group.rotation.set(0, -car.angle, 0);
      group.rotateZ(car.pitch);
      group.rotateX(car.roll);

      var data = group.userData;
      for (var i = 0; i < data.wheels.length; i++) {
        data.wheels[i].rotation.z = -car.wheelSpin;
      }
      for (var j = 0; j < data.frontWheels.length; j++) {
        data.frontWheels[j].rotation.y = car.steerAngle * 0.8;
      }

      var braking = car.input.brake > 0.1 && car.vf > 0.5;
      data.tailMat.emissiveIntensity = braking ? 4.5 : 1.2;

      var boosting = car.nosActive;
      for (var k = 0; k < data.flames.length; k++) {
        data.flames[k].visible = boosting;
        if (boosting) {
          var wobble = 0.75 + Math.sin(time * 40 + k) * 0.25;
          data.flames[k].scale.set(wobble, 1 + wobble * 0.5, wobble);
        }
      }
      data.flameMat.color.setHex(boosting ? (Math.sin(time * 30) > 0 ? 0x66ddff : 0xaa66ff) : 0x66ddff);

      // 假阴影贴着地面：越高越淡越大
      var alt = Math.max(0, car.y - (car.groundH || 0));
      data.blob.position.y = 0.03 - alt;
      data.blob.scale.setScalar(1 + alt * 0.06);
      data.blobMat.opacity = 0.55 * Math.max(0, 1 - alt / 14);
      data.glow.opacity = 0.16 + car.driftAmount * 0.3 + (boosting ? 0.22 : 0);
    }
  };

  global.CarModel = CarModel;
})(window);
