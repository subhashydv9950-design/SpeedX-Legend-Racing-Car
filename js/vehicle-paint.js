
/* =========================================================
   SUPERX LEGEND — FILE 77
   FILE: js/vehicle-paint.js
   PURPOSE: Advanced vehicle paint and finish customization
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehiclePaint = {
    vehicle: null,
    initialized: false,
    selectedColor: "#8b5cf6",
    selectedFinish: "metallic",
    originalMaterials: new Map(),

    colors: [
      { id: "purple", name: "Royal Purple", color: "#8b5cf6", price: 0 },
      { id: "red", name: "Racing Red", color: "#e32636", price: 250 },
      { id: "blue", name: "Electric Blue", color: "#168cff", price: 250 },
      { id: "black", name: "Midnight Black", color: "#101014", price: 350 },
      { id: "white", name: "Pearl White", color: "#f4f4f4", price: 350 },
      { id: "silver", name: "Titanium Silver", color: "#aeb8c2", price: 450 },
      { id: "gold", name: "Champagne Gold", color: "#d5aa45", price: 700 },
      { id: "green", name: "Neon Green", color: "#8cff36", price: 850 },
      { id: "orange", name: "Sunset Orange", color: "#ff781f", price: 850 },
      { id: "cyan", name: "Ice Cyan", color: "#39d9e8", price: 1000 }
    ],

    finishes: {
      matte: {
        name: "Matte",
        metalness: 0.05,
        roughness: 0.88,
        price: 500
      },
      glossy: {
        name: "Glossy",
        metalness: 0.2,
        roughness: 0.12,
        price: 700
      },
      metallic: {
        name: "Metallic",
        metalness: 0.85,
        roughness: 0.24,
        price: 0
      },
      chrome: {
        name: "Chrome",
        metalness: 1,
        roughness: 0.04,
        price: 1500
      },
      pearl: {
        name: "Pearl",
        metalness: 0.7,
        roughness: 0.18,
        price: 1800
      }
    },

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle || !window.THREE) {
        return false;
      }

      this.captureOriginalMaterials();
      this.initialized = true;

      return true;
    },

    captureOriginalMaterials() {
      this.disposeSnapshots();
      this.originalMaterials.clear();

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const name = String(object.name || "").toLowerCase();

        if (!this.isPaintable(name)) return;

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

    isPaintable(name) {
      const excluded = [
        "glass",
        "window",
        "windshield",
        "tyre",
        "tire",
        "wheel",
        "rim",
        "light",
        "lamp",
        "mirror",
        "chrome",
        "exhaust",
        "interior"
      ];

      if (excluded.some(item => name.includes(item))) {
        return false;
      }

      const paintNames = [
        "body",
        "paint",
        "chassis",
        "door",
        "hood",
        "bonnet",
        "fender",
        "bumper",
        "roof",
        "car"
      ];

      return paintNames.some(item => name.includes(item));
    },

    getPaintableMeshes() {
      const meshes = [];

      if (!this.vehicle) return meshes;

      this.vehicle.traverse(object => {
        if (
          object.isMesh &&
          this.isPaintable(
            String(object.name || "").toLowerCase()
          )
        ) {
          meshes.push(object);
        }
      });

      return meshes;
    },

    getColors() {
      const player = SX.player || {};
      const owned = Array.isArray(player.ownedPaints)
        ? player.ownedPaints
        : [];

      return this.colors.map(item => ({
        ...item,
        unlocked:
          item.price === 0 ||
          owned.includes(item.id)
      }));
    },

    getFinishes() {
      const player = SX.player || {};
      const owned = Array.isArray(player.ownedFinishes)
        ? player.ownedFinishes
        : [];

      return Object.entries(this.finishes).map(([id, finish]) => ({
        id,
        ...finish,
        unlocked:
          finish.price === 0 ||
          owned.includes(id)
      }));
    },

    buyColor(id) {
      const color = this.colors.find(item => item.id === id);

      if (!color) {
        return { success: false, message: "Color not found." };
      }

      const player = SX.player || {};
      const owned = Array.isArray(player.ownedPaints)
        ? player.ownedPaints
        : [];

      if (color.price === 0 || owned.includes(id)) {
        return { success: true, message: "Color already unlocked." };
      }

      if (typeof SX.spendCoins !== "function" ||
          !SX.spendCoins(color.price)) {
        return { success: false, message: "Not enough coins." };
      }

      player.ownedPaints = [...owned, id];
      SX.savePlayer?.();

      this.dispatch("color-purchased", { id });

      return { success: true, message: "Color unlocked." };
    },

    buyFinish(id) {
      const finish = this.finishes[id];

      if (!finish) {
        return { success: false, message: "Finish not found." };
      }

      const player = SX.player || {};
      const owned = Array.isArray(player.ownedFinishes)
        ? player.ownedFinishes
        : [];

      if (finish.price === 0 || owned.includes(id)) {
        return { success: true, message: "Finish already unlocked." };
      }

      if (typeof SX.spendCoins !== "function" ||
          !SX.spendCoins(finish.price)) {
        return { success: false, message: "Not enough coins." };
      }

      player.ownedFinishes = [...owned, id];
      SX.savePlayer?.();

      this.dispatch("finish-purchased", { id });

      return { success: true, message: "Finish unlocked." };
    },

    applyColor(color) {
      if (!this.initialized || !window.THREE) return false;

      let parsed;

      try {
        parsed = new window.THREE.Color(color);
      } catch (error) {
        return false;
      }

      const meshes = this.getPaintableMeshes();

      if (!meshes.length) return false;

      meshes.forEach(mesh => {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach(material => {
          if (material.color) {
            material.color.copy(parsed);
          }

          material.needsUpdate = true;
        });
      });

      this.selectedColor = `#${parsed.getHexString()}`;

      this.save();
      this.dispatch("paint-changed", {
        color: this.selectedColor
      });

      return true;
    },

    applyFinish(id) {
      if (!this.initialized) return false;

      const finish = this.finishes[id];

      if (!finish) return false;

      const available = this.getFinishes().find(
        item => item.id === id
      );

      if (!available?.unlocked) return false;

      const meshes = this.getPaintableMeshes();

      if (!meshes.length) return false;

      meshes.forEach(mesh => {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach(material => {
          if ("metalness" in material) {
            material.metalness = finish.metalness;
          }

          if ("roughness" in material) {
            material.roughness = finish.roughness;
          }

          material.needsUpdate = true;
        });
      });

      this.selectedFinish = id;

      this.save();
      this.dispatch("finish-changed", { finish: id });

      return true;
    },

    selectColor(id) {
      const color = this.colors.find(item => item.id === id);

      if (!color) return false;

      const available = this.getColors().find(
        item => item.id === id
      );

      if (!available?.unlocked) return false;

      return this.applyColor(color.color);
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.paintCustomization) {
        SX.player.paintCustomization = {};
      }

      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      SX.player.paintCustomization[carId] = {
        color: this.selectedColor,
        finish: this.selectedFinish
      };

      SX.savePlayer?.();
    },

    getState() {
      return {
        initialized: this.initialized,
        color: this.selectedColor,
        finish: this.selectedFinish
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-paint-${name}`, {
          detail
        })
      );
    },

    disposeSnapshots() {
      this.originalMaterials.forEach(material => {
        material.dispose?.();
      });
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

  SX.vehiclePaint = VehiclePaint;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 77
   FILE: js/vehicle-paint.js
   END
========================================================= */
      
