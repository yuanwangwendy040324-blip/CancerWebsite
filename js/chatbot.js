// ===== Data Assistant chatbot =====
// Reads answers live from the already-rendered DOM (chart bars, drug cards,
// stat numbers) so it always matches whatever language is currently shown
// and never drifts out of sync with the page's own data.

const STARTER_QUESTIONS = [
  { zh: "乳腺癌发病率是多少？", en: "What is the breast cancer incidence rate?" },
  { zh: "乳腺癌五年生存率是多少？", en: "What is breast cancer's 5-year survival rate?" },
  { zh: "靶向治疗有哪些药物？", en: "What targeted therapy drugs are there?" },
  { zh: "HER2市场规模多大？", en: "How big is the HER2 drug market?" },
];

const DISEASE_KEYS = [
  "lung", "colorectal", "liver", "stomach", "breast",
  "thyroid", "cervical", "esophageal", "endometrial", "ovarian", "uterineCorpus",
];

function chatT(key) {
  const el = document.querySelector('[data-i18n="' + key + '"]');
  if (el) return el.textContent.trim();
  return (I18N[currentLang] && I18N[currentLang][key]) || "";
}

function chatBuildDiseaseTable() {
  return DISEASE_KEYS.map((key) => {
    const full = "disease." + key;
    const zh = I18N.zh[full] || "";
    const en = (I18N.en[full] || "").toLowerCase();
    const zhShort = zh.replace(/癌$/, "");
    const enShort = en.replace(/ cancer$/, "");
    return { key, aliases: [zh, zhShort, en, enShort].filter((a) => a && a.length >= 2) };
  });
}

function chatMatchDisease(q) {
  const table = chatBuildDiseaseTable();
  for (const d of table) {
    for (const a of d.aliases) {
      if (q.includes(a.toLowerCase())) return d.key;
    }
  }
  return null;
}

function chatFindChartItemByKey(chartId, diseaseKey) {
  const rows = chartRows[chartId] || [];
  const target = "disease." + diseaseKey;
  const idx = rows.findIndex((r) => r.item.key === target);
  if (idx === -1) return null;
  const row = rows[idx];
  return {
    label: row.labelEl.textContent.trim(),
    value: row.valueEl.textContent.trim(),
    rank: idx + 1,
    total: rows.length,
  };
}

function chatMatchDrugCategory(q) {
  if (/化疗|chemo/.test(q)) return "chemo";
  if (/内分泌|endocrine|hormone/.test(q)) return "endocrine";
  if (/靶向|targeted/.test(q)) return "targeted";
  if (/免疫|immuno/.test(q)) return "immuno";
  if (/影像|imaging/.test(q)) return "imaging";
  return null;
}

function chatFindDrugMention(q) {
  const panels = document.querySelectorAll(".tab-panel");
  for (const panel of panels) {
    const tabKey = panel.dataset.panel;
    const groups = panel.querySelectorAll(".drug-group");
    for (const group of groups) {
      const nameEl = group.querySelector("h4");
      const groupName = nameEl ? nameEl.textContent.trim() : "";
      const mechEl = group.querySelector(".mech");
      const mech = mechEl ? mechEl.textContent.trim() : "";
      const descEl = group.querySelector(".group-desc");
      const desc = descEl ? descEl.textContent.trim() : "";
      const items = group.querySelectorAll("li");
      for (const li of items) {
        const text = li.textContent.replace(/\s+/g, " ").trim();
        const tokens = text.split(/[\s()（）/·,，]+/).filter((t) => t.length >= 3);
        for (const tok of tokens) {
          if (q.includes(tok.toLowerCase())) {
            return { tabKey, groupName, mech, desc };
          }
        }
      }
    }
  }
  return null;
}

// ---- Response builders ----

function chatBuildGreeting() {
  return chatT("chat.welcome");
}

function chatBuildDeathRanking() {
  const items = [...document.querySelectorAll(".rank-list li")].map((li, i) => {
    const name = li.querySelector(".rank-name").textContent.trim();
    return i + 1 + ". " + name;
  });
  const header =
    currentLang === "zh"
      ? "中国女性癌症死亡原因 TOP 5："
      : "Top 5 female cancer causes of death in China:";
  const note = chatT("inc.rank.note");
  return header + "\n" + items.join("\n") + "\n\n" + note;
}

function chatBuildIncidenceSpecific(key) {
  const found = chatFindChartItemByKey("incidenceChart", key);
  if (!found) return chatBuildIncidenceGeneral();
  if (currentLang === "zh") {
    return (
      found.label +
      " 女性新发病例约 " +
      found.value +
      "（2020年），在十种主要癌症中排第 " +
      found.rank +
      " 位。"
    );
  }
  return (
    found.label +
    ": about " +
    found.value +
    " new female cases (2020), ranked #" +
    found.rank +
    " among the top 10 cancers shown."
  );
}

