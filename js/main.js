/* PassG Main Module - Orchestrator */
// Lazy-loaded generator modules for faster initial load
let passwordGenerator = null;
let passphraseGenerator = null;
let usernameGenerator = null;
let deferredInstallPrompt = null;

import {
  announce,
  copyToClipboard,
  showConfirmDialog,
  flashToast,
} from "./utils/ui.js";
import {
  loadJSON,
  saveJSON,
  getItem,
  setItem,
  clamp,
} from "./utils/storage.js";
import { randInt } from "./utils/crypto.js";

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

// Storage keys
const LS_HISTORY = "passg_history_v1";
const MODE_KEY = "passg_mode_pref_v1";
const PRIVATE_MODE_KEY = "passg_private_mode_v1";
const GENERATOR_TYPE_KEY = "passg_generator_type_v1";
const INSTALL_PROMPT_LAST_KEY = "passg_install_prompt_last_v1";
const INSTALL_PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days
const LENGTH_SETTINGS = {
  basic: { min: 10, max: 20, default: 12, key: "passg_len_basic_v1" },
  advanced: { min: 8, max: 18, default: 10, key: "passg_len_advanced_v1" },
};
const PASSPHRASE_WORD_COUNT_KEY = "passg_passphrase_words_v1";
const PASSPHRASE_ADVANCED_KEY = "passg_passphrase_adv_v1";
const USERNAME_STYLE_KEY = "passg_username_styles_v1";

// State
let currentGeneratorType = "password"; // password, passphrase, username
let currentPasswordMode = "basic"; // basic, advanced

// DOM Elements
const generatorDropdown = document.getElementById("generatorType");
const passwordOutput = document.getElementById("passwordOutput");
const strengthMeter = document.querySelector("#strengthMeter .meter-fill");
const strengthText = document.getElementById("strengthText");
const generateButtons = document.querySelectorAll("[data-generate]");
const copyBtn = document.getElementById("copyBtn");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const privateModeEl = document.getElementById("privateMode");
const liveStatusEl = document.getElementById("liveStatus");

// Control panels
const passwordControls = document.getElementById("passwordControls");
const passphraseControls = document.getElementById("passphraseControls");
const usernameControls = document.getElementById("usernameControls");
const usernameKeywordEl = document.getElementById("usernameKeyword");
const VALID_USERNAME_STYLES = ["random", "professional", "gamer"];
const DEFAULT_USERNAME_STYLE = "random";
const HISTORY_TYPE_LABELS = {
  password: "Password",
  passphrase: "Passphrase",
  username: "Username",
};

// Password controls
const lengthEl = document.getElementById("length");
const lengthVal = document.getElementById("lengthVal");
const advancedModeEl = document.getElementById("advancedMode");

// Passphrase controls
const wordCountEl = document.getElementById("wordCount");
const wordCountVal = document.getElementById("wordCountVal");
const passphraseAdvancedEl = document.getElementById("passphraseAdvanced");

// Username controls
const usernameStyleInputs = document.querySelectorAll(
  "input[data-username-style]"
);

