/**
 * 像素图形数据。
 * 每个精灵用字符串数组描述，'X' 表示实心像素，'.' 表示透明。
 * parse() 会把每一行的连续实心像素压缩成横向色块，绘制时一次 fillRect 画一段。
 */
(function (global) {
  'use strict';

  function parse(rows) {
    var h = rows.length;
    var w = rows[0].length;
    var runs = [];

    for (var y = 0; y < h; y++) {
      var row = rows[y];
      if (row.length !== w) {
        throw new Error('精灵第 ' + y + ' 行宽度不一致: ' + row.length + ' != ' + w);
      }
      var x = 0;
      while (x < w) {
        if (row.charAt(x) === 'X') {
          var len = 1;
          while (x + len < w && row.charAt(x + len) === 'X') len++;
          runs.push(x, y, len);
          x += len;
        } else {
          x++;
        }
      }
    }

    return { w: w, h: h, runs: runs };
  }

  /** 以 (x, y) 为左上角，按 px 倍率绘制精灵。 */
  function draw(ctx, sprite, x, y, px) {
    var runs = sprite.runs;
    for (var i = 0; i < runs.length; i += 3) {
      ctx.fillRect(x + runs[i] * px, y + runs[i + 1] * px, runs[i + 2] * px, px);
    }
  }

  // ---------------------------------------------------------------- 恐龙

  var DINO_BODY = [
    '............XXXXXXXX..',
    '...........XXXXXXXXXX.',
    '...........XXXXXXXXXX.',
    '...........XXXXXXXXXX.',
    '...........XXX..XXXXX.',
    '...........XXXXXXXXXX.',
    '...........XXXXXXXXXX.',
    '...........XXXXXXX....',
    '...........XXXXXXXXXX.',
    'X..........XXXXXXX....',
    'XX.........XXXXXX.....',
    'XXX.......XXXXXXX.....',
    '.XXXX....XXXXXXXX.....',
    '..XXXXXXXXXXXXXXX.....',
    '...XXXXXXXXXXXXXX.....',
    '....XXXXXXXXXXXXX.....',
    '.....XXXXXXXXXXXX.....',
    '......XXXXXXXXXXX.....',
    '......XXXXXXXXXX......',
    '......XXXXXXXX........',
    '......XXXXXXX.........'
  ];

  var DINO_LEGS_STAND = [
    '......XX..XXX.........',
    '......XX...XX.........',
    '.....XXX...XXX........'
  ];

  var DINO_LEGS_RUN_A = [
    '......XX..XXX.........',
    '......XX...X..........',
    '.....XXX..............'
  ];

  var DINO_LEGS_RUN_B = [
    '......XX..XXX.........',
    '.......X...XX.........',
    '..........XXX.........'
  ];

  // 撞到障碍物时的表情：眼睛变成 X，嘴巴张开
  var DINO_BODY_DEAD = DINO_BODY.slice();
  DINO_BODY_DEAD[4] = '...........XXXX.XXXXX.';
  DINO_BODY_DEAD[7] = '...........XXXX.......';

  var DINO_DUCK_BODY = [
    '.................XXXXXXXX.',
    '................XXXXXXXXXX',
    '................XXX..XXXXX',
    '................XXXXXXXXXX',
    '...........XXXXXXXXXXXXXX.',
    'X.........XXXXXXXXXXXX....',
    'XX.......XXXXXXXXXXX......',
    'XXXXXXXXXXXXXXXXXXXX......',
    '.XXXXXXXXXXXXXXXXXX.......',
    '..XXXXXXXXXXXXXXXX........',
    '...XXXXXXXXXXXXXX.........'
  ];

  var DINO_DUCK_LEGS_A = [
    '....XX..XXX...............',
    '....XX...XX...............',
    '...XXX...XXX..............'
  ];

  var DINO_DUCK_LEGS_B = [
    '....XX..XXX...............',
    '....XX...X................',
    '...XXX....................'
  ];

  // ---------------------------------------------------------------- 仙人掌

  var CACTUS_SMALL = [
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '.XX.XXX.XX.',
    '.XX.XXX.XX.',
    '.XX.XXX.XX.',
    '.XXXXXXXXX.',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....',
    '....XXX....'
  ];

  var CACTUS_LARGE = [
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '..XX..XXX..XX..',
    '..XX..XXX..XX..',
    '..XX..XXX..XX..',
    '..XX..XXX..XX..',
    '..XX..XXX..XX..',
    '..XXXXXXX..XX..',
    '......XXX..XX..',
    '......XXXXXXX..',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......',
    '......XXX......'
  ];

  // ---------------------------------------------------------------- 翼龙

  var BIRD_UP = [
    '......XXXX............',
    '......XXXXX...........',
    '.....XXXXXX...........',
    '.....XXXXXXX..........',
    '....XXXXXXXX..........',
    '....XXXXXXXXX.........',
    '...XXXXXXXXXX.........',
    '..XXXXXXXXXXXXXXXXXX..',
    '..XXXXXXXXXXXXXXXXXXXX',
    '...XXXXXXXXXXXXXX.....',
    '....XXXXXXX...........',
    '.....XXX..............',
    '......................',
    '......................',
    '......................',
    '......................',
    '......................'
  ];

  var BIRD_DOWN = [
    '......................',
    '......................',
    '......................',
    '......................',
    '......................',
    '......................',
    '......................',
    '..XXXXXXXXXXXXXXXXXX..',
    '..XXXXXXXXXXXXXXXXXXXX',
    '...XXXXXXXXXXXXXX.....',
    '...XXXXXXXXXX.........',
    '....XXXXXXXXX.........',
    '....XXXXXXXX..........',
    '.....XXXXXXX..........',
    '.....XXXXXX...........',
    '......XXXXX...........',
    '......XXXX............'
  ];

  // ---------------------------------------------------------------- 云

  var CLOUD = [
    '..........XXXXX...........',
    '........XXXXXXXXX.........',
    '.......XXXXXXXXXXX........',
    '....XXXXXXXXXXXXXXX.......',
    '..XXXXXXXXXXXXXXXXXXX.....',
    '.XXXXXXXXXXXXXXXXXXXXXXX..',
    'XXXXXXXXXXXXXXXXXXXXXXXXXX',
    '.XXXXXXXXXXXXXXXXXXXXXXXX.',
    '..XXXXXXXXXXXXXXXXXXXXXX..',
    '.....XXXXXXXXXXXXXXXX.....'
  ];

  var STAR = [
    '.X.',
    'XXX',
    '.X.'
  ];

  function withLegs(body, legs) {
    return parse(body.concat(legs));
  }

  global.Sprites = {
    parse: parse,
    draw: draw,
    dinoIdle: withLegs(DINO_BODY, DINO_LEGS_STAND),
    dinoRun: [withLegs(DINO_BODY, DINO_LEGS_RUN_A), withLegs(DINO_BODY, DINO_LEGS_RUN_B)],
    dinoDead: withLegs(DINO_BODY_DEAD, DINO_LEGS_STAND),
    dinoDuck: [
      withLegs(DINO_DUCK_BODY, DINO_DUCK_LEGS_A),
      withLegs(DINO_DUCK_BODY, DINO_DUCK_LEGS_B)
    ],
    cactusSmall: parse(CACTUS_SMALL),
    cactusLarge: parse(CACTUS_LARGE),
    bird: [parse(BIRD_UP), parse(BIRD_DOWN)],
    cloud: parse(CLOUD),
    star: parse(STAR)
  };
})(window);
