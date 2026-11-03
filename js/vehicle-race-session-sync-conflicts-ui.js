
/* =========================================================
   FILE 131: vehicle-race-session-sync-conflicts-ui.js
   PATH: js/vehicle-race-session-sync-conflicts-ui.js

   PURPOSE:
   UI renderer for the race-session sync conflict manager.

   IMPORTANT:
   - Requires FILE 130.
   - Renders only inside a supplied container.
   - Does not create floating overlays.
   - Does not automatically overwrite session data.
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncConflictsUI) {
    console.warn("SUPERX: Conflict UI already initialized.");
    return;
  }

  const MANAGER_NAME = "vehicleRaceSessionSyncConflicts";

  let container = null;
  let initialized = false;

  const styles = `
    .sx-sync-conflicts {
      width: 100%;
      min-width: 0;
      color: #f4f1ff;
      font-family: Arial, sans-serif;
    }

    .sx-sync-conflicts *,
    .sx-sync-conflicts *::before,
    .sx-sync-conflicts *::after {
      box-sizing: border-box;
    }

    .sx-sync-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .sx-sync-heading {
      margin: 0;
      font-size: 19px;
      font-weight: 700;
    }

    .sx-sync-count {
      color: #c4a5ff;
      font-size: 13px;
    }

    .sx-sync-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .sx-sync-card {
      min-width: 0;
      padding: 14px;
      border: 1px solid rgba(174, 130, 255, .25);
      border-radius: 14px;
      background: #171321;
    }

    .sx-sync-card-title {
      margin: 0 0 8px;
      font-size: 15px;
      overflow-wrap: anywhere;
    }

    .sx-sync-meta {
      display: grid;
      gap: 5px;
      color: #b9b1c8;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .sx-sync-status {
      display: inline-block;
      width: fit-content;
      margin-top: 9px;
      padding: 5px 9px;
      border-radius: 20px;
      background: rgba(168, 115, 255, .15);
      color: #d5baff;
      font-size: 11px;
    }

    .sx-sync-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 13px;
    }

    .sx-sync-actions button {
      min-width: 0;
      min-height: 40px;
      padding: 9px 7px;
      border: 1px solid #59417e;
      border-radius: 9px;
      background: #241a35;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }

    .sx-sync-actions button:active {
      transform: scale(.98);
    }

    .sx-sync-actions button:focus-visible {
      outline: 2px solid #bd91ff;
      outline-offset: 2px;
    }

    .sx-sync-actions .sx-sync-ignore {
      border-color: #70404d;
      background: #301b26;
    }

    .sx-sync-empty {
      padding: 20px 12px;
      border: 1px dashed #59417e;
      border-radius: 12px;
      color: #bdb2ce;
      text-align: center;
      font-size: 13px;
    }

    .sx-sync-message {
      margin: 0 0 12px;
      color: #cdb6ff;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    @media (max-width: 360px) {
      .sx-sync-actions {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  function getManager() {
    return SX[MANAGER_NAME] || null;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }

    return element;
  }

  function addStyles() {
    if (document.getElementById("sx-sync-conflicts-style")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "sx-sync-conflicts-style";
    style.textContent = styles;

    document.head.appendChild(style);
  }

  function createActionButton(label, action, conflictId, extraClass) {
    const button = createElement(
      "button",
      extraClass || "",
      label
    );

    button.type = "button";
    button.dataset.action = action;
    button.dataset.conflictId = conflictId;

    return button;
  }

  function renderConflict(conflict) {
    const card = createElement(
      "article",
      "sx-sync-card"
    );

    const title = createElement(
      "h3",
      "sx-sync-card-title",
      "Session: " + conflict.sessionId
    );

    const meta = createElement(
      "div",
      "sx-sync-meta"
    );

    meta.appendChild(
      createElement(
        "div",
        "",
        "Conflict type: " + conflict.type
      )
    );

    meta.appendChild(
      createElement(
        "div",
        "",
        "Created: " + conflict.createdAt
      )
    );

    meta.appendChild(
      createElement(
        "div",
        "",
        "Local version: " +
          JSON.stringify(conflict.localVersion)
      )
    );

    meta.appendChild(
      createElement(
        "div",
        "",
        "Remote version: " +
          JSON.stringify(conflict.remoteVersion)
      )
    );

    const status = createElement(
      "span",
      "sx-sync-status",
      conflict.status
    );

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(status);

    if (conflict.status === "pending") {
      const actions = createElement(
        "div",
        "sx-sync-actions"
      );

      actions.appendChild(
        createActionButton(
          "Keep Local",
          "keep-local",
          conflict.id
        )
      );

      actions.appendChild(
        createActionButton(
          "Keep Remote",
          "keep-remote",
          conflict.id
        )
      );

      actions.appendChild(
        createActionButton(
          "Keep Both",
          "keep-both",
          conflict.id
        )
      );

      actions.appendChild(
        createActionButton(
          "Ignore",
          "ignore",
          conflict.id,
          "sx-sync-ignore"
        )
      );

      card.appendChild(actions);
    }

    return card;
  }

  function render() {
    if (!container) {
      return false;
    }

    const manager = getManager();

    container.replaceChildren();

    if (!manager) {
      container.appendChild(
        createElement(
          "div",
          "sx-sync-empty",
          "Conflict Manager (FILE 130) is not loaded."
        )
      );

      return false;
    }

    const root = createElement(
      "section",
      "sx-sync-conflicts"
    );

    const header = createElement(
      "div",
      "sx-sync-header"
    );

    const heading = createElement(
      "h2",
      "sx-sync-heading",
      "Sync Conflicts"
    );

    const count = createElement(
      "span",
      "sx-sync-count",
      "Pending: " + manager.getPendingCount()
    );

    header.appendChild(heading);
    header.appendChild(count);

    root.appendChild(header);

    const list = createElement(
      "div",
      "sx-sync-list"
    );

    const allConflicts = manager.getConflicts();

    if (!allConflicts.length) {
      list.appendChild(
        createElement(
          "div",
          "sx-sync-empty",
          "No sync conflicts found."
        )
      );
    } else {
      allConflicts.forEach(function (conflict) {
        list.appendChild(
          renderConflict(conflict)
        );
      });
    }

    root.appendChild(list);
    container.appendChild(root);

    return true;
  }

  function handleAction(event) {
    const button = event.target.closest(
      "button[data-action]"
    );

    if (!button || !container.contains(button)) {
      return;
    }

    const manager = getManager();

    if (!manager) {
      return;
    }

    const action = button.dataset.action;
    const conflictId = button.dataset.conflictId;

    let result;

    if (action === "ignore") {
      result = manager.ignoreConflict(conflictId);
    } else if (
      action === "keep-local" ||
      action === "keep-remote" ||
      action === "keep-both"
    ) {
      result = manager.resolveConflict(
        conflictId,
        action
      );
    } else {
      return;
    }

    const message = createElement(
      "p",
      "sx-sync-message",
      result && result.success
        ? "Choice recorded. Session data has not been automatically overwritten."
        : (result && result.error) || "Action could not be completed."
    );

    render();

    if (container.firstChild) {
      container.insertBefore(
        message,
        container.firstChild
      );
    }
  }

  function init(target) {
    if (typeof target === "string") {
      container = document.querySelector(target);
    } else {
      container = target;
    }

    if (
      !container ||
      typeof container.appendChild !== "function"
    ) {
      return {
        success: false,
        error: "A valid container element is required."
      };
    }

    addStyles();

    if (!initialized) {
      container.addEventListener(
        "click",
        handleAction
      );

      initialized = true;
    }

    render();

    return {
      success: true,
      initialized: true
    };
  }

  function destroy() {
    if (container && initialized) {
      container.removeEventListener(
        "click",
        handleAction
      );

      container.replaceChildren();
    }

    container = null;
    initialized = false;

    return true;
  }

  SX.vehicleRaceSessionSyncConflictsUI = {
    init: init,
    render: render,
    destroy: destroy,
    isInitialized: function () {
      return initialized;
    }
  };

  console.info(
    "SUPERX: Race Session Sync Conflicts UI initialized."
  );

})(window, document);

/* ================= END FILE 131 ================= */
