
/* =========================================================
   SUPERX LEGEND — FILE 65
   FILE: js/garage-ui.js
   PURPOSE: Interactive garage interface and car controls
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageUI = {
    root: null,
    activeTab: "collection",
    initialized: false,

    init(options = {}) {
      this.root = typeof options.root === "string"
        ? document.querySelector(options.root)
        : options.root || document.querySelector("#garagePage");

      if (!this.root) {
        return {
          success: false,
          message: "Garage page container not found."
        };
      }

      this.bindEvents();
      this.render();
      this.initialized = true;

      return { success: true };
    },

    bindEvents() {
      if (this.root.dataset.garageUIBound) return;

      this.root.dataset.garageUIBound = "true";

      this.root.addEventListener("click", event => {
        const tab = event.target.closest("[data-garage-tab]");
        const select = event.target.closest("[data-garage-select]");
        const buy = event.target.closest("[data-garage-buy]");
        const repair = event.target.closest("[data-garage-repair]");

        if (tab) {
          this.setTab(tab.dataset.garageTab);
          return;
        }

        if (select) {
          this.selectCar(select.dataset.garageSelect);
          return;
        }

        if (buy) {
          this.buyCar(buy.dataset.garageBuy);
          return;
        }

        if (repair) {
          this.repairCar(repair.dataset.garageRepair);
        }
      });
    },

    setTab(tab) {
      const allowed = [
        "collection",
        "upgrades",
        "customize",
        "damage"
      ];

      if (!allowed.includes(tab)) return false;

      this.activeTab = tab;
      this.render();
      return true;
    },

    selectCar(id) {
      if (!SX.garageManager) return;

      const result = SX.garageManager.selectCar(id);

      this.showMessage(
        result.success
          ? "Car selected successfully."
          : result.message
      );

      this.render();
    },

    buyCar(id) {
      if (!SX.garageManager) return;

      const result = SX.garageManager.buyCar(id);

      this.showMessage(
        result.success
          ? "Car purchased successfully."
          : result.message
      );

      this.render();
    },

    repairCar(id) {
      if (!SX.vehicleDamage) return;

      const result = SX.vehicleDamage.repair(id);

      this.showMessage(
        result.success
          ? "Vehicle repaired successfully."
          : result.message
      );

      this.render();
    },

    render() {
      if (!this.root) return;

      const manager = SX.garageManager;

      if (!manager) {
        this.root.innerHTML = `
          <div class="garage-ui-empty">
            Garage manager is not available.
          </div>
        `;
        return;
      }

      const stats = manager.getStatistics();

      this.root.innerHTML = `
        <section class="garage-ui">

          <header class="garage-ui-header">
            <div>
              <span class="garage-ui-eyebrow">
                SUPERX LEGEND
              </span>
              <h2>MY GARAGE</h2>
              <p>Manage your racing collection</p>
            </div>

            <div class="garage-ui-count">
              <strong>${stats.ownedCars}</strong>
              <span> / ${stats.totalCars} CARS</span>
            </div>
          </header>

          <div class="garage-ui-stats">
            <div>
              <strong>${stats.collectionPercentage}%</strong>
              <span>Collection</span>
            </div>

            <div>
              <strong>${stats.lockedCars}</strong>
              <span>Locked Cars</span>
            </div>

            <div>
              <strong>${stats.garageValue.toLocaleString("en-IN")}</strong>
              <span>Garage Value</span>
            </div>
          </div>

          <nav class="garage-ui-tabs">
            ${this.renderTab("collection", "Collection")}
            ${this.renderTab("upgrades", "Upgrades")}
            ${this.renderTab("customize", "Customize")}
            ${this.renderTab("damage", "Damage")}
          </nav>

          <div class="garage-ui-content">
            ${this.renderActiveTab()}
          </div>

        </section>
      `;

      this.injectStyles();
    },

    renderTab(id, label) {
      return `
        <button
          type="button"
          data-garage-tab="${id}"
          class="${this.activeTab === id ? "active" : ""}">
          ${label}
        </button>
      `;
    },

    renderActiveTab() {
      switch (this.activeTab) {
        case "upgrades":
          return this.renderUpgrades();

        case "customize":
          return this.renderCustomize();

        case "damage":
          return this.renderDamage();

        default:
          return this.renderCollection();
      }
    },

    renderCollection() {
      const cars = SX.garageManager.getFilteredCars();

      if (!cars.length) {
        return `<p class="garage-ui-empty">No cars found.</p>`;
      }

      return `
        <div class="garage-ui-car-grid">
          ${cars.map(car => {
            const owned = car.owned;
            const selected = car.selected;

            return `
              <article class="garage-ui-car-card">
                <div class="garage-ui-car-image">
                  <span>🏎️</span>
                  <small>
                    ${owned ? "UNLOCKED" : "LOCKED"}
                  </small>
                </div>

                <h3>${this.escape(car.name || "SUPERX CAR")}</h3>

                <p>
                  ${Number(car.topSpeed || car.speed || 0)}
                  KM/H
                </p>

                ${
                  owned
                    ? `
                      <button
                        type="button"
                        data-garage-select="${this.escape(car.id)}"
                        ${selected ? "disabled" : ""}>
                        ${selected ? "SELECTED" : "SELECT"}
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        data-garage-buy="${this.escape(car.id)}">
                        BUY · ${Number(car.price || 0).toLocaleString("en-IN")}
                      </button>
                    `
                }
              </article>
            `;
          }).join("")}
        </div>
      `;
    },

    renderUpgrades() {
      if (!SX.vehicleUpgrades) {
        return this.empty("Upgrade system unavailable.");
      }

      const items = SX.vehicleUpgrades.getAll();

      return `
        <div class="garage-ui-list">
          ${items.map(item => `
            <article class="garage-ui-item">
              <div>
                <h3>${this.escape(item.name)}</h3>
                <p>Level ${item.level} / ${item.maxLevel}</p>
              </div>

              <strong>
                ${item.maxed ? "MAX" : item.cost + " COINS"}
              </strong>
            </article>
          `).join("")}
        </div>
        <p class="garage-ui-note">
          Upgrade purchases are available through the vehicle upgrade system.
        </p>
      `;
    },

    renderCustomize() {
      if (!SX.vehicleCustomization) {
        return this.empty("Customization system unavailable.");
      }

      const catalog = SX.vehicleCustomization.getCatalog();

      return `
        <div class="garage-ui-customize">
          <h3>Paint Collection</h3>

          <div class="garage-ui-color-grid">
            ${catalog.colors.map(color => `
              <div
                class="garage-ui-color"
                style="background:${color.color}"
                title="${this.escape(color.name)}">
                ${color.owned ? "✓" : "🔒"}
              </div>
            `).join("")}
          </div>

          <h3>Rims</h3>

          <div class="garage-ui-list">
            ${catalog.rims.map(rim => `
              <div class="garage-ui-item">
                <span>${this.escape(rim.name)}</span>
                <strong>
                  ${rim.owned ? "OWNED" : rim.price + " COINS"}
                </strong>
              </div>
            `).join("")}
          </div>

          <h3>Body Parts</h3>

          <div class="garage-ui-list">
            ${catalog.parts.map(part => `
              <div class="garage-ui-item">
                <span>${this.escape(part.name)}</span>
                <strong>
                  ${part.owned ? "OWNED" : part.price + " COINS"}
                </strong>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    },

    renderDamage() {
      if (!SX.vehicleDamage) {
        return this.empty("Vehicle damage system unavailable.");
      }

      const carId = SX.garageManager.selectedCarId || "player";
      const state = SX.vehicleDamage.getState("player");

      return `
        <div class="garage-ui-damage">
          <h3>Vehicle Condition</h3>

          <div class="garage-ui-damage-meter">
            <div style="width:${state.totalDamage}%"></div>
          </div>

          <strong>${Math.round(state.totalDamage)}% DAMAGE</strong>

          <p>Status: ${this.escape(state.status)}</p>

          <p>
            Repair Cost:
            ${state.repairCost.toLocaleString("en-IN")} Coins
          </p>

          <button
            type="button"
            data-garage-repair="${this.escape(carId)}">
            REPAIR VEHICLE
          </button>
        </div>
      `;
    },

    empty(message) {
      return `<p class="garage-ui-empty">${this.escape(message)}</p>`;
    },

    showMessage(message) {
      if (SX.notifications && SX.notifications.show) {
        SX.notifications.show(message);
      }
    },

    escape(value) {
      return String(value).replace(
        /[&<>"']/g,
        character => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]
      );
    },

    injectStyles() {
      if (document.getElementById("superx-garage-ui-css")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "superx-garage-ui-css";

      style.textContent = `
        .garage-ui {
          width: 100%;
          color: #fff;
          font-family: inherit;
        }

        .garage-ui-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .garage-ui-eyebrow {
          color: #a78bfa;
          font-size: 10px;
          letter-spacing: 3px;
        }

        .garage-ui-header h2 {
          margin: 5px 0;
          font-size: 25px;
          letter-spacing: 2px;
        }

        .garage-ui-header p {
          color: #aaa;
          font-size: 12px;
        }

        .garage-ui-count {
          padding: 12px;
          border: 1px solid #393044;
          border-radius: 12px;
          white-space: nowrap;
        }

        .garage-ui-count strong {
          color: #c4a5ff;
          font-size: 24px;
        }

        .garage-ui-count span {
          font-size: 10px;
          color: #aaa;
        }

        .garage-ui-stats {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .garage-ui-stats > div {
          padding: 14px 8px;
          border: 1px solid #30283b;
          border-radius: 12px;
          background: #15121d;
          text-align: center;
        }

        .garage-ui-stats strong,
        .garage-ui-stats span {
          display: block;
        }

        .garage-ui-stats strong {
          color: #c4a5ff;
          font-size: 17px;
        }

        .garage-ui-stats span {
          margin-top: 5px;
          color: #aaa;
          font-size: 10px;
        }

        .garage-ui-tabs {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 10px;
        }

        .garage-ui-tabs button,
        .garage-ui-car-card button,
        .garage-ui-damage button {
          border: 1px solid #51416d;
          border-radius: 9px;
          padding: 10px 13px;
          color: #fff;
          background: #211a2d;
          font-size: 11px;
          cursor: pointer;
        }

        .garage-ui-tabs button.active,
        .garage-ui-car-card button,
        .garage-ui-damage button {
          background: #7040c4;
        }

        .garage-ui-tabs button {
          white-space: nowrap;
        }

        .garage-ui-car-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
        }

        .garage-ui-car-card {
          min-width: 0;
          padding: 12px;
          border: 1px solid #352b44;
          border-radius: 14px;
          background: #15121d;
        }

        .garage-ui-car-image {
          height: 95px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 10px;
          background: linear-gradient(140deg,#292039,#100e17);
        }

        .garage-ui-car-image span {
          font-size: 43px;
        }

        .garage-ui-car-image small {
          position: absolute;
          top: 7px;
          right: 7px;
          color: #c4a5ff;
          font-size: 8px;
        }

        .garage-ui-car-card h3 {
          margin: 12px 0 5px;
          font-size: 13px;
        }

        .garage-ui-car-card p {
          color: #aaa;
          font-size: 11px;
        }

        .garage-ui-car-card button {
          width: 100%;
          margin-top: 8px;
        }

        .garage-ui-car-card button:disabled {
          opacity: .6;
        }

        .garage-ui-list {
          display: grid;
          gap: 9px;
        }

        .garage-ui-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 13px;
          border: 1px solid #352b44;
          border-radius: 11px;
          background: #15121d;
        }

        .garage-ui-item h3,
        .garage-ui-item p {
          margin: 0;
          font-size: 12px;
        }

        .garage-ui-item p {
          margin-top: 5px;
          color: #999;
        }

        .garage-ui-item strong {
          color: #c4a5ff;
          font-size: 10px;
        }

        .garage-ui-customize h3,
        .garage-ui-damage h3 {
          margin: 18px 0 12px;
          font-size: 14px;
        }

        .garage-ui-color-grid {
          display: grid;
          grid-template-columns: repeat(5,1fr);
          gap: 9px;
        }

        .garage-ui-color {
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border: 2px solid #ffffff22;
          border-radius: 10px;
          color: white;
          text-shadow: 0 1px 5px #000;
          font-size: 12px;
        }

        .garage-ui-damage-meter {
          height: 12px;
          overflow: hidden;
          border-radius: 20px;
          background: #302b38;
          margin: 15px 0;
        }

        .garage-ui-damage-meter div {
          height: 100%;
          background: linear-gradient(90deg,#a78bfa,#ef4444);
        }

        .garage-ui-damage p,
        .garage-ui-note {
          color: #aaa;
          font-size: 12px;
        }

        .garage-ui-empty {
          padding: 25px;
          color: #aaa;
          text-align: center;
        }

        @media(max-width:380px) {
          .garage-ui-car-grid {
            grid-template-columns: 1fr;
          }

          .garage-ui-stats strong {
            font-size: 14px;
          }
        }
      `;

      document.head.appendChild(style);
    },

    destroy() {
      if (this.root) {
        delete this.root.dataset.garageUIBound;
      }

      this.root = null;
      this.initialized = false;
    }
  };

  SX.garageUI = GarageUI;

  window.dispatchEvent(
    new CustomEvent("sx:garage-ui-ready")
  );

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 65
   FILE: js/garage-ui.js
   END
========================================================= */
