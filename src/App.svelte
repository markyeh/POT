<script>
    import { onMount, onDestroy } from 'svelte';
  
    // --- 遊戲資料定義 ---
    let dictionaries = {};
    let isLoaded = false;

    let gameState = 'BATTLE'; // BATTLE (ATB), ACTION_SELECT, TARGETING, BURST, GAME_OVER
    let previousState = 'BATTLE'; // 用於暫停後恢復
    let currentLanguage = 'en'; // 預設語言為英文
    let gameLog = ""; // 初始化為空，等待載入訊息
    let currentDifficulty = 'common'; // 預設難度
    
    let player = {
      hp: 100, maxHp: 100, 
      mp: 50, maxMp: 100, // 新增 MP 屬性
      atb: 0, speed: 0.8, isHit: false,
      selectedAction: null
    };
  
    let enemies = [
      { id: 1, name: 'slime', word: 'apple', hp: 60, maxHp: 60, mp: 20, maxMp: 50, atb: 10, speed: 0.4 }, // 新增 MP 屬性
      { id: 2, name: 'skeleton', word: 'bone', hp: 100, maxHp: 100, mp: 30, maxMp: 60, atb: 40, speed: 0.2 } // 新增 MP 屬性
    ];
  
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
  
    onMount(() => {
      loadAllDictionaries();
  
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
        const tiers = ['common', 1000, 3000, 5000, 7000];
        const fetchPromises = tiers.map(tier => 
          fetch(`/data/words_${tier}.json`).then(res => {
            if (!res.ok) {
              throw new Error(`無法讀取難度 ${tier} 的單字庫 (HTTP ${res.status})`);
            }
            return res.json();
          })
        );
        
        const results = await Promise.all(fetchPromises);
        
        tiers.forEach((tier, index) => {
          dictionaries[tier] = results[index].map(w => w.toLowerCase());
        });

        isLoaded = true;
        gameLog = t('gameLogLoaded');
      } catch (error) {
        console.error("Failed to load dictionaries:", error);
        gameLog = t('gameLogError');
      }
    }
  
    function updateATB() {
      // 玩家 ATB
      if (player.atb < 100) {
        player.atb += player.speed;
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
  
    function enemyAttack(enemy) {
      const damage = 10;
      const enemyName = enemy.toLowerCase();
      player.hp = Math.max(0, player.hp - damage);

      // 觸發玩家受傷特效
      player.isHit = true;
      setTimeout(() => {
        player.isHit = false;
        player = player; // 觸發 Svelte 響應式更新
      }, 150); // 與怪物受傷特效相同的持續時間
      const targetEnemy = enemies.find(e => e.name === enemy);
      if (targetEnemy) targetEnemy.atb = 0;
      gameLog = t('enemyAttackLog', enemyName, damage);
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
        selectedAction: null
      };
      enemies = [
        { id: 1, name: 'slime', word: 'apple', hp: 60, maxHp: 60, mp: 20, maxMp: 50, atb: 10, speed: 0.4 },
        { id: 2, name: 'skeleton', word: 'bone', hp: 100, maxHp: 100, mp: 30, maxMp: 60, atb: 40, speed: 0.2 }
      ];
      gameState = 'BATTLE'; // 重置遊戲狀態
      gameLog = t('gameRestarted');
      targetInput = "";
      burstInput = "";
      comboCount = 0;
      if (burstInterval) clearInterval(burstInterval);
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
        if (player.selectedAction === 'S') {
          player.mp -= 30;
          player = player; // 確保 MP 變化即時反映在 UI 上
          gameLog = t('skillActivated');
        }
        currentTarget = target;
        startBurst();
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
      const pool = dictionaries[currentDifficulty];
      if (!pool || pool.length === 0) {
        currentBurstWord = "error";
        return;
      }
      currentBurstWord = pool[Math.floor(Math.random() * pool.length)].toLowerCase();
    }
  
    function handleBurstTyping() {
      if (burstInput.toLowerCase() === currentBurstWord.toLowerCase()) {
        comboCount++;
        
        // 觸發視覺特效
        currentTarget.isHit = true;
        const hitTarget = currentTarget;
        setTimeout(() => {
          hitTarget.isHit = false;
          enemies = enemies; // 確保狀態清除後能更新 UI
        }, 150);

        // 立即造成傷害
        const multiplier = player.selectedAction === 'S' ? 2 : 1;
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
  
  <main class="game-container">
    <div class="language-switcher">
      <button on:click={() => currentLanguage = 'en'} class:active={currentLanguage === 'en'}>EN</button>
      <button on:click={() => currentLanguage = 'zh'} class:active={currentLanguage === 'zh'}>ZH</button>
    </div>

    <!-- 暫停/結束 選單遮罩 -->
    {#if gameState === 'PAUSED' || gameState === 'GAME_OVER'}
      <div class="modal-overlay">
        <div class="modal-content">
          {#if gameState === 'GAME_OVER'}
            <h1 style="color: #ff4757;">{t('playerDefeated')}</h1>
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
      {#each enemies as enemy}
        <div class="monster-wrapper" class:dead={enemy.hp <= 0} class:hit={enemy.isHit}>
          <div class="monster-name">{enemy.name.toLowerCase()}</div>
          <div class="monster-sprite">
            {enemy.name.toLowerCase() === 'slime' ? '💧' : '💀'}
          </div>
          <div class="monster-word">{enemy.word.toLowerCase()}</div>
          <div class="stat-row">{t('hp')}: {enemy.hp} / {enemy.maxHp}</div> <!-- 顯示怪物 HP 數值 -->
          <div class="bar-container">
            <div class="hp-fill" style="width: {(enemy.hp/enemy.maxHp)*100}%"></div>
          </div>
          <div class="stat-row">{t('mp')}: {enemy.mp} / {enemy.maxMp}</div> <!-- 顯示怪物 MP 數值 -->
          <div class="bar-container">
            <div class="mp-fill" style="width: {(enemy.mp/enemy.maxMp)*100}%"></div>
          </div>
          <div class="stat-row">{t('atb')}: {Math.floor(enemy.atb)}%</div> <!-- 顯示怪物 ATB 數值 -->
          <div class="bar-container atb">
            <div class="atb-fill" style="width: {enemy.atb}%"></div>
          </div>
        </div>
      {/each}
    </div>
  
    <!-- 戰鬥日誌 -->
    <div class="message-log">{gameLog}</div>
  
    <!-- 下方 UI 區 -->
    <div class="ui-panel">
      <div class="player-stats" class:hit={player.isHit}>
        <div class="stat-row">{t('hp')}: {player.hp} / {player.maxHp}</div>
        <div class="bar-container player-hp-bar">
          <div class="hp-fill player" style="width: {(player.hp/player.maxHp)*100}%"></div>
        </div>
        <div class="stat-row">{t('mp')}: {player.mp} / {player.maxMp}</div> <!-- 顯示玩家 MP 數值 -->
        <div class="bar-container player-mp-bar">
          <div class="mp-fill" style="width: {(player.mp/player.maxMp)*100}%"></div>
        </div>
        <div class="stat-row">{t('atb')}: {Math.floor(player.atb)}%</div> <!-- 顯示玩家 ATB 數值 -->
        <div class="bar-container player-atb-bar">
          <div class="atb-fill" style="width: {player.atb}%"></div>
        </div>
      </div>

      <div class="difficulty-select">
        <select bind:value={currentDifficulty}>
          <option value="common">{t('commonWords')}</option>
          <option value={1000}>1000 {t('words')}</option>
          <option value={3000}>3000 {t('words')}</option>
          <option value={5000}>5000 {t('words')}</option>
          <option value={7000}>7000 {t('words')}</option>
        </select>
      </div>
  
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
          <input 
            bind:value={targetInput} 
            on:input={checkTargeting}
            placeholder={t('targetingPrompt')}
            autofocus 
          />
        {:else if gameState === 'BURST'}
          <div class="burst-container">
            <div class="timer-bar" style="width: {(burstTimeLeft/burstMaxTime)*100}%"></div>
            <div class="timer-text">{(burstTimeLeft / 1000).toFixed(1)}s</div>
            <div class="combo">{t('combo')}: {comboCount}</div>
            <div class="burst-word">{t('burstPrompt')} <span>{currentBurstWord}</span></div>
            <input 
              bind:value={burstInput} 
              on:input={handleBurstTyping} 
              placeholder={t('burstPlaceholder')}
              autofocus 
            />
          </div>
        {/if}
      </div>
    </div>
  </main>
  
  <style>
    :global(body) {
      background-color: #121212;
      color: #eee;
      font-family: 'Courier New', monospace;
      margin: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
  
    .language-switcher {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1001;
    }
    .language-switcher button {
      background: #333; color: #eee; border: 1px solid #555; padding: 5px 10px; margin-left: 5px;
      cursor: pointer; font-family: inherit;
    }
    .language-switcher button.active { background: #555; border-color: #777; }

    .game-container {
      width: 800px;
      height: 600px;
      background: #1a1a1a;
      border: 4px solid #333;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
  
    .modal-overlay {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex; justify-content: center; align-items: center;
      z-index: 1000;
    }
    .modal-content {
      text-align: center;
      background: #222;
      padding: 40px;
      border: 2px solid #555;
    }
    .modal-content button {
      display: block; width: 220px; margin: 15px auto; padding: 12px;
      background: #444; color: white; border: 1px solid #777;
      font-family: inherit; cursor: pointer; font-size: 1rem;
    }
    .modal-content button:hover { background: #666; }

    .battle-scene {
      flex: 3;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: linear-gradient(to bottom, #2c3e50, #000);
      perspective: 500px;
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
      0% { transform: translate(1px, 1px) rotate(0deg); }
      25% { transform: translate(-2px, -1px) rotate(-1deg); }
      50% { transform: translate(-1px, 2px) rotate(1deg); }
      75% { transform: translate(2px, 1px) rotate(-1deg); }
      100% { transform: translate(1px, -2px) rotate(0deg); }
    }

    @keyframes flash {
      0% { filter: brightness(1) contrast(1); }
      50% { filter: brightness(3) contrast(2); }
      100% { filter: brightness(1) contrast(1); }
    }

    .player-stats.hit {
      animation: player-flash 0.15s ease-out;
    }
    @keyframes player-flash {
      0% { filter: brightness(1) contrast(1); border-color: #333; }
      50% { filter: brightness(2) contrast(1.5); border-color: red; }
      100% { filter: brightness(1) contrast(1); border-color: #333; }
    }
    .monster-name {
      font-size: 0.8rem;
      color: #999;
      text-transform: none;
      margin-bottom: 5px;
      letter-spacing: 1px;
    }

    .monster-word {
      font-size: 1.2rem;
      font-weight: bold;
      color: #00ffcc;
      text-shadow: 0 0 8px rgba(0, 255, 204, 0.6);
      margin-bottom: 8px;
    }

    .monster-wrapper .stat-row {
      text-align: left;
      width: 100px;
      margin: 0 auto;
      font-size: 0.7rem;
    }
  
    .monster-sprite {
      font-size: 3rem;
      margin-bottom: 5px;
    }

    .bar-container {
      width: 100px;
      height: 6px;
      background: #444;
      margin: 4px auto;
    }
  
    .hp-fill { height: 100%; background: #ff4757; transition: width 0.3s; }
    .atb-fill { height: 100%; background: #ffa502; } /* ATB 統一為黃色 */
    .mp-fill { height: 100%; background: #1e90ff; transition: width 0.3s; } /* MP 統一為藍色 */
    .mp-fill.player { background: #6a5acd; }
    .player-hp-bar, .player-mp-bar {
      width: 100%; height: 10px; margin-bottom: 5px;
    }
  
    .message-log {
      flex: 0.5;
      background: #222;
      padding: 10px;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      font-size: 0.9rem;
    }
  
    .ui-panel {
      flex: 1.5;
      display: flex;
      padding: 20px;
      gap: 20px;
    }
  
    .player-stats { width: 150px; }
    .player-atb-bar { width: 100%; height: 10px; }

    .difficulty-select select {
      background: #333;
      color: white;
      border: 1px solid #555;
      padding: 5px;
      font-family: inherit;
      font-size: 0.8rem;
    }
  
    .input-area {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    .action-menu { font-size: 1.2rem; }
    .key-hint {
      background: #eee;
      color: #000;
      padding: 2px 8px;
      border-radius: 4px;
      margin-right: 5px;
    }
  
    input {
      width: 80%;
      padding: 10px;
      font-size: 1.5rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid #ffa502;
      color: white;
      text-align: center;
      outline: none;
    }
  
    .burst-container { text-align: center; width: 100%; }
    .timer-bar { height: 4px; background: #ffa502; margin-bottom: 10px; transition: width 0.1s linear; }
    .timer-text { font-size: 1rem; color: #ffa502; margin-bottom: 5px; font-weight: bold; }
    .burst-word span { color: #ff4757; font-size: 2rem; font-weight: bold; }
    .combo { font-size: 1.2rem; color: #ffa502; }
  </style>
  