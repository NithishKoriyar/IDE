// ═══════════════════════════════════════════════════════════════
//  CYPH·IDE — Core
// ═══════════════════════════════════════════════════════════════

// ── SNIPPETS DATA ───────────────────────────────────────────────
const SNIPS = {
  clg: {
    t: "console.log()",
    c: "console.log(|);",
    d: "Log a value to the console.\nPerfect for debugging your code.",
  },
  fn: {
    t: "function",
    c: "function name(|) {\n  \n}",
    d: "Declares a named function.\nCall it by its name anywhere below.",
  },
  afn: {
    t: "arrow fn",
    c: "const name = (|) => {\n  \n};",
    d: "Arrow function — modern syntax.\nGreat for callbacks and short logic.",
  },
  if: {
    t: "if",
    c: "if (|) {\n  \n}",
    d: "Runs code only when condition is true.",
  },
  ife: {
    t: "if/else",
    c: "if (|) {\n  \n} else {\n  \n}",
    d: "Branches between two code paths.",
  },
  for: {
    t: "for loop",
    c: "for (let i = 0; i < |arr.length; i++) {\n  \n}",
    d: "Classic loop — runs n times.\nUse i as the counter variable.",
  },
  fe: {
    t: "forEach",
    c: "|arr.forEach((item) => {\n  \n});",
    d: "Loops over every item in an array.\nSimpler than a for loop.",
  },
  map: {
    t: "array.map",
    c: "|arr.map((item) => {\n  return item;\n});",
    d: "Transforms each array item.\nReturns a NEW array.",
  },
  filt: {
    t: "array.filter",
    c: "|arr.filter((item) => {\n  return true;\n});",
    d: "Keeps only matching items.\nReturns a new filtered array.",
  },
  red: {
    t: "array.reduce",
    c: "|arr.reduce((acc, item) => {\n  return acc;\n}, 0);",
    d: "Reduces array to a single value.\nUseful for sums and aggregations.",
  },
  async: {
    t: "async/await",
    c: "async function |name() {\n  try {\n    const result = await fetch();\n  } catch (err) {\n    console.error(err);\n  }\n}",
    d: "Async function with error handling.\nUse await inside to pause for Promises.",
  },
  try: {
    t: "try/catch",
    c: "try {\n  |\n} catch (err) {\n  console.error(err);\n}",
    d: "Graceful error handling.\nCode in catch runs if try throws.",
  },
  cls: {
    t: "class",
    c: "class |Name {\n  constructor() {\n    \n  }\n\n  method() {\n    \n  }\n}",
    d: "Defines a class (blueprint).\nCreate instances with new Name().",
  },
  prom: {
    t: "Promise",
    c: "new Promise((resolve, reject) => {\n  |\n});",
    d: "Wraps async operations.\nCall resolve() to succeed, reject() to fail.",
  },
  api: {
    t: "fetch API",
    c: "fetch('|https://api.example.com/data')\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));",
    d: "HTTP request using the Fetch API.\nReplace the URL with your endpoint.",
  },
  sw: {
    t: "switch",
    c: "switch (|val) {\n  case 1:\n    break;\n  case 2:\n    break;\n  default:\n    \n}",
    d: "Branches on a specific value.\nAlways include a default case.",
  },
  setT: {
    t: "setTimeout",
    c: "setTimeout(() => {\n  |\n}, 1000);",
    d: "Runs code after a delay.\n1000 = 1 second.",
  },
  setI: {
    t: "setInterval",
    c: "const timer = setInterval(() => {\n  |\n}, 1000);\n// clearInterval(timer) to stop",
    d: "Repeats code every N milliseconds.",
  },
  imp: {
    t: "import",
    c: "import | from '';",
    d: "ES Module import syntax.",
  },
  exp: {
    t: "export",
    c: "export default |function name() {\n  \n}",
    d: "Export a function or value.",
  },
  arr: {
    t: "=>",
    c: " => |",
    d: "Arrow function shorthand.\nUsed in callbacks and lambdas.",
  },
};

