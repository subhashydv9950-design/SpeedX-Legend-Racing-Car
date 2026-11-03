/* =========================================================
   SUPERX LEGEND — FILE 15
   FILE: js/world.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const ENVIRONMENTS = {
    village:  { ground: 0x69764b, road: 0x303137, sky: 0x8caed0, tree: 0x376b38, side: 0x9a865c },
    city:     { ground: 0x45454b, road: 0x292a30, sky: 0x8797b5, tree: 0x416b48, side: 0x77777d },
    mountains:{ ground: 0x66645b, road: 0x33343a, sky: 0x8ba6c1, tree: 0x365b3a, side: 0x777064 },
    snow:     { ground: 0xe4e9ed, road: 0x646c78, sky: 0xb8d3e8, tree: 0x526d75, side: 0xd4dce4 },
    desert:   { ground: 0xc6a365, road: 0x45413b, sky: 0xd5b98c, tree: 0x667342, side: 0xb68e58 },
    forest:   { ground: 0x425b3e, road: 0x303b35, sky: 0x789c91, tree: 0x244b2c, side: 0x61744e },
    highway:  { ground: 0x686b6d, road: 0x292b30, sky: 0x8ba8c8, tree: 0x4b7047, side: 0x8a8a85 },
    racing:   { ground: 0x55545c, road: 0x282830, sky: 0x8998b8, tree: 0x47624b, side: 0x77717f }
  };

  SX.world = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    road: null,
    ground: null,
    scenery: [],
    lights: [],
    currentMap: null,
    animationId: null,
    clock: null,
    running: false,
    resizeObserver: null,
    environment: null,
    settings: {
      shadows: true,
      pixelRatio: 1.5,
      sceneryDensity: 1,
      fog: true
    },

    init(container, map) {
      if (!window.THREE || !container) {
        console.error("SUPERX: Three.js or world container missing.");
        return false;
      }

      this.dispose();

      const THREE = window.THREE;

      this.container = container;
      this.currentMap = map || (SX.mapEngine && SX.mapEngine.currentMap) || null;
      this.environment = this.getEnvironment();

      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.environment.sky);

      if (this.settings.fog) {
        this.scene.fog = new THREE.Fog(
          this.environment.sky,
          100,
          850
        );
      }

      this.camera = new THREE.PerspectiveCamera(
        65, width / height, 0.1, 2500
      );

      this.camera.position.set(0, 7, 15);
      this.camera.lookAt(0, 0, -12);

      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        });
      } catch (error) {
        console.error("SUPERX: WebGL initialization failed.", error);
        this.dispose();
        return false;
      }

      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, this.settings.pixelRatio)
      );

      this.renderer.setSize(width, height);
      this.renderer.shadowMap.enabled = this.settings.shadows;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      if ("outputColorSpace" in this.renderer && THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      if ("toneMapping" in this.renderer) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
      }

      container.appendChild(this.renderer.domElement);

      this.clock = new THREE.Clock();

      this.createLighting();
      this.createGround();
      this.createRoad();
      this.createScenery();

      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", this._resizeHandler);
      }

      this.running = true;
      this.animate();

      return true;
    },

    _resizeHandler() {
      SX.world.resize();
    },

    getEnvironment() {
      const map = this.currentMap || {};
      const name = String(
        map.environment || map.worldId || "village"
      ).toLowerCase();

      return ENVIRONMENTS[name] || ENVIRONMENTS.village;
    },

    createLighting() {
      const THREE = window.THREE;

      const ambient = new THREE.HemisphereLight(
        0xdde8ff, 0x383044, 1.65
      );

      const sun = new THREE.DirectionalLight(0xffe5c2, 2.1);
      sun.position.set(-35, 65, 30);
      sun.castShadow = this.settings.shadows;

      if (this.settings.shadows) {
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        sun.shadow.camera.far = 250;
      }

      this.scene.add(ambient, sun);
      this.lights = [ambient, sun];
    },

    getRoutePoints() {
      const route = SX.mapEngine && SX.mapEngine.routePoints;
      if (route && route.length > 1) return route;

      return [
        { x: 0, z: 0 },
        { x: 0, z: -1200 }
      ];
    },

    createGround() {
      const THREE = window.THREE;

      const geometry = new THREE.PlaneGeometry(1800, 2600);
      const material = new THREE.MeshStandardMaterial({
        color: this.environment.ground,
        roughness: 1
      });

      this.ground = new THREE.Mesh(geometry, material);
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.position.set(0, -0.09, -900);
      this.ground.receiveShadow = true;

      this.scene.add(this.ground);
    },

    createRoad() {
      const THREE = window.THREE;
      const route = this.getRoutePoints();
      const roadWidth = 12;

      const positions = [];
      const indices = [];

      for (let i = 0; i < route.length; i++) {
        const current = route[i];
        const previous = route[Math.max(0, i - 1)];
        const next = route[Math.min(route.length - 1, i + 1)];

        const dx = next.x - previous.x;
        const dz = next.z - previous.z;
        const length = Math.hypot(dx, dz) || 1;

        const sideX = -dz / length;
        const sideZ = dx / length;

        positions.push(
          current.x + sideX * roadWidth / 2, 0.02,
          current.z + sideZ * roadWidth / 2,

          current.x - sideX * roadWidth / 2, 0.02,
          current.z - sideZ * roadWidth / 2
        );

        if (i < route.length - 1) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const road = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: this.environment.road,
          roughness: 0.92,
          side: THREE.DoubleSide
        })
      );

      road.receiveShadow = true;
      this.road = road;
      this.scene.add(road);

      this.createRoadMarkings(route, roadWidth);
    },

    createRoadMarkings(route, roadWidth) {
      const THREE = window.THREE;

      const centerMaterial = new THREE.MeshBasicMaterial({
        color: 0xf2e8c8
      });

      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
      });

      const dashGeometry = new THREE.BoxGeometry(0.16, 0.035, 3.5);
      const edgeGeometry = new THREE.BoxGeometry(0.12, 0.035, 2.5);

      for (let i = 0; i < route.length - 1; i += 2) {
        const a = route[i];
        const b = route[i + 1];

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const angle = Math.atan2(dx, -dz);

        const centerX = (a.x + b.x) / 2;
        const centerZ = (a.z + b.z) / 2;

        const dash = new THREE.Mesh(dashGeometry, centerMaterial);
        dash.position.set(centerX, 0.065, centerZ);
        dash.rotation.y = angle;
        this.scene.add(dash);
        this.scenery.push(dash);

        for (const side of [-1, 1]) {
          const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
          edge.position.set(
            centerX + Math.cos(angle) * roadWidth * 0.43 * side,
            0.055,
            centerZ + Math.sin(angle) * roadWidth * 0.43 * side
          );
          edge.rotation.y = angle;
          this.scene.add(edge);
          this.scenery.push(edge);
        }
      }
    },

    createScenery() {
      const route = this.getRoutePoints();
      const length = Math.abs(
        route[route.length - 1].z - route[0].z
      );

      const count = Math.min(
        180,
        Math.max(20, Math.floor(length / 14 * this.settings.sceneryDensity))
      );

      for (let i = 0; i < count; i++) {
        const progress = i / Math.max(1, count - 1);
        const pointIndex = Math.min(
          route.length - 1,
          Math.floor(progress * (route.length - 1))
        );

        const point = route[pointIndex];
        const side = i % 2 === 0 ? -1 : 1;
        const x = point.x + side * (15 + Math.random() * 30);

        this.createTree(x, point.z, this.environment.tree);
      }
    },

    createTree(x, z, color) {
      const THREE = window.THREE;

      const group = new THREE.Group();

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x59412d })
      );

      trunk.position.y = 1.5;
      trunk.castShadow = this.settings.shadows;

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(2.1 + Math.random(), 5.5, 7),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 1
        })
      );

      leaves.position.y = 5;
      leaves.castShadow = this.settings.shadows;

      group.add(trunk, leaves);
      group.position.set(x, 0, z);

      this.scene.add(group);
      this.scenery.push(group);
    },

    resize() {
      if (!this.renderer || !this.camera || !this.container) return;

      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    },

    animate() {
      if (!this.running || !this.renderer) return;

      this.animationId = requestAnimationFrame(() => this.animate());

      if (this.clock) this.clock.getDelta();

      this.renderer.render(this.scene, this.camera);
    },

    update() {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
    },

    setQuality(options = {}) {
      if (typeof options.shadows === "boolean") {
        this.settings.shadows = options.shadows;

        if (this.renderer) {
          this.renderer.shadowMap.enabled = options.shadows;
        }

        this.lights.forEach(light => {
          if (light.isDirectionalLight) {
            light.castShadow = options.shadows;
          }
        });
      }

      if (Number.isFinite(options.pixelRatio)) {
        this.settings.pixelRatio = Math.max(
          0.5,
          Math.min(2, options.pixelRatio)
        );

        if (this.renderer) {
          this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, this.settings.pixelRatio)
          );
        }
      }

      if (Number.isFinite(options.sceneryDensity)) {
        this.settings.sceneryDensity = Math.max(
          0.25,
          Math.min(2, options.sceneryDensity)
        );
      }
    },

    dispose() {
      this.running = false;

      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      window.removeEventListener("resize", this._resizeHandler);

      if (this.scene) {
        this.scene.traverse(object => {
          if (object.geometry) object.geometry.dispose();

          if (object.material) {
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];

            materials.forEach(material => {
              for (const key of Object.keys(material)) {
                const value = material[key];
                if (value && value.isTexture) value.dispose();
              }
              material.dispose();
            });
          }
        });
      }

      if (this.renderer) {
        this.renderer.dispose();

        if (
          this.container &&
          this.renderer.domElement.parentNode === this.container
        ) {
          this.container.removeChild(this.renderer.domElement);
        }
      }

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.ground = null;
      this.road = null;
      this.scenery = [];
      this.lights = [];
      this.clock = null;
      this.container = null;
      this.currentMap = null;
      this.environment = null;
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 15
   END
========================================================= */
                          
