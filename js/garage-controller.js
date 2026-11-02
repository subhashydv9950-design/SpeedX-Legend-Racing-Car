
/* =========================================================
   SUPERX LEGEND — FILE 66
   FILE: js/garage-controller.js
   PURPOSE: Connect garage UI with vehicle systems
   START
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const GarageController = {
    initialized: false,
    root: null,
    currentCarId: null,

    init(options = {}) {
      this.root = typeof options.root === "string"
        ? document.querySelector(options.root)
        : options.root || document.querySelector("#garagePage");

      if (!this.root) {
        return {
          success: false,
          message: "Garage container not found."
        };
      }

      this.bindEvents();
      this.syncSelectedCar();
      this.initialized = true;

      return {
        success: true,
        carId: this.currentCarId
      };
    },

    bindEvents() {
      if (this.root.dataset.controllerBound) return;

      this.root.dataset.controllerBound = "true";

      this.root.addEventListener("click", event => {
        const upgrade = event.target.closest(
          "[data-upgrade-category]"
        );

        const color = event.target.closest(
          "[data-paint-color]"
        );

        const rim = event.target.closest(
          "[data-select-rim]"
        );

        const part = event.target.closest(
          "[data-toggle-part]"
        );

        const buyPart = event.target.closest(
          "[data-buy-part]"
        );

        if (upgrade) {
          this.purchaseUpgrade(
            upgrade.dataset.upgradeCategory
          );
          return;
        }

        if (color) {
          this.purchaseOrSelectColor(
            color.dataset.paintColor
          );
          return;
        }

        if (rim) {
          this.purchaseOrSelectRim(
            rim.dataset.selectRim
          );
          return;
        }

        if (part) {
          this.togglePart(
            part.dataset.togglePart,
            part.dataset.enabled !== "true"
          );
          return;
        }

        if (buyPart) {
          this.purchasePart(
            buyPart.dataset.buyPart
          );
        }
      });

      window.addEventListener(
        "sx:garage-car-selected",
        event => {
          this.currentCarId =
            String(event.detail.carId);

          this.syncSelectedCar();
        }
      );
    },

    syncSelectedCar() {
      const manager = SX.garageManager;

      if (manager && manager.selectedCarId) {
        this.currentCarId = String(
          manager.selectedCarId
        );
      }

      if (SX.vehicleCustomization) {
        SX.vehicleCustomization.setActiveCar(
          this.currentCarId || "default"
        );
      }

      if (SX.vehicleUpgrades) {
        SX.vehicleUpgrades.getAll(
          this.currentCarId
        );
      }

      if (SX.vehicleDamage) {
        SX.vehicleDamage.setActiveVehicle(
          this.currentCarId || "player"
        );
      }

      this.emit("sx:garage-synced", {
        carId: this.currentCarId
      });
    },

    purchaseUpgrade(category) {
      if (!SX.vehicleUpgrades) {
        return this.message("Upgrade system unavailable.");
      }

      const result = SX.vehicleUpgrades.upgrade(
        category,
        this.currentCarId
      );

      this.message(
        result.success
          ? "Upgrade purchased successfully."
          : result.message
      );

      this.refreshUI();

      return result;
    },

    purchaseOrSelectColor(colorId) {
      const system = SX.vehicleCustomization;

      if (!system) {
        return this.message("Customization unavailable.");
      }

      const catalog = system.getCatalog();

      const color = catalog.colors.find(
        item => item.id === colorId
      );

      if (!color) return false;

      const result = color.owned
        ? system.selectColor(colorId)
        : system.buyColor(colorId);

      this.message(
        result === true || result.success
          ? "Paint updated successfully."
          : result.message
      );

      this.updatePreview();
      this.refreshUI();

      return result;
    },

    purchaseOrSelectRim(rimId) {
      const system = SX.vehicleCustomization;

      if (!system) return false;

      const catalog = system.getCatalog();

      const rim = catalog.rims.find(
        item => item.id === rimId
      );

      if (!rim) return false;

      const result = rim.owned
        ? system.selectRim(rimId)
        : system.buyRim(rimId);

      this.message(
        result === true || result.success
          ? "Rims updated successfully."
          : result.message
      );

      this.refreshUI();

      return result;
    },

    purchasePart(partId) {
      if (!SX.vehicleCustomization) return false;

      const result = SX.vehicleCustomization.buyPart(
        partId
      );

      this.message(
        result.success
          ? "Vehicle part purchased."
          : result.message
      );

      this.updatePreview();
      this.refreshUI();

      return result;
    },

    togglePart(partId, enabled) {
      if (!SX.vehicleCustomization) return false;

      const result = SX.vehicleCustomization.togglePart(
        partId,
        enabled
      );

      this.message(
        result === true
          ? "Vehicle appearance updated."
          : result.message
      );

      this.updatePreview();
      this.refreshUI();

      return result;
    },

    updatePreview() {
      if (!SX.garagePreview) return;

      const customization =
        SX.vehicleCustomization?.getCurrent();

      if (!customization) return;

      if (customization.color) {
        SX.garagePreview.setColor(
          customization.color.color
        );
      }

      Object.entries(customization.parts).forEach(
        ([part, enabled]) => {
          SX.garagePreview.setPart(part, enabled);
        }
      );
    },

    refreshUI() {
      if (SX.garageUI && SX.garageUI.initialized) {
        SX.garageUI.render();
      }
    },

    message(text) {
      if (
        SX.notifications &&
        typeof SX.notifications.show === "function"
      ) {
        SX.notifications.show(text);
      }
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    },

    destroy() {
      if (this.root) {
        delete this.root.dataset.controllerBound;
      }

      this.root = null;
      this.initialized = false;
    }
  };

  SX.garageController = GarageController;

  window.dispatchEvent(
    new CustomEvent("sx:garage-controller-ready")
  );

})(window, document);

/* =========================================================
   SUPERX LEGEND — FILE 66
   FILE: js/garage-controller.js
   END
========================================================= */
