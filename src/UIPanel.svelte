<script>
  import { onMount, afterUpdate } from 'svelte';
  export let gameState;
  export let t;
  export let burstTimeLeft;
  export let burstMaxTime;
  export let burstBonusText; // 接收獎勵文字
  export let gameScore; // 接收地圖進度
  
  // Monkeytype 相關 props
  export let currentBurstWords = [];
  export let currentWordInput = "";
  export let currentWordIndex = 0;
  export let visibleWordsStartIndex = 0;
  export let wordsPerLine = 8; // 確保預設值
  export let linesToDisplay = 3; // 確保預設值為 3 行
  export let comboCount;

  let inputEl;
  let wordElements = []; // 用於儲存所有單字元素的引用

  // 滾動偏移計算
  $: scrollY = wordElements[currentWordIndex] ? wordElements[currentWordIndex].offsetTop : 0;
  
  afterUpdate(() => { if (gameState === 'BURST' && inputEl) inputEl.focus(); });
</script>

<div class="ui-panel">
  <!-- Stage Progress Bar 移至頂層，確保永遠顯示 -->
  <div class="progress-section">
    <div class="bar-container progress-main">
      <div class="progress-fill" style="width: {gameScore}%"></div>
      <div class="bar-text-overlay">
        <span>STAGE PROGRESS</span>
        <span>{gameScore}%</span>
      </div>
      {#if gameScore >= 100}
        <div class="boss-ready">BOSS READY</div>
      {/if}
    </div>
  </div>

  <div class="input-area">
    {#if gameState === 'BURST'}
      <div class="burst-container">
        <div class="bar-container timer-main">
          <div class="timer-fill" style="width: {(burstTimeLeft/burstMaxTime)*100}%"></div>
          <div class="bar-text-overlay">
            <span>BURST MODE</span>
            <span>
              {(burstTimeLeft / 1000).toFixed(1)}s
              {#if burstBonusText}
                <span class="bonus-hint">{burstBonusText}</span>
              {/if}
            </span>
          </div>
        </div>
        <div class="word-display-container" style="--lines-to-display: {linesToDisplay}; --line-height-val: 1.3em; --row-gap: 0.3em; --words-per-line: {wordsPerLine};">
          <div class="word-lines" style="transform: translateY(-{scrollY}px)">
            {#each currentBurstWords as word, i (i)}
              <span class="word-item" 
                class:typed={i < currentWordIndex}
                class:current={i === currentWordIndex}
                class:pending={i > currentWordIndex}
                bind:this={wordElements[i]}
              >
                {#if i === currentWordIndex}
                  {#each word.split('') as char, charIndex (charIndex)}
                    {#if charIndex === currentWordInput.length}
                      <span class="caret">|</span>
                    {/if}<span class="letter" 
                      class:correct={currentWordInput[charIndex]?.toLowerCase() === char} 
                      class:incorrect={currentWordInput[charIndex] !== undefined && currentWordInput[charIndex]?.toLowerCase() !== char} 
                      class:pending={currentWordInput[charIndex] === undefined}>{char}</span>{/each}
                  {#if currentWordInput.length >= word.length}
                    <span class="caret">|</span>
                  {/if}
                {:else}
                  {word}
                {/if}
              </span>
            {/each}
          </div>
          <input 
            type="text" 
            class="hidden-input" 
            bind:this={inputEl}
            bind:value={currentWordInput} 
            autocomplete="off" 
            spellcheck="false" 
            maxlength={currentBurstWords[currentWordIndex]?.length || 0}
            disabled={gameState !== 'BURST'}
            on:keydown={(e) => { if(e.key === ' ') e.preventDefault(); }}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .ui-panel {
    height: 150px; /* 縮減面板高度，為 BattleScene 騰出空間 */
    display: flex; 
    flex-direction: column;
    flex-shrink: 0;
    padding: 10px 20px; gap: 10px; background: var(--color-bg-soft); box-sizing: border-box;
  }
  .input-area {
    flex: 1; 
    display: flex; 
    justify-content: center; 
    align-items: center; /* 在空間足夠後，恢復置中對齊會比較美觀 */
  }
  .targeting-status { font-size: 1.2rem; color: #fff; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

  .burst-container { text-align: center; width: 100%; }

  .progress-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 5px; /* 縮減間距 */
    width: 100%;
  }

  /* 統一進度條容器樣式 (參考 HP Bar) */
  .bar-container {
    width: 100%; height: 20px; background: var(--color-bg-soft); border: 1px solid var(--color-border);
    border-radius: 2px; overflow: hidden; position: relative;
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 1px 3px var(--ui-shadow);
  }

  .bar-text-overlay {
    position: relative; z-index: 2; display: flex; justify-content: space-between;
    align-items: center; width: 100%; padding: 0 10px; box-sizing: border-box;
    font-weight: bold; color: #fff; font-size: 0.75rem;
    text-shadow: var(--text-shadow, 1px 1px 1px #000);
  }

  .progress-fill {
    position: absolute; top: 0; left: 0; height: 100%;
    background: linear-gradient(90deg, #1e3a8a, #3498db, #f1c40f);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
  }

  .timer-fill {
    position: absolute; top: 0; left: 0; height: 100%;
    background: rgba(255, 255, 255, 0.3); /* 半透明白色，不影響文字閱讀 */
    transition: width 0.1s linear;
    z-index: 1;
  }

  .bonus-hint { 
    color: #f1c40f; margin-left: 8px; 
    animation: floatUp 0.8s ease-out forwards; 
    position: absolute; white-space: nowrap;
    right: 50px;
  }
  @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }

  .boss-ready {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(155, 89, 182, 0.8);
    color: #fff;
    font-size: 0.7rem;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
    animation: blink 0.8s infinite;
    z-index: 3;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .burst-word .word-display { font-size: 1.6rem; font-weight: bold; }
  .letter.correct { color: #fff; }
  .letter.incorrect { color: #ff4d4d; font-weight: 900; }
  .letter.pending { color: #666; }
  .combo { font-size: 1rem; color: #fff; }

  .word-display-container {
    position: relative;
    height: calc((var(--line-height-val) * var(--lines-to-display)) + (var(--row-gap) * (var(--lines-to-display) - 1)) + 10px);
    overflow: hidden;
    font-size: 1.3rem; /* 稍微縮小字體確保 8 個單字能在一行內排版，避免因自動換行導致捲動偏移 */
    line-height: var(--line-height-val);
    margin-top: 5px; /* 縮減間距 */
    background: rgba(0,0,0,0.3);
    padding: 2px 15px;
    border-radius: 4px;
    box-sizing: border-box;
  }
  .word-lines {
    transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    flex-wrap: wrap;
    gap: var(--row-gap) 0.6em; /* 使用字距間隙，符合 Monkeytype 習慣 */
    width: 100%;
    will-change: transform;
  }
  .word-item { 
    width: auto; /* 恢復自然寬度 */
    box-sizing: border-box;
    text-align: left;
    white-space: nowrap;
    line-height: var(--line-height-val);
    color: #666; 
    display: flex;
    align-items: center;
  }
  .word-item.typed { color: #fff; }
  .word-item.current { color: #fff; }
  .word-item.pending { color: #666; }

  .caret {
    color: #f1c40f;
    display: inline-block;
    width: 0;
    overflow: visible;
    position: relative;
    left: -1px;
    font-weight: normal;
    animation: caretBlink 1s infinite;
    pointer-events: none;
  }

  @keyframes caretBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  .hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 0;
    left: 0;
  }
</style>