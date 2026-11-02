
/* =========================================================
   SUPERX LEGEND — FILE 78
   FILE: js/vehicle-decals.js
   PURPOSE: Vehicle decals, racing stripes and stickers
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleDecals = {
    vehicle: null,
    initialized: false,
    activeDecals: [],
    decalMeshes: [],
    nextId: 1,

    catalog: [
      {
        id: "racing-stripe",
        name: "Racing Stripe",
        type: "stripe",
        price: 0,
        color: "#ffffff"
      },
      {
        id: "double-stripe",
        name: "Double Stripe",
        type: "stripe",
        price: 350,
        color: "#a855f7"
      },
      {
        id: "flame",
        name: "Flame Graphic",
        type: "graphic",
        price: 650,
        color: "#ff5722"
      },
      {
        id: "lightning",
        name: "Lightning",
        type: "graphic",
        price: 850,
        color: "#39aaff"
      },
      {
        id: "carbon-lines",
        name: "Carbon Lines",
        type: "pattern",
        price: 1100,
        color: "#292929"
      },
      {
        id: "neon-wave",
        name: "Neon Wave",
        type: "graphic",
        price: 1500,
        color: "#b7ff38"
      },
      {
        id: "racing-number",
        name: "Racing Number",
        type: "number",
        price: 500,
        color: "#ffffff"
      },
      {
        id: "checkered",
        name: "Checkered Pattern",
        type: "pattern",
        price: 1800,
        color: "#ffffff"
      }
    ],

    init(options = {}) {
      this.vehicle = options.vehicle || null;

      if (!this.vehicle || !window.THREE) {
        return false;
      }

      this.initialized = true;
      this.activeDecals = [];
      this.decalMeshes = [];
      this.nextId = 1;

      return true;
    },

    getCatalog() {
      const owned = Array.isArray(SX.player?.ownedDecals)
        ? SX.player.ownedDecals
        : [];

      return this.catalog.map(item => ({
        ...item,
        unlocked: item.price === 0 || owned.includes(item.id)
      }));
    },

    buy(id) {
      const decal = this.catalog.find(item => item.id === id);

      if (!decal) {
        return {
          success: false,
          message: "Decal not found."
        };
      }

      const owned = Array.isArray(SX.player?.ownedDecals)
        ? SX.player.ownedDecals
        : [];

      if (decal.price === 0 || owned.includes(id)) {
        return {
          success: false,
          message: "Decal already unlocked."
        };
      }

      if (
        typeof SX.spendCoins !== "function" ||
        !SX.spendCoins(decal.price)
      ) {
        return {
          success: false,
          message: "Not enough coins."
        };
      }

      SX.player.ownedDecals = [...owned, id];
      SX.savePlayer?.();

      this.dispatch("purchased", { decalId: id });

      return {
        success: true,
        message: "Decal unlocked."
      };
    },

    add(options = {}) {
      if (!this.initialized) {
        return {
          success: false,
          message: "Vehicle not initialized."
        };
      }

      const catalogItem = this.catalog.find(
        item => item.id === options.decalId
      );

      if (!catalogItem) {
        return {
          success: false,
          message: "Invalid decal."
        };
      }

      const unlocked = this.getCatalog().find(
        item => item.id === catalogItem.id
      );

      if (!unlocked?.unlocked) {
        return {
          success: false,
          message: "Unlock this decal first."
        };
      }

      const position = this.normalizePosition(options.position);

      if (!position) {
        return {
          success: false,
          message: "Invalid decal position."
        };
      }

      const decal = {
        id: `decal-${this.nextId++}`,
        decalId: catalogItem.id,
        name: catalogItem.name,
        color: options.color || catalogItem.color,
        position,
        scale: this.normalizeScale(options.scale),
        rotation: Number.isFinite(options.rotation)
          ? options.rotation
          : 0,
        side: options.side === "left" ? "left" : "right"
      };

      const mesh = this.createDecalMesh(decal);

      if (!mesh) {
        return {
          success: false,
          message: "Could not create decal."
        };
      }

      this.vehicle.add(mesh);
      this.activeDecals.push(decal);
      this.decalMeshes.push({
        id: decal.id,
        mesh
      });

      this.save();

      this.dispatch("added", decal);

      return {
        success: true,
        decal
      };
    },

    normalizePosition(position) {
      if (!position || typeof position !== "object") {
        return null;
      }

      const values = ["x", "y", "z"];

      for (const key of values) {
        if (!Number.isFinite(position[key])) return null;
        if (Math.abs(position[key]) > 20) return null;
      }

      return {
        x: position.x,
        y: position.y,
        z: position.z
      };
    },

    normalizeScale(scale) {
      const value = Number(scale);

      if (!Number.isFinite(value)) return 1;

      return Math.max(0.1, Math.min(3, value));
    },

    createDecalMesh(decal) {
      const THREE = window.THREE;

      try {
        const geometry = new THREE.PlaneGeometry(
          0.8 * decal.scale,
          0.35 * decal.scale
        );

        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(decal.color),
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = `SUPERX_DECAL_${decal.id}`;
        mesh.position.set(
          decal.position.x,
          decal.position.y,
          decal.position.z
        );

        mesh.rotation.z = decal.rotation;

        mesh.userData.superxDecal = true;
        mesh.userData.decalId = decal.id;

        return mesh;
      } catch (error) {
        console.error("SUPERX decal creation failed:", error);
        return null;
      }
    },

    remove(id) {
      const entry = this.decalMeshes.find(
        item => item.id === id
      );

      if (!entry) return false;

      this.vehicle?.remove(entry.mesh);

      entry.mesh.geometry?.dispose();

      if (Array.isArray(entry.mesh.material)) {
        entry.mesh.material.forEach(material => material.dispose());
      } else {
        entry.mesh.material?.dispose();
      }

      this.decalMeshes = this.decalMeshes.filter(
        item => item.id !== id
      );

      this.activeDecals = this.activeDecals.filter(
        item => item.id !== id
      );

      this.save();

      this.dispatch("removed", { id });

      return true;
    },

    clear() {
      [...this.decalMeshes].forEach(item => {
        this.remove(item.id);
      });

      return true;
    },

    setColor(id, color) {
      const entry = this.decalMeshes.find(
        item => item.id === id
      );

      if (!entry || !window.THREE) return false;

      try {
        const parsed = new window.THREE.Color(color);

        entry.mesh.material.color.copy(parsed);

        const decal = this.activeDecals.find(
          item => item.id === id
        );

        if (decal) {
          decal.color = `#${parsed.getHexString()}`;
        }

        this.save();

        return true;
      } catch (error) {
        return false;
      }
    },

    save() {
      if (!SX.player) return;

      if (!SX.player.vehicleDecals) {
        SX.player.vehicleDecals = {};
      }

      const car = SX.getSelectedCar?.();
      const carId = car?.id || "default";

      SX.player.vehicleDecals[carId] =
        this.activeDecals.map(decal => ({
          ...decal,
          position: { ...decal.position }
        }));

      SX.savePlayer?.();
    },

    getState() {
      return {
        initialized: this.initialized,
        count: this.activeDecals.length,
        decals: this.activeDecals.map(decal => ({
          ...decal,
          position: { ...decal.position }
        }))
      };
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-decal-${name}`, {
          detail
        })
      );
    },

    destroy() {
      this.clear();

      this.vehicle = null;
      this.initialized = false;
      this.activeDecals = [];
      this.decalMeshes = [];
    }
  };

  SX.vehicleDecals = VehicleDecals;

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 78
   FILE: js/vehicle-decals.js
   END
========================================================= */
