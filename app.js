const JOURNAL_KEY = "journal_v2";
const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const serverModels = {
  chart: "gpt-5-mini",
  news: "gpt-5-mini",
  copilot: "gpt-5-mini"
};

const instrumentLabels = {
  forex: "Forex",
  gold: "Gold",
  indices: "Indices",
  crypto: "Crypto",
  custom: "Custom"
};

const chartSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    market_bias: { type: "string" },
    signal: { type: "string" },
    confidence: { type: "number" },
    setup_summary: { type: "string" },
    entry_zone: { type: "string" },
    invalidation: { type: "string" },
    targets: { type: "array", items: { type: "string" } },
    confluences: { type: "array", items: { type: "string" } },
    risk_notes: { type: "array", items: { type: "string" } },
    execution_checklist: { type: "array", items: { type: "string" } },
    journal_prompt: { type: "string" }
  },
  required: [
    "market_bias",
    "signal",
    "confidence",
    "setup_summary",
    "entry_zone",
    "invalidation",
    "targets",
    "confluences",
    "risk_notes",
    "execution_checklist",
    "journal_prompt"
  ]
};

const newsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    macro_bias: { type: "string" },
    confidence: { type: "number" },
    summary: { type: "string" },
    bullish_case: { type: "string" },
    bearish_case: { type: "string" },
    key_catalysts: { type: "array", items: { type: "string" } },
    risk_watch: { type: "array", items: { type: "string" } },
    next_actions: { type: "array", items: { type: "string" } },
    workbook_prompt: { type: "string" }
  },
  required: [
    "macro_bias",
    "confidence",
    "summary",
    "bullish_case",
    "bearish_case",
    "key_catalysts",
    "risk_watch",
    "next_actions",
    "workbook_prompt"
  ]
};

const copilotSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    response_title: { type: "string" },
    stance: { type: "string" },
    summary: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    risk_alerts: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
    follow_up_prompt: { type: "string" }
  },
  required: [
    "response_title",
    "stance",
    "summary",
    "key_points",
    "risk_alerts",
    "next_steps",
    "follow_up_prompt"
  ]
};

const els = {
  rows: document.getElementById("rows"),
  clearAll: document.getElementById("clearAll"),
  form: document.getElementById("journalForm"),
  formPanel: document.getElementById("formPanel"),
  formTitle: document.getElementById("formTitle"),
  formSubtitle: document.getElementById("formSubtitle"),
  tradeId: document.getElementById("tradeId"),
  date: document.getElementById("date"),
  symbol: document.getElementById("symbol"),
  instrument: document.getElementById("instrument"),
  dir: document.getElementById("dir"),
  size: document.getElementById("size"),
  contract: document.getElementById("contract"),
  contractWrap: document.getElementById("contractWrap"),
  entry: document.getElementById("entry"),
  exit: document.getElementById("exit"),
  notes: document.getElementById("notes"),
  resetForm: document.getElementById("resetForm"),
  saveButton: document.getElementById("saveButton"),
  total: document.getElementById("total"),
  win: document.getElementById("win"),
  count: document.getElementById("count"),
  best: document.getElementById("best"),
  heroTotal: document.getElementById("heroTotal"),
  heroWin: document.getElementById("heroWin"),
  heroCount: document.getElementById("heroCount"),
  heroAverage: document.getElementById("heroAverage"),
  metricTotalCard: document.getElementById("metricTotalCard"),
  metricBestCard: document.getElementById("metricBestCard"),
  reviewNote: document.getElementById("reviewNote"),
  aiConfigStatus: document.getElementById("aiConfigStatus"),
  aiConfigNote: document.getElementById("aiConfigNote"),
  chartForm: document.getElementById("chartForm"),
  chartSymbol: document.getElementById("chartSymbol"),
  chartTimeframe: document.getElementById("chartTimeframe"),
  chartImage: document.getElementById("chartImage"),
  chartNotes: document.getElementById("chartNotes"),
  chartPreview: document.getElementById("chartPreview"),
  chartStatus: document.getElementById("chartStatus"),
  chartStatusNote: document.getElementById("chartStatusNote"),
  chartResult: document.getElementById("chartResult"),
  resetChart: document.getElementById("resetChart"),
  newsForm: document.getElementById("newsForm"),
  newsSymbol: document.getElementById("newsSymbol"),
  newsHorizon: document.getElementById("newsHorizon"),
  newsFocus: document.getElementById("newsFocus"),
  newsNotes: document.getElementById("newsNotes"),
  newsStatus: document.getElementById("newsStatus"),
  newsStatusNote: document.getElementById("newsStatusNote"),
  newsResult: document.getElementById("newsResult"),
  newsSources: document.getElementById("newsSources"),
  resetNews: document.getElementById("resetNews"),
  copilotForm: document.getElementById("copilotForm"),
  copilotMode: document.getElementById("copilotMode"),
  copilotSymbol: document.getElementById("copilotSymbol"),
  copilotPrompt: document.getElementById("copilotPrompt"),
  copilotStatus: document.getElementById("copilotStatus"),
  copilotStatusNote: document.getElementById("copilotStatusNote"),
  copilotResult: document.getElementById("copilotResult"),
  resetCopilot: document.getElementById("resetCopilot"),
  briefingStream: document.getElementById("briefingStream")
};

