/**
 * 无限世界：按区块 procedural 生成地形、植被，跟随玩家加载/卸载。
 */
(function (global) {
  'use strict';

  var U = global.Utils;

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
      color: 0x3a6b42,
      roughness: 0.95,
      metalness: 0.01
    });
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x4d8a54,
      roughness: 0.98
    });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 });
    this.leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b38, roughness: 0.85 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a62, roughness: 0.95 });
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

    // 草斑块
    for (var g = 0; g < 12; g++) {
      var gx = ox + rand() * CHUNK_SIZE;
      var gz = oz + rand() * CHUNK_SIZE;
      var patch = new THREE.Mesh(
        new THREE.CircleGeometry(18 + rand() * 24, 8),
        this.grassMat
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(gx, this.heightAt(gx, gz) + 0.08, gz);
      patch.receiveShadow = true;
      group.add(patch);
    }

    // 树木
    var treeCount = 4 + Math.floor(rand() * 5);
    for (var t = 0; t < treeCount; t++) {
      var tx = ox + 40 + rand() * (CHUNK_SIZE - 80);
      var tz = oz + 40 + rand() * (CHUNK_SIZE - 80);
      var th = this.heightAt(tx, tz);
      var scale = 0.9 + rand() * 0.7;

      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2 * scale, 3.2 * scale, 22 * scale, 8),
        this.trunkMat
      );
      trunk.position.set(tx, th + 11 * scale, tz);
      trunk.castShadow = true;
      group.add(trunk);

      var crown = new THREE.Mesh(
        new THREE.SphereGeometry(14 * scale, 10, 10),
        this.leafMat
      );
      crown.position.set(tx, th + 28 * scale, tz);
      crown.scale.set(1, 1.15, 1);
      crown.castShadow = true;
      group.add(crown);
    }

    // 岩石
    for (var r = 0; r < 3 + Math.floor(rand() * 4); r++) {
      var rx = ox + rand() * CHUNK_SIZE;
      var rz = oz + rand() * CHUNK_SIZE;
      var rh = this.heightAt(rx, rz);
      var rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(5 + rand() * 10, 1),
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
