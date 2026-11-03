/* =========================================================
   SUPERX LEGEND
   FILE 154: js/garage-page-upgrade-progress.js
   PURPOSE: Garage upgrade levels and progress display
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageUpgradeProgress = {
    root: null,
    panel: null,
    initialized: false,

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");

      if (!this.root || !SX.vehicleUpgrades) return false;

      this.injectStyles();

      this.panel = document.createElement("section");
      this.panel.id = "sxGarageUpgradeProgress";
      this.panel.className = "sx-upgrade-progress";

      this.panel.setAttribute(
        "aria-label",
        "Vehicle upgrade progress"
      );

      const anchor =
        this.root.querySelector("#sxGarageCollection") ||
        this.root.querySelector("#garageFeatureGrid");

      if (!anchor) return false;

      anchor.insertAdjacentElement("afterend", this.panel);

      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    getCarId() {
      return String(
        SX.garageManager?.selectedCarId ||
        SX.player?.selectedCar ||
        "default"
      );
    },

    refresh() {
      if (!this.panel || !SX.vehicleUpgrades) return;

      const upgrades = SX.vehicleUpgrades.getAll(
        this.getCarId()
      );

      const totalLevels = upgrades.reduce(
        (sum, item) => sum + Number(item.level || 0),
        0
      );

      const maxLevels = upgrades.reduce(
        (sum, item) => sum + Number(item.maxLevel || 0),
        0
      );

      const rows = upgrades.map(item => {
        const level = Number(item.level) || 0;
        const max = Number(item.maxLevel) || 10;
        const progress = Math.min(100, (level / max) * 100);

        return `
          <div class="sx-upgrade-row">
            <div class="sx-upgrade-row-head">
              <strong>${this.escapeHTML(item.name)}</strong>
              <span>
                ${level}/${max}
              </span>
            </div>

            <div
              class="sx-upgrade-track"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="${max}"
              aria-valuenow="${level}"
              aria-label="${this.escapeHTML(item.name)} upgrade level"
            >
              <span style="width:${progress}%"></span>
            </div>

            <small>
              ${item.maxed
                ? "MAX LEVEL REACHED"
                : "NEXT UPGRADE · ◆ " +
                  Number(item.cost || 0).toLocaleString("en-IN") +
                  " COINS"}
            </small>
          </div>
        `;
      }).join("");

      const percentage = maxLevels
        ? Math.round((totalLevels / maxLevels) * 100)
        : 0;

      this.panel.innerHTML = `
        <div class="sx-upgrade-progress-heading">
          <div>
            <strong>PERFORMANCE UPGRADES</strong>
            <span>YOUR VEHICLE DEVELOPMENT</span>
          </div>

          <strong>${percentage}%</strong>
        </div>

        <div class="sx-upgrade-overall-track">
          <span style="width:${percentage}%"></span>
        </div>

        <div class="sx-upgrade-total">
          ${totalLevels} / ${maxLevels} TOTAL LEVELS
        </div>

        <div class="sx-upgrade-list">
          ${rows}
        </div>
      `;
    },

    escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    },

    bindEvents() {
      [
        "sx:car-upgraded",
        "sx:garage-car-selected",
        "sx:garage-car-purchased",
        "sx:car-upgrades-reset"
      ].forEach(eventName => {
        window.addEventListener(eventName, () => {
          this.refresh();
        });
      });
    },

    injectStyles() {
      if (document.getElementById("sx-upgrade-progress-styles")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "sx-upgrade-progress-styles";

      style.textContent = `
        .sx-upgrade-progress {
          margin-top: 14px;
          padding: 16px;
          border: 1px solid rgba(180,135,255,.18);
          border-radius: 14px;
          background: rgba(12,10,20,.76);
          color: #f5f1ff;
        }

        .sx-upgrade-progress-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sx-upgrade-progress-heading div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sx-upgrade-progress-heading div strong {
          font-size: 12px;
          letter-spacing: 1px;
        }

        .sx-upgrade-progress-heading div span,
        .sx-upgrade-total {
          color: #a9a0bb;
          font-size: 9px;
          letter-spacing: .8px;
        }

        .sx-upgrade-progress-heading > strong {
          color: #c19aff;
          font-size: 20px;
        }

        .sx-upgrade-overall-track,
        .sx-upgrade-track {
          overflow: hidden;
          border-radius: 20px;
          background: rgba(255,255,255,.09);
        }

        .sx-upgrade-overall-track {
          height: 7px;
          margin-top: 12px;
        }

        .sx-upgrade-overall-track span,
        .sx-upgrade-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#7739d8,#c19aff);
          transition: width .25s ease;
        }

        .sx-upgrade-total {
          margin-top: 7px;
          text-align: right;
        }

        .sx-upgrade-list {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 13px;
          margin-top: 16px;
        }

        .sx-upgrade-row {
          min-width: 0;
          padding: 11px;
          border: 1px solid rgba(180,135,255,.13);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
        }

        .sx-upgrade-row-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 11px;
        }

        .sx-upgrade-row-head span {
          color: #c19aff;
          white-space: nowrap;
        }

        .sx-upgrade-track {
          height: 5px;
        }

        .sx-upgrade-row small {
          display: block;
          margin-top: 8px;
          color: #a9a0bb;
          font-size: 9px;
          line-height: 1.4;
        }

        @media(max-width:380px) {
          .sx-upgrade-progress {
            padding: 12px;
          }

          .sx-upgrade-list {
            grid-template-columns: 1fr;
          }
        }
      `;

      document.head.appendChild(style);
    }
  };

  SX.garagePageUpgradeProgress = GarageUpgradeProgress;

  function start() {
    GarageUpgradeProgress.init();
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
   FILE 154: js/garage-page-upgrade-progress.js
   END
========================================================= */