let trades = loadTrades();
let previewUrl = "";

function loadTrades() {
  const saved = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
  return saved.map(normalizeTrade);
}

function normalizeTrade(raw) {
  const trade = {
    id: raw.id || uid(),
    date: raw.date || "",
    symbol: String(raw.symbol || "").toUpperCase(),
    instrument: raw.instrument || "forex",
    dir: raw.dir === "Short" ? "Short" : "Long",
    size: Number(raw.size) || 1,
    contract: Number(raw.contract) || "",
    entry: Number(raw.entry) || 0,
    exit: Number(raw.exit) || 0,
    notes: raw.notes || ""
  };

  const storedPnl = Number(raw.pnl);
  trade.pnl = Number.isFinite(storedPnl) ? storedPnl : calculatePnl(trade);
  return trade;
}

function uid() {
  return "t_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function roundToCents(value) {
  return Number(value.toFixed(2));
}

function calculatePnl(trade) {
  const entry = Number(trade.entry);
  const exit = Number(trade.exit);
  const size = Number(trade.size) || 1;
  const directionMultiplier = trade.dir === "Long" ? 1 : -1;
  const diff = (exit - entry) * directionMultiplier;

  if (trade.instrument === "forex") {
    const upperSymbol = String(trade.symbol || "").toUpperCase();
    const pipSize = upperSymbol.includes("JPY") ? 0.01 : 0.0001;
    const pips = diff / pipSize;
    return roundToCents(pips * 10 * size);
  }

  if (trade.instrument === "gold") return roundToCents(diff * size * 100);
  if (trade.instrument === "indices" || trade.instrument === "crypto") return roundToCents(diff * size);

  const contract = Number(trade.contract) || 1;
  return roundToCents(diff * size * contract);
}

function saveTrades() {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(trades));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return map[char];
  });
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatSigned(value) {
  const numeric = Number(value) || 0;
  if (numeric === 0) return "0.00";
  return (numeric > 0 ? "+" : "-") + formatNumber(Math.abs(numeric));
}

function listMarkup(items) {
  if (!Array.isArray(items) || !items.length) return "<p>None noted.</p>";
  return "<ul>" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function paragraphMarkup(text) {
  return String(text || "")
    .split(/\n+/)
    .filter(Boolean)
    .map((block) => "<p>" + escapeHtml(block.trim()) + "</p>")
    .join("");
}

function statusClass(mode) {
  if (mode === "ready") return "status-badge status-ready";
  if (mode === "error") return "status-badge status-error";
  return "status-badge status-wait";
}

function setStatus(node, mode, label) {
  node.className = statusClass(mode);
  node.textContent = label;
}

function signalClass(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("buy") || text.includes("bull")) return "signal-buy";
  if (text.includes("sell") || text.includes("bear")) return "signal-sell";
  if (text.includes("wait") || text.includes("neutral")) return "signal-wait";
  return "signal-mixed";
}

