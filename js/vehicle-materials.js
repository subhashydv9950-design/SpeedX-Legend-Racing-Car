
/* =========================================================
   SUPERX LEGEND — FILE 74
   FILE: js/vehicle-materials.js
   PURPOSE: Vehicle paint, glass, chrome and material effects
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const THREE = window.THREE;

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

    init(options = {}) {
      if (!window.THREE) {
        return false;
      }

      this.vehicle = options.vehicle || null;

      if (!this.vehicle) {
        return false;
      }

      this.disposeSnapshots();
      this.originalMaterials.clear();

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((material, index) => {
          const key = `${object.uuid}:${index}`;

          this.originalMaterials.set(
            key,
            material.clone()
          );
        });
      });

      this.initialized = true;

      return true;
    },

    disposeSnapshots() {
      this.originalMaterials.forEach(material => {
        material.dispose?.();
      });
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
      if (!this.initialized || !window.THREE) {
        return false;
      }

      if (!window.THREE.Color.isColor(
        new window.THREE.Color(color)
      )) {
        return false;
      }

      const settings =
        this.finishes[finish] ||
        this.finishes.standard;

      let changed = 0;

      this.getMaterials().forEach(item => {
        const { object, material } = item;

        if (!this.matches(
          object,
          material,
          ["body", "paint", "car", "chassis"]
        )) {
          return;
        }

        if (material.color) {
          material.color.set(color);
        }

        if ("metalness" in material) {
          material.metalness = settings.metalness;
        }

        if ("roughness" in material) {
          material.roughness = settings.roughness;
        }

        if ("clearcoat" in material) {
          material.clearcoat = settings.clearcoat;
        }

        material.needsUpdate = true;
        changed++;
      });

      if (!changed) {
        return false;
      }

      this.current.paint = `#${new window.THREE.Color(
        color
      ).getHexString()}`;

      this.current.finish = finish;

      this.dispatch("paint-changed", {
        color: this.current.paint,
        finish
      });

      return true;
    },

    setGlass(type = "tinted") {
      if (!this.initialized) return false;

      const presets = {
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
      };

      const preset = presets[type];

      if (!preset) return false;

      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(
          object,
          material,
          ["glass", "window", "windscreen", "windshield"]
        )) {
          return;
        }

        material.color?.setHex(preset.color);
        material.transparent = true;
        material.opacity = preset.opacity;
        material.roughness = preset.roughness;
        material.needsUpdate = true;

        changed++;
      });

      if (!changed) return false;

      this.current.glass = type;

      this.dispatch("glass-changed", { type });

      return true;
    },

    setChrome(enabled) {
      if (!this.initialized) return false;

      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(
          object,
          material,
          ["chrome", "trim", "metal", "grille", "rim"]
        )) {
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

      this.current.chrome = Boolean(enabled);

      this.dispatch("chrome-changed", {
        enabled: this.current.chrome
      });

      return true;
    },

    setGlow(enabled, color = "#9b4dff") {
      if (!this.initialized || !window.THREE) {
        return false;
      }

      const glowColor = new window.THREE.Color(color);
      let changed = 0;

      this.getMaterials().forEach(({ object, material }) => {
        if (!this.matches(
          object,
          material,
          ["glow", "neon", "underglow", "emissive"]
        )) {
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

      this.current.glow = Boolean(enabled);
      this.current.glowColor = color;

      this.dispatch("glow-changed", {
        enabled: this.current.glow,
        color
      });

      return true;
    },

    restoreOriginal() {
      if (!this.initialized) return false;

      this.vehicle.traverse(object => {
        if (!object.isMesh || !object.material) return;

        const isArray = Array.isArray(object.material);

        const materials = isArray
          ? object.material
          : [object.material];

        const restored = materials.map((material, index) => {
          const key = `${object.uuid}:${index}`;
          const original = this.originalMaterials.get(key);

          return original
            ? original.clone()
            : material;
        });

        if (isArray) {
          object.material = restored;
        } else {
          object.material = restored[0];
        }
      });

      this.current = {
        paint: "#8b35ff",
        finish: "metallic",
        glass: "tinted",
        chrome: true,
        glow: false,
        glowColor: "#9b4dff"
      };

      this.dispatch("materials-restored", {});

      return true;
    },

    getState() {
      return { ...this.current };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-material-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.disposeSnapshots();
      this.originalMaterials.clear();

      this.vehicle = null;
      this.initialized = false;
    }
  };

  SX.vehicleMaterials = VehicleMaterials;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 74
   FILE: js/vehicle-materials.js
   END
========================================================= */
           