// Initialize
async function init() {
  // Load preferences
  currentGeneratorType = getItem(GENERATOR_TYPE_KEY, "password");
  currentPasswordMode = getItem(MODE_KEY, "basic");

  if (generatorDropdown) {
    generatorDropdown.value = currentGeneratorType;
  }

  setupCustomDropdown();

  if (privateModeEl) {
    privateModeEl.checked = getItem(PRIVATE_MODE_KEY) === "1";
    updateClearHistoryButton();
  }

  if (advancedModeEl) {
    advancedModeEl.checked = currentPasswordMode === "advanced";
    applyLengthSettings(currentPasswordMode);
  }

  // Load passphrase settings
  if (wordCountEl) {
    const savedWords = parseInt(getItem(PASSPHRASE_WORD_COUNT_KEY, "3"), 10);
    wordCountEl.value = clamp(savedWords, 3, 6);
    if (wordCountVal) wordCountVal.textContent = wordCountEl.value;
  }
  if (passphraseAdvancedEl) {
    passphraseAdvancedEl.checked =
      getItem(PASSPHRASE_ADVANCED_KEY, "1") === "1";
  }

  // Load username settings
  applyUsernameStyleSelections(getSavedUsernameStyles());

  // Setup event listeners
  setupEventListeners();

  // Show appropriate controls
  switchGenerator(currentGeneratorType);

  // Load wordlist in background
  requestIdleCallback(
    async () => {
      if (!passphraseGenerator) {
        passphraseGenerator = await import("./generators/passphrase.js");
      }
      passphraseGenerator.loadWordlist();
    },
    { timeout: 2000 }
  );

  // Render history
  requestIdleCallback(() => renderHistory(), { timeout: 1000 });

  // Generate initial output
  requestIdleCallback(() => doGenerate(), { timeout: 500 });

  // Set current year
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Suppress browser's native install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    requestIdleCallback(() => maybeShowInstallPrompt(), { timeout: 1500 });
  });

  // Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/js/sw.js")
        .then((registration) => {})
        .catch((err) => {});
    });
  }

  // Handle URL parameters for app shortcuts
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get("type");
  if (type && ["password", "passphrase", "username"].includes(type)) {
    window.addEventListener("load", () => {
      const dropdown = document.getElementById("generatorType");
      if (dropdown) {
        dropdown.value = type;
        dropdown.dispatchEvent(new Event("change"));
      }
    });
  }

  // Offline detection
  window.addEventListener("online", () => {});
  window.addEventListener("offline", () => {});

  // Offer install prompt if eligible (in case beforeinstallprompt fired prior to init)
  requestIdleCallback(() => maybeShowInstallPrompt(), { timeout: 2000 });
}

function setupEventListeners() {
  // Generator type switcher
  if (generatorDropdown) {
    generatorDropdown.addEventListener("change", (e) => {
      switchGenerator(e.target.value);
      doGenerate();
    });
  }

  // Password controls
  if (lengthEl) {
    lengthEl.addEventListener("input", updateLengthFromSlider);
    lengthEl.addEventListener("change", () => {
      updateLengthFromSlider();
      doGenerate();
    });
  }

  if (advancedModeEl) {
    advancedModeEl.addEventListener("change", () => {
      currentPasswordMode = advancedModeEl.checked ? "advanced" : "basic";
      setItem(MODE_KEY, currentPasswordMode);
      applyLengthSettings(currentPasswordMode);
      doGenerate();
    });
  }

  // Passphrase controls
  if (wordCountEl) {
    wordCountEl.addEventListener("input", () => {
      if (wordCountVal) wordCountVal.textContent = wordCountEl.value;
    });
    wordCountEl.addEventListener("change", () => {
      setItem(PASSPHRASE_WORD_COUNT_KEY, wordCountEl.value);
      doGenerate();
    });
  }
  if (passphraseAdvancedEl) {
    passphraseAdvancedEl.addEventListener("change", () => {
      setItem(
        PASSPHRASE_ADVANCED_KEY,
        passphraseAdvancedEl.checked ? "1" : "0"
      );
      doGenerate();
    });
  }

  // Username controls
  if (usernameStyleInputs.length) {
    usernameStyleInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        if (!ensureUsernameSelection(event.target)) {
          return;
        }
        saveJSON(USERNAME_STYLE_KEY, getSelectedUsernameStyles());
        doGenerate();
      });
    });
  }

  // Action buttons
  if (generateButtons.length) {
    generateButtons.forEach((btn) => btn.addEventListener("click", doGenerate));
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = passwordOutput ? passwordOutput.textContent || "" : "";
      copyToClipboard(text);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  // Private mode
  if (privateModeEl) {
    privateModeEl.addEventListener("change", () => {
      setItem(PRIVATE_MODE_KEY, privateModeEl.checked ? "1" : "0");
      updateClearHistoryButton();
      renderHistory();
      if (window.innerWidth >= 1024) {
        announce(
          privateModeEl.checked
            ? "Private session enabled. History paused."
            : "Private session disabled. History will resume."
        );
      }
    });
  }

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.shiftKey && e.code === "KeyG") {
      e.preventDefault();
      doGenerate();
    }
    if (e.altKey && !e.shiftKey && e.code === "KeyC") {
      e.preventDefault();
      const text = passwordOutput ? passwordOutput.textContent || "" : "";
      copyToClipboard(text);
    }
    if (e.altKey && !e.shiftKey && e.code === "KeyX") {
      e.preventDefault();
      clearHistory();
    }
  });
}

