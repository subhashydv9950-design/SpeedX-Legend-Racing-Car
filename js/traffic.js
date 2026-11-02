
/* =========================================
   SUPERX LEGEND RACING CAR
   PART 19 — AI TRAFFIC + COLLISION
   FILE: js/traffic.js
========================================= */

(() => {
  "use strict";

  const traffic = {
    cars: [],
    running: false,
    spawnTimer: 0,
    spawnInterval: 2.5,
    maxCars: 9,
    collisionCooldown: 0
  };

  const lanes = [-3.5, 0, 3.5];

  function getWorld() {
    return window.SuperX3D?.getWorld?.() || null;
  }

  function getPlayer() {
    return window.SuperX3D?.getPlayerCar?.() || null;
  }

  function createTrafficCar() {
    const car = window.SuperX3D?.createCar?.(
      Math.floor(Math.random() * 10)
    );

    if (!car) return null;

    car.scale.set(0.9, 0.9, 0.9);

    car.position.set(
      lanes[Math.floor(Math.random() * lanes.length)],
      0,
      -100 - Math.random() * 60
    );

    car.userData.trafficSpeed = 45 + Math.random() * 85;
    car.userData.trafficLane = car.position.x;
    car.userData.isTrafficCar = true;

    return car;
  }

  function spawnCar() {
    const world = getWorld();

    if (!world || traffic.cars.length >= traffic.maxCars) {
      return;
    }

    const car = createTrafficCar();
    if (!car) return;

    world.add(car);
    traffic.cars.push(car);
  }

  function removeCar(car, world) {
    if (world) world.remove(car);

    const index = traffic.cars.indexOf(car);

    if (index !== -1) {
      traffic.cars.splice(index, 1);
    }
  }

  function checkCollision(player, aiCar) {
    if (!player || !aiCar) return false;

    const dx = Math.abs(player.position.x - aiCar.position.x);
    const dz = Math.abs(player.position.z - aiCar.position.z);

    return dx < 1.65 && dz < 3.2;
  }

  function handleCollision() {
    if (traffic.collisionCooldown > 0) return;

    traffic.collisionCooldown = 1.2;

    const physics = window.SuperXPhysics;

    if (physics?.state) {
      physics.state.speed = Math.max(
        0,
        physics.state.speed * 0.45
      );
    }

    window.SuperXAudio?.playCollision?.();

    window.dispatchEvent(
      new CustomEvent("superx:collision")
    );
  }

  function update(dt) {
    if (!traffic.running) return;

    dt = Math.min(Math.max(dt || 0, 0), 0.05);

    const world = getWorld();
    const player = getPlayer();

    if (!world || !player) return;

    traffic.spawnTimer += dt;
    traffic.collisionCooldown = Math.max(
      0,
      traffic.collisionCooldown - dt
    );

    if (traffic.spawnTimer >= traffic.spawnInterval) {
      traffic.spawnTimer = 0;
      spawnCar();
    }

    const playerSpeed =
      window.SuperXPhysics?.getSpeed?.() || 0;

    for (const car of [...traffic.cars]) {
      const aiSpeed = car.userData.trafficSpeed;

      // Relative movement of AI traffic
      const relativeSpeed = (playerSpeed - aiSpeed) * 0.018;

      car.position.z += relativeSpeed * dt * 5;

      // Small lane-keeping adjustment
      const targetX = car.userData.trafficLane;

      car.position.x +=
        (targetX - car.position.x) * Math.min(1, dt * 2);

      // Wheel rotation
      if (car.userData.wheels) {
        car.userData.wheels.forEach(wheel => {
          wheel.rotation.x += aiSpeed * dt * 0.025;
        });
      }

      // Collision
      if (checkCollision(player, car)) {
        handleCollision();
      }

      // Remove cars that have passed or gone far away
      if (
        car.position.z > 25 ||
        car.position.z < -240
      ) {
        removeCar(car, world);
      }
    }
  }

  function start() {
    stop();

    traffic.running = true;
    traffic.spawnTimer = 0;

    // Initial traffic
    for (let i = 0; i < 4; i++) {
      spawnCar();
    }
  }

  function stop() {
    const world = getWorld();

    traffic.running = false;
    traffic.spawnTimer = 0;
    traffic.collisionCooldown = 0;

    for (const car of [...traffic.cars]) {
      removeCar(car, world);
    }
  }

  function setTrafficCount(count) {
    traffic.maxCars = Math.max(
      1,
      Math.min(15, Number(count) || 9)
    );
  }

  window.SuperXTraffic = {
    start,
    stop,
    update,
    spawnCar,
    setTrafficCount,
    getCars: () => traffic.cars
  };

})();

/* =========================================
   PART 19 END
========================================= */
