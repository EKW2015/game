(function (global) {
  'use strict';

  var doc = global.document;
  var canvas = doc.getElementById('game');

  var overlays = {
    ready: doc.getElementById('overlay-ready'),
    pick: doc.getElementById('overlay-pick'),
    over: doc.getElementById('overlay-over'),
    paused: doc.getElementById('overlay-paused'),
    error: doc.getElementById('overlay-error')
  };
  var deathStats = doc.getElementById('death-stats');
  var errorMsg = doc.getElementById('error-msg');
  var soundButton = doc.getElementById('btn-sound');
  var pauseButton = doc.getElementById('btn-pause');
  var touchControls = doc.getElementById('touch-controls');
  var toast = doc.getElementById('toast');

  var hudTitle = doc.getElementById('hud-title');
  var hudSoul = doc.getElementById('hud-soul');
  var hudLevel = doc.getElementById('hud-level');
  var hudHp = doc.getElementById('hud-hp');
  var hudHpBar = doc.getElementById('hud-hp-bar');
  var hudMp = doc.getElementById('hud-mp');
  var hudMpBar = doc.getElementById('hud-mp-bar');
  var hudBuffs = doc.getElementById('hud-buffs');
  var hudDomainStatus = doc.getElementById('hud-domain-status');
  var hudMatch = doc.getElementById('hud-match');
  var hudMyLeft = doc.getElementById('hud-my-left');
  var hudEnLeft = doc.getElementById('hud-en-left');
  var hudTeamWins = doc.getElementById('hud-team-wins');
  var kitFull = doc.getElementById('kit-full');
  var kitMember = doc.getElementById('kit-member');
  var memberSkillGrid = doc.getElementById('member-skill-grid');
  var pickGrid = doc.getElementById('pick-grid');
  var pickTitle = doc.getElementById('pick-title');
  var pickSub = doc.getElementById('pick-sub');
  var bootScreen = doc.getElementById('boot-screen');
  var bootMsg = doc.getElementById('boot-msg');

  var game = null;

  function hideBoot() {
    if (bootScreen) bootScreen.style.display = 'none';
  }

  function showBootError(msg) {
    if (bootMsg) {
      bootMsg.style.color = '#ff8888';
      bootMsg.innerHTML = msg;
    }
  }

  function showOverlay(name) {
    Object.keys(overlays).forEach(function (key) {
      if (!overlays[key]) return;
      overlays[key].classList.toggle('overlay--hidden', key !== name);
    });
  }

  function formatStats(g) {
    var my = g.aliveMembers(g.playerTeam).length;
    var en = g.aliveMembers(g.enemyTeam).length;
    return '对阵 ' + g.enemyTeam.name + ' · 我方剩余 ' + my + ' · 敌方剩余 ' + en + ' · 连胜 ' + g.teamWins + ' 场';
  }

  function skillMapFor(g) {
    var full = {
      Digit1: 'ring1', Digit2: 'ring2', Digit3: 'ring3', Digit4: 'ring4',
      Digit5: 'ring5', Digit6: 'ring6', Digit7: 'ring7',
      KeyQ: 'custom1', KeyE: 'custom2', KeyZ: 'custom3', KeyX: 'custom4',
      KeyC: 'custom5', KeyV: 'custom6', KeyB: 'custom7',
      KeyF: 'boneL', KeyG: 'boneR', KeyT: 'domain'
    };
    var p = g.player;
    if (!p || p.kit === 'full' || p.characterId === 'chen') return full;
    var mem = g.findMember(g.playerTeam, p.characterId);
    var map = {};
    if (!mem) return map;
    if (mem.skills[0]) map.Digit1 = mem.skills[0];
    if (mem.skills[1]) map.Digit2 = mem.skills[1];
    if (mem.skills[2]) {
      map.Digit3 = mem.skills[2];
      map.KeyT = mem.skills[2];
    }
    return map;
  }

  function renderPick(g) {
    if (!pickGrid) return;
    var enemy = g.aliveMembers(g.enemyTeam)[0];
    pickTitle.textContent = '第 ' + (g.roundIndex + 1) + ' 局 · 选择出战';
    pickSub.textContent = '对阵【' + g.enemyTeam.name + '】下一名：' + (enemy ? enemy.name + '（' + enemy.soul + '）' : '无') +
      '　我方剩余 ' + g.aliveMembers(g.playerTeam).length + ' / 敌方剩余 ' + g.aliveMembers(g.enemyTeam).length;
    pickGrid.innerHTML = '';
    g.playerTeam.members.forEach(function (m) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'pick-card' + (m.eliminated ? ' is-out' : '');
      btn.disabled = !!m.eliminated;
      btn.setAttribute('data-pick', m.id);
      btn.innerHTML = '<div class="pc-name">' + m.name + (m.eliminated ? ' · 已退场' : '') + '</div>' +
        '<div class="pc-meta">' + m.title + '<br>武魂：' + m.soul + '<br>生命 ' + Math.round(m.hp) + '/' + m.maxHp +
        '<br>' + (m.role || '') + '</div>';
      pickGrid.appendChild(btn);
    });
  }

  function renderMemberSkills(g) {
    if (!memberSkillGrid) return;
    var p = g.player;
    memberSkillGrid.innerHTML = '';
    if (!p || p.kit === 'full' || p.characterId === 'chen') return;
    var mem = g.findMember(g.playerTeam, p.characterId);
    if (!mem) return;
    var keys = ['1', '2', 'T'];
    mem.skills.forEach(function (sid, i) {
      var data = global.SKILLS_DATA[sid] || { name: sid, cost: 0 };
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'skill-btn';
      btn.setAttribute('data-skill', sid);
      btn.innerHTML = '<span class="s-key">[' + keys[i] + '] ' + (i === 2 ? '领域' : '魂技') + '</span>' +
        '<span class="s-name">' + data.name + '</span>' +
        '<span class="s-cost">魂力 ' + data.cost + '</span>';
      memberSkillGrid.appendChild(btn);
    });
  }

  function bindControls() {
    var MOVE_KEYS = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right'
    };
    var BITE_KEYS = { Space: 1, KeyJ: 1 };

    // 技能按键映射表
    var SKILL_KEY_MAP = {
      Digit1: 'ring1',
      Digit2: 'ring2',
      Digit3: 'ring3',
      Digit4: 'ring4',
      Digit5: 'ring5',
      Digit6: 'ring6',
      Digit7: 'ring7',
      KeyQ: 'custom1',
      KeyE: 'custom2',
      KeyZ: 'custom3',
      KeyX: 'custom4',
      KeyC: 'custom5',
      KeyV: 'custom6',
      KeyB: 'custom7',
      KeyF: 'boneL',
      KeyG: 'boneR',
      KeyT: 'domain'
    };

    doc.addEventListener('keydown', function (event) {
      if (!game || event.metaKey || event.ctrlKey || event.altKey) return;
      var code = event.code;

      if (MOVE_KEYS[code]) {
        event.preventDefault();
        if (!event.repeat) game.press(MOVE_KEYS[code]);
        return;
      }
      if (BITE_KEYS[code]) {
        event.preventDefault();
        if (!event.repeat) game.press('bite');
        return;
      }

      var liveMap = skillMapFor(game);
      if (liveMap[code] || SKILL_KEY_MAP[code]) {
        event.preventDefault();
        if (game.state === 'playing') {
          game.skills.castSkill(liveMap[code] || SKILL_KEY_MAP[code]);
        }
        return;
      }

      if (code === 'KeyP' || code === 'Escape') {
        event.preventDefault();
        game.togglePause();
      } else if (code === 'KeyM') {
        toggleSound();
      } else if (code === 'KeyR') {
        if (game.state === 'over' || game.state === 'playing') game.restart();
      }
    });

    doc.addEventListener('keyup', function (event) {
      if (!game) return;
      if (MOVE_KEYS[event.code]) game.release(MOVE_KEYS[event.code]);
      else if (BITE_KEYS[event.code]) game.release('bite');
    });

    // 技能按钮点击释放
    doc.addEventListener('click', function (event) {
      if (!game) return;
      var pickBtn = event.target.closest('[data-pick]');
      if (pickBtn && game.state === 'pick') {
        game.startRound(pickBtn.getAttribute('data-pick'));
        return;
      }
      var skillBtn = event.target.closest('[data-skill]');
      if (skillBtn) {
        var skillId = skillBtn.getAttribute('data-skill');
        if (game.state === 'ready') game.setState('pick');
        if (game.state === 'playing') game.skills.castSkill(skillId);
        return;
      }

      var target = event.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');
      if (action === 'start') game.setState('pick');
      else if (action === 'restart') game.restart();
      else if (action === 'resume') game.togglePause();
    });

    Array.prototype.forEach.call(touchControls.querySelectorAll('[data-hold]'), function (button) {
      var action = button.getAttribute('data-hold');
      button.addEventListener('pointerdown', function (event) {
        if (!game) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        game.press(action);
        if (game.state === 'ready') game.setState('pick');
      });
      button.addEventListener('pointerup', function () { if (game) game.release(action); });
      button.addEventListener('pointercancel', function () { if (game) game.release(action); });
    });

    soundButton.addEventListener('click', toggleSound);
    pauseButton.addEventListener('click', function () { if (game) game.togglePause(); });

    var resizeTimer = 0;
    global.addEventListener('resize', function () {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(function () { if (game) game.resize(); }, 80);
    });

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden && game && game.state === 'playing') game.togglePause();
    });
  }

  function toggleSound() {
    var muted = global.Sfx.toggle();
    soundButton.textContent = muted ? '音效：关' : '音效：开';
    soundButton.setAttribute('aria-pressed', String(muted));
  }

  function updateHUD(g) {
    if (hudMatch && g.enemyTeam) {
      hudMatch.textContent = g.playerTeam.name + ' VS ' + g.enemyTeam.name;
      hudMyLeft.textContent = g.aliveMembers(g.playerTeam).length;
      hudEnLeft.textContent = g.aliveMembers(g.enemyTeam).length;
      hudTeamWins.textContent = g.teamWins;
    }

    var p = g.player;
    if (!p) {
      if (g.messages.length > 0) {
        toast.textContent = g.messages[0].text;
        toast.style.opacity = '1';
      }
      return;
    }

    if (hudSoul) hudSoul.textContent = p.martialSoul;
    hudTitle.textContent = p.name;
    hudLevel.textContent = p.level + ' 级';
    hudHp.textContent = Math.round(p.hp) + '/' + p.maxHp;
    hudHpBar.style.width = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) + '%';
    hudMp.textContent = Math.round(p.mp) + '/' + p.maxMp;
    hudMpBar.style.width = Math.max(0, Math.min(100, (p.mp / p.maxMp) * 100)) + '%';

    var isFull = p.kit === 'full' || p.characterId === 'chen';
    if (kitFull) kitFull.classList.toggle('overlay--hidden', !isFull && g.state === 'playing');
    if (kitMember) kitMember.classList.toggle('overlay--hidden', isFull || g.state !== 'playing');

    var buffs = [];
    if (p.avatarMode) buffs.push('🐉 真身');
    if (p.goldBodyActive) buffs.push('🛡️ 金身');
    if (p.isFlying) buffs.push('🪽 加速/飞行');
    if (p.shieldActive) buffs.push('☀️ 护盾');
    if (p.domainBlessing) buffs.push('✨ 圣龙祝福');
    hudBuffs.innerHTML = buffs.length > 0 ? ('增益：' + buffs.join(' | ')) : (p.ringText || '');

    if (g.skills.domainActive) {
      hudDomainStatus.innerHTML = '<span style="color:#ffd700;font-weight:bold">领域：金色世界 (' + Math.ceil(g.skills.domainTimer) + 's)</span>';
    } else if (g.skills.iceDomainTimer > 0) {
      hudDomainStatus.textContent = '领域：玄冰领域 (' + Math.ceil(g.skills.iceDomainTimer) + 's)';
    } else if (g.skills.lifeDomainTimer > 0) {
      hudDomainStatus.textContent = '领域：生命礼赞 (' + Math.ceil(g.skills.lifeDomainTimer) + 's)';
    } else {
      hudDomainStatus.textContent = '领域：待命';
    }

    var allSkillBtns = doc.querySelectorAll('[data-skill]');
    for (var i = 0; i < allSkillBtns.length; i++) {
      var btn = allSkillBtns[i];
      var sId = btn.getAttribute('data-skill');
      var cd = p.cooldowns[sId];
      var costEl = btn.querySelector('.s-cost');
      if (costEl) {
        if (cd > 0) {
          costEl.textContent = '冷却中 ' + cd.toFixed(1) + 's';
          costEl.style.color = '#ff6666';
        } else {
          var sData = global.SKILLS_DATA[sId];
          var cost = sData ? sData.cost : 0;
          if (p.avatarMode && sData && sData.type === 'ring' && sId !== 'ring7') cost = 0;
          costEl.textContent = '魂力 ' + cost;
          costEl.style.color = '#66ccff';
        }
      }
    }

    if (g.messages.length > 0) {
      toast.textContent = g.messages[0].text;
      toast.style.opacity = '1';
    } else {
      toast.style.opacity = '0';
    }
  }

  function startGame() {
    if (typeof THREE === 'undefined') {
      showBootError('3D 引擎加载失败<br><br>请换 <b>Chrome 浏览器</b> 打开');
      if (errorMsg) errorMsg.textContent = '3D 引擎没加载，请换 Chrome 浏览器';
      showOverlay('error');
      return;
    }

    try {
      if (bootMsg) bootMsg.textContent = '正在觉醒光明圣龙，凝聚七大魂环…';
      game = new global.Game(canvas, {
        onState: function (state, g) {
          if (state === 'over') {
            deathStats.textContent = formatStats(g);
            showOverlay('over');
          } else if (state === 'paused') {
            showOverlay('paused');
          } else if (state === 'ready') {
            showOverlay('ready');
          } else if (state === 'pick') {
            renderPick(g);
            showOverlay('pick');
          } else {
            renderMemberSkills(g);
            showOverlay(null);
          }
          pauseButton.textContent = state === 'paused' ? '继续' : '暂停';
          pauseButton.disabled = state === 'ready' || state === 'pick';
        },
        onHud: function (g) {
          updateHUD(g);
        }
      });

      showOverlay('ready');
      pauseButton.disabled = true;
      hideBoot();
      global.requestAnimationFrame(function () {
        game.resize();
      });
    } catch (err) {
      console.error(err);
      showBootError('3D 启动失败：' + (err.message || 'WebGL 不可用') + '<br><br>请换 <b>Chrome 浏览器</b> 打开');
      if (errorMsg) errorMsg.textContent = err.message || 'WebGL 不可用，请用 Chrome 浏览器';
      showOverlay('error');
    }
  }

  bindControls();
  startGame();
})(window);