function showCustomField() {
  const isCustom = els.instrument.value === "custom";
  els.contractWrap.hidden = !isCustom;
  els.contract.disabled = !isCustom;
  if (!isCustom) els.contract.value = "";
}

function updateSummary(total, wins, count, bestTrade) {
  const average = count ? total / count : 0;
  const winRate = count ? Math.round((wins / count) * 100) : 0;

  els.total.textContent = formatSigned(total);
  els.win.textContent = winRate + "%";
  els.count.textContent = String(count);
  els.best.textContent = count ? formatSigned(bestTrade) : "0.00";

  els.heroTotal.textContent = formatSigned(total);
  els.heroWin.textContent = winRate + "%";
  els.heroCount.textContent = String(count);
  els.heroAverage.textContent = formatSigned(average);

  els.metricTotalCard.classList.toggle("metric-positive", total > 0);
  els.metricTotalCard.classList.toggle("metric-negative", total < 0);
  els.metricBestCard.classList.toggle("metric-positive", bestTrade > 0);
  els.metricBestCard.classList.toggle("metric-negative", bestTrade < 0);

  if (!count) {
    els.reviewNote.textContent = "Start with your most recent completed trade. Add the chart read and macro reason behind it, then your workbook begins to compound in value.";
    return;
  }

  if (winRate >= 60 && total > 0) {
    els.reviewNote.textContent = "Performance is healthy. Keep checking whether those results are coming from repeatable execution or a few oversized wins.";
    return;
  }

  if (winRate < 45 && count >= 5) {
    els.reviewNote.textContent = "The win rate is under pressure. Compare losing trades with the chart and macro desks to see whether timing, context, or discipline is breaking down.";
    return;
  }

  els.reviewNote.textContent = "The record is balanced enough to study patterns. Review what your best and weakest trades share before changing strategy rules.";
}

