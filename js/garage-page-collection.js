/* =========================================================
   SUPERX LEGEND
   FILE 151: js/garage-page-collection.js
   PURPOSE: Garage vehicle collection statistics
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePageCollection = {
    root: null,
    container: null,
    initialized: false,

    init() {
      if (this.initialized) return true;

      this.root = document.getElementById("garagePage");
      if (!this.root) return false;

      const featureGrid = this.root.querySelector(
        "#garageFeatureGrid"
      );

      if (!featureGrid) return false;

      this.injectStyles();

      this.container = document.createElement("section");
      this.container.id = "sxGarageCollection";
      this.container.className = "sx-garage-collection";

      this.container.setAttribute(
        "aria-label",
        "Vehicle collection statistics"
      );

      featureGrid.insertAdjacentElement(
        "afterend",
        this.container
      );

      this.bindEvents();
      this.refresh();

      this.initialized = true;
      return true;
    },

    getStatistics() {
      const manager = SX.garageManager;

      if (manager && typeof manager.getStatistics === "function") {
        return manager.getStatistics();
      }

      const cars = Array.isArray(SX.CARS) ? SX.CARS : [];

      const owned = cars.filter(car =>
        car.unlocked === true
      );

      return {
        totalCars: cars.length,
        ownedCars: owned.length,
        lockedCars: cars.length - owned.length,
        collectionPercentage: cars.length
          ? Math.round((owned.length / cars.length) * 100)
          : 0,
        fastestCar: owned.sort(
          (a, b) => Number(b.topSpeed || 0) -
            Number(a.topSpeed || 0)
        )[0] || null
      };
    },

    refresh() {
      if (!this.container) return;

      const stats = this.getStatistics();

      const total = Number(stats.totalCars) || 0;
      const owned = Number(stats.ownedCars) || 0;
      const locked = Number(stats.lockedCars) || 0;

      const percentage = Math.max(
        0,
        Math.min(100, Number(stats.collectionPercentage) || 0)
      );

      const fastest = stats.fastestCar;

      this.container.innerHTML = `
        <div class="sx-collection-heading">
          <div>
            <strong>MY CAR COLLECTION</strong>
            <span>YOUR GARAGE PROGRESS</span>
          </div>

          <strong class="sx-collection-percent">
            ${percentage}%
          </strong>
        </div>

        <div
          class="sx-collection-progress"
          role="progressbar"
          aria-label="Car collection progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="${percentage}"
        >
          <span style="width:${percentage}%"></span>
        </div>

        <div class="sx-collection-stats">
          <div class="sx-collection-stat">
            <strong>${total}</strong>
            <span>TOTAL CARS</span>
          </div>

          <div class="sx-collection-stat">
            <strong>${owned}</strong>
            <span>UNLOCKED</span>
          </div>

          <div class="sx-collection-stat">
            <strong>${locked}</strong>
            <span>LOCKED</span>
          </div>
        </div>

        <div class="sx-collection-fastest">
          <span>FASTEST OWNED VEHICLE</span>
          <strong>
            ${fastest
              ? this.escapeHTML(fastest.name || "Unknown")}
              : "No vehicle available"}
          </strong>
          <small>
            ${fastest
              ? `${Number(fastest.topSpeed) || 0} km/h`
              : "Unlock a vehicle to begin"}
          </small>
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
        "sx:garage-car-purchased",
        "sx:garage-car-selected",
        "sx:car-upgraded",
        "sx:garage-wallet-refresh"
      ].forEach(eventName => {
        window.addEventListener(eventName, () => {
          this.refresh();
        });
      });
    },

    injectStyles() {
      if (document.getElementById("sx-garage-collection-styles")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "sx-garage-collection-styles";

      style.textContent = `
        .sx-garage-collection {
          margin-top: 14px;
          padding: 16px;
          border: 1px solid rgba(180,135,255,.18);
          border-radius: 14px;
          background: rgba(12,10,20,.72);
          color: #f5f1ff;
        }

        .sx-collection-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sx-collection-heading div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sx-collection-heading div strong {
          font-size: 12px;
          letter-spacing: 1px;
        }

        .sx-collection-heading div span,
        .sx-collection-fastest span {
          color: #a9a0bb;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .sx-collection-percent {
          color: #c19aff;
          font-size: 20px;
        }

        .sx-collection-progress {
          height: 7px;
          overflow: hidden;
          border-radius: 20px;
          background: rgba(255,255,255,.09);
        }

        .sx-collection-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,#7739d8,#c19aff);
          transition: width .25s ease;
        }

        .sx-collection-stats {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 9px;
          margin-top: 14px;
        }

        .sx-collection-stat {
          min-width: 0;
          padding: 12px 6px;
          border: 1px solid rgba(180,135,255,.13);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          text-align: center;
        }

        .sx-collection-stat strong {
          display: block;
          font-size: 19px;
        }

        .sx-collection-stat span {
          display: block;
          margin-top: 5px;
          color: #a9a0bb;
          font-size: 9px;
          letter-spacing: .5px;
        }

        .sx-collection-fastest {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid rgba(180,135,255,.13);
        }

        .sx-collection-fastest strong {
          font-size: 13px;
        }

        .sx-collection-fastest small {
          color: #c19aff;
          font-size: 11px;
        }

        @media(max-width:380px) {
          .sx-garage-collection {
            padding: 12px;
          }

          .sx-collection-stat {
            padding: 10px 3px;
          }

          .sx-collection-stat strong {
            font-size: 16px;
          }

          .sx-collection-stat span {
            font-size: 8px;
          }
        }
      `;

      document.head.appendChild(style);
    }
  };

  SX.garagePageCollection = GaragePageCollection;

  function start() {
    GaragePageCollection.init();
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
   FILE 151: js/garage-page-collection.js
   END
========================================================= */
