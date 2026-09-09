/**
 * 斗罗大陆：魂技、自创魂技、魂骨技能与领域系统
 * 严格按照图片资料精准实现全套技能机制与数值逻辑！
 */
(function (global) {
  'use strict';

  var U = global.Utils;
  var Sfx = global.Sfx;

  // 技能完整定义字典
  var SKILLS_DATA = {
    // === 1. 七大武魂魂技 ===
    ring1: {
      id: 'ring1',
      name: '第一魂技·光明龙爪',
      type: 'ring',
      colorName: '黄',
      cd: 2.0,
      cost: 25,
      desc: '右爪凝聚金芒，附带净化与撕裂效果，克制一切黑暗属性'
    },
    ring2: {
      id: 'ring2',
      name: '第二魂技·圣龙之翼',
      type: 'ring',
      colorName: '紫',
      cd: 6.0,
      cost: 40,
      desc: '凝聚光翼飞行，速度暴增，发射龙羽进行大范围远程攻击'
    },
    ring3: {
      id: 'ring3',
      name: '第三魂技·光明龙啸',
      type: 'ring',
      colorName: '紫',
      cd: 7.0,
      cost: 50,
      desc: '发出龙吟声波，使范围内敌人眩晕、失明，并降低其防御力'
    },
    ring4: {
      id: 'ring4',
      name: '第四魂技·圣龙金身',
      type: 'ring',
      colorName: '黑',
      cd: 12.0,
      cost: 70,
      desc: '化出金纹龙鳞甲，免疫大部分伤害与控制，并能反弹冲击波'
    },
    ring5: {
      id: 'ring5',
      name: '第五魂技·光耀审判击',
      type: 'ring',
      colorName: '黑',
      cd: 10.0,
      cost: 90,
      desc: '召唤从天而降的光明巨剑锁定单体，强力穿透并灼烧生命力'
    },
    ring6: {
      id: 'ring6',
      name: '第六魂技·追踪太阳神光',
      type: 'ring',
      colorName: '黑',
      cd: 12.0,
      cost: 110,
      desc: '锁定目标后射出金色激光柱，激光会弯曲、拐弯并自动追踪敌人，直到命中'
    },
    ring7: {
      id: 'ring7',
      name: '第七魂技·光明圣龙真身',
      type: 'ring',
      colorName: '红',
      cd: 35.0,
      cost: 150,
      desc: '释放武魂真身，化身百米圣龙。平时是魂师人形，只有真身才变成魂兽'
    },
    trueBody: {
      id: 'trueBody',
      name: '第七魂技·武魂真身',
      type: 'ring',
      colorName: '红',
      cd: 35.0,
      cost: 150,
      desc: '魂师释放武魂真身，短暂化作武魂本体。平时保持人形'
    },

    // === 2. 七大自创魂技 ===
    custom1: {
      id: 'custom1',
      name: '自创一·圣龙爆破拳',
      type: 'custom',
      cd: 2.5,
      cost: 30,
      desc: '将光明魂力压缩在拳头上，击中敌人后产生二次金色爆炸'
    },
    custom2: {
      id: 'custom2',
      name: '自创二·光影瞬步',
      type: 'custom',
      cd: 3.5,
      cost: 20,
      desc: '利用光线的折射瞬间移动，在原地留下一个残影迷惑敌人'
    },
    custom3: {
      id: 'custom3',
      name: '自创三·圣龙摆尾',
      type: 'custom',
      cd: 4.0,
      cost: 35,
      desc: '身体旋转，将魂力化作巨大的金色龙尾，把身边敌人全部抽飞'
    },
    custom4: {
      id: 'custom4',
      name: '自创四·光盾守护',
      type: 'custom',
      cd: 8.0,
      cost: 40,
      desc: '双手合十，在身前张开一面像太阳一样耀眼的金色盾牌'
    },
    custom5: {
      id: 'custom5',
      name: '自创五·光明龙针',
      type: 'custom',
      cd: 4.5,
      cost: 35,
      desc: '将魂力凝聚成无数根细小的金色光针，用来封穴或破除防御'
    },
    custom6: {
      id: 'custom6',
      name: '自创六·御剑术·光芒',
      type: 'custom',
      cd: 7.0,
      cost: 60,
      desc: '控制由魂力凝聚的金色飞剑，在空中自由穿梭斩击敌人'
    },
    custom7: {
      id: 'custom7',
      name: '自创七·圣龙破天击',
      type: 'custom',
      cd: 15.0,
      cost: 120,
      desc: '将全身力量集中在一点，整个人化作一头金色巨龙冲向天空再砸向地面'
    },

    // === 3. 九万年魂骨技能 ===
    boneL: {
      id: 'boneL',
      name: '九万年左臂骨【圣龙裂空爪】',
      type: 'bone',
      cd: 8.0,
      cost: 50,
      desc: '左手汇聚强烈的金光，挥出一道撕裂空气的金色龙爪刃，距离远、威力大'
    },
    boneR: {
      id: 'boneR',
      name: '九万年右臂骨【太阳重力拳】',
      type: 'bone',
      cd: 9.0,
      cost: 55,
      desc: '右手一拳打出，力量暴增，让敌人身体瞬间变沉重、无法躲闪'
    },

    // === 4. 十万年领域技能 ===
    domain: {
      id: 'domain',
      name: '十万年·圣龙主迹领域（徽章版）',
      type: 'domain',
      cd: 30.0,
      cost: 140,
      desc: '领域展开方圆千米化为金色世界！敌人全属性削弱一半且受光明灼烧；持徽章者免伤获圣龙祝福，魂力持续恢复，全属性提升30%'
    },

    shadowStrike: { id: 'shadowStrike', name: '影袭', type: 'member', cd: 4.0, cost: 35, desc: '瞬移到目标背后斩击' },
    bladeStorm: { id: 'bladeStorm', name: '千刃风暴', type: 'member', cd: 7.0, cost: 55, desc: '大范围切割斩击' },
    phoenixMeteor: { id: 'phoenixMeteor', name: '凤凰流星雨', type: 'member', cd: 8.0, cost: 70, desc: '火球从天而降' },
    fireCage: { id: 'fireCage', name: '火线禁锢', type: 'member', cd: 9.0, cost: 50, desc: '火焰牢笼定身' },
    absoluteZero: { id: 'absoluteZero', name: '绝对零度', type: 'member', cd: 12.0, cost: 80, desc: '瞬间冻结全场' },
    iceVines: { id: 'iceVines', name: '冰蔓缠绕', type: 'member', cd: 6.0, cost: 40, desc: '冰蔓从地底缠住敌人' },
    iceDomain: { id: 'iceDomain', name: '玄冰领域', type: 'domain', cd: 22.0, cost: 100, desc: '降低气温，减速并抑制魂力恢复' },
    mammothStomp: { id: 'mammothStomp', name: '猛犸践踏', type: 'member', cd: 6.0, cost: 45, desc: '震晕周围' },
    goldShield: { id: 'goldShield', name: '黄金御盾', type: 'member', cd: 10.0, cost: 50, desc: '巨大光盾挡在前方' },
    speedAmp: { id: 'speedAmp', name: '光速增幅', type: 'member', cd: 8.0, cost: 40, desc: '大幅提升自身移速' },
    mpSurge: { id: 'mpSurge', name: '魂力回涌', type: 'member', cd: 10.0, cost: 20, desc: '瞬间回复大量魂力' },
    emeraldWave: { id: 'emeraldWave', name: '翡翠光波', type: 'member', cd: 6.0, cost: 45, desc: '瞬间治疗' },
    purify: { id: 'purify', name: '净化之光', type: 'member', cd: 8.0, cost: 35, desc: '驱散负面状态' },
    lifeDomain: { id: 'lifeDomain', name: '生命礼赞领域', type: 'domain', cd: 20.0, cost: 90, desc: '领域内伤势极速自动愈合' }
  };

  function SkillManager(game) {
    this.game = game;
    this.projectiles = [];
    this.domainActive = false;
    this.domainTimer = 0;
    this.iceDomainTimer = 0;
    this.lifeDomainTimer = 0;
  }

  // 释放技能入口
  SkillManager.prototype.castSkill = function (skillId, caster) {
    var player = caster || this.game.player;
    if (!player || !player.alive) return false;

    var skill = SKILLS_DATA[skillId];
    if (!skill) return false;

    // 冷却判断
    if (player.cooldowns[skillId] > 0) {
      this.game.addMessage(skill.name + ' 冷却中 (' + player.cooldowns[skillId].toFixed(1) + 's)', 1.0);
      return false;
    }

    // 魂力消耗判断（真身状态下前六魂技 0 消耗！）
    var cost = skill.cost;
    if (player.avatarMode && skill.type === 'ring' && skillId !== 'ring7' && skillId !== 'trueBody') {
      cost = 0;
    }

    if (player.mp < cost) {
      this.game.addMessage('魂力不足！需要 ' + cost + ' 点魂力', 1.2);
      return false;
    }

    // 扣除魂力与设置冷却
    player.mp -= cost;
    player.cooldowns[skillId] = skill.cd;

    // 触发具体技能效果
    this.executeSkillEffect(skillId, player);
    this.game.addMessage('释放技能：【' + skill.name + '】！', 2.0);
    return true;
  };

  SkillManager.prototype.executeSkillEffect = function (skillId, p) {
    var enemies = this.game.dinos.filter(function (d) { return d.alive && d.id !== p.id; });
    var target = this.getNearestEnemy(p, enemies, 500);

    switch (skillId) {
      // 1. 第一魂技：光明龙爪 (净化+撕裂，破除暗黑)
      case 'ring1':
        Sfx.claw();
        this.game.addParticles(p.x, p.y, '#ffd700', 25);
        for (var i = 0; i < enemies.length; i++) {
          var em = enemies[i];
          if (U.dist(p.x, p.y, em.x, em.y) < p.radius + em.radius + 60) {
            var dmg = p.getEffectiveAttack() * 2.5;
            em.takeDamage(dmg, p);
            this.game.addParticles(em.x, em.y, '#ffe066', 15);
            Sfx.hit();
          }
        }
        break;

      // 2. 第二魂技：圣龙之翼 (振翅高飞，散射龙羽大范围攻击)
      case 'ring2':
        Sfx.wing();
        p.isFlying = true;
        p.flightTime = 7.0; // 飞行7秒
        for (var f = -3; f <= 3; f++) {
          var fAngle = p.angle + f * 0.22;
          this.projectiles.push({
            type: 'feather',
            x: p.x,
            y: 20,
            z: p.y,
            vx: Math.cos(fAngle) * 450,
            vy: Math.sin(fAngle) * 450,
            angle: fAngle,
            damage: p.getEffectiveAttack() * 1.2,
            life: 1.8,
            owner: p
          });
        }
        break;

      // 3. 第三魂技：光明龙啸 (声波全屏震荡，眩晕+失明+降防)
      case 'ring3':
        Sfx.roar();
        this.game.addParticles(p.x, p.y, '#ffffff', 40);
        for (var r = 0; r < enemies.length; r++) {
          var ren = enemies[r];
          var distToRen = U.dist(p.x, p.y, ren.x, ren.y);
          if (distToRen < 400) {
            ren.stunned = 3.0; // 眩晕3秒
            ren.blinded = 4.0; // 失明
            ren.defense = Math.max(10, ren.defense * 0.6); // 降低40%防御
            ren.takeDamage(p.getEffectiveAttack() * 1.5, p);
            this.game.addParticles(ren.x, ren.y, '#ffff88', 10);
          }
        }
        break;

      // 4. 第四魂技：圣龙金身 (化出金纹龙鳞甲，免伤反弹)
      case 'ring4':
        Sfx.goldBody();
        p.goldBodyActive = true;
        p.goldBodyTime = 6.0;
        this.game.addParticles(p.x, p.y, '#ffea00', 35);
        break;

      // 5. 第五魂技：光耀审判击 (召唤天降巨剑单体穿透灼烧)
      case 'ring5':
        Sfx.judgment();
        var tX = p.x + Math.cos(p.angle) * 160;
        var tY = p.y + Math.sin(p.angle) * 160;
        if (target) {
          tX = target.x;
          tY = target.y;
        }
        this.projectiles.push({
          type: 'judgment',
          x: tX,
          y: 120, // 从高空坠落
          z: tY,
          targetX: tX,
          targetY: tY,
          vyGround: -200,
          life: 0.8,
          damage: p.getEffectiveAttack() * 6.5,
          owner: p
        });
        break;

      // 6. 第六魂技：追踪太阳神光 (激光柱弯曲拐弯自动追踪)
      case 'ring6':
        Sfx.laser();
        this.projectiles.push({
          type: 'laser',
          x: p.x,
          y: 15,
          z: p.y,
          angle: p.angle,
          speed: 360,
          target: target,
          life: 3.5,
          damage: p.getEffectiveAttack() * 5.0,
          owner: p
        });
        break;

      // 7. 第七魂技：武魂真身（人形魂师化作武魂本体）
      case 'ring7':
      case 'trueBody':
        Sfx.avatar();
        p.avatarMode = true;
        p.avatarTime = 16.0;
        p.hp = p.maxHp;
        this.game.addParticles(p.x, p.y, '#ffffaa', 60);
        break;

      // === 自创一·圣龙爆破拳 (二次金色爆炸) ===
      case 'custom1':
        Sfx.comboPunch();
        var punchX = p.x + Math.cos(p.angle) * 45;
        var punchY = p.y + Math.sin(p.angle) * 45;
        this.game.addParticles(punchX, punchY, '#ffdd44', 20);
        for (var c1 = 0; c1 < enemies.length; c1++) {
          var e1 = enemies[c1];
          if (U.dist(punchX, punchY, e1.x, e1.y) < p.radius + e1.radius + 35) {
            e1.takeDamage(p.getEffectiveAttack() * 2.2, p);
            // 延迟二次金色爆炸（由弹道寿命驱动，避免 setTimeout）
            this.projectiles.push({
              type: 'explosion',
              x: e1.x,
              y: 10,
              z: e1.y,
              life: 0.22,
              damage: p.getEffectiveAttack() * 3.0,
              owner: p,
              target: e1
            });
          }
        }
        break;

      // === 自创二·光影瞬步 (瞬间移动+原地残影) ===
      case 'custom2':
        Sfx.blink();
        // 原地留下闪烁金色残影粒子
        this.game.addParticles(p.x, p.y, '#ffee66', 30);
        // 瞬移到前方 140 距离
        var blinkDist = 140;
        p.x += Math.cos(p.angle) * blinkDist;
        p.y += Math.sin(p.angle) * blinkDist;
        this.game.addParticles(p.x, p.y, '#ffffff', 20);
        break;

      // === 自创三·圣龙摆尾 (巨大龙尾横扫击飞周边敌人) ===
      case 'custom3':
        Sfx.claw();
        this.game.addParticles(p.x, p.y, '#ffd700', 35);
        for (var c3 = 0; c3 < enemies.length; c3++) {
          var e3 = enemies[c3];
          var distC3 = U.dist(p.x, p.y, e3.x, e3.y);
          if (distC3 < p.radius + e3.radius + 80) {
            e3.takeDamage(p.getEffectiveAttack() * 2.8, p);
            // 强力抽飞击退
            var repAngle = U.angleTo(p.x, p.y, e3.x, e3.y);
            e3.vx = Math.cos(repAngle) * 550;
            e3.vy = Math.sin(repAngle) * 550;
            this.game.addParticles(e3.x, e3.y, '#ffea00', 20);
          }
        }
        break;

      // === 自创四·光盾守护 (身前太阳般耀眼金盾) ===
      case 'custom4':
        Sfx.goldBody();
        p.shieldActive = true;
        p.shieldHp = 1200; // 护盾吸收量
        this.projectiles.push({
          type: 'lightShield',
          x: p.x + Math.cos(p.angle) * 15,
          y: 12,
          z: p.y + Math.sin(p.angle) * 15,
          angle: p.angle,
          life: 8.0,
          owner: p
        });
        break;

      // === 自创五·光明龙针 (无数细小金针封穴破防) ===
      case 'custom5':
        Sfx.wing();
        for (var n = -4; n <= 4; n++) {
          var needleAngle = p.angle + n * 0.12;
          this.projectiles.push({
            type: 'needle',
            x: p.x,
            y: 12,
            z: p.y,
            vx: Math.cos(needleAngle) * 550,
            vy: Math.sin(needleAngle) * 550,
            angle: needleAngle,
            damage: p.getEffectiveAttack() * 0.9,
            debuffDefense: true,
            life: 1.5,
            owner: p
          });
        }
        break;

      // === 自创六·御剑术·光芒 (金色飞剑自由穿梭斩击) ===
      case 'custom6':
        Sfx.sword();
        for (var s = 0; s < 3; s++) {
          var swAngle = p.angle + (s - 1) * 0.4;
          this.projectiles.push({
            type: 'sword',
            x: p.x,
            y: 14,
            z: p.y,
            angle: swAngle,
            speed: 420,
            target: target,
            damage: p.getEffectiveAttack() * 2.6,
            life: 3.0,
            owner: p
          });
        }
        break;

      // === 自创七·圣龙破天击 (整个人化作巨龙冲天砸地) ===
      case 'custom7':
        Sfx.avatar();
        this.game.addParticles(p.x, p.y, '#ffdd33', 60);
        var smashX = p.x + Math.cos(p.angle) * 180;
        var smashY = p.y + Math.sin(p.angle) * 180;
        p.x = smashX;
        p.y = smashY;
        Sfx.judgment();
        this.game.addParticles(smashX, smashY, '#ffffff', 80);
        for (var c7 = 0; c7 < enemies.length; c7++) {
          var e7 = enemies[c7];
          if (U.dist(smashX, smashY, e7.x, e7.y) < 220) {
            e7.takeDamage(p.getEffectiveAttack() * 7.5, p);
            e7.stunned = 3.5;
            this.game.addParticles(e7.x, e7.y, '#ff4444', 25);
          }
        }
        break;

      // === 魂骨技：九万年左臂骨【圣龙裂空爪】 (远距强力爪刃光波) ===
      case 'boneL':
        Sfx.voidClaw();
        this.projectiles.push({
          type: 'clawBlade',
          x: p.x,
          y: 14,
          z: p.y,
          vx: Math.cos(p.angle) * 500,
          vy: Math.sin(p.angle) * 500,
          angle: p.angle,
          damage: p.getEffectiveAttack() * 4.8,
          life: 2.2,
          owner: p
        });
        break;

      // === 魂骨技：九万年右臂骨【太阳重力拳】 (力量暴增，沉重定身) ===
      case 'boneR':
        Sfx.gravityPunch();
        var rX = p.x + Math.cos(p.angle) * 50;
        var rY = p.y + Math.sin(p.angle) * 50;
        this.game.addParticles(rX, rY, '#ffaa00', 40);
        for (var b = 0; b < enemies.length; b++) {
          var eB = enemies[b];
          if (U.dist(rX, rY, eB.x, eB.y) < p.radius + eB.radius + 60) {
            eB.takeDamage(p.getEffectiveAttack() * 4.5, p);
            eB.heavyDebuff = 6.0; // 身体变沉重6秒，大幅减速无法逃跑
            this.game.addParticles(eB.x, eB.y, '#ff7700', 25);
          }
        }
        break;

      // === 十万年·圣龙主迹领域（徽章版） (方圆千米金色世界) ===
      case 'domain':
        Sfx.domain();
        this.domainActive = true;
        this.domainTimer = 22.0; // 维持22秒
        this.game.world.setDomainActive(true, p.x, p.y);
        p.domainBlessing = true; // 拥有圣龙徽章，全属性提升30%并回蓝
        this.game.addMessage('【十万年·圣龙主迹领域】展开！方圆千米化为金色世界！', 3.0);
        break;

      case 'shadowStrike':
        Sfx.blink();
        if (target) {
          var behind = target.angle + Math.PI;
          p.x = target.x + Math.cos(behind) * (target.radius + 18);
          p.y = target.y + Math.sin(behind) * (target.radius + 18);
          p.angle = U.angleTo(p.x, p.y, target.x, target.y);
          target.takeDamage(p.getEffectiveAttack() * 3.2, p);
          this.game.addParticles(target.x, target.y, '#8866ff', 22);
        }
        break;

      case 'bladeStorm':
        Sfx.claw();
        this.game.addParticles(p.x, p.y, '#aa88ff', 40);
        for (var bs = 0; bs < enemies.length; bs++) {
          if (U.dist(p.x, p.y, enemies[bs].x, enemies[bs].y) < 160) {
            enemies[bs].takeDamage(p.getEffectiveAttack() * 2.8, p);
          }
        }
        break;

      case 'phoenixMeteor':
        Sfx.judgment();
        for (var m = 0; m < 5; m++) {
          var mx = (target ? target.x : p.x + Math.cos(p.angle) * 120) + U.rand(-40, 40);
          var my = (target ? target.y : p.y + Math.sin(p.angle) * 120) + U.rand(-40, 40);
          this.projectiles.push({
            type: 'judgment',
            x: mx, y: 90 + m * 18, z: my,
            vyGround: -220,
            life: 0.9,
            damage: p.getEffectiveAttack() * 1.8,
            owner: p
          });
        }
        break;

      case 'fireCage':
        Sfx.goldBody();
        if (target) {
          target.stunned = 3.2;
          target.takeDamage(p.getEffectiveAttack() * 1.4, p);
          this.game.addParticles(target.x, target.y, '#ff4400', 28);
        }
        break;

      case 'absoluteZero':
        Sfx.roar();
        this.game.addParticles(p.x, p.y, '#88eeff', 50);
        for (var az = 0; az < enemies.length; az++) {
          enemies[az].stunned = 3.8;
          enemies[az].heavyDebuff = 5.0;
          enemies[az].takeDamage(p.getEffectiveAttack() * 1.6, p);
        }
        break;

      case 'iceVines':
        Sfx.claw();
        if (target) {
          target.stunned = 2.4;
          target.heavyDebuff = 4.0;
          target.takeDamage(p.getEffectiveAttack() * 1.8, p);
          this.game.addParticles(target.x, target.y, '#66ccff', 20);
        }
        break;

      case 'iceDomain':
        Sfx.domain();
        this.iceDomainTimer = 16;
        this.game.addMessage('【玄冰领域】展开！气温骤降，敌人移动与回蓝被压制！', 2.8);
        break;

      case 'mammothStomp':
        Sfx.gravityPunch();
        this.game.addParticles(p.x, p.y, '#d4a017', 35);
        for (var st = 0; st < enemies.length; st++) {
          if (U.dist(p.x, p.y, enemies[st].x, enemies[st].y) < 150) {
            enemies[st].stunned = 2.2;
            enemies[st].takeDamage(p.getEffectiveAttack() * 2.4, p);
          }
        }
        break;

      case 'goldShield':
        Sfx.goldBody();
        p.shieldActive = true;
        p.shieldHp = 1800;
        this.projectiles.push({
          type: 'lightShield',
          x: p.x, y: 12, z: p.y,
          angle: p.angle,
          life: 9.0,
          owner: p
        });
        break;

      case 'speedAmp':
        Sfx.wing();
        p.isFlying = true;
        p.flightTime = 8.0;
        this.game.addParticles(p.x, p.y, '#ffcc66', 18);
        break;

      case 'mpSurge':
        Sfx.absorb();
        p.mp = Math.min(p.maxMp, p.mp + 420);
        this.game.addMessage('魂力回涌！魂力瞬间恢复', 1.6);
        break;

      case 'emeraldWave':
        Sfx.absorb();
        p.hp = Math.min(p.maxHp, p.hp + 900);
        this.game.addParticles(p.x, p.y, '#66ff99', 30);
        this.game.addMessage('翡翠光波！伤势愈合', 1.6);
        break;

      case 'purify':
        Sfx.goldBody();
        p.stunned = 0;
        p.blinded = 0;
        p.heavyDebuff = 0;
        p.domainDebuff = false;
        this.game.addMessage('净化之光！负面状态驱散', 1.6);
        break;

      case 'lifeDomain':
        Sfx.domain();
        this.lifeDomainTimer = 16;
        this.game.addMessage('【生命礼赞领域】展开！伤势极速自动愈合！', 2.8);
        break;
    }
  };

  SkillManager.prototype.getNearestEnemy = function (from, list, maxDist) {
    var best = null;
    var bestD = maxDist || Infinity;
    for (var i = 0; i < list.length; i++) {
      var d = U.dist(from.x, from.y, list[i].x, list[i].y);
      if (d < bestD) {
        bestD = d;
        best = list[i];
      }
    }
    return best;
  };

  // 每帧更新弹道与领域状态
  SkillManager.prototype.update = function (dt) {
    var player = this.game.player;
    var enemies = this.game.dinos.filter(function (d) { return d.alive && (!player || d.id !== player.id); });

    // 1. 领域状态检测与灼烧
    if (this.domainActive) {
      this.domainTimer -= dt;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        this.game.world.setDomainActive(false, 0, 0);
        if (player) player.domainBlessing = false;
        for (var k = 0; k < enemies.length; k++) {
          enemies[k].domainDebuff = false;
        }
      } else {
        // 领域内对无徽章敌人持续施加灼烧与50%属性削弱
        for (var e = 0; e < enemies.length; e++) {
          var enemy = enemies[e];
          if (!enemy.hasBadge) {
            enemy.domainDebuff = true;
            // 每秒受到光明火焰灼烧伤害
            enemy.takeDamage(player.getEffectiveAttack() * 0.25 * dt, player);
            if (Math.random() < 0.15) {
              this.game.addParticles(enemy.x, enemy.y, '#ffaa00', 2);
            }
          }
        }
      }
    }

    if (this.iceDomainTimer > 0) {
      this.iceDomainTimer -= dt;
      for (var ice = 0; ice < enemies.length; ice++) {
        enemies[ice].heavyDebuff = Math.max(enemies[ice].heavyDebuff, 0.4);
        enemies[ice].mp = Math.max(0, enemies[ice].mp - 18 * dt);
      }
    }

    if (this.lifeDomainTimer > 0 && player && player.alive) {
      this.lifeDomainTimer -= dt;
      player.hp = Math.min(player.maxHp, player.hp + 90 * dt);
    }

    // 2. 技能弹道更新
    for (var i = this.projectiles.length - 1; i >= 0; i--) {
      var p = this.projectiles[i];
      p.life -= dt;

      // 跟踪型激光柱 (第六魂技追踪太阳神光)
      if (p.type === 'laser') {
        if (p.target && p.target.alive) {
          var targetAngle = U.angleTo(p.x, p.z, p.target.x, p.target.y);
          var angleDiff = U.wrapAngle(targetAngle - p.angle);
          p.angle += angleDiff * dt * 4.5; // 自动拐弯追踪敌人！
        }
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.z += Math.sin(p.angle) * p.speed * dt;
      }
      // 御剑术飞剑
      else if (p.type === 'sword') {
        if (p.target && p.target.alive) {
          var swTgtAngle = U.angleTo(p.x, p.z, p.target.x, p.target.y);
          var swDiff = U.wrapAngle(swTgtAngle - p.angle);
          p.angle += swDiff * dt * 6.0;
        }
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.z += Math.sin(p.angle) * p.speed * dt;
      }
      // 光耀审判天降巨剑
      else if (p.type === 'judgment') {
        p.y += p.vyGround * dt;
        if (p.y <= 0) {
          p.y = 0;
          p.life = 0; // 落地爆炸
          Sfx.hit();
          this.game.addParticles(p.x, p.z, '#ffffff', 40);
          for (var j = 0; j < enemies.length; j++) {
            var distJ = U.dist(p.x, p.z, enemies[j].x, enemies[j].y);
            if (distJ < 90) {
              enemies[j].takeDamage(p.damage, p.owner);
            }
          }
        }
      }
      // 光盾持续依附在玩家身前
      else if (p.type === 'lightShield') {
        if (player) {
          p.x = player.x + Math.cos(player.angle) * 16;
          p.z = player.y + Math.sin(player.angle) * 16;
          p.angle = player.angle;
        }
      }
      // 圣龙爆破拳二次金色爆炸
      else if (p.type === 'explosion') {
        if (p.life <= 0 && p.target && p.target.alive) {
          p.target.takeDamage(p.damage, p.owner);
          this.game.addParticles(p.target.x, p.target.y, '#ffa500', 30);
          Sfx.hit();
        }
      }
      // 常规弹道 (龙羽、龙针、裂空爪光刃)
      else {
        p.x += (p.vx || 0) * dt;
        p.z += (p.vy || 0) * dt;
      }

      // 弹道命中敌人碰撞检测
      if (p.type !== 'judgment' && p.type !== 'lightShield' && p.type !== 'explosion') {
        for (var m = 0; m < enemies.length; m++) {
          var victim = enemies[m];
          var hitDist = U.dist(p.x, p.z, victim.x, victim.y);
          if (hitDist < victim.radius + 15) {
            victim.takeDamage(p.damage || 50, p.owner);
            if (p.debuffDefense) {
              victim.defense = Math.max(10, victim.defense - 25);
            }
            this.game.addParticles(victim.x, victim.y, '#ffd700', 8);
            Sfx.hit();
            p.life = 0;
            break;
          }
        }
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }
  };

  global.SKILLS_DATA = SKILLS_DATA;
  global.SkillManager = SkillManager;
})(window);
