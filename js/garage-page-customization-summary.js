/* =========================================================
   SUPERX LEGEND — FILE 155
   FILE: js/garage-page-customization-summary.js
   PURPOSE: Garage customization inventory summary
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MODULE = {
    id: "sxGarageCustomizationSummary",

    getActiveCarId() {
      const manager = SX.garageManager;

      return String(
        manager && manager.selectedCarId
          ? manager.selectedCarId
          : "default"
      );
    },

    getCustomization() {
      const system = SX.vehicleCustomization;

      if (!system) return null;

      const carId = this.getActiveCarId();

      if (typeof system.setActiveCar === "function") {
        system.setActiveCar(carId);
      }

      if (typeof system.getCatalog !== "function") {
        return null;
      }

      return system.getCatalog();
    },

    createPanel() {
      if (document.getElementById(this.id)) return;

      const panel = document.createElement("section");

      panel.id = this.id;
      panel.className = "sx-garage-customization-summary";

      panel.innerHTML = `
        <div class="sx-gcs-heading">
          <div>
            <span class="sx-gcs-kicker">VEHICLE CUSTOMIZATION</span>
            <h3>Customization Inventory</h3>
            <p>Your unlocked styling collection</p>
          </div>
          <span class="sx-gcs-total" id="sxGcsTotal">0 OWNED</span>
        </div>

        <div class="sx-gcs-overview" id="sxGcsOverview"></div>

        <div class="sx-gcs-selected">
          <span class="sx-gcs-label">CURRENT PAINT</span>
          <div id="sxGcsPaint">Loading...</div>
        </div>

        <div class="sx-gcs-groups" id="sxGcsGroups"></div>
      `;

      const style = document.createElement("style");

      style.textContent = `
        #${this.id} {
          width: 100%;
          margin: 18px 0;
          padding: 18px;
          box-sizing: border-box;
          color: #f4f1ff;
          background: linear-gradient(145deg,#171323,#0c0a12);
          border: 1px solid rgba(168,115,255,.22);
          border-radius: 18px;
          font-family: inherit;
        }

        #${this.id} * {
          box-sizing: border-box;
        }

        #${this.id} .sx-gcs-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        #${this.id} .sx-gcs-kicker {
          color: #ae8aff;
          font-size: 10px;
          letter-spacing: 2px;
          font-weight: 800;
        }

        #${this.id} h3 {
          margin: 6px 0;
          font-size: 18px;
        }

        #${this.id} p {
          margin: 0;
          color: #9991a9;
          font-size: 12px;
        }

        #${this.id} .sx-gcs-total {
          padding: 8px 11px;
          border-radius: 20px;
          color: #d9c5ff;
          background: rgba(139,92,246,.16);
          font-size: 10px;
          font-weight: 800;
        }

        #${this.id} .sx-gcs-overview {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 9px;
          margin: 17px 0;
        }

        #${this.id} .sx-gcs-stat {
          padding: 12px 8px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          text-align: center;
        }

        #${this.id} .sx-gcs-stat strong {
          display: block;
          color: #c4a3ff;
          font-size: 20px;
        }

        #${this.id} .sx-gcs-stat span {
          display: block;
          margin-top: 4px;
          color: #aaa2b7;
          font-size: 10px;
        }

        #${this.id} .sx-gcs-selected {
          padding: 13px;
          border-radius: 12px;
          background: rgba(139,92,246,.09);
          border: 1px solid rgba(139,92,246,.17);
        }

        #${this.id} .sx-gcs-label {
          display: block;
          margin-bottom: 8px;
          color: #a99abf;
          font-size: 10px;
          letter-spacing: 1px;
        }

        #${this.id} .sx-gcs-paint-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
        }

        #${this.id} .sx-gcs-color {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,.5);
        }

        #${this.id} .sx-gcs-groups {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
          margin-top: 12px;
        }

        #${this.id} .sx-gcs-group {
          min-width: 0;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        #${this.id} .sx-gcs-group h4 {
          margin: 0 0 9px;
          color: #d8c6ff;
          font-size: 12px;
        }

        #${this.id} .sx-gcs-item {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,.045);
          color: #c4bdce;
          font-size: 10px;
        }

        #${this.id} .sx-gcs-item:last-child {
          border-bottom: 0;
        }

        #${this.id} .sx-gcs-owned {
          color: #8ee6b0;
        }

        #${this.id} .sx-gcs-locked {
          color: #91899c;
        }

        @media(max-width:480px) {
          #${this.id} {
            padding: 14px;
          }

          #${this.id} .sx-gcs-groups {
            grid-template-columns: 1fr;
          }
        }
      `;

      document.head.appendChild(style);

      const anchor =
        document.getElementById("sxGarageUpgradeProgress") ||
        document.getElementById("sxGarageCollection") ||
        document.getElementById("garageFeatureGrid");

      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(
          panel,
          anchor.nextSibling
        );
      } else {
        const root = document.getElementById("garagePage");

        if (root) root.appendChild(panel);
      }
    },

    renderGroup(title, items, type) {
      const list = Array.isArray(items) ? items : [];

      const rows = list.map(item => {
        const selected =
          type === "parts"
            ? item.enabled
            : item.selected;

        const owned =
          type === "parts"
            ? item.owned
            : item.owned;

        let status = owned ? "OWNED" : "LOCKED";

        if (selected) status = "ACTIVE";

        return `
          <div class="sx-gcs-item">
            <span>${this.escape(item.name)}</span>
            <span class="${owned ? "sx-gcs-owned" : "sx-gcs-locked"}">
              ${status}
            </span>
          </div>
        `;
      }).join("");

      return `
        <div class="sx-gcs-group">
          <h4>${title}</h4>
          ${rows || '<div class="sx-gcs-item">No items available</div>'}
        </div>
      `;
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

    refresh() {
      const catalog = this.getCustomization();

      if (!catalog) return;

      const panel = document.getElementById(this.id);

      if (!panel) return;

      const colors = catalog.colors || [];
      const rims = catalog.rims || [];
      const parts = catalog.parts || [];

      const countOwned = items =>
        items.filter(item => item.owned).length;

      const colorCount = countOwned(colors);
      const rimCount = countOwned(rims);
      const partCount = countOwned(parts);

      const total = colorCount + rimCount + partCount;

      const totalElement =
        document.getElementById("sxGcsTotal");

      const overview =
        document.getElementById("sxGcsOverview");

      const paint =
        document.getElementById("sxGcsPaint");

      const groups =
        document.getElementById("sxGcsGroups");

      if (totalElement) {
        totalElement.textContent = total + " OWNED";
      }

      if (overview) {
        overview.innerHTML = `
          <div class="sx-gcs-stat">
            <strong>${colorCount}/${colors.length}</strong>
            <span>PAINTS</span>
          </div>
          <div class="sx-gcs-stat">
            <strong>${rimCount}/${rims.length}</strong>
            <span>RIMS</span>
          </div>
          <div class="sx-gcs-stat">
            <strong>${partCount}/${parts.length}</strong>
            <span>BODY PARTS</span>
          </div>
        `;
      }

      const selectedColor =
        colors.find(item => item.selected);

      if (paint) {
        paint.innerHTML = selectedColor
          ? `
            <div class="sx-gcs-paint-row">
              <span class="sx-gcs-color"
                style="background:${/^#[0-9a-f]{3,8}$/i.test(selectedColor.color) ? selectedColor.color : "#8b5cf6"}">
              </span>
              <span>${this.escape(selectedColor.name)}</span>
            </div>
          `
          : "No paint selected";
      }

      if (groups) {
        groups.innerHTML =
          this.renderGroup("PAINT COLLECTION", colors, "colors") +
          this.renderGroup("RIM COLLECTION", rims, "rims") +
          this.renderGroup("BODY PARTS", parts, "parts");
      }
    },

    init() {
      if (!document.getElementById("garagePage")) return;

      this.createPanel();
      this.refresh();

      window.addEventListener(
        "sx:vehicle-customization-changed",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-car-selected",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-preview-car-changed",
        () => this.refresh()
      );

      window.addEventListener(
        "sx:garage-car-purchased",
        () => this.refresh()
      );

      return this;
    }
  };

  SX.garageCustomizationSummary = MODULE;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => MODULE.init(),
      { once: true }
    );
  } else {
    MODULE.init();
  }

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 155
   FILE: js/garage-page-customization-summary.js
   END
========================================================= */
