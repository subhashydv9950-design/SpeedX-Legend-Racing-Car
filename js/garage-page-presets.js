
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 147: js/garage-page-presets.js

   START — FILE 147
   Garage Vehicle Setup Presets Integration
   ========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GaragePagePresets = {
    initialized: false,
    container: null,

    init() {
      if (this.initialized) return true;

      const setup = SX.vehicleSetup;
      const presets = SX.vehicleSetupPresets;
      const presetsUI = SX.vehicleSetupPresetsUI;

      this.container = document.getElementById(
        "garageSetupPresetsContainer"
      );

      if (!this.container) {
        console.warn(
          "SUPERX Presets: Garage container not found."
        );
        return false;
      }

      if (!setup || !presets || !presetsUI) {
        console.error(
          "SUPERX Presets: Required systems are not loaded."
        );
        return false;
      }

      if (!setup.initialized) {
        setup.init();
      }

      presets.init();

      const adapter = {
        getCarId() {
          return setup.getCarId();
        },

        getSetup() {
          return setup.getAll();
        },

        applySetup(values, carId) {
          if (
            !values ||
            typeof values !== "object" ||
            Array.isArray(values)
          ) {
            return false;
          }

          const currentCarId = setup.getCarId();

          if (
            carId !== null &&
            carId !== undefined &&
            String(carId) !== String(currentCarId)
          ) {
            return false;
          }

          const keys = Object.keys(values);

          if (!keys.length) return false;

          let applied = 0;

          keys.forEach(function (key) {
            if (setup.set(key, values[key])) {
              applied++;
            }
          });

          return applied > 0;
        }
      };

      presetsUI.render(this.container, adapter);

      window.addEventListener(
        "sx:garage-car-selected",
        this.handleCarChanged
      );

      this.initialized = true;

      return true;
    },

    handleCarChanged() {
      if (!SX.vehicleSetup) return;

      SX.vehicleSetup.init();

      if (
        SX.vehicleSetupPresetsUI &&
        GaragePagePresets.initialized
      ) {
        SX.vehicleSetupPresetsUI.refresh();
      }
    },

    destroy() {
      window.removeEventListener(
        "sx:garage-car-selected",
        this.handleCarChanged
      );

      if (SX.vehicleSetupPresetsUI) {
        SX.vehicleSetupPresetsUI.destroy();
      }

      this.container = null;
      this.initialized = false;

      return true;
    }
  };

  SX.garagePagePresets = GaragePagePresets;

  function start() {
    GaragePagePresets.init();
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
   END — FILE 147
   ========================================================= */
