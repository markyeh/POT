<script>
  export let t;
  export let player;
  export let hotkeys = {};
  export let onToggleInventory;
  export let gameScore;

  // 模擬 16x16 的物品欄資料
  const inventorySlots = Array(256).fill(null);
  // 模擬 3x3 裝備欄 (PoE 風格：頭、身、手、足、武器、盾、戒*2、頸)
  const equipSlots = [
    { id: 'head', icon: '🪖' }, { id: 'neck', icon: '📿' }, { id: 'body', icon: '👕' },
    { id: 'weapon', icon: '🗡️' }, { id: 'offhand', icon: '🛡️' }, { id: 'gloves', icon: '🧤' },
    { id: 'ring1', icon: '💍' }, { id: 'ring2', icon: '💍' }, { id: 'boots', icon: '🥾' }
  ];

  let currentStashTab = 0;
  // 模擬 10 個倉庫分頁，每個分頁 16x16 (256 slots)
  const stashTabs = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    name: `Tab ${i + 1}`,
    slots: Array(256).fill(null)
  }));
</script>

<div class="inventory-sidebar">
  <div class="sidebar-header">
    {t('inventoryHeader')}
    <button class="close-x-btn" on:click={onToggleInventory} title="Close [{hotkeys.toggleInventory || 'I'}]">×</button>
  </div>

  <div class="top-section">
    <div class="equipment-grid">
      {#each equipSlots as slot}
        <div class="equip-box" title={slot.id}>
          <span class="equip-icon">{slot.icon}</span>
        </div>
      {/each}
    </div>
    <div class="stats-area">
      <div class="section-title">{t('stats')}</div>
      <div class="stat-line"><span>{t('hp')}:</span> {player.hp}/{player.maxHp}</div>
      <div class="stat-line"><span>{t('mp')}:</span> {player.mp}/{player.maxMp}</div>
      <div class="stat-line"><span>SPD:</span> {player.speed}</div>
      <div class="stat-line"><span>MAP:</span> {gameScore}%</div>
    </div>
  </div>

  <div class="inventory-section">
    <div class="section-title">{t('inventoryHeader')} (16x16)</div>
    <div class="inventory-grid">
      {#each inventorySlots as _, i}
        <div class="inv-slot" title="Slot {i + 1}"></div>
      {/each}
    </div>
  </div>

  <div class="stash-section">
    <div class="section-title stash-header">
      <span>STASH</span>
      <select bind:value={currentStashTab} class="stash-select">
        {#each stashTabs as tab}
          <option value={tab.id}>{tab.name}</option>
        {/each}
      </select>
    </div>
    <div class="inventory-grid">
      {#each stashTabs[currentStashTab].slots as _, i}
        <div class="inv-slot" title="Stash Slot {i + 1}"></div>
      {/each}
    </div>
  </div>
</div>

<style>
  .inventory-sidebar {
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
  .close-x-btn {
    position: absolute; right: 0; top: -5px; background: none; border: none;
    color: #fff; font-size: 1.5rem; cursor: pointer; line-height: 1;
  }
  .close-x-btn:hover { color: #f1c40f; }

  .top-section { display: flex; gap: 10px; height: 160px; }
  .equipment-grid { 
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; 
    width: 130px; 
  }
  .equip-box { 
    background: #111; border: 1px solid #333; display: flex; 
    align-items: center; justify-content: center; font-size: 1.1rem;
  }

  .stats-area { flex: 1; font-size: 0.7rem; color: #aaa; }
  .stat-line { margin-bottom: 4px; display: flex; justify-content: space-between; }
  .stat-line span { color: #f1c40f; }

  .section-title { font-size: 0.65rem; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }

  .inventory-section, .stash-section { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    min-height: 0; 
  }

  .stash-header { display: flex; justify-content: space-between; align-items: center; }
  .stash-select { 
    background: #111; color: #f1c40f; border: 1px solid #333; 
    font-size: 0.6rem; padding: 0 2px; height: 16px; outline: none;
  }

  .inventory-grid { 
    display: grid; 
    grid-template-columns: repeat(16, 1fr); 
    gap: 1px; 
    background: #222; 
    border: 1px solid #444;
    padding: 2px;
    overflow-y: auto;
  }
  .inv-slot { 
    aspect-ratio: 1; 
    background: #0a0a0a; 
    border: 1px solid #1a1a1a; 
  }
  .inv-slot:hover { border-color: #555; background: #151515; }

  /* 滾動條樣式統一 */
  .inventory-grid::-webkit-scrollbar { width: 4px; }
  .inventory-grid::-webkit-scrollbar-thumb { background: #444; }
  
  kbd { font-size: 0.6rem; padding: 1px 4px; }
</style>