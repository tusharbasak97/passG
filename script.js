/* PassG — client-side password & passphrase generator with history/favorites */
(function () {
  // Polyfill for requestIdleCallback
  window.requestIdleCallback =
    window.requestIdleCallback ||
    function (cb, options) {
      const start = Date.now();
      return setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
      }, options?.timeout || 1);
    };

  // --- DOM ---
  const $ = (sel) => document.querySelector(sel);
  const lengthEl = $("#length");
  const lengthVal = $("#lengthVal");
  const generateBtn = $("#generateBtn");
  const copyBtn = $("#copyBtn");
  const passwordOutput = $("#passwordOutput");
  const strengthMeter = $("#strengthMeter .meter-fill");
  const strengthText = $("#strengthText");
  const historyList = $("#historyList");
  const clearHistoryBtn = $("#clearHistoryBtn");
  const advancedModeEl = $("#advancedMode");

  // --- storage keys ---
  const LS_HISTORY = "passg_history_v1";

  // --- utils ---
  function randInt(n) {
    return Math.floor(Math.random() * n);
  }
  function pick(str) {
    return str.charAt(randInt(str.length));
  }

  function generatePassword(options) {
    if (advancedModeEl && !advancedModeEl.checked) {
      return generateBasic(options.length);
    }
    return generateUniversal(options.length);
  }

  function generateBasic(len) {
    // Basic mode: include lowercase, uppercase, numbers, symbols
    // Exclude similar (o,0,i,l,1) and ambiguous (~,;:.{}<>[]()/\'`)
    const lowercase = "abcdefghjkmnpqrstuvwxyz"; // exclude i, l, o
    const uppercase = "ABCDEFGHJKMNPQRSTUVWXYZ"; // exclude I, L, O
    const numbers = "23456789"; // exclude 0,1
    const symbolsAll = "!@#$%^&*+-_=?:|"; // exclude ambiguous set ~ ; : . { } < > [ ] ( ) / \\ ' `
    const pool = lowercase + uppercase + numbers + symbolsAll;
    let out = "";
    for (let i = 0; i < len; i++) {
      out += pool.charAt(randInt(pool.length));
    }
    return out;
  }

  function generateUniversal(len) {
    // Ranges: Latin-1, Latin Ext-A, Greek, Cyrillic, Hebrew, Arabic, Devanagari, Math, Hiragana, Katakana, CJK, Emojis
    // Also include standard ASCII (0x21-0x7E) to ensure it's truly universal
    const ranges = [
      { range: [0x0021, 0x007e], group: "ascii" }, // ASCII
      { range: [0x00a1, 0x00ff], group: "latin1" }, // Latin-1
      { range: [0x0100, 0x017f], group: "latinext" }, // Latin Extended-A
      { range: [0x0370, 0x03ff], group: "greek" }, // Greek
      { range: [0x0400, 0x04ff], group: "cyrillic" }, // Cyrillic
      { range: [0x0590, 0x05ff], group: "hebrew" }, // Hebrew
      { range: [0x0600, 0x06ff], group: "arabic" }, // Arabic
      { range: [0x0900, 0x097f], group: "devanagari" }, // Devanagari
      { range: [0x0e00, 0x0e7f], group: "thai" }, // Thai
      { range: [0x1100, 0x11ff], group: "hangul" }, // Hangul Jamo
      { range: [0x2200, 0x22ff], group: "math" }, // Math symbols
      { range: [0x3040, 0x309f], group: "hiragana" }, // Hiragana
      { range: [0x30a0, 0x30ff], group: "katakana" }, // Katakana
      { range: [0x4e00, 0x9fbf], group: "cjk" }, // CJK Unified
      { range: [0x1f300, 0x1f64f], group: "emoji" }, // Emojis
    ];

    let out = "";
    const usedGroups = new Set();
    const usedChars = new Set();

    for (let i = 0; i < len; i++) {
      let attempts = 0;
      let char = "";
      let selectedRange;

      // Try to pick a character with advanced constraints
      while (attempts < 100) {
        // Select a random range
        selectedRange = ranges[randInt(ranges.length)];

        // Skip if this script group was already used (except ASCII which can repeat)
        if (
          usedGroups.has(selectedRange.group) &&
          !["ascii", "latin1", "latinext", "math"].includes(selectedRange.group)
        ) {
          attempts++;
          continue;
        }

        // Generate character from range
        const r = selectedRange.range;
        char = String.fromCodePoint(randInt(r[1] - r[0] + 1) + r[0]);

        // Ensure character hasn't been used at all in this password
        if (usedChars.has(char)) {
          attempts++;
          continue;
        }

        // Valid character found
        break;
      }

      // Fallback if constraints too strict
      if (attempts >= 100) {
        const fallbackRange = ranges[0].range;
        for (let fb = 0; fb < 200; fb++) {
          char = String.fromCodePoint(
            randInt(fallbackRange[1] - fallbackRange[0] + 1) + fallbackRange[0]
          );
          if (!usedChars.has(char)) break;
        }
      }

      out += char;
      usedChars.add(char);
      usedGroups.add(selectedRange.group);
    }

    return out;
  }

  function calculateEntropy(optsOrPwd) {
    // Determine pool size by mode
    const isAdvanced = !(advancedModeEl && !advancedModeEl.checked);
    const pool = isAdvanced
      ? 100000
      : "abcdefghjkmnpqrstuvwxyz".length +
        "ABCDEFGHJKMNPQRSTUVWXYZ".length +
        "23456789".length +
        "!@#$%^&*+-_=?:|".length;
    const length =
      typeof optsOrPwd === "string" ? optsOrPwd.length : optsOrPwd.length;
    return Math.round(Math.log2(Math.max(1, pool)) * length);
  }

  function updateStrength(pwd, opts) {
    const entropy = calculateEntropy(opts);
    const pct = Math.min(100, Math.round((entropy / 128) * 100)); // Scale up for high entropy
    strengthMeter.style.width = pct + "%";
    strengthText.textContent = `Entropy: ${entropy} bits — ${labelFromEntropy(
      entropy
    )}`;
  }

  function labelFromEntropy(e) {
    if (e < 60) return "Weak";
    if (e < 100) return "Strong";
    if (e < 150) return "Very Strong";
    return "Quantum Resistant";
  }

  // --- history/favorites ---
  function loadJSON(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveJSON(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function addHistory(entry) {
    const hist = loadJSON(LS_HISTORY);
    hist.unshift(entry);
    while (hist.length > 200) hist.pop();
    saveJSON(LS_HISTORY, hist);
    renderHistory();
  }

  function renderHistory() {
    const hist = loadJSON(LS_HISTORY);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Filter out entries older than 30 days
    const validHist = hist.filter((h) => now - h.ts < thirtyDaysMs);

    // Save back if any entries were removed
    if (validHist.length !== hist.length) {
      saveJSON(LS_HISTORY, validHist);
    }

    historyList.innerHTML = "";
    validHist.forEach((h, idx) => {
      const li = document.createElement("li");
      const left = document.createElement("div");
      left.textContent = h.pwd;
      left.style.overflow = "hidden";
      left.style.textOverflow = "ellipsis";
      left.style.whiteSpace = "nowrap";
      const right = document.createElement("div");
      const timeLabel = document.createElement("small");
      const date = new Date(h.ts);
      timeLabel.textContent = date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const cp = document.createElement("button");
      cp.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
      cp.className = "btn";
      cp.title = "Copy to clipboard";
      cp.onclick = () => copyToClipboard(h.pwd);
      right.appendChild(timeLabel);
      right.appendChild(cp);
      li.appendChild(left);
      li.appendChild(right);
      historyList.appendChild(li);
    });
  }

  function clearHistory() {
    if (confirm("Clear saved history?")) {
      saveJSON(LS_HISTORY, []);
      renderHistory();
    }
  }

  // --- clipboard & helpers ---
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        flashToast("Copied to clipboard");
      },
      () => {
        alert("Copy failed — your browser may block clipboard access.");
      }
    );
  }

  function flashToast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.right = "20px";
    el.style.bottom = "20px";
    el.style.padding = "10px 14px";
    el.style.background = "rgba(0,0,0,0.6)";
    el.style.borderRadius = "8px";
    el.style.color = "white";
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0.0"), 1400);
    setTimeout(() => el.remove(), 2000);
  }

  // --- events ---
  lengthEl.addEventListener(
    "input",
    () => (lengthVal.textContent = lengthEl.value)
  );
  lengthEl.addEventListener("change", () => doGenerate());

  // Advanced mode toggle
  if (advancedModeEl) {
    advancedModeEl.addEventListener("change", () => {
      if (advancedModeEl.checked) {
        // Advanced mode: 6-16
        lengthEl.min = 6;
        lengthEl.max = 16;
        if (parseInt(lengthEl.value) > 16) lengthEl.value = 16;
        if (parseInt(lengthEl.value) < 6) lengthEl.value = 6;
      } else {
        // Basic mode: 10-20
        lengthEl.min = 10;
        lengthEl.max = 20;
        if (parseInt(lengthEl.value) < 10) lengthEl.value = 10;
        if (parseInt(lengthEl.value) > 20) lengthEl.value = 20;
      }
      lengthVal.textContent = lengthEl.value;
      doGenerate();
    });
  }

  generateBtn.addEventListener("click", () => doGenerate());
  copyBtn.addEventListener("click", () =>
    copyToClipboard(passwordOutput.value)
  );
  clearHistoryBtn.addEventListener("click", clearHistory);

  const bookmarkBtn = $("#bookmarkBtn");
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Trigger browser bookmark dialog
      if (window.sidebar && window.sidebar.addPanel) {
        // Firefox
        window.sidebar.addPanel(document.title, window.location.href, "");
      } else if (window.external && "AddFavorite" in window.external) {
        // IE
        window.external.AddFavorite(window.location.href, document.title);
      } else {
        // Modern browsers - show instruction
        alert("Press Ctrl+D (Cmd+D on Mac) to bookmark this page");
      }
    });
  }

  // keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.shiftKey && e.code === "KeyG") {
      e.preventDefault();
      doGenerate();
    }
    if (e.altKey && !e.shiftKey && e.code === "KeyC") {
      e.preventDefault();
      copyToClipboard(passwordOutput.value);
    }
    if (e.ctrlKey && !e.shiftKey && e.code === "KeyD") {
      e.preventDefault();
      const bookmarkBtn = $("#bookmarkBtn");
      if (bookmarkBtn) bookmarkBtn.click();
    }
  });

  function doGenerate() {
    const opts = getOptions();
    const count = 1;
    let last = "";
    for (let i = 0; i < count; i++) {
      const pwd = generatePassword(opts);
      last = pwd;
      addHistory({ pwd, ts: Date.now(), opts });
      if (i === 0) passwordOutput.value = pwd;
      // if multiple, append more in history but show one in UI
    }
    updateStrength(last, opts);
  }

  function getOptions() {
    return {
      length: parseInt(lengthEl.value, 10) || 16,
    };
  }

  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // initialize - defer heavy operations
  requestIdleCallback(
    () => {
      renderHistory();
    },
    { timeout: 1000 }
  );

  lengthVal.textContent = lengthEl.value;
  // first sample - defer to avoid blocking
  requestIdleCallback(
    () => {
      doGenerate();
    },
    { timeout: 500 }
  );
})();