function getSavedUsernameStyles() {
  const saved = loadJSON(USERNAME_STYLE_KEY);
  if (Array.isArray(saved)) {
    const valid = saved.filter((style) =>
      VALID_USERNAME_STYLES.includes(style)
    );
    if (valid.length) {
      return valid;
    }
  }
  return [DEFAULT_USERNAME_STYLE];
}

function getSelectedUsernameStyles() {
  const selected = Array.from(usernameStyleInputs)
    .filter((input) => input.checked)
    .map((input) => input.value)
    .filter((value) => VALID_USERNAME_STYLES.includes(value));
  return selected.length ? selected : [DEFAULT_USERNAME_STYLE];
}

function applyUsernameStyleSelections(styles) {
  if (!usernameStyleInputs.length) return;
  const selection = styles && styles.length ? styles : [DEFAULT_USERNAME_STYLE];
  usernameStyleInputs.forEach((input) => {
    input.checked = selection.includes(input.value);
  });
}

function ensureUsernameSelection(target) {
  const selected = Array.from(usernameStyleInputs).filter(
    (input) => input.checked
  );
  if (!selected.length) {
    target.checked = true;
    return false;
  }
  return true;
}

function shouldShowInstallPrompt() {
  if (!deferredInstallPrompt) return false;
  const last = parseInt(getItem(INSTALL_PROMPT_LAST_KEY, "0"), 10) || 0;
  return Date.now() - last > INSTALL_PROMPT_COOLDOWN_MS;
}

function maybeShowInstallPrompt() {
  if (!deferredInstallPrompt) return;

  // Check cooldown
  const lastPrompt = parseInt(getItem(INSTALL_PROMPT_LAST_KEY, "0"), 10);
  const now = Date.now();
  if (now - lastPrompt < INSTALL_PROMPT_COOLDOWN_MS) {
    return;
  }

  // Only show on desktop (width >= 1024px)
  if (window.innerWidth < 1024) return;

  // Create custom install UI
  const installDiv = document.createElement("div");
  installDiv.className = "install-prompt";

  installDiv.innerHTML = `
    <div class="install-header">
      <h3 class="install-title">Install App</h3>
      <button id="closeInstall" class="install-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <p class="install-text">
      Install PassG for offline access.
    </p>
    <button id="installBtn" class="install-btn">Install</button>
  `;

  document.body.appendChild(installDiv);

  // Auto-close after 5 seconds
  const autoCloseTimer = setTimeout(() => {
    closeInstallPrompt();
  }, 5000);

  function closeInstallPrompt() {
    installDiv.classList.add("closing");
    setTimeout(() => installDiv.remove(), 300);
  }

  document.getElementById("closeInstall").addEventListener("click", () => {
    clearTimeout(autoCloseTimer);
    closeInstallPrompt();
  });

  document.getElementById("installBtn").addEventListener("click", async () => {
    clearTimeout(autoCloseTimer);
    closeInstallPrompt();
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      deferredInstallPrompt = null;
    }
    // Set cooldown regardless of outcome
    setItem(INSTALL_PROMPT_LAST_KEY, Date.now().toString());
  });
}

function createHistoryTypeBadge(type = "password") {
  const safeType = HISTORY_TYPE_LABELS[type] ? type : "password";
  const badge = document.createElement("span");
  badge.className = `history-type history-type-${safeType}`;
  badge.textContent = HISTORY_TYPE_LABELS[safeType];
  return badge;
}

