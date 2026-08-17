/**
 * 车库：车型目录、改装等级、金币与存档。
 * 纯数据逻辑，Node 里可直接测试（localStorage 不存在时自动降级为内存）。
 */
(function (global) {
  'use strict';

  var Utils = global.Utils;
  var SAVE_KEY = 'night-city-racing:save:v3';

  var CARS = [
    {
      id: 'hatch', name: '街头小钢炮', body: 'hatch', price: 0, color: 0x35d6ff,
      base: { topSpeed: 44, accel: 7.5, brakePower: 18, grip: 6.2, handling: 1.02, nos: 1.32 }
    },
    {
      id: 'coupe', name: '夜色轿跑', body: 'coupe', price: 0, color: 0xff9f1c,
      base: { topSpeed: 48, accel: 8.4, brakePower: 19, grip: 6.4, handling: 1.0, nos: 1.34 }
    },
    {
      id: 'turbo', name: '涡轮猎手', body: 'coupe', price: 9000, color: 0x9d4dff,
      base: { topSpeed: 53, accel: 9.5, brakePower: 20, grip: 6.6, handling: 1.0, nos: 1.36 }
    },
    {
      id: 'gt', name: '夜行者 GT', body: 'sport', price: 18000, color: 0x00e676,
      base: { topSpeed: 58, accel: 10.6, brakePower: 21, grip: 6.9, handling: 1.01, nos: 1.38 }
    },
    {
      id: 'phantom', name: '霓虹幻影', body: 'sport', price: 30000, color: 0xff2fb9,
      base: { topSpeed: 63, accel: 11.6, brakePower: 22, grip: 7.1, handling: 1.03, nos: 1.4 }
    },
    {
      id: 'samurai', name: '赛道武士', body: 'sport', price: 46000, color: 0xff3b30,
      base: { topSpeed: 67, accel: 12.6, brakePower: 23.5, grip: 7.4, handling: 1.05, nos: 1.42 }
    },
    {
      id: 'v8', name: '复仇者 V8', body: 'muscle', price: 62000, color: 0xffd400,
      base: { topSpeed: 71, accel: 13.8, brakePower: 23, grip: 7.2, handling: 0.98, nos: 1.46 }
    },
    {
      id: 'proto', name: '极限原型车', body: 'super', price: 88000, color: 0x18ffe0,
      base: { topSpeed: 76, accel: 14.8, brakePower: 25, grip: 7.7, handling: 1.06, nos: 1.48 }
    },
    {
      id: 'queen', name: '暗夜女王', body: 'super', price: 120000, color: 0xb388ff,
      base: { topSpeed: 81, accel: 15.8, brakePower: 26, grip: 8, handling: 1.08, nos: 1.5 }
    },
    {
      id: 'apex', name: '天启 APEX', body: 'super', price: 165000, color: 0xffffff,
      base: { topSpeed: 86, accel: 17, brakePower: 27.5, grip: 8.4, handling: 1.1, nos: 1.55 }
    }
  ];

  var PAINTS = [
    { id: 'cyan', name: '电光青', color: 0x18e0ff },
    { id: 'magenta', name: '霓虹粉', color: 0xff2fb9 },
    { id: 'lime', name: '酸性绿', color: 0x9dff2f },
    { id: 'orange', name: '熔岩橙', color: 0xff7a00 },
    { id: 'violet', name: '午夜紫', color: 0x8a4dff },
    { id: 'white', name: '珍珠白', color: 0xf2f5ff },
    { id: 'gold', name: '土豪金', color: 0xffc53d },
    { id: 'red', name: '烈焰红', color: 0xff2d2d }
  ];

  var RIMS = [
    { id: 'stock', name: '原厂轮毂', color: 0x9aa3b2, price: 0 },
    { id: 'chrome', name: '电镀铬', color: 0xdfe7f5, price: 1200 },
    { id: 'neon', name: '霓虹圈', color: 0x00e5ff, price: 2600 },
    { id: 'gold', name: '黄金轮', color: 0xffc107, price: 5200 }
  ];

  var UPGRADES = [
    { id: 'engine', name: '引擎', desc: '极速与加速' },
    { id: 'brake', name: '刹车', desc: '刹车力' },
    { id: 'agility', name: '操控', desc: '抓地与转向' },
    { id: 'turbo', name: '涡轮', desc: '氮气推力' },
    { id: 'booster', name: '氮气瓶', desc: '氮气容量与回充' }
  ];

  var MAX_LEVEL = 5;

  function defaultTuning() {
    return { engine: 0, brake: 0, agility: 0, turbo: 0, booster: 0, paint: 0, rims: 0 };
  }

  function defaultSave() {
    return {
      money: 2500,
      selected: 'hatch',
      owned: { hatch: defaultTuning(), coupe: defaultTuning() },
      events: {},
      bestLaps: {},
      totalRaces: 0,
      totalWins: 0
    };
  }

  var Garage = {
    CARS: CARS,
    PAINTS: PAINTS,
    RIMS: RIMS,
    UPGRADES: UPGRADES,
    MAX_LEVEL: MAX_LEVEL,
    state: null,

    load: function () {
      var saved = Utils.load(SAVE_KEY, null);
      var base = defaultSave();
      if (saved && typeof saved === 'object') {
        base.money = typeof saved.money === 'number' ? saved.money : base.money;
        base.selected = saved.selected || base.selected;
        base.owned = saved.owned && typeof saved.owned === 'object' ? saved.owned : base.owned;
        base.events = saved.events || {};
        base.bestLaps = saved.bestLaps || {};
        base.totalRaces = saved.totalRaces || 0;
        base.totalWins = saved.totalWins || 0;
      }
      if (!base.owned[base.selected]) base.selected = Object.keys(base.owned)[0] || 'hatch';
      Garage.state = base;
      return base;
    },

    persist: function () {
      Utils.save(SAVE_KEY, Garage.state);
    },

    reset: function () {
      Garage.state = defaultSave();
      Garage.persist();
    },

    car: function (id) {
      for (var i = 0; i < CARS.length; i++) if (CARS[i].id === id) return CARS[i];
      return CARS[0];
    },

    owns: function (id) {
      return !!(Garage.state.owned && Garage.state.owned[id]);
    },

    tuning: function (id) {
      return (Garage.state.owned && Garage.state.owned[id]) || defaultTuning();
    },

    money: function () {
      return Garage.state.money;
    },

    addMoney: function (amount) {
      Garage.state.money = Math.max(0, Garage.state.money + amount);
      Garage.persist();
      return Garage.state.money;
    },

    buyCar: function (id) {
      var car = Garage.car(id);
      if (Garage.owns(id)) return { ok: false, reason: '已拥有' };
      if (Garage.state.money < car.price) return { ok: false, reason: '金币不足' };
      Garage.state.money -= car.price;
      Garage.state.owned[id] = defaultTuning();
      Garage.state.selected = id;
      Garage.persist();
      return { ok: true };
    },

    select: function (id) {
      if (!Garage.owns(id)) return false;
      Garage.state.selected = id;
      Garage.persist();
      return true;
    },

    /** 第 level 级改装的价格（从 0 升到 1 时 level=0） */
    upgradeCost: function (carId, level) {
      var car = Garage.car(carId);
      var base = 900 + car.price * 0.055;
      return Math.round(base * (1 + level * 0.85));
    },

    upgrade: function (carId, part) {
      var tune = Garage.state.owned[carId];
      if (!tune) return { ok: false, reason: '未拥有该车' };
      var level = tune[part] || 0;
      if (level >= MAX_LEVEL) return { ok: false, reason: '已满级' };
      var cost = Garage.upgradeCost(carId, level);
      if (Garage.state.money < cost) return { ok: false, reason: '金币不足' };
      Garage.state.money -= cost;
      tune[part] = level + 1;
      Garage.persist();
      return { ok: true, level: level + 1, cost: cost };
    },

    setPaint: function (carId, index) {
      var tune = Garage.state.owned[carId];
      if (!tune) return false;
      tune.paint = ((index % PAINTS.length) + PAINTS.length) % PAINTS.length;
      Garage.persist();
      return true;
    },

    buyRims: function (carId, index) {
      var tune = Garage.state.owned[carId];
      if (!tune) return { ok: false, reason: '未拥有该车' };
      var rim = RIMS[index];
      if (!rim) return { ok: false, reason: '无此轮毂' };
      var key = 'rims:' + rim.id;
      var unlocked = rim.price === 0 || Garage.state[key];
      if (!unlocked) {
        if (Garage.state.money < rim.price) return { ok: false, reason: '金币不足' };
        Garage.state.money -= rim.price;
        Garage.state[key] = true;
      }
      tune.rims = index;
      Garage.persist();
      return { ok: true };
    },

    /** 车型 + 改装 -> 物理参数 */
    spec: function (carId, tuning) {
      var car = Garage.car(carId);
      var tune = tuning || Garage.tuning(carId);
      var b = car.base;
      var engine = tune.engine || 0;
      var brake = tune.brake || 0;
      var agility = tune.agility || 0;
      var turbo = tune.turbo || 0;
      var booster = tune.booster || 0;

      return {
        carId: car.id,
        body: car.body,
        topSpeed: b.topSpeed * (1 + engine * 0.03),
        accel: b.accel * (1 + engine * 0.06),
        brakePower: b.brakePower * (1 + brake * 0.08),
        grip: b.grip * (1 + agility * 0.05),
        handling: b.handling * (1 + agility * 0.03),
        nosPower: b.nos + turbo * 0.055,
        nosDuration: 3.4 + booster * 0.55,
        nosRegen: 1 + booster * 0.22,
        color: Garage.paintColor(car, tune),
        rimColor: (RIMS[tune.rims || 0] || RIMS[0]).color
      };
    },

    paintColor: function (car, tune) {
      if (tune && tune.paint) {
        var paint = PAINTS[tune.paint];
        if (paint) return paint.color;
      }
      return car.color;
    },

    /** 对手用：按难度缩放的通用车辆参数 */
    rivalSpec: function (difficulty, color) {
      var t = Utils.clamp(difficulty, 0, 1);
      return {
        carId: 'rival',
        body: t > 0.66 ? 'super' : (t > 0.33 ? 'sport' : 'coupe'),
        topSpeed: 40 + t * 44,
        accel: 7 + t * 9.2,
        brakePower: 18 + t * 9,
        grip: 6 + t * 2.2,
        handling: 1 + t * 0.08,
        nosPower: 1.34 + t * 0.16,
        nosDuration: 3.4 + t * 1.6,
        nosRegen: 1 + t * 0.6,
        color: color,
        rimColor: 0xb8c0cc
      };
    },

    /** 0~100 的展示条 */
    displayStats: function (carId, tuning) {
      var spec = Garage.spec(carId, tuning);
      return {
        speed: Utils.clamp(Math.round((spec.topSpeed / 100) * 100), 5, 100),
        accel: Utils.clamp(Math.round((spec.accel / 23) * 100), 5, 100),
        brake: Utils.clamp(Math.round((spec.brakePower / 40) * 100), 5, 100),
        grip: Utils.clamp(Math.round(((spec.grip - 5) / 5) * 100), 5, 100),
        nos: Utils.clamp(Math.round(((spec.nosPower - 1.2) / 0.6) * 100), 5, 100)
      };
    }
  };

  global.Garage = Garage;
})(typeof window !== 'undefined' ? window : globalThis);
