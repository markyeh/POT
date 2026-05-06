<script>
    import { onMount, onDestroy, afterUpdate } from 'svelte';
  
    // --- 遊戲資料定義 ---
    let dictionaries = {};
    let isLoaded = false;

    let gameState = 'BATTLE'; // BATTLE (ATB), ACTION_SELECT, TARGETING, BURST, GAME_OVER
    let previousState = 'BATTLE'; // 用於暫停後恢復
    let currentLanguage = 'en'; // 預設語言為英文
    let devMode = true; // Dev 模式（無敵狀態）
    let gameLog = ""; // 初始化為空，等待載入訊息
    let logHistory = []; // 儲存歷史訊息
    let logContainer; // 用於控制捲動

    $: if (gameLog) {
      logHistory = [...logHistory, gameLog].slice(-50);
    }
    
    let player = {
      hp: 100, maxHp: 100, 
      mp: 50, maxMp: 100, // 新增 MP 屬性
      atb: 0, speed: 0.8, 
      isHit: false, isAttacking: false,
      selectedAction: null
    };
  
    let enemies = [];
  
    let targetInput = "";
    let burstInput = "";
    let currentBurstWord = "";
    let burstTimeLeft = 0;
    let burstMaxTime = 5000; 
    let comboCount = 0;
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
            mpNotEnough: "Not enough MP! Skill requires 30 MP.",
            skillActivated: "Skill activated! Combo damage increased by 2x!",
            targetingPrompt: "Enter the word above the monster to target...",
            devMode: "Dev Mode",
            burstPrompt: "TYPE:",
            burstPlaceholder: "Type fast!",
            comboEnd: (comboCount) => `Combo ended! Total ${comboCount} combos completed.`,
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
            skillPlaceholder: "You cast a skill! (Skill effect to be implemented)",
            blockAction: "You entered a defensive stance.",
            runAction: "Successfully escaped!",
            combo: "combo"
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
            mpNotEnough: "MP 不足！發動技能需要 30 點 MP。",
            skillActivated: "發動技能！連擊傷害提升為 2 倍！",
            targetingPrompt: "請輸入怪物頭上的單字來鎖定目標...",
            devMode: "開發者模式",
            burstPrompt: "輸入:",
            burstPlaceholder: "快打！",
            comboEnd: (comboCount) => `連擊結束！總共完成了 ${comboCount} 次連擊。`,
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
            skillPlaceholder: "你施放了一個技能！ (待實作技能效果)",
            blockAction: "你進入了防禦狀態。",
            runAction: "逃跑成功！",
            combo: "連擊"
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
    gameLog = t('gameLogInitializing');
  
    onMount(async () => {
      await loadAllDictionaries();
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

    afterUpdate(() => {
      // 自動捲動日誌到底部
      if (gameState !== 'PAUSED' && logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    });

    async function loadAllDictionaries() {
      try {
        const tiers = ['white', 'magic', 'rare', 'unique'];
        const fetchPromises = tiers.map(tier => {
          // 新增 console.log 幫助確認實際載入的檔案路徑
          const path = `data/words_${tier}.json`;
          console.log(`[loadAllDictionaries] Attempting to fetch: ${path}`);
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

        isLoaded = true;
        gameLog = t('gameLogLoaded');
        logHistory = [gameLog]; // 初始化歷史
      } catch (error) {
        console.error("Failed to load dictionaries:", error);
        gameLog = t('gameLogError');
      }
    }

    function spawnMonsters() {
      const tiers = ['white', 'magic', 'rare', 'unique'];
      const config = {
        white:  { hp: 60,  speed: 0.3, icon: '👻', color: '#ffffff' },
        magic:  { hp: 120, speed: 0.5, icon: '🔮', color: '#3498db' },
        rare:   { hp: 250, speed: 0.7, icon: '💎', color: '#f1c40f' },
        unique: { hp: 600, speed: 1.0, icon: '👑', color: '#9b59b6' }
      };

      enemies = tiers.map((tier, index) => {
        const pool = dictionaries[tier] || ['error'];
        const randomWord = pool[Math.floor(Math.random() * pool.length)];
        return {
          id: index + 1,
          name: tier.toUpperCase(),
          word: randomWord,
          hp: config[tier].hp,
          maxHp: config[tier].hp,
          mp: 50, maxMp: 50,
          atb: Math.random() * 30, // 隨機初始進度
          speed: config[tier].speed,
          wordType: tier,
          icon: config[tier].icon,
          isAttacking: false,
          isTargetSuccess: false
        };
      });
    }
  
    function updateATB() {
      // 玩家 ATB
      if (player.atb < 100) {
        const chargeSpeed = devMode ? player.speed * 5 : player.speed;
        player.atb += chargeSpeed;
        if (player.atb >= 100) {
          player.atb = 100;
          gameState = 'ACTION_SELECT'; // 進入行動選擇狀態
          gameLog = t('playerTurn');
        }
      }
  
      // 敵人 ATB
      enemies = enemies.map(e => {
        if (e.hp > 0 && e.atb < 100) {
          e.atb += e.speed;
          if (e.atb >= 100) enemyAttack(e.name);
        }
        return e;
      });
    }
  
    function enemyAttack(enemyName) {
      const damage = 10;
      const lowerName = enemyName.toLowerCase();
      
      const attacker = enemies.find(e => e.name === enemyName);
      if (!attacker) return;

      // 觸發怪物攻擊特效
      attacker.isAttacking = true;
      enemies = enemies;
      
      if (!devMode) {
        player.hp = Math.max(0, player.hp - damage);
      }

      // 觸發玩家受傷特效
      player.isHit = true;
      setTimeout(() => {
        attacker.isAttacking = false;
        player.isHit = false;
        enemies = enemies;
        player = player;
      }, 400); // 攻擊動畫持續時間

      attacker.atb = 0;
      gameLog = t('enemyAttackLog', lowerName, damage);
      if (player.hp <= 0) gameState = 'GAME_OVER';
    }
  
    function togglePause() {
      if (gameState === 'GAME_OVER') return;
      if (gameState === 'PAUSED') {
        gameState = previousState;
      } else {
        previousState = gameState;
        gameState = 'PAUSED'; // 進入暫停狀態
      }
    }

    function restartGame() {
      player = {
        hp: 100, maxHp: 100, 
        mp: 50, maxMp: 100,
        atb: 0, speed: 0.8, isHit: false,
        isAttacking: false,
        selectedAction: null
      };
      spawnMonsters();
      gameState = 'BATTLE'; // 重置遊戲狀態
      gameLog = t('gameRestarted');
      logHistory = [gameLog];
      targetInput = "";
      burstInput = "";
      comboCount = 0;
      if (burstInterval) clearInterval(burstInterval);
    }

    function clearLogs() {
      logHistory = [];
      gameLog = ""; // 同步清除當前日誌狀態防止重複觸發
    }

    // --- 鍵盤監聽 ---
    function handleGlobalKeyDown(e) {
      if (e.key === 'Escape') {
        togglePause();
        return;
      }

      if (gameState === 'PAUSED' || gameState === 'GAME_OVER') return;

      if (gameState === 'ACTION_SELECT') {
        const key = e.key.toUpperCase(); // M 改為 S
        if (['A', 'S', 'I', 'B', 'R'].includes(key)) {
          if (key === 'S' && player.mp < 30) {
            gameLog = t('mpNotEnough');
            return;
          }
          e.preventDefault(); // 阻止指令字元被輸入到接下來出現的輸入框中
          player.selectedAction = key;
          if (key === 'A' || key === 'S') { // M 改為 S
            gameState = 'TARGETING';
            targetInput = "";
            gameLog = t('targetingPrompt');
          } else {
            executeQuickAction(key);
          }
        }
      } else if (gameState === 'TARGETING') {
        if (e.key === 'Backspace') {
          targetInput = targetInput.slice(0, -1);
          e.preventDefault();
        } else if (e.key.length === 1) {
          targetInput += e.key;
          e.preventDefault();
        }
        checkTargeting();
      } else if (gameState === 'BURST') {
        if (e.key === 'Backspace') {
          burstInput = burstInput.slice(0, -1);
          e.preventDefault();
        } else if (e.key.length === 1) {
          burstInput += e.key;
          e.preventDefault();
        }
        handleBurstTyping();
      }
    }
  
    // --- 動作處理 ---
    function executeQuickAction(action) {
      if (action === 'B') gameLog = t('blockAction'); // 這裡可以加入防禦邏輯
      if (action === 'S') {
        gameLog = t('skillPlaceholder'); // 技能攻擊的佔位符
      }
      if (action === 'R') gameLog = t('runAction');
      resetTurn();
    }
  
    function checkTargeting() {
      const target = enemies.find(e => e.hp > 0 && e.word.toLowerCase() === targetInput.toLowerCase());
      if (target) {
        target.isTargetSuccess = true;
        enemies = enemies;

        if (player.selectedAction === 'S') {
          player.mp -= 30;
          player = player; // 確保 MP 變化即時反映在 UI 上
          gameLog = t('skillActivated');
        }
        currentTarget = target;
        
        setTimeout(() => {
          target.isTargetSuccess = false;
          enemies = enemies;
          startBurst();
        }, 200);
      }
    }
  
    function startBurst() {
      gameState = 'BURST';
      comboCount = 0;
      burstTimeLeft = burstMaxTime;
      nextBurstWord();
      
      burstInterval = setInterval(() => {
        if (gameState !== 'PAUSED') { // 暫停時停止倒數
          burstTimeLeft -= 100;
        }
        if (burstTimeLeft <= 0) {
          endBurst();
        }
      }, 100);
    }
  
    function nextBurstWord() {
      burstInput = "";
      // 使用當前目標怪物的難度等級來決定單字庫
      const poolKey = currentTarget?.wordType;
      const pool = dictionaries[poolKey];
      if (!pool || pool.length === 0) {
        currentBurstWord = "error";
        return;
      }
      currentBurstWord = pool[Math.floor(Math.random() * pool.length)].toLowerCase();
    }
  
    function handleBurstTyping() {
      if (burstInput.toLowerCase() === currentBurstWord.toLowerCase()) {
        comboCount++;
        
        // 觸發玩家攻擊特效
        player.isAttacking = true;
        setTimeout(() => {
          player.isAttacking = false;
          player = player;
        }, 200);

        // 觸發視覺特效
        currentTarget.isHit = true;
        const hitTarget = currentTarget;
        setTimeout(() => {
          hitTarget.isHit = false;
          enemies = enemies; // 確保狀態清除後能更新 UI
        }, 150);

        // 立即造成傷害
        let multiplier = player.selectedAction === 'S' ? 2 : 1;
        if (devMode) multiplier *= 10;
        const damagePerWord = 20 * multiplier;
        currentTarget.hp = Math.max(0, currentTarget.hp - damagePerWord);
        enemies = enemies; // 觸發 Svelte 反應式更新

        if (currentTarget.hp <= 0) {
          endBurst();
        } else {
          nextBurstWord();
        }
      }
    }
  
    function endBurst() {
      clearInterval(burstInterval);
      const targetName = currentTarget.name.toLowerCase();
      gameLog = t('comboEnd', comboCount);
      
      if (currentTarget.hp <= 0) {
        gameLog += ` ${t('enemyDefeated', targetName)}`;
      }
      resetTurn();
    }
  
    function resetTurn() {
      player.atb = 0;
      player.selectedAction = null;
      currentTarget = null;
      targetInput = "";
      burstInput = "";
      gameState = 'BATTLE';
    }
  </script>
  
  <svelte:window on:keydown={handleGlobalKeyDown} />
  
  <header class="game-header">
    <div class="game-title">TYPE: Keyboard Adventurer</div>
    <div class="header-controls">
      <button class="dev-toggle" class:active={devMode} on:click={() => devMode = !devMode}>{t('devMode')}: {devMode ? 'ON' : 'OFF'}</button>
      <button on:click={() => currentLanguage = 'en'} class:active={currentLanguage === 'en'}>EN</button>
      <button on:click={() => currentLanguage = 'zh'} class:active={currentLanguage === 'zh'}>ZH</button>
    </div>
  </header>

  <div class="game-viewport">
    <!-- 獨立的戰鬥日誌視窗 (左側) -->
    <div class="message-log" bind:this={logContainer}>
      <button class="clear-log-btn" on:click={clearLogs}>CLEAR LOG</button>
      {#each logHistory as log, i}
        <div class="log-entry" class:latest={i === logHistory.length - 1}>
          {log}
        </div>
      {/each}
    </div>

    <main class="game-container">
      <!-- 主遊戲內容區 (內部垂直排列) -->
      <div class="game-main-content">
        <!-- 暫停/結束 選單遮罩 -->
        {#if gameState === 'PAUSED' || gameState === 'GAME_OVER'}
          <div class="modal-overlay">
            <div class="modal-content">
              {#if gameState === 'GAME_OVER'}
                <h1 style="color: #fff;">{t('playerDefeated')}</h1>
              {:else}
                <h1>{t('gamePaused')}</h1>
                <button on:click={togglePause}>{t('continueGame')}</button>
              {/if}
              <button on:click={restartGame}>{t('restartGame')}</button>
            </div>
          </div>
        {/if}

        <!-- 第一人稱戰鬥畫面 -->
        <div class="battle-scene">
          <div class="enemies-row">
            {#each enemies as enemy}
              <div 
                class="monster-wrapper" 
                class:dead={enemy.hp <= 0} 
                class:hit={enemy.isHit}
                class:attacking={enemy.isAttacking}
                class:target-success={enemy.isTargetSuccess}
                style="--tier-color: {enemy.wordType === 'white' ? '#fff' : (enemy.wordType === 'magic' ? '#3498db' : (enemy.wordType === 'rare' ? '#f1c40f' : '#9b59b6'))};">
                <div class="monster-sprite">
                  {enemy.icon}
                </div>
                <div class="monster-word">
                  {#each enemy.word.split('') as char, i}
                    <span class="letter" 
                      class:correct={gameState === 'TARGETING' && targetInput.length > i && targetInput.toLowerCase().slice(0, i+1) === enemy.word.toLowerCase().slice(0, i+1)}
                    >{char}</span>
                  {/each}
                </div>
                <div class="stat-row">{t('hp')}: {enemy.hp} / {enemy.maxHp}</div>
                <div class="bar-container">
                  <div class="hp-fill" style="width: {(enemy.hp/enemy.maxHp)*100}%"></div>
                </div>
                <div class="stat-row">{t('mp')}: {enemy.mp} / {enemy.maxMp}</div>
                <div class="bar-container">
                  <div class="mp-fill" style="width: {(enemy.mp/enemy.maxMp)*100}%"></div>
                </div>
                <div class="stat-row">{t('atb')}: {Math.floor(enemy.atb)}%</div>
                <div class="bar-container atb">
                  <div class="atb-fill" style="width: {enemy.atb}%"></div>
                </div>
                <div class="monster-source">words_{enemy.wordType}.json</div>
              </div>
            {/each}
          </div>

          <!-- 玩家視覺角色 -->
          <div class="player-visual-wrapper" class:attacking={player.isAttacking} class:hit={player.isHit}>
            <div class="player-sprite">🛡️</div>
            <div class="player-tag">PLAYER</div> 
            <div class="stat-row">{t('hp')}: {player.hp} / {player.maxHp}</div>
            <div class="bar-container">
              <div class="hp-fill" style="width: {(player.hp/player.maxHp)*100}%"></div>
            </div>
            <div class="stat-row">{t('mp')}: {player.mp} / {player.maxMp}</div>
            <div class="bar-container">
              <div class="mp-fill" style="width: {(player.mp/player.maxMp)*100}%"></div>
            </div>
            <div class="stat-row">{t('atb')}: {Math.floor(player.atb)}%</div>
            <div class="bar-container atb">
              <div class="atb-fill" style="width: {player.atb}%"></div>
            </div>
          </div>
        </div>
        <!-- 下方 UI 操作與打字區 -->
        <div class="ui-panel">
            <div class="input-area">
              {#if gameState === 'ACTION_SELECT'}
                <div class="action-menu">
                  <span class="key-hint">A</span> {t('attack')}
                  <span class="key-hint">S</span> {t('skill')}
                  <span class="key-hint">I</span> {t('item')}
                  <span class="key-hint">B</span> {t('block')}
                  <span class="key-hint">R</span> {t('run')}
                </div>
              {:else if gameState === 'TARGETING'}
                <div class="targeting-status">
                  {t('targetingPrompt')}
                </div>
              {:else if gameState === 'BURST'}
                <div class="burst-container">
                  <div class="timer-bar" style="width: {(burstTimeLeft/burstMaxTime)*100}%"></div>
                  <div class="timer-text">{(burstTimeLeft / 1000).toFixed(1)}s</div>
                  <div class="combo">{t('combo')}: {comboCount}</div>
                <div class="burst-word">
                  {t('burstPrompt')}
                  <span class="word-display">{#each currentBurstWord.split('') as char, i}<span class="letter" class:correct={burstInput[i]?.toLowerCase() === char} class:incorrect={burstInput[i] !== undefined && burstInput[i]?.toLowerCase() !== char} class:pending={burstInput[i] === undefined}>{char}</span>{/each}</span>
                </div>
                </div>
              {/if}
          </div>
        </div>
      </div>
    
    </main>
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
  
    .game-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      border-bottom: 1px solid #fff;
      background: #000;
      width: 100%;
      box-sizing: border-box;
      z-index: 10;
    }

    .game-title {
      font-size: 0.9rem;
      font-weight: bold;
    }

    .header-controls {
      display: flex;
      gap: 10px;
    }

    .header-controls button {
      background: #000; color: #fff; border: 1px solid #fff; padding: 3px 8px;
      cursor: pointer; font-family: inherit;
      font-size: 0.7rem;
    }
    .header-controls button.active { background: #fff; color: #000; }

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
      height: 650px;
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
  
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex; justify-content: center; align-items: center;
      z-index: 1000;
    }
    .modal-content {
      text-align: center;
      background: #000;
      padding: 40px;
      border: 1px solid #fff;
    }
    .modal-content button {
      display: block; width: 220px; margin: 15px auto; padding: 12px;
      background: #000; color: #fff; border: 1px solid #fff;
      font-family: inherit; cursor: pointer; font-size: 1rem;
    }
    .modal-content button:hover { background: #fff; color: #000; }

    .battle-scene {
      flex: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #000;
      perspective: 500px;
      position: relative;
    }

    .enemies-row {
      display: flex;
      width: 100%;
      justify-content: space-around;
      margin-bottom: 50px;
    }

    .player-visual-wrapper {
      text-align: center;
      transition: transform 0.2s ease-out;
    }

    .player-visual-wrapper.attacking {
      transform: translateY(-40px) scale(1.1);
    }

    .player-visual-wrapper.hit {
      animation: shake 0.15s infinite, flash 0.15s ease-out;
    }

    .player-sprite {
      font-size: 4rem;
      filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));
      margin-bottom: 5px;
    }

    .player-tag {
      font-size: 1.2rem;
      font-weight: bold;
      color: #fff;
      margin-bottom: 8px;
      text-transform: uppercase;
      text-shadow: none;
    }
  
    .monster-wrapper {
      text-align: center;
      transition: all 0.5s;
    }
  
    .monster-wrapper.dead {
      opacity: 0;
      transform: scale(0.5) translateY(100px);
    }
  
    .monster-wrapper.hit {
      animation: shake 0.15s infinite, flash 0.15s ease-out;
    }

    @keyframes shake {
      0% { transform: translate(2px, 0); }
      25% { transform: translate(-2px, 0); }
      50% { transform: translate(2px, 0); }
      75% { transform: translate(-2px, 0); }
      100% { transform: translate(0, 0); }
    }

    @keyframes flash {
      0% { filter: invert(0); }
      50% { filter: invert(1); }
      100% { filter: invert(0); }
    }

    .monster-wrapper.attacking {
      animation: lunge 0.4s ease-out;
      z-index: 5;
    }

    @keyframes lunge {
      0% { transform: translateY(0); }
      30% { transform: translateY(50px) scale(1.2); }
      100% { transform: translateY(0); }
    }

    .monster-wrapper.target-success {
      animation: target-flash 0.2s ease-out;
    }

    @keyframes target-flash {
      0% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.1); filter: brightness(3); }
      100% { transform: scale(1); filter: brightness(1); }
    }

    .player-stats.hit {
      animation: player-flash 0.15s ease-out;
    }
    @keyframes player-flash {
      0% { background: #000; }
      50% { background: #fff; }
      100% { background: #000; }
    }
    .monster-name {
      font-size: 0.8rem;
      color: var(--tier-color, #fff);
      text-transform: uppercase;
      margin-bottom: 5px;
      letter-spacing: 1px;
    }

    .monster-word {
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--tier-color, #fff);
      text-shadow: none;
      margin-bottom: 8px;
    }

    .monster-wrapper .stat-row, .player-visual-wrapper .stat-row {
      text-align: left;
      width: 100px;
      margin: 0 auto;
      font-size: 0.7rem;
    }
  
    .monster-sprite {
      font-size: 3rem;
      margin-bottom: 5px;
      filter: drop-shadow(0 0 5px var(--tier-color, transparent));
    }

    .monster-source {
      font-size: 0.6rem;
      color: #666;
      margin-top: 2px;
    }

    .bar-container {
      width: 100px;
      height: 4px;
      background: #000;
      border: 1px solid #fff;
      margin: 4px auto;
    }
  
    .hp-fill { height: 100%; background: #fff; transition: width 0.3s; }
    .atb-fill { height: 100%; background: #fff; }
    .mp-fill { height: 100%; background: #fff; transition: width 0.3s; }
  
    .message-log {
      width: 250px;
      height: 650px; /* 與遊戲視窗同高 */
      background: rgba(255, 255, 255, 0.02);
      padding: 15px;
      border: 1px solid #fff;
      font-size: 0.8rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      position: relative;
    }

    /* --- 懷舊電腦風格捲軸 --- */
    .message-log::-webkit-scrollbar {
      width: 12px;
    }
    .message-log::-webkit-scrollbar-track {
      background: #000;
      border-left: 1px solid #fff;
    }
    .message-log::-webkit-scrollbar-thumb {
      background: #fff;
      border: 2px solid #000;
    }

    .clear-log-btn {
      position: sticky;
      top: -15px; /* 抵銷 padding */
      width: calc(100% + 30px);
      margin-left: -15px;
      background: #000;
      color: #fff;
      border: none;
      border-bottom: 1px solid #fff;
      font-family: inherit;
      font-size: 0.7rem;
      padding: 5px;
      cursor: pointer;
      z-index: 5;
      margin-bottom: 10px;
    }
    .clear-log-btn:hover {
      background: #fff;
      color: #000;
    }

    .log-entry { color: #888; line-height: 1.4; }
    .log-entry.latest { color: #fff; font-weight: bold; }
  
    .ui-panel {
      height: 200px;
      display: flex;
      flex-direction: column;
      padding: 10px 20px;
      gap: 10px;
      background: rgba(255,255,255,0.05);
      box-sizing: border-box;
    }
  
    .input-area {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    .targeting-status { font-size: 1.2rem; color: #fff; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

    .action-menu { font-size: 1.2rem; }
    .key-hint {
      background: #fff;
      color: #000;
      padding: 2px 6px;
      border-radius: 0;
      margin-right: 5px;
    }
  
    input {
      width: 80%;
      padding: 8px;
      font-size: 1.2rem;
      background: transparent;
      border: none;
      border-bottom: 1px solid #fff;
      color: white;
      text-align: center;
      outline: none;
    }
  
    .burst-container { text-align: center; width: 100%; }
    .timer-bar { height: 4px; background: #fff; margin-bottom: 5px; transition: width 0.1s linear; }
    .timer-text { font-size: 0.9rem; color: #fff; margin-bottom: 2px; font-weight: bold; }
    .burst-word .word-display { font-size: 1.6rem; font-weight: bold; }
    .letter.correct { color: #fff; text-decoration: underline; }
    .letter.incorrect { color: #ff4d4d; text-decoration: underline; font-weight: 900; }
    .letter.pending { color: #666; }

    .combo { font-size: 1rem; color: #fff; }
  </style>
  