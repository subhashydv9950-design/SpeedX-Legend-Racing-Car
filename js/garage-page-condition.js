
/* =========================================================
   SUPERX LEGEND
   FILE 149: js/garage-page-condition.js
   PURPOSE: Garage vehicle condition and repair interface
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageCondition = {
    root: null,
    panel: null,
    initialized: false,

    parts: [
      { id: "engine", label: "Engine" },
      { id: "body", label: "Body" },
      { id: "tyres", label: "Tyres" },
      { id: "suspension", label: "Suspension" },
      { id: "windshield", label: "Windshield" }
    ],

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");

      if (!this.root) return false;

      this.panel = this.root.querySelector(
        ".garage-bottom-grid .garage-bottom-panel:first-child .garage-preset-placeholder"
      );

      if (!this.panel) return false;

      this.injectStyles();
      this.bindEvents();
      this.render();

      this.initialized = true;
      return true;
    },

    getCarId() {
      return String(
        SX.garageManager?.selectedCarId ||
        SX.player?.selectedCar ||
        "player"
      );
    },

    getDamageSystem() {
      return SX.vehicleDamage || null;
    },

    getState() {
      const damage = this.getDamageSystem();

      if (!damage) return null;

      const carId = this.getCarId();

      damage.setActiveVehicle(carId);

      return damage.getState(carId);
    },

    render() {
      if (!this.panel) return;

      const state = this.getState();

      if (!state) {
        this.panel.innerHTML = `
          <div class="sx-condition-empty">
            <strong>Vehicle diagnostics unavailable</strong>
            <span>Damage system is waiting to load.</span>
          </div>
        `;
        return;
      }

      const status = this.getStatus(state);

      const partRows = this.parts.map(part => {
        const value = Math.round(
          Number(state[part.id]) || 0
        );

        return `
          <div class="sx-condition-part">
            <div class="sx-condition-part-head">
              <span>${part.label}</span>
              <strong>${value}%</strong>
            </div>

            <div class="sx-condition-track">
              <span style="width:${value}%"></span>
            </div>
          </div>
        `;
      }).join("");

      const repairCost = Math.max(
        0,
        Math.floor(Number(state.repairCost) || 0)
      );

      const damaged = Number(state.totalDamage) > 0;

      this.panel.innerHTML = `
        <div class="sx-condition">
          <div class="sx-condition-summary">
            <div>
              <span class="sx-condition-label">VEHICLE STATUS</span>
              <strong class="sx-condition-status ${status.className}">
                ${status.label}
              </strong>
            </div>

            <div class="sx-condition-total">
              <strong>${Math.round(state.totalDamage)}%</strong>
              <span>Total Damage</span>
            </div>
          </div>

          <div class="sx-condition-parts">
            ${partRows}
          </div>

          <div class="sx-condition-footer">
            <div class="sx-condition-cost">
              <span>REPAIR COST</span>
              <strong>◆ ${repairCost.toLocaleString("en-IN")}</strong>
            </div>

            <button
              type="button"
              class="sx-condition-repair"
              data-sx-condition-repair
              ${damaged ? "" : "disabled"}
            >
              ${damaged ? "REPAIR VEHICLE" : "VEHICLE HEALTHY"}
            </button>
          </div>

          <p class="sx-condition-note">
            Repair cost is calculated from the current vehicle damage.
          </p>
        </div>
      `;
    },

    getStatus(state) {
      const damage = Number(state.totalDamage) || 0;

      if (damage >= 75) {
        return {
          label: "CRITICAL",
          className: "critical"
        };
      }

      if (damage >= 45) {
        return {
          label: "DAMAGED",
          className: "damaged"
        };
      }

      if (damage >= 15) {
        return {
          label: "MINOR DAMAGE",
          className: "minor"
        };
      }

      return {
        label: "EXCELLENT",
        className: "excellent"
      };
    },

    bindEvents() {
      this.panel.addEventListener("click", event => {
        const repairButton = event.target.closest(
          "[data-sx-condition-repair]"
        );

        if (!repairButton || repairButton.disabled) return;

        this.repairVehicle();
      });

      window.addEventListener(
        "sx:vehicle-damaged",
        () => this.render()
      );

      window.addEventListener(
        "sx:vehicle-repaired",
        () => {
          this.render();
          this.refreshWallet();
        }
      );

      window.addEventListener(
        "sx:vehicle-part-repaired",
        () => this.render()
      );

      window.addEventListener(
        "sx:garage-car-selected",
        () => this.render()
      );
    },

    repairVehicle() {
      const damage = this.getDamageSystem();

      if (!damage) {
        this.notify("Repair system unavailable.");
        return;
      }

      const carId = this.getCarId();
      const result = damage.repair(carId);

      if (!result || !result.success) {
        this.notify(
          result?.message || "Vehicle repair failed."
        );
        return;
      }

      this.render();
      this.refreshWallet();

      this.notify(
        "Vehicle repaired successfully. Coins used: " +
        Number(result.cost || 0).toLocaleString("en-IN")
      );
    },

    refreshWallet() {
      SX.garagePageWallet?.refresh?.();

      window.dispatchEvent(
        new CustomEvent("sx:garage-wallet-refresh")
      );
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
        "sxConditionNotice"
      );

      if (!notice) {
        notice = document.createElement("div");
        notice.id = "sxConditionNotice";
        notice.setAttribute("role", "status");
        document.body.appendChild(notice);
      }

      notice.textContent = String(message);
      notice.classList.add("visible");

      window.clearTimeout(this.noticeTimer);

      this.noticeTimer = window.setTimeout(() => {
        notice.classList.remove("visible");
      }, 2600);
    },

    injectStyles() {
      if (document.getElementById("sx-condition-styles")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "sx-condition-styles";

      style.textContent = `
        .sx-condition {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .sx-condition-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sx-condition-label,
        .sx-condition-cost span {
          display: block;
          color: #a9a0bb;
          font-size: 10px;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .sx-condition-status {
          display: inline-block;
          font-size: 15px;
          letter-spacing: .7px;
        }

        .sx-condition-status.excellent {
          color: #65e6a0;
        }

        .sx-condition-status.minor {
          color: #ffd66b;
        }

        .sx-condition-status.damaged {
          color: #ff9b55;
        }

        .sx-condition-status.critical {
          color: #ff626f;
        }

        .sx-condition-total {
          text-align: right;
        }

        .sx-condition-total strong {
          display: block;
          font-size: 22px;
        }

        .sx-condition-total span {
          color: #a9a0bb;
          font-size: 10px;
        }

        .sx-condition-parts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .sx-condition-part {
          min-width: 0;
        }

        .sx-condition-part-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 11px;
        }

        .sx-condition-part-head span {
          color: #c9c0d9;
        }

        .sx-condition-track {
          height: 6px;
          overflow: hidden;
          border-radius: 20px;
          background: rgba(255,255,255,.09);
        }

        .sx-condition-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#9b5cff,#ff647c);
        }

        .sx-condition-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 13px;
          border-top: 1px solid rgba(180,135,255,.16);
        }

        .sx-condition-cost strong {
          color: #ffd66b;
          font-size: 15px;
        }

        .sx-condition-repair {
          min-height: 40px;
          padding: 0 15px;
          border: 0;
          border-radius: 9px;
          background: linear-gradient(100deg,#7739d8,#a45cff);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .sx-condition-repair:disabled {
          background: #292432;
          color: #91899e;
          cursor: not-allowed;
        }

        .sx-condition-note {
          margin: 0;
          color: #a9a0bb;
          font-size: 10px;
          line-height: 1.5;
        }

        .sx-condition-empty {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #a9a0bb;
          font-size: 12px;
        }

        .sx-condition-empty strong {
          color: #f5f1ff;
        }

        #sxConditionNotice {
          position: fixed;
          z-index: 9999;
          left: 50%;
          bottom: 22px;
          transform: translate(-50%, 12px);
          max-width: calc(100vw - 28px);
          padding: 12px 17px;
          border: 1px solid rgba(180,135,255,.4);
          border-radius: 11px;
          background: #211832;
          color: #fff;
          font-size: 12px;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: .2s ease;
        }

        #sxConditionNotice.visible {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        @media(max-width:380px) {
          .sx-condition-parts {
            grid-template-columns: 1fr;
          }

          .sx-condition-repair {
            width: 100%;
          }
        }
      `;

      document.head.appendChild(style);
    },

    destroy() {
      this.panel = null;
      this.root = null;
      this.initialized = false;
    }
  };

  SX.garagePageCondition = GaragePageCondition;

  function start() {
    GaragePageCondition.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

})(window, document);

/* =========================================================
   FILE 149: js/garage-page-condition.js
   END
========================================================= */