// ── FILES ───────────────────────────────────────────────────────
const FILES = [
  {
    name: "main.js",
    content: `// ┌─────────────────────────────────────────────┐
// │  CYPH·IDE — JavaScript Playground            │
// │  Tap snippets above keyboard to insert code  │
// └─────────────────────────────────────────────┘

// ── Variables & Types ─────────────────────────
const name = 'Hacker';
let level = 99;
const skills = ['JS', 'CSS', 'HTML', 'Node'];

// ── Functions ─────────────────────────────────
const greet = (user) => \`Welcome, \${user}!\`;
console.log(greet(name));

// ── Array methods ─────────────────────────────
const nums = [1, 2, 3, 4, 5];
const doubled = nums.map(n => n * 2);
const evens = nums.filter(n => n % 2 === 0);
const sum = nums.reduce((a, b) => a + b, 0);

console.log('Doubled:', doubled);
console.log('Evens:', evens);
console.log('Sum:', sum);

// ── Objects ───────────────────────────────────
const user = { name, level, skills };
console.log(\`\${user.name} | Level \${user.level}\`);
console.log('Skills:', user.skills.join(', '));

// Press ▶ RUN to execute ───────────────────────
`,
  },
  {
    name: "scratch.js",
    content: `// Scratch pad — experiment freely!\n\n`,
  },
];

let activeFile = 0;
let editor;
let pressTimers = {};

// ── INIT ────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("splash").classList.add("fade");
    setTimeout(() => document.getElementById("splash").remove(), 500);
  }, 1600);

  initEditor();
  initSnippets();
  initTabs();
  initConsole();
  initToolbar();
  initModal();
  initSettings();
});

function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById("cm-root"), {
    mode: "javascript",
    theme: "cyberterm",
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    styleActiveLine: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    inputStyle: "contenteditable",
    extraKeys: {
      "Ctrl-Enter": runCode,
      "Ctrl-Space": "autocomplete",
      "Ctrl-Z": () => editor.undo(),
      "Ctrl-Y": () => editor.redo(),
      "Ctrl-/": () => editor.execCommand("toggleComment"),
      Tab: (cm) => cm.execCommand("indentMore"),
      "Shift-Tab": (cm) => cm.execCommand("indentLess"),
    },
    hintOptions: {
      hint: (cm, options) => {
        const jsHints = CodeMirror.hint.javascript(cm, options) || { list: [] };
        
        // Scan current file for user-defined words / variable names
        const wordRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
        const content = cm.getValue();
        const words = new Set();
        let match;
        while ((match = wordRegex.exec(content)) !== null) {
          words.add(match[0]);
        }
        
        const cur = cm.getCursor();
        const token = cm.getTokenAt(cur);
        const prefix = token.string.trim();
        
        const suggestions = [];
        if (prefix) {
          Array.from(words).forEach(w => {
            if (w.startsWith(prefix) && w !== prefix) {
              suggestions.push(w);
            }
          });
        }
        
        const mergedList = Array.from(new Set([...suggestions, ...jsHints.list]));
        
        return {
          list: mergedList,
          from: jsHints.from || CodeMirror.Pos(cur.line, token.start),
          to: jsHints.to || CodeMirror.Pos(cur.line, token.end)
        };
      }
    }
  });

  editor.setValue(FILES[activeFile].content);

  const inp = editor.getInputField();
  inp.setAttribute("autocomplete", "off");
  inp.setAttribute("autocorrect", "off");
  inp.setAttribute("autocapitalize", "off");
  inp.setAttribute("spellcheck", "false");

  editor.on("cursorActivity", updateStatus);
  editor.on("change", () => {
    FILES[activeFile].content = editor.getValue();
    updateStatus();
    markDirty(activeFile);
  });

  editor.on("inputRead", (cm, change) => {
    const text = change.text ? change.text.join("") : "";
    // On mobile virtual keyboards, Gboard/iOS keyboard often triggers multi-character inputs
    // or does not include standard "+input" origins. We match any word/dot character.
    if (/[a-zA-Z0-9_\.]$/.test(text)) {
      cm.showHint({ 
        completeSingle: false,
        container: document.body
      });
    }
  });

  editor.focus();
  updateStatus();
}

function updateStatus() {
  const c = editor.getCursor();
  document.getElementById("sb-cursor").textContent =
    `Ln ${c.line + 1}, Col ${c.ch + 1}`;
  document.getElementById("sb-chars").textContent =
    `${editor.getValue().length} chars`;
}

// ── SNIPPETS ────────────────────────────────────────────────────
function initSnippets() {
  document.querySelectorAll("#snip-bar .skey:not(#btn-snippets)").forEach((k) => {
    let lt;
    let didLongPress = false;

    k.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        vibe(12);
        didLongPress = false;
        lt = setTimeout(() => {
          showTip(k.dataset.s, k);
          didLongPress = true;
        }, 500);
      },
      { passive: false },
    );

    k.addEventListener("touchend", (e) => {
      e.preventDefault();
      clearTimeout(lt);
      if (!didLongPress) {
        insertSnip(k.dataset.s);
      }
    });

    k.addEventListener("mousedown", (e) => {
      e.preventDefault();
      insertSnip(k.dataset.s);
    });
  });
}