function showInstallDialog(message, { autoCloseMs = null } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const dialog = document.createElement("div");
    dialog.className = "install-dialog-box";

    const msgEl = document.createElement("p");
    msgEl.textContent = message;
    msgEl.className = "install-dialog-message";

    const actions = document.createElement("div");
    actions.className = "install-dialog-actions";

    const btnLater = document.createElement("button");
    btnLater.textContent = "Maybe later";
    btnLater.className = "install-dialog-btn-later";

    const btnInstall = document.createElement("button");
    btnInstall.textContent = "Install";
    btnInstall.className = "install-dialog-btn-install";

    let timer = null;
    const cleanup = (result) => {
      if (timer) clearTimeout(timer);
      overlay.remove();
      resolve(result);
    };

    btnLater.addEventListener("click", () => cleanup(false));
    btnInstall.addEventListener("click", () => cleanup(true));

    if (autoCloseMs) {
      timer = setTimeout(() => cleanup(false), autoCloseMs);
    }

    actions.appendChild(btnLater);
    actions.appendChild(btnInstall);
    dialog.appendChild(msgEl);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

function switchGenerator(type) {
  currentGeneratorType = type;
  setItem(GENERATOR_TYPE_KEY, type);

  // Hide all control panels
  if (passwordControls) passwordControls.classList.add("hidden");
  if (passphraseControls) passphraseControls.classList.add("hidden");
  if (usernameControls) usernameControls.classList.add("hidden");

  // Show entropy meter only for password and passphrase
  const strengthContainer = document.querySelector(".strength-container");
  if (strengthContainer) {
    if (type === "password") {
      strengthContainer.classList.remove("hidden");
    } else {
      strengthContainer.classList.add("hidden");
    }
  }

  // Show appropriate control panel
  switch (type) {
    case "password":
      if (passwordControls) passwordControls.classList.remove("hidden");
      break;
    case "passphrase":
      if (passphraseControls) passphraseControls.classList.remove("hidden");
      break;
    case "username":
      if (usernameControls) usernameControls.classList.remove("hidden");
      break;
  }
}

async function doGenerate() {
  let output = "";
  let entropyInfo = null;

  try {
    switch (currentGeneratorType) {
      case "password":
        if (!passwordGenerator) {
          passwordGenerator = await import("./generators/password.js");
        }
        const len = parseInt(lengthEl?.value, 10) || 12;
        output = advancedModeEl?.checked
          ? passwordGenerator.generateUniversal(len)
          : passwordGenerator.generateBasic(len);
        entropyInfo = passwordGenerator.calculateEntropy(output);
        break;

      case "passphrase":
        if (!passphraseGenerator) {
          passphraseGenerator = await import("./generators/passphrase.js");
          await passphraseGenerator.loadWordlist();
        }
        const wordCount = parseInt(wordCountEl?.value, 10) || 3;
        const passphraseAdvanced = passphraseAdvancedEl?.checked ?? true;
        output = await passphraseGenerator.generatePassphrase(wordCount, {
          advanced: passphraseAdvanced,
        });
        entropyInfo = null;
        break;

      case "username":
        if (!usernameGenerator) {
          usernameGenerator = await import("./generators/username.js");
        }
        const styles = getSelectedUsernameStyles();
        const style = styles[randInt(styles.length)];
        const keyword = usernameKeywordEl?.value || "";
        output = usernameGenerator.generateUsername({ style, keyword });
        entropyInfo = null; // No entropy for usernames
        break;
    }

    // Update output
    if (passwordOutput) {
      passwordOutput.textContent = output;
    }

    // Update strength meter
    if (entropyInfo) {
      updateStrength(entropyInfo);
    }

    // Add to history when not in private mode
    if (!isPrivateMode()) {
      addHistory({
        type: currentGeneratorType,
        value: output,
        ts: Date.now(),
      });
    }
  } catch (error) {
    if (window.innerWidth >= 1024) {
      announce("Generation failed. Please try again.");
    }
  }
}

function updateStrength({ entropy, label }) {
  if (!strengthMeter || !strengthText) return;

  const pct = Math.min(100, Math.round((entropy / 128) * 100));
  strengthMeter.style.setProperty("--width", pct + "%");
  strengthText.textContent = `Entropy: ${entropy} bits — ${label}`;
}

function applyLengthSettings(mode) {
  if (!lengthEl || !lengthVal) return;

  const settings = LENGTH_SETTINGS[mode] || LENGTH_SETTINGS.basic;
  lengthEl.min = settings.min;
  lengthEl.max = settings.max;

  const saved = parseInt(getItem(settings.key, String(settings.default)), 10);
  const value = clamp(saved, settings.min, settings.max);

  lengthEl.value = value;
  lengthVal.textContent = value;
}

function updateLengthFromSlider() {
  if (!lengthEl || !lengthVal) return;

  const mode = advancedModeEl?.checked ? "advanced" : "basic";
  const settings = LENGTH_SETTINGS[mode];
  const value = clamp(parseInt(lengthEl.value, 10), settings.min, settings.max);

  lengthEl.value = value;
  lengthVal.textContent = value;
  setItem(settings.key, String(value));
}

function isPrivateMode() {
  return privateModeEl ? privateModeEl.checked : false;
}

function updateClearHistoryButton() {
  if (!clearHistoryBtn) return;

  if (isPrivateMode()) {
    clearHistoryBtn.disabled = true;
  } else {
    clearHistoryBtn.disabled = false;
  }
}

function addHistory(entry) {
  if (isPrivateMode()) return;

  const hist = loadJSON(LS_HISTORY);
  hist.unshift(entry);
  while (hist.length > 200) hist.pop();
  saveJSON(LS_HISTORY, hist);
  renderHistory();

  // Scroll to top to show the newest item
  if (historyList) {
    historyList.scrollTop = 0;
  }
}

function renderHistory() {
  if (!historyList) return;

  const hist = loadJSON(LS_HISTORY);
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Filter out entries older than 30 days
  const validHist = hist.filter((h) => now - h.ts < thirtyDaysMs);

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
    emptyMsg.textContent = "No items generated yet.";
    historyList.appendChild(emptyMsg);
    return;
  }

  validHist.forEach((h) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const left = document.createElement("div");
    left.className = "history-left";

    const valueEl = document.createElement("div");
    valueEl.className = "history-value";
    valueEl.textContent = h.value || h.pwd || "";

    const meta = document.createElement("div");
    meta.className = "history-meta";

    const badge = createHistoryTypeBadge(h.type);
    if (badge) meta.appendChild(badge);

    const date = new Date(h.ts);
    const timeLabel = document.createElement("time");
    timeLabel.dateTime = date.toISOString();
    timeLabel.textContent = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    meta.appendChild(timeLabel);

    left.appendChild(valueEl);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const cp = document.createElement("button");
    cp.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
    cp.className = "btn";
    cp.title = "Copy to clipboard";
    cp.type = "button";
    cp.onclick = () => copyToClipboard(h.value || h.pwd || "");
    actions.appendChild(cp);

    li.appendChild(left);
    li.appendChild(actions);
    historyList.appendChild(li);
  });
}

