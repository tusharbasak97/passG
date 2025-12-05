/* UI utility functions */

export function announce(message) {
  // Silence announcements on mobile/tablet to avoid visible status flashes
  if (window.innerWidth < 1024) return;
  const liveStatusEl = document.getElementById("liveStatus");
  if (!liveStatusEl) return;
  liveStatusEl.textContent = "";
  requestAnimationFrame(() => {
    liveStatusEl.textContent = message;
  });
}

export function flashToast(msg) {
  // Only show toast on desktop (1024px and above)
  if (window.innerWidth < 1024) return;

  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "toast-notification";
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("fade-out"), 1400);
  setTimeout(() => el.remove(), 2000);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(
    () => {
      if (window.innerWidth >= 1024) {
        flashToast("Copied to clipboard");
      }
      announce("Copied to clipboard");
      return true;
    },
    () => {
      alert("Copy failed — your browser may block clipboard access.");
      announce("Copy failed");
      return false;
    }
  );
}

export function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";

    const msgEl = document.createElement("p");
    msgEl.textContent = message;
    msgEl.className = "confirm-message";

    const btnContainer = document.createElement("div");
    btnContainer.className = "confirm-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "confirm-btn-cancel";

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.className = "confirm-btn-confirm";

    const closeDialog = (result) => {
      overlay.classList.add("fade-out");
      dialog.classList.add("slide-down");
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

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    dialog.appendChild(msgEl);
    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    setTimeout(() => confirmBtn.focus(), 100);
  });
}