function insertSnip(name) {
  const s = SNIPS[name];
  if (!s) return;
  editor.focus();

  const cur = editor.getCursor();
  const line = editor.getLine(cur.line);
  const baseIndent = (line.match(/^\s*/) || [""])[0];

  const raw = s.c.replace("|", "");
  const lines = raw.split("\n");
  const indented = lines
    .map((l, i) => (i === 0 ? l : baseIndent + l))
    .join("\n");

  editor.replaceSelection(indented);

  const pipeIdx = s.c.indexOf("|");
  if (pipeIdx >= 0) {
    const before = s.c.slice(0, pipeIdx);
    const bLines = before.split("\n");
    const targetLine = cur.line + bLines.length - 1;
    const targetCh =
      bLines.length === 1
        ? cur.ch + bLines[0].length
        : baseIndent.length + bLines[bLines.length - 1].length;
    editor.setCursor({ line: targetLine, ch: targetCh });
  }

  vibe([5, 20, 5]);
}

function showTip(name, el) {
  const s = SNIPS[name];
  if (!s) return;
  const tip = document.getElementById("tip");
  document.getElementById("tip-title").textContent = s.t;
  document.getElementById("tip-body").textContent = s.d;

  const kbd = document.getElementById("kbd");
  if (kbd) {
    const kbdY = kbd.getBoundingClientRect().top;
    tip.style.bottom = (window.innerHeight - kbdY + 8) + "px";
  } else {
    tip.style.bottom = "80px";
  }
  tip.classList.add("show");
  setTimeout(() => tip.classList.remove("show"), 2600);
  vibe([8, 30, 8]);
}

// ── TABS ────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll("#tabs .tab[data-idx]").forEach((t) => {
    t.addEventListener("click", () => switchFile(+t.dataset.idx));
  });
  document.getElementById("tab-new").addEventListener("click", newFile);
}

function switchFile(idx) {
  if (idx >= FILES.length) return;
  FILES[activeFile].content = editor.getValue();
  activeFile = idx;
  editor.setValue(FILES[activeFile].content);
  editor.setCursor({ line: 0, ch: 0 });
  document.querySelectorAll("#tabs .tab[data-idx]").forEach((t) => {
    t.classList.toggle("active", +t.dataset.idx === idx);
    t.classList.remove("dirty");
  });
  editor.focus();
  updateStatus();
}

function newFile() {
  const idx = FILES.length;
  FILES.push({ name: `file${idx}.js`, content: `// file${idx}.js\n\n` });
  const t = document.createElement("div");
  t.className = "tab";
  t.dataset.idx = idx;
  t.innerHTML = `<span class="tdot"></span>&nbsp;file${idx}.js`;
  t.addEventListener("click", () => switchFile(idx));
  document.getElementById("tab-new").before(t);
  switchFile(idx);
}

function markDirty(idx) {
  const t = document.querySelector(`#tabs .tab[data-idx="${idx}"]`);
  if (t && !t.classList.contains("active")) t.classList.add("dirty");
}

// ── CONSOLE ─────────────────────────────────────────────────────
let lineCount = 0;

function initConsole() {
  document
    .getElementById("console-head")
    .addEventListener("click", toggleConsole);
  document.getElementById("btn-clr").addEventListener("click", (e) => {
    e.stopPropagation();
    clearConsole();
  });

  const cw = document.getElementById("console-wrap");
  let startY, startH;
  document.getElementById("console-head").addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      startH = cw.offsetHeight;
    },
    { passive: true },
  );
  document.getElementById("console-head").addEventListener(
    "touchmove",
    (e) => {
      if (cw.classList.contains("minimized")) return;
      const dy = startY - e.touches[0].clientY;
      const h = Math.min(240, Math.max(24, startH + dy));
      cw.style.height = h + "px";
    },
    { passive: true },
  );
}

function toggleConsole() {
  document.getElementById("console-wrap").classList.toggle("minimized");
}

