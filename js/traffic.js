
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 15 — COMPLETE TRAFFIC SYSTEM
   Traffic + Collision Detection + Sound
========================================== */

(function () {
  "use strict";

  const Traffic = {
    cars: [],
    active: false,
    lastSpawn: 0,
    spawnInterval: 1800,
    lastCollision: 0,
    playerHit: false,
    animationId: null
  };

  const LANES = [-3.6, -1.8, 0, 1.8, 3.6];

  function getWorld() {
    if (!window.SuperX3D) return null;

    if (typeof window.SuperX3D.getWorld === "function") {
      return window.SuperX3D.getWorld();
    }

    return null;
  }

  function getPlayerCar() {
    if (!window.SuperX3D) return null;

    const world = getWorld();
    if (!world) return null;

    return world.playerCar ||
      world.raceCar ||
      world.car ||
      null;
  }

  function getSpeed() {
    if (!window.SuperXPhysics) return 0;

    const state = window.SuperXPhysics.getState();
    return Math.max(0, Number(state.speed) || 0);
  }

  function createTrafficCar() {
    const world = getWorld();

    if (!world || !window.THREE) return null;

    const THREE = window.THREE;
    const group = new THREE.Group();

    const colors = [
      0xe53935,
      0xeeeeee,
      0x1976d2,
      0xf9a825,
      0x424242,
      0x43a047,
      0x8e24aa
    ];

    const color = colors[
      Math.floor(Math.random() * colors.length)
    ];

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.45,
      roughness: 0.38
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x172535,
      metalness: 0.25,
      roughness: 0.2
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: 0.85
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.48, 3.1),
      bodyMaterial
    );

    body.position.y = 0.62;
    group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.55, 1.5),
      glassMaterial
    );

    cabin.position.set(0, 1.08, -0.15);
    group.add(cabin);

    const wheelGeometry = new THREE.CylinderGeometry(
      0.34, 0.34, 0.2, 12
    );

    const wheelPositions = [
      [-0.8, 0.35, 1.0],
      [0.8, 0.35, 1.0],
      [-0.8, 0.35, -1.0],
      [0.8, 0.35, -1.0]
    ];

    wheelPositions.forEach(function (position) {
      const wheel = new THREE.Mesh(
        wheelGeometry,
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(
        position[0],
        position[1],
        position[2]
      );

      group.add(wheel);
    });

    const headlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff1c1
    });

    [-0.48, 0.48].forEach(function (x) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.12, 0.06),
        headlightMaterial
      );

      light.position.set(x, 0.7, 1.56);
      group.add(light);
    });

    group.position.set(
      LANES[Math.floor(Math.random() * LANES.length)],
      0,
      -100 - Math.random() * 90
    );

    group.userData.speed = 35 + Math.random() * 65;
    group.userData.lane = group.position.x;
    group.userData.hitCooldown = 0;

    world.add(group);

    return group;
  }

  function spawnCar() {
    if (Traffic.cars.length >= 12) return;

    const car = createTrafficCar();

    if (car) {
      Traffic.cars.push(car);
    }
  }

  function playCollisionSound() {
    const now = Date.now();

    if (now - Traffic.lastCollision < 900) return;

    Traffic.lastCollision = now;

    if (window.SuperXAudio) {
      window.SuperXAudio.collision();
    }
  }

  function detectCollision(car, player) {
    if (!car || !player) return false;

    const dx = Math.abs(car.position.x - player.position.x);
    const dz = Math.abs(car.position.z - player.position.z);

    return dx < 1.45 && dz < 2.5;
  }

  function applyCollision(car) {
    playCollisionSound();

    Traffic.playerHit = true;

    // Collision feedback: slow the player briefly.
    if (window.SuperXPhysics) {
      window.SuperXPhysics.setControl("brake", true);
    }

    if (car && car.userData) {
      car.userData.speed = 0;
    }

    window.setTimeout(function () {
      if (window.SuperXPhysics) {
        window.SuperXPhysics.setControl("brake", false);
      }

      Traffic.playerHit = false;
    }, 250);
  }

  function removeCar(index) {
    const world = getWorld();
    const car = Traffic.cars[index];

    if (!car) return;

    if (world) {
      world.remove(car);
    }

    car.traverse(function (object) {
      if (!object.isMesh) return;

      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(function (material) {
            material.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
    });

    Traffic.cars.splice(index, 1);
  }

  function update(deltaTime) {
    if (!Traffic.active) return;

    const world = getWorld();
    if (!world) return;

    const player = getPlayerCar();
    const dt = Math.min(Math.max(deltaTime || 0.016, 0), 0.05);
    const playerSpeed = getSpeed();

    const now = performance.now();

    if (now - Traffic.lastSpawn > Traffic.spawnInterval) {
      spawnCar();
      Traffic.lastSpawn = now;
    }

    for (let i = Traffic.cars.length - 1; i >= 0; i--) {
      const car = Traffic.cars[i];

      // Traffic moves toward the player according to relative speed.
      const relativeSpeed = 8 + playerSpeed * 0.45 -
        car.userData.speed * 0.12;

      car.position.z += relativeSpeed * dt;

      // Keep traffic near its assigned lane.
      car.position.x +=
        (car.userData.lane - car.position.x) * Math.min(1, dt * 2);

      if (player && detectCollision(car, player)) {
        if (now - (car.userData.hitCooldown || 0) > 1200) {
          car.userData.hitCooldown = now;
          applyCollision(car);
        }
      }

      if (car.position.z > 25) {
        removeCar(i);
      }
    }
  }

  function start() {
    clear();
    Traffic.active = true;
    Traffic.lastSpawn = performance.now();
  }

  function stop() {
    Traffic.active = false;
  }

  function clear() {
    Traffic.active = false;

    for (let i = Traffic.cars.length - 1; i >= 0; i--) {
      removeCar(i);
    }

    Traffic.playerHit = false;
  }

  function getState() {
    return {
      active: Traffic.active,
      trafficCount: Traffic.cars.length,
      playerHit: Traffic.playerHit
    };
  }

  window.SuperXTraffic = {
    start: start,
    stop: stop,
    clear: clear,
    update: update,
    spawnCar: spawnCar,
    getState: getState
  };

  console.log("SUPERX traffic system loaded.");

})();

/* ========== END OF PART 15 ========== */
