/**
 * 赛事与挑战配置：16 场比赛（难度递增）+ 5 个可无限重复的挑战。
 */
(function (global) {
  'use strict';

  var RACES = [
    { id: 'r1', name: '新手夜跑', track: 'city', laps: 2, rivals: 4, difficulty: 0.02, prize: [1200, 700, 400] },
    { id: 'r2', name: '霓虹街头赛', track: 'city', laps: 2, rivals: 4, difficulty: 0.08, prize: [1600, 900, 500] },
    { id: 'r3', name: '港口热身', track: 'harbor', laps: 2, rivals: 4, difficulty: 0.14, prize: [2100, 1200, 700] },
    { id: 'r4', name: '午夜杯', track: 'city', laps: 3, rivals: 4, difficulty: 0.2, prize: [2600, 1500, 850] },
    { id: 'r5', name: '跑道冲刺', track: 'airfield', laps: 2, rivals: 4, difficulty: 0.26, prize: [3200, 1800, 1000] },
    { id: 'r6', name: '集装箱之战', track: 'harbor', laps: 3, rivals: 4, difficulty: 0.32, prize: [3900, 2200, 1200] },
    { id: 'r7', name: '街区争霸', track: 'city', laps: 3, rivals: 4, difficulty: 0.38, prize: [4600, 2600, 1400] },
    { id: 'r8', name: '极速跑道赛', track: 'airfield', laps: 3, rivals: 4, difficulty: 0.44, prize: [5400, 3000, 1700] },
    { id: 'r9', name: '海风狂飙', track: 'harbor', laps: 3, rivals: 4, difficulty: 0.5, prize: [6300, 3500, 2000] },
    { id: 'r10', name: '霓虹大奖赛', track: 'city', laps: 4, rivals: 4, difficulty: 0.57, prize: [7400, 4100, 2300] },
    { id: 'r11', name: '跑道之王', track: 'airfield', laps: 4, rivals: 4, difficulty: 0.63, prize: [8600, 4800, 2700] },
    { id: 'r12', name: '港口决斗', track: 'harbor', laps: 4, rivals: 4, difficulty: 0.7, prize: [10000, 5600, 3100] },
    { id: 'r13', name: '午夜狂欢赛', track: 'city', laps: 4, rivals: 4, difficulty: 0.76, prize: [11800, 6500, 3600] },
    { id: 'r14', name: '音爆挑战', track: 'airfield', laps: 4, rivals: 4, difficulty: 0.83, prize: [13800, 7600, 4200] },
    { id: 'r15', name: '不夜城冠军赛', track: 'harbor', laps: 5, rivals: 4, difficulty: 0.9, prize: [16500, 9000, 5000] },
    { id: 'r16', name: '终极对决', track: 'city', laps: 5, rivals: 4, difficulty: 1, prize: [22000, 12000, 6500] }
  ];

  var CHALLENGES = [
    {
      id: 'tt-city', kind: 'timetrial', name: '市区计时赛', track: 'city',
      desc: '单圈跑进目标时间', target: 74, reward: 2400
    },
    {
      id: 'tt-harbor', kind: 'timetrial', name: '港口计时赛', track: 'harbor',
      desc: '单圈跑进目标时间', target: 76, reward: 3200
    },
    {
      id: 'tt-airfield', kind: 'timetrial', name: '跑道计时赛', track: 'airfield',
      desc: '单圈跑进目标时间', target: 66, reward: 2800
    },
    {
      id: 'drift', kind: 'drift', name: '漂移大师', track: 'arena',
      desc: '90 秒内在场地里连续甩尾刷分', target: 4000, duration: 90, reward: 3000
    },
    {
      id: 'stunt', kind: 'stunt', name: '特技表演', track: 'arena',
      desc: '90 秒内用跳台刷满特技分', target: 5000, duration: 90, reward: 3400
    }
  ];

  var RIVAL_NAMES = [
    '暗影', '疾风', '毒蜂', '铁拳', '幽灵', '雷霆', '飞刀', '狂鲨',
    '夜枭', '闪电', '龙卷', '烈焰'
  ];

  var RIVAL_COLORS = [0xff3b30, 0x00e5ff, 0xffd400, 0x9d4dff, 0x39ff9e, 0xff7a00];

  global.RaceEvents = {
    races: RACES,
    challenges: CHALLENGES,
    rivalNames: RIVAL_NAMES,
    rivalColors: RIVAL_COLORS,
    race: function (id) {
      for (var i = 0; i < RACES.length; i++) if (RACES[i].id === id) return RACES[i];
      return null;
    },
    challenge: function (id) {
      for (var i = 0; i < CHALLENGES.length; i++) if (CHALLENGES[i].id === id) return CHALLENGES[i];
      return null;
    },
    /** 前一场完成后才解锁下一场（第一场默认解锁） */
    unlocked: function (index, completed) {
      if (index === 0) return true;
      return !!completed[RACES[index - 1].id];
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
