const state = {
  monsters: [],
  filtered: [],
  selectedId: "",
  view: "table",
  team: Array(6).fill(""),
  teamFilters: Array(6).fill(""),
  filters: {
    search: "",
    rarity: "",
    type: "",
    sort: "tier",
    normal: true,
    shiny: false,
  },
};

const els = {
  dataStatus: document.querySelector("#dataStatus"),
  searchInput: document.querySelector("#searchInput"),
  rarityFilter: document.querySelector("#rarityFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  resetFilters: document.querySelector("#resetFilters"),
  normalFilter: document.querySelector("#normalFilter"),
  shinyFilter: document.querySelector("#shinyFilter"),
  cardViewButton: document.querySelector("#cardViewButton"),
  tableViewButton: document.querySelector("#tableViewButton"),
  resultCount: document.querySelector("#resultCount"),
  monsterGrid: document.querySelector("#monsterGrid"),
  tableWrap: document.querySelector("#tableWrap"),
  monsterTableBody: document.querySelector("#monsterTableBody"),
  detailPanel: document.querySelector("#detailPanel"),
  teamBoard: document.querySelector("#teamBoard"),
  synergyList: document.querySelector("#synergyList"),
  clearTeam: document.querySelector("#clearTeam"),
  cardTemplate: document.querySelector("#monsterCardTemplate"),
};

const rarityOrder = new Map([
  ["普通", 1],
  ["優秀", 2],
  ["稀有", 3],
  ["史詩", 4],
  ["傳說", 5],
  ["特殊/事件", 6],
  ["未分類", 99],
]);

const statClassByZh = new Map([
  ["冷卻", "cooldown"],
  ["傷害", "damage"],
  ["治療", "heal"],
  ["護盾", "shield"],
  ["燃燒", "burn"],
  ["中毒", "poison"],
  ["劇毒", "poison"],
  ["感電", "shock"],
  ["多重釋放", "cast"],
  ["蓄能", "charge"],
  ["金錢", "gold"],
  ["保護", "protect"],
]);

const typeClassByZh = new Map([
  ["蟲", "type-bug"],
  ["龍", "type-dragon"],
  ["電", "type-electric"],
  ["格鬥", "type-fighting"],
  ["火", "type-fire"],
  ["飛行", "type-flying"],
  ["幽靈", "type-ghost"],
  ["草", "type-grass"],
  ["岩石", "type-rock"],
  ["鋼", "type-steel"],
  ["毒", "type-toxic"],
  ["水", "type-water"],
]);

const castStatSpecs = [
  ["damage", "傷害", (value) => `造成 ${value} 點傷害`],
  ["heal", "治療", (value) => `治療 ${value}`],
  ["shield", "護盾", (value) => `護盾 ${value}`],
  ["burn", "燃燒", (value) => `燃燒 ${value}`],
  ["poison", "劇毒", (value) => `劇毒 ${value}`],
  ["shock", "感電", (value) => `感電 ${value}`],
  ["cast_ct", "多重釋放", (value) => `多重釋放: ${value}`],
];

async function loadDex() {
  try {
    const response = await fetch("assets/data/monsters.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.monsters = Array.isArray(data.monsters) ? data.monsters : [];
    els.dataStatus.textContent = `${state.monsters.length} 筆鬥靈資料`;
    buildFilters(data);
    buildTeamBoard();
    populateTeamOptions();
    bindEvents();
    applyFilters();
    setView(state.view);
    renderTeam();
  } catch (error) {
    els.dataStatus.textContent = "資料讀取失敗";
    els.monsterGrid.innerHTML = `<div class="error-state">無法讀取圖鑑資料：${escapeHtml(error.message)}</div>`;
  }
}

function buildFilters(data) {
  const rarities = [...new Set(state.monsters.map((monster) => monster.rarity_zh).filter(Boolean))]
    .sort((a, b) => (rarityOrder.get(a) ?? 99) - (rarityOrder.get(b) ?? 99));

  const types = new Map();
  state.monsters.forEach((monster) => {
    (monster.type_labels || []).forEach((type) => {
      if (type.id) types.set(type.id, type.zh || type.id);
    });
  });

  if (Array.isArray(data.types)) {
    data.types.forEach((type) => {
      if (type.id && [...types.keys()].includes(type.id)) {
        types.set(type.id, type.zh || type.id);
      }
    });
  }

  for (const rarity of rarities) {
    const option = document.createElement("option");
    option.value = rarity;
    option.textContent = rarity;
    els.rarityFilter.append(option);
  }

  [...types.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "zh-Hant"))
    .forEach(([id, zh]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${zh} (${id})`;
      els.typeFilter.append(option);
    });
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  els.rarityFilter.addEventListener("change", () => {
    state.filters.rarity = els.rarityFilter.value;
    applyFilters();
  });

  els.typeFilter.addEventListener("change", () => {
    state.filters.type = els.typeFilter.value;
    applyFilters();
  });

  els.normalFilter.addEventListener("change", () => {
    state.filters.normal = els.normalFilter.checked;
    applyFilters();
  });

  els.shinyFilter.addEventListener("change", () => {
    state.filters.shiny = els.shinyFilter.checked;
    applyFilters();
  });

  els.sortSelect.addEventListener("change", () => {
    state.filters.sort = els.sortSelect.value;
    applyFilters();
  });

  els.resetFilters.addEventListener("click", () => {
    state.filters = { search: "", rarity: "", type: "", sort: "tier", normal: true, shiny: false };
    els.searchInput.value = "";
    els.rarityFilter.value = "";
    els.typeFilter.value = "";
    els.sortSelect.value = "tier";
    els.normalFilter.checked = true;
    els.shinyFilter.checked = false;
    applyFilters();
  });

  els.cardViewButton.addEventListener("click", () => setView("cards"));
  els.tableViewButton.addEventListener("click", () => setView("table"));
  els.clearTeam.addEventListener("click", () => {
    state.team = Array(6).fill("");
    renderTeam();
  });
}

function setView(view) {
  state.view = view;
  els.cardViewButton.classList.toggle("is-active", view === "cards");
  els.tableViewButton.classList.toggle("is-active", view === "table");
  document.body.classList.toggle("table-mode", view === "table");
  els.monsterGrid.hidden = view !== "cards";
  els.tableWrap.hidden = view !== "table";
  renderGrid();
  renderTable();
}

function applyFilters() {
  const query = state.filters.search;
  state.filtered = state.monsters
    .filter((monster) => {
      if (state.filters.rarity && monster.rarity_zh !== state.filters.rarity) return false;
      if (state.filters.type && !(monster.types || []).includes(state.filters.type)) return false;
      if (!state.filters.normal && !monster.is_shiny) return false;
      if (!state.filters.shiny && monster.is_shiny) return false;
      if (!query) return true;
      return searchableText(monster).includes(query);
    })
    .sort(compareMonsters);

  renderGrid();
  renderTable();
}

function searchableText(monster) {
  return [
    monster.id,
    monster.base_id,
    monster.name_zh,
    monster.name_en,
    monster.rarity_zh,
    monster.rarity_en,
    monster.tier ? `T${monster.tier}` : "",
    monster.tier ? `${monster.rarity_zh} T${monster.tier}` : monster.rarity_zh,
    typeText(monster),
    monster.cooldown_text,
    monster.cast_effect_text,
    costLabel(monster),
    monster.ability_summary,
    monster.ability_script,
    ...(monster.ability_triggers || []),
    effectText(monster),
    ...(monster.types || []),
    ...(monster.type_labels || []).map((type) => type.zh),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareMonsters(a, b) {
  const sort = state.filters.sort;
  if (sort === "tier") {
    return numberValue(a.tier, 99) - numberValue(b.tier, 99) || zhCompare(a.name_zh, b.name_zh);
  }
  if (sort === "cost") {
    return numberValue(a.cost, 9999) - numberValue(b.cost, 9999) || zhCompare(a.name_zh, b.name_zh);
  }
  return zhCompare(String(a[sort] || ""), String(b[sort] || ""));
}

function numberValue(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function zhCompare(a, b) {
  return a.localeCompare(b, "zh-Hant", { numeric: true });
}

function renderGrid() {
  els.resultCount.textContent = state.filtered.length;
  els.monsterGrid.innerHTML = "";

  if (state.filtered.length === 0) {
    els.monsterGrid.innerHTML = `<div class="empty-state">沒有符合條件的鬥靈</div>`;
    renderDetail(null);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.filtered.forEach((monster) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = monster.id;
    node.dataset.rarity = monster.rarity_zh || "未分類";
    node.classList.toggle("is-selected", monster.id === state.selectedId);
    node.querySelector(".tier-badge").textContent = `${monster.rarity_zh || "未分類"}${monster.tier ? ` T${monster.tier}` : ""}`;
    const img = node.querySelector(".monster-sprite");
    img.src = monster.sprite || "";
    img.alt = monster.name_zh;
    img.style.visibility = monster.sprite ? "visible" : "hidden";
    node.querySelector(".monster-name-zh").textContent = monster.name_zh;
    node.querySelector(".monster-name-en").textContent = monster.name_en;
    node.querySelector(".monster-meta").textContent = `${costLabel(monster)} · ${monster.id}`;
    node.querySelector(".type-row").replaceChildren(...typeChips(monster));
    node.addEventListener("click", () => {
      state.selectedId = monster.id;
      renderGrid();
      renderTable();
      renderDetail(monster);
    });
    fragment.append(node);
  });

  els.monsterGrid.append(fragment);

  if (state.selectedId) {
    const selected = state.filtered.find((monster) => monster.id === state.selectedId);
    renderDetail(selected || null);
  }
}

function renderTable() {
  els.monsterTableBody.innerHTML = "";
  if (state.filtered.length === 0) {
    els.monsterTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">沒有符合條件的鬥靈</td></tr>`;
    return;
  }

  const rows = document.createDocumentFragment();
  state.filtered.forEach((monster) => {
    const row = document.createElement("tr");
    row.dataset.id = monster.id;
    row.dataset.variant = monster.is_shiny ? "shiny" : "normal";
    row.classList.toggle("is-selected", monster.id === state.selectedId);
    row.innerHTML = `
      <td>
        <div class="table-monster">
          ${monster.sprite ? `<img src="${escapeAttr(monster.sprite)}" alt="${escapeAttr(monster.name_zh)}">` : ""}
          <span class="table-name">
            <strong>${escapeHtml(monster.name_zh)}</strong>
            <span>${escapeHtml(monster.name_en)}</span>
            <span class="table-id">${escapeHtml(monster.id)}</span>
          </span>
        </div>
      </td>
      <td>${rarityBadge(monster)}</td>
      <td>${tableTypeChips(monster)}</td>
      <td>${escapeHtml(monster.cooldown_text || "未知")}</td>
      <td class="game-stat-inline">${coloredCastEffect(monster)}</td>
      <td>${escapeHtml(costLabel(monster))}</td>
      <td class="effect-cell">${coloredSkillEffect(monster)}</td>
    `;
    row.addEventListener("click", () => {
      state.selectedId = monster.id;
      renderGrid();
      renderTable();
      if (state.view !== "table") {
        renderDetail(monster);
      }
    });
    rows.append(row);
  });
  els.monsterTableBody.append(rows);
}

function renderDetail(monster) {
  if (!monster) {
    els.detailPanel.innerHTML = `<div class="detail-empty"><span>選擇一隻鬥靈</span></div>`;
    return;
  }

  els.detailPanel.innerHTML = `
    <div class="detail-header">
      ${monster.sprite ? `<img src="${escapeAttr(monster.sprite)}" alt="${escapeAttr(monster.name_zh)}">` : `<div></div>`}
      <div class="detail-title">
        <h2>${escapeHtml(monster.name_zh)}</h2>
        <p>${escapeHtml(monster.name_en)}</p>
        <div class="detail-actions">
          <button class="add-team-button" type="button" data-add-team="${escapeAttr(monster.id)}">加入隊伍</button>
        </div>
      </div>
    </div>

    <section class="detail-section">
      <h3>基本資料</h3>
      <dl class="stat-list">
        ${statRow("ID", monster.id)}
        ${statRow("稀有度", `${monster.rarity_zh || "未分類"}${monster.tier ? ` / T${monster.tier}` : ""}`)}
        ${statRow("價格", costLabel(monster))}
        ${statRow("屬性", typeText(monster))}
        ${statRow("型態", monster.is_shiny ? "閃光" : "一般")}
      </dl>
    </section>

    <section class="detail-section">
      <h3>技能</h3>
      <p class="ability-text">${escapeHtml(effectText(monster))}</p>
      ${triggerTags(monster)}
      ${paramTags(monster)}
    </section>

    <section class="detail-section">
      <h3>來源</h3>
      <span class="source-path">${escapeHtml(monster.source || "未知")}</span>
      <span class="source-path">${escapeHtml(monster.ability_script || "無技能腳本")}</span>
    </section>
  `;

  const addButton = els.detailPanel.querySelector("[data-add-team]");
  if (addButton) {
    addButton.addEventListener("click", () => addMonsterToTeam(monster.id));
  }
}

function rarityBadge(monster) {
  const tier = Number(monster.tier) || 0;
  const label = `${monster.rarity_zh || "未分類"}${monster.tier ? ` T${monster.tier}` : ""}`;
  return `<span class="rarity-badge-table rarity-bg-${tier}">${escapeHtml(label)}</span>`;
}

function tableTypeChips(monster) {
  const labels = monster.type_labels || [];
  if (labels.length === 0) {
    return `<span class="type-chip-table type-bg-default">未分類</span>`;
  }
  return labels.map((type) => {
    const className = `type-bg-${safeCssToken(type.id || "")}`;
    return `<span class="type-chip-table ${className}" title="${escapeAttr(type.id || "")}">${escapeHtml(type.zh || type.id)}</span>`;
  }).join("");
}

function coloredSkillEffect(monster) {
  const body = effectText(monster);
  if (!body) return "";
  return `<span class="skill-effect"><span class="skill-body">${colorizeGameText(body, monster)}</span></span>`;
}

function gameTooltip(monster) {
  const tier = Number(monster.tier) || 1;
  const sprite = monster.sprite
    ? `<img src="${escapeAttr(monster.sprite)}" alt="${escapeAttr(monster.name_zh)}">`
    : `<span class="game-missing-sprite">?</span>`;
  const typeHtml = gameTypeChips(monster);

  return `
    <div class="game-tooltip game-rarity-${tier}">
      <div class="game-tooltip-header">
        <span>${escapeHtml(monster.name_zh)}</span>
        <span>${escapeHtml(monster.rarity_zh || "未分類")}</span>
      </div>
      <div class="game-tooltip-frame">
        <div class="game-tooltip-panel game-visual-panel">
          <div class="game-sprite-frame">${sprite}</div>
          <div class="game-type-list">${typeHtml}</div>
        </div>
        <div class="game-tooltip-panel game-cast-panel">
          <div class="game-cooldown-box">${cooldownBlock(monster)}</div>
          <div class="game-cast-effect">${coloredCastEffect(monster)}</div>
        </div>
        <div class="game-tooltip-panel game-description-panel">
          <div class="game-description-text">${coloredAbilityEffect(monster)}</div>
        </div>
      </div>
    </div>
  `;
}

function gameTypeChips(monster) {
  const labels = monster.type_labels || [];
  if (labels.length === 0) {
    return `<span class="game-type-chip">未分類</span>`;
  }
  return labels.map((type) => {
    const className = `game-type-${safeCssToken(type.id || "")}`;
    return `<span class="game-type-chip ${className}" title="${escapeAttr(type.id || "")}">${escapeHtml(type.zh || type.id)}</span>`;
  }).join("");
}

function cooldownBlock(monster) {
  const text = monster.cooldown_text || "未知";
  const match = String(text).match(/^(.+?)\s*(秒)$/);
  if (!match) {
    return `<strong>${escapeHtml(text)}</strong>`;
  }
  return `<strong>${escapeHtml(match[1])}</strong><span>${escapeHtml(match[2])}</span>`;
}

function coloredCastEffect(monster) {
  const stats = monster.stats_lv1 || {};
  const effects = [];
  castStatSpecs.forEach(([key, stat, formatter]) => {
    const value = Number(stats[key]);
    if (!Number.isFinite(value) || value <= 0) return;
    if (key === "cast_ct" && value === 1) return;
    const text = formatter(formatDisplayNumber(value));
    effects.push(`<span class="game-stat game-stat-${statClass(stat)}">${escapeHtml(text)}</span>`);
  });
  return effects.length > 0 ? effects.join(" ") : `<span class="game-muted">無施放數值</span>`;
}

function coloredAbilityEffect(monster) {
  return colorizeGameText(effectText(monster), monster);
}

function colorizeGameText(rawText, monster = null) {
  const text = stripBbcode(rawText);
  const dynamicClasses = new Map();
  const params = monster?.ability_params || [];
  const monsterName = paramValue(params, "鬥靈");
  if (monsterName) dynamicClasses.set(monsterName, "batomon");
  (monster?.type_labels || []).forEach((type) => {
    if (type.zh && type.id) dynamicClasses.set(type.zh, `type-${safeCssToken(type.id)}`);
  });
  const terms = [...statClassByZh.keys(), ...typeClassByZh.keys(), ...dynamicClasses.keys()]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (terms.length === 0) return escapeHtml(text);

  const pattern = new RegExp(`([+-]?\\d+(?:\\.\\d+)?%?\\s*)?(${terms.map(escapeRegExp).join("|")})`, "g");
  let html = "";
  let lastIndex = 0;
  text.replace(pattern, (match, amount, stat, offset) => {
    html += escapeHtml(text.slice(lastIndex, offset));
    const className = dynamicClasses.get(stat) || typeClassByZh.get(stat) || statClass(stat);
    html += `<span class="game-stat game-stat-${className}">${escapeHtml(match)}</span>`;
    lastIndex = offset + match.length;
    return match;
  });
  html += escapeHtml(text.slice(lastIndex));
  return html;
}

function stripBbcode(value) {
  return String(value ?? "").replace(/\[\/?color(?:=[^\]]+)?\]/g, "");
}

function gameTriggerText(monster) {
  const triggers = monster.ability_triggers || [];
  return triggers[0] || "";
}

function statClass(stat) {
  return statClassByZh.get(stat) || "default";
}

function formatDisplayNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function safeCssToken(value) {
  return String(value || "unknown").replace(/[^a-z0-9_-]/gi, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTeamBoard() {
  els.teamBoard.innerHTML = "";
  for (let index = 0; index < 6; index += 1) {
    const slot = document.createElement("div");
    slot.className = "team-slot";
    slot.dataset.slot = String(index);
    slot.innerHTML = `
      <span class="slot-label">${index < 3 ? "上排" : "下排"} ${index % 3 + 1}</span>
      <label class="slot-filter">
        <span>篩選名字</span>
        <input type="search" data-slot-filter="${index}" placeholder="中文名、英文名、ID">
      </label>
      <select class="slot-select" data-slot-select="${index}">
        <option value="">空位</option>
      </select>
      <div class="slot-preview" data-slot-preview="${index}">
        <span>未選擇</span>
      </div>
      <button class="slot-clear" type="button" data-slot-clear="${index}">清除</button>
    `;
    els.teamBoard.append(slot);
  }
}

function populateTeamOptions() {
  const baseMonsters = state.monsters
    .filter((monster) => !monster.is_shiny)
    .sort((a, b) => compareByTierAndName(a, b))
    ;

  els.teamBoard.querySelectorAll("[data-slot-select]").forEach((select) => {
    const index = Number(select.dataset.slotSelect);
    const selectedId = state.team[index] || "";
    const selectedMonster = selectedId ? findMonster(selectedId) : null;
    const query = state.teamFilters[index] || "";
    const optionMonsters = baseMonsters.filter((monster) => matchesTeamFilter(monster, query));

    if (selectedMonster && !optionMonsters.some((monster) => monster.id === selectedMonster.id)) {
      optionMonsters.unshift(selectedMonster);
    }

    const options = optionMonsters
      .map((monster) => `<option value="${escapeAttr(monster.id)}">${escapeHtml(monster.name_zh)} / ${escapeHtml(monster.name_en)}</option>`)
      .join("");

    select.innerHTML = `<option value="">空位</option>${options}`;
    select.value = selectedId;
    select.onchange = () => {
      state.team[index] = select.value;
      renderTeam();
    };
  });

  els.teamBoard.querySelectorAll("[data-slot-filter]").forEach((input) => {
    const index = Number(input.dataset.slotFilter);
    input.value = state.teamFilters[index] || "";
    input.oninput = () => {
      state.teamFilters[index] = input.value.trim().toLowerCase();
      populateTeamOptions();
    };
  });

  els.teamBoard.querySelectorAll("[data-slot-clear]").forEach((button) => {
    button.onclick = () => {
      state.team[Number(button.dataset.slotClear)] = "";
      renderTeam();
    };
  });
}

function matchesTeamFilter(monster, query) {
  if (!query) return true;
  return [
    monster.id,
    monster.base_id,
    monster.name_zh,
    monster.name_en,
    monster.rarity_zh,
    monster.rarity_en,
    ...(monster.types || []),
    ...(monster.type_labels || []).map((type) => type.zh),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function renderTeam() {
  els.teamBoard.querySelectorAll("[data-slot-select]").forEach((select) => {
    select.value = state.team[Number(select.dataset.slotSelect)] || "";
  });

  for (let index = 0; index < 6; index += 1) {
    const monster = findMonster(state.team[index]);
    const preview = els.teamBoard.querySelector(`[data-slot-preview="${index}"]`);
    if (!preview) continue;
    if (!monster) {
      preview.innerHTML = `<span>未選擇</span>`;
      continue;
    }
    preview.innerHTML = `
      ${monster.sprite ? `<img src="${escapeAttr(monster.sprite)}" alt="${escapeAttr(monster.name_zh)}">` : ""}
      <strong>${escapeHtml(monster.name_zh)}</strong>
      <span>${escapeHtml(typeText(monster))}</span>
    `;
  }

  renderSynergy();
}

function renderSynergy() {
  const team = state.team.map((id) => findMonster(id));
  const items = [];

  team.forEach((monster, index) => {
    if (!monster) return;
    const targets = getAbilityTargets(monster, index, team);
    if (targets.length === 0) {
      items.push({
        title: `${slotLabel(index)} ${monster.name_zh}`,
        text: `${triggerText(monster)}${effectText(monster)}。目前沒有偵測到隊友命中，可能是自我效果、全隊效果，或條件不足。`,
      });
      return;
    }
    targets.forEach((target) => {
      items.push({
        title: `${slotLabel(index)} ${monster.name_zh} -> ${slotLabel(target.index)} ${target.monster.name_zh}`,
        text: `${triggerText(monster)}${effectText(monster)}。命中原因：${target.reason}。`,
      });
    });
  });

  if (items.length === 0) {
    els.synergyList.innerHTML = `<div class="empty-state">選擇鬥靈後會顯示技能命中分析</div>`;
    return;
  }

  els.synergyList.innerHTML = items.map((item) => `
    <div class="synergy-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </div>
  `).join("");
}

function getAbilityTargets(monster, index, team) {
  const summary = effectText(monster);
  const params = monster.ability_params || [];
  const dir = (params.find((param) => param.label === "方向") || {}).value || "";
  const targetTypeZh = (params.find((param) => param.label === "目標屬性") || {}).value || "";
  const targetType = typeIdFromZh(targetTypeZh);
  const targets = [];

  let indexes = [];
  let reason = "";
  if (summary.includes("相鄰") || dir === "相鄰") {
    indexes = adjacentIndexes(index);
    reason = "相鄰位置";
  } else if (dir) {
    const targetIndex = directionalIndex(index, dir);
    indexes = targetIndex >= 0 ? [targetIndex] : [];
    reason = dir;
  } else if (summary.includes("所有") && targetType) {
    indexes = [0, 1, 2, 3, 4, 5].filter((slotIndex) => slotIndex !== index);
    reason = `所有${targetTypeZh}友方`;
  }

  indexes.forEach((slotIndex) => {
    const target = team[slotIndex];
    if (!target) return;
    if (targetType && !(target.types || []).includes(targetType)) return;
    targets.push({
      index: slotIndex,
      monster: target,
      reason: targetType ? `${reason}，且目標是${targetTypeZh}系` : reason,
    });
  });

  return targets;
}

function adjacentIndexes(index) {
  return [directionalIndex(index, "上方"), directionalIndex(index, "下方"), directionalIndex(index, "左側"), directionalIndex(index, "右側")]
    .filter((slotIndex) => slotIndex >= 0);
}

function directionalIndex(index, dir) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  if (dir === "上方") return row > 0 ? index - 3 : -1;
  if (dir === "下方") return row < 1 ? index + 3 : -1;
  if (dir === "左側" || dir === "左方") return col > 0 ? index - 1 : -1;
  if (dir === "右側" || dir === "右方") return col < 2 ? index + 1 : -1;
  return -1;
}

function typeIdFromZh(typeZh) {
  const typeMap = new Map();
  state.monsters.forEach((monster) => {
    (monster.type_labels || []).forEach((type) => typeMap.set(type.zh, type.id));
  });
  return typeMap.get(typeZh) || "";
}

function addMonsterToTeam(monsterId) {
  const emptyIndex = state.team.findIndex((id) => !id);
  const targetIndex = emptyIndex >= 0 ? emptyIndex : 0;
  state.team[targetIndex] = monsterId;
  renderTeam();
  document.querySelector(".team-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function findMonster(monsterId) {
  return state.monsters.find((monster) => monster.id === monsterId) || null;
}

function compareByTierAndName(a, b) {
  return numberValue(a.tier, 99) - numberValue(b.tier, 99) || zhCompare(a.name_zh, b.name_zh);
}

function typeChips(monster) {
  const labels = monster.type_labels || [];
  if (labels.length === 0) {
    const chip = document.createElement("span");
    chip.className = "type-chip";
    chip.textContent = "未分類";
    return [chip];
  }
  return labels.map((type) => {
    const chip = document.createElement("span");
    chip.className = "type-chip";
    chip.textContent = type.zh ? `${type.zh}` : type.id;
    chip.title = type.id;
    return chip;
  });
}

function typeText(monster) {
  const labels = monster.type_labels || [];
  if (labels.length === 0) return "未分類";
  return labels.map((type) => `${type.zh || type.id} (${type.id})`).join("、");
}

function costLabel(monster) {
  return monster.cost === null || monster.cost === undefined ? "價格未知" : `${monster.cost} 金`;
}

function effectText(monster) {
  if (monster.ability_effect_text) return stripBbcode(monster.ability_effect_text);
  if (!monster.ability_summary) return "";
  let text = stripBbcode(monster.ability_summary);
  const params = monster.ability_params || [];
  const direction = paramValue(params, "方向") || "指定方向";
  const type = paramValue(params, "目標屬性") || "指定屬性";
  const status = paramValue(params, "狀態") || "狀態";
  const keyword = paramValue(params, "關鍵字") || "蓄能";
  const monsterName = paramValue(params, "鬥靈") || "同名鬥靈";
  const stats = params.filter((param) => param.label === "加成屬性").map((param) => param.value);
  const rawValue = paramValue(params, "數值") || "";
  const value = displayValue(rawValue) || "對應數值";
  const time = paramValue(params, "時間") || value;
  const statText = stats.length > 0 ? stats.join("、") : "指定屬性";
  const statMod = formatStatMod(stats[0] || statText, value);

  return text
    .replaceAll("{direction}", direction)
    .replaceAll("{type}", type)
    .replaceAll("{monster}", monsterName)
    .replaceAll("{battle_start}", "戰鬥開始")
    .replaceAll("{ongoing}", "持續")
    .replaceAll("{charge}", keyword)
    .replaceAll("{cd_stat}", "冷卻")
    .replaceAll("{cd_increase}", "對應數值")
    .replaceAll("{stat}", statText)
    .replaceAll("{damage}", "傷害")
    .replaceAll("{cooldown}", "冷卻")
    .replaceAll("{multicast}", "多重釋放")
    .replaceAll("{stat_mod}", statMod)
    .replaceAll("{stat_mod1}", stats[0] || "指定屬性")
    .replaceAll("{stat_mod2}", stats[1] || "指定屬性")
    .replaceAll("{damage_stat_mod}", statMod)
    .replaceAll("{shield_stat}", "護盾")
    .replaceAll("{percent}", value)
    .replaceAll("{time}", time)
    .replaceAll("{triggers}", value)
    .replaceAll("{repeats}", value)
    .replaceAll("{rarity}", "指定稀有度")
    .replaceAll("{status}", status)
    .replaceAll("{protect_gain}", "保護 1")
    .replaceAll("{gold_gain}", "金錢")
    .replaceAll("{item}", "道具")
    .replaceAll("{count}", value)
    .replaceAll("{amount}", value)
    .replaceAll("{monster_name}", "指定鬥靈")
    .replaceAll("{sell_value_mod}", value)
    .replaceAll("{pct}", value)
    .replaceAll("{multiplier}", value);
}

function paramValue(params, label) {
  const found = params.find((param) => param.label === label);
  return found ? found.value : "";
}

function displayValue(rawValue) {
  if (!rawValue) return "";
  const match = String(rawValue).match(/-?\d+(?:\.\d+)?/);
  if (!match) return rawValue;
  const number = Number(match[0]);
  return Number.isInteger(number) ? String(number) : String(number);
}

function formatStatMod(stat, value) {
  if (!value || value === "對應數值") return `${value}${stat}`;
  const number = Number(value);
  const prefix = Number.isFinite(number) && number > 0 ? "+" : "";
  return `${prefix}${value} ${stat}`;
}

function triggerText(monster) {
  const triggers = monster.ability_triggers || [];
  return triggers.length > 0 ? `【${triggers.join("、")}】` : "";
}

function triggerTags(monster) {
  const triggers = monster.ability_triggers || [];
  if (triggers.length === 0) return "";
  return `<div class="effect-tags">${triggers.map((trigger) => `<span class="effect-tag">${escapeHtml(trigger)}</span>`).join("")}</div>`;
}

function paramTags(monster) {
  const params = monster.ability_params || [];
  if (params.length === 0) return "";
  return `<div class="param-tags">${params.map((param) => `<span class="param-tag">${escapeHtml(param.label)}：${escapeHtml(param.value)}</span>`).join("")}</div>`;
}

function slotLabel(index) {
  return `${index < 3 ? "上排" : "下排"}${index % 3 + 1}`;
}

function statRow(label, value) {
  return `<div class="stat-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

loadDex();
