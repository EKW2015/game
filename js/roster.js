/**
 * 圣龙神辉战队七人名单 + 对手学院队伍（斗罗大陆团队赛 1v1）
 */
(function (global) {
  'use strict';

  var RING_YPPBBBR = '黄 紫 紫 黑 黑 黑 红';
  var RING_YYPPBBB = '黄 黄 紫 紫 黑 黑 黑';

  var PLAYER_TEAM = {
    id: 'shenglong',
    name: '圣龙神辉战队',
    motto: '光明圣龙的神圣光辉 · 优雅高贵，极具正义感',
    slogan: '圣龙出世，震碎全场！凯威带队，势不可挡！',
    members: [
      {
        id: 'chen',
        name: '陈凯威',
        title: '队长 · 强攻系战魂圣',
        soul: '光明圣龙',
        rings: RING_YPPBBBR,
        model: 'dragon',
        bone: '九万年双臂骨',
        domain: '十万年·圣龙主迹领域',
        role: '全队核心输出',
        hp: 3500, mp: 1200, attack: 250, defense: 170, level: 78,
        skills: ['ring1', 'ring2', 'ring3', 'ring4', 'ring5', 'ring6', 'ring7', 'domain', 'fusionTwin', 'fusionPhoenix'],
        kit: 'full',
        uniform: 'male'
      },
      {
        id: 'moying',
        name: '墨影',
        title: '队员1 · 敏攻系魂圣',
        soul: '影疾夜刃',
        rings: RING_YYPPBBB,
        model: 'assassin',
        bone: '九万年·柔骨兔右腿骨',
        domain: '',
        role: '暗影刺客',
        hp: 2600, mp: 900, attack: 230, defense: 90, level: 76,
        skills: ['shadowStrike', 'bladeStorm', 'trueBody', 'fusionTwin'],
        kit: 'member',
        uniform: 'male'
      },
      {
        id: 'yanhuang',
        name: '焱凰',
        title: '队员2 · 远攻/控制系魂圣',
        soul: '天火凤凰',
        rings: RING_YYPPBBB,
        model: 'phoenix',
        bone: '八万年·爆裂赤炎头骨',
        domain: '',
        role: '远程大范围爆发',
        hp: 2400, mp: 1100, attack: 220, defense: 85, level: 75,
        skills: ['phoenixMeteor', 'fireCage', 'trueBody', 'fusionPhoenix'],
        kit: 'member',
        uniform: 'female'
      },
      {
        id: 'lengningshuang',
        name: '冷凝霜',
        title: '队员3 · 控制系魂圣',
        soul: '九幽玄冰草',
        rings: RING_YYPPBBB,
        model: 'ice',
        bone: '',
        domain: '玄冰领域',
        role: '掌控全局节奏',
        hp: 2300, mp: 1200, attack: 150, defense: 95, level: 75,
        skills: ['absoluteZero', 'iceVines', 'iceDomain', 'trueBody'],
        kit: 'member',
        uniform: 'female'
      },
      {
        id: 'shipotian',
        name: '石破天',
        title: '队员4 · 防御系魂圣',
        soul: '黄金猛犸',
        rings: RING_YYPPBBB,
        model: 'mammoth',
        bone: '八万年·泰坦巨猿左臂骨',
        domain: '',
        role: '前排大肉盾',
        hp: 5200, mp: 800, attack: 160, defense: 260, level: 77,
        skills: ['mammothStomp', 'goldShield', 'trueBody'],
        kit: 'member',
        uniform: 'male'
      },
      {
        id: 'shenliuli',
        name: '沈琉璃',
        title: '队员5 · 食物/辅助系魂圣',
        soul: '九彩琉璃灯',
        rings: RING_YYPPBBB,
        model: 'lamp',
        bone: '',
        domain: '',
        role: '全队充电宝',
        hp: 2100, mp: 1400, attack: 90, defense: 80, level: 74,
        skills: ['speedAmp', 'mpSurge', 'trueBody'],
        kit: 'member',
        uniform: 'female'
      },
      {
        id: 'baiyiyi',
        name: '白依依',
        title: '队员6 · 治疗系魂圣',
        soul: '生命翡翠鸟',
        rings: RING_YYPPBBB,
        model: 'bird',
        bone: '七万年·生命之树躯干骨',
        domain: '生命礼赞领域',
        role: '超级医疗兵',
        hp: 2800, mp: 1300, attack: 80, defense: 100, level: 75,
        skills: ['emeraldWave', 'purify', 'lifeDomain', 'trueBody'],
        kit: 'member',
        uniform: 'female'
      }
    ]
  };

  var ENEMY_TEAMS = [
    {
      id: 'wuhun',
      name: '武魂殿黑衣队',
      members: [
        { id: 'e1', name: '黑衣执事', title: '强攻系魂圣', soul: '暗影魔龙', model: 'dragon', hp: 4300, mp: 1200, attack: 290, defense: 185, level: 77, skills: ['ring1', 'ring3', 'ring5', 'trueBody'] },
        { id: 'e2', name: '夜杀', title: '敏攻系魂圣', soul: '幽冥刺', model: 'assassin', hp: 3100, mp: 980, attack: 280, defense: 100, level: 76, skills: ['shadowStrike', 'bladeStorm', 'trueBody'] },
        { id: 'e3', name: '炎狱', title: '远攻系魂圣', soul: '狱火鸦', model: 'phoenix', hp: 2900, mp: 1100, attack: 265, defense: 95, level: 76, skills: ['phoenixMeteor', 'fireCage', 'trueBody'] },
        { id: 'e4', name: '寒魄', title: '控制系魂圣', soul: '玄冰蝎', model: 'ice', hp: 2800, mp: 1200, attack: 190, defense: 115, level: 75, skills: ['iceVines', 'absoluteZero', 'iceDomain', 'trueBody'] },
        { id: 'e5', name: '铁壁', title: '防御系魂圣', soul: '玄甲犀', model: 'mammoth', hp: 6200, mp: 850, attack: 200, defense: 290, level: 76, skills: ['mammothStomp', 'goldShield', 'trueBody'] },
        { id: 'e6', name: '烛阴', title: '辅助系魂圣', soul: '幽光灯', model: 'lamp', hp: 2500, mp: 1400, attack: 120, defense: 90, level: 74, skills: ['speedAmp', 'mpSurge', 'trueBody'] },
        { id: 'e7', name: '血藤', title: '治疗系魂圣', soul: '吸血藤', model: 'bird', hp: 3200, mp: 1300, attack: 110, defense: 115, level: 75, skills: ['emeraldWave', 'purify', 'trueBody'] }
      ]
    },
    {
      id: 'xingluo',
      name: '星罗皇家一队',
      members: [
        { id: 'x1', name: '戴星河', title: '强攻系魂圣', soul: '白虎', model: 'mammoth', hp: 4600, mp: 1150, attack: 310, defense: 200, level: 78, skills: ['mammothStomp', 'goldShield', 'trueBody'] },
        { id: 'x2', name: '朱影', title: '敏攻系魂圣', soul: '幽冥灵猫', model: 'assassin', hp: 3300, mp: 1000, attack: 300, defense: 110, level: 77, skills: ['shadowStrike', 'bladeStorm', 'trueBody'] },
        { id: 'x3', name: '火鸾', title: '远攻系魂圣', soul: '赤焰鸾', model: 'phoenix', hp: 3100, mp: 1200, attack: 285, defense: 105, level: 77, skills: ['phoenixMeteor', 'fireCage', 'trueBody'] },
        { id: 'x4', name: '冰璃', title: '控制系魂圣', soul: '霜莲', model: 'ice', hp: 3000, mp: 1300, attack: 210, defense: 120, level: 76, skills: ['absoluteZero', 'iceDomain', 'iceVines', 'trueBody'] },
        { id: 'x5', name: '岩盾', title: '防御系魂圣', soul: '金刚象', model: 'mammoth', hp: 6800, mp: 900, attack: 220, defense: 320, level: 78, skills: ['goldShield', 'mammothStomp', 'trueBody'] },
        { id: 'x6', name: '流光', title: '辅助系魂圣', soul: '琉璃盏', model: 'lamp', hp: 2700, mp: 1550, attack: 130, defense: 100, level: 75, skills: ['mpSurge', 'speedAmp', 'trueBody'] },
        { id: 'x7', name: '春芽', title: '治疗系魂圣', soul: '翠羽雀', model: 'bird', hp: 3500, mp: 1450, attack: 120, defense: 125, level: 76, skills: ['lifeDomain', 'emeraldWave', 'trueBody'] }
      ]
    },
    {
      id: 'tiandou',
      name: '天斗皇家队',
      members: [
        { id: 't1', name: '玉天心', title: '强攻系魂圣', soul: '蓝电霸王龙', model: 'dragon', hp: 5000, mp: 1300, attack: 340, defense: 220, level: 80, skills: ['ring1', 'ring3', 'ring5', 'trueBody'] },
        { id: 't2', name: '独孤锋', title: '敏攻系魂圣', soul: '碧磷蛇', model: 'assassin', hp: 3500, mp: 1100, attack: 320, defense: 120, level: 78, skills: ['shadowStrike', 'bladeStorm', 'trueBody'] },
        { id: 't3', name: '火舞', title: '控制系魂圣', soul: '邪火凤凰', model: 'phoenix', hp: 3300, mp: 1250, attack: 300, defense: 115, level: 77, skills: ['fireCage', 'phoenixMeteor', 'trueBody'] },
        { id: 't4', name: '雪晴', title: '控制系魂圣', soul: '雪女', model: 'ice', hp: 3200, mp: 1400, attack: 230, defense: 130, level: 77, skills: ['iceDomain', 'absoluteZero', 'iceVines', 'trueBody'] },
        { id: 't5', name: '大力', title: '防御系魂圣', soul: '金刚', model: 'mammoth', hp: 7600, mp: 980, attack: 240, defense: 360, level: 79, skills: ['mammothStomp', 'goldShield', 'trueBody'] },
        { id: 't6', name: '宁风', title: '辅助系魂圣', soul: '七宝琉璃', model: 'lamp', hp: 2900, mp: 1700, attack: 145, defense: 110, level: 76, skills: ['speedAmp', 'mpSurge', 'trueBody'] },
        { id: 't7', name: '叶青', title: '治疗系魂圣', soul: '青鸾', model: 'bird', hp: 3800, mp: 1550, attack: 135, defense: 140, level: 77, skills: ['emeraldWave', 'purify', 'lifeDomain', 'trueBody'] }
      ]
    }
  ];

  function cloneMember(m) {
    return {
      id: m.id,
      name: m.name,
      title: m.title || '',
      soul: m.soul,
      rings: m.rings || RING_YYPPBBB,
      model: m.model,
      bone: m.bone || '',
      domain: m.domain || '',
      role: m.role || '',
      hp: m.hp,
      maxHp: m.hp,
      mp: m.mp,
      maxMp: m.mp,
      attack: m.attack,
      defense: m.defense,
      level: m.level,
      skills: (function () {
        var s = (m.skills || []).slice();
        if (s.indexOf('trueBody') < 0 && s.indexOf('ring7') < 0) s.push('trueBody');
        return s;
      })(),
      kit: m.kit || 'member',
      uniform: m.uniform || '',
      eliminated: false
    };
  }

  function cloneTeam(team) {
    return {
      id: team.id,
      name: team.name,
      motto: team.motto || '',
      slogan: team.slogan || '',
      members: team.members.map(cloneMember)
    };
  }

  global.Roster = {
    PLAYER_TEAM: PLAYER_TEAM,
    ENEMY_TEAMS: ENEMY_TEAMS,
    cloneTeam: cloneTeam,
    cloneMember: cloneMember
  };
})(window);