function render() {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    els.rows.innerHTML = '<tr><td colspan="9" class="empty">No trades logged yet. Add your first completed trade to start building a real workbook history.</td></tr>';
  } else {
    els.rows.innerHTML = sorted.map((trade) => {
      const marketClass = "pill pill-market pill-" + escapeHtml(trade.instrument);
      const sideClass = trade.dir === "Long" ? "pill-long" : "pill-short";
      const pnlClass = trade.pnl >= 0 ? "pnl pnl-pos mono" : "pnl pnl-neg mono";
      return `
        <tr>
          <td class="mono" data-label="Date">${escapeHtml(trade.date)}</td>
          <td data-label="Symbol">
            <div class="symbol-cell">
              <strong>${escapeHtml(trade.symbol)}</strong>
              <span class="subtle">${escapeHtml(trade.notes ? "Notes added" : "No notes")}</span>
            </div>
          </td>
          <td data-label="Market"><span class="${marketClass}">${escapeHtml(instrumentLabels[trade.instrument] || "Custom")}</span></td>
          <td data-label="Side"><span class="pill ${sideClass}">${escapeHtml(trade.dir)}</span></td>
          <td class="mono" data-label="Size">${formatNumber(trade.size)}</td>
          <td class="mono" data-label="Entry">${formatNumber(trade.entry)}</td>
          <td class="mono" data-label="Exit">${formatNumber(trade.exit)}</td>
          <td class="${pnlClass}" data-label="P&L">${formatSigned(trade.pnl)}</td>
          <td data-label="Actions">
            <div class="actions">
              <button class="btn btn-link" type="button" data-action="edit" data-id="${escapeHtml(trade.id)}">Edit</button>
              <button class="btn btn-link" type="button" data-action="delete" data-id="${escapeHtml(trade.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  const total = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const bestTrade = trades.length ? Math.max(...trades.map((trade) => trade.pnl)) : 0;

  updateSummary(total, wins, trades.length, bestTrade);
}

function fillForm(trade) {
  els.tradeId.value = trade.id;
  els.date.value = trade.date;
  els.symbol.value = trade.symbol;
  els.instrument.value = trade.instrument;
  els.dir.value = trade.dir;
  els.size.value = trade.size;
  els.contract.value = trade.contract || "";
  els.entry.value = trade.entry;
  els.exit.value = trade.exit;
  els.notes.value = trade.notes || "";
  showCustomField();

  els.formTitle.textContent = "Edit Trade";
  els.formSubtitle.textContent = "Update the entry so the workbook reflects the trade exactly as it was managed.";
  els.saveButton.textContent = "Update Trade";
  els.formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  els.form.reset();
  els.tradeId.value = "";
  els.date.value = todayValue();
  els.instrument.value = "forex";
  els.dir.value = "Long";
  els.size.value = "1";
  els.contract.value = "";
  els.formTitle.textContent = "Add Trade";
  els.formSubtitle.textContent = "Log the position details immediately after execution so your review stays accurate.";
  els.saveButton.textContent = "Save Trade";
  showCustomField();
}

function removeTrade(id) {
  const trade = trades.find((item) => item.id === id);
  if (!trade) return;

  const approved = confirm("Delete the journal entry for " + trade.symbol + " on " + trade.date + "?");
  if (!approved) return;

  trades = trades.filter((item) => item.id !== id);
  saveTrades();
  render();

  if (els.tradeId.value === id) {
    resetForm();
  }
}

function addBriefingEntry(entry) {
  if (!els.briefingStream) return;

  const empty = els.briefingStream.querySelector(".stream-empty");
  if (empty) empty.remove();

  const signalBadge = entry.signal
    ? `<div class="stream-chip ${signalClass(entry.signal)}">${escapeHtml(entry.signal)}</div>`
    : "";

  const bullets = Array.isArray(entry.bullets) && entry.bullets.length
    ? `<ul class="stream-points">${entry.bullets.map((item) => "<li>" + escapeHtml(item) + "</li>").join("")}</ul>`
    : "";

  const metaChips = Array.isArray(entry.meta) && entry.meta.length
    ? `<div class="stream-meta">${entry.meta.map((item) => `<div class="stream-chip">${escapeHtml(item)}</div>`).join("")}${signalBadge}</div>`
    : `<div class="stream-meta">${signalBadge}</div>`;

  const card = document.createElement("article");
  card.className = "stream-item";
  card.innerHTML = `
    <div class="stream-head">
      <div class="stream-label">${escapeHtml(entry.type)}</div>
      <div class="stream-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
    <h4 class="stream-title">${escapeHtml(entry.title)}</h4>
    <p class="stream-copy">${escapeHtml(entry.summary)}</p>
    ${bullets}
    ${metaChips}
  `;

  els.briefingStream.prepend(card);
}

async function refreshServerStatus() {
  setStatus(els.aiConfigStatus, "wait", "Checking engine");
  els.aiConfigNote.textContent = "Looking for backend configuration and model settings.";

  try {
    const response = await fetch("/api/health", {
      headers: { Accept: "application/json" }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || "Unable to read server status.");
    }

    serverModels.chart = data.chartModel || serverModels.chart;
    serverModels.news = data.newsModel || serverModels.news;
    serverModels.copilot = data.copilotModel || serverModels.copilot;

    if (data.configured) {
      setStatus(els.aiConfigStatus, "ready", "Engine online");
      els.aiConfigNote.textContent =
        "SignalPro engine is ready. Chart: " +
        serverModels.chart +
        ". Macro: " +
        serverModels.news +
        ". Copilot: " +
        serverModels.copilot +
        ".";
    } else {
      setStatus(els.aiConfigStatus, "wait", "Engine not configured");
      els.aiConfigNote.textContent = "The backend is online but still needs a valid OpenAI key and billing on the server.";
    }
  } catch (error) {
    setStatus(els.aiConfigStatus, "error", "Engine offline");
    els.aiConfigNote.textContent = "Start the backend server so the workspace can reach the AI engine.";
  }
}

function friendlyAiError(message) {
  const text = String(message || "");
  const normalized = text.toLowerCase();

  if (
    normalized.includes("insufficient_quota") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("billing") ||
    normalized.includes("usage limit")
  ) {
    return "The AI engine has hit its billing or quota limit. Add API credits or increase the server account's usage limit, then try again.";
  }

  if (normalized.includes("api key")) {
    return "The backend server is not configured with a working OpenAI key yet.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "The workspace could not reach the AI engine. Check that the backend server is running.";
  }

  return text || "The AI engine could not complete the request.";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function callOpenAI(payload) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ payload })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "AI request failed.");
  }
  return data;
}

function collectOutputText(responseData) {
  if (typeof responseData.output_text === "string" && responseData.output_text.trim()) {
    return responseData.output_text.trim();
  }

  const parts = [];
  (responseData.output || []).forEach((message) => {
    (message.content || []).forEach((content) => {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
      }
    });
  });
  return parts.join("\n").trim();
}

function collectAnnotations(responseData) {
  const seen = new Set();
  const annotations = [];

  (responseData.output || []).forEach((message) => {
    (message.content || []).forEach((content) => {
      (content.annotations || []).forEach((annotation) => {
        const url = annotation.url || annotation.target_url || "";
        if (!url || seen.has(url)) return;
        seen.add(url);
        annotations.push({
          url,
          title: annotation.title || annotation.text || annotation.source_title || url
        });
      });
    });
  });

  return annotations;
}

function renderChartAnalysis(result, symbol, timeframe) {
  const confidence = Number(result.confidence) || 0;
  const signalStyle = signalClass(result.signal);

  els.chartResult.className = "";
  els.chartResult.innerHTML = `
    <div class="result-header">
      <div class="result-title">
        <strong>${escapeHtml(symbol)} ${escapeHtml(timeframe)} chart read</strong>
        <div class="result-meta">Scenario-based chart intelligence for structured decision making.</div>
      </div>
      <div class="pill ${signalStyle}">${escapeHtml(result.signal)} | ${Math.round(confidence)}% confidence</div>
    </div>
    <div class="result-grid">
      <div class="result-card"><h4>Market Bias</h4><p>${escapeHtml(result.market_bias)}</p></div>
      <div class="result-card"><h4>Setup Summary</h4><p>${escapeHtml(result.setup_summary)}</p></div>
      <div class="result-card"><h4>Entry Zone</h4><p>${escapeHtml(result.entry_zone)}</p></div>
      <div class="result-card"><h4>Invalidation</h4><p>${escapeHtml(result.invalidation)}</p></div>
      <div class="result-card"><h4>Targets</h4>${listMarkup(result.targets)}</div>
      <div class="result-card"><h4>Confluences</h4>${listMarkup(result.confluences)}</div>
      <div class="result-card"><h4>Risk Notes</h4>${listMarkup(result.risk_notes)}</div>
      <div class="result-card"><h4>Execution Checklist</h4>${listMarkup(result.execution_checklist)}</div>
      <div class="result-card full"><h4>Journal Prompt</h4><p>${escapeHtml(result.journal_prompt)}</p></div>
    </div>
  `;

  addBriefingEntry({
    type: "Chart Vision",
    title: symbol + " " + timeframe + " chart read",
    summary: result.setup_summary,
    bullets: result.execution_checklist.slice(0, 3),
    signal: result.signal,
    meta: [result.market_bias, "Confidence " + Math.round(confidence) + "%"]
  });
}

function renderNewsAnalysis(result, symbol, citations) {
  const confidence = Number(result.confidence) || 0;
  const macroClass = signalClass(result.macro_bias);

  els.newsResult.className = "";
  els.newsResult.innerHTML = `
    <div class="result-header">
      <div class="result-title">
        <strong>${escapeHtml(symbol)} fundamental view</strong>
        <div class="result-meta">Live AI research summary based on current market coverage.</div>
      </div>
      <div class="pill ${macroClass}">${escapeHtml(result.macro_bias)} | ${Math.round(confidence)}% confidence</div>
    </div>
    <div class="result-grid">
      <div class="result-card full"><h4>Summary</h4><p>${escapeHtml(result.summary)}</p></div>
      <div class="result-card"><h4>Bullish Case</h4><p>${escapeHtml(result.bullish_case)}</p></div>
      <div class="result-card"><h4>Bearish Case</h4><p>${escapeHtml(result.bearish_case)}</p></div>
      <div class="result-card"><h4>Key Catalysts</h4>${listMarkup(result.key_catalysts)}</div>
      <div class="result-card"><h4>Risk Watch</h4>${listMarkup(result.risk_watch)}</div>
      <div class="result-card full"><h4>Next Actions</h4>${listMarkup(result.next_actions)}</div>
      <div class="result-card full"><h4>Workbook Prompt</h4><p>${escapeHtml(result.workbook_prompt)}</p></div>
    </div>
  `;

  if (!citations.length) {
    els.newsSources.innerHTML = "";
  } else {
    els.newsSources.innerHTML = `
      <div class="citation-list">
        ${citations.map((citation) => `
          <div class="citation-item">
            <a href="${escapeHtml(citation.url)}" target="_blank" rel="noreferrer">${escapeHtml(citation.title)}</a><br />
            ${escapeHtml(citation.url)}
          </div>
        `).join("")}
      </div>
    `;
  }

  addBriefingEntry({
    type: "Macro Radar",
    title: symbol + " fundamental view",
    summary: result.summary,
    bullets: result.key_catalysts.slice(0, 3),
    signal: result.macro_bias,
    meta: [els.newsHorizon.value, "Confidence " + Math.round(confidence) + "%"]
  });
}

function renderCopilotAnalysis(result, topic, mode) {
  const stanceClass = signalClass(result.stance);

  els.copilotResult.innerHTML = `
    <div class="result-header">
      <div class="result-title">
        <strong>${escapeHtml(result.response_title)}</strong>
        <div class="result-meta">${escapeHtml(topic)} | ${escapeHtml(mode.replace("-", " "))}</div>
      </div>
      <div class="pill ${stanceClass}">${escapeHtml(result.stance)}</div>
    </div>
    ${paragraphMarkup(result.summary)}
    <div class="result-grid" style="margin-top:16px;">
      <div class="result-card"><h4>Key Points</h4>${listMarkup(result.key_points)}</div>
      <div class="result-card"><h4>Risk Alerts</h4>${listMarkup(result.risk_alerts)}</div>
      <div class="result-card full"><h4>Next Steps</h4>${listMarkup(result.next_steps)}</div>
      <div class="result-card full"><h4>Follow-Up Prompt</h4><p>${escapeHtml(result.follow_up_prompt)}</p></div>
    </div>
  `;

  addBriefingEntry({
    type: "Desk Copilot",
    title: result.response_title,
    summary: result.summary,
    bullets: result.next_steps.slice(0, 3),
    signal: result.stance,
    meta: [topic, mode.replace("-", " ")]
  });
}

function resetChartDesk() {
  els.chartForm.reset();

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  els.chartPreview.innerHTML = "Upload a screenshot to inspect structure, momentum, and execution quality.";
  els.chartResult.className = "result-empty";
  els.chartResult.textContent = "No chart analysis yet.";
  setStatus(els.chartStatus, "wait", "Awaiting screenshot");
  els.chartStatusNote.textContent = "The AI returns a conditional trade read, not a guaranteed signal.";
}

function resetNewsDesk() {
  els.newsForm.reset();
  els.newsHorizon.value = "Intraday";
  els.newsResult.className = "result-empty";
  els.newsResult.textContent = "No fundamental analysis yet.";
  els.newsSources.innerHTML = "";
  setStatus(els.newsStatus, "wait", "Awaiting query");
  els.newsStatusNote.textContent = "This agent searches current web coverage and summarizes the market implications.";
}

function resetCopilotDesk() {
  els.copilotForm.reset();
  els.copilotMode.value = "trade-plan";
  els.copilotResult.innerHTML = "<p>No copilot response yet.</p>";
  setStatus(els.copilotStatus, "wait", "Ready for prompt");
  els.copilotStatusNote.textContent = "Use this as your fast AI assistant for planning, review, and market questions.";
}

function updateChartPreview() {
  const file = els.chartImage.files[0];
  if (!file) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
    els.chartPreview.textContent = "Upload a screenshot to inspect structure, momentum, and execution quality.";
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  els.chartPreview.innerHTML = `<img alt="Chart preview" src="${previewUrl}" />`;
}

async function analyzeChart(event) {
  event.preventDefault();
  const file = els.chartImage.files[0];
  if (!file) {
    setStatus(els.chartStatus, "error", "Screenshot required");
    els.chartStatusNote.textContent = "Add a chart image before running Chart Vision.";
    return;
  }

  setStatus(els.chartStatus, "wait", "Analyzing chart");
  els.chartStatusNote.textContent = "Sending the screenshot to SignalPro's chart engine.";

  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    const payload = {
      model: serverModels.chart,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "chart_signal_report",
          strict: true,
          schema: chartSchema
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are SignalPro Chart Vision, a disciplined trading workbook assistant. Analyze chart screenshots and return a conditional, educational market read. Do not promise outcomes. The signal must be one of: Buy Setup, Sell Setup, Wait, or No Clear Edge."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this chart screenshot for " +
                els.chartSymbol.value.trim().toUpperCase() +
                " on the " +
                els.chartTimeframe.value.trim() +
                " timeframe. Trader context: " +
                (els.chartNotes.value.trim() || "None provided.") +
                " Focus on trend, structure, momentum, support/resistance, liquidity context, and whether the setup is tradable now or should be left alone."
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ]
    };

    const responseData = await callOpenAI(payload);
    const parsed = JSON.parse(collectOutputText(responseData));
    renderChartAnalysis(parsed, els.chartSymbol.value.trim().toUpperCase(), els.chartTimeframe.value.trim());
    setStatus(els.chartStatus, "ready", "Chart analysis ready");
    els.chartStatusNote.textContent = "Chart Vision finished. Review the setup conditions before acting.";
  } catch (error) {
    setStatus(els.chartStatus, "error", "Chart analysis failed");
    els.chartStatusNote.textContent = friendlyAiError(error.message);
    els.chartResult.className = "result-empty";
    els.chartResult.textContent = "Unable to generate chart analysis right now.";
  }
}

async function analyzeNews(event) {
  event.preventDefault();
  const symbol = els.newsSymbol.value.trim().toUpperCase();
  if (!symbol) {
    setStatus(els.newsStatus, "error", "Asset required");
    els.newsStatusNote.textContent = "Add a symbol or asset before running Macro Radar.";
    return;
  }

  setStatus(els.newsStatus, "wait", "Scanning live news");
  els.newsStatusNote.textContent = "Macro Radar is searching current market coverage for " + symbol + ".";

  try {
    const payload = {
      model: serverModels.news,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "fundamental_news_report",
          strict: true,
          schema: newsSchema
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are SignalPro Macro Radar, a macro and fundamental trading analyst. Use web search to gather recent market news, macro catalysts, policy signals, and risk sentiment relevant to the requested asset. Return concise trader-focused analysis with balanced bullish and bearish cases."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze the latest fundamental news for " +
                symbol +
                ". Trading horizon: " +
                els.newsHorizon.value +
                ". Focus: " +
                (els.newsFocus.value.trim() || "all major current catalysts") +
                ". Extra notes: " +
                (els.newsNotes.value.trim() || "None.") +
                " Build the output for a professional personal trading workbook."
            }
          ]
        }
      ]
    };

    const responseData = await callOpenAI(payload);
    const parsed = JSON.parse(collectOutputText(responseData));
    const citations = collectAnnotations(responseData);
    renderNewsAnalysis(parsed, symbol, citations);
    setStatus(els.newsStatus, "ready", "Macro analysis ready");
    els.newsStatusNote.textContent = "Macro Radar finished. Verify major event timing before using the bias.";
  } catch (error) {
    setStatus(els.newsStatus, "error", "Macro analysis failed");
    els.newsStatusNote.textContent = friendlyAiError(error.message);
    els.newsResult.className = "result-empty";
    els.newsResult.textContent = "Unable to generate fundamental analysis right now.";
    els.newsSources.innerHTML = "";
  }
}

async function analyzeCopilot(event) {
  event.preventDefault();
  const topic = els.copilotSymbol.value.trim();
  const prompt = els.copilotPrompt.value.trim();

  if (!topic || !prompt) {
    setStatus(els.copilotStatus, "error", "Prompt required");
    els.copilotStatusNote.textContent = "Add a topic and a prompt before asking Desk Copilot.";
    return;
  }

  setStatus(els.copilotStatus, "wait", "Thinking");
  els.copilotStatusNote.textContent = "Desk Copilot is preparing a structured response.";

  try {
    const mode = els.copilotMode.value;
    const payload = {
      model: serverModels.copilot,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "copilot_workspace_reply",
          strict: true,
          schema: copilotSchema
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are SignalPro Desk Copilot. Help a trader think clearly, structure decisions, and avoid overconfidence. Be direct, practical, and professional. If web search is available, use it when current market context matters."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Mode: " +
                mode +
                ". Topic: " +
                topic +
                ". Request: " +
                prompt +
                ". Return a concise but useful trader response with key points, risk alerts, and next steps."
            }
          ]
        }
      ]
    };

    if (mode === "market-question") {
      payload.tools = [{ type: "web_search" }];
    }

    const responseData = await callOpenAI(payload);
    const parsed = JSON.parse(collectOutputText(responseData));
    renderCopilotAnalysis(parsed, topic, mode);
    setStatus(els.copilotStatus, "ready", "Copilot response ready");
    els.copilotStatusNote.textContent = "Desk Copilot finished. Use it as structured thinking support, not as blind instruction.";
  } catch (error) {
    setStatus(els.copilotStatus, "error", "Copilot failed");
    els.copilotStatusNote.textContent = friendlyAiError(error.message);
    els.copilotResult.innerHTML = "<p>Unable to generate a copilot response right now.</p>";
  }
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const trade = {
    id: els.tradeId.value || uid(),
    date: els.date.value,
    symbol: els.symbol.value.trim().toUpperCase(),
    instrument: els.instrument.value,
    dir: els.dir.value,
    size: Number(els.size.value) || 1,
    contract: els.instrument.value === "custom" ? Number(els.contract.value) || "" : "",
    entry: Number(els.entry.value),
    exit: Number(els.exit.value),
    notes: els.notes.value.trim()
  };

  trade.pnl = calculatePnl(trade);

  const existingIndex = trades.findIndex((item) => item.id === trade.id);
  if (existingIndex >= 0) {
    trades[existingIndex] = trade;
  } else {
    trades.push(trade);
  }

  saveTrades();
  render();
  resetForm();
});

els.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (!id) return;

  if (action === "edit") {
    const trade = trades.find((item) => item.id === id);
    if (trade) fillForm(trade);
  }

  if (action === "delete") removeTrade(id);
});

els.clearAll.addEventListener("click", () => {
  if (!trades.length) return;
  if (!confirm("Clear all trades from this browser workbook?")) return;
  trades = [];
  saveTrades();
  render();
  resetForm();
});

els.instrument.addEventListener("change", showCustomField);
els.resetForm.addEventListener("click", resetForm);
els.chartForm.addEventListener("submit", analyzeChart);
els.resetChart.addEventListener("click", resetChartDesk);
els.chartImage.addEventListener("change", updateChartPreview);
els.newsForm.addEventListener("submit", analyzeNews);
els.resetNews.addEventListener("click", resetNewsDesk);
els.copilotForm.addEventListener("submit", analyzeCopilot);
els.resetCopilot.addEventListener("click", resetCopilotDesk);

refreshServerStatus();
resetForm();
resetChartDesk();
resetNewsDesk();
resetCopilotDesk();
render();
