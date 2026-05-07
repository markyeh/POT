<script>
  import { afterUpdate } from 'svelte';
  export let logHistory;
  export let gameState;
  export let onClear;

  let logContainer;

  afterUpdate(() => {
    if (gameState !== 'PAUSED' && logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });
</script>

<div class="message-log" bind:this={logContainer}>
  <button class="clear-log-btn" on:click={onClear}>CLEAR LOG</button>
  {#each logHistory as log, i}
    <div class="log-entry" class:latest={i === logHistory.length - 1}>
      {#each log.segments as seg}
        <span class={seg.type}>{seg.text}</span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .message-log {
    width: 250px;
    height: 750px; /* 統一高度為 750px */
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
    top: -15px;
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

  .log-entry { 
    line-height: 1.4; 
    word-break: break-all;
  }

  /* 內部片段顏色定義 */
  .log-entry span.system { color: #555; font-style: italic; } /* 非即時訊息灰色，亮度再降低 */
  .log-entry span.normal { color: #fff; }                   /* 一般戰鬥訊息白色 */
  
  /* 怪物階級顏色 */
  .log-entry span.white  { color: #fff; font-weight: bold; }
  .log-entry span.magic  { color: #3498db; font-weight: bold; }
  .log-entry span.rare   { color: #f1c40f; font-weight: bold; }
  .log-entry span.unique { color: #9b59b6; font-weight: bold; }

  .log-entry.latest { 
    filter: brightness(1.3);
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
  }
</style>