function clog(text, type = "log") {
  const out = document.getElementById("console-out");
  const d = document.createElement("div");
  d.className = "cline " + type;
  const pfx = {
    log: "›",
    error: "✗",
    warn: "⚠",
    info: "›",
    ok: "✓",
    sys: "·",
  };
  d.innerHTML = `<span class="cpfx">${pfx[type] || "›"}</span><span class="ctext">${escHtml(text)}</span>`;
  out.appendChild(d);
  lineCount++;
  document.getElementById("console-count").textContent = lineCount;
  out.scrollTop = out.scrollHeight;
  document.getElementById("console-wrap").classList.remove("minimized");
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clearConsole() {
  document.getElementById("console-out").innerHTML = "";
  lineCount = 0;
  document.getElementById("console-count").textContent = "0";
  document.getElementById("exec-badge").textContent = "";
}

// ── CODE EXECUTION ───────────────────────────────────────────────
function runCode() {
  clearConsole();
  const code = editor.getValue();
  clog("▶ Executing...", "info");
  const t0 = performance.now();
  const timers = {};

  const conProxy = {
    log: (...a) => clog(a.map(fmtVal).join(" "), "log"),
    error: (...a) => clog(a.map(fmtVal).join(" "), "error"),
    warn: (...a) => clog(a.map(fmtVal).join(" "), "warn"),
    info: (...a) => clog(a.map(fmtVal).join(" "), "info"),
    clear: () => clearConsole(),
    table: (v) => clog(fmtTable(v), "log"),
    dir: (v) => clog(fmtVal(v), "log"),
    count: (l = "default") => {
      timers["c_" + l] = (timers["c_" + l] || 0) + 1;
      clog(`${l}: ${timers["c_" + l]}`, "info");
    },
    time: (l = "default") => {
      timers[l] = performance.now();
    },
    timeEnd: (l = "default") => {
      const ms = performance.now() - (timers[l] || 0);
      clog(`${l}: ${ms.toFixed(3)}ms`, "info");
    },
    group: (l) => clog(`▼ ${l || ""}`, "sys"),
    groupEnd: () => { },
    assert: (ok, ...a) => {
      if (!ok)
        clog("Assertion failed: " + a.map(fmtVal).join(" "), "error");
    },
  };

  try {
    const fn = new Function(
      "console",
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      "Math",
      "Date",
      "JSON",
      "Array",
      "Object",
      "Promise",
      "Error",
      `"use strict";\n${code}`,
    );
    fn(
      conProxy,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      Math,
      Date,
      JSON,
      Array,
      Object,
      Promise,
      Error,
    );
    const ms = (performance.now() - t0).toFixed(2);
    clog(`✓ Done in ${ms}ms`, "ok");
    document.getElementById("exec-badge").textContent = `${ms}ms`;
  } catch (err) {
    const ms = (performance.now() - t0).toFixed(2);
    clog(`${err.name}: ${err.message}`, "error");
    if (err.stack) {
      err.stack
        .split("\n")
        .slice(1, 4)
        .forEach((l) => l.trim() && clog("  " + l.trim(), "error"));
    }
    document.getElementById("exec-badge").textContent = `✗ ${ms}ms`;
  }
}

function fmtVal(v) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "function")
    return `[Function: ${v.name || "(anonymous)"}]`;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function fmtTable(data) {
  if (!Array.isArray(data)) return fmtVal(data);
  return data.map((item, i) => `[${i}] ${fmtVal(item)}`).join("\n");
}

// ── TOOLBAR ─────────────────────────────────────────────────────
function initToolbar() {
  document.getElementById("btn-run").addEventListener("click", runCode);
  document
    .getElementById("btn-undo")
    .addEventListener("click", () => editor.undo());
  document
    .getElementById("btn-redo")
    .addEventListener("click", () => editor.redo());
  const _btnSnips = document.getElementById("btn-snippets");
  if (_btnSnips) _btnSnips.addEventListener("click", openModal);
}

// ── MODAL ────────────────────────────────────────────────────────
function initModal() {
  const list = document.getElementById("modal-list");
  Object.entries(SNIPS).forEach(([key, s]) => {
    const el = document.createElement("div");
    el.className = "modal-item";
    el.innerHTML = `<div class="mi-key">${key}</div><div class="mi-desc">${s.t}</div>`;
    el.addEventListener("click", () => {
      insertSnip(key);
      closeModal();
    });
    list.appendChild(el);
  });
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-bg")) closeModal();
  });
}

function openModal() {
  document.getElementById("modal-bg").classList.add("show");
}
function closeModal() {
  document.getElementById("modal-bg").classList.remove("show");
}

// ── UTILS ────────────────────────────────────────────────────────
function vibe(p) {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch { }
}

// ── PHYSICAL KEYBOARD ────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    runCode();
    e.preventDefault();
  }
});

// ── PREVENT DOUBLE-TAP ZOOM ──────────────────────────────────────
let lastTap = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
  },
  { passive: false },
);

// ── SETTINGS ────────────────────────────────────────────────────
// Default text size is 14px — applied globally to ALL UI text
const DEFAULTS = { textSize: 14 };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("cyph_settings") || "{}");
    return { ...DEFAULTS, ...s };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem("cyph_settings", JSON.stringify(s));
  } catch { }
}

