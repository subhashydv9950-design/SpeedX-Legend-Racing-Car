/* =========================================================
   SUPERX LEGEND — FILE 62 START
   FILE: js/vehicle-spawner.js
   PURPOSE: 3D Vehicle Spawn, Model Loading & Management
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
      if (options.scene) this.scene = options.scene;
      if (options.loader) this.loader = options.loader;

      if (
        !this.loader &&
        window.THREE &&
        window.THREE.GLTFLoader
      ) {
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
      if (!scene || typeof scene.add !== "function") {
        return false;
      }

      this.scene = scene;
      return true;
    },

    setLoader(loader) {
      if (!loader || typeof loader.load !== "function") {
        return false;
      }

      this.loader = loader;
      return true;
    },

    createMaterial(color, metalness, roughness) {
      return new window.THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness
      });
    },

    createFallbackVehicle(options = {}) {
      if (!window.THREE) return null;

      const THREE = window.THREE;
      const group = new THREE.Group();

      const color = options.color || 0x8b5cf6;
      const accent = options.accent || 0x171717;

      const bodyMaterial = this.createMaterial(
        color,
        0.78,
        0.27
      );

      const glassMaterial = this.createMaterial(
        0x152536,
        0.65,
        0.18
      );

      const wheelMaterial = this.createMaterial(
        0x111111,
        0.12,
        0.86
      );

      const rimMaterial = this.createMaterial(
        accent,
        0.85,
        0.22
      );

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.52, 4.25),
        bodyMaterial
      );

      body.position.y = 0.76;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.vehiclePart = "body";
      group.add(body);

      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(1.92, 0.12, 1.25),
        bodyMaterial
      );

      hood.position.set(0, 1.02, 1.15);
      hood.castShadow = true;
      group.add(hood);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.52, 0.68, 1.85),
        glassMaterial
      );

      cabin.position.set(0, 1.32, -0.32);
      cabin.castShadow = true;
      group.add(cabin);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.48, 0.09, 1.72),
        bodyMaterial
      );

      roof.position.set(0, 1.69, -0.32);
      group.add(roof);

      const bumperFront = new THREE.Mesh(
        new THREE.BoxGeometry(2.08, 0.18, 0.2),
        rimMaterial
      );

      bumperFront.position.set(0, 0.55, 2.12);
      group.add(bumperFront);

      const bumperRear = new THREE.Mesh(
        new THREE.BoxGeometry(2.08, 0.18, 0.2),
        rimMaterial
      );

      bumperRear.position.set(0, 0.55, -2.12);
      group.add(bumperRear);

      const wheelPositions = [
        [-1.05, 0.43, 1.32],
        [1.05, 0.43, 1.32],
        [-1.05, 0.43, -1.32],
        [1.05, 0.43, -1.32]
      ];

      const wheels = [];

      wheelPositions.forEach((position, index) => {
        const wheelGroup = new THREE.Group();

        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.43,
            0.43,
            0.3,
            28
          ),
          wheelMaterial
        );

        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.23,
            0.23,
            0.315,
            20
          ),
          rimMaterial
        );

        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);

        wheelGroup.position.set(
          position[0],
          position[1],
          position[2]
        );

        wheelGroup.userData.vehiclePart = "wheel";
        wheelGroup.userData.front = index < 2;
        wheelGroup.userData.side = index % 2 === 0
          ? "left"
          : "right";

        group.add(wheelGroup);
        wheels.push(wheelGroup);
      });

      const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xddeeff,
        emissiveIntensity: 0.8
      });

      [-0.68, 0.68].forEach(x => {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.12, 0.06),
          headlightMaterial
        );

        light.position.set(x, 0.88, 2.14);
        group.add(light);
      });

      group.userData.superxFallback = true;
      group.userData.wheels = wheels;
      group.userData.body = body;

      return group;
    },

    applyTransform(model, options = {}) {
      const position = options.position || {};
      const rotation = options.rotation || {};

      model.position.set(
        Number(position.x) || 0,
        Number(position.y) || 0,
        Number(position.z) || 0
      );

      model.rotation.set(
        Number(rotation.x) || 0,
        Number(rotation.y) || 0,
        Number(rotation.z) || 0
      );

      const scale = Number(options.scale) || 1;
      model.scale.setScalar(
        Math.max(0.01, Math.min(20, scale))
      );

      return model;
    },

    register(id, model, type, options = {}, animations = []) {
      if (!model || !this.scene) {
        return {
          success: false,
          message: "Vehicle model or scene is missing."
        };
      }

      model.traverse(object => {
        if (!object.isMesh) return;

        object.castShadow = true;
        object.receiveShadow = true;
      });

      this.scene.add(model);

      let mixer = null;

      if (
        animations.length &&
        window.THREE &&
        window.THREE.AnimationMixer
      ) {
        mixer = new window.THREE.AnimationMixer(model);
      }

      const record = {
        id,
        model,
        type,
        animations,
        mixer,
        createdAt: Date.now(),
        options: { ...options }
      };

      this.vehicles.set(id, record);

      if (options.active !== false) {
        this.setActive(id);
      }

      this.emit("sx:vehicle-spawned", {
        id,
        type,
        model
      });

      return {
        success: true,
        id,
        model,
        type
      };
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

    spawnFallback(id, options = {}) {
      const model = this.createFallbackVehicle(options);

      if (!model) {
        return {
          success: false,
          message: "Three.js is not available."
        };
      }

      this.applyTransform(model, options);

      return this.register(
        id,
        model,
        "fallback",
        options
      );
    },

    loadModel(id, url, options = {}) {
      if (!this.loader) {
        return Promise.resolve(
          this.spawnFallback(id, options)
        );
      }

      return new Promise(resolve => {
        this.loader.load(
          url,

          gltf => {
            if (!gltf || !gltf.scene) {
              resolve(
                this.spawnFallback(id, options)
              );
              return;
            }

            const model = gltf.scene;

            this.applyTransform(model, options);

            resolve(
              this.register(
                id,
                model,
                "gltf",
                options,
                gltf.animations || []
              )
            );
          },

          event => {
            if (event && event.total) {
              this.emit("sx:vehicle-loading", {
                id,
                url,
                progress: Math.round(
                  event.loaded / event.total * 100
                )
              });
            }
          },

          error => {
            console.warn(
              "[SUPERX] Vehicle model load failed:",
              error
            );

            resolve(
              this.spawnFallback(id, options)
            );
          }
        );
      });
    },

    setActive(id) {
      const key = String(id);
      const record = this.vehicles.get(key);

      if (!record) return false;

      this.activeVehicleId = key;

      this.emit("sx:active-vehicle-changed", {
        id: key,
        model: record.model
      });

      return true;
    },

    getActive() {
      if (!this.activeVehicleId) return null;

      return this.get(this.activeVehicleId);
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

      const value = Number(scale);

      if (!Number.isFinite(value)) return false;

      record.model.scale.setScalar(
        Math.max(0.01, Math.min(20, value))
      );

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

    disposeModel(model) {
      if (!model || !model.traverse) return;

      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();

      model.traverse(object => {
        if (!object.isMesh) return;

        if (object.geometry) {
          geometries.add(object.geometry);
        }

        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];

        list.forEach(material => {
          if (!material) return;

          materials.add(material);

          Object.values(material).forEach(value => {
            if (value && value.isTexture) {
              textures.add(value);
            }
          });
        });
      });

      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
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
        record.mixer.uncacheRoot(record.model);
      }

      this.disposeModel(record.model);

      this.vehicles.delete(key);

      if (this.activeVehicleId === key) {
        this.activeVehicleId = null;
      }

      this.emit("sx:vehicle-removed", { id: key });

      return true;
    },

    getAll() {
      return Array.from(this.vehicles.values()).map(record => ({
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

    dispose() {
      this.clear();

      this.scene = null;
      this.loader = null;
      this.initialized = false;

      return true;
    },

    emit(name, detail) {
      window.dispatchEvent(
        new CustomEvent(name, {
          detail: detail || {}
        })
      );
    }
  };

  SX.vehicleSpawner = VehicleSpawner;

  window.dispatchEvent(
    new CustomEvent("sx:vehicle-spawner-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 62 END
   FILE: js/vehicle-spawner.js
========================================================= */

