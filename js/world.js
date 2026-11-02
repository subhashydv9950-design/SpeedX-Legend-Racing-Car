
/* =========================================
   SUPERX LEGEND RACING CAR
   PART 17 — 3D WORLD + PLAYER CAR
   FILE: js/world.js
========================================= */

(() => {
  "use strict";

  if (!window.THREE) {
    console.error("SUPERX: Three.js load nahi hua.");
    return;
  }

  const THREE = window.THREE;

  const state = {
    activeCarIndex: 0,
    garageCarIndex: 0,
    raceActive: false,
    speed: 0,
    lastTime: 0,
    scenes: {},
    renderers: {},
    cameras: {},
    cars: {},
    roadMarkers: [],
    roadsideObjects: []
  };

  const carColors = [
    0x9b35ff, 0xff3030, 0x00aaff, 0xffcc22,
    0xeeeeee, 0x222222, 0x00dd99, 0xff6600,
    0x3366ff, 0xdd44aa
  ];

  function makeCar(index = 0) {
    const car = new THREE.Group();
    const color = carColors[index % carColors.length];

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.75,
      roughness: 0.25
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x11131a,
      metalness: 0.4,
      roughness: 0.3
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x182c40,
      metalness: 0.5,
      roughness: 0.12
    });

    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.55, 4.4),
      bodyMaterial
    );
    body.position.y = 0.75;
    car.add(body);

    // Upper cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.65, 2.1),
      glassMaterial
    );
    cabin.position.set(0, 1.3, -0.25);
    car.add(cabin);

    // Front bonnet
    const bonnet = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.16, 1.15),
      bodyMaterial
    );
    bonnet.position.set(0, 1.02, 1.45);
    car.add(bonnet);

    // Rear spoiler
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.12, 0.35),
      darkMaterial
    );
    spoiler.position.set(0, 1.35, -2.05);
    car.add(spoiler);

    // Wheels
    const wheels = [];
    const wheelGeometry = new THREE.CylinderGeometry(
      0.43, 0.43, 0.28, 24
    );

    for (const x of [-1.05, 1.05]) {
      for (const z of [-1.45, 1.45]) {
        const wheel = new THREE.Mesh(
          wheelGeometry,
          darkMaterial
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.48, z);
        car.add(wheel);
        wheels.push(wheel);
      }
    }

    // Headlights
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0xdff5ff
    });

    for (const x of [-0.7, 0.7]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.18, 0.08),
        lightMaterial
      );
      light.position.set(x, 0.83, 2.22);
      car.add(light);
    }

    // Tail lights
    const tailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff1515
    });

    for (const x of [-0.7, 0.7]) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.17, 0.08),
        tailMaterial
      );
      light.position.set(x, 0.82, -2.22);
      car.add(light);
    }

    car.userData.wheels = wheels;
    car.userData.carIndex = index;
    car.userData.isPlayerCar = false;

    return car;
  }

  function makeScene(background = 0x080910) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);
    scene.fog = new THREE.Fog(background, 35, 180);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-8, 15, 10);
    scene.add(sun);

    return scene;
  }

  function makeRenderer(canvas) {
    if (!canvas) return null;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.7)
    );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return renderer;
  }

  function resizeRenderer(renderer, camera) {
    if (!renderer || !camera) return;

    const canvas = renderer.domElement;
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 300;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 200;

    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function addGround(scene) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({
        color: 0x171923,
        roughness: 0.95
      })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    scene.add(ground);
  }

  function addRoad(scene) {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 500),
      new THREE.MeshStandardMaterial({
        color: 0x292b32,
        roughness: 0.9
      })
    );

    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -100);
    scene.add(road);

    // Road edge lines
    for (const x of [-5.7, 5.7]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.025, 500),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );

      edge.position.set(x, 0.02, -100);
      scene.add(edge);
    }

    // Centre lane markers
    for (let i = 0; i < 30; i++) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.025, 3.5),
        new THREE.MeshBasicMaterial({
          color: 0xf5f5f5
        })
      );

      marker.position.set(0, 0.035, -i * 12);
      marker.userData.isRoadMarker = true;

      scene.add(marker);
      state.roadMarkers.push(marker);
    }
  }

  function addRoadside(scene) {
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x176b39,
      roughness: 1
    });

    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x684027
    });

    for (let i = 0; i < 28; i++) {
      for (const side of [-1, 1]) {
        const tree = new THREE.Group();

        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 1.6, 7),
          trunkMaterial
        );
        trunk.position.y = 0.8;
        tree.add(trunk);

        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(0.9, 2.4, 8),
          treeMaterial
        );
        leaves.position.y = 2.3;
        tree.add(leaves);

        tree.position.set(
          side * (9 + Math.random() * 5),
          0,
          -i * 18
        );

        tree.userData.isRoadsideObject = true;

        scene.add(tree);
        state.roadsideObjects.push(tree);
      }
    }
  }

  function createWorld() {
    const scene = makeScene(0x101522);

    addGround(scene);
    addRoad(scene);
    addRoadside(scene);

    const camera = new THREE.PerspectiveCamera(
      65, 1, 0.1, 700
    );

    camera.position.set(0, 5.5, 10);
    camera.lookAt(0, 1, -8);

    const playerCar = makeCar(state.activeCarIndex);
    playerCar.position.set(0, 0, 3);
    playerCar.userData.isPlayerCar = true;

    scene.add(playerCar);

    // Physics and traffic can access this same player car.
    scene.playerCar = playerCar;

    return { scene, camera, playerCar };
  }

  function createShowroom(canvas, carIndex = 0) {
    if (!canvas) return;

    const scene = makeScene(0x090a12);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 0.35, 64),
      new THREE.MeshStandardMaterial({
        color: 0x252033,
        metalness: 0.7,
        roughness: 0.35
      })
    );

    platform.position.y = 0.1;
    scene.add(platform);

    const car = makeCar(carIndex);
    car.position.y = 0.35;
    scene.add(car);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(7, 4, 8);
    camera.lookAt(0, 0.8, 0);

    const renderer = makeRenderer(canvas);

    state.scenes.showroom = scene;
    state.cameras.showroom = camera;
    state.renderers.showroom = renderer;
    state.cars.showroom = car;
  }

  function createGarage(canvas) {
    if (!canvas) return;

    const scene = makeScene(0x0b0c15);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 0.3, 48),
      new THREE.MeshStandardMaterial({
        color: 0x292236,
        metalness: 0.6
      })
    );

    platform.position.y = 0.1;
    scene.add(platform);

    const car = makeCar(state.garageCarIndex);
    car.position.y = 0.25;
    scene.add(car);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(7, 3.5, 8);
    camera.lookAt(0, 0.8, 0);

    const renderer = makeRenderer(canvas);

    state.scenes.garage = scene;
    state.cameras.garage = camera;
    state.renderers.garage = renderer;
    state.cars.garage = car;
  }

  function selectGarageCar(index) {
    const safeIndex = Math.max(0, Number(index) || 0);

    state.garageCarIndex = safeIndex;
    state.activeCarIndex = safeIndex;

    const oldCar = state.cars.garage;

    if (oldCar && state.scenes.garage) {
      state.scenes.garage.remove(oldCar);
    }

    const newCar = makeCar(safeIndex);
    newCar.position.y = 0.25;

    if (state.scenes.garage) {
      state.scenes.garage.add(newCar);
    }

    state.cars.garage = newCar;

    return newCar;
  }

  function createCar(index = 0) {
    return makeCar(index);
  }

  function updateWorld(dt) {
    if (!state.raceActive) return;

    const world = state.scenes.race;
    if (!world) return;

    const speed = Math.max(0, Number(state.speed) || 0);
    const movement = speed * dt * 0.055;

    for (const marker of state.roadMarkers) {
      marker.position.z += movement;

      if (marker.position.z > 12) {
        marker.position.z -= 360;
      }
    }

    for (const object of state.roadsideObjects) {
      object.position.z += movement;

      if (object.position.z > 15) {
        object.position.z -= 504;
      }
    }

    const player = world.playerCar;

    if (player?.userData?.wheels) {
      player.userData.wheels.forEach(wheel => {
        wheel.rotation.x -= movement * 0.8;
      });
    }
  }

  function animate(time) {
    requestAnimationFrame(animate);

    const dt = Math.min(
      (time - (state.lastTime || time)) / 1000,
      0.05
    );

    state.lastTime = time;

    const showroomCar = state.cars.showroom;
    if (showroomCar) {
      showroomCar.rotation.y += 0.004;
    }

    const garageCar = state.cars.garage;
    if (garageCar) {
      garageCar.rotation.y += 0.002;
    }

    updateWorld(dt);

    for (const key of Object.keys(state.renderers)) {
      const renderer = state.renderers[key];
      const camera = state.cameras[key];
      const scene = state.scenes[key];

      if (!renderer || !camera || !scene) continue;

      resizeRenderer(renderer, camera);
      renderer.render(scene, camera);
    }

    if (state.renderers.race && state.scenes.race) {
      resizeRenderer(
        state.renderers.race,
        state.cameras.race
      );

      state.renderers.race.render(
        state.scenes.race,
        state.cameras.race
      );
    }
  }

  function startRaceWorld() {
    if (state.renderers.race) return;

    const canvas = document.getElementById("raceCanvas");
    if (!canvas) {
      console.error("SUPERX: raceCanvas nahi mila.");
      return;
    }

    state.roadMarkers = [];
    state.roadsideObjects = [];

    const world = createWorld();
    const renderer = makeRenderer(canvas);

    state.scenes.race = world.scene;
    state.cameras.race = world.camera;
    state.renderers.race = renderer;
    state.cars.player = world.playerCar;

    state.raceActive = true;

    return world.scene;
  }

  function stopRaceWorld() {
    state.raceActive = false;
    state.speed = 0;
  }

  function setWorldSpeed(speed) {
    state.speed = Number(speed) || 0;
  }

  function getWorld() {
    return state.scenes.race || null;
  }

  function getPlayerCar() {
    return state.cars.player || null;
  }

  function getActiveCarIndex() {
    return state.activeCarIndex;
  }

  function setRaceCamera(view = 0) {
    const camera = state.cameras.race;
    const player = getPlayerCar();

    if (!camera || !player) return;

    if (view === 1) {
      camera.position.set(0, 2.2, 7);
      camera.lookAt(player.position);
    } else if (view === 2) {
      camera.position.set(0, 1.5, 0.5);
      camera.lookAt(0, 1, -15);
    } else if (view === 3) {
      camera.position.set(0, 8, -7);
      camera.lookAt(player.position);
    } else {
      camera.position.set(0, 5.5, 10);
      camera.lookAt(0, 1, -8);
    }
  }

  window.SuperX3D = {
    createCar,
    selectGarageCar,
    getWorld,
    getPlayerCar,
    getActiveCarIndex,
    startRaceWorld,
    stopRaceWorld,
    setWorldSpeed,
    setRaceCamera
  };

  function initialize() {
    const showroomCanvas = document.getElementById("showroomCanvas");
    const garageCanvas = document.getElementById("garageCanvas");

    if (showroomCanvas) {
      createShowroom(showroomCanvas, 0);
    }

    if (garageCanvas) {
      createGarage(garageCanvas);
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();

/* =========================================
   PART 17 END
========================================= */
       
