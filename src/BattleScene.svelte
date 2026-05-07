<script>
  import { fade } from 'svelte/transition';
  export let enemies;
  export let player;
  export let gameState;
  export let selectedMonsterId; // 新增 selectedMonsterId prop
  export let t;
  export let currentLanguage; // 接收 currentLanguage prop
  export let showComboDisplay; // 接收連擊數顯示狀態
  export let currentComboDisplayCount; // 接收當前連擊數
  export let currentWpm = 0; // 接收即時 WPM
  export let isBossApproaching = false; // 接收 Boss 登場狀態
  export let useHpFlask; // 從 App.svelte 傳遞過來的函數
  export let useMpFlask; // 從 App.svelte 傳遞過來的函數
  export let gameScore = 0; // 接收進度作為 EXP
  export let equippedSkills = {};
  export let onDropSkill;
  export let onRemoveSkill;
  export let onOpenSkills;
  export let activeBurstKey = null; // 接收當前使用的按鍵
  export let hotkeys = {}; // 接收熱鍵設定以顯示標籤

  // 計算當前選中怪物的索引，用於定位選擇框
  $: selectedIndex = enemies.findIndex(e => e.id === selectedMonsterId);
  // 只有在非 Unique 怪物（Boss）且處於行動狀態時才顯示選擇框
  $: showFrame = selectedIndex !== -1 && (gameState === 'ACTION_SELECT' || gameState === 'BATTLE' || gameState === 'BURST') && enemies[selectedIndex]?.wordType !== 'unique';
  $: frameStyle = showFrame ? (
    enemies[selectedIndex].wordType === 'unique'
    ? "left: 50%; top: 50%; width: 95%; height: 90%;"
    : `left: ${((selectedIndex % 3) * 33.33) + 16.66}%; top: ${Math.floor(selectedIndex / 3) * 33.33 + 16.66}%; width: 30%; height: 30%;`
  ) : "";

  let hoveredSkill = null;
  let tooltipPos = { x: 0, y: 0 };

  function showTooltip(skill, e) {
    if (!skill) return;
    hoveredSkill = skill;
    tooltipPos = { x: e.clientX, y: e.clientY };
  }
  function moveTooltip(e) {
    tooltipPos = { x: e.clientX, y: e.clientY };
  }
  function hideTooltip() {
    hoveredSkill = null;
  }
</script>

