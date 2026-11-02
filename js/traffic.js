
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 6 — AI TRAFFIC SYSTEM
   FILE: js/traffic.js
========================================== */

(() => {
  "use strict";

  const THREE = window.THREE;
  if (!THREE) return;

  const Traffic = {
    cars: [],
    active: false,
    scene: null,
    lastSpawn: 0,
    spawnInterval: 2.5,
    maxCars: 8,
    lanePositions: [-4, -2, 0, 2, 4],
    collisions: 0
  };

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  function createTrafficCar(color) {
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.3
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x152331,
      roughness: 0.2,
      metalness: 0.3
    });

    const tyreMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.95
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.55, 3.5),
      bodyMat
    );
    body.position.y = 0.72;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.55, 1.45),
      glassMat
    );
    cabin.position.set(0, 1.2, 0.05);
    cabin.castShadow = true;
    car.add(cabin);

    const wheelPositions = [
      [-0.88, 0.4, -1.1],
      [0.88, 0.4, -1.1],
      [-0.88, 0.4, 1.1],
      [0.88, 0.4, 1.1]
    ];

    wheelPositions.forEach((p) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16),
        tyreMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(p[0], p[1], p[2]);
      car.add(wheel);
    });

    car.userData.speed = 45 + Math.random() * 45;
    car.userData.lane = 0;
    car.userData.targetLane = 0;
    car.userData.kind = "traffic";
    car.userData.hitCooldown = 0;

    return car;
  }

  function init() {
    const world = window.SuperX3D?.getWorld("race");
    if (!world) return false;

    Traffic.scene = world.scene;
    return true;
  }

  function spawnCar() {
    if (!Traffic.scene || Traffic.cars.length >= Traffic.maxCars) {
      return;
    }

    const palette = [
      0xe63b42, 0x1d83f5, 0xf1b82d,
      0xf0f0f0, 0x24242b, 0x20b58a,
      0x9b59b6
    ];

    const car = createTrafficCar(
      palette[Math.floor(Math.random() * palette.length)]
    );

    const lanes = Traffic.lanePositions;
    const lane = Math.floor(Math.random() * lanes.length);

    car.userData.lane = lane;
    car.userData.targetLane = lane;

    car.position.set(lanes[lane], 0, -100 - Math.random() * 35);

    Traffic.scene.add(car);
    Traffic.cars.push(car);
  }

  function removeCar(index) {
    const car = Traffic.cars[index];
    if (!car) return;

    Traffic.scene?.remove(car);

    car.traverse((object) => {
      if (object.geometry) object.geometry.dispose();

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    Traffic.cars.splice(index, 1);
  }

  function checkCollision(player, trafficCar) {
    const dx = Math.abs(player.position.x - trafficCar.position.x);
    const dz = Math.abs(player.position.z - trafficCar.position.z);

    // Approximate bounding-box collision
    return dx < 1.65 && dz < 3.15;
  }

  function update(deltaTime) {
    if (!Traffic.active || !Traffic.scene) return;

    const world = window.SuperX3D?.getWorld("race");
    if (!world?.car) return;

    const physics = window.SuperXPhysics?.getState();
    const playerSpeed = physics?.speed || 0;
    const dt = clamp(deltaTime, 0, 0.05);

    Traffic.lastSpawn += dt;

    if (Traffic.lastSpawn >= Traffic.spawnInterval) {
      Traffic.lastSpawn = 0;
      spawnCar();
    }

    for (let i = Traffic.cars.length - 1; i >= 0; i--) {
      const car = Traffic.cars[i];

      // Relative movement: traffic travels toward the player
      const relativeSpeed = (playerSpeed - car.userData.speed) / 3.6;
      car.position.z += relativeSpeed * dt;

      // Keep traffic near its selected lane
      const targetX =
        Traffic.lanePositions[car.userData.targetLane];

      car.position.x +=
        (targetX - car.position.x) * Math.min(1, dt * 1.8);

      if (car.userData.hitCooldown > 0) {
        car.userData.hitCooldown -= dt;
      }

      if (
        checkCollision(world.car, car) &&
        car.userData.hitCooldown <= 0
      ) {
        Traffic.collisions++;
        car.userData.hitCooldown = 1.5;

        // Slow the player down after impact
        if (window.SuperXPhysics) {
          const state = window.SuperXPhysics.getState();

          if (state.speed > 0) {
            window.SuperXPhysics.setControl("accelerator", false);
            window.SuperXPhysics.setControl("brake", true);

            setTimeout(() => {
              window.SuperXPhysics?.setControl("brake", false);
            }, 180);
          }
        }

        if (typeof window.showToast === "function") {
          window.showToast("Collision! सावधानी से ड्राइव करें।");
        }
      }

      // Remove cars which have passed the player
      if (car.position.z > 35 || car.position.z < -180) {
        removeCar(i);
      }
    }
  }

  let previousTime = 0;

  function loop(time) {
    requestAnimationFrame(loop);

    if (!Traffic.active) {
      previousTime = time;
      return;
    }

    const dt = previousTime
      ? (time - previousTime) / 1000
      : 0;

    previousTime = time;
    update(dt);
  }

  function start() {
    if (!Traffic.scene && !init()) {
      console.warn("SUPERX Traffic: race world abhi ready nahi hai.");
      return false;
    }

    clear();
    Traffic.active = true;
    Traffic.lastSpawn = 0;
    Traffic.collisions = 0;
    return true;
  }

  function stop() {
    Traffic.active = false;
  }

  function clear() {
    Traffic.cars.forEach((car) => {
      Traffic.scene?.remove(car);
    });

    Traffic.cars.length = 0;
  }

  window.SuperXTraffic = {
    start,
    stop,
    clear,
    update,
    spawnCar,
    getState: () => ({
      active: Traffic.active,
      carCount: Traffic.cars.length,
      collisions: Traffic.collisions
    })
  };

  requestAnimationFrame(loop);

  console.log("SUPERX AI Traffic module loaded");

})();

/* ========== END OF PART 6 ========== */
