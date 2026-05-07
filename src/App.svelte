<script>
    import { onMount, onDestroy } from 'svelte';
    import Header from './Header.svelte';
    import LogViewer from './LogViewer.svelte';
    import BattleScene from './BattleScene.svelte';
    import ModalOverlay from './ModalOverlay.svelte';
    import UIPanel from './UIPanel.svelte';
    import SkillSidebar from './SkillSidebar.svelte';
  
    // --- 遊戲資料定義 ---
    let gameConfig = {}; // 儲存遊戲配置參數
    let dictionaries = {};
    let monsterDb = null; // 儲存從 monster_db.json 讀取的資料
    let isLoaded = false;

    let gameState = 'BATTLE'; // BATTLE (ATB), ACTION_SELECT, TARGETING, BURST, GAME_OVER
    let previousState = 'BATTLE'; // 用於暫停後恢復
    let currentLanguage = 'en'; // 預設語言為英文
    let showLog = false; // 預設關閉日誌
    let gameScore = 0; // 當前地圖進度分數 (0-100)
    let isBossApproaching = false; // Boss 登場特效狀態
    let showSkillsWindow = false; // 技能視窗顯示狀態
    let isBossMode = false; // 是否進入 Boss 房
    let showComboDisplay = false; // 控制連擊數顯示 (這是 UI 狀態，非配置)
    let currentComboDisplayCount = 0; // 當前連擊數
    let showHelp = false; // 幫助說明顯示狀態
    let devMode = false; // Dev 模式（無敵狀態），從 config 載入，先給個預設值
    let logHistory = []; // 儲存歷史訊息
    let logContainer; // 用於控制捲動
    let activeBurstKey = null; // 追蹤當前正在使用的技能按鍵
    let skillDb = null; // 技能數據庫
    let lastClickedSkillSlotKey = null; // 追蹤最後點擊的技能欄位
    let equippedSkills = { // 裝備中的技能映射
      Q: null,
      W: null,
      E: null,
      R: null,
      T: null
    };

    // --- 藥水邏輯 (提升位置以確保編譯引用安全) ---
    function useHpFlask() {
      if (player.hpFlask && player.hpFlask.currentCharges > 0) {
        player.hpFlask.currentCharges--;
        const amount = player.hpFlask.restoreAmount;
        player.hp = Math.min(player.maxHp, player.hp + amount);
        player.lastHeal = amount;
        player = player;
        addLog(t('flaskUsed', t('hp')), 'info');
        setTimeout(() => { player.lastHeal = 0; player = player; }, 1000);
      } else {
        addLog(t('flaskEmpty', t('hp')), 'info');
      }
    }

    function useMpFlask() {
      if (player.mpFlask && player.mpFlask.currentCharges > 0) {
        player.mpFlask.currentCharges--;
        const amount = player.mpFlask.restoreAmount;
        player.mp = Math.min(player.maxMp, player.mp + amount);
        player.lastMpRegen = amount;
        player = player;
        addLog(t('flaskUsed', t('mp')), 'info');
        setTimeout(() => { player.lastMpRegen = 0; player = player; }, 1000);
      } else {
        addLog(t('flaskEmpty', t('mp')), 'info');
      }
    }

    // --- 技能處理 ---
    function handleRemoveSkill(slot) {
      if (equippedSkills[slot]) {
        addLog(`Unequipped ${equippedSkills[slot].en} from [${slot}]`, 'system');
        equippedSkills[slot] = null;
        equippedSkills = equippedSkills; 
      }
    }

    function handleAssignSkill(slot, skillData) {
      equippedSkills[slot] = skillData;
      equippedSkills = equippedSkills; 
      addLog(`Assigned ${skillData.en} to [${slot}]`, 'system');
    }

    function onToggleSkills() {
      showSkillsWindow = !showSkillsWindow;
      if (!showSkillsWindow) lastClickedSkillSlotKey = null; // 關閉視窗時清除選中的欄位
    }

    // --- Dev Mode 狀態反應 ---
    // 當 devMode 改變時，動態調整玩家的 HP/MP 上限
    $: if (devMode) {
      player.maxHp = 1000;
      player.maxMp = 1000;
      player = player;
    } else if (isLoaded) {
      player.maxHp = gameConfig.playerInitialHp || 100;
      player.maxMp = gameConfig.playerInitialMp || 50;
      player.hp = Math.min(player.hp, player.maxHp);
      player.mp = Math.min(player.mp, player.maxMp);
      player = player;
    }

    let gameStartTime = Date.now();
    let totalSuccessfulWords = 0;
    let finalResults = { time: 0, wpm: 0 };
    let bossTimer = null; // 用於追蹤 Boss 生成的定時器
    let devRegenCounter = 0; // 新增：Dev Mode 回復計數器

    // 修改：支援多片段日誌，實現局部高亮
    function addLog(content, tier = 'system', highlight = null) {
      let segments = [];
      
      if (tier === 'system') {
        segments.push({ text: content, type: 'system' });
      } else if (highlight && content.includes(highlight)) {
        // 使用正規表達式切分字串，保留分隔符號（即 highlight 本身）
        const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = content.split(new RegExp(`(${escapedHighlight})`, 'g'));
        
        parts.forEach(part => {
          if (part === highlight) {
            segments.push({ text: part, type: tier }); // 怪物名稱使用階級顏色
          } else if (part) {
            segments.push({ text: part, type: 'normal' }); // 其他文字使用白色
          }
        });
      } else {
        segments.push({ text: content, type: tier === 'info' ? 'normal' : 'system' });
      }

      const newEntry = { segments, id: Date.now() + Math.random() };
      logHistory = [...logHistory, newEntry].slice(-50);
    }
    
    let player = {
      hp: 100, maxHp: 100, 
      mp: 50, maxMp: 100, // 初始值，將在 onMount 中被 gameConfig 覆寫
      atb: 0, speed: 0.8, // 初始值，將在 onMount 中被 gameConfig 覆寫
      isHit: false, isAttacking: false,
      selectedAction: null,
      lastDamage: 0,
      lastHeal: 0,
      lastMpRegen: 0,
      hpFlask: { currentCharges: 3, maxCharges: 3, restoreAmount: 50 },
      mpFlask: { currentCharges: 3, maxCharges: 3, restoreAmount: 50 }
    };
  
    let enemies = [];
  
    let selectedMonsterId = null;
    let lastLoggedMonsterId = null;

    // 自動鎖定目標邏輯：
    // 當目前選中的怪物不存在、已死亡，或者怪物列表更新時，自動選擇 HP 最低的活著怪物
    $: if (isLoaded && enemies.length > 0) {
      const aliveEnemies = enemies.filter(e => e.hp > 0);
      const currentSelected = enemies.find(e => e.id === selectedMonsterId);
      if (aliveEnemies.length > 0 && (!currentSelected || currentSelected.hp <= 0)) {
        selectedMonsterId = aliveEnemies.reduce((prev, curr) => (prev.hp < curr.hp ? prev : curr)).id;
      }
    }

    // 當鎖定目標變動或進入行動選擇時，在 Log 顯示完整名稱
    $: if (gameState === 'ACTION_SELECT' && selectedMonsterId !== lastLoggedMonsterId) {
      const target = enemies.find(e => e.id === selectedMonsterId);
      if (target) {
        const fullName = target[`name_${currentLanguage}`] || target.name_en;
        addLog(t('targetLocked', fullName), target.wordType, fullName);
        lastLoggedMonsterId = selectedMonsterId;
      }
    } else if (gameState !== 'ACTION_SELECT') {
      lastLoggedMonsterId = null;
    }

    // Monkeytype 模式相關狀態
    let currentBurstWords = []; 
    let currentWordInput = ""; 
    let currentWordIndex = 0;

    // 自動檢查打字是否正確 (當輸入內容完全符合目標單字時立即生效，不需要空白鍵)
    $: if (gameState === 'BURST' && currentWordInput.length > 0 && currentBurstWords[currentWordIndex] && currentWordInput.toLowerCase() === currentBurstWords[currentWordIndex].toLowerCase()) {
      handleCorrectWord();
    }

    let visibleWordsStartIndex = 0;
    let burstTimeLeft = 0;
    let burstBonusText = ""; // 新增：獎勵時間提示文字
    let burstMaxTime; // 從 config 載入
    let comboDisplayTimeout; // 用於控制連擊數顯示的定時器
    let comboCount = 0;
    let burstStartTime = 0;
    let currentWpm = 0;
    let currentTarget = null;
    let burstInterval;

    // --- 翻譯資料 ---
    const translations = {
        en: {
            gameLogInitializing: "Initializing word library...",
            gameLogLoaded: "Word library loaded! Waiting for ATB to fill...",
            gameLogError: "Error: Failed to load word library, please refresh the page.",
            playerTurn: "It's your turn! A:Attack, S:Skill, I:Item, B:Block, R:Run",
            enemyAttackLog: (enemyName, damage) => `${enemyName} attacks, dealing ${damage} damage!`,
            playerDefeated: "Defeated - Game Over",
            gamePaused: "Game Paused",
            continueGame: "Continue Game (ESC)",
            restartGame: "Restart Game",
            victory: "Victory!",
            clearTime: "Clear Time",
            avgWpm: "Average WPM",
            seconds: "s",
            mpNotEnough: (cost) => `Not enough MP! Skill requires ${cost} MP.`,
            skillActivated: "Skill activated! Combo damage increased by 2x!",
            targetingPrompt: "Enter the word above the monster to target...",
            devMode: "Dev Mode",
            burstPrompt: "TYPE:",
            burstPlaceholder: "Type fast!",
            comboEnd: (comboCount) => `Combo ended! Total ${comboCount} combos completed.`,
            targetLocked: (name) => `Target locked: ${name}`,
            enemyDefeated: (enemyName) => `${enemyName} was defeated!`,
            gameRestarted: "Game restarted!",
            commonWords: "Common Words",
            words: "words",
            attack: "Attack",
            skill: "Skill",
            item: "Item",
            block: "Block",
            run: "Run",
            hp: "HP",
            mp: "MP",
            atb: "ATB",
            helpTitle: "HOTKEYS / HELP",
            helpLog: "[0] Toggle Log Window",
            helpHelp: "[?] Toggle Help Overlay",
            helpEsc: "[Esc] Menu / Pause",
            helpTarget: "[H/L] or [Arrows] Select Target",
            helpAttack: "[A] Attack / [S] Skill (30MP)",
            helpItem: "[I] Item / [B] Block / [R] Run",
            helpClose: "Press [?] or [Esc] to return",
            skillPlaceholder: "You cast a skill!",
            blockAction: "You entered a defensive stance.",
            runAction: "Successfully escaped!",
            combo: "combo",
            flaskUsed: (type) => `${type} Flask used!`,
            flaskEmpty: (type) => `${type} Flask is empty!`,
            bossApproachingMessage: "Boss is approaching! Prepare for battle!"
        },
        zh: {
            gameLogInitializing: "正在初始化單字庫...",
            gameLogLoaded: "單字庫載入完成！等待行動條充滿...",
            gameLogError: "錯誤：無法載入單字庫，請重新整理頁面。",
            playerTurn: "輪到你了！A:攻擊, S:技能, I:道具, B:防禦, R:逃跑",
            enemyAttackLog: (enemyName, damage) => `${enemyName} 發動攻擊，造成 ${damage} 點傷害！`,
            playerDefeated: "戰敗 - 遊戲結束",
            gamePaused: "遊戲暫停",
            continueGame: "繼續遊戲 (ESC)",
            restartGame: "重新開始遊戲",
            victory: "戰鬥勝利！",
            clearTime: "通關時間",
            avgWpm: "平均速度",
            seconds: "秒",
            mpNotEnough: (cost) => `MP 不足！發動技能需要 ${cost} 點 MP。`,
            skillActivated: "發動技能！連擊傷害提升為 2 倍！",
            targetingPrompt: "請輸入怪物頭上的單字來鎖定目標...",
            devMode: "開發者模式",
            burstPrompt: "輸入:",
            burstPlaceholder: "快打！",
            comboEnd: (comboCount) => `連擊結束！總共完成了 ${comboCount} 次連擊。`,
            targetLocked: (name) => `已鎖定目標：${name}`,
            enemyDefeated: (enemyName) => `${enemyName} 被擊倒了！`,
            gameRestarted: "遊戲重新開始！",
            commonWords: "常用單字",
            words: "單字",
            attack: "攻擊",
            skill: "技能",
            item: "道具",
            block: "防禦",
            run: "逃跑",
            hp: "HP",
            mp: "MP",
            atb: "ATB",
            helpTitle: "熱鍵 / 說明",
            helpLog: "[0] 開啟/關閉日誌視窗",
            helpHelp: "[?] 顯示/隱藏此說明",
            helpEsc: "[Esc] 開啟選單 / 暫停",
            helpTarget: "[H/L] 或 [方向鍵] 切換目標",
            helpAttack: "[A] 攻擊 / [S] 技能 (30MP)",
            helpItem: "[I] 道具 / [B] 防禦 / [R] 逃跑",
            helpClose: "按下 [?] 或 [Esc] 返回遊戲",
            skillPlaceholder: "你施放了一個技能！",
            blockAction: "你進入了防禦狀態。",
            runAction: "逃跑成功！",
            combo: "連擊",
            flaskUsed: (type) => `${type} 藥水已使用！`,
            flaskEmpty: (type) => `${type} 藥水已空！`,
            bossApproachingMessage: "Boss 正在逼近！準備戰鬥！"
        }
    };

    function t(key, ...args) {
        const text = translations[currentLanguage][key];
        if (typeof text === 'function') {
            return text(...args);
        }
        return text || `MISSING_TRANSLATION[${key}]`;
    }

    // Set initial gameLog based on default language
    addLog(t('gameLogInitializing'));
  
    onMount(async () => {
      await loadGameConfig(); // 確保 gameConfig 在其他依賴它的函數之前載入
      await loadAllDictionaries();
      
      // 初始化 devMode
      devMode = gameConfig.initialDevMode;

      // 使用 gameConfig 初始化玩家狀態
      player.hp = devMode ? 1000 : gameConfig.playerInitialHp;
      player.maxHp = devMode ? 1000 : gameConfig.playerInitialHp;
      player.mp = devMode ? 1000 : gameConfig.playerInitialMp;
      player.maxMp = devMode ? 1000 : gameConfig.playerInitialMp;
      player.speed = gameConfig.playerSpeed; // 從 config 載入玩家速度
      burstMaxTime = gameConfig.burstMaxTime; // 初始化 burstMaxTime
      player = player; // 強制觸發 player 物件的反應性更新
      spawnMonsters();
      const timer = setInterval(() => {
        if (isLoaded && gameState !== 'PAUSED' && gameState !== 'GAME_OVER') { // 暫停或結束時停止 ATB
          updateATB();
        }
      }, 50);
      return () => {
        clearInterval(timer);
        if (burstInterval) clearInterval(burstInterval);
      };
    });

    async function loadAllDictionaries() {
      try {
        const tiers = ['white', 'magic', 'rare', 'unique'];
        const fetchPromises = tiers.map(tier => {
          const path = gameConfig.wordDictionaries[tier]; // 從 gameConfig 讀取檔案路徑
          return fetch(path).then(res => {
            if (!res.ok) {
              throw new Error(`File not found: ${path} (HTTP ${res.status}). Please ensure the file exists in public/data/`);
            }
            return res.json();
          });
        });
        
        const results = await Promise.all(fetchPromises);
        
        tiers.forEach((tier, index) => {
          const data = results[index];
          let wordList = [];

          // 相容兩種格式：直接是陣列，或是包含 words 屬性的物件
          if (Array.isArray(data)) {
            wordList = data;
          } else if (data && Array.isArray(data.words)) {
            wordList = data.words;
          }

          if (wordList.length > 0) {
            dictionaries[tier] = wordList.map(w => w.toLowerCase());
          } else {
            dictionaries[tier] = [];
          }
        });

        // 載入怪物數據庫
        const monsterRes = await fetch('data/monster_db.json');
        if (monsterRes.ok) {
            monsterDb = await monsterRes.json();
        }

        // 載入技能數據庫
        const skillRes = await fetch('data/skills.json');
        if (skillRes.ok) {
          skillDb = await skillRes.json();
        }

        isLoaded = true;
        addLog(t('gameLogLoaded'));
      } catch (error) {
        console.error("Failed to load dictionaries:", error);
        addLog(t('gameLogError'));
      }
    }
    
    async function loadGameConfig() {
      const res = await fetch('data/game_config.json');
      gameConfig = await res.json();
    }

    // 隨機決定怪物階級 (60% White, 30% Magic, 10% Rare)
    function getRandomTier() {
      const rand = Math.random();
      if (rand < 0.6) return 'white';
      if (rand < 0.9) return 'magic';
      return 'rare';
    }

    // 封裝單一怪物生成邏輯
    function generateMonster(id, tier) {
      const pool = dictionaries[tier] || ['error'];
      const randomWord = pool[Math.floor(Math.random() * pool.length)];

      const allAffixes = monsterDb ? [...monsterDb.affixes.prefixes, ...monsterDb.affixes.suffixes] : [];
      const tierConfig = gameConfig.monsterTiers ? gameConfig.monsterTiers[tier] : null;
      let name_en = tier.toUpperCase(), name_zh = tier.toUpperCase(), icon = tierConfig?.icon || '❓', nameParts = null;

      if (monsterDb) {
        const race = monsterDb.races[Math.floor(Math.random() * monsterDb.races.length)];
        const basePool = monsterDb.monster_base_names[race.id];
        const base = basePool[Math.floor(Math.random() * basePool.length)];
        let affixCount = gameConfig.monsterTiers[tier].affixCount; // 從 config 讀取詞綴數量
        const pickedAffixes = [...allAffixes].sort(() => 0.5 - Math.random()).slice(0, affixCount);
        
        const prefixEn = pickedAffixes.map(a => a.en).join(' ');
        const prefixZh = pickedAffixes.map(a => a.zh).join('');

        name_en = `${race.en}: ${prefixEn ? prefixEn + ' ' : ''}${base.en}`;
        name_zh = `${race.zh}: ${prefixZh}${base.zh}`;
        icon = base.icon;
        nameParts = {
          race: { en: race.en, zh: race.zh },
          affixes: { en: prefixEn, zh: prefixZh },
          base: { en: base.en, zh: base.zh }
        };
      }

      return {
        id, name_en, name_zh, word: randomWord, icon,
        hp: tierConfig?.hp || 100, maxHp: tierConfig?.hp || 100,
        mp: gameConfig.monsterInitialMp || 0, maxMp: gameConfig.monsterInitialMp || 0,
        atb: Math.random() * 30, speed: tierConfig?.speed || 0.5,
        wordType: tier, isAttacking: false, isTargetSuccess: false, lastDamage: 0,
        nameParts: nameParts || { race: {en:'', zh:''}, affixes: {en:'', zh:''}, base: {en:tier.toUpperCase(), zh:tier.toUpperCase()} }
      };
    }

    function spawnMonsters() {
      if (isBossMode) {
        enemies = [generateMonster(1, 'unique')];
      } else { // 確保場上怪物數量不超過最大值
        const currentEnemyCount = enemies.filter(e => e.hp > 0).length;
        const maxSlots = 9; // 3x3 網格總數
        const enemiesToSpawn = maxSlots - currentEnemyCount;
        for (let i = 0; i < enemiesToSpawn; i++) {
          const newId = Math.max(...enemies.map(e => e.id), 0) + 1; // 確保 ID 唯一
          enemies = [...enemies, generateMonster(newId, getRandomTier())];
        }
      }
    }
  
    function updateATB() {
      // Dev Mode 每 5 秒回復 100 點 HP/MP
      if (devMode && gameState !== 'PAUSED' && gameState !== 'GAME_OVER') {
        devRegenCounter++;
        if (devRegenCounter >= 100) { // 100 ticks * 50ms = 5000ms (5秒)
          devRegenCounter = 0;
          const regenAmount = 100;
          player.hp = Math.min(player.maxHp, player.hp + regenAmount);
          player.mp = Math.min(player.maxMp, player.mp + regenAmount);
          player.lastHeal = regenAmount;
          player.lastMpRegen = regenAmount;
          player = player;
          // 1秒後清除數值顯示旗標
          setTimeout(() => {
            player.lastHeal = 0;
            player.lastMpRegen = 0;
            player = player;
          }, 1000);
        }
      }

      // 玩家 ATB
      if (player.atb < 100) {
        const chargeSpeed = devMode ? player.speed * 5 : player.speed;
        player.atb += chargeSpeed;
        if (player.atb >= 100) {
          player.atb = 100;
          gameState = 'ACTION_SELECT'; // 進入行動選擇狀態
          addLog(t('playerTurn'), 'info');
        }
      }
  
      // 敵人 ATB
      enemies = enemies.map(e => {
        if (e.hp > 0 && e.atb < 100) {
          e.atb += e.speed;
          if (e.atb >= 100) enemyAttack(e); // 改為傳遞整個物件
        }
        return e;
      });
    }
  
    function enemyAttack(attacker) {
      const damage = gameConfig.enemyBaseDamage;
      // 根據當前語言選擇名稱
      const currentName = attacker[`name_${currentLanguage}`] || attacker.name_en;

      // 觸發怪物攻擊特效
      attacker.isAttacking = true;
      enemies = enemies;
      
      // 移除 devMode 無敵限制，讓開發者測試受傷與回復邏輯
      player.hp = Math.max(0, player.hp - damage);

      // 觸發玩家受傷特效
      player.isHit = true;
      player.lastDamage = damage;
      setTimeout(() => {
        attacker.isAttacking = false;
        player.isHit = false;
        player.lastDamage = 0;
        enemies = enemies;
        player = player;
      }, 1000); // 延長時間讓傷害數值顯示

      attacker.atb = 0;
      addLog(t('enemyAttackLog', currentName, damage), attacker.wordType, currentName);
      if (player.hp <= 0) gameState = 'GAME_OVER';
    }
  
    function togglePause() {
      if (gameState === 'GAME_OVER') return;
      if (gameState === 'PAUSED') {
        gameState = previousState;
        showHelp = false;
      } else {
        previousState = gameState;
        gameState = 'PAUSED'; // 進入暫停狀態
      }
    }

    function restartGame() {
      if (bossTimer) clearTimeout(bossTimer); // 強制清除尚未觸發的 Boss 生成
      gameState = 'BATTLE'; // 重置遊戲狀態
      gameScore = 0;
      isBossMode = false;
      enemies = []; // 清空現有怪物，防止 ID 累加與排版錯誤
      player = {
        hp: devMode ? 1000 : gameConfig.playerInitialHp,
        maxHp: devMode ? 1000 : gameConfig.playerInitialHp,
        mp: devMode ? 1000 : gameConfig.playerInitialMp,
        maxMp: devMode ? 1000 : gameConfig.playerInitialMp,
        atb: 0, speed: gameConfig.playerSpeed, isHit: false, // 使用 config 中的速度
        isAttacking: false,
        selectedAction: null,
        lastDamage: 0,
        lastHeal: 0,
        lastMpRegen: 0,
        hpFlask: { currentCharges: 3, maxCharges: 3, restoreAmount: 50 },
        mpFlask: { currentCharges: 3, maxCharges: 3, restoreAmount: 50 }
      };
      spawnMonsters();
      addLog(t('gameRestarted'));
      gameStartTime = Date.now();
      totalSuccessfulWords = 0;
      finalResults = { time: 0, wpm: 0 };
      selectedMonsterId = null; // spawnMonsters會重新設定
      comboCount = 0;
      currentWpm = 0;
      devRegenCounter = 0; // 重置計數器
      if (burstInterval) clearInterval(burstInterval);
      currentWordInput = ""; // 重置輸入框內容
      currentWordIndex = 0; // 重置當前單字索引
      visibleWordsStartIndex = 0; // 重置可見單字起始索引
    }

    function clearLogs() {
      logHistory = [];
    }

    // --- 鍵盤監聽 ---
    function handleGlobalKeyDown(e) {
      // 切換日誌 (熱鍵 0)
      if (e.key === '0') {
        showLog = !showLog;
        return;
      }

      // 切換技能視窗 (熱鍵 9)
      if (e.key === '9') {
        showSkillsWindow = !showSkillsWindow;
        return;
      }

      // 藥水熱鍵 (1/2)
      if (e.key === '1') {
        e.preventDefault();
        useHpFlask();
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        useMpFlask();
        return;
      }

      // 切換幫助 (熱鍵 ?)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        showHelp = !showHelp;
        if (showHelp && gameState !== 'PAUSED') {
          previousState = gameState;
          gameState = 'PAUSED';
        } else if (!showHelp && gameState === 'PAUSED' && previousState !== 'PAUSED') {
          gameState = previousState;
        }
        return;
      }

      if (e.key === 'Escape') {
        togglePause();
        return;
      }

      // 在 BURST 模式下，按 Tab 鍵循環切換技能
        if (gameState === 'BURST' && e.key === 'Tab') {
        e.preventDefault();
        const skillKeys = ['Q', 'W', 'E', 'R', 'T'];
        let currentIndex = skillKeys.indexOf(activeBurstKey);
        
        // 尋找下一個有裝備技能的欄位
        for (let i = 1; i <= skillKeys.length; i++) {
          const nextIdx = (currentIndex + i) % skillKeys.length;
          const nextKey = skillKeys[nextIdx];
          
          if (equippedSkills[nextKey]) {
            activeBurstKey = nextKey;
            addLog(`Switched to Skill: ${equippedSkills[nextKey][currentLanguage === 'zh' ? 'zh' : 'en']}`, 'info');
            break;
          }
        }
        return;
      }

      if (gameState === 'PAUSED' || gameState === 'GAME_OVER') return;

      if (gameState === 'ACTION_SELECT') {
        const key = e.key.toUpperCase();
        const aliveEnemies = enemies.filter(e => e.hp > 0);

        // 處理選擇移動 (h/l 或 左右方向鍵)
        if (aliveEnemies.length > 0) {
          if (key === 'H' || key === 'ARROWLEFT') {
            e.preventDefault();
            const currentIndex = aliveEnemies.findIndex(m => m.id === selectedMonsterId);
            const newIndex = (currentIndex - 1 + aliveEnemies.length) % aliveEnemies.length;
            selectedMonsterId = aliveEnemies[newIndex].id;
            return;
          }
          if (key === 'L' || key === 'ARROWRIGHT') {
            e.preventDefault();
            const currentIndex = aliveEnemies.findIndex(m => m.id === selectedMonsterId);
            const newIndex = (currentIndex + 1) % aliveEnemies.length;
            selectedMonsterId = aliveEnemies[newIndex].id;
            return;
          }

          // 處理垂直選擇 (J/K 或 上下方向鍵)
          // 根據 3x3 網格：索引 -3 是上移，索引 +3 是下移
          const fullIndex = enemies.findIndex(m => m.id === selectedMonsterId);
          
          if (key === 'K' || key === 'ARROWUP') { // 依照要求：K 為上移
            e.preventDefault();
            // 往上搜尋同欄位中活著的怪物
            for (let i = fullIndex - 3; i >= 0; i -= 3) {
              if (enemies[i] && enemies[i].hp > 0) {
                selectedMonsterId = enemies[i].id;
                return;
              }
            }
            return;
          }
          
          if (key === 'J' || key === 'ARROWDOWN') { // 依照要求：J 為下移
            e.preventDefault();
            // 往下搜尋同欄位中活著的怪物
            for (let i = fullIndex + 3; i < enemies.length; i += 3) {
              if (enemies[i] && enemies[i].hp > 0) {
                selectedMonsterId = enemies[i].id;
                return;
              }
            }
            return;
          }
        }

        // 更新為新的技能熱鍵映射 Q, W, E, R, T
        if (['Q', 'W', 'E', 'R', 'T'].includes(key)) {
          // 根據是否有裝備技能決定動作類型：有技能則為 S (需消耗MP)，無則為 A
          const equipped = equippedSkills[key];
          let actionKey = equipped ? 'S' : 'A';

          const skillCost = gameConfig.skillMpCost || 30;
          if (actionKey === 'S' && player.mp < skillCost) {
            addLog(t('mpNotEnough', skillCost), 'info');
            return;
          }
          e.preventDefault();
          player.selectedAction = actionKey;
          activeBurstKey = key; // 記錄觸發 Burst 的按鍵

          if (actionKey === 'A' || actionKey === 'S') {
            const target = aliveEnemies.find(m => m.id === selectedMonsterId);
            if (target) {
              target.isTargetSuccess = true;
              enemies = enemies;

              if (actionKey === 'S') {
                player.mp -= skillCost;
                player = player;
                addLog(t('skillActivated'), 'info');
              }

              currentTarget = target;
              setTimeout(() => {
                target.isTargetSuccess = false;
                enemies = enemies;
                startBurst();
              }, 200);
            }
          } else {
            executeQuickAction(actionKey);
          }
        }
      }
    }

    // --- 動作處理 ---
    function executeQuickAction(action) {
      if (action === 'B') addLog(t('blockAction'), 'info');
      if (action === 'S') {
        addLog(t('skillPlaceholder'), 'info');
      }
      if (action === 'R') addLog(t('runAction'), 'info');
      resetTurn();
    }
  
    function startBurst() {
      gameState = 'BURST';
      comboCount = 0;
      currentComboDisplayCount = 0;
      showComboDisplay = true; // Burst Mode 開始即顯示
      burstStartTime = Date.now();
      currentWpm = 0;
      currentWordInput = "";
      currentWordIndex = 0;
      visibleWordsStartIndex = 0;
      burstTimeLeft = gameConfig.burstMaxTime;
      generateBurstWords();
      
      burstInterval = setInterval(() => {
        if (gameState !== 'PAUSED') { // 暫停時停止倒數
          burstTimeLeft -= 100;
          
          // 即時計算 WPM (Words Per Minute)
          const elapsedSeconds = (Date.now() - burstStartTime) / 1000;
          if (elapsedSeconds > 0.5) { // 稍微延遲後再顯示以避免初始數值過大
            currentWpm = Math.round((comboCount / elapsedSeconds) * 60);
          }
        }
        if (burstTimeLeft <= 0 || currentWordIndex >= currentBurstWords.length) {
          endBurst();
        }
      }, 100);
    }
  
    function generateBurstWords() {
      currentBurstWords = [];
      addBurstWords(gameConfig.typingConfig?.initialWordPoolSize || 50);
    }

    function addBurstWords(count) {
      const poolKey = currentTarget?.wordType;
      const pool = dictionaries[poolKey];
      if (!pool || pool.length === 0) {
        if (currentBurstWords.length === 0) currentBurstWords = ["error"];
        return;
      }
      
      const newWords = Array.from({ length: count }, () => 
        pool[Math.floor(Math.random() * pool.length)].toLowerCase()
      );
      currentBurstWords = [...currentBurstWords, ...newWords];
    }
  
    function handleCorrectWord() {
        // 更新連擊數顯示
        // --- 每次成功連擊都增加時間 ---
        const bonusTime = gameConfig.comboBonusTime;
        burstTimeLeft = Math.min(gameConfig.burstMaxTime, burstTimeLeft + bonusTime);
        burstBonusText = `+${(bonusTime / 1000).toFixed(1)}s`;
        setTimeout(() => { burstBonusText = ""; }, 800);
        // --- 每次成功連擊都增加時間 ---

        currentComboDisplayCount = comboCount + 1; // comboCount 還沒加，所以這裡加1
        // 移除原有的 setTimeout 邏輯，讓顯示狀態由 endBurst 統一關閉

        comboCount++;
        totalSuccessfulWords++;
        currentWordInput = "";
        
        // 觸發玩家攻擊特效
        player.isAttacking = true;
        setTimeout(() => {
          player.isAttacking = false;
          player = player;
        }, 200);

        // 立即計算傷害數值，以便後續視覺特效與傷害套用使用
        const currentSkill = equippedSkills[activeBurstKey];
        const hitType = currentSkill?.type || 'normal';

        let multiplier = player.selectedAction === 'S' ? (currentSkill?.atk_multiplier || 2) : 1;
        if (devMode) multiplier *= 10; // Dev 模式傷害加成
        const damagePerWord = gameConfig.baseDamagePerWord * multiplier;

        // 觸發視覺特效
        currentTarget.isHit = true;
        currentTarget.lastHitType = hitType; // 補上這一行：傳遞屬性類型給目標
        currentTarget.lastDamage = damagePerWord;
        const hitTarget = currentTarget;
        setTimeout(() => {
          hitTarget.isHit = false;
          hitTarget.lastHitType = null; // 結束特效時清除屬性標記
          hitTarget.lastDamage = 0;
          enemies = enemies; // 確保狀態清除後能更新 UI
        }, 1000);

        // 套用傷害
        currentTarget.hp = Math.max(0, currentTarget.hp - damagePerWord);
        enemies = enemies; // 觸發 Svelte 反應式更新

        if (currentTarget.hp <= 0) {
          // 分數邏輯
          const scoreMap = gameConfig.scoreMap;
          const points = scoreMap[currentTarget.wordType] || 0;
          gameScore = Math.min(100, gameScore + points);

          // 檢查是否進入 Boss 房
          if (gameScore >= 100 && !isBossMode) {
            isBossMode = true;
            isBossApproaching = true; // 觸發視覺特效
            enemies = []; // 立即清空畫面上所有剩餘的怪物
            selectedMonsterId = null; // 清除目前的選取目標

            // 強制結束 Burst Mode 並補滿 ATB
            if (gameState === 'BURST') endBurst();
            player.atb = 100;
            player = player;
            gameState = 'ACTION_SELECT';

            addLog("--- BOSS WARNING: AN ANCIENT POWER AWAKENS ---", 'unique');

            setTimeout(() => {
              enemies = [generateMonster(1, 'unique')];
              selectedMonsterId = enemies[0].id;
              isBossApproaching = false;
              addLog("--- BOSS ROOM ---", 'unique');
            }, 2000); // 延長轉場時間
          }
          // 擊敗 Boss 結算邏輯 (檢查是否真的擊敗了 Unique 階級的 Boss)
          else if (currentTarget.wordType === 'unique') {
            const endTime = Date.now();
            const totalSeconds = Math.max(1, (endTime - gameStartTime) / 1000);
            finalResults = {
              time: totalSeconds,
              wpm: Math.round((totalSuccessfulWords / (totalSeconds / 60)))
            };
            gameState = 'VICTORY';
            clearInterval(burstInterval); // 手動清除，不進入 resetTurn
            showComboDisplay = false;
            return;
          }
          // 非 Boss 階段的重生邏輯
          else if (!isBossMode) {
            const deadId = currentTarget.id;
            setTimeout(() => {
              const idx = enemies.findIndex(e => e.id === deadId);
              if (idx !== -1) { // 如果怪物位置還存在，則重生
                enemies[idx] = generateMonster(deadId, getRandomTier()); // 在原位重生
                enemies = enemies;
              }
            }, 1000);
          }

          const aliveEnemies = enemies.filter(e => e.hp > 0);
          if (aliveEnemies.length > 0) {
            // 如果還有怪物，自動切換到下一個目標（HP 最低者）
            currentTarget = aliveEnemies.reduce((prev, curr) => (prev.hp < curr.hp ? prev : curr));
            selectedMonsterId = currentTarget.id; // 確保黃色框立即移動到新目標
            moveToNextWord();
          } else {
            endBurst();
          }
        } else {
          moveToNextWord();
        }
    }

    function moveToNextWord() {
      currentWordIndex++;
      checkScroll();
      // 提高緩衝閾值（剩餘 30 個即補貨）並增加補貨量 (60 個)，確保流暢度
      if (currentBurstWords.length - currentWordIndex < 30) {
        addBurstWords(60);
      }
    }

    function checkScroll() {
      const wordsPerLine = gameConfig.typingConfig?.wordsPerLine || 8;
      if (currentWordIndex > 0 && currentWordIndex % wordsPerLine === 0) {
        visibleWordsStartIndex = currentWordIndex;
      }
    }
  
    function endBurst() {
      clearInterval(burstInterval);
      let logText = t('comboEnd', comboCount);
      let tier = 'system';
      let highlight = null;

      if (currentTarget) {
        tier = currentTarget.wordType;
        const name = currentTarget[`name_${currentLanguage}`] || currentTarget.name_en;
        if (currentTarget.hp <= 0) {
          logText += ` ${t('enemyDefeated', name)}`;
          highlight = name;
        }
      } else if (isBossMode && gameScore >= 100) {
        logText += ` ${t('bossApproachingMessage')}`;
        tier = 'unique'; // Boss 轉場訊息使用紫色等級標示
      }

      addLog(logText, tier, highlight);
      showComboDisplay = false; // Burst Mode 真正結束時關閉顯示
      resetTurn();
    }
  
    function resetTurn() {
      player.atb = 0;
      player.selectedAction = null;
      activeBurstKey = null; // 重置使用的技能按鍵
      currentTarget = null; // 清除當前目標
      currentWordInput = "";
      currentBurstWords = [];
      currentWordIndex = 0;
      currentWpm = 0;
      visibleWordsStartIndex = 0;
      // 安全起見，確保結束時關閉
      showComboDisplay = false; 
      if (comboDisplayTimeout) clearTimeout(comboDisplayTimeout);
      gameState = 'BATTLE';
    }
  </script>
  
  <svelte:window on:keydown={handleGlobalKeyDown} />
  
  <Header 
    {t} {devMode} {currentLanguage} 
    onToggleDev={() => devMode = !devMode} 
    onSetLanguage={(lang) => currentLanguage = lang} 
  />

  <div class="game-viewport">
    {#if showLog}
      <LogViewer {logHistory} {gameState} onClear={clearLogs} />
    {/if}

    <main class="game-container">
      <div class="game-main-content">
        <ModalOverlay 
          {gameState} {t} 
          onTogglePause={togglePause} 
          onRestart={restartGame}
          {finalResults}
          {showLog}
          {showHelp}
          onToggleLog={() => showLog = !showLog}
          onToggleHelp={() => showHelp = !showHelp}
        />

        <BattleScene {enemies} {player} {gameState} {selectedMonsterId} {t} {currentLanguage} {showComboDisplay} {currentComboDisplayCount} {currentWpm} {isBossApproaching} {gameScore} {useHpFlask} {useMpFlask} {equippedSkills} {activeBurstKey} onDropSkill={handleAssignSkill} onRemoveSkill={handleRemoveSkill} onOpenSkills={(slotKey) => { showSkillsWindow = true; lastClickedSkillSlotKey = slotKey; }} />

        <UIPanel 
          {gameState} {t} 
          {gameScore}
          {burstTimeLeft} {burstMaxTime} 
          {burstBonusText} {comboCount}
          {currentBurstWords} bind:currentWordInput {currentWordIndex} 
          {visibleWordsStartIndex}
          wordsPerLine={gameConfig.typingConfig?.wordsPerLine || 8}
          linesToDisplay={gameConfig.typingConfig?.linesToDisplay || 3}
        />
      </div>
    </main>

    {#if showSkillsWindow}
      <SkillSidebar {skillDb} {equippedSkills} {currentLanguage} {lastClickedSkillSlotKey} onDropSkill={handleAssignSkill} onRemoveSkill={handleRemoveSkill} onToggleSkills={onToggleSkills} onSelectSlot={(key) => lastClickedSkillSlotKey = key} />
    {/if}
  </div>
  
  <style>
    :global(body) {
      background-color: #000;
      color: #fff;
      font-family: 'Courier New', monospace;
      margin: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
  
    .game-viewport {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      gap: 20px; /* 增加日誌與遊戲間的間距 */
    }

    .game-container {
      width: 850px;
      height: 750px; /* 增加總高度 */
      background: #000;
      border: 1px solid #fff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .game-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  </style>
  