
/* =========================================================
   SUPERX LEGEND — FILE 75
   FILE: js/vehicle-rims.js
   PURPOSE: Wheel rims collection, customization and effects
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleRims = {
    vehicle: null,
    initialized: false,
    currentRim: "sport-01",
    currentColor: "#c0c0c0",
    originalMaterials: new Map(),

    catalog: [
      {
        id: "sport-01",
        name: "Sport Silver",
        price: 0,
        type: "sport",
        color: "#c0c0c0",
        unlocked: true
      },
      {
        id: "racing-02",
        name: "Racing Black",
        price: 450,
        type: "racing",
        color: "#171717"
      },
      {
        id: "luxury-03",
        name: "Luxury Chrome",
        price: 800,
        type: "luxury",
        color: "#e5e5e5"
      },
      {
        id: "neon-04",
        name: "Neon Purple",
        price: 1200,
        type: "neon",
        color: "#a855f7"
      },
      {
        id: "carbon-05",
        name: "Carbon Edge",
        price: 1600,
        type: "carbon",
        color: "#292929"
      },
      {
        id: "gold-06",
        name: "Golden Edition",
        price: 2200,
        type: "luxury",
        color: "#d6a832"
      },
      {
        id: "racing-07",
        name: "Track Pro",
        price: 3000,
        type: "racing",
        color: "#ff3030"
      },
      {
        id: "diamond-08",
        name: "Diamond Cut",
        price: 4500,
        type: "luxury",
        color: "#8bd9ff"
      }
    ],

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle || !window.THREE) {
        return false;
      }

      this.saveOriginalMaterials();
      this.initialized = true;

      return true;
    },

    saveOriginalMaterials() {
      this.disposeOriginalMaterials();
      this.originalMaterials.clear();

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material, index) => {
          this.originalMaterials.set(
            `${object.uuid}:${index}`,
            material.clone()
          );
        });
      });
    },

    disposeOriginalMaterials() {
      this.originalMaterials.forEach(material => {
        material.dispose?.();
      });
    },

    getRimObjects() {
      const results = [];

      if (!this.vehicle) return results;

      this.vehicle.traverse(object => {
        const name = String(object.name || "").toLowerCase();

        if (
          object.isMesh &&
          (
            name.includes("rim") ||
            name.includes("wheel") ||
            name.includes("alloy")
          )
        ) {
          results.push(object);
        }
      });

      return results;
    },

    getCatalog() {
      const player = SX.player || {};

      return this.catalog.map(item => ({
        ...item,
        unlocked:
          item.unlocked === true ||
          Array.isArray(player.ownedRims) &&
          player.ownedRims.includes(item.id)
      }));
    },

    getRim(id) {
      return this.catalog.find(item => item.id === id) || null;
    },

    buy(id) {
      const rim = this.getRim(id);

      if (!rim) {
        return {
          success: false,
          message: "Rim not found."
        };
      }

      const player = SX.player || {};
      const owned = Array.isArray(player.ownedRims)
        ? player.ownedRims
        : [];

      if (rim.unlocked || owned.includes(id)) {
        return {
          success: false,
          message: "Rim already unlocked."
        };
      }

      if (typeof SX.spendCoins !== "function") {
        return {
          success: false,
          message: "Coin system unavailable."
        };
      }

      if (!SX.spendCoins(rim.price)) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      player.ownedRims = [...owned, id];

      SX.savePlayer?.();

      this.dispatch("purchased", {
        rimId: id,
        price: rim.price
      });

      return {
        success: true,
        message: "Rim purchased successfully."
      };
    },

    select(id) {
      const rim = this.getRim(id);

      if (!rim) {
        return {
          success: false,
          message: "Rim not found."
        };
      }

      const available = this.getCatalog().find(
        item => item.id === id
      );

      if (!available?.unlocked) {
        return {
          success: false,
          message: "Unlock this rim first."
        };
      }

      if (!this.initialized) {
        return {
          success: false,
          message: "Vehicle preview not initialized."
        };
      }

      const applied = this.applyRim(rim);

      if (!applied) {
        return {
          success: false,
          message: "Rim model not found in vehicle."
        };
      }

      this.currentRim = id;
      this.currentColor = rim.color;

      this.saveSelection();

      this.dispatch("selected", {
        rimId: id,
        rimName: rim.name
      });

      return {
        success: true,
        message: "Rim selected."
      };
    },

    applyRim(rim) {
      const THREE = window.THREE;
      const objects = this.getRimObjects();

      if (!objects.length) return false;

      const color = new THREE.Color(rim.color);

      objects.forEach(object => {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach(material => {
          if (material.color) {
            material.color.copy(color);
          }

          if ("metalness" in material) {
            material.metalness =
              rim.type === "luxury" ? 1 : 0.75;
          }

          if ("roughness" in material) {
            material.roughness =
              rim.type === "carbon" ? 0.65 : 0.22;
          }

          material.needsUpdate = true;
        });
      });

      return true;
    },

    setColor(color) {
      if (!this.initialized || !window.THREE) {
        return false;
      }

      let parsed;

      try {
        parsed = new window.THREE.Color(color);
      } catch (error) {
        return false;
      }

      const objects = this.getRimObjects();

      if (!objects.length) return false;

      objects.forEach(object => {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach(material => {
          material.color?.copy(parsed);
          material.needsUpdate = true;
        });
      });

      this.currentColor = `#${parsed.getHexString()}`;

      this.saveSelection();

      this.dispatch("color-changed", {
        color: this.currentColor
      });

      return true;
    },

    saveSelection() {
      const player = SX.player;

      if (!player) return;

      if (!player.vehicleCustomization) {
        player.vehicleCustomization = {};
      }

      const carId = SX.getSelectedCar?.()?.id || "default";

      player.vehicleCustomization[carId] = {
        ...(player.vehicleCustomization[carId] || {}),
        rim: this.currentRim,
        rimColor: this.currentColor
      };

      SX.savePlayer?.();
    },

    getState() {
      return {
        currentRim: this.currentRim,
        currentColor: this.currentColor,
        initialized: this.initialized
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-rim-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.disposeOriginalMaterials();
      this.originalMaterials.clear();

      this.vehicle = null;
      this.initialized = false;
    }
  };

  SX.vehicleRims = VehicleRims;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 75
   FILE: js/vehicle-rims.js
   END
========================================================= */