<div class="battle-scene">
  <!-- Boss 登場特效遮罩 -->
  {#if isBossApproaching}
    <div class="boss-warning-overlay" transition:fade={{duration: 200}}>
      <div class="warning-text">WARNING</div>
      <div class="warning-sub">BOSS APPROACHING</div>
    </div>
  {/if}

  <div class="enemies-row">
    <!-- 平滑移動的選擇框 -->
    {#if showFrame}
      <div 
        class="selection-frame" 
        style={frameStyle}>
      </div>
    {/if}

    {#each enemies as enemy}
      <div 
        class="monster-wrapper" 
        class:dead={enemy.hp <= 0} 
        class:hit={enemy.isHit}
        class:attacking={enemy.isAttacking}
        class:target-success={enemy.isTargetSuccess}
        class:unique={enemy.wordType === 'unique'}
        class:tier-white={enemy.wordType === 'white'}
        class:tier-magic={enemy.wordType === 'magic'}
        class:tier-rare={enemy.wordType === 'rare'}
        class:tier-unique={enemy.wordType === 'unique'}
        style="--tier-color: {enemy.wordType === 'white' ? '#fff' : (enemy.wordType === 'magic' ? '#3498db' : (enemy.wordType === 'rare' ? '#f1c40f' : '#d35400'))};">
        <div class="bar-container hp-main">
          <div class="hp-fill" style="width: {(enemy.hp/enemy.maxHp)*100}%"></div>
          <div class="hp-text-overlay">
            <span class="name-base">{enemy.nameParts.base[currentLanguage]}</span>
            <span class="hp-text">{enemy.hp}/{enemy.maxHp}</span>
          </div>
        </div>
        <div class="monster-sprite">
          <!-- 受擊特效僅套用在 monster-icon 上 -->
          <div class="monster-icon" 
            class:hit={enemy.isHit}
            class:hit-fire={enemy.isHit && enemy.lastHitType === 'fire'}
            class:hit-ice={enemy.isHit && enemy.lastHitType === 'ice'}
            class:hit-thunder={enemy.isHit && enemy.lastHitType === 'thunder'}
            class:hit-wind={enemy.isHit && enemy.lastHitType === 'wind'}
            class:hit-poison={enemy.isHit && enemy.lastHitType === 'poison'}
            class:hit-blast={enemy.isHit && enemy.lastHitType === 'blast'}>
            {enemy.icon}
          </div>
        </div>
        {#if enemy.lastDamage > 0}
          <span class="damage-pop sprite-damage">-{enemy.lastDamage}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="player-section">
    <!-- 連擊顯示移出 player-visual-wrapper，避免受受傷震動動畫影響 -->
    <!-- 僅當 showComboDisplay 為真且連擊數達到 2 以上才顯示 -->
    {#if showComboDisplay && currentComboDisplayCount >= 1}
      <div class="combo-display">
        <div class="combo-number">{currentComboDisplayCount}</div>
        <div class="combo-text">HITS!</div>
        <div class="wpm-text">{currentWpm} WPM</div>
      </div>
    {/if}
    
    <div class="player-visual-wrapper" class:attacking={player.isAttacking}>
      <div class="player-sprite-container">
        <!-- 受擊特效僅套用在 player-sprite 上 -->
        <div class="player-sprite" class:hit={player.isHit}>🛡️</div>
        {#if player.lastDamage > 0}
          <span class="damage-pop sprite-damage">-{player.lastDamage}</span>
        {/if}
        {#if player.lastHeal > 0}
          <span class="damage-pop sprite-damage heal-pop">+{player.lastHeal}</span>
        {/if}
        {#if player.lastMpRegen > 0}
          <span class="damage-pop sprite-damage mp-pop">+{player.lastMpRegen}</span>
        {/if}
      </div>
    </div>

    <!-- PoE Style Interface -->
    <div class="poe-interface">
      <!-- Left: HP Orb -->
      <div class="orb hp-orb">
        <div class="liquid" style="height: {(player.hp/player.maxHp)*100}%"></div>
        <div class="orb-glass"></div>
        <div class="orb-value">{player.hp}</div>
      </div>

      <!-- Center: Action Bar -->
      <div class="action-bar-container">
        <div class="controls-row">
          <div class="flasks-row">
            <div class="flask-slot hp-flask" on:click={useHpFlask}>
              {#if player.hpFlask}
                <div class="flask-fill" style="height: {(player.hpFlask.currentCharges / (player.hpFlask.maxCharges || 1)) * 100}%"></div>
                <span class="flask-charges">{player.hpFlask.currentCharges}</span>
              {/if}
              <span class="flask-key">{hotkeys.hpFlask || '1'}</span>
            </div>
            <div class="flask-slot mp-flask" on:click={useMpFlask}>
              {#if player.mpFlask}
                <div class="flask-fill" style="height: {(player.mpFlask.currentCharges / (player.mpFlask.maxCharges || 1)) * 100}%"></div>
                <span class="flask-charges">{player.mpFlask.currentCharges}</span>
              {/if}
              <span class="flask-key">{hotkeys.mpFlask || '2'}</span>
            </div>
          </div>
          
          <!-- 技能欄位 -->
          <div class="skill-slots">
            {#each (hotkeys.skillSlots || ['Q', 'W', 'E', 'R', 'T']) as key, i}
              <div 
                class="skill-slot" 
                class:active={gameState === 'ACTION_SELECT'}
                class:using={gameState === 'BURST' && activeBurstKey === key}
                class:prompt-white={!equippedSkills[key]}
                class:prompt-yellow={gameState === 'ACTION_SELECT' && equippedSkills[key]}
                class:insufficient-mp={equippedSkills[key] && equippedSkills[key].mp && player.mp < equippedSkills[key].mp}
                on:click={() => onOpenSkills(key)}
                on:contextmenu|preventDefault={() => onRemoveSkill(key)}
                on:mouseenter={(e) => showTooltip(equippedSkills[key], e)}
                on:mousemove={moveTooltip}
                on:mouseleave={hideTooltip}
                on:dragover|preventDefault
                on:drop={(e) => {
                  const skillData = JSON.parse(e.dataTransfer.getData('skill'));
                  onDropSkill(key, skillData);
                }}>
                <span class="key">{key}</span>
                <span class="slot-index">{i + 1}</span>
                <span class="label">{equippedSkills[key] ? equippedSkills[key].icon : '-'}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Experience Bar -->
        <div class="exp-bar-container">
          <div class="exp-fill" style="width: {gameScore}%"></div>
        </div>

        <!-- ATB integrated here -->
        <div class="atb-minimal">
          <div class="atb-fill" style="width: {player.atb}%"></div>
        </div>
      </div>

      <!-- Right: MP Orb -->
      <div class="orb mp-orb">
        <div class="liquid" style="height: {(player.mp/player.maxMp)*100}%"></div>
        <div class="orb-glass"></div>
        <div class="orb-value">{player.mp}</div>
      </div>
    </div>
  </div>

  {#if hoveredSkill}
    <div class="skill-tooltip" style="top: {tooltipPos.y}px; left: {tooltipPos.x}px;">
      <div class="tooltip-header">
        <span class="tooltip-icon">{hoveredSkill.icon}</span>
        <span class="tooltip-name">{hoveredSkill[currentLanguage === 'zh' ? 'zh' : 'en'] || hoveredSkill.en}</span>
      </div>
      <div class="tooltip-body">
        <div class="tooltip-stats-grid">
          {#if hoveredSkill.atk}<div class="tooltip-stat">ATK: <span class="stat-val">{hoveredSkill.atk}</span></div>{/if}
          {#if hoveredSkill.aoe}<div class="tooltip-stat">AOE: <span class="stat-val">{hoveredSkill.aoe}</span></div>{/if}
          {#if hoveredSkill.mp}<div class="tooltip-stat">MP: <span class="mp-val">{hoveredSkill.mp}</span></div>{/if}
          {#if hoveredSkill.cd}<div class="tooltip-stat">CD: <span class="stat-val">{hoveredSkill.cd}s</span></div>{/if}
        </div>
        {#if hoveredSkill.description || hoveredSkill[`desc_${currentLanguage}`]}
          <p class="tooltip-desc">{hoveredSkill[`desc_${currentLanguage}`] || hoveredSkill.description || ''}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
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

  /* Boss 登場轉場特效 */
  .boss-warning-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(139, 0, 0, 0.4);
    z-index: 100;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    animation: danger-flash 0.5s infinite;
    pointer-events: none;
  }
  .warning-text {
    font-size: 4rem;
    font-weight: 900;
    color: #ff0000;
    text-shadow: 0 0 20px #000;
    letter-spacing: 10px;
  }
  .warning-sub {
    font-size: 1.2rem;
    color: #fff;
    font-weight: bold;
    margin-top: 10px;
  }
  @keyframes danger-flash {
    0%, 100% { background: rgba(139, 0, 0, 0.4); }
    50% { background: rgba(255, 0, 0, 0.2); }
  }

  .enemies-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 110px); /* 縮減每行高度從 140px 到 110px */
    gap: 5px; /* 縮減間距 */
    width: 100%;
    margin-bottom: 5px;
    position: relative;
    align-items: center;
    justify-items: center;
    min-height: 340px; /* 總高度縮減約 100px */
  }
  .monster-wrapper { 
    text-align: center; 
    transition: all 0.5s; 
    width: 100%;
    position: relative;
  }
  /* 修正：如果正在受擊，即使死亡也不要立即消失，確保特效被看到 */
  .monster-wrapper.dead.hit {
    opacity: 1 !important;
  }
  .monster-wrapper.dead { opacity: 0; transform: scale(0.5) translateY(100px); }
  .monster-wrapper.hit, .player-visual-wrapper.hit { animation: shake 0.15s infinite, flash 0.15s ease-out; }
  .monster-wrapper.attacking { animation: lunge 0.4s ease-out; z-index: 5; }
  .monster-wrapper.target-success { animation: target-flash 0.2s ease-out; }

  /* --- 怪物階級特效增強 --- */
  .tier-magic .monster-icon {
    animation: magic-glow 2s infinite alternate ease-in-out;
    filter: drop-shadow(0 0 8px var(--tier-color));
  }
  @keyframes magic-glow {
    from { filter: drop-shadow(0 0 5px var(--tier-color)); }
    to { filter: drop-shadow(0 0 15px var(--tier-color)) brightness(1.2); }
  }

  .tier-rare .monster-icon {
    animation: rare-shimmer 1.5s infinite alternate ease-in-out;
    filter: drop-shadow(0 0 12px var(--tier-color));
  }
  @keyframes rare-shimmer {
    0% { transform: scale(1); filter: drop-shadow(0 0 8px var(--tier-color)); }
    100% { transform: scale(1.05); filter: drop-shadow(0 0 20px var(--tier-color)) brightness(1.3); }
  }

  .tier-unique .monster-icon {
    animation: unique-pulse 1s infinite alternate cubic-bezier(0.45, 0.05, 0.55, 0.95);
    filter: drop-shadow(0 0 20px var(--tier-color));
  }
  @keyframes unique-pulse {
    0% { transform: scale(1); filter: drop-shadow(0 0 15px var(--tier-color)); }
    100% { transform: scale(1.1); filter: drop-shadow(0 0 35px var(--tier-color)) brightness(1.4); }
  }

  /* 讓血條邊框也有對應光暈 */
  .bar-container.hp-main { box-shadow: 0 0 10px rgba(0,0,0,0.5), 0 0 5px var(--tier-color); }

  /* Unique Monster (Boss) 佔滿 3x3 網格 */
  .monster-wrapper.unique {
    grid-column: 1 / span 3;
    grid-row: 1 / span 3;
    width: 100%;
    height: 335px; /* 適配新的網格高度 (3x110 + 2x5 gap) */
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center;    /* 水平置中 */
    gap: 10px;              /* 稍微縮小間距 */
    position: relative;
    z-index: 5;
  }
  .monster-wrapper.unique .monster-icon { font-size: 7rem; } /* 稍微縮小 Boss 圖示，釋放空間 */
  .monster-wrapper.unique .bar-container.hp-main { 
    width: 450px; height: 30px; margin: 0; z-index: 10;
  }
  .monster-wrapper.unique .hp-text-overlay { font-size: 1.4rem; padding: 0 15px; }
  .monster-wrapper.unique .hp-text-overlay .name-base { font-size: 1.2rem; }
  .monster-wrapper.unique .hp-text-overlay .hp-text { font-size: 1rem; }
  .monster-wrapper.unique .sprite-damage { font-size: 4rem; left: 50%; top: 50%; }

  /* --- 強化版屬性攻擊特效 --- */

  /* 火：點燃燃燒感，加入色相閃爍與劇烈上升位移 */
  .hit-fire { 
    animation: fire-bloom 0.2s ease-in-out infinite !important; 
    filter: drop-shadow(0 0 40px #ff4500) drop-shadow(0 0 10px #ffff00) brightness(2.5) !important; 
  }
  @keyframes fire-bloom {
    0%, 100% { transform: scale(1.3) translateY(0); filter: hue-rotate(0deg); }
    50% { transform: scale(1.45) translateY(-20px); filter: hue-rotate(15deg) brightness(1.5); }
  }

  /* 冰：極低溫凍結 + 寒氣發光 + 高頻凍裂顫動 */
  .hit-ice { animation: ice-shiver 0.1s infinite !important; filter: drop-shadow(0 0 40px #00fbff) brightness(1.8) contrast(1.5) hue-rotate(180deg) !important; }
  @keyframes ice-shiver {
    0%, 100% { transform: scale(1.2) translate(2px, 2px); }
    25% { transform: scale(1.2) translate(-2px, -2px); }
    50% { transform: scale(1.3) translate(2px, -2px); }
    75% { transform: scale(1.3) translate(-2px, 2px); }
  }

  /* 雷：極速白光閃爍 + 隨機位移 (模擬電弧) */
  .hit-thunder { animation: bolt-strobe 0.1s steps(2) infinite !important; filter: brightness(5) contrast(2) !important; }
  @keyframes bolt-strobe {
    0% { transform: translate(10px, 0); opacity: 1; }
    50% { transform: translate(-10px, 10px); opacity: 0.5; }
    100% { transform: translate(5px, -10px); opacity: 1; }
  }

  /* 風：強化的龍捲風感，增加旋轉斜切與動態模糊 */
  .hit-wind { animation: wind-vortex 0.15s linear infinite !important; filter: blur(5px) contrast(1.5) opacity(0.6) !important; }
  @keyframes wind-vortex {
    0% { transform: rotate(0deg) skew(0deg) scale(1.3); }
    50% { transform: rotate(15deg) skew(10deg) scale(1.5); }
    100% { transform: rotate(-15deg) skew(-10deg) scale(1.3); }
  }

  /* 毒：劇毒滲透 + 扭曲溶解感 + 色相劇烈偏移 */
  .hit-poison { animation: poison-dissolve 0.4s ease-in-out infinite !important; filter: drop-shadow(0 0 40px #2bff00) saturate(4) !important; }
  @keyframes poison-dissolve {
    0%, 100% { transform: scale(1) skew(0deg); filter: hue-rotate(280deg); }
    33% { transform: scale(1.1, 0.9) skew(10deg); filter: hue-rotate(320deg); }
    66% { transform: scale(0.9, 1.1) skew(-10deg); filter: hue-rotate(250deg); }
  }

  /* 爆炸：瞬間巨大化 + 螢幕發白 */
  .monster-icon.hit-blast { 
    animation: blast-nova 0.3s cubic-bezier(0.19, 1, 0.22, 1) infinite !important; 
    box-shadow: 0 0 20px 10px rgba(255, 165, 0, 0.8), 0 0 40px 20px rgba(255, 255, 0, 0.6); /* 初始火花 */
  }
  @keyframes blast-nova {
    0% { transform: scale(1); filter: brightness(1); }
    20% { transform: scale(1.8); filter: brightness(10) white-balance(100%); box-shadow: 0 0 30px 15px rgba(255, 165, 0, 1), 0 0 60px 30px rgba(255, 255, 0, 0.8); }
    50% { transform: scale(1.7); filter: brightness(5) drop-shadow(0 0 50px #fff); box-shadow: 0 0 50px 25px rgba(255, 165, 0, 0.5), 0 0 80px 40px rgba(255, 255, 0, 0.3); }
    100% { transform: scale(1.6); filter: brightness(1.5) drop-shadow(0 0 40px #fff); box-shadow: 0 0 0px 0px transparent; }
  }

  /* 重寫基礎 shake 以免與屬性特效衝突 */
  .monster-icon.hit:not([class*='hit-']) { animation: shake 0.15s infinite, flash 0.15s ease-out; }

  /* 獨立選擇框樣式 */
  .selection-frame {
    position: absolute;
    border: 2px solid yellow;
    box-shadow: 0 0 15px rgba(255, 255, 0, 0.5), inset 0 0 10px rgba(255, 255, 0, 0.3);
    top: 50%;
    transform: translate(-50%, -50%); /* 改為 -50% 達成真正的垂直置中 */
    transition: left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), top 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), width 0.25s ease, height 0.25s ease;
    pointer-events: none;
    z-index: 10;
    border-radius: 4px;
    background: rgba(255, 255, 0, 0.05);
  }

  .player-section {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-top: 0px; /* 縮減玩家區與怪物區的間距 */
  }

  .player-visual-wrapper { text-align: center; transition: transform 0.2s ease-out; margin-bottom: 5px; }
  .player-visual-wrapper.attacking { transform: translateY(-40px) scale(1.1); }
  
  .player-sprite-container { position: relative; display: inline-block; }
  .player-sprite { font-size: 3.5rem; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }

  /* PoE Interface Styles */
  .poe-interface {
    display: flex;
    align-items: flex-end;
    gap: 15px;
    padding: 10px;
    background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%);
    border-radius: 50px 50px 0 0;
    width: 600px;
    justify-content: space-between;
  }

  .orb {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 2px solid #444;
    position: relative;
    overflow: hidden;
    background: #111;
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
  }
  .hp-orb .liquid {
    background: linear-gradient(0deg, #600 0%, #f00 100%);
    box-shadow: 0 0 20px rgba(255,0,0,0.5);
  }
  .mp-orb .liquid {
    background: linear-gradient(0deg, #006 0%, #00f 100%);
    box-shadow: 0 0 20px rgba(0,0,255,0.5);
  }
  .liquid {
    position: absolute;
    bottom: 0; left: 0; width: 100%;
    transition: height 0.5s ease-out;
  }
  .orb-glass {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%);
    pointer-events: none;
  }
  .orb-value {
    position: absolute;
    width: 100%; text-align: center; top: 50%; transform: translateY(-50%);
    font-weight: bold; font-size: 0.9rem; text-shadow: 1px 1px 3px #000; z-index: 2;
  }

  /* Action Bar Styles */
  .action-bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .controls-row { display: flex; align-items: center; gap: 15px; }
  .flasks-row { display: flex; gap: 8px; }
  .flask-slot {
    width: 34px; height: 50px;
    border: 1px solid #aaa; /* 提高邊框亮度 */
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.8);
  }
  .flask-fill { 
    position: absolute; bottom: 0; left: 0; width: 100%; 
    transition: height 0.3s ease-out;
    z-index: 1;
  }
  .hp-flask .flask-fill { background: linear-gradient(0deg, #800 0%, #ff1111 100%); }
  .mp-flask .flask-fill { background: linear-gradient(0deg, #008 0%, #1111ff 100%); }
  .flask-charges { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; text-shadow: 1px 1px 2px #000; font-size: 0.8rem; z-index: 2; }
  .flask-key { position: absolute; bottom: 2px; right: 3px; font-size: 0.6rem; color: #ccc; z-index: 2; }

  .skill-slots { display: flex; gap: 6px; }
  .skill-slot {
    width: 50px; height: 50px; border: 1px solid #fff;
    background: rgba(255,255,255,0.05); position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .skill-slot.active { border-color: #fff; box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.3); }
  
  /* 使用中技能的高亮樣式 */
  .skill-slot.using { 
    border-color: #f1c40f; 
    box-shadow: 0 0 15px #f1c40f, inset 0 0 10px rgba(241, 196, 15, 0.5);
    background: rgba(241, 196, 15, 0.2);
  }

  .skill-slot .key { position: absolute; top: 2px; left: 3px; font-size: 0.6rem; color: #f1c40f; font-weight: bold; }
  .skill-slot .slot-index { position: absolute; top: 2px; right: 3px; font-size: 0.5rem; color: #888; }
  .skill-slot .label { font-size: 1.2rem; color: #fff; margin-top: 5px; }

  /* ATB滿且未設定技能時的白色閃爍方框 */
  .skill-slot.prompt-white {
    border: 2px solid #fff !important;
    animation: white-flash-box 1s infinite ease-in-out !important;
    z-index: 10;
    background: rgba(255, 255, 255, 0.05) !important;
  }

  /* ATB滿且已設定技能時的黃色閃爍方框 */
  .skill-slot.prompt-yellow {
    border: 2px solid #e0ce86 !important;
    animation: yellow-flash-box 0.5s infinite ease-in-out !important;
    z-index: 10;
    background: rgba(241, 196, 15, 0.1) !important;
  }

  @keyframes white-flash-box {
    0%, 100% { border-color: #fff; box-shadow: 0 0 12px rgba(255, 255, 255, 0.4); }
    50% { border-color: #666; box-shadow: 0 0 2px transparent; }
  }

  @keyframes yellow-flash-box {
    0%, 100% { border-color: #f1c40f; box-shadow: 0 0 12px rgba(241, 196, 15, 0.5), inset 0 0 5px rgba(241, 196, 15, 0.3); }
    50% { border-color: #8a6d3b; box-shadow: 0 0 2px transparent; }
  }

  /* MP 不足的禁用特效 */
  .skill-slot.insufficient-mp {
    filter: grayscale(0.8) brightness(0.4);
    position: relative;
  }
  .skill-slot.insufficient-mp::before {
    content: "✕";
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255, 0, 0, 0.5);
    font-size: 2rem;
    z-index: 5;
    pointer-events: none;
  }

  .skill-tooltip {
    position: fixed;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid #f1c40f;
    padding: 10px;
    pointer-events: none;
    width: 180px;
    box-shadow: 0 0 10px rgba(0,0,0,0.8);
    transform: translate(15px, 15px);
  }
  .tooltip-header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 5px; }
  .tooltip-name { color: #f1c40f; font-weight: bold; font-size: 0.8rem; text-align: left; }
  .tooltip-icon { font-size: 1.2rem; }
  .tooltip-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 5px; }
  .tooltip-stat { font-size: 0.7rem; color: #ccc; text-align: left; }
  .mp-val { color: #3498db; font-weight: bold; }
  .stat-val { color: #fff; font-weight: bold; }
  .tooltip-desc { font-size: 0.65rem; color: #aaa; margin: 5px 0 0 0; line-height: 1.3; text-align: left; }

  .exp-bar-container {
    width: 300px; height: 4px; background: #222; border: 1px solid #444;
    margin-top: 5px;
  }
  .exp-fill { height: 100%; background: #3498db; transition: width 0.3s; }

  .atb-minimal {
    width: 300px; height: 2px; background: rgba(0,0,0,0.5); margin-top: -2px;
  }
  .atb-minimal .atb-fill { height: 100%; background: #fff; transition: width 0.1s; }

  .sprite-damage {
    left: 50%;
    top: -20px;
    font-size: 2.2rem;
    text-shadow: 2px 2px 4px #000;
    z-index: 20;
    white-space: nowrap;
  }

  /* 怪物血條與名稱整合樣式 */
  .bar-container.hp-main { 
    width: 110px; 
    flex-shrink: 0;
    height: 20px; /* 增加高度以容納文字 */
    background: #1a1a1a; 
    border: 1px solid var(--tier-color, #444); /* 使用階級顏色作為邊框 */
    margin: 2px auto; 
    border-radius: 2px; 
    overflow: hidden; 
    position: relative; /* 允許內部元素絕對定位 */
    display: flex; /* 用於置中文本 */
    align-items: center;
    justify-content: center;
  }
  .hp-fill { 
    position: absolute; /* 讓血條填充作為背景層 */
    top: 0; left: 0; 
    height: 100%; 
    background: linear-gradient(to bottom, #e22, #800); /* 垂直漸層增加質感 */
    transition: width 0.3s; 
    box-shadow: inset 0 0 5px rgba(0,0,0,0.5); 
    z-index: 1; /* 確保在文字下方 */
  }
  .hp-text-overlay { /* 包含名稱和血量的疊加層 */
    position: relative; /* 確保在血條填充上方 */
    z-index: 2;
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; padding: 0 5px; box-sizing: border-box;
    font-weight: bold; 
    color: #fff;
    font-size: 0.75rem;
    text-shadow: 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000; /* 四向陰影確保清晰度 */
  }
  .name-base { 
    color: #fff; /* 名稱改為白色，不再與紅色血條衝突 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 65%;
    font-size: 0.7rem; /* 調整字體大小以適應 */
  }
  .hp-text { font-size: 0.6rem; opacity: 0.9; color: #fff; } /* 確保血量數值為白色 */

  .letter.correct { color: #fff; text-shadow: 0 0 5px #fff; }

  .monster-sprite { position: relative; display: inline-block; margin-top: 0px; margin-bottom: 5px; } /* 調整怪物圖示位置 */
  .monster-icon { 
    font-size: 3rem; 
    filter: drop-shadow(0 0 5px var(--tier-color, transparent)); 
    transition: transform 0.2s; 
  }
  
  .atb-fill, .mp-fill { height: 100%; background: #fff; transition: width 0.3s; }

  /* 傷害數值彈出樣式 */
  .damage-pop {
    color: #ff4444;
    font-weight: bold;
    margin-left: 5px;
    position: absolute;
    animation: damage-float 1s forwards;
    pointer-events: none;
  }
  .heal-pop { color: #00ff00 !important; }
  .mp-pop { 
    color: #3498db !important; 
    margin-left: 45px !important; /* 增加偏移量，避免與 HP 回復數值重疊 */
  }

  /* 連擊數顯示樣式 */
  .combo-display {
    position: absolute;
    left: 20px; /* 修正：將座標移回畫布內，避免被 overflow: hidden 剪裁 */
    top: 0px; /* 往下移動，避免擋到怪物資訊 */
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* 向玩家方向對齊 */
    font-style: italic; /* 傾斜字體 */
    transform: skewX(-15deg); /* 模擬格鬥遊戲標題斜度 */
    z-index: 50;
    white-space: nowrap; /* 防止文字換行 */
    pointer-events: none;
    animation: combo-sf-in 0.15s ease-out forwards;
  }

  .combo-number {
    font-size: 4.5rem;
    line-height: 0.8;
    color: #ffcc00;
    font-weight: 900;
    text-shadow: 4px 4px 0px #800000, 6px 6px 10px rgba(0,0,0,0.5);
  }

  .combo-text {
    font-size: 1.2rem;
    color: #fff;
    font-weight: bold;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0px #000;
  }

  .wpm-text {
    font-size: 1rem;
    color: #3498db;
    font-weight: bold;
    margin-top: 5px;
    text-shadow: 2px 2px 0px #000;
  }

  @keyframes combo-sf-in {
    0% { transform: translateX(-50px) skewX(-15deg) scale(1.5); opacity: 0; }
    100% { transform: translateX(0) skewX(-15deg) scale(1); opacity: 1; }
  }

  @keyframes shake {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(2px, 0); }
    75% { transform: translate(-2px, 0); }
  }
  @keyframes damage-float {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
  }
  @keyframes flash {
    0%, 100% { filter: invert(0); }
    50% { filter: invert(1); }
  }
  @keyframes lunge {
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(50px) scale(1.2); }
  }
  @keyframes target-flash {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.1); filter: brightness(3); }
  }
</style>