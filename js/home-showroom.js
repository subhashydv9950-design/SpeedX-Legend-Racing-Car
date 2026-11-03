
/* =====================================================
   SUPERX LEGEND RACING
   FILE: js/home-showroom.js
   3D PREMIUM CAR SHOWROOM
   START
===================================================== */

(function () {
  "use strict";

  const SX = window.SUPERX;
  const THREE = window.THREE;

  if (!SX || !THREE) {
    console.warn("SUPERX 3D showroom: Three.js unavailable.");
    return;
  }

  const canvas = document.getElementById("showroomCanvas");

  if (!canvas) return;

  let scene;
  let camera;
  let renderer;
  let carGroup;
  let wheelMeshes = [];
  let animationId;
  let resizeObserver;
  let clock;

  const materials = {};

  function material(color, metalness, roughness) {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: metalness,
      roughness: roughness
    });
  }

  function createMaterials(color) {
    materials.body = material(color || "#7c3aed", 0.82, 0.22);
    materials.dark = material("#101018", 0.45, 0.35);
    materials.glass = new THREE.MeshPhysicalMaterial({
      color: "#111827",
      metalness: 0.65,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88
    });
    materials.rubber = material("#08080b", 0.05, 0.92);
    materials.rim = material("#c7c9d2", 0.9, 0.2);
    materials.light = new THREE.MeshBasicMaterial({
      color: "#dceaff"
    });
    materials.red = new THREE.MeshBasicMaterial({
      color: "#ff173d"
    });
  }

  function addBox(parent, size, position, mat, rotation) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      mat
    );

    mesh.position.set(position[0], position[1], position[2]);

    if (rotation) {
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    return mesh;
  }

  function addWheel(x, z) {
    const wheel = new THREE.Group();

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.22, 32),
      materials.rubber
    );

    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.235, 24),
      materials.rim
    );

    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.25, 16),
      materials.dark
    );

    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);

    wheel.position.set(x, 0.48, z);
    carGroup.add(wheel);
    wheelMeshes.push(wheel);
  }

  function createCar(color) {
    if (carGroup) {
      scene.remove(carGroup);
    }

    wheelMeshes = [];
    carGroup = new THREE.Group();

    createMaterials(color);

    // Main body
    addBox(
      carGroup,
      [1.85, 0.48, 3.75],
      [0, 0.65, 0],
      materials.body
    );

    // Front hood
    addBox(
      carGroup,
      [1.78, 0.20, 1.15],
      [0, 0.92, 1.25],
      materials.body,
      [-0.035, 0, 0]
    );

    // Rear deck
    addBox(
      carGroup,
      [1.75, 0.22, 0.8],
      [0, 0.91, -1.35],
      materials.body
    );

    // Roof cabin
    addBox(
      carGroup,
      [1.28, 0.58, 1.65],
      [0, 1.18, -0.05],
      materials.dark,
      [-0.08, 0, 0]
    );

    // Front windshield
    addBox(
      carGroup,
      [1.22, 0.49, 0.09],
      [0, 1.25, 0.79],
      materials.glass,
      [-0.48, 0, 0]
    );

    // Rear windshield
    addBox(
      carGroup,
      [1.18, 0.43, 0.08],
      [0, 1.25, -0.91],
      materials.glass,
      [0.48, 0, 0]
    );

    // Side windows
    [-1, 1].forEach(side => {
      addBox(
        carGroup,
        [0.045, 0.40, 1.23],
        [side * 0.655, 1.20, -0.05],
        materials.glass
      );

      // Side mirrors
      addBox(
        carGroup,
        [0.20, 0.10, 0.22],
        [side * 0.98, 1.02, 0.62],
        materials.body
      );

      // Side skirts
      addBox(
        carGroup,
        [0.12, 0.15, 2.55],
        [side * 0.92, 0.48, 0],
        materials.dark
      );
    });

    // Front bumper
    addBox(
      carGroup,
      [1.92, 0.24, 0.22],
      [0, 0.48, 1.91],
      materials.dark
    );

    // Rear bumper
    addBox(
      carGroup,
      [1.92, 0.23, 0.20],
      [0, 0.48, -1.91],
      materials.dark
    );

    // Front headlights
    [-1, 1].forEach(side => {
      addBox(
        carGroup,
        [0.48, 0.10, 0.045],
        [side * 0.60, 0.88, 1.89],
        materials.light
      );

      addBox(
        carGroup,
        [0.48, 0.10, 0.045],
        [side * 0.60, 0.82, -1.91],
        materials.red
      );
    });

    // Rear spoiler
    addBox(
      carGroup,
      [1.55, 0.09, 0.20],
      [0, 1.48, -1.55],
      materials.dark
    );

    [-0.55, 0.55].forEach(x => {
      addBox(
        carGroup,
        [0.08, 0.30, 0.08],
        [x, 1.30, -1.50],
        materials.rim
      );
    });

    // Four wheels
    addWheel(-0.91, 1.22);
    addWheel(0.91, 1.22);
    addWheel(-0.91, -1.22);
    addWheel(0.91, -1.22);

    // Exhausts
    [-0.48, 0.48].forEach(x => {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.16, 16),
        materials.rim
      );

      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(x, 0.48, -1.98);
      carGroup.add(exhaust);
    });

    carGroup.position.y = 0.04;
    scene.add(carGroup);
  }

  function createFloor() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.3, 80),
      new THREE.MeshStandardMaterial({
        color: "#171322",
        metalness: 0.65,
        roughness: 0.35
      })
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    floor.receiveShadow = true;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 3.84, 96),
      new THREE.MeshBasicMaterial({
        color: "#9b6cff",
        side: THREE.DoubleSide
      })
    );

    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    scene.add(ring);
  }

  function setupScene() {
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(
      34,
      1,
      0.1,
      100
    );

    camera.position.set(5.7, 3.2, 6.8);
    camera.lookAt(0, 0.65, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.7)
    );

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const ambient = new THREE.AmbientLight(
      "#ffffff",
      1.7
    );
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(
      "#ffffff",
      3
    );

    mainLight.position.set(4, 8, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const purpleLight = new THREE.PointLight(
      "#9955ff",
      65,
      12
    );

    purpleLight.position.set(-4, 2, -2);
    scene.add(purpleLight);

    const frontLight = new THREE.PointLight(
      "#d8e7ff",
      35,
      10
    );

    frontLight.position.set(2, 3, 5);
    scene.add(frontLight);

    createFloor();
  }

  function resize() {
    if (!renderer || !camera) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (!width || !height) return;

    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (carGroup) {
      carGroup.rotation.y += delta * 0.10;

      wheelMeshes.forEach(wheel => {
        wheel.rotation.x += delta * 0.35;
      });
    }

    renderer.render(scene, camera);
  }

  function updateCarColor(car) {
    if (!car || !carGroup) return;

    const color =
      car.accent ||
      car.color ||
      "#7c3aed";

    createCar(color);
  }

  function initialize() {
    try {
      setupScene();

      const firstCar =
        SX.CARS && SX.CARS.length
          ? SX.CARS[0]
          : null;

      updateCarColor(firstCar);

      resize();

      clock = new THREE.Clock();

      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas.parentElement);
      } else {
        window.addEventListener("resize", resize);
      }

      if (SX.events && typeof SX.events.on === "function") {
        SX.events.on("showroomCarChanged", updateCarColor);
      }

      animate();

      console.log("SUPERX 3D SHOWROOM READY");

    } catch (error) {
      console.error("3D showroom error:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  window.addEventListener("beforeunload", function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    if (renderer) {
      renderer.dispose();
    }
  });

})();

/* =====================================================
   FILE: js/home-showroom.js
   END
===================================================== */
