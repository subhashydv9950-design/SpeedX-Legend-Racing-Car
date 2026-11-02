
/* =========================================================
   SUPERX LEGEND — FILE 62
   FILE: js/vehicle-spawner.js
   PURPOSE: Spawn, load and manage 3D vehicles
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleSpawner = {
    scene: null,
    loader: null,
    vehicles: new Map(),
    activeVehicleId: null,
    initialized: false,

    init(options = {}) {
      this.scene = options.scene || null;

      if (window.THREE && window.THREE.GLTFLoader) {
        this.loader = new window.THREE.GLTFLoader();
      }

      this.initialized = true;

      return {
        success: true,
        threeAvailable: Boolean(window.THREE),
        loaderAvailable: Boolean(this.loader)
      };
    },

    setScene(scene) {
      if (!scene) return false;

      this.scene = scene;
      return true;
    },

    createFallbackVehicle(options = {}) {
      if (!window.THREE) {
        return null;
      }

      const THREE = window.THREE;
      const group = new THREE.Group();

      const color = options.color || 0x8b5cf6;

      const bodyMaterial = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.75,
        roughness: 0.3
      });

      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x182638,
        metalness: 0.5,
        roughness: 0.2
      });

      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x171717,
        roughness: 0.85
      });

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.55, 4.2),
        bodyMaterial
      );

      body.position.y = 0.75;
      body.castShadow = true;
      body.receiveShadow = true;

      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.65, 1.9),
        glassMaterial
      );

      cabin.position.set(0, 1.3, -0.25);
      cabin.castShadow = true;

      group.add(cabin);

      const wheelPositions = [
        [-1.05, 0.42, 1.3],
        [1.05, 0.42, 1.3],
        [-1.05, 0.42, -1.3],
        [1.05, 0.42, -1.3]
      ];

      wheelPositions.forEach(position => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.43,
            0.43,
            0.28,
            20
          ),
          wheelMaterial
        );

        wheel.rotation.z = Math.PI / 2;

        wheel.position.set(
          position[0],
          position[1],
          position[2]
        );

        wheel.castShadow = true;

        group.add(wheel);
      });

      group.userData.superxFallback = true;

      return group;
    },

    spawn(options = {}) {
      if (!this.scene || !window.THREE) {
        return Promise.resolve({
          success: false,
          message: "3D scene is not available."
        });
      }

      const id = String(
        options.id || "vehicle-" + Date.now()
      );

      if (this.vehicles.has(id)) {
        this.remove(id);
      }

      const modelUrl = options.modelUrl || options.model || "";

      if (modelUrl && this.loader) {
        return this.loadModel(id, modelUrl, options);
      }

      return Promise.resolve(
        this.spawnFallback(id, options)
      );
    },

    spawnFallback(id, options) {
      const model = this.createFallbackVehicle(options);

      if (!model) {
        return {
          success: false,
          message: "Three.js is not available."
        };
      }

      this.applyTransform(model, options);
      this.scene.add(model);

      const record = {
        id,
        model,
        type: "fallback",
        createdAt: Date.now(),
        options: { ...options }
      };

      this.vehicles.set(id, record);

      if (options.active !== false) {
        this.setActive(id);
      }

      this.emit("sx:vehicle-spawned", {
        id,
        type: "fallback"
      });

      return {
        success: true,
        id,
        model,
        type: "fallback"
      };
    },

    loadModel(id, url, options) {
      return new Promise(resolve => {
        this.loader.load(
          url,

          gltf => {
            const model = gltf.scene;

            if (!model) {
              resolve(
                this.spawnFallback(id, options)
              );
              return;
            }

            this.applyTransform(model, options);

            model.traverse(object => {
              if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
              }
            });

            this.scene.add(model);

            const record = {
              id,
              model,
              type: "gltf",
              animations: gltf.animations || [],
              mixer: null,
              createdAt: Date.now(),
              options: { ...options }
            };

            if (
              record.animations.length &&
              window.THREE.AnimationMixer
            ) {
              record.mixer = new window.THREE.AnimationMixer(
                model
              );
            }

            this.vehicles.set(id, record);

            if (options.active !== false) {
              this.setActive(id);
            }

            this.emit("sx:vehicle-spawned", {
              id,
              type: "gltf"
            });

            resolve({
              success: true,
              id,
              model,
              type: "gltf"
            });
          },

          undefined,

          error => {
            console.warn(
              "[SUPERX VehicleSpawner] Model load failed:",
              error
            );

            resolve(
              this.spawnFallback(id, options)
            );
          }
        );
      });
    },

    applyTransform(model, options = {}) {
      const position = options.position || {};

      model.position.set(
        Number(position.x) || 0,
        Number(position.y) || 0,
        Number(position.z) || 0
      );

      const rotation = options.rotation || {};

      model.rotation.set(
        Number(rotation.x) || 0,
        Number(rotation.y) || 0,
        Number(rotation.z) || 0
      );

      const scale = Number(options.scale) || 1;

      model.scale.setScalar(scale);
    },

    setActive(id) {
      const record = this.vehicles.get(String(id));

      if (!record) return false;

      this.activeVehicleId = String(id);

      this.emit("sx:active-vehicle-changed", {
        id: this.activeVehicleId,
        model: record.model
      });

      return true;
    },

    getActive() {
      if (!this.activeVehicleId) return null;

      return this.vehicles.get(
        this.activeVehicleId
      ) || null;
    },

    get(id) {
      return this.vehicles.get(String(id)) || null;
    },

    setPosition(id, position = {}) {
      const record = this.get(id);

      if (!record || !record.model) return false;

      record.model.position.set(
        Number(position.x) || 0,
        Number(position.y) || 0,
        Number(position.z) || 0
      );

      return true;
    },

    setRotation(id, rotation = {}) {
      const record = this.get(id);

      if (!record || !record.model) return false;

      record.model.rotation.set(
        Number(rotation.x) || 0,
        Number(rotation.y) || 0,
        Number(rotation.z) || 0
      );

      return true;
    },

    setScale(id, scale) {
      const record = this.get(id);

      if (!record || !record.model) return false;

      const value = Math.max(
        0.1,
        Math.min(10, Number(scale) || 1)
      );

      record.model.scale.setScalar(value);

      return true;
    },

    update(deltaTime) {
      const dt = Math.max(
        0,
        Math.min(0.1, Number(deltaTime) || 0)
      );

      this.vehicles.forEach(record => {
        if (record.mixer) {
          record.mixer.update(dt);
        }
      });
    },

    remove(id) {
      const key = String(id);
      const record = this.vehicles.get(key);

      if (!record) return false;

      if (this.scene && record.model) {
        this.scene.remove(record.model);
      }

      if (record.mixer) {
        record.mixer.stopAllAction();
      }

      if (record.model && record.model.traverse) {
        record.model.traverse(object => {
          if (!object.isMesh) return;

          if (object.geometry) {
            object.geometry.dispose();
          }

          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material && material.dispose) {
                material.dispose();
              }
            });
          } else if (
            object.material &&
            object.material.dispose
          ) {
            object.material.dispose();
          }
        });
      }

      this.vehicles.delete(key);

      if (this.activeVehicleId === key) {
        this.activeVehicleId = null;
      }

      this.emit("sx:vehicle-removed", {
        id: key
      });

      return true;
    },

    getAll() {
      return Array.from(
        this.vehicles.values()
      ).map(record => ({
        id: record.id,
        type: record.type,
        createdAt: record.createdAt
      }));
    },

    clear() {
      Array.from(this.vehicles.keys()).forEach(id => {
        this.remove(id);
      });

      this.activeVehicleId = null;
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, { detail })
      );
    }
  };

  SX.vehicleSpawner = VehicleSpawner;

  window.dispatchEvent(
    new CustomEvent("sx:vehicle-spawner-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 62
   FILE: js/vehicle-spawner.js
   END
========================================================= */
        
