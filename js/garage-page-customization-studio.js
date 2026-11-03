/* =========================================================
   SUPERX LEGEND — FILE 156
   FILE: js/garage-page-customization-studio.js
   PURPOSE: Full vehicle customization studio
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const Studio = {
    id: "sxGarageCustomizationStudio",
    initialized: false,

    getSystem() {
      return SX.vehicleCustomization || null;
    },

    getCarId() {
      return String(
        SX.garageManager?.selectedCarId ||
        SX.getSelectedCar?.()?.id ||
        "default"
      );
    },

    init() {
      if (this.initialized) return true;

      if (!document.getElementById("garagePage")) {
        return false;
      }

      const system = this.getSystem();
      if (!system) return false;

      system.init();
      system.setActiveCar(this.getCarId());

      this.createPanel();
      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    createPanel() {
      if (document.getElementById(this.id)) return;

      const panel = document.createElement("section");
      panel.id = this.id;
      panel.className = "sx-garage-customization-studio";

      panel.innerHTML = `
        <div class="sx-gcs-top">
          <div>
            <span class="sx-gcs-kicker">SUPERX WORKSHOP</span>
            <h2>Customization Studio</h2>
            <p>Build your own vehicle style</p>
          </div>
          <span class="sx-gcs-live">LIVE GARAGE</span>
        </div>

        <div class="sx-gcs-section">
          <h3>PAINT COLORS</h3>
          <div class="sx-gcs-color-grid" id="sxGcsColorGrid"></div>
        </div>

        <div class="sx-gcs-section">
          <h3>RIM COLLECTION</h3>
          <div class="sx-gcs-rim-grid" id="sxGcsRimGrid"></div>
        </div>

        <div class="sx-gcs-section">
          <h3>BODY PARTS</h3>
          <div class="sx-gcs-part-grid" id="sxGcsPartGrid"></div>
        </div>

        <div class="sx-gcs-feedback"
          id="sxGcsStudioFeedback"
          role="status"
          aria-live="polite">
          Select an item to customize your vehicle.
        </div>
      `;

      const style = document.createElement("style");
      style.id = "sx-gcs-studio-style";

      style.textContent = `
        #${this.id} {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(166,117,255,.22);
          border-radius: 18px;
          background: linear-gradient(145deg,#191427,#0d0b14);
          color: #f4efff;
          font-family: inherit;
        }

        #${this.id} * {
          box-sizing: border-box;
        }

        #${this.id} .sx-gcs-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        #${this.id} .sx-gcs-kicker {
          color: #b995ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        #${this.id} h2 {
          margin: 6px 0;
          font-size: 20px;
        }

        #${this.id} p {
          margin: 0;
          color: #a79db8;
          font-size: 12px;
        }

        #${this.id} .sx-gcs-live {
          padding: 7px 10px;
          border: 1px solid rgba(128,230,176,.25);
          border-radius: 20px;
          color: #8ee6b0;
          background: rgba(70,190,120,.08);
          font-size: 9px;
          font-weight: 800;
        }

        #${this.id} .sx-gcs-section {
          margin-top: 18px;
        }

        #${this.id} .sx-gcs-section h3 {
          margin: 0 0 11px;
          color: #d9c7ff;
          font-size: 12px;
          letter-spacing: 1px;
        }

        #${this.id} .sx-gcs-color-grid {
          display: grid;
          grid-template-columns: repeat(5,minmax(0,1fr));
          gap: 9px;
        }

        #${this.id} .sx-gcs-color-card {
          min-width: 0;
          padding: 10px 5px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 11px;
          background: rgba(255,255,255,.035);
          color: #fff;
          text-align: center;
        }

        #${this.id} .sx-gcs-color-card.active {
          border-color: #b58aff;
          background: rgba(139,92,246,.15);
        }

        #${this.id} .sx-gcs-swatch {
          display: block;
          width: 27px;
          height: 27px;
          margin: 0 auto 7px;
          border: 2px solid rgba(255,255,255,.55);
          border-radius: 50%;
        }

        #${this.id} .sx-gcs-color-card strong {
          display: block;
          min-height: 24px;
          font-size: 9px;
          overflow-wrap: anywhere;
        }

        #${this.id} .sx-gcs-item-button {
          width: 100%;
          min-height: 34px;
          margin-top: 7px;
          padding: 6px;
          border: 1px solid rgba(170,125,255,.35);
          border-radius: 8px;
          background: rgba(120,70,200,.18);
          color: #e6d7ff;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        #${this.id} .sx-gcs-item-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        #${this.id} .sx-gcs-rim-grid,
        #${this.id} .sx-gcs-part-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 9px;
        }

        #${this.id} .sx-gcs-rim-card,
        #${this.id} .sx-gcs-part-card {
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.035);
        }

        #${this.id} .sx-gcs-rim-card strong,
        #${this.id} .sx-gcs-part-card strong {
          display: block;
          font-size: 12px;
        }

        #${this.id} .sx-gcs-item-meta {
          display: block;
          margin-top: 5px;
          color: #a99fb7;
          font-size: 10px;
        }

        #${this.id} .sx-gcs-feedback {
          margin-top: 16px;
          padding: 12px;
          border: 1px solid rgba(166,117,255,.2);
          border-radius: 10px;
          background: rgba(139,92,246,.08);
          color: #d8c9f3;
          font-size: 11px;
          text-align: center;
        }

        @media(max-width:420px) {
          #${this.id} {
            padding: 13px;
          }

          #${this.id} .sx-gcs-color-grid {
            grid-template-columns: repeat(3,minmax(0,1fr));
          }
        }
      `;

      document.head.appendChild(style);

      const anchor =
        document.getElementById("sxGarageCustomizationSummary") ||
        document.getElementById("garageFeatureGrid");

      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(
          panel,
          anchor.nextSibling
        );
      } else {
        document.getElementById("garagePage")?.appendChild(panel);
      }
    },

    bindEvents() {
      const panel = document.getElementById(this.id);
      if (!panel) return;

      panel.addEventListener("click", event => {
        const button = event.target.closest(
          "[data-studio-type][data-studio-id]"
        );

        if (!button || !panel.contains(button)) return;

        const type = button.dataset.studioType;
        const id = button.dataset.studioId;

        this.performAction(type, id);
      });

      window.addEventListener(
        "sx:vehicle-customization-changed",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-car-selected",
        () => {
          this.getSystem()?.setActiveCar(this.getCarId());
          this.refresh();
        }
      );

      window.addEventListener(
        "sx:garage-car-purchased",
        () => this.refresh()
      );
    },

    performAction(type, id) {
      const system = this.getSystem();
      if (!system) return;

      let result = false;
      let message = "Action could not be completed.";

      if (type === "color") {
        const item = system.getCatalog().colors.find(
          entry => entry.id === id
        );

        if (!item) return;

        if (item.owned) {
          result = system.selectColor(id);
          message = result
            ? item.name + " selected."
            : "Could not select this paint.";
        } else {
          result = system.buyColor(id);
          message = result?.success
            ? item.name + " paint purchased."
            : result?.message || message;
        }
      }

      if (type === "rim") {
        const item = system.getCatalog().rims.find(
          entry => entry.id === id
        );

        if (!item) return;

        if (item.owned) {
          result = system.selectRim(id);
          message = result
            ? item.name + " selected."
            : "Could not select these rims.";
        } else {
          result = system.buyRim(id);
          message = result?.success
            ? item.name + " purchased."
            : result?.message || message;
        }
      }

      if (type === "part") {
        const item = system.getCatalog().parts.find(
          entry => entry.id === id
        );

        if (!item) return;

        if (item.owned) {
          result = system.togglePart(id, !item.enabled);
          message = result
            ? item.name + (item.enabled ? " disabled." : " enabled.")
            : "Could not change this part.";
        } else {
          result = system.buyPart(id);
          message = result?.success
            ? item.name + " purchased and enabled."
            : result?.message || message;
        }
      }

      const success =
        result === true || result?.success === true;

      this.showMessage(
        success ? message : (message || "Action failed.")
      );

      if (success) {
        SX.garagePageWallet?.refresh?.();

        window.dispatchEvent(
          new CustomEvent("sx:garage-wallet-refresh")
        );

        this.refresh();
      }
    },

    showMessage(message) {
      const feedback = document.getElementById(
        "sxGcsStudioFeedback"
      );

      if (feedback) {
        feedback.textContent = String(message);
      }
    },

    escape(value) {
      return String(value == null ? "" : value).replace(
        /[&<>"']/g,
        char => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char]
      );
    },

    renderColor(item) {
      const color = /^#[0-9a-f]{3,8}$/i.test(item.color)
        ? item.color
        : "#8b5cf6";

      const label = item.selected
        ? "SELECTED"
        : item.owned
          ? "SELECT"
          : "BUY · " + item.price;

      return `
        <div class="sx-gcs-color-card ${item.selected ? "active" : ""}">
          <span class="sx-gcs-swatch"
            style="background:${color}">
          </span>
          <strong>${this.escape(item.name)}</strong>
          <button class="sx-gcs-item-button"
            type="button"
            data-studio-type="color"
            data-studio-id="${this.escape(item.id)}">
            ${label}
          </button>
        </div>
      `;
    },

    renderRim(item) {
      const label = item.selected
        ? "SELECTED"
        : item.owned
          ? "SELECT"
          : "BUY · " + item.price + " COINS";

      return `
        <div class="sx-gcs-rim-card">
          <strong>${this.escape(item.name)}</strong>
          <span class="sx-gcs-item-meta">
            ${item.owned ? "Unlocked" : "Locked"}
          </span>
          <button class="sx-gcs-item-button"
            type="button"
            data-studio-type="rim"
            data-studio-id="${this.escape(item.id)}">
            ${label}
          </button>
        </div>
      `;
    },

    renderPart(item) {
      const label = item.owned
        ? (item.enabled ? "DISABLE" : "ENABLE")
        : "BUY · " + item.price + " COINS";

      return `
        <div class="sx-gcs-part-card">
          <strong>${this.escape(item.name)}</strong>
          <span class="sx-gcs-item-meta">
            ${item.owned
              ? (item.enabled ? "Purchased · Active" : "Purchased · Inactive")
              : "Not purchased"}
          </span>
          <button class="sx-gcs-item-button"
            type="button"
            data-studio-type="part"
            data-studio-id="${this.escape(item.id)}">
            ${label}
          </button>
        </div>
      `;
    },

    refresh() {
      const system = this.getSystem();
      if (!system) return;

      const panel = document.getElementById(this.id);
      if (!panel) return;

      const catalog = system.getCatalog();

      const colors = document.getElementById("sxGcsColorGrid");
      const rims = document.getElementById("sxGcsRimGrid");
      const parts = document.getElementById("sxGcsPartGrid");

      if (colors) {
        colors.innerHTML = catalog.colors
          .map(item => this.renderColor(item))
          .join("");
      }

      if (rims) {
        rims.innerHTML = catalog.rims
          .map(item => this.renderRim(item))
          .join("");
      }

      if (parts) {
        parts.innerHTML = catalog.parts
          .map(item => this.renderPart(item))
          .join("");
      }
    }
  };

  SX.garageCustomizationStudio = Studio;

  function start() {
    Studio.init();
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
   SUPERX LEGEND — FILE 156
   FILE: js/garage-page-customization-studio.js
   END
========================================================= */