function chatBuildIncidenceGeneral() {
  const rows = (chartRows["incidenceChart"] || []).slice(0, 3);
  const top3 = rows
    .map((r, i) => i + 1 + ". " + r.labelEl.textContent.trim() + "（" + r.valueEl.textContent.trim() + "）")
    .join("\n");
  const total = chatT("inc.stat1.num");
  const share = chatT("inc.stat2.num");
  const top10share = chatT("inc.stat3.num");
  if (currentLang === "zh") {
    return (
      "2020年中国女性新发癌症总数约 " +
      total +
      "，占全国癌症新发病例 " +
      share +
      "。新发病例数最多的前三位是：\n" +
      top3 +
      "\n\n前十种癌症合计占女性新发癌症总数的 " +
      top10share +
      "。"
    );
  }
  return (
    "In 2020, China had about " +
    total +
    " new female cancer cases, " +
    share +
    " of all national new cancer cases. Top 3 by case count:\n" +
    top3 +
    "\n\nThe top 10 cancers together account for " +
    top10share +
    " of new female cancer cases."
  );
}

function chatBuildSurvivalSpecific(key) {
  const found = chatFindChartItemByKey("survivalChart", key);
  if (!found) return chatBuildSurvivalGeneral();
  if (currentLang === "zh") {
    return (
      found.label +
      " 的五年相对生存率约为 " +
      found.value +
      "，在图中列出的九种癌症中排第 " +
      found.rank +
      " 位（生存率越高越靠前）。"
    );
  }
  return (
    found.label +
    " has a 5-year relative survival rate of about " +
    found.value +
    ", ranked #" +
    found.rank +
    " among the nine cancers shown (higher survival ranks first)."
  );
}

function chatBuildSurvivalGeneral() {
  const overall = chatT("surv.lede");
  const rows = (chartRows["survivalChart"] || []).slice(0, 3);
  const top3 = rows
    .map((r, i) => i + 1 + ". " + r.labelEl.textContent.trim() + "（" + r.valueEl.textContent.trim() + "）")
    .join("\n");
  if (currentLang === "zh") return overall + "\n\n生存率最高的前三位癌种：\n" + top3;
  return overall + "\n\nTop 3 cancers by 5-year survival rate:\n" + top3;
}

function chatBuildMarketTotal() {
  const size = chatT("mkt.stat1.num");
  const cagr = chatT("mkt.stat2.num");
  const her2sales = chatT("mkt.stat3.num");
  if (currentLang === "zh") {
    return (
      "预计2025年中国乳腺癌药物市场规模约 " +
      size +
      "，近五年复合增速 " +
      cagr +
      "。其中，2024年HER2靶点药物医院端销售额约 " +
      her2sales +
      "。"
    );
  }
  return (
    "China's breast cancer drug market is forecast at about " +
    size +
    " in 2025, with a ~" +
    cagr +
    " 5-year CAGR. HER2-targeted drug hospital sales were about " +
    her2sales +
    " in 2024."
  );
}

function chatBuildHer2Market() {
  const trendRows = chartRows["her2TrendChart"] || [];
  const trend = trendRows
    .map((r) => r.labelEl.textContent.trim() + ": " + r.valueEl.textContent.trim())
    .join(" → ");
  const drugRows = chartRows["her2DrugChart"] || [];
  const drugs = drugRows
    .map((r) => r.labelEl.textContent.trim() + "（" + r.valueEl.textContent.trim() + "）")
    .join("、");
  if (currentLang === "zh") {
    return "HER2靶向药物医院端销售额趋势：" + trend + "。\n\n重点单药2023年中国销售额：" + drugs + "。";
  }
  return "HER2-targeted drug hospital sales trend: " + trend + ".\n\nKey drugs' 2023 China sales: " + drugs + ".";
}

function chatBuildCdk46Market() {
  const rows = chartRows["cdk46Chart"] || [];
  const list = rows
    .map((r, i) => i + 1 + ". " + r.labelEl.textContent.trim() + "：" + r.valueEl.textContent.trim())
    .join("\n");
  if (currentLang === "zh") return "2023年中国CDK4/6抑制剂市场份额：\n" + list;
  return "2023 China CDK4/6 inhibitor market share:\n" + list;
}