function clearHistory() {
  if (privateModeEl && privateModeEl.checked) return;

  showConfirmDialog("Are you sure you want to clear your history?").then(
    (confirmed) => {
      if (confirmed) {
        saveJSON(LS_HISTORY, []);
        renderHistory();
        if (window.innerWidth >= 1024) {
          flashToast("History cleared");
          announce("History cleared");
        }
      }
    }
  );
}

function setupCustomDropdown() {
  const dropdown = document.getElementById("customDropdown");
  if (!dropdown) return;

  const trigger = dropdown.querySelector(".dropdown-trigger");
  const options = dropdown.querySelectorAll(".dropdown-option");
  const selectedText = dropdown.querySelector(".selected-text");
  const nativeSelect = document.getElementById("generatorType");

  if (!trigger || !nativeSelect) return;

  // Sync initial state from native select (which is set from storage in init)
  const updateUIFromNative = () => {
    const val = nativeSelect.value;
    const matchingOption = Array.from(options).find(
      (opt) => opt.dataset.value === val
    );
    if (matchingOption) {
      selectedText.textContent = matchingOption.textContent;
      options.forEach((opt) => {
        opt.classList.toggle("selected", opt.dataset.value === val);
        opt.setAttribute("aria-selected", opt.dataset.value === val);
      });
    }
  };

  // Call once to set initial state
  updateUIFromNative();

  // Toggle dropdown
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains("open");
    dropdown.classList.toggle("open");
    trigger.setAttribute("aria-expanded", !isOpen);
  });

  // Handle option selection
  options.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = option.dataset.value;

      // Update native select and trigger change
      if (nativeSelect.value !== value) {
        nativeSelect.value = value;
        nativeSelect.dispatchEvent(new Event("change"));

        // Update UI immediately
        updateUIFromNative();
      }

      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
