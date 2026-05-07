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
  export let wordsPerLine = 8;
  export let linesToDisplay = 2;
  export let comboCount;

  let inputEl;

  // 當進入 BURST 模式或更新時，強制聚焦輸入框
  afterUpdate(() => {
    if (gameState === 'BURST' && inputEl && document.activeElement !== inputEl) {
      inputEl.focus();
    }
  });
</script>

<div class="ui-panel">
  <!-- Stage Progress Bar 移至頂層，確保永遠顯示 -->
  <div class="progress-section">
    <div class="progress-text">STAGE PROGRESS: {gameScore}%</div>
    <div class="progress-bar-container">
      <div class="progress-fill" style="width: {gameScore}%"></div>
      {#if gameScore >= 100}
        <div class="boss-ready">BOSS READY</div>
      {/if}
    </div>
  </div>

  <div class="input-area">
    {#if gameState === 'BURST'}
      <div class="burst-container">
        <!-- Burst Mode Timer Bar -->
        <div class="timer-bar" style="width: {(burstTimeLeft/burstMaxTime)*100}%"></div>
        <div class="timer-text">
          {(burstTimeLeft / 1000).toFixed(1)}s
          {#if burstBonusText}
            <span class="bonus-hint">{burstBonusText}</span>
          {/if}
        </div>
        <div class="word-display-container" style="--lines-to-display: {linesToDisplay}; --line-height-val: 1.3em; --row-gap: 0.3em;">
          <div class="word-lines" style="transform: translateY(calc(-1 * (var(--line-height-val) + var(--row-gap)) * {Math.floor(currentWordIndex / wordsPerLine)}))">
            {#each currentBurstWords as word, i (i)}
              <span class="word-item" 
                class:typed={i < currentWordIndex}
                class:current={i === currentWordIndex}
                class:pending={i > currentWordIndex}
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
                {#if i < currentBurstWords.length - 1 && (i + 1) % wordsPerLine !== 0}
                  <span class="word-space"> </span>
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
    height: 180px; /* 面板本身也稍微加高，確保空間充裕 */
    display: flex; 
    flex-direction: column;
    flex-shrink: 0;
    padding: 10px 20px; gap: 10px; background: rgba(255,255,255,0.05); box-sizing: border-box;
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
  .timer-bar { height: 4px; background: #fff; margin: 0 0 5px 0; transition: width 0.1s linear; }
  .timer-text { font-size: 0.9rem; color: #fff; margin-bottom: 2px; font-weight: bold; }
  .bonus-hint { color: #f1c40f; margin-left: 8px; animation: floatUp 0.8s ease-out forwards; position: absolute; }
  @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }

  .progress-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 8px;
  }
  .progress-text {
    font-size: 0.6rem;
    color: #888;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }
  .progress-bar-container {
    width: 100%;
    height: 4px;
    background: #222;
    border: 1px solid #444;
    position: relative;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3498db, #f1c40f);
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .boss-ready {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(155, 89, 182, 0.8);
    color: #fff;
    font-size: 0.5rem;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold;
    animation: blink 0.8s infinite;
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
    height: calc((var(--line-height-val) * var(--lines-to-display)) + (var(--row-gap) * (var(--lines-to-display) - 1)) + 4px);
    overflow: hidden;
    font-size: 1.5rem;
    line-height: var(--line-height-val);
    margin-top: 10px;
    background: rgba(0,0,0,0.3);
    padding: 2px 15px;
    border-radius: 4px;
    box-sizing: border-box;
  }
  .word-lines {
    transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    display: flex;
    flex-wrap: wrap;
    gap: var(--row-gap) 0.6em;
    will-change: transform;
  }
  .word-item { 
    color: #666; 
    display: inline-flex;
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