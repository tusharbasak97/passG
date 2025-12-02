/*
 * DEPRECATED: This file has been refactored into modular components.
 * See js/main.js for the new entry point.
 * Old monolithic code kept for reference only.
 */

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
  const privateModeEl = $("#privateMode");
  const liveStatusEl = $("#liveStatus");

  // --- storage keys ---
  const LS_HISTORY = "passg_history_v1";
  const MODE_KEY = "passg_mode_pref_v1";
  const PRIVATE_MODE_KEY = "passg_private_mode_v1";
  const LENGTH_SETTINGS = {
    basic: {
      min: 10,
      max: 20,
      default: 12,
      key: "passg_len_basic_v1",
    },
    advanced: {
      min: 8,
      max: 18,
      default: 10,
      key: "passg_len_advanced_v1",
    },
  };

  // --- utils ---
  function randInt(n) {
    if (n <= 0) return 0;
    const cryptoAPI = window.crypto || window.msCrypto;
    if (cryptoAPI && cryptoAPI.getRandomValues) {
      const range = Math.floor(0xffffffff / n) * n;
      const buf = new Uint32Array(1);
      let candidate;
      do {
        cryptoAPI.getRandomValues(buf);
        candidate = buf[0];
      } while (candidate >= range);
      return candidate % n;
    }
    return Math.floor(Math.random() * n);
  }
  function pick(str) {
    return str.charAt(randInt(str.length));
  }

  function setDisplayedPassword(value) {
    if (passwordOutput) {
      passwordOutput.textContent = value;
    }
  }

  function getDisplayedPassword() {
    return passwordOutput ? passwordOutput.textContent || "" : "";
  }

  function announce(message) {
    if (!liveStatusEl) return;
    liveStatusEl.textContent = "";
    requestAnimationFrame(() => {
      liveStatusEl.textContent = message;
    });
  }

  function generatePassword(options) {
    if (advancedModeEl && !advancedModeEl.checked) {
      return generateBasic(options.length);
    }
    return generateUniversal(options.length);
  }

  function generateBasic(len) {
    // Basic mode: include lowercase, uppercase, numbers, symbols (ambiguous included)
    // Exclude only lookalikes (o,0,i,l,1) and guarantee non-repeating characters per request
    const lowercase = "abcdefghjkmnpqrstuvwxyz"; // exclude i, l, o
    const uppercase = "ABCDEFGHJKMNPQRSTUVWXYZ"; // exclude I, L, O
    const numbers = "23456789"; // exclude 0,1
    const symbolsAll = "!@#$%^&*+-_=?:|~;:.{}<>[]()/\\'`"; // include full ambiguous set
    const uniquePool = Array.from(
      new Set((lowercase + uppercase + numbers + symbolsAll).split(""))
    );

    if (len > uniquePool.length) {
      len = uniquePool.length;
    }

    // Fisher-Yates shuffle and take the first len characters for a non-repeating sequence
    for (let i = uniquePool.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [uniquePool[i], uniquePool[j]] = [uniquePool[j], uniquePool[i]];
    }

    return uniquePool.slice(0, len).join("");
  }

  function generateUniversal(len) {
    // Advanced mode: ensures at least 1 lowercase, 1 uppercase, 1 number, 1 symbol
    // for website compatibility, while maintaining diverse character generation
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*+-_=?:|";

    // Extended ranges for diversity beyond required types
    const ranges = [
      { range: [0x0021, 0x007e], group: "ascii" },
      { range: [0x00a1, 0x00ff], group: "latin1" },
      { range: [0x0100, 0x017f], group: "latinext" },
      { range: [0x0370, 0x03ff], group: "greek" },
      { range: [0x0400, 0x04ff], group: "cyrillic" },
      { range: [0x0590, 0x05ff], group: "hebrew" },
      { range: [0x0600, 0x06ff], group: "arabic" },
      { range: [0x0900, 0x097f], group: "devanagari" },
      { range: [0x0e00, 0x0e7f], group: "thai" },
      { range: [0x1100, 0x11ff], group: "hangul" },
      { range: [0x2200, 0x22ff], group: "math" },
      { range: [0x3040, 0x309f], group: "hiragana" },
      { range: [0x30a0, 0x30ff], group: "katakana" },
      { range: [0x4e00, 0x9fbf], group: "cjk" },
      { range: [0x1f300, 0x1f64f], group: "emoji" },
    ];

    const usedGroups = new Set();
    const usedChars = new Set();

    // Helper to pick from pool
    const pickFrom = (str) => str.charAt(randInt(str.length));

    // Step 1: Generate diverse password without worrying about requirements
    let chars = [];
    for (let i = 0; i < len; i++) {
      let attempts = 0;
      let char = "";
      let selectedRange;

      while (attempts < 100) {
        selectedRange = ranges[randInt(ranges.length)];

        if (
          usedGroups.has(selectedRange.group) &&
          !["ascii", "latin1", "latinext", "math"].includes(selectedRange.group)
        ) {
          attempts++;
          continue;
        }

        const r = selectedRange.range;
        char = String.fromCodePoint(randInt(r[1] - r[0] + 1) + r[0]);

        if (usedChars.has(char)) {
          attempts++;
          continue;
        }

        break;
      }

      if (attempts >= 100) {
        const fallbackRange = ranges[0].range;
        for (let fb = 0; fb < 200; fb++) {
          char = String.fromCodePoint(
            randInt(fallbackRange[1] - fallbackRange[0] + 1) + fallbackRange[0]
          );
          if (!usedChars.has(char)) break;
        }
      }

      chars.push(char);
      usedChars.add(char);
      usedGroups.add(selectedRange.group);
    }

    // Step 2: Ensure required character types by replacing random positions
    const hasLower = chars.some((c) => lowercase.includes(c));
    const hasUpper = chars.some((c) => uppercase.includes(c));
    const hasNumber = chars.some((c) => numbers.includes(c));
    const hasSymbol = chars.some((c) => symbols.includes(c));

    // Create array of unused positions for replacement
    const positions = Array.from({ length: chars.length }, (_, i) => i);

    // Shuffle positions for truly random placement
    for (let i = positions.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    let posIdx = 0;
    if (!hasLower) {
      chars[positions[posIdx++]] = pickFrom(lowercase);
    }
    if (!hasUpper) {
      chars[positions[posIdx++]] = pickFrom(uppercase);
    }
    if (!hasNumber) {
      chars[positions[posIdx++]] = pickFrom(numbers);
    }
    if (!hasSymbol) {
      chars[positions[posIdx++]] = pickFrom(symbols);
    }

    // Step 3: Final shuffle to eliminate any patterns
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
  }

  function calculateEntropy(pwd) {
    if (!pwd) return { entropy: 0, label: labelFromEntropy(0) };

    let pool = 0;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[^0-9a-zA-Z]/.test(pwd);
    const hasUnicode = /[^\u0000-\u007f]/.test(pwd);

    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasNumber) pool += 10;
    if (hasSymbol) pool += 33;
    if (hasUnicode) pool += 100;

    const uniqueChars = new Set(pwd).size;
    pool = Math.max(pool, uniqueChars);

    const freq = Object.create(null);
    for (const ch of pwd) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    let penalty = 0;
    for (const count of Object.values(freq)) {
      if (count > 1) penalty += (count - 1) * 1.5;
    }

    const entropy = Math.max(
      0,
      Math.round(Math.log2(Math.max(2, pool)) * pwd.length - penalty)
    );
    return { entropy, label: labelFromEntropy(entropy) };
  }

  function updateStrength(pwd) {
    const { entropy, label } = calculateEntropy(pwd);
    const pct = Math.min(100, Math.round((entropy / 128) * 100)); // Scale up for high entropy
    strengthMeter.style.width = pct + "%";
    strengthText.textContent = `Entropy: ${entropy} bits — ${label}`;
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

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function currentMode() {
    return advancedModeEl && advancedModeEl.checked ? "advanced" : "basic";
  }

  function loadModePreference() {
    return localStorage.getItem(MODE_KEY) === "advanced" ? "advanced" : "basic";
  }

  function saveModePreference(mode) {
    localStorage.setItem(MODE_KEY, mode === "advanced" ? "advanced" : "basic");
  }

  function loadPrivateModePreference() {
    return localStorage.getItem(PRIVATE_MODE_KEY) === "1";
  }

  function savePrivateModePreference(enabled) {
    localStorage.setItem(PRIVATE_MODE_KEY, enabled ? "1" : "0");
  }

  function isPrivateMode() {
    return privateModeEl ? privateModeEl.checked : false;
  }

  function getLengthSettings(mode) {
    return LENGTH_SETTINGS[mode] || LENGTH_SETTINGS.basic;
  }

  function loadLengthValue(mode) {
    const settings = getLengthSettings(mode);
    const saved = parseInt(localStorage.getItem(settings.key), 10);
    if (Number.isFinite(saved)) {
      return clamp(saved, settings.min, settings.max);
    }
    return settings.default;
  }

  function saveLengthValue(mode, value) {
    const settings = getLengthSettings(mode);
    const sanitized = clamp(value, settings.min, settings.max);
    localStorage.setItem(settings.key, String(sanitized));
    return sanitized;
  }

  function applyLengthSettings(mode) {
    const settings = getLengthSettings(mode);
    lengthEl.min = settings.min;
    lengthEl.max = settings.max;
    const lengthValue = loadLengthValue(mode);
    lengthEl.value = lengthValue;
    lengthVal.textContent = lengthValue;
  }

  function updateLengthFromSlider() {
    const mode = currentMode();
    const parsed = parseInt(lengthEl.value, 10);
    const sanitized = saveLengthValue(
      mode,
      Number.isFinite(parsed) ? parsed : getLengthSettings(mode).default
    );
    lengthEl.value = sanitized;
    lengthVal.textContent = sanitized;
  }

  function addHistory(entry) {
    if (isPrivateMode()) return;
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
    if (isPrivateMode()) {
      const notice = document.createElement("li");
      notice.className = "history-empty";
      notice.textContent = "History is disabled during private sessions.";
      historyList.appendChild(notice);
      return;
    }

    if (!validHist.length) {
      const emptyMsg = document.createElement("li");
      emptyMsg.className = "history-empty";
      emptyMsg.textContent = "No passwords generated yet.";
      historyList.appendChild(emptyMsg);
      return;
    }

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

  function showConfirmDialog(message) {
    return new Promise((resolve) => {
      // Create overlay
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "hsla(0, 0%, 0%, 0.70)";
      overlay.style.backdropFilter = "blur(8px)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "10000";
      overlay.style.animation = "fadeIn 0.2s ease-out";

      // Create dialog
      const dialog = document.createElement("div");
      dialog.style.background =
        "linear-gradient(180deg, hsl(218 40% 16% / 0.95), hsl(218 35% 10% / 0.98))";
      dialog.style.borderRadius = "16px";
      dialog.style.padding = "2rem";
      dialog.style.maxWidth = "400px";
      dialog.style.width = "90%";
      dialog.style.border = "1px solid hsl(262 82% 59% / 0.3)";
      dialog.style.boxShadow =
        "0 20px 60px hsla(0, 0%, 0%, 0.50), 0 0 40px hsl(262 80% 60% / 0.2)";
      dialog.style.animation = "slideUp 0.3s ease-out";

      // Message
      const msgEl = document.createElement("p");
      msgEl.textContent = message;
      msgEl.style.color = "hsl(215 33% 92%)";
      msgEl.style.fontSize = "1.1rem";
      msgEl.style.marginBottom = "1.5rem";
      msgEl.style.textAlign = "center";
      msgEl.style.lineHeight = "1.5";

      // Buttons container
      const btnContainer = document.createElement("div");
      btnContainer.style.display = "flex";
      btnContainer.style.gap = "1rem";
      btnContainer.style.justifyContent = "center";

      // Cancel button
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.padding = "0.75rem 1.5rem";
      cancelBtn.style.borderRadius = "8px";
      cancelBtn.style.border = "1px solid hsl(215 30% 40% / 0.3)";
      cancelBtn.style.background = "hsl(215 40% 20% / 0.5)";
      cancelBtn.style.color = "hsl(215 33% 92%)";
      cancelBtn.style.fontSize = "0.95rem";
      cancelBtn.style.fontWeight = "600";
      cancelBtn.style.cursor = "pointer";
      cancelBtn.style.transition = "all 0.2s";
      cancelBtn.style.fontFamily = "inherit";

      // Confirm button
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "Clear History";
      confirmBtn.style.padding = "0.75rem 1.5rem";
      confirmBtn.style.borderRadius = "8px";
      confirmBtn.style.border = "none";
      confirmBtn.style.background =
        "linear-gradient(135deg, hsl(262 82% 59%), hsl(189 95% 42%))";
      confirmBtn.style.color = "white";
      confirmBtn.style.fontSize = "0.95rem";
      confirmBtn.style.fontWeight = "600";
      confirmBtn.style.cursor = "pointer";
      confirmBtn.style.transition = "all 0.2s";
      confirmBtn.style.boxShadow = "0 4px 12px hsl(262 80% 60% / 0.3)";
      confirmBtn.style.fontFamily = "inherit";

      // Keyboard hint
      const keyHint = document.createElement("div");
      keyHint.innerHTML = `<kbd style="background: hsl(215 40% 15% / 0.6); padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid hsl(215 30% 30% / 0.5);">Esc</kbd> to cancel • <kbd style="background: hsl(215 40% 15% / 0.6); padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid hsl(215 30% 30% / 0.5);">Enter ↵</kbd> to confirm`;
      keyHint.style.marginTop = "1rem";
      keyHint.style.textAlign = "center";
      keyHint.style.fontSize = "0.85rem";
      keyHint.style.color = "hsl(220 15% 68%)";
      keyHint.style.fontFamily = "inherit";

      // Hover effects
      cancelBtn.addEventListener("mouseenter", () => {
        cancelBtn.style.background = "hsl(215 40% 25% / 0.8)";
        cancelBtn.style.borderColor = "hsl(215 30% 50% / 0.5)";
      });
      cancelBtn.addEventListener("mouseleave", () => {
        cancelBtn.style.background = "hsl(215 40% 20% / 0.5)";
        cancelBtn.style.borderColor = "hsl(215 30% 40% / 0.3)";
      });
      confirmBtn.addEventListener("mouseenter", () => {
        confirmBtn.style.transform = "translateY(-2px)";
        confirmBtn.style.boxShadow = "0 6px 16px hsl(262 80% 60% / 0.4)";
      });
      confirmBtn.addEventListener("mouseleave", () => {
        confirmBtn.style.transform = "translateY(0)";
        confirmBtn.style.boxShadow = "0 4px 12px hsl(262 80% 60% / 0.3)";
      });

      const closeDialog = (result) => {
        overlay.style.animation = "fadeOut 0.2s ease-out";
        dialog.style.animation = "slideDown 0.2s ease-out";
        setTimeout(() => {
          document.body.removeChild(overlay);
          resolve(result);
        }, 200);
      };

      cancelBtn.addEventListener("click", () => closeDialog(false));
      confirmBtn.addEventListener("click", () => closeDialog(true));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeDialog(false);
      });

      // Keyboard support
      const keyHandler = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          closeDialog(true);
          document.removeEventListener("keydown", keyHandler);
        } else if (e.key === "Escape") {
          e.preventDefault();
          closeDialog(false);
          document.removeEventListener("keydown", keyHandler);
        }
      };
      document.addEventListener("keydown", keyHandler);

      // Add animations
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(20px); opacity: 0; }
        }
      `;
      if (!document.querySelector("style[data-dialog-animations]")) {
        style.setAttribute("data-dialog-animations", "true");
        document.head.appendChild(style);
      }

      btnContainer.appendChild(cancelBtn);
      btnContainer.appendChild(confirmBtn);
      dialog.appendChild(msgEl);
      dialog.appendChild(btnContainer);
      dialog.appendChild(keyHint);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus confirm button by default
      setTimeout(() => confirmBtn.focus(), 100);
    });
  }

  function clearHistory() {
    if (isPrivateMode()) {
      return; // Don't allow clearing in private mode
    }
    showConfirmDialog(
      "Are you sure you want to clear all saved password history?"
    ).then((confirmed) => {
      if (confirmed) {
        saveJSON(LS_HISTORY, []);
        renderHistory();
        announce("History cleared");
      }
    });
  }

  // --- clipboard & helpers ---
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => {
        // Only show toast on desktop (viewport width >= 768px)
        if (window.innerWidth >= 768) {
          flashToast("Copied to clipboard");
        }
        announce("Copied to clipboard");
      },
      () => {
        alert("Copy failed — your browser may block clipboard access.");
        announce("Copy failed");
      }
    );
  }

  function flashToast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.right = "20px";
    el.style.bottom = "20px";
    el.style.padding = "12px 18px";
    el.style.background =
      "linear-gradient(135deg, hsl(262 82% 59% / 0.95), hsl(189 95% 42% / 0.95))";
    el.style.backdropFilter = "blur(10px)";
    el.style.borderRadius = "12px";
    el.style.border = "1px solid hsl(262 82% 59% / 0.5)";
    el.style.color = "hsl(0, 0%, 100%)";
    el.style.fontWeight = "600";
    el.style.fontSize = "0.9rem";
    el.style.boxShadow =
      "0 8px 24px hsl(262 80% 60% / 0.4), 0 0 20px hsl(262 80% 60% / 0.3)";
    el.style.transition = "opacity 0.3s ease-out";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), 1400);
    setTimeout(() => el.remove(), 2000);
  }

  // --- events ---
  lengthEl.addEventListener("input", () => updateLengthFromSlider());
  lengthEl.addEventListener("change", () => {
    updateLengthFromSlider();
    doGenerate();
  });

  // Advanced mode toggle
  if (advancedModeEl) {
    advancedModeEl.addEventListener("change", () => {
      const mode = currentMode();
      saveModePreference(mode);
      applyLengthSettings(mode);
      doGenerate();
    });
  }

  if (privateModeEl) {
    privateModeEl.checked = loadPrivateModePreference();

    // Update clear history button state based on private mode
    function updateClearHistoryButton() {
      if (privateModeEl.checked) {
        clearHistoryBtn.disabled = true;
        clearHistoryBtn.style.opacity = "0.5";
        clearHistoryBtn.style.cursor = "not-allowed";
      } else {
        clearHistoryBtn.disabled = false;
        clearHistoryBtn.style.opacity = "";
        clearHistoryBtn.style.cursor = "";
      }
    }

    // Initialize button state
    updateClearHistoryButton();

    privateModeEl.addEventListener("change", () => {
      savePrivateModePreference(privateModeEl.checked);
      updateClearHistoryButton();
      renderHistory();
      announce(
        privateModeEl.checked
          ? "Private session enabled. History paused."
          : "Private session disabled. History will resume."
      );
    });
  }

  generateBtn.addEventListener("click", () => doGenerate());
  copyBtn.addEventListener("click", () =>
    copyToClipboard(getDisplayedPassword())
  );
  clearHistoryBtn.addEventListener("click", clearHistory);

  // keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.shiftKey && e.code === "KeyG") {
      e.preventDefault();
      doGenerate();
    }
    if (e.altKey && !e.shiftKey && e.code === "KeyC") {
      e.preventDefault();
      copyToClipboard(getDisplayedPassword());
    }
    if (e.altKey && !e.shiftKey && e.code === "KeyX") {
      e.preventDefault();
      clearHistory();
    }
    // Note: Ctrl+D / Cmd+D is handled natively by the browser to bookmark pages
    // No need to intercept it - let the browser handle bookmarking
  });

  function doGenerate() {
    const opts = getOptions();
    const count = 1;
    let last = "";
    for (let i = 0; i < count; i++) {
      const pwd = generatePassword(opts);
      last = pwd;
      addHistory({ pwd, ts: Date.now(), opts });
      if (i === 0) setDisplayedPassword(pwd);
      // if multiple, append more in history but show one in UI
    }
    updateStrength(last);
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

  let initialMode = "basic";
  if (advancedModeEl) {
    initialMode = loadModePreference();
    advancedModeEl.checked = initialMode === "advanced";
  }
  applyLengthSettings(initialMode);
  // first sample - defer to avoid blocking
  requestIdleCallback(
    () => {
      doGenerate();
    },
    { timeout: 500 }
  );
})();
