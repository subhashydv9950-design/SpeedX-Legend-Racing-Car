
/* =========================================================
   SUPERX LEGEND
   FILE 148: js/garage-page-actions.js
   PURPOSE: Connect Garage feature cards to real systems
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageActions = {
    root: null,
    initialized: false,
    messageTimer: null,

    upgradeMap: {
      "Engine": "engine",
      "Gearbox": "gearbox",
      "Brakes": "brakes",
      "Tyres": "tyres",
      "Suspension": "suspension",
      "Steering": "steering",
      "Turbo": "turbo"
    },

    partMap: {
      "Body Kit": "bodyKit",
      "Front Bumper": "frontBumper",
      "Rear Bumper": "rearBumper",
      "Spoiler": "spoiler",
      "Bonnet": "bonnet",
      "Headlights": "headlights"
    },

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");

      if (!this.root) return false;

      if (SX.vehicleUpgrades) {
        SX.vehicleUpgrades.init();
      }

      if (SX.vehicleCustomization) {
        SX.vehicleCustomization.init();
        SX.vehicleCustomization.setActiveCar(
          this.getCarId()
        );
      }

      this.prepareCards();
      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    getCarId() {
      return String(
        SX.garageManager?.selectedCarId ||
        SX.getSelectedCar?.()?.id ||
        "default"
      );
    },

    prepareCards() {
      const cards = this.root.querySelectorAll(
        ".garage-feature-card"
      );

      cards.forEach(card => {
        const title = card.querySelector("strong")?.textContent.trim();
        if (!title) return;

        card.dataset.actionTitle = title;

        let action = "";

        if (this.upgradeMap[title]) {
          action = "upgrade";
        } else if (this.partMap[title]) {
          action = "part";
        } else if (title === "Paint") {
          action = "paint";
        } else if (title === "Rims") {
          action = "rim";
        } else if (title === "Setup Presets") {
          action = "presets";
        }

        if (!action) return;

        card.dataset.garageAction = action;

        let button = card.querySelector(
          ".garage-feature-action"
        );

        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = "garage-feature-action";
          card.appendChild(button);
        }

        button.dataset.garageActionButton = action;
        button.textContent = "OPEN";
      });

      this.injectStyles();
    },

    bindEvents() {
      this.root.addEventListener("click", event => {
        const button = event.target.closest(
          "[data-garage-action-button]"
        );

        if (!button || !this.root.contains(button)) return;

        const card = button.closest(".garage-feature-card");
        if (!card) return;

        const action = button.dataset.garageActionButton;
        const title = card.dataset.actionTitle;

        switch (action) {
          case "upgrade":
            this.buyUpgrade(title);
            break;

          case "part":
            this.buyOrTogglePart(title);
            break;

          case "paint":
            this.changePaint();
            break;

          case "rim":
            this.changeRim();
            break;

          case "presets":
            this.openPresets();
            break;
        }

        this.refresh();
      });

      window.addEventListener(
        "sx:garage-car-selected",
        () => {
          SX.vehicleCustomization?.setActiveCar(
            this.getCarId()
          );

          SX.vehicleSetup?.init();

          this.refresh();
        }
      );

      window.addEventListener(
        "sx:car-upgraded",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:vehicle-customization-changed",
        () => this.refresh()
      );
    },

    buyUpgrade(title) {
      const category = this.upgradeMap[title];
      if (!category || !SX.vehicleUpgrades) {
        return this.notify("Upgrade system unavailable.");
      }

      const result = SX.vehicleUpgrades.upgrade(
        category,
        this.getCarId()
      );

      if (!result.success) {
        this.notify(result.message || "Upgrade failed.");
        return;
      }

      this.notify(
        title + " upgraded to Level " + result.level
      );

      this.updateWallet();
    },

    buyOrTogglePart(title) {
      const partId = this.partMap[title];
      const system = SX.vehicleCustomization;

      if (!partId || !system) {
        return this.notify("Customization unavailable.");
      }

      const catalog = system.getCatalog();
      const part = catalog.parts.find(
        item => item.id === partId
      );

      if (!part) {
        return this.notify("Part not found.");
      }

      let result;

      if (!part.owned) {
        result = system.buyPart(partId);
      } else {
        result = system.togglePart(
          partId,
          !part.enabled
        );
      }

      if (result === true || result?.success) {
        this.notify(
          part.owned
            ? title + (part.enabled ? " disabled." : " enabled.")
            : title + " purchased."
        );

        this.updateWallet();
        this.updatePreview();
      } else {
        this.notify(
          result?.message || "Action could not be completed."
        );
      }
    },

    changePaint() {
      const system = SX.vehicleCustomization;
      if (!system) {
        return this.notify("Paint system unavailable.");
      }

      const catalog = system.getCatalog();
      const current = catalog.colors.find(
        item => item.selected
      );

      const next = catalog.colors.find(
        item => !item.owned
      );

      if (next) {
        const result = system.buyColor(next.id);

        if (result?.success) {
          this.notify(next.name + " paint unlocked.");
          this.updateWallet();
          this.updatePreview();
        } else {
          this.notify(result?.message || "Paint purchase failed.");
        }

        return;
      }

      const owned = catalog.colors.filter(
        item => item.owned
      );

      if (!owned.length) return;

      const index = owned.findIndex(
        item => item.id === current?.id
      );

      const selected = owned[(index + 1) % owned.length];

      if (system.selectColor(selected.id)) {
        this.notify(selected.name + " selected.");
        this.updatePreview();
      }
    },

    changeRim() {
      const system = SX.vehicleCustomization;
      if (!system) {
        return this.notify("Rim system unavailable.");
      }

      const catalog = system.getCatalog();
      const current = catalog.rims.find(
        item => item.selected
      );

      const next = catalog.rims.find(
        item => !item.owned
      );

      if (next) {
        const result = system.buyRim(next.id);

        if (result?.success) {
          this.notify(next.name + " unlocked.");
          this.updateWallet();
        } else {
          this.notify(result?.message || "Rim purchase failed.");
        }

        return;
      }

      const owned = catalog.rims.filter(
        item => item.owned
      );

      if (!owned.length) return;

      const index = owned.findIndex(
        item => item.id === current?.id
      );

      const selected = owned[(index + 1) % owned.length];

      if (system.selectRim(selected.id)) {
        this.notify(selected.name + " selected.");
      }
    },

    openPresets() {
      const container = document.getElementById(
        "garageSetupPresetsContainer"
      );

      if (container) {
        container.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        this.notify("Setup presets opened.");
      } else {
        this.notify("Setup presets are unavailable.");
      }
    },

    updatePreview() {
      const current = SX.vehicleCustomization?.getCurrent();
      if (!current || !SX.garagePreview) return;

      if (current.color?.color) {
        SX.garagePreview.setColor(current.color.color);
      }

      Object.entries(current.parts || {}).forEach(
        ([part, enabled]) => {
          SX.garagePreview.setPart(part, enabled);
        }
      );
    },

    updateWallet() {
      SX.garagePageWallet?.refresh?.();

      window.dispatchEvent(
        new CustomEvent("sx:garage-wallet-refresh")
      );
    },

    refresh() {
      if (!this.root) return;

      const cards = this.root.querySelectorAll(
        ".garage-feature-card[data-garage-action]"
      );

      cards.forEach(card => {
        const title = card.dataset.actionTitle;
        const action = card.dataset.garageAction;
        const button = card.querySelector(
          ".garage-feature-action"
        );

        if (!button) return;

        if (action === "upgrade") {
          const category = this.upgradeMap[title];
          const item = SX.vehicleUpgrades?.getAll(
            this.getCarId()
          ).find(entry => entry.id === category);

          if (item) {
            button.textContent = item.maxed
              ? "MAX LEVEL"
              : "UPGRADE · " + item.cost + " COINS";

            button.disabled = item.maxed;
          }
        }

        if (action === "part") {
          const partId = this.partMap[title];
          const part = SX.vehicleCustomization
            ?.getCatalog().parts.find(
              item => item.id === partId
            );

          if (part) {
            button.textContent = part.owned
              ? (part.enabled ? "DISABLE" : "ENABLE")
              : "BUY · " + part.price + " COINS";

            button.disabled = false;
          }
        }

        if (action === "paint") {
          button.textContent = "CHANGE PAINT";
          button.disabled = false;
        }

        if (action === "rim") {
          button.textContent = "CHANGE RIMS";
          button.disabled = false;
        }

        if (action === "presets") {
          button.textContent = "VIEW PRESETS";
          button.disabled = false;
        }
      });
    },

    notify(message) {
      if (
        SX.notifications &&
        typeof SX.notifications.show === "function"
      ) {
        SX.notifications.show(message);
        return;
      }

      let notice = document.getElementById(
        "garageActionNotice"
      );

      if (!notice) {
        notice = document.createElement("div");
        notice.id = "garageActionNotice";
        notice.setAttribute("role", "status");
        document.body.appendChild(notice);
      }

      notice.textContent = String(message);

      notice.classList.add("visible");

      window.clearTimeout(this.messageTimer);

      this.messageTimer = window.setTimeout(() => {
        notice.classList.remove("visible");
      }, 2400);
    },

    injectStyles() {
      if (document.getElementById("garage-page-actions-css")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "garage-page-actions-css";

      style.textContent = `
        .garage-feature-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }

        .garage-feature-action {
          width: 100%;
          min-height: 34px;
          margin-top: auto;
          padding: 7px 9px;
          border: 1px solid rgba(180,135,255,.35);
          border-radius: 8px;
          background: rgba(120,65,205,.22);
          color: #e9d9ff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .4px;
          cursor: pointer;
        }

        .garage-feature-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        #garageActionNotice {
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 22px;
          transform: translate(-50%, 15px);
          max-width: calc(100vw - 30px);
          padding: 12px 18px;
          border: 1px solid rgba(180,135,255,.4);
          border-radius: 12px;
          background: #211832;
          color: #fff;
          font-size: 13px;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity .2s, transform .2s;
        }

        #garageActionNotice.visible {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        @media(max-width:380px) {
          .garage-feature-action {
            font-size: 9px;
            padding: 7px 5px;
          }
        }
      `;

      document.head.appendChild(style);
    }
  };

  SX.garagePageActions = GaragePageActions;

  function start() {
    GaragePageActions.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 148: js/garage-page-actions.js
   END
========================================================= */
        