function chatBuildEndocrineMarket() {
  const rows = chartRows["endocrineMarketChart"] || [];
  const list = rows.map((r) => r.labelEl.textContent.trim() + "：" + r.valueEl.textContent.trim()).join("\n");
  if (currentLang === "zh") return "2023年内分泌治疗细分市场规模：\n" + list;
  return "2023 endocrine therapy sub-market size:\n" + list;
}

function chatBuildDrugCategories() {
  const tabs = ["chemo", "endocrine", "targeted", "immuno", "imaging"];
  const names = tabs.map((t) => chatT("tab." + t));
  if (currentLang === "zh") {
    return "乳腺癌常用药物分为5大类：" + names.join("、") + "。可以直接问我某一类里有哪些药，比如“靶向治疗有哪些药物”。";
  }
  return (
    "Breast cancer drugs are grouped into 5 categories: " +
    names.join(", ") +
    '. Ask me about a specific category, e.g. "What targeted therapy drugs are there?"'
  );
}

function chatBuildDrugCategoryDetail(tabKey) {
  const panel = document.querySelector('.tab-panel[data-panel="' + tabKey + '"]');
  if (!panel) return null;
  const groups = [...panel.querySelectorAll(".drug-group")].map((g) => {
    const nameEl = g.querySelector("h4");
    const name = nameEl ? nameEl.textContent.trim() : "";
    const drugs = [...g.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").trim());
    return name ? name + "：" + drugs.join("、") : drugs.join("、");
  });
  const tabName = chatT("tab." + tabKey);
  const header = currentLang === "zh" ? tabName + "常用药物：" : tabName + " — common drugs:";
  return header + "\n" + groups.join("\n");
}

function chatBuildDrugDetail(match) {
  const tabName = chatT("tab." + match.tabKey);
  let ans =
    currentLang === "zh"
      ? match.groupName + "（属于" + tabName + "）"
      : match.groupName + " (under " + tabName + ")";
  if (match.mech) ans += "\n" + match.mech;
  if (match.desc) ans += "\n" + match.desc;
  return ans;
}

function chatBuildSources() {
  const c1 = chatT("src.c1.title") + "：" + chatT("src.c1.body");
  const c3 = chatT("src.c3.title") + "：" + chatT("src.c3.body");
  const c4 = chatT("src.c4.title") + "：" + chatT("src.c4.body");
  if (currentLang === "zh") return "本站数据主要来自：\n・" + c1 + "\n・" + c3 + "\n・" + c4;
  return "Data on this site comes from:\n・" + c1 + "\n・" + c3 + "\n・" + c4;
}

// ---- Intent router ----

function chatAnswer(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return null;

  if (/死亡|死因|mortality|death/.test(q)) return chatBuildDeathRanking();

  if (/生存率|survival/.test(q)) {
    const key = chatMatchDisease(q);
    return key ? chatBuildSurvivalSpecific(key) : chatBuildSurvivalGeneral();
  }

  if (/发病率|新发|病例数|incidence|new case/.test(q)) {
    const key = chatMatchDisease(q);
    return key ? chatBuildIncidenceSpecific(key) : chatBuildIncidenceGeneral();
  }

  if (
    /cdk4\/6|cdk4|cdk6|哌柏西利|达尔西利|阿贝西利|abemaciclib|palbociclib|dalpiciclib/.test(q) &&
    /市场|份额|销售|share|market|sales/.test(q)
  ) {
    return chatBuildCdk46Market();
  }

  if (/her2/.test(q) && /市场|销售|规模|share|market|sales|size/.test(q)) {
    return chatBuildHer2Market();
  }

  if (/内分泌|endocrine/.test(q) && /市场|规模|market|size/.test(q)) {
    return chatBuildEndocrineMarket();
  }

  if (/市场规模|市场总额|market size|总规模|cagr|增速|growth rate/.test(q)) {
    return chatBuildMarketTotal();
  }

  if (/(分类|几大类|几类|classification|categories)/.test(q) && /(药|drug)/.test(q)) {
    return chatBuildDrugCategories();
  }

  const catMatch = chatMatchDrugCategory(q);
  if (catMatch) return chatBuildDrugCategoryDetail(catMatch);

  const drugMatch = chatFindDrugMention(q);
  if (drugMatch) return chatBuildDrugDetail(drugMatch);

  if (/数据来源|哪里来|方法论|methodology|source of data/.test(q)) return chatBuildSources();

  if (/你好|您好|哈喽|嗨|在吗|^hi$|^hello$/.test(q)) return chatBuildGreeting();

  if (/你能|能做什么|帮助|help|what can you/.test(q)) return chatBuildGreeting();

  return null;
}

// ---- UI ----

function chatCreateWidget() {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<button class="chat-fab" id="chatFab" type="button" data-i18n-attr="aria-label" data-i18n="chat.fabAria" aria-label="Open data assistant">' +
    '<svg class="chat-fab-chat-icon" viewBox="0 0 24 24" fill="none"><path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
    '<svg class="chat-fab-close-icon" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
    "</button>" +
    '<div class="chat-panel" id="chatPanel" role="dialog" aria-label="Data Assistant">' +
    '<div class="chat-header">' +
    '<span class="chat-avatar"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3c3 1.4 6 1.8 6 1.8v6.4c0 4.2-2.6 7.3-6 8.6-3.4-1.3-6-4.4-6-8.6V4.8S9 4.4 12 3Z" stroke="currentColor" stroke-width="1.5"/></svg></span>' +
    '<span class="chat-header-text">' +
    '<span class="chat-header-title" data-i18n="chat.title">数据助手</span>' +
    '<span class="chat-header-sub" data-i18n="chat.subtitle">基于本页数据回答问题</span>' +
    "</span>" +
    '<button class="chat-close-btn" id="chatCloseBtn" type="button" data-i18n-attr="aria-label" data-i18n="chat.closeAria" aria-label="Close">' +
    '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
    "</button>" +
    "</div>" +
    '<div class="chat-messages" id="chatMessages"></div>' +
    '<div class="chat-starters" id="chatStarters"></div>' +
    '<div class="chat-disclaimer" data-i18n="chat.disclaimer">回答基于本页整理数据自动生成，不构成医疗建议，具体诊疗请遵医嘱。</div>' +
    '<div class="chat-input-row">' +
    '<input class="chat-input" id="chatInput" type="text" data-i18n-attr="placeholder" data-i18n="chat.placeholder" placeholder="输入你的问题…" autocomplete="off">' +
    '<button class="chat-send-btn" id="chatSendBtn" type="button" data-i18n-attr="aria-label" data-i18n="chat.sendAria" aria-label="Send">' +
    '<svg viewBox="0 0 24 24" fill="none"><path d="m4 12 16-8-6 16-2.5-6.5L4 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
    "</button>" +
    "</div>" +
    "</div>";
  document.body.appendChild(wrap);
}

function chatAppendMessage(role, text) {
  const messages = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "chat-msg " + role;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

function chatShowTyping() {
  const messages = document.getElementById("chatMessages");
  const row = document.createElement("div");
  row.className = "chat-msg bot";
  row.id = "chatTypingRow";
  row.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function chatHideTyping() {
  const row = document.getElementById("chatTypingRow");
  if (row) row.remove();
}

function chatRenderStarters() {
  const container = document.getElementById("chatStarters");
  if (!container) return;
  container.innerHTML = "";
  STARTER_QUESTIONS.forEach((q) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chat-chip";
    chip.textContent = q[currentLang] || q.zh;
    chip.addEventListener("click", () => chatHandleUserMessage(q[currentLang] || q.zh));
    container.appendChild(chip);
  });
}

function chatHandleUserMessage(text) {
  if (!text.trim()) return;
  chatAppendMessage("user", text);
  const input = document.getElementById("chatInput");
  if (input) input.value = "";

  chatShowTyping();
  const delay = 350 + Math.random() * 350;
  setTimeout(() => {
    chatHideTyping();
    const answer = chatAnswer(text);
    chatAppendMessage("bot", answer || chatT("chat.fallback"));
  }, delay);
}

function chatOpenPanel() {
  document.getElementById("chatFab").classList.add("open");
  document.getElementById("chatPanel").classList.add("open");
  const input = document.getElementById("chatInput");
  if (input) setTimeout(() => input.focus(), 150);

  if (!document.getElementById("chatMessages").children.length) {
    chatAppendMessage("bot", chatT("chat.welcome"));
  }
}

function chatClosePanel() {
  document.getElementById("chatFab").classList.remove("open");
  document.getElementById("chatPanel").classList.remove("open");
}

function initChatbot() {
  chatCreateWidget();
  chatRenderStarters();

  // Ensure the newly injected widget picks up the current language immediately.
  if (typeof applyLanguage === "function") applyLanguage(currentLang);

  document.getElementById("chatFab").addEventListener("click", () => {
    const isOpen = document.getElementById("chatPanel").classList.contains("open");
    if (isOpen) chatClosePanel();
    else chatOpenPanel();
  });

  document.getElementById("chatCloseBtn").addEventListener("click", chatClosePanel);

  document.getElementById("chatSendBtn").addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    chatHandleUserMessage(input.value);
  });

  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      chatHandleUserMessage(e.target.value);
    }
  });
}

document.addEventListener("DOMContentLoaded", initChatbot);
