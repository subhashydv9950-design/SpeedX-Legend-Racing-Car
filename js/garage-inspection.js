
/* =========================================================
   SUPERX LEGEND — FILE 67
   FILE: js/garage-inspection.js
   PURPOSE: Vehicle inspection and condition report
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const Inspection = {
    initialized: false,
    root: null,
    carId: null,

    init(options = {}) {
      this.root = typeof options.root === "string"
        ? document.querySelector(options.root)
        : options.root || document.querySelector(
            "#garageInspection"
          );

      if (!this.root) {
        return {
          success: false,
          message: "Inspection container not found."
        };
      }

      this.carId = this.getSelectedCarId();
      this.render();
      this.initialized = true;

      return { success: true };
    },

    getSelectedCarId() {
      if (SX.garageManager?.selectedCarId) {
        return String(SX.garageManager.selectedCarId);
      }

      const car = SX.getSelectedCar?.();

      return car?.id ? String(car.id) : null;
    },

    getCar() {
      const id = this.carId || this.getSelectedCarId();

      if (!id) return null;

      if (typeof SX.getCar === "function") {
        return SX.getCar(id) || null;
      }

      return SX.CARS?.find(
        car => String(car.id) === String(id)
      ) || null;
    },

    getUpgradeData() {
      if (!SX.vehicleUpgrades) return null;

      try {
        return SX.vehicleUpgrades.getAll(this.carId);
      } catch (error) {
        return null;
      }
    },

    getDamageData() {
      if (!SX.vehicleDamage) return null;

      try {
        return SX.vehicleDamage.getVehicle(
          this.carId || "player"
        );
      } catch (error) {
        return null;
      }
    },

    getCondition() {
      const damage = this.getDamageData();

      let condition = 100;

      if (damage) {
        if (Number.isFinite(damage.condition)) {
          condition = damage.condition;
        } else if (Number.isFinite(damage.damage)) {
          condition = 100 - damage.damage;
        }
      }

      condition = Math.max(
        0,
        Math.min(100, condition)
      );

      return {
        value: Math.round(condition),
        label: condition >= 85
          ? "Excellent"
          : condition >= 60
            ? "Good"
            : condition >= 30
              ? "Needs Repair"
              : "Critical"
      };
    },

    getSpecifications() {
      const car = this.getCar();

      if (!car) return [];

      return [
        {
          label: "Top Speed",
          value: `${car.topSpeed || car.speed || 0} km/h`
        },
        {
          label: "Power",
          value: `${car.power || car.horsepower || 0} HP`
        },
        {
          label: "Handling",
          value: `${car.handling || 0}/100`
        },
        {
          label: "Acceleration",
          value: `${car.acceleration || 0}/100`
        },
        {
          label: "Class",
          value: car.class || car.category || "Standard"
        }
      ];
    },

    getUpgradeSummary() {
      const upgrades = this.getUpgradeData();

      if (!upgrades) return [];

      const categories = [
        "engine",
        "gearbox",
        "turbo",
        "brakes",
        "tyres",
        "suspension",
        "steering"
      ];

      return categories.map(category => {
        const item = upgrades[category];

        const level = typeof item === "number"
          ? item
          : Number(item?.level || 0);

        return {
          name: category,
          level: Math.max(0, level)
        };
      });
    },

    render() {
      if (!this.root) return;

      const car = this.getCar();

      if (!car) {
        this.root.innerHTML = `
          <div class="sx-inspection-empty">
            <h3>No vehicle selected</h3>
            <p>Select a vehicle to inspect its details.</p>
          </div>
        `;
        return;
      }

      const condition = this.getCondition();
      const specs = this.getSpecifications();
      const upgrades = this.getUpgradeSummary();

      this.root.innerHTML = `
        <section class="sx-inspection-panel">

          <header class="sx-inspection-header">
            <div>
              <span class="sx-inspection-eyebrow">
                VEHICLE REPORT
              </span>
              <h2>${this.escape(car.name || "SUPERX Vehicle")}</h2>
            </div>

            <span class="sx-inspection-status">
              ${condition.label}
            </span>
          </header>

          <div class="sx-condition-section">
            <div class="sx-condition-heading">
              <span>Vehicle Condition</span>
              <strong>${condition.value}%</strong>
            </div>

            <div class="sx-condition-track">
              <div
                class="sx-condition-fill"
                style="width:${condition.value}%"
              ></div>
            </div>
          </div>

          <div class="sx-inspection-specs">
            ${specs.map(item => `
              <div class="sx-inspection-spec">
                <span>${this.escape(item.label)}</span>
                <strong>${this.escape(item.value)}</strong>
              </div>
            `).join("")}
          </div>

          <div class="sx-inspection-upgrades">
            <h3>Installed Upgrades</h3>

            ${
              upgrades.length
                ? upgrades.map(item => `
                  <div class="sx-upgrade-row">
                    <span>${this.escape(
                      item.name.toUpperCase()
                    )}</span>
                    <strong>Level ${item.level}</strong>
                  </div>
                `).join("")
                : `<p>Upgrade details unavailable.</p>`
            }
          </div>

          <button
            type="button"
            class="sx-inspection-repair"
            data-inspection-repair
          >
            Repair Vehicle
          </button>

        </section>
      `;

      this.bindRepairButton();
    },

    bindRepairButton() {
      const button = this.root?.querySelector(
        "[data-inspection-repair]"
      );

      if (!button) return;

      button.addEventListener("click", () => {
        if (!SX.vehicleDamage) {
          this.notify("Repair system unavailable.");
          return;
        }

        const result = SX.vehicleDamage.repair(
          this.carId || "player"
        );

        this.notify(
          result?.success
            ? "Vehicle repaired successfully."
            : result?.message || "Repair could not be completed."
        );

        this.render();
      });
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

    notify(message) {
      if (SX.notifications?.show) {
        SX.notifications.show(message);
      }
    },

    refresh() {
      this.carId = this.getSelectedCarId();
      this.render();
    }
  };

  SX.garageInspection = Inspection;

  window.addEventListener(
    "sx:garage-car-selected",
    () => Inspection.refresh()
  );

  window.addEventListener(
    "sx:car-upgraded",
    () => Inspection.refresh()
  );

  window.addEventListener(
    "sx:vehicle-damage-updated",
    () => Inspection.refresh()
  );

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 67
   FILE: js/garage-inspection.js
   END
========================================================= */
