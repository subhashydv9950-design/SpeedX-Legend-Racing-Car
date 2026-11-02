
/* =========================================================
   SUPERX LEGEND — FILE 34
   FILE: js/notifications.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const CONFIG = {
    duration: 3200,
    maxVisible: 4,
    position: "top-center"
  };

  let container = null;
  let queue = [];
  let active = [];
  let initialized = false;

  const ICONS = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "i",
    reward: "★",
    achievement: "🏆",
    unlock: "🔓",
    coins: "🪙",
    level: "⬆"
  };

  function createContainer() {
    if (container && document.body.contains(container)) {
      return container;
    }

    container = document.createElement("div");
    container.id = "sx-notification-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");

    Object.assign(container.style, {
      position: "fixed",
      top: "18px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(420px, calc(100% - 28px))",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      zIndex: "99999",
      pointerEvents: "none"
    });

    document.body.appendChild(container);
    return container;
  }

  function injectStyles() {
    if (document.getElementById("sx-notification-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sx-notification-styles";

    style.textContent = `
      .sx-notification {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        color: #fff;
        background: rgba(18, 15, 29, .96);
        border: 1px solid rgba(167, 112, 255, .35);
        border-radius: 15px;
        box-shadow: 0 12px 35px rgba(0,0,0,.35);
        backdrop-filter: blur(14px);
        pointer-events: auto;
        animation: sxNoticeIn .28s ease forwards;
        overflow: hidden;
      }

      .sx-notification-icon {
        width: 36px;
        height: 36px;
        min-width: 36px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        background: rgba(155, 92, 255, .18);
        color: #c8a4ff;
        font-size: 19px;
        font-weight: 900;
      }

      .sx-notification-content {
        flex: 1;
        min-width: 0;
      }

      .sx-notification-title {
        font-size: 13px;
        font-weight: 800;
        margin-bottom: 4px;
        letter-spacing: .3px;
      }

      .sx-notification-message {
        color: #c7c1d4;
        font-size: 12px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .sx-notification-close {
        border: 0;
        background: transparent;
        color: #aaa2bb;
        font-size: 19px;
        cursor: pointer;
        padding: 3px 5px;
      }

      .sx-notification.success .sx-notification-icon {
        color: #75edb0;
        background: rgba(50, 210, 130, .13);
      }

      .sx-notification.error .sx-notification-icon {
        color: #ff8585;
        background: rgba(255, 75, 75, .13);
      }

      .sx-notification.warning .sx-notification-icon {
        color: #ffd477;
        background: rgba(255, 190, 60, .13);
      }

      .sx-notification.reward .sx-notification-icon,
      .sx-notification.achievement .sx-notification-icon {
        color: #ffe18b;
        background: rgba(255, 190, 50, .15);
      }

      .sx-notification-progress {
        height: 3px;
        width: 100%;
        position: absolute;
        bottom: 0;
        left: 0;
        background: rgba(170, 115, 255, .8);
        transform-origin: left;
        animation: sxNoticeProgress linear forwards;
      }

      @keyframes sxNoticeIn {
        from { opacity: 0; transform: translateY(-12px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes sxNoticeOut {
        to { opacity: 0; transform: translateY(-10px) scale(.96); }
      }

      @keyframes sxNoticeProgress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .sx-notification,
        .sx-notification-progress {
          animation: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function removeNotice(item) {
    if (!item || item.removed) return;

    item.removed = true;
    clearTimeout(item.timer);

    const index = active.indexOf(item);
    if (index !== -1) {
      active.splice(index, 1);
    }

    if (item.element) {
      item.element.style.animation = "sxNoticeOut .2s ease forwards";

      setTimeout(() => {
        item.element?.remove();
      }, 210);
    }

    processQueue();
  }

  function createNotice(data) {
    const type = ICONS[data.type] ? data.type : "info";
    const element = document.createElement("div");

    element.className = `sx-notification ${type}`;
    element.style.position = "relative";

    const icon = document.createElement("div");
    icon.className = "sx-notification-icon";
    icon.textContent = ICONS[type];

    const content = document.createElement("div");
    content.className = "sx-notification-content";

    const title = document.createElement("div");
    title.className = "sx-notification-title";
    title.textContent = String(data.title || "SUPERX LEGEND");

    const message = document.createElement("div");
    message.className = "sx-notification-message";
    message.textContent = String(data.message || "");

    content.append(title, message);

    const close = document.createElement("button");
    close.className = "sx-notification-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close notification");

    element.append(icon, content, close);

    const item = {
      element,
      removed: false,
      timer: null
    };

    close.addEventListener("click", () => removeNotice(item));

    const duration = Math.max(
      800,
      Number(data.duration) || CONFIG.duration
    );

    if (data.progress !== false) {
      const progress = document.createElement("div");
      progress.className = "sx-notification-progress";
      progress.style.animationDuration = `${duration}ms`;
      element.appendChild(progress);
    }

    item.timer = setTimeout(() => {
      removeNotice(item);
    }, duration);

    return item;
  }

  function processQueue() {
    if (!initialized || !container) return;

    while (
      queue.length > 0 &&
      active.length < CONFIG.maxVisible
    ) {
      const data = queue.shift();
      const item = createNotice(data);

      active.push(item);
      container.appendChild(item.element);
    }
  }

  function show(message, type = "info", options = {}) {
    if (!initialized) init();

    const data = {
      message: String(message || ""),
      type,
      title: options.title,
      duration: options.duration,
      progress: options.progress
    };

    queue.push(data);
    processQueue();

    return true;
  }

  function success(message, title = "SUCCESS") {
    return show(message, "success", { title });
  }

  function error(message, title = "ERROR") {
    return show(message, "error", { title });
  }

  function warning(message, title = "WARNING") {
    return show(message, "warning", { title });
  }

  function info(message, title = "INFORMATION") {
    return show(message, "info", { title });
  }

  function reward(coins, title = "REWARD UNLOCKED") {
    const amount = Math.max(0, Math.floor(Number(coins) || 0));

    return show(
      `You received ${amount.toLocaleString()} coins!`,
      "reward",
      { title, duration: 4200 }
    );
  }

  function achievement(name) {
    return show(
      `${name} achievement unlocked!`,
      "achievement",
      {
        title: "ACHIEVEMENT UNLOCKED",
        duration: 4800
      }
    );
  }

  function unlocked(name) {
    return show(
      `${name} is now available.`,
      "unlock",
      {
        title: "NEW CONTENT UNLOCKED",
        duration: 4000
      }
    );
  }

  function levelUp(level) {
    return show(
      `Congratulations! You reached level ${level}.`,
      "level",
      {
        title: "LEVEL UP",
        duration: 5000
      }
    );
  }

  function clear() {
    queue = [];

    [...active].forEach(item => {
      removeNotice(item);
    });
  }

  function init() {
    if (initialized && container && document.body.contains(container)) {
      return true;
    }

    injectStyles();
    createContainer();

    initialized = true;
    processQueue();

    return true;
  }

  function destroy() {
    clear();

    container?.remove();
    container = null;
    initialized = false;
  }

  SX.notifications = {
    init,
    show,
    success,
    error,
    warning,
    info,
    reward,
    achievement,
    unlocked,
    levelUp,
    clear,
    destroy
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 34
   END
========================================================= */
