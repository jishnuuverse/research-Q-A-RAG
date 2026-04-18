"use strict";

// ── State ─────────────────────────────────────────────────────────────────
let papers  = [];   // [{ name, short, chunks }]
let history = [];   // [{ role, content }]
let busy    = false;

// ── DOM refs ──────────────────────────────────────────────────────────────
const fileInput   = document.getElementById("file-input");
const uploadBtn   = document.getElementById("upload-btn");
const papersList  = document.getElementById("papers-list");
const messagesEl  = document.getElementById("messages");
const inputEl     = document.getElementById("input");
const sendBtn     = document.getElementById("send-btn");
const badge       = document.getElementById("badge");
const chatSub     = document.getElementById("chat-sub");
const progressBar = document.getElementById("progress-bar");
const hint        = document.getElementById("hint");
const emptyState  = document.getElementById("empty-state");

// ── Upload ────────────────────────────────────────────────────────────────
uploadBtn.addEventListener("click", () => {
  if (papers.length >= 3) {
    alert("Maximum 3 PDFs allowed. Remove one first.");
    return;
  }
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.value = "";
  await uploadFile(file);
});

async function uploadFile(file) {
  setLoading(true);
  const form = new FormData();
  form.append("file", file);

  try {
    const res  = await fetch("/upload", { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Upload failed", "error");
      return;
    }

    papers.push(data.paper);
    renderPapers();
    updateUI();
    showToast(`"${data.paper.short}" loaded — ${data.paper.chunks} chunks indexed`, "success");
  } catch (e) {
    showToast("Network error during upload", "error");
  } finally {
    setLoading(false);
  }
}

// ── Sidebar rendering ─────────────────────────────────────────────────────
function renderPapers() {
  if (!papers.length) {
    papersList.innerHTML = '<div class="no-papers">No papers yet.<br/>Upload up to 3 PDFs.</div>';
    return;
  }

  papersList.innerHTML = papers
    .map(
      (p, i) => `
      <div class="paper-item">
        <div class="paper-item-icon">
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="paper-item-info">
          <div class="paper-item-name" title="${p.name}">${p.short}</div>
          <div class="paper-item-meta">${p.chunks} chunks indexed</div>
        </div>
        <button class="remove-btn" onclick="removePaper(${i})" title="Remove paper">✕</button>
      </div>`
    )
    .join("");
}

async function removePaper(idx) {
  const paper = papers[idx];
  try {
    await fetch(`/remove/${encodeURIComponent(paper.name)}`, { method: "DELETE" });
  } catch (_) {}
  papers.splice(idx, 1);
  renderPapers();
  updateUI();
}

function updateUI() {
  const n = papers.length;
  badge.textContent = `${n} paper${n !== 1 ? "s" : ""}`;
  uploadBtn.disabled = n >= 3;

  if (n > 0) {
    chatSub.textContent = papers.map((p) => p.short).join(", ");
    sendBtn.disabled = false;
    hint.style.display = "none";
  } else {
    chatSub.textContent = "Upload papers to begin";
    sendBtn.disabled = true;
    hint.style.display = "block";
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────
async function sendMessage() {
  const query = inputEl.value.trim();
  if (!query || busy || !papers.length) return;

  inputEl.value = "";
  autoResize();
  busy = true;
  sendBtn.disabled = true;

  hideEmpty();
  appendMsg("user", query);
  history.push({ role: "user", content: query });

  const thinkEl = appendThinking();

  try {
    const res  = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, history: history.slice(0, -1) }),
    });
    const data = await res.json();

    thinkEl.remove();

    if (!res.ok) {
      appendError(data.error || "Something went wrong");
    } else {
      appendMsg("assistant", data.reply, data.sources || []);
      history.push({ role: "assistant", content: data.reply });
      if (history.length > 12) history = history.slice(-12);
    }
  } catch (e) {
    thinkEl.remove();
    appendError("Network error. Is the server running?");
  }

  busy = false;
  sendBtn.disabled = papers.length === 0;
  scrollBottom();
}

// ── Message helpers ───────────────────────────────────────────────────────
function hideEmpty() {
  if (emptyState) emptyState.style.display = "none";
}

function appendMsg(role, text, sources = []) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  el.appendChild(bubble);

  if (sources.length) {
    const cites = document.createElement("div");
    cites.className = "citations";
    cites.innerHTML = sources
      .map(
        (s) => `
        <div class="citation">
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          ${escapeHtml(s)}
        </div>`
      )
      .join("");
    el.appendChild(cites);
  }

  messagesEl.appendChild(el);
  scrollBottom();
  return el;
}

function appendThinking() {
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.innerHTML = `
    <div class="thinking">
      <div class="dots">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
      Searching papers…
    </div>`;
  messagesEl.appendChild(el);
  scrollBottom();
  return el;
}

function appendError(msg) {
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.innerHTML = `<div class="error-bubble">⚠ ${escapeHtml(msg)}</div>`;
  messagesEl.appendChild(el);
  scrollBottom();
}

// ── Chip suggestions ──────────────────────────────────────────────────────
function useChip(el) {
  if (!papers.length) {
    alert("Upload a PDF first.");
    return;
  }
  inputEl.value = el.textContent.trim();
  sendMessage();
}

// ── Toast notifications ───────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === "error" ? "#c33" : "#0C447C"};
    color: #fff; font-size: 13px; padding: 9px 18px;
    border-radius: 8px; z-index: 9999;
    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    animation: fadeIn 0.2s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Utility ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(on) {
  progressBar.className = on ? "progress-bar loading" : "progress-bar";
}

function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
}

// ── Event listeners ───────────────────────────────────────────────────────
sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener("input", autoResize);

// ── Init ──────────────────────────────────────────────────────────────────
(async () => {
  try {
    const res  = await fetch("/papers");
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      papers = data;
      renderPapers();
      updateUI();
    }
  } catch (_) {}
})();
