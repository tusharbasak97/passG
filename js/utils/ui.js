/* UI utility functions */

export function announce(message) {
  const liveStatusEl = document.getElementById("liveStatus");
  if (!liveStatusEl) return;
  liveStatusEl.textContent = "";
  requestAnimationFrame(() => {
    liveStatusEl.textContent = message;
  });
}

export function flashToast(msg) {
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

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(
    () => {
      if (window.innerWidth >= 768) {
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
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: hsla(0, 0%, 0%, 0.70); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; animation: fadeIn 0.2s ease-out;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: linear-gradient(180deg, hsl(218 40% 16% / 0.95), hsl(218 35% 10% / 0.98));
      border-radius: 16px; padding: 2rem; max-width: 400px; width: 90%;
      border: 1px solid hsl(262 82% 59% / 0.3);
      box-shadow: 0 20px 60px hsla(0, 0%, 0%, 0.50), 0 0 40px hsl(262 80% 60% / 0.2);
      animation: slideUp 0.3s ease-out;
    `;

    const msgEl = document.createElement("p");
    msgEl.textContent = message;
    msgEl.style.cssText = `
      color: hsl(215 33% 92%); font-size: 1.1rem; margin-bottom: 1.5rem;
      text-align: center; line-height: 1.5;
    `;

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "display: flex; gap: 1rem; justify-content: center;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      padding: 0.75rem 1.5rem; border-radius: 8px;
      border: 1px solid hsl(215 30% 40% / 0.3); background: hsl(215 40% 20% / 0.5);
      color: hsl(215 33% 92%); font-size: 0.95rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-family: inherit;
    `;

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.style.cssText = `
      padding: 0.75rem 1.5rem; border-radius: 8px; border: none;
      background: linear-gradient(135deg, hsl(262 82% 59%), hsl(189 95% 42%));
      color: white; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 4px 12px hsl(262 80% 60% / 0.3); font-family: inherit;
    `;

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
