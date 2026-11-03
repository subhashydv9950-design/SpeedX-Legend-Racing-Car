/* =========================================================
   SUPERX LEGEND — FILE 74
   FILE: js/vehicle-materials.js
   PURPOSE: Vehicle Paint, Glass, Chrome & Glow System
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleMaterials = {
    vehicle: null,
    originalMaterials: new Map(),
    initialized: false,

    current: {
      paint: "#8b35ff",
      finish: "metallic",
      glass: "tinted",
      chrome: true,
      glow: false,
      glowColor: "#9b4dff"
    },

    defaults: {
      paint: "#8b35ff",
      finish: "metallic",
      glass: "tinted",
      chrome: true,
      glow: false,
      glowColor: "#9b4dff"
    },

    finishes: {
      standard: {
        metalness: 0.25,
        roughness: 0.55,
        clearcoat: 0.1
      },
      metallic: {
        metalness: 0.85,
        roughness: 0.25,
        clearcoat: 0.8
      },
      matte: {
        metalness: 0.05,
        roughness: 0.9,
        clearcoat: 0
      },
      glossy: {
        metalness: 0.4,
        roughness: 0.12,
        clearcoat: 1
      },
      chrome: {
        metalness: 1,
        roughness: 0.08,
        clearcoat: 0.9
      }
    },

    glassPresets: {
      clear: {
        color: 0xbdeaff,
        opacity: 0.3,
        roughness: 0.08
      },
      tinted: {
        color: 0x182333,
        opacity: 0.72,
        roughness: 0.12
      },
      dark: {
        color: 0x080d18,
        opacity: 0.88,
        roughness: 0.18
      }
    },

    init(options = {}) {
      if (!window.THREE) return false;

      const vehicle = options.vehicle;

      if (!vehicle || typeof vehicle.traverse !== "function") {
        return false;
      }

      this.destroy();

      this.vehicle = vehicle;

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material, index) => {
          if (!material || typeof material.clone !== "function") {
            return;
          }

          const key = `${object.uuid}:${index}`;

          this.originalMaterials.set(
            key,
            material.clone()
          );
        });
      });

      this.current = { ...this.defaults };
      this.initialized = true;

      this.dispatch("initialized", {
        materials: this.originalMaterials.size
      });

      return true;
    },

    disposeSnapshots() {
      this.originalMaterials.forEach(material => {
        if (material && typeof material.dispose === "function") {
          material.dispose();
        }
      });

      this.originalMaterials.clear();
    },

    isReady() {
      return Boolean(
        this.initialized &&
        this.vehicle &&
        window.THREE
      );
    },

    createColor(value) {
      try {
        if (!window.THREE || value == null) return null;

        const color = new window.THREE.Color(value);

        if (
          !Number.isFinite(color.r) ||
          !Number.isFinite(color.g) ||
          !Number.isFinite(color.b)
        ) {
          return null;
        }

        return color;
      } catch (error) {
        return null;
      }
    },

    normalizeColor(value) {
      const color = this.createColor(value);

      if (!color) return null;

      return `#${color.getHexString()}`;
    },

    getMaterials() {
      if (!this.vehicle) return [];

      const result = [];

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material, index) => {
          if (!material) return;

          result.push({
            object,
            material,
            index
          });
        });
      });

      return result;
    },

    matches(object, material, keywords) {
      const name = (
        String(object.name || "") + " " +
        String(material.name || "")
      ).toLowerCase();

      return keywords.some(keyword =>
        name.includes(keyword)
      );
    },

    setPaint(color, finish = this.current.finish) {
      if (!this.isReady()) return false;

      const normalizedColor = this.normalizeColor(color);

      if (!normalizedColor) return false;

      const finishSettings =
        this.finishes[finish] || this.finishes.standard;

      let changed = 0;

      this.getMaterials().forEach(item => {
        const { object, material } = item;

        if (!this.matches(object, material, [
          "body",
          "paint",
          "car",
          "chassis",
          "exterior",
          "bonnet",
          "bumper",
          "fender"
        ])) {
          return;
        }

        if (material.color) {
          material.color.set(normalizedColor);
        }

        if ("metalness" in material) {
          material.metalness = finishSettings.metalness;
        }

        if ("roughness" in material) {
          material.roughness = finishSettings.roughness;
        }

        if ("clearcoat" in material) {
          material.clearcoat = finishSettings.clearcoat;
        }

        material.needsUpdate = true;
        changed++;
      });

      if (!changed) return false;

      this.current.paint = normalizedColor;
      this.current.finish = this.finishes[finish]
        ? finish
        : "standard";

      this.dispatch("paint-changed", {
        color: this.current.paint,
        finish: this.current.finish,
        changed
      });

      return true;
    },

    setGlass(type = "tinted") {
      if (!this.isReady()) return false;

      const preset = this.glassPresets[type];

      if (!preset) return false;

      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(object, material, [
          "glass",
          "window",
          "windscreen",
          "windshield"
        ])) {
          return;
        }

        if (material.color) {
          material.color.setHex(preset.color);
        }

        material.transparent = true;
        material.opacity = preset.opacity;
        material.roughness = preset.roughness;
        material.needsUpdate = true;

        changed++;
      });

      if (!changed) return false;

      this.current.glass = type;

      this.dispatch("glass-changed", {
        type,
        changed
      });

      return true;
    },

    setChrome(enabled) {
      if (!this.isReady()) return false;

      enabled = Boolean(enabled);

      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(object, material, [
          "chrome",
          "trim",
          "metal",
          "grille",
          "rim",
          "handle"
        ])) {
          return;
        }

        if ("metalness" in material) {
          material.metalness = enabled ? 1 : 0.35;
        }

        if ("roughness" in material) {
          material.roughness = enabled ? 0.08 : 0.4;
        }

        material.needsUpdate = true;
        changed++;
      });

      if (!changed) return false;

      this.current.chrome = enabled;

      this.dispatch("chrome-changed", {
        enabled,
        changed
      });

      return true;
    },

    setGlow(enabled, color = this.current.glowColor) {
      if (!this.isReady()) return false;

      enabled = Boolean(enabled);

      const normalizedColor = this.normalizeColor(color);

      if (!normalizedColor) return false;

      const glowColor = this.createColor(normalizedColor);

      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(object, material, [
          "glow",
          "neon",
          "underglow",
          "emissive",
          "light-strip"
        ])) {
          return;
        }

        if (material.emissive) {
          if (enabled) {
            material.emissive.copy(glowColor);
          } else {
            material.emissive.setHex(0x000000);
          }
        }

        if ("emissiveIntensity" in material) {
          material.emissiveIntensity = enabled ? 1.5 : 0;
        }

        material.needsUpdate = true;
        changed++;
      });

      if (!changed) return false;

      this.current.glow = enabled;
      this.current.glowColor = normalizedColor;

      this.dispatch("glow-changed", {
        enabled,
        color: normalizedColor,
        changed
      });

      return true;
    },

    restoreOriginal() {
      if (!this.isReady()) return false;

      let restoredCount = 0;

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const isArray = Array.isArray(object.material);

        const currentMaterials = isArray
          ? object.material
          : [object.material];

        const restoredMaterials = currentMaterials.map(
          (material, index) => {
            const key = `${object.uuid}:${index}`;
            const original = this.originalMaterials.get(key);

            if (!original) return material;

            restoredCount++;

            return original.clone();
          }
        );

        object.material = isArray
          ? restoredMaterials
          : restoredMaterials[0];
      });

      this.current = { ...this.defaults };

      this.dispatch("materials-restored", {
        restored: restoredCount
      });

      return restoredCount > 0;
    },

    applyState(state = {}) {
      if (!this.isReady()) return false;

      let changed = false;

      if (state.paint) {
        changed = this.setPaint(
          state.paint,
          state.finish || "standard"
        ) || changed;
      }

      if (state.glass) {
        changed = this.setGlass(state.glass) || changed;
      }

      if (typeof state.chrome === "boolean") {
        changed = this.setChrome(state.chrome) || changed;
      }

      if (typeof state.glow === "boolean") {
        changed = this.setGlow(
          state.glow,
          state.glowColor || this.current.glowColor
        ) || changed;
      }

      return changed;
    },

    getState() {
      return { ...this.current };
    },

    getAvailableFinishes() {
      return Object.keys(this.finishes);
    },

    getAvailableGlass() {
      return Object.keys(this.glassPresets);
    },

    dispatch(name, detail = {}) {
      if (typeof window.dispatchEvent !== "function") return;

      let event;

      if (typeof window.CustomEvent === "function") {
        event = new window.CustomEvent(
          `sx:vehicle-material-${name}`,
          { detail }
        );
      } else {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent(
          `sx:vehicle-material-${name}`,
          false,
          false,
          detail
        );
      }

      window.dispatchEvent(event);
    },

    destroy() {
      this.disposeSnapshots();

      this.vehicle = null;
      this.initialized = false;

      return true;
    }
  };

  SX.vehicleMaterials = VehicleMaterials;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 74
   FILE: js/vehicle-materials.js
   END
========================================================= */
