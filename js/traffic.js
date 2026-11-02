
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 17 — COMPLETE TRAFFIC SYSTEM
   Traffic + Collision + Sound
========================================== */

(function () {
  "use strict";

  const Traffic = {
    cars: [],
    active: false,
    lastSpawn: 0,
    spawnInterval: 2200,
    lastCollision: 0,
    playerHit: false,
    maxCars: 10
  };

  const LANES = [-3.6, -1.8, 0, 1.8, 3.6];

  function getWorld() {
    if (!window.SuperX3D) return null;

    return window.SuperX3D.getWorld();
  }

  function getPlayerCar() {
    const world = getWorld();
    if (!world) return null;

    return (
      world.playerCar ||
      world.raceCar ||
      world.car ||
      null
    );
  }

  function getSpeed() {
    if (!window.SuperXPhysics) return 0;

    const state = window.SuperXPhysics.getState();
    return Math.abs(Number(state.speed) || 0);
  }

  function createCar() {
    const world = getWorld();

    if (!world || !window.THREE) return null;

    const THREE = window.THREE;
    const group = new THREE.Group();

    const colors = [
      0xe53935,
      0xffffff,
      0x1976d2,
      0xf9a825,
      0x43a047,
      0x8e24aa
    ];

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      metalness: 0.45,
      roughness: 0.4
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x172535,
      roughness: 0.2
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x151515
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.5, 3.1),
      bodyMaterial
    );

    body.position.y = 0.65;
    group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.55, 1.5),
      glassMaterial
    );

    cabin.position.set(0, 1.15, -0.15);
    group.add(cabin);

    const wheelGeometry = new THREE.CylinderGeometry(
      0.34, 0.34, 0.22, 12
    );

    [
      [-0.8, 0.35, 1],
      [0.8, 0.35, 1],
      [-0.8, 0.35, -1],
      [0.8, 0.35, -1]
    ].forEach(function (position) {
      const wheel = new THREE.Mesh(
        wheelGeometry,
        wheelMaterial
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...position);
      group.add(wheel);
    });

    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff0c0
    });

    [-0.48, 0.48].forEach(function (x) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.12, 0.06),
        lightMaterial
      );

      light.position.set(x, 0.72, 1.56);
      group.add(light);
    });

    const lane = LANES[
      Math.floor(Math.random() * LANES.length)
    ];

    group.position.set(
      lane,
      0,
      -100 - Math.random() * 80
    );

    group.userData.speed = 30 + Math.random() * 65;
    group.userData.lane = lane;
    group.userData.hit = false;

    world.add(group);

    return group;
  }

  function spawnCar() {
    if (Traffic.cars.length >= Traffic.maxCars) return;

    const car = createCar();

    if (car) {
      Traffic.cars.push(car);
    }
  }

  function collisionSound() {
    const now = Date.now();

    if (now - Traffic.lastCollision < 1000) return;

    Traffic.lastCollision = now;

    if (window.SuperXAudio) {
      window.SuperXAudio.collision();
    }
  }

  function detectCollision(car, player) {
    if (!car || !player) return false;

    const xDistance = Math.abs(
      car.position.x - player.position.x
    );

    const zDistance = Math.abs(
      car.position.z - player.position.z
    );

    return xDistance < 1.5 && zDistance < 2.6;
  }

  function handleCollision(car) {
    if (Traffic.playerHit) return;

    Traffic.playerHit = true;

    collisionSound();

    if (window.SuperXPhysics) {
      window.SuperXPhysics.setControl("brake", true);
    }

    if (car) {
      car.userData.speed = 0;
    }

    setTimeout(function () {
      if (window.SuperXPhysics) {
        window.SuperXPhysics.setControl("brake", false);
      }

      Traffic.playerHit = false;
    }, 350);
  }

  function removeCar(index) {
    const world = getWorld();
    const car = Traffic.cars[index];

    if (!car) return;

    if (world) world.remove(car);

    car.traverse(function (object) {
      if (!object.isMesh) return;

      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(function (m) {
            m.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
    });

    Traffic.cars.splice(index, 1);
  }

  function update(dt) {
    if (!Traffic.active) return;

    const world = getWorld();
    if (!world) return;

    const player = getPlayerCar();
    const speed = getSpeed();

    dt = Math.min(Math.max(dt || 0.016, 0), 0.05);

    const now = performance.now();

    if (now - Traffic.lastSpawn > Traffic.spawnInterval) {
      spawnCar();
      Traffic.lastSpawn = now;
    }

    for (let i = Traffic.cars.length - 1; i >= 0; i--) {
      const car = Traffic.cars[i];

      const relativeSpeed =
        8 + speed * 0.45 - car.userData.speed * 0.12;

      car.position.z += relativeSpeed * dt;

      car.position.x +=
        (car.userData.lane - car.position.x) *
        Math.min(1, dt * 2);

      if (detectCollision(car, player)) {
        handleCollision(car);
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
      count: Traffic.cars.length,
      playerHit: Traffic.playerHit
    };
  }

  window.SuperXTraffic = {
    start,
    stop,
    clear,
    update,
    spawnCar,
    getState
  };

  console.log("SUPERX PART 17 Traffic System Ready");

})();

/* ========== END OF PART 17 ========== */
