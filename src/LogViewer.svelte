<script>
  import { afterUpdate } from 'svelte';
  export let logHistory;
  export let gameState;
  export let t;
  export let onClear;
  export let onToggleLog;
  export let hotkeys = {};

  let logContainer;

  afterUpdate(() => {
    if (gameState !== 'PAUSED' && logContainer) logContainer.scrollTop = logContainer.scrollHeight;
  });
</script>

<div class="log-sidebar">
  <div class="sidebar-header">
    {t('logHeader')}
    <button class="header-action-btn" on:click={onClear} title={t('clear')}>{t('clear')}</button>
    <button class="close-x-btn" on:click={onToggleLog} title="Close [{hotkeys.toggleLog || '0'}]">×</button>
  </div>

  <div class="log-scroll" bind:this={logContainer}>
    {#each logHistory as log, i}
      <div class="log-entry" class:latest={i === logHistory.length - 1}>
        {#each log.segments as seg}
          <span class={seg.type}>{seg.text}</span>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .log-sidebar {
    width: 250px;
    height: 750px;
    background: rgba(255, 255, 255, 0.02);
    padding: 15px;
    border: 1px solid #fff;
    display: flex;
    flex-direction: column;
    gap: 15px;
    box-sizing: border-box;
    overflow: hidden;
  }

  .sidebar-header { 
    font-size: 0.9rem; font-weight: bold; border-bottom: 1px solid #fff; 
    padding-bottom: 5px; color: #f1c40f; text-align: center; 
    display: flex; justify-content: center; align-items: center; position: relative;
  }

  .header-action-btn {
    position: absolute; left: 0; top: 0; background: none; border: none;
    color: #888; font-size: 0.6rem; cursor: pointer; height: 100%;
    padding: 0 5px; font-family: inherit;
  }
  .header-action-btn:hover { color: #f1c40f; }

  .close-x-btn {
    position: absolute; right: 0; top: -5px; background: none; border: none;
    color: #fff; font-size: 1.5rem; cursor: pointer; line-height: 1;
    padding: 0 5px;
  }
  .close-x-btn:hover { color: #f1c40f; }

  .log-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 5px;
  }

  /* Style unification with SkillSidebar scrollbar */
  .log-scroll::-webkit-scrollbar { width: 4px; }
  .log-scroll::-webkit-scrollbar-thumb { background: #444; }

  .log-entry { 
    font-size: 0.75rem;
    line-height: 1.4; 
    word-break: break-all;
  }

  .log-entry span.system { color: #555; font-style: italic; } /* 非即時訊息灰色，亮度再降低 */
  .log-entry span.normal { color: #fff; }                   /* 一般戰鬥訊息白色 */
  
  .log-entry span.white  { color: #fff; font-weight: bold; }
  .log-entry span.magic  { color: #3498db; font-weight: bold; }
  .log-entry span.rare   { color: #f1c40f; font-weight: bold; }
  .log-entry span.unique { color: #d35400; font-weight: bold; }

  .log-entry.latest { 
    filter: brightness(1.3);
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  }
</style>