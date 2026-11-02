
/* =========================================================
   SUPERX LEGEND — FILE 48 START
   FILE: js/notifications-center.js
   PURPOSE: Notification history and notification center
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_notification_center_v1";
  const MAX_ITEMS = 100;

  let notifications = [];
  let panel = null;
  let initialized = false;

  function createId() {
    return "notice_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 7);
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];

      notifications = Array.isArray(parsed)
        ? parsed.slice(0, MAX_ITEMS)
        : [];
    } catch (error) {
      notifications = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(notifications.slice(0, MAX_ITEMS))
      );
    } catch (error) {
      console.warn("SUPERX notification history could not be saved.");
    }
  }

  function add(title, message, type = "info", options = {}) {
    const allowedTypes = [
      "info",
      "success",
      "warning",
      "error",
      "reward",
      "achievement"
    ];

    const safeType = allowedTypes.includes(type)
      ? type
      : "info";

    const item = {
      id: createId(),
      title: String(title || "Notification").slice(0, 100),
      message: String(message || "").slice(0, 500),
      type: safeType,
      read: false,
      createdAt: new Date().toISOString(),
      persistent: Boolean(options.persistent)
    };

    notifications.unshift(item);

    if (notifications.length > MAX_ITEMS) {
      notifications.length = MAX_ITEMS;
    }

    save();

    document.dispatchEvent(new CustomEvent(
      "sx:notification-added",
      {
        detail: { ...item }
      }
    ));

    if (panel) render();

    return { ...item };
  }

  function getAll() {
    return notifications.map(item => ({ ...item }));
  }

  function getUnreadCount() {
    return notifications.filter(item => !item.read).length;
  }

  function markRead(id) {
    const item = notifications.find(entry => entry.id === id);

    if (!item) return false;

    item.read = true;
    save();

    if (panel) render();

    return true;
  }

  function markAllRead() {
    notifications.forEach(item => {
      item.read = true;
    });

    save();

    if (panel) render();

    return true;
  }

  function remove(id) {
    const previousLength = notifications.length;

    notifications = notifications.filter(
      item => item.id !== id
    );

    if (notifications.length === previousLength) {
      return false;
    }

    save();

    if (panel) render();

    return true;
  }

  function clear() {
    notifications = [];
    save();

    if (panel) render();

    return true;
  }

  function createStyles() {
    if (document.getElementById("sxNotificationCenterStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "sxNotificationCenterStyles";

    style.textContent = `
      .sx-notice-panel {
        position: fixed;
        z-index: 99980;
        top: 70px;
        right: 16px;
        width: min(370px, calc(100vw - 32px));
        max-height: min(600px, calc(100vh - 100px));
        overflow-y: auto;
        background: #100d19;
        border: 1px solid #493363;
        border-radius: 17px;
        color: white;
        box-shadow: 0 15px 50px rgba(0,0,0,.55);
        padding: 15px;
        display: none;
      }

      .sx-notice-panel.open {
        display: block;
        animation: sxNoticeIn .2s ease;
      }

      @keyframes sxNoticeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .sx-notice-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }

      .sx-notice-header h3 {
        margin: 0;
        font-size: 17px;
      }

      .sx-notice-actions {
        display: flex;
        gap: 7px;
      }

      .sx-notice-actions button,
      .sx-notice-close {
        border: 0;
        background: #292137;
        color: #d9c8ed;
        border-radius: 8px;
        padding: 7px 9px;
        cursor: pointer;
        font-size: 11px;
      }

      .sx-notice-item {
        padding: 12px;
        margin-bottom: 9px;
        border-radius: 11px;
        background: #1b1626;
        border-left: 3px solid #9870d9;
      }

      .sx-notice-item.unread {
        background: #251b35;
      }

      .sx-notice-item.success { border-color: #39c98a; }
      .sx-notice-item.warning { border-color: #e5b54d; }
      .sx-notice-item.error { border-color: #ed6666; }
      .sx-notice-item.reward { border-color: #b58aff; }
      .sx-notice-item.achievement { border-color: #e7c15d; }

      .sx-notice-item strong {
        display: block;
        font-size: 13px;
        margin-bottom: 5px;
      }

      .sx-notice-item p {
        color: #c0b5ce;
        font-size: 12px;
        line-height: 1.5;
        margin: 0 0 7px;
      }

      .sx-notice-item small {
        color: #837590;
        font-size: 10px;
      }

      .sx-notice-item button {
        float: right;
        border: 0;
        background: transparent;
        color: #ae8be4;
        cursor: pointer;
        font-size: 11px;
      }

      .sx-notice-empty {
        color: #a89bb7;
        text-align: center;
        padding: 35px 10px;
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
  }

  function formatDate(date) {
    try {
      return new Date(date).toLocaleString();
    } catch (error) {
      return "";
    }
  }

  function render() {
    if (!panel) return;

    const items = notifications.map(item => `
      <div class="sx-notice-item ${item.type} ${item.read ? "" : "unread"}"
           data-notice-id="${item.id}">
        <button data-remove-notice="${item.id}" aria-label="Delete notification">
          Delete
        </button>
        <strong>${escapeHTML(item.title)}</strong>
        <p>${escapeHTML(item.message)}</p>
        <small>${formatDate(item.createdAt)}</small>
      </div>
    `).join("");

    panel.innerHTML = `
      <div class="sx-notice-header">
        <h3>Notifications (${getUnreadCount()})</h3>
        <div class="sx-notice-actions">
          <button data-mark-all>Read all</button>
          <button data-clear-all>Clear</button>
          <button class="sx-notice-close" data-close>✕</button>
        </div>
      </div>

      ${
        items ||
        '<div class="sx-notice-empty">No notifications yet.</div>'
      }
    `;

    panel.querySelector("[data-mark-all]")
      .addEventListener("click", markAllRead);

    panel.querySelector("[data-clear-all]")
      .addEventListener("click", clear);

    panel.querySelector("[data-close]")
      .addEventListener("click", close);

    panel.querySelectorAll("[data-notice-id]")
      .forEach(element => {
        element.addEventListener("click", event => {
          if (event.target.closest("[data-remove-notice]")) {
            return;
          }

          markRead(element.dataset.noticeId);
        });
      });

    panel.querySelectorAll("[data-remove-notice]")
      .forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          remove(button.dataset.removeNotice);
        });
      });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function init() {
    if (initialized) return true;

    load();
    createStyles();

    panel = document.createElement("section");
    panel.className = "sx-notice-panel";
    panel.setAttribute("aria-label", "Notification center");

    document.body.appendChild(panel);

    render();
    initialized = true;

    return true;
  }

  function open() {
    if (!initialized) init();

    panel.classList.add("open");
    render();

    return true;
  }

  function close() {
    if (!panel) return false;

    panel.classList.remove("open");

    return true;
  }

  function toggle() {
    if (!initialized) init();

    return panel.classList.contains("open")
      ? close()
      : open();
  }

  SX.notificationsCenter = {
    init,
    add,
    getAll,
    getUnreadCount,
    markRead,
    markAllRead,
    remove,
    clear,
    open,
    close,
    toggle,
    isOpen: () => Boolean(
      panel && panel.classList.contains("open")
    )
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
   SUPERX LEGEND — FILE 48 END
   FILE: js/notifications-center.js
========================================================= */
    
