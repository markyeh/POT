<script>
  export let gameState;
  export let t;
  export let onTogglePause;
  export let onRestart;
  export let showLog;
  export let showHelp;
  export let onToggleLog;
  export let onToggleHelp;
  export let finalResults = { time: 0, wpm: 0 };
  export let hotkeys = {};
</script>

{#if gameState === 'PAUSED' || gameState === 'GAME_OVER' || gameState === 'VICTORY'}
  <div class="modal-overlay">
    <div class="modal-content">
      {#if gameState === 'GAME_OVER'}
        <h1 style="color: #fff;">{t('playerDefeated')}</h1>
      {:else if gameState === 'VICTORY'}
        <h1 class="victory-title">{t('victory')}</h1>
        <div class="stats-container">
          <p><span>{t('clearTime')}:</span> {finalResults.time.toFixed(1)}{t('seconds')}</p>
          <p><span>{t('avgWpm')}:</span> {finalResults.wpm}</p>
        </div>
      {:else}
        <h1>{t('gamePaused')}</h1>
        <button on:click={onTogglePause}>{t('continueGame')}</button>
        
        <div class="menu-options">
          <button class="toggle-btn" on:click={onToggleLog}>
            {showLog ? 'CLOSE LOG' : 'OPEN LOG'} ({hotkeys.toggleLog || '0'})
          </button>
          <button class="toggle-btn" on:click={onToggleHelp}>
            {showHelp ? 'HIDE HELP' : 'SHOW HELP'} ({hotkeys.toggleHelp || '?'})
          </button>
        </div>
      {/if}
      <button on:click={onRestart}>{t('restartGame')}</button>

      {#if showHelp && gameState === 'PAUSED'}
        <div class="embedded-help">
          <h3>{t('helpTitle')}</h3>
          <div class="help-grid">
            <p>{t('helpTarget')}</p>
            <p>{t('helpAttack')}</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex; justify-content: center; align-items: center;
    z-index: 1000;
  }
  .modal-content {
    text-align: center; background: #000; padding: 40px; border: 1px solid #fff;
  }
  .modal-content button {
    display: block; width: 220px; margin: 15px auto; padding: 12px;
    background: #000; color: #fff; border: 1px solid #fff;
    font-family: inherit; cursor: pointer; font-size: 1rem;
  }
  .modal-content button:hover { background: #fff; color: #000; }

  .victory-title {
    color: #f1c40f;
    text-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
    font-size: 2.5rem;
    margin-bottom: 20px;
  }
  .stats-container {
    margin: 20px 0;
    color: #fff;
    font-size: 1.2rem;
  }
  .stats-container span { color: #aaa; margin-right: 10px; }

  .menu-options {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
  }
  .toggle-btn {
    margin: 0 !important;
    width: 140px !important;
    font-size: 0.8rem !important;
    padding: 8px !important;
  }

  .embedded-help {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #555;
    text-align: left;
  }
  .embedded-help h3 { font-size: 0.9rem; text-align: center; color: #aaa; }
  .help-grid { font-size: 0.75rem; color: #888; display: grid; grid-template-columns: 1fr; gap: 5px; }
  .help-grid p { margin: 0; }
</style>