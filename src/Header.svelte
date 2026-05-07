<script>
  export let t;
  export let currentLanguage;
  export let showLog;
  export let showSkillsWindow;
  export let showInventoryWindow;
  export let hotkeys = {};
  export let onToggleLog;
  export let onToggleSkills;
  export let onToggleInventory;
  export let onToggleHelp;
  export let onSetLanguage;
  export let currentTheme;
  export let onSetTheme;

  let showLangMenu = false;
  let showThemeMenu = false;
</script>

<header class="game-header">
  <div class="game-title">Path of Typing</div>

  <div class="header-controls">
    <button on:click={onToggleLog} class:active={showLog}>{t('log')} ({hotkeys.toggleLog})</button>
    <button on:click={onToggleSkills} class:active={showSkillsWindow}>{t('skills')} ({hotkeys.toggleSkills})</button>
    <button on:click={onToggleInventory} class:active={showInventoryWindow}>{t('inventory')} ({hotkeys.toggleInventory || 'I'})</button>
    <button on:click={onToggleHelp} title={t('helpTitle')}>?</button>
    <div class="divider"></div>
    <div class="theme-select-container">
      <button class="theme-main-btn" on:click={() => { showThemeMenu = !showThemeMenu; showLangMenu = false; }}>
        {t('theme')}
      </button>
      {#if showThemeMenu}
        <div class="theme-menu">
          <button on:click={() => { onSetTheme('default'); showThemeMenu = false; }}>{t('themeDefault')}</button>
          <button on:click={() => { onSetTheme('minimal-black'); showThemeMenu = false; }}>{t('themeMinimalBlack')}</button>
        </div>
      {/if}
    </div>
    <div class="lang-select-container">
      <button class="lang-main-btn" on:click={() => { showLangMenu = !showLangMenu; showThemeMenu = false; }}>
        {currentLanguage === 'zh' ? '中文' : 'EN'}
      </button>
      {#if showLangMenu}
        <div class="lang-menu">
          <button on:click={() => { onSetLanguage('en'); showLangMenu = false; }}>EN</button>
          <button on:click={() => { onSetLanguage('zh'); showLangMenu = false; }}>中文</button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    width: 100%;
    box-sizing: border-box;
    z-index: 10;
  }

  .game-title {
    font-size: 0.9rem;
    font-weight: bold;
    flex: 1;
  }

  .header-controls {
    display: flex;
    gap: 10px;
    flex: 1;
    justify-content: flex-end;
  }

  .header-controls button {
    background: var(--color-bg); color: var(--color-text); border: 1px solid var(--color-border); padding: 3px 8px;
    cursor: pointer; font-family: inherit;
    font-size: 0.7rem;
    transition: all 0.2s;
  }
  .header-controls button.active { background: var(--color-text); color: var(--color-bg); }
  
  .divider { width: 1px; height: 15px; background: #444; margin: 0 5px; align-self: center; }

  .theme-select-container, .lang-select-container {
    position: relative;
    display: inline-block;
  }
  .theme-menu, .lang-menu {
    position: absolute;
    top: calc(100% + 5px);
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    min-width: 100%;
  }
  .theme-menu button, .lang-menu button { border: none; width: 100%; padding: 5px 10px; white-space: nowrap; }
  .theme-menu button:hover, .lang-menu button:hover { background: var(--color-text); color: var(--color-bg); }
</style>