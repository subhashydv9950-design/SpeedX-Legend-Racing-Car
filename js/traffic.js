/* =========================================================
   SUPERX LEGEND — FILE 18
   FILE: js/traffic.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  SX.traffic = {
    vehicles: [],
    scene: null,
    enabled: true,
    initialized: false,
    spawnTimer: 0,
    maxVehicles: 12,
    roadWidth: 12,
    vehicleId: 0,
    playerPosition: null,
    collisionRadiusX: 2.5,
    collisionRadiusZ: 4.5,
    spawnDistance: 180,
    despawnDistance: 35,

    vehicleColors: [
      0xd83b45, 0x2869c7, 0xe6b83d, 0xe5e5e5,
      0x292b35, 0x279b78, 0x8c52bd, 0xc47a45,
      0x17202c, 0xb8b8b8, 0x9c273c, 0x345b49
    ],

    init(scene, options = {}) {
      this.dispose();

      if (!window.THREE || !scene) {
        console.error("SUPERX: Traffic requires a Three.js scene.");
        return false;
      }

      this.scene = scene;
      this.enabled = options.enabled !== false;
      this.maxVehicles = Math.max(
        1,
        Math.min(30, Number(options.maxVehicles) || 12)
      );

      this.roadWidth = Math.max(
        6,
        Math.min(30, Number(options.roadWidth) || 12)
      );

      this.spawnDistance = Math.max(
        80,
        Number(options.spawnDistance) || 180
      );

      this.spawnTimer = 0;
      this.initialized = true;

      if (this.enabled) this.spawnInitialVehicles();

      return true;
    },

    createVehicleMesh(color) {
      const THREE = window.THREE;
      const group = new THREE.Group();

      const bodyMaterial = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.55,
        roughness: 0.35
      });

      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x263747,
        metalness: 0.35,
        roughness: 0.2
      });

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.75, 4.2),
        bodyMaterial
      );

      body.position.y = 0.85;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.75, 2.1),
        glassMaterial
      );

      cabin.position.set(0, 1.55, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
      });

      const wheelGeometry = new THREE.CylinderGeometry(
        0.42, 0.42, 0.28, 14
      );

      const wheels = [];

      [
        [-0.98, 0.45, 1.35],
        [0.98, 0.45, 1.35],
        [-0.98, 0.45, -1.35],
        [0.98, 0.45, -1.35]
      ].forEach(position => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...position);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
      });

      const headlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff2cf
      });

      const tailMaterial = new THREE.MeshBasicMaterial({
        color: 0xff2525
      });

      [-0.65, 0.65].forEach(x => {
        const headlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.2, 0.08),
          headlightMaterial
        );

        headlight.position.set(x, 0.95, 2.12);
        group.add(headlight);

        const tail = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.2, 0.08),
          tailMaterial
        );

        tail.position.set(x, 0.95, -2.12);
        group.add(tail);
      });

      group.userData.wheels = wheels;

      return group;
    },

    getLaneOffset(lane) {
      const laneWidth = this.roadWidth / 3;
      return lane * laneWidth;
    },

    spawnInitialVehicles() {
      if (!this.initialized || !this.enabled) return;

      const initialCount = Math.min(5, this.maxVehicles);

      for (let i = 0; i < initialCount; i++) {
        this.spawnVehicle({
          z: -35 - i * 45,
          lane: i % 2 === 0 ? -1 : 1
        });
      }
    },

    spawnVehicle(options = {}) {
      if (
        !this.initialized ||
        !this.enabled ||
        !this.scene ||
        this.vehicles.length >= this.maxVehicles
      ) {
        return null;
      }

      const lane = Number(options.lane) < 0 ? -1 : 1;

      const color = this.vehicleColors[
        Math.floor(Math.random() * this.vehicleColors.length)
      ];

      const mesh = this.createVehicleMesh(color);

      const x = Number.isFinite(Number(options.x))
        ? Number(options.x)
        : this.getLaneOffset(lane);

      const z = Number.isFinite(Number(options.z))
        ? Number(options.z)
        : -this.spawnDistance;

      mesh.position.set(x, 0, z);
      this.scene.add(mesh);

      const vehicle = {
        id: ++this.vehicleId,
        mesh,
        lane,
        speed: 12 + Math.random() * 22,
        targetX: this.getLaneOffset(lane),
        changeTimer: 4 + Math.random() * 6,
        color,
        nearPlayer: false,
        collision: false
      };

      this.vehicles.push(vehicle);
      return vehicle;
    },

    update(deltaTime, playerPosition) {
      if (!this.initialized || !this.enabled) return;

      const dt = Math.min(
        Math.max(Number(deltaTime) || 0, 0),
        0.05
      );

      if (playerPosition) {
        this.playerPosition = {
          x: Number(playerPosition.x) || 0,
          z: Number(playerPosition.z) || 0
        };
      }

      this.spawnTimer += dt;

      if (
        this.spawnTimer >= 2.8 &&
        this.vehicles.length < this.maxVehicles
      ) {
        this.spawnTimer = 0;

        this.spawnVehicle({
          lane: Math.random() > 0.5 ? -1 : 1,
          z: this.playerPosition
            ? this.playerPosition.z - this.spawnDistance
            : -this.spawnDistance
        });
      }

      const removeIds = [];

      for (const vehicle of this.vehicles) {
        vehicle.mesh.position.z += vehicle.speed * dt;

        vehicle.changeTimer -= dt;

        if (vehicle.changeTimer <= 0) {
          vehicle.lane = Math.random() > 0.5 ? -1 : 1;
          vehicle.targetX = this.getLaneOffset(vehicle.lane);
          vehicle.changeTimer = 5 + Math.random() * 7;
        }

        const difference =
          vehicle.targetX - vehicle.mesh.position.x;

        vehicle.mesh.position.x +=
          difference * Math.min(1, dt * 0.7);

        if (this.playerPosition) {
          const dx = vehicle.mesh.position.x - this.playerPosition.x;
          const dz = vehicle.mesh.position.z - this.playerPosition.z;

          vehicle.nearPlayer =
            Math.abs(dx) < this.collisionRadiusX + 3 &&
            Math.abs(dz) < this.collisionRadiusZ + 5;

          vehicle.collision =
            Math.abs(dx) < this.collisionRadiusX &&
            Math.abs(dz) < this.collisionRadiusZ;
        }

        const playerZ = this.playerPosition
          ? this.playerPosition.z
          : 0;

        if (vehicle.mesh.position.z > playerZ + this.despawnDistance) {
          removeIds.push(vehicle.id);
        }
      }

      removeIds.forEach(id => this.removeVehicle(id));
    },

    checkNearbyVehicles(playerPosition) {
      if (!playerPosition) return [];

      const px = Number(playerPosition.x) || 0;
      const pz = Number(playerPosition.z) || 0;

      for (const vehicle of this.vehicles) {
        const dx = vehicle.mesh.position.x - px;
        const dz = vehicle.mesh.position.z - pz;

        vehicle.nearPlayer =
          Math.abs(dx) < this.collisionRadiusX + 3 &&
          Math.abs(dz) < this.collisionRadiusZ + 5;

        vehicle.collision =
          Math.abs(dx) < this.collisionRadiusX &&
          Math.abs(dz) < this.collisionRadiusZ;
      }

      return this.getNearbyVehicles();
    },

    removeVehicle(id) {
      const index = this.vehicles.findIndex(
        vehicle => vehicle.id === id
      );

      if (index === -1) return false;

      const vehicle = this.vehicles[index];

      if (this.scene && vehicle.mesh) {
        this.scene.remove(vehicle.mesh);
      }

      if (vehicle.mesh) {
        vehicle.mesh.traverse(object => {
          if (object.geometry) object.geometry.dispose();

          if (object.material) {
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];

            materials.forEach(material => material.dispose());
          }
        });
      }

      this.vehicles.splice(index, 1);
      return true;
    },

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (!this.enabled) {
        this.clearVehicles();
      } else if (this.initialized) {
        this.spawnInitialVehicles();
      }
    },

    setMaxVehicles(count) {
      this.maxVehicles = Math.max(
        1,
        Math.min(30, Number(count) || 12)
      );

      while (this.vehicles.length > this.maxVehicles) {
        this.removeVehicle(this.vehicles[this.vehicles.length - 1].id);
      }
    },

    clearVehicles() {
      this.vehicles.slice().forEach(vehicle => {
        this.removeVehicle(vehicle.id);
      });
    },

    getVehicleCount() {
      return this.vehicles.length;
    },

    getNearbyVehicles() {
      return this.vehicles.filter(vehicle => vehicle.nearPlayer);
    },

    getCollisions() {
      return this.vehicles.filter(vehicle => vehicle.collision);
    },

    dispose() {
      this.clearVehicles();

      this.scene = null;
      this.initialized = false;
      this.spawnTimer = 0;
      this.playerPosition = null;
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 18
   END
========================================================= */