// ── THE KEY FIX: one setProperty call cascades to every element ──
function applySettings(s) {
  // Update --app-font-size on :root — the * { font-size: var(--app-font-size) !important }
  // rule in the stylesheet automatically cascades this to ALL elements:
  // toolbar logo, tab names, buttons, CLEAR button, status bar, console output, etc.
  document.documentElement.style.setProperty(
    "--app-font-size",
    s.textSize + "px",
  );
  if (editor) editor.refresh();

  // Update Settings UI labels
  document.getElementById("editor-size-val").textContent =
    s.textSize + "px";
  document.getElementById("editor-size-slider").value = s.textSize;
}

function initSettings() {
  const s = loadSettings();
  applySettings(s);

  document
    .getElementById("btn-settings")
    .addEventListener("click", openSettings);
  document
    .getElementById("settings-close")
    .addEventListener("click", closeSettings);
  document
    .getElementById("settings-overlay")
    .addEventListener("click", closeSettings);

  const slider = document.getElementById("editor-size-slider");
  slider.addEventListener("input", () => {
    const s = loadSettings();
    s.textSize = +slider.value;
    saveSettings(s);
    applySettings(s);
    vibe(6);
  });
  document
    .getElementById("editor-size-dec")
    .addEventListener("click", () => stepSetting("textSize", -1, 10, 22));
  document
    .getElementById("editor-size-inc")
    .addEventListener("click", () => stepSetting("textSize", +1, 10, 22));

  document
    .getElementById("settings-reset")
    .addEventListener("click", () => {
      saveSettings({ ...DEFAULTS });
      applySettings({ ...DEFAULTS });
      vibe([5, 30, 5]);
    });
}

function stepSetting(key, delta, min, max) {
  const s = loadSettings();
  s[key] = Math.min(max, Math.max(min, s[key] + delta));
  saveSettings(s);
  applySettings(s);
  vibe(8);
}

function openSettings() {
  document.getElementById("settings-drawer").classList.add("open");
  document.getElementById("settings-overlay").classList.add("show");
  vibe(10);
}
function closeSettings() {
  document.getElementById("settings-drawer").classList.remove("open");
  document.getElementById("settings-overlay").classList.remove("show");
}

// ── PWA: SERVICE WORKER ──────────────────────────────────────────
(function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => console.log("[PWA] SW registered, scope:", reg.scope))
    .catch((err) => console.log("[PWA] SW skipped:", err.message));
})();


// ── PWA: INSTALL PROMPT ──────────────────────────────────────────
let _deferredInstall = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredInstall = e;
  setTimeout(() => {
    if (!localStorage.getItem("pwa_dismissed"))
      document.getElementById("pwa-toast").classList.add("show");
  }, 3000);
  document.getElementById("btn-install").classList.add("visible");
});

window.addEventListener("appinstalled", () => {
  _deferredInstall = null;
  document.getElementById("pwa-toast").classList.remove("show");
  document.getElementById("btn-install").classList.remove("visible");
  clog("✓ CYPH·IDE installed as app!", "ok");
});

document
  .getElementById("btn-install")
  .addEventListener("click", triggerInstall);
document
  .getElementById("pwa-install-btn")
  .addEventListener("click", triggerInstall);
document
  .getElementById("pwa-dismiss-btn")
  .addEventListener("click", () => {
    document.getElementById("pwa-toast").classList.remove("show");
    localStorage.setItem("pwa_dismissed", "1");
  });

function triggerInstall() {
  document.getElementById("pwa-toast").classList.remove("show");
  if (_deferredInstall) {
    _deferredInstall.prompt();
    _deferredInstall.userChoice.then((r) => {
      if (r.outcome === "accepted") clog("✓ App install accepted", "ok");
      _deferredInstall = null;
    });
  } else {
    clog('iOS: tap the Share button → "Add to Home Screen"', "info");
  }
}

// ── ONLINE / OFFLINE ─────────────────────────────────────────────
function updateOnlineStatus() {
  document
    .getElementById("offline-banner")
    .classList.toggle("show", !navigator.onLine);
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ── AUTOSAVE ─────────────────────────────────────────────────────
setInterval(() => {
  try {
    FILES[activeFile].content = editor.getValue();
    localStorage.setItem("cyph_files", JSON.stringify(FILES));
  } catch { }
}, 5000);

(function loadSaved() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("cyph_files") || "null",
    );
    if (saved && saved.length)
      saved.forEach((f, i) => {
        if (FILES[i]) FILES[i].content = f.content;
      });
  } catch { }
})();