
/* =====================================================
   SUPERX LEGEND RACING
   FILE 09: js/ui.js
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;

  if (!SX) {
    console.error("SUPERX config.js must load first.");
    return;
  }

  SX.ui = {};

  // SELECT ELEMENT
  SX.ui.get = function (selector, parent) {
    return (parent || document).querySelector(selector);
  };

  // SELECT MULTIPLE ELEMENTS
  SX.ui.getAll = function (selector, parent) {
    return Array.from(
      (parent || document).querySelectorAll(selector)
    );
  };

  // SHOW ELEMENT
  SX.ui.show = function (element) {
    if (!element) return;

    element.hidden = false;
    element.classList.remove("hidden");
    element.setAttribute("aria-hidden", "false");
  };

  // HIDE ELEMENT
  SX.ui.hide = function (element) {
    if (!element) return;

    element.hidden = true;
    element.classList.add("hidden");
    element.setAttribute("aria-hidden", "true");
  };

  // TOGGLE ELEMENT
  SX.ui.toggle = function (element) {
    if (!element) return;

    const isHidden =
      element.hidden ||
      element.classList.contains("hidden");

    if (isHidden) {
      SX.ui.show(element);
    } else {
      SX.ui.hide(element);
    }
  };

  // SET TEXT SAFELY
  SX.ui.setText = function (selector, value) {
    const element =
      typeof selector === "string"
        ? SX.ui.get(selector)
        : selector;

    if (!element) return;

    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  };

  // SET COINS DISPLAY
  SX.ui.updateCoins = function () {
    const coins = SX.player ? SX.player.coins : 0;

    SX.ui.getAll(
      "[data-player-coins], #coinCount, #coinsDisplay"
    ).forEach(function (element) {
      element.textContent = SX.utils.formatCoins(coins);
    });
  };

  // UPDATE PLAYER LEVEL
  SX.ui.updateLevel = function () {
    if (!SX.player) return;

    SX.ui.getAll(
      "[data-player-level], #playerLevel"
    ).forEach(function (element) {
      element.textContent = SX.player.level;
    });

    SX.ui.getAll(
      "[data-player-name], #playerName"
    ).forEach(function (element) {
      element.textContent = SX.player.name;
    });
  };

  // TOAST NOTIFICATION
  SX.ui.toast = function (message, type) {
    let toast = SX.ui.get("#superxToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "superxToast";
      toast.className = "superx-toast";

      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");

      document.body.appendChild(toast);
    }

    toast.textContent = message || "";

    toast.className =
      "superx-toast" +
      (type ? " toast-" + type : "");

    toast.classList.add("visible");

    clearTimeout(SX.ui.toastTimer);

    SX.ui.toastTimer = setTimeout(function () {
      toast.classList.remove("visible");
    }, 2600);
  };

  // CONFIRM DIALOG
  SX.ui.confirm = function (message) {
    return window.confirm(
      message || "Are you sure?"
    );
  };

  // CUSTOM MODAL
  SX.ui.openModal = function (title, content) {
    let modal = SX.ui.get("#superxModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "superxModal";
      modal.className = "superx-modal";

      modal.innerHTML = `
        <div class="superx-modal-backdrop"
             data-modal-close></div>

        <div class="superx-modal-panel"
             role="dialog"
             aria-modal="true"
             aria-labelledby="superxModalTitle">

          <button class="superx-modal-close"
                  type="button"
                  aria-label="Close"
                  data-modal-close>
            ×
          </button>

          <h2 id="superxModalTitle"></h2>

          <div class="superx-modal-content"></div>
        </div>
      `;

      document.body.appendChild(modal);
    }

    const heading = SX.ui.get(
      "#superxModalTitle",
      modal
    );

    const body = SX.ui.get(
      ".superx-modal-content",
      modal
    );

    if (heading) {
      heading.textContent = title || "SUPERX LEGEND";
    }

    if (body) {
      // Content is treated as plain text for safety.
      body.textContent = content || "";
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");
  };

  // CLOSE MODAL
  SX.ui.closeModal = function () {
    const modal = SX.ui.get("#superxModal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");
  };

  // MODAL CLOSE EVENTS
  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-modal-close]")) {
      SX.ui.closeModal();
    }
  });

  // UPDATE PLAYER DISPLAY
  SX.ui.refreshPlayer = function () {
    SX.ui.updateCoins();
    SX.ui.updateLevel();
  };

  // MUSIC BUTTON DISPLAY
  SX.ui.updateAudioButtons = function () {
    SX.ui.getAll("[data-audio-toggle]").forEach(function (button) {
      const type = button.dataset.audioToggle;

      const enabled =
        type === "music"
          ? SX.settings.music
          : SX.settings.soundEffects;

      button.classList.toggle("active", enabled);

      button.setAttribute(
        "aria-pressed",
        String(Boolean(enabled))
      );

      button.textContent =
        (type === "music" ? "Music " : "Sound ") +
        (enabled ? "ON" : "OFF");
    });
  };

  // AUDIO TOGGLE
  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-audio-toggle]");

    if (!button) return;

    const type = button.dataset.audioToggle;

    if (type === "music") {
      SX.settings.music = !SX.settings.music;
    } else if (type === "sound") {
      SX.settings.soundEffects = !SX.settings.soundEffects;
    } else {
      return;
    }

    SX.saveSettings();
    SX.ui.updateAudioButtons();

    SX.events.emit("audioSettingChanged", {
      music: SX.settings.music,
      soundEffects: SX.settings.soundEffects
    });
  });

  // PLAYER UPDATE EVENTS
  SX.events.on("playerUpdated", function () {
    SX.ui.refreshPlayer();
  });

  SX.events.on("coinsUpdated", function () {
    SX.ui.updateCoins();
  });

  SX.events.on("levelUp", function (level) {
    SX.ui.toast("Level Up! Level " + level, "success");
    SX.ui.updateLevel();
  });

  // INITIAL DISPLAY
  SX.ui.refreshPlayer();
  SX.ui.updateAudioButtons();

  console.log("SUPERX UI SYSTEM READY");

})();

/* =====================================================
   FILE 09: js/ui.js
   END
===================================================== */
