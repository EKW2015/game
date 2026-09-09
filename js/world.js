/**
 * 斗罗大陆地形：魂殿广场、黄金魂兽林、白玉石柱。
 */
(function (global) {
  'use strict';

  var CHUNK_SIZE = 480;
  var VIEW_RADIUS = 2;

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
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x6b8a4a,
      roughness: 0.95,
      metalness: 0.02
    });
    this.goldGrass = new THREE.MeshStandardMaterial({
      color: 0xc2b46a,
      roughness: 0.92
    });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7, metalness: 0.08 });
    this.leafMat = new THREE.MeshStandardMaterial({
      color: 0xe8c35a,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x6a5010,
      emissiveIntensity: 0.15
    });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.88 });
    this.marble = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.4, metalness: 0.12 });
    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xe8c35a,
      roughness: 0.28,
      metalness: 0.7,
      emissive: 0x8a6a18,
      emissiveIntensity: 0.25
    });
  }

  World.prototype.key = function (cx, cz) {
    return cx + ',' + cz;
  };

  World.prototype.heightAt = function (x, z) {
    return (
      Math.sin(x * 0.004) * Math.cos(z * 0.004) * 8 +
      Math.sin(x * 0.013 + 1.2) * Math.sin(z * 0.011) * 3
    );
  };

  World.prototype.buildPlaza = function (group) {
    var floor = new THREE.Mesh(new THREE.CylinderGeometry(90, 90, 2.2, 48), this.marble);
    floor.position.set(0, 1.1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    var ringColors = [0xf5c542, 0xb44cff, 0xb44cff, 0x222222, 0x222222, 0x222222, 0xe23b3b];
    for (var i = 0; i < 7; i++) {
      var r = 18 + i * 8;
      var torus = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.55, 8, 48),
        new THREE.MeshStandardMaterial({
          color: ringColors[i],
          emissive: ringColors[i],
          emissiveIntensity: 0.35,
          metalness: 0.4,
          roughness: 0.35
        })
      );
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 2.3;
      group.add(torus);
    }

    for (var p = 0; p < 8; p++) {
      var a = (p / 8) * Math.PI * 2;
      var px = Math.cos(a) * 78;
      var pz = Math.sin(a) * 78;
      var col = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 28, 10), this.marble);
      col.position.set(px, 14, pz);
      col.castShadow = true;
      group.add(col);
      var cap = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), this.goldMat);
      cap.position.set(px, 30, pz);
      group.add(cap);
    }

    var altar = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 4, 12), this.goldMat);
    altar.position.y = 3.2;
    group.add(altar);
  };

  World.prototype.buildChunk = function (cx, cz) {
    var group = new THREE.Group();
    var rand = seeded(hashChunk(cx, cz));
    var ox = cx * CHUNK_SIZE;
    var oz = cz * CHUNK_SIZE;

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

    for (var g = 0; g < 10; g++) {
      var gx = ox + rand() * CHUNK_SIZE;
      var gz = oz + rand() * CHUNK_SIZE;
      var patch = new THREE.Mesh(
        new THREE.CircleGeometry(16 + rand() * 28, 8),
        this.goldGrass
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(gx, this.heightAt(gx, gz) + 0.1, gz);
      patch.receiveShadow = true;
      group.add(patch);
    }

    if (cx === 0 && cz === 0) {
      this.buildPlaza(group);
    }

    var treeCount = (cx === 0 && cz === 0) ? 3 : 5 + Math.floor(rand() * 5);
    for (var t = 0; t < treeCount; t++) {
      var tx = ox + 50 + rand() * (CHUNK_SIZE - 100);
      var tz = oz + 50 + rand() * (CHUNK_SIZE - 100);
      if (cx === 0 && cz === 0 && Math.hypot(tx, tz) < 110) continue;
      var th = this.heightAt(tx, tz);
      var scale = 0.9 + rand() * 0.8;

      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8 * scale, 2.6 * scale, 24 * scale, 8),
        this.trunkMat
      );
      trunk.position.set(tx, th + 12 * scale, tz);
      trunk.castShadow = true;
      group.add(trunk);

      var crown = new THREE.Mesh(
        new THREE.SphereGeometry(12 * scale, 10, 10),
        this.leafMat
      );
      crown.position.set(tx, th + 28 * scale, tz);
      crown.scale.set(1, 1.1, 1);
      crown.castShadow = true;
      group.add(crown);
    }

    for (var r = 0; r < 2 + Math.floor(rand() * 3); r++) {
      var rx = ox + rand() * CHUNK_SIZE;
      var rz = oz + rand() * CHUNK_SIZE;
      if (cx === 0 && cz === 0 && Math.hypot(rx, rz) < 100) continue;
      var rh = this.heightAt(rx, rz);
      var rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(4 + rand() * 8, 0),
        this.rockMat
      );
      rock.position.set(rx, rh + 3, rz);
      rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      rock.castShadow = true;
      group.add(rock);
    }

    this.scene.add(group);
    return group;
  };

  World.prototype.update = function (px, pz) {
    var ccx = Math.floor(px / CHUNK_SIZE);
    var ccz = Math.floor(pz / CHUNK_SIZE);
    var needed = new Set();

    for (var dx = -VIEW_RADIUS; dx <= VIEW_RADIUS; dx++) {
      for (var dz = -VIEW_RADIUS; dz <= VIEW_RADIUS; dz++) {
        var cx = ccx + dx;
        var cz = ccz + dz;
        needed.add(this.key(cx, cz));
        var k = this.key(cx, cz);
        if (!this.chunks.has(k)) {
          this.chunks.set(k, this.buildChunk(cx, cz));
        }
      }
    }

    this.chunks.forEach(function (group, k) {
      if (!needed.has(k)) {
        this.scene.remove(group);
        this.chunks.delete(k);
      }
    }, this);
  };

  World.CHUNK_SIZE = CHUNK_SIZE;
  global.World = World;
})(window);
