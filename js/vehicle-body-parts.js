
/* =========================================================
   SUPERX LEGEND — FILE 76
   FILE: js/vehicle-body-parts.js
   PURPOSE: Vehicle body parts customization
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleBodyParts = {
    vehicle: null,
    initialized: false,
    selectedParts: {},
    originalVisibility: new Map(),

    categories: {
      bonnet: {
        label: "Bonnet",
        keywords: ["bonnet", "hood"]
      },
      frontBumper: {
        label: "Front Bumper",
        keywords: ["front_bumper", "frontbumper", "bumper_front"]
      },
      rearBumper: {
        label: "Rear Bumper",
        keywords: ["rear_bumper", "rearbumper", "bumper_rear"]
      },
      spoiler: {
        label: "Spoiler",
        keywords: ["spoiler", "wing"]
      },
      sideSkirt: {
        label: "Side Skirt",
        keywords: ["side_skirt", "sideskirt"]
      },
      roof: {
        label: "Roof",
        keywords: ["roof"]
      },
      exhaust: {
        label: "Exhaust",
        keywords: ["exhaust", "muffler"]
      },
      grille: {
        label: "Grille",
        keywords: ["grille", "front_grill"]
      }
    },

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle) return false;

      this.originalVisibility.clear();

      this.vehicle.traverse(object => {
        this.originalVisibility.set(
          object.uuid,
          object.visible
        );
      });

      this.initialized = true;
      this.loadSavedParts();

      return true;
    },

    getCategory(category) {
      return this.categories[category] || null;
    },

    getObjects(category) {
      if (!this.vehicle) return [];

      const definition = this.getCategory(category);

      if (!definition) return [];

      const matches = [];

      this.vehicle.traverse(object => {
        if (!object.isMesh && !object.isGroup) return;

        const name = String(object.name || "").toLowerCase();

        if (
          definition.keywords.some(keyword =>
            name.includes(keyword.toLowerCase())
          )
        ) {
          matches.push(object);
        }
      });

      return matches;
    },

    getAvailableParts() {
      return Object.keys(this.categories).map(key => ({
        id: key,
        name: this.categories[key].label,
        available: this.getObjects(key).length > 0,
        selected: this.selectedParts[key] || "default"
      }));
    },

    setPart(category, partId, options = {}) {
      if (!this.initialized) {
        return {
          success: false,
          message: "Vehicle not initialized."
        };
      }

      if (!this.getCategory(category)) {
        return {
          success: false,
          message: "Invalid body part category."
        };
      }

      if (!partId || typeof partId !== "string") {
        return {
          success: false,
          message: "Invalid part selection."
        };
      }

      const objects = this.getObjects(category);

      if (!objects.length) {
        return {
          success: false,
          message: "This part is not available in the model."
        };
      }

      const availablePart = objects.some(object => {
        const name = String(object.name || "").toLowerCase();
        return (
          name.includes(partId.toLowerCase()) ||
          partId === "default"
        );
      });

      if (!availablePart) {
        return {
          success: false,
          message: "Selected part model not found."
        };
      }

      objects.forEach(object => {
        const name = String(object.name || "").toLowerCase();

        const isSelected =
          partId === "default" ||
          name.includes(partId.toLowerCase());

        object.visible = isSelected;
      });

      this.selectedParts[category] = partId;

      this.save();

      this.dispatch("changed", {
        category,
        partId
      });

      return {
        success: true,
        message: "Body part updated."
      };
    },

    restoreCategory(category) {
      const objects = this.getObjects(category);

      if (!objects.length) return false;

      objects.forEach(object => {
        const original = this.originalVisibility.get(object.uuid);

        object.visible = original !== undefined
          ? original
          : true;
      });

      this.selectedParts[category] = "default";

      this.save();

      return true;
    },

    restoreAll() {
      if (!this.vehicle) return false;

      this.vehicle.traverse(object => {
        const original = this.originalVisibility.get(object.uuid);

        if (original !== undefined) {
          object.visible = original;
        }
      });

      this.selectedParts = {};

      this.save();

      this.dispatch("restored", {});

      return true;
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.bodyCustomization) {
        SX.player.bodyCustomization = {};
      }

      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      SX.player.bodyCustomization[carId] = {
        ...this.selectedParts
      };

      SX.savePlayer?.();
    },

    loadSavedParts() {
      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      const saved =
        SX.player?.bodyCustomization?.[carId] || {};

      Object.entries(saved).forEach(([category, partId]) => {
        if (this.getCategory(category)) {
          this.setPart(category, partId);
        }
      });
    },

    getState() {
      return {
        initialized: this.initialized,
        selectedParts: { ...this.selectedParts },
        availableParts: this.getAvailableParts()
      };
    },

    dispatch(eventName, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-body-${eventName}`, {
          detail
        })
      );
    },

    destroy() {
      this.vehicle = null;
      this.initialized = false;
      this.selectedParts = {};
      this.originalVisibility.clear();
    }
  };

  SX.vehicleBodyParts = VehicleBodyParts;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 76
   FILE: js/vehicle-body-parts.js
   END
========================================================= */
