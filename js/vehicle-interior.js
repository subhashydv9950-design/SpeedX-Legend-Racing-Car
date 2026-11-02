
/* =========================================================
   SUPERX LEGEND — FILE 79
   FILE: js/vehicle-interior.js
   PURPOSE: Vehicle interior customization
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleInterior = {
    vehicle: null,
    initialized: false,
    originalMaterials: new Map(),

    selected: {
      dashboard: "#24242d",
      seats: "#171717",
      steering: "#15151a",
      stitching: "#8b5cf6",
      ambient: "#8b5cf6"
    },

    catalog: {
      dashboard: [
        { id: "dash-black", name: "Midnight Black", color: "#24242d", price: 0 },
        { id: "dash-red", name: "Sport Red", color: "#6f1720", price: 450 },
        { id: "dash-purple", name: "Royal Purple", color: "#392052", price: 650 },
        { id: "dash-carbon", name: "Carbon Dark", color: "#181818", price: 900 }
      ],

      seats: [
        { id: "seat-black", name: "Black Leather", color: "#171717", price: 0 },
        { id: "seat-red", name: "Red Leather", color: "#76212a", price: 500 },
        { id: "seat-blue", name: "Blue Leather", color: "#183b65", price: 650 },
        { id: "seat-white", name: "Pearl Leather", color: "#d8d8d8", price: 900 }
      ],

      steering: [
        { id: "steer-black", name: "Classic Black", color: "#15151a", price: 0 },
        { id: "steer-red", name: "Racing Red", color: "#b51f2a", price: 400 },
        { id: "steer-carbon", name: "Carbon Style", color: "#303030", price: 700 }
      ],

      stitching: [
        { id: "stitch-purple", name: "Purple Stitch", color: "#8b5cf6", price: 0 },
        { id: "stitch-red", name: "Red Stitch", color: "#ff3030", price: 250 },
        { id: "stitch-blue", name: "Blue Stitch", color: "#168cff", price: 250 },
        { id: "stitch-gold", name: "Gold Stitch", color: "#d6a832", price: 500 }
      ],

      ambient: [
        { id: "ambient-purple", name: "Purple Glow", color: "#8b5cf6", price: 0 },
        { id: "ambient-blue", name: "Blue Glow", color: "#168cff", price: 300 },
        { id: "ambient-red", name: "Red Glow", color: "#ff3030", price: 300 },
        { id: "ambient-cyan", name: "Cyan Glow", color: "#39d9e8", price: 450 }
      ]
    },

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle || !window.THREE) {
        return false;
      }

      this.captureOriginalMaterials();
      this.initialized = true;
      this.loadSaved();

      return true;
    },

    captureOriginalMaterials() {
      this.disposeSnapshots();
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

    disposeSnapshots() {
      this.originalMaterials.forEach(material => {
        material.dispose?.();
      });
    },

    getCategory(category) {
      return this.catalog[category] || null;
    },

    getObjects(category) {
      const matches = [];

      if (!this.vehicle) return matches;

      const keywords = {
        dashboard: ["dashboard", "dash", "console"],
        seats: ["seat", "interior_seat"],
        steering: ["steering", "steer", "wheel_inside"],
        stitching: ["stitch", "seam"],
        ambient: ["ambient", "interior_light"]
      }[category];

      if (!keywords) return matches;

      this.vehicle.traverse(object => {
        if (!object.isMesh) return;

        const name = String(object.name || "").toLowerCase();

        if (keywords.some(keyword => name.includes(keyword))) {
          matches.push(object);
        }
      });

      return matches;
    },

    getOptions(category) {
      const items = this.getCategory(category);

      if (!items) return [];

      const owned = Array.isArray(SX.player?.ownedInterior)
        ? SX.player.ownedInterior
        : [];

      return items.map(item => ({
        ...item,
        unlocked: item.price === 0 || owned.includes(item.id)
      }));
    },

    buy(category, id) {
      const items = this.getCategory(category);

      if (!items) {
        return { success: false, message: "Invalid category." };
      }

      const item = items.find(option => option.id === id);

      if (!item) {
        return { success: false, message: "Option not found." };
      }

      const owned = Array.isArray(SX.player?.ownedInterior)
        ? SX.player.ownedInterior
        : [];

      if (item.price === 0 || owned.includes(id)) {
        return { success: false, message: "Already unlocked." };
      }

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(item.price)
      ) {
        return { success: false, message: "Not enough coins." };
      }

      SX.player.ownedInterior = [...owned, id];
      SX.savePlayer?.();

      this.dispatch("purchased", {
        category,
        itemId: id
      });

      return { success: true, message: "Interior item unlocked." };
    },

    apply(category, id) {
      if (!this.initialized || !window.THREE) {
        return false;
      }

      const items = this.getCategory(category);

      if (!items) return false;

      const item = items.find(option => option.id === id);

      if (!item) return false;

      const available = this.getOptions(category).find(
        option => option.id === id
      );

      if (!available?.unlocked) return false;

      const objects = this.getObjects(category);

      if (!objects.length) return false;

      const color = new window.THREE.Color(item.color);

      objects.forEach(object => {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach(material => {
          if (material.color) {
            material.color.copy(color);
          }

          material.needsUpdate = true;
        });
      });

      this.selected[category] = item.color;

      this.save();

      this.dispatch("changed", {
        category,
        itemId: id,
        color: item.color
      });

      return true;
    },

    setAmbientIntensity(value) {
      if (!this.initialized) return false;

      const intensity = Number(value);

      if (!Number.isFinite(intensity)) return false;

      const safeIntensity = Math.max(
        0,
        Math.min(3, intensity)
      );

      let found = false;

      this.vehicle.traverse(object => {
        if (
          object.isLight &&
          String(object.name || "").toLowerCase().includes("ambient")
        ) {
          object.intensity = safeIntensity;
          found = true;
        }
      });

      return found;
    },

    loadSaved() {
      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      const saved =
        SX.player?.interiorCustomization?.[carId];

      if (!saved) return;

      Object.entries(saved).forEach(([category, color]) => {
        if (
          this.getCategory(category) &&
          typeof color === "string"
        ) {
          this.selected[category] = color;
        }
      });
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.interiorCustomization) {
        SX.player.interiorCustomization = {};
      }

      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      SX.player.interiorCustomization[carId] = {
        ...this.selected
      };

      SX.savePlayer?.();
    },

    getState() {
      return {
        initialized: this.initialized,
        selected: { ...this.selected },
        categories: Object.keys(this.catalog)
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-interior-${name}`, {
          detail
        })
      );
    },

    restoreOriginal() {
      if (!this.vehicle) return false;

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const current = Array.isArray(object.material)
          ? object.material
          : [object.material];

        const restored = current.map((material, index) => {
          const original = this.originalMaterials.get(
            `${object.uuid}:${index}`
          );

          return original ? original.clone() : material;
        });

        object.material = Array.isArray(object.material)
          ? restored
          : restored[0];
      });

      return true;
    },

    destroy() {
      this.disposeSnapshots();
      this.originalMaterials.clear();

      this.vehicle = null;
      this.initialized = false;
    }
  };

  SX.vehicleInterior = VehicleInterior;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 79
   FILE: js/vehicle-interior.js
   END
========================================================= */
