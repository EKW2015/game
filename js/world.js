/**
 * 斗罗大陆：斗罗大森林与圣龙主迹领域生成
 */
(function (global) {
  'use strict';

  var CHUNK_SIZE = 480;

  function seeded(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function hashChunk(cx, cz) {
    return ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
  }

  function World(scene) {
    this.scene = scene;
    this.chunks = new Map();

    // 斗罗古老森林地貌材质
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x24422b,
      roughness: 0.9,
      metalness: 0.05
    });

    // 灵草仙草材质
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x3d7045,
      roughness: 0.95
    });

    // 古树躯干
    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x382212,
      roughness: 0.88
    });

    // 茂盛树冠
    this.leafMat = new THREE.MeshStandardMaterial({
      color: 0x1f5c2b,
      roughness: 0.82
    });

    // 魂力矿石/岩石 (略带荧光)
    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x484252,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x221a33,
      emissiveIntensity: 0.2
    });

    // 仙草/圣龙灵药材质 (金色发光草)
    this.holyHerbMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });

    // 圣龙主迹领域特效物体 (十万年·方圆千米化为金色世界)
    this.domainGroup = new THREE.Group();
    this.domainGroup.visible = false;
    this.scene.add(this.domainGroup);

    // 领域金色穹顶光幕
    var domeGeo = new THREE.SphereGeometry(300, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
    var domeMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      wireframe: true
    });
    this.domainDome = new THREE.Mesh(domeGeo, domeMat);
    this.domainGroup.add(this.domainDome);

    // 领域地面金色圣龙符文阵
    var arrayGeo = new THREE.RingGeometry(20, 290, 48);
    var arrayMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.domainArray = new THREE.Mesh(arrayGeo, arrayMat);
    this.domainArray.rotation.x = -Math.PI / 2;
    this.domainArray.position.y = 0.5;
    this.domainGroup.add(this.domainArray);

    // 领域神圣光柱
    for (var p = 0; p < 8; p++) {
      var pillarGeo = new THREE.CylinderGeometry(1.5, 2.5, 80, 8);
      var pillarMat = new THREE.MeshBasicMaterial({
        color: 0xffe680,
        transparent: true,
        opacity: 0.4
      });
      var pillar = new THREE.Mesh(pillarGeo, pillarMat);
      var pAngle = (p / 8) * Math.PI * 2;
      pillar.position.set(Math.cos(pAngle) * 160, 40, Math.sin(pAngle) * 160);
      this.domainGroup.add(pillar);
    }
  }

  World.prototype.setDomainActive = function (active, centerX, centerZ) {
    this.domainGroup.visible = active;
    if (active) {
      this.domainGroup.position.set(centerX, 0, centerZ);
      this.groundMat.emissive.setHex(0x553d00);
      this.groundMat.emissiveIntensity = 0.45;
    } else {
      this.groundMat.emissive.setHex(0x000000);
      this.groundMat.emissiveIntensity = 0;
    }
  };

  World.prototype.updateDomainAnim = function (dt) {
    if (this.domainGroup.visible) {
      this.domainDome.rotation.y += dt * 0.15;
      this.domainArray.rotation.z += dt * 0.1;
    }
  };

  World.prototype.key = function (cx, cz) {
    return cx + ',' + cz;
  };

  World.prototype.heightAt = function (x, z) {
    return (
      Math.sin(x * 0.003) * Math.cos(z * 0.003) * 10 +
      Math.sin(x * 0.01 + 1.2) * Math.sin(z * 0.008) * 4
    );
  };

  World.prototype.buildChunk = function (cx, cz) {
    var group = new THREE.Group();
    var rand = seeded(hashChunk(cx, cz));
    var ox = cx * CHUNK_SIZE;
    var oz = cz * CHUNK_SIZE;

    // 地表
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 16, 16),
      this.groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(ox + CHUNK_SIZE * 0.5, 0, oz + CHUNK_SIZE * 0.5);
    ground.receiveShadow = true;

    var pos = ground.geometry.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var px = ox + CHUNK_SIZE * 0.5 + pos.getX(i);
      var pz = oz + CHUNK_SIZE * 0.5 + pos.getY(i);
      pos.setZ(i, this.heightAt(px, pz));
    }
    pos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    group.add(ground);

    // 魂兽森林灵草斑块
    for (var g = 0; g < 14; g++) {
      var gx = ox + rand() * CHUNK_SIZE;
      var gz = oz + rand() * CHUNK_SIZE;
      var patch = new THREE.Mesh(
        new THREE.CircleGeometry(20 + rand() * 26, 8),
        this.grassMat
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(gx, this.heightAt(gx, gz) + 0.1, gz);
      patch.receiveShadow = true;
      group.add(patch);
    }

    // 星斗古树
    var treeCount = 6 + Math.floor(rand() * 6);
    for (var t = 0; t < treeCount; t++) {
      var tx = ox + 30 + rand() * (CHUNK_SIZE - 60);
      var tz = oz + 30 + rand() * (CHUNK_SIZE - 60);
      var th = this.heightAt(tx, tz);
      var scale = 1.0 + rand() * 0.9;

      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4 * scale, 3.8 * scale, 26 * scale, 8),
        this.trunkMat
      );
      trunk.position.set(tx, th + 13 * scale, tz);
      trunk.castShadow = true;
      group.add(trunk);

      var crown = new THREE.Mesh(
        new THREE.SphereGeometry(16 * scale, 10, 10),
        this.leafMat
      );
      crown.position.set(tx, th + 32 * scale, tz);
      crown.scale.set(1.2, 1.1, 1.2);
      crown.castShadow = true;
      group.add(crown);
    }

    // 魂力矿石
    for (var r = 0; r < 3 + Math.floor(rand() * 4); r++) {
      var rx = ox + rand() * CHUNK_SIZE;
      var rz = oz + rand() * CHUNK_SIZE;
      var rh = this.heightAt(rx, rz);
      var rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(5 + rand() * 8),
        this.rockMat
      );
      rock.position.set(rx, rh + 3, rz);
      rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      rock.castShadow = true;
      group.add(rock);
    }

    // 闪烁金光的圣龙灵草 / 仙品药草
    if (rand() > 0.4) {
      var hx = ox + rand() * CHUNK_SIZE;
      var hz = oz + rand() * CHUNK_SIZE;
      var hh = this.heightAt(hx, hz);
      var herb = new THREE.Mesh(
        new THREE.OctahedronGeometry(2.5, 2),
        this.holyHerbMat
      );
      herb.position.set(hx, hh + 2.5, hz);
      group.add(herb);
    }

    this.scene.add(group);
    return group;
  };

  World.prototype.update = function (px, pz) {
    var cx = Math.floor(px / CHUNK_SIZE);
    var cz = Math.floor(pz / CHUNK_SIZE);

    var needed = new Set();
    for (var dx = -2; dx <= 2; dx++) {
      for (var dz = -2; dz <= 2; dz++) {
        var key = this.key(cx + dx, cz + dz);
        needed.add(key);
        if (!this.chunks.has(key)) {
          this.chunks.set(key, this.buildChunk(cx + dx, cz + dz));
        }
      }
    }

    var toRemove = [];
    this.chunks.forEach(function (mesh, k) {
      if (!needed.has(k)) {
        this.scene.remove(mesh);
        toRemove.push(k);
      }
    }, this);

    for (var i = 0; i < toRemove.length; i++) {
      this.chunks.delete(toRemove[i]);
    }
  };

  global.World = World;
})(window);
