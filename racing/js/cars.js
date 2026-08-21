/**
 * 夜城飙车 - 车库：车型数据、升级项、金币与存档（纯逻辑，不依赖 THREE）
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'nightcity.garage.v1';

  /**
   * 车型。accel/maxSpeed/grip/brake/turbo 直接喂给车辆物理。
   * shape 对应 carmodel.js 里的车身轮廓。
   */
  var CARS = [
    {
      id: 'street', name: '街头轰鸣', desc: '入门好开，转向听话', price: 0,
      shape: 'super', color: 0xe01b4c,
      accel: 15, maxSpeed: 60, grip: 13, brake: 36, turbo: 1.6
    },
    {
      id: 'drift', name: '甩尾狂人', desc: '抓地力低，专为漂移', price: 1500,
      shape: 'super', color: 0x14c8d8,
      accel: 16, maxSpeed: 62, grip: 9.5, brake: 34, turbo: 1.7
    },
    {
      id: 'gt', name: 'GT 猛兽', desc: '推背感强，尾巴稳', price: 4000,
      shape: 'gt', color: 0xff7a1a,
      accel: 18.5, maxSpeed: 66, grip: 14.5, brake: 40, turbo: 1.7
    },
    {
      id: 'hyper', name: '超音速', desc: '极速怪物，需要胆量', price: 9000,
      shape: 'hyper', color: 0x7a3cff,
      accel: 21, maxSpeed: 74, grip: 12.5, brake: 42, turbo: 1.9
    }
  ];

  /** 升级项：每级的加成与价格 */
  var UPGRADES = [
    { id: 'engine', name: '引擎', unit: '加速', max: 5, price: 500, step: 1.15 },
    { id: 'brake', name: '刹车', unit: '制动', max: 5, price: 350, step: 2.4 },
    { id: 'tire', name: '轮胎', unit: '抓地', max: 5, price: 400, step: 0.8 },
    { id: 'turbo', name: '氮气', unit: '极速', max: 5, price: 600, step: 1.6 }
  ];

  function findCar(id) {
    for (var i = 0; i < CARS.length; i++) {
      if (CARS[i].id === id) return CARS[i];
    }
    return CARS[0];
  }

  function upgradePrice(upgrade, level) {
    return Math.round(upgrade.price * (1 + level * 0.7));
  }

  function Garage() {
    this.cash = 0;
    this.owned = { street: true };
    this.levels = {};
    this.selected = 'street';
    this.paint = 0;
    this.load();
  }

  Garage.prototype.load = function () {
    var raw = null;
    try {
      raw = global.localStorage.getItem(SAVE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      this.cash = data.cash || 0;
      this.owned = data.owned || { street: true };
      this.levels = data.levels || {};
      this.selected = data.selected || 'street';
      this.paint = data.paint || 0;
      this.owned.street = true;
    } catch (e) { /* 存档坏了就用默认值 */ }
  };

  Garage.prototype.save = function () {
    try {
      global.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: this.cash, owned: this.owned, levels: this.levels,
        selected: this.selected, paint: this.paint
      }));
    } catch (e) { /* 隐私模式下忽略 */ }
  };

  Garage.prototype.earn = function (amount) {
    this.cash += Math.max(0, Math.round(amount));
    this.save();
    return this.cash;
  };

  Garage.prototype.has = function (carId) {
    return !!this.owned[carId];
  };

  Garage.prototype.buy = function (carId) {
    var car = findCar(carId);
    if (this.has(carId) || this.cash < car.price) return false;
    this.cash -= car.price;
    this.owned[carId] = true;
    this.selected = carId;
    this.save();
    return true;
  };

  Garage.prototype.select = function (carId) {
    if (!this.has(carId)) return false;
    this.selected = carId;
    this.save();
    return true;
  };

  Garage.prototype.level = function (carId, upgradeId) {
    var byCar = this.levels[carId];
    return (byCar && byCar[upgradeId]) || 0;
  };

  Garage.prototype.upgrade = function (carId, upgradeId) {
    var upgrade = null;
    for (var i = 0; i < UPGRADES.length; i++) {
      if (UPGRADES[i].id === upgradeId) upgrade = UPGRADES[i];
    }
    if (!upgrade) return false;
    var level = this.level(carId, upgradeId);
    if (level >= upgrade.max) return false;
    var price = upgradePrice(upgrade, level);
    if (this.cash < price) return false;

    this.cash -= price;
    if (!this.levels[carId]) this.levels[carId] = {};
    this.levels[carId][upgradeId] = level + 1;
    this.save();
    return true;
  };

  /** 车型基础数据 + 升级加成，得到实际喂给物理的参数 */
  Garage.prototype.statsFor = function (carId) {
    var base = findCar(carId);
    var engine = this.level(carId, 'engine');
    var brake = this.level(carId, 'brake');
    var tire = this.level(carId, 'tire');
    var turbo = this.level(carId, 'turbo');
    return {
      id: base.id,
      name: base.name,
      shape: base.shape,
      color: base.color,
      accel: base.accel + engine * 1.15,
      maxSpeed: base.maxSpeed + turbo * 1.6,
      grip: base.grip + tire * 0.8,
      brake: base.brake + brake * 2.4,
      turbo: base.turbo + turbo * 0.05
    };
  };

  Garage.prototype.stats = function () {
    return this.statsFor(this.selected);
  };

  global.Cars = {
    list: CARS,
    upgrades: UPGRADES,
    find: findCar,
    upgradePrice: upgradePrice,
    Garage: Garage
  };
})(typeof window !== 'undefined' ? window : global);
