
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

    vehicleColors: [
      0xd83b45,
      0x2869c7,
      0xe6b83d,
      0xe5e5e5,
      0x292b35,
      0x279b78,
      0x8c52bd,
      0xc47a45
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

      this.spawnTimer = 0;
      this.initialized = true;

      if (this.enabled) {
        this.spawnInitialVehicles();
      }

      return true;
    },

    spawnInitialVehicles() {
      for (let i = 0; i < 5; i++) {
        this.spawnVehicle({
          z: -35 - i * 45,
          lane: i % 2 === 0 ? -1 : 1
        });
      }
    },

    createVehicleMesh(color) {
      const THREE = window.THREE;

      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.75, 4.2),
        new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.45,
          roughness: 0.4
        })
      );

      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.75, 2.1),
        new THREE.MeshStandardMaterial({
          color: 0x27313d,
          metalness: 0.35,
          roughness: 0.25
        })
      );

      cabin.position.set(0, 1.55, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9
      });

      const wheelGeometry = new THREE.CylinderGeometry(
        0.42,
        0.42,
        0.28,
        12
      );

      [
        [-0.98, 0.45, 1.35],
        [0.98, 0.45, 1.35],
        [-0.98, 0.45, -1.35],
        [0.98, 0.45, -1.35]
      ].forEach(position => {
        const wheel = new THREE.Mesh(
          wheelGeometry,
          wheelMaterial
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...position);
        group.add(wheel);
      });

      const lightMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff2cf
      });

      [-0.65, 0.65].forEach(x => {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.2, 0.08),
          lightMaterial
        );

        light.position.set(x, 0.95, 2.12);
        group.add(light);
      });

      return group;
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

      const lane = Number(options.lane) || 1;
      const laneOffset = lane * 2.6;

      const color = this.vehicleColors[
        Math.floor(Math.random() * this.vehicleColors.length)
      ];

      const mesh = this.createVehicleMesh(color);

      mesh.position.set(
        Number(options.x) || laneOffset,
        0,
        Number(options.z) || -120
      );

      this.scene.add(mesh);

      const vehicle = {
        id: ++this.vehicleId,
        mesh: mesh,
        lane: lane,
        speed: 12 + Math.random() * 22,
        direction: 1,
        targetX: laneOffset,
        changeTimer: 3 + Math.random() * 7,
        color: color
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

      this.spawnTimer += dt;

      if (
        this.spawnTimer > 3 &&
        this.vehicles.length < this.maxVehicles
      ) {
        this.spawnTimer = 0;

        this.spawnVehicle({
          lane: Math.random() > 0.5 ? -1 : 1,
          z: -150
        });
      }

      this.vehicles.forEach(vehicle => {
        vehicle.mesh.position.z += vehicle.speed * dt;

        vehicle.changeTimer -= dt;

        if (vehicle.changeTimer <= 0) {
          vehicle.lane = Math.random() > 0.5 ? -1 : 1;
          vehicle.targetX = vehicle.lane * 2.6;
          vehicle.changeTimer = 4 + Math.random() * 6;
        }

        const difference =
          vehicle.targetX - vehicle.mesh.position.x;

        vehicle.mesh.position.x +=
          difference * Math.min(1, dt * 0.8);

        if (vehicle.mesh.position.z > 30) {
          this.removeVehicle(vehicle.id);
        }
      });

      if (playerPosition) {
        this.checkNearbyVehicles(playerPosition);
      }
    },

    checkNearbyVehicles(playerPosition) {
      const px = Number(playerPosition.x) || 0;
      const pz = Number(playerPosition.z) || 0;

      this.vehicles.forEach(vehicle => {
        const dx = vehicle.mesh.position.x - px;
        const dz = vehicle.mesh.position.z - pz;

        vehicle.nearPlayer =
          Math.abs(dx) < 2.5 &&
          Math.abs(dz) < 5;
      });
    },

    removeVehicle(id) {
      const index = this.vehicles.findIndex(
        vehicle => vehicle.id === id
      );

      if (index === -1) return false;

      const vehicle = this.vehicles[index];

      this.scene.remove(vehicle.mesh);

      vehicle.mesh.traverse(object => {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach(material => material.dispose());
        }
      });

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

    clearVehicles() {
      this.vehicles.slice().forEach(vehicle => {
        this.removeVehicle(vehicle.id);
      });
    },

    getVehicleCount() {
      return this.vehicles.length;
    },

    getNearbyVehicles() {
      return this.vehicles.filter(
        vehicle => vehicle.nearPlayer
      );
    },

    dispose() {
      this.clearVehicles();

      this.scene = null;
      this.initialized = false;
      this.spawnTimer = 0;
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 18
   END
========================================================= */
