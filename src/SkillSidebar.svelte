<script>
  export let skillDb;
  export let equippedSkills;
  export let onDropSkill;
  export let onRemoveSkill;
  export let onToggleSkills; // 用於關閉視窗
  export let lastClickedSkillSlotKey; // 接收最後點擊的技能欄位
  export let onSelectSlot; // 用於切換選中的欄位
  export let currentLanguage;
  export let skillSlots = ['Q', 'W', 'E', 'R', 'T']; // 改為由 prop 傳入
  export let hotkeys = {};

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

<div class="skill-sidebar">
  <div class="sidebar-header">
    SKILLS REPOSITORY
    <button class="close-x-btn" on:click={onToggleSkills} title="Close [{hotkeys.toggleSkills || '9'}]">×</button>
  </div>
  
  <div class="equipped-section">
    <div class="section-title">CURRENT LOADOUT</div>
    <div class="loadout-grid">
      {#each skillSlots as key, i}
        <div class="loadout-slot" 
          on:dragover|preventDefault
          on:drop={(e) => {
            const skillData = JSON.parse(e.dataTransfer.getData('skill'));
            onDropSkill(key, skillData);
          }}
          on:click={() => onSelectSlot(key)}
          class:target-slot={lastClickedSkillSlotKey === key}
          on:contextmenu|preventDefault={() => onRemoveSkill(key)}
          on:mouseenter={(e) => showTooltip(equippedSkills[key], e)}
          on:mousemove={moveTooltip}
          on:mouseleave={hideTooltip}
        >
          <div class="slot-info">
            <span class="slot-key">{key}</span>
            <span class="slot-label">S{i+1}</span>
          </div>
          <div class="slot-box" class:has-skill={!!equippedSkills[key]}>
            {equippedSkills[key] ? equippedSkills[key].icon : '---'}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="repo-section">
    <div class="section-title">AVAILABLE SKILLS</div>
    <div class="repo-scroll">
      {#if skillDb}
        {#each Object.entries(skillDb.skills) as [catId, list]}
          <div class="category-group">
            <div class="category-name">{catId.toUpperCase()}</div>
            <div class="skill-grid">
              {#each list as skill}
                <div 
                  class="skill-item" 
                  draggable="true"
                  on:dragstart={(e) => {
                    e.dataTransfer.setData('skill', JSON.stringify(skill));
                  }}
                  on:click={() => {
                    if (lastClickedSkillSlotKey) {
                      onDropSkill(lastClickedSkillSlotKey, skill);
                    }
                  }}
                  on:mouseenter={(e) => showTooltip(skill, e)}
                  on:mousemove={moveTooltip}
                  on:mouseleave={hideTooltip}
                >
                  <span class="skill-icon">{skill.icon}</span>
                  <span class="skill-name">{skill[currentLanguage === 'zh' ? 'zh' : 'en'] || skill.en}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
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
  .skill-sidebar {
    width: 250px;
    height: 750px;
    background: rgba(255, 255, 255, 0.02);
    padding: 15px;
    border: 1px solid #fff;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    overflow: hidden; /* 確保內容不會溢出邊框 */
  }
  .sidebar-header { 
    font-size: 0.9rem; font-weight: bold; border-bottom: 1px solid #fff; 
    padding-bottom: 5px; color: #f1c40f; text-align: center; 
    display: flex; justify-content: center; align-items: center; position: relative;
  }
  .close-x-btn {
    position: absolute; right: 0; top: -5px; background: none; border: none;
    color: #fff; font-size: 1.5rem; cursor: pointer; line-height: 1;
    padding: 0 5px;
  }
  .close-x-btn:hover { color: #f1c40f; }

  .section-title { font-size: 0.7rem; color: #888; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  
  .loadout-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .loadout-slot { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
  .slot-info { display: flex; justify-content: space-between; width: 100%; font-size: 0.5rem; color: #f1c40f; }
  .slot-box { width: 40px; height: 40px; border: 1px dashed #444; background: #111; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
  .slot-box.has-skill { border: 1px solid #fff; box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.2); } /* 裝備中的技能框 */
  .loadout-slot.target-slot .slot-box { /* 被點擊的目標技能框 */
    border: 2px solid #3498db;
    box-shadow: 0 0 10px rgba(52, 152, 219, 0.5), inset 0 0 8px rgba(52, 152, 219, 0.3);
  }

  .repo-section { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    min-height: 0; /* 關鍵：允許 flex 子元素縮小到小於其內容的高度 */
  }
  .repo-scroll { flex: 1; overflow-y: auto; padding-right: 5px; }
  .category-group { margin-bottom: 15px; }
  .category-name { font-size: 0.65rem; color: #3498db; margin-bottom: 8px; border-bottom: 1px solid #222; }
  .skill-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .skill-item { 
    background: #111; border: 1px solid #333; padding: 5px; 
    display: flex; flex-direction: column; align-items: center; cursor: grab;
    transition: border-color 0.2s;
  }
  .skill-item:hover { border-color: #f1c40f; background: #1a1a1a; }
  .skill-icon { font-size: 1.2rem; }
  .skill-name { font-size: 0.5rem; color: #aaa; margin-top: 3px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }

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
  .tooltip-name { color: #f1c40f; font-weight: bold; font-size: 0.8rem; }
  .tooltip-icon { font-size: 1.2rem; }
  .tooltip-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 5px; }
  .tooltip-stat { font-size: 0.7rem; color: #ccc; }
  .mp-val { color: #3498db; font-weight: bold; }
  .stat-val { color: #fff; font-weight: bold; }
  .tooltip-desc { font-size: 0.65rem; color: #aaa; margin: 5px 0 0 0; line-height: 1.3; }

  .repo-scroll::-webkit-scrollbar { width: 4px; }
  .repo-scroll::-webkit-scrollbar-thumb { background: #444; }
</style>