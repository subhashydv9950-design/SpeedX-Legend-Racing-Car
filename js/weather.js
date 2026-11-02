
/* =========================================================
   SUPERX LEGEND — FILE 22
   FILE: js/weather.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const WEATHER_TYPES = {
    clear: {
      name: "Clear",
      fogColor: 0x9fc9e8,
      fogNear: 80,
      fogFar: 450,
      rain: false,
      snow: false
    },
    rain: {
      name: "Rain",
      fogColor: 0x687887,
      fogNear: 25,
      fogFar: 190,
      rain: true,
      snow: false
    },
    fog: {
      name: "Fog",
      fogColor: 0xabb3bd,
      fogNear: 8,
      fogFar: 95,
      rain: false,
      snow: false
    },
    snow: {
      name: "Snow",
      fogColor: 0xd5e0e9,
      fogNear: 35,
      fogFar: 210,
      rain: false,
      snow: true
    }
  };

  let scene = null;
  let renderer = null;
  let camera = null;
  let weather = "clear";
  let timeOfDay = "day";
  let particles = null;
  let particleGeometry = null;
  let particleMaterial = null;
  let particlePositions = null;
  let particleSpeeds = null;
  let ambientLight = null;
  let sunLight = null;
  let originalFog = null;
  let initialized = false;

  const PARTICLE_COUNT = 900;

  function createParticles() {
    if (!scene || particles) return;

    particleGeometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleSpeeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const index = i * 3;

      particlePositions[index] = (Math.random() - 0.5) * 100;
      particlePositions[index + 1] = Math.random() * 45;
      particlePositions[index + 2] = (Math.random() - 0.5) * 100;

      particleSpeeds[i] = 12 + Math.random() * 20;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    particleMaterial = new THREE.PointsMaterial({
      color: weather === "snow" ? 0xffffff : 0xb8d7ed,
      size: weather === "snow" ? 0.22 : 0.12,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      sizeAttenuation: true
    });

    particles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );

    particles.frustumCulled = false;
    scene.add(particles);
  }

  function removeParticles() {
    if (!particles) return;

    scene.remove(particles);

    particleGeometry.dispose();
    particleMaterial.dispose();

    particles = null;
    particleGeometry = null;
    particleMaterial = null;
    particlePositions = null;
    particleSpeeds = null;
  }

  function updateParticles(dt) {
    if (!particles || !particlePositions) return;

    const isSnow = weather === "snow";
    const carPosition = camera
      ? camera.position
      : { x: 0, y: 0, z: 0 };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const index = i * 3;

      particlePositions[index] +=
        isSnow ? Math.sin(i + performance.now() * 0.001) * dt : -dt * 1.5;

      particlePositions[index + 1] -=
        particleSpeeds[i] * dt * (isSnow ? 0.35 : 1);

      particlePositions[index + 2] +=
        isSnow ? Math.cos(i) * dt : particleSpeeds[i] * dt * 0.35;

      if (particlePositions[index + 1] < -2) {
        particlePositions[index + 1] = 35 + Math.random() * 10;
        particlePositions[index] =
          carPosition.x + (Math.random() - 0.5) * 100;
        particlePositions[index + 2] =
          carPosition.z + (Math.random() - 0.5) * 100;
      }
    }

    particleGeometry.attributes.position.needsUpdate = true;

    if (particles) {
      particles.position.set(
        carPosition.x,
        0,
        carPosition.z
      );
    }
  }

  function applyWeather() {
    if (!scene || !renderer) return;

    const data = WEATHER_TYPES[weather];

    if (data) {
      scene.fog = new THREE.Fog(
        data.fogColor,
        data.fogNear,
        data.fogFar
      );

      renderer.setClearColor(data.fogColor, 1);
    }

    removeParticles();

    if (weather === "rain" || weather === "snow") {
      createParticles();
    }

    applyLighting();
  }

  function applyLighting() {
    if (!ambientLight || !sunLight) return;

    if (timeOfDay === "night") {
      ambientLight.intensity = 0.35;
      sunLight.intensity = 0.2;
      sunLight.color.setHex(0x8095d5);

      if (renderer) {
        renderer.setClearColor(0x101321, 1);
      }
    } else if (timeOfDay === "sunset") {
      ambientLight.intensity = 0.65;
      sunLight.intensity = 0.8;
      sunLight.color.setHex(0xffa36b);

      if (renderer) {
        renderer.setClearColor(0xd88d75, 1);
      }
    } else if (timeOfDay === "morning") {
      ambientLight.intensity = 0.8;
      sunLight.intensity = 1.0;
      sunLight.color.setHex(0xffe0b0);
    } else {
      ambientLight.intensity = 1.0;
      sunLight.intensity = 1.2;
      sunLight.color.setHex(0xffffff);
    }

    if (weather === "rain" || weather === "fog") {
      ambientLight.intensity *= 0.7;
      sunLight.intensity *= 0.45;
    }

    if (weather === "snow") {
      ambientLight.intensity *= 0.9;
    }
  }

  function init(options) {
    options = options || {};

    if (typeof THREE === "undefined") {
      console.warn("SUPERX Weather: Three.js is required.");
      return false;
    }

    scene = options.scene || null;
    renderer = options.renderer || null;
    camera = options.camera || null;

    if (!scene || !renderer) {
      console.warn("SUPERX Weather: scene or renderer missing.");
      return false;
    }

    originalFog = scene.fog || null;

    ambientLight = options.ambientLight || null;
    sunLight = options.sunLight || null;

    if (!ambientLight) {
      ambientLight = new THREE.AmbientLight(0xffffff, 1);
      scene.add(ambientLight);
    }

    if (!sunLight) {
      sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
      sunLight.position.set(-40, 80, 35);
      scene.add(sunLight);
    }

    initialized = true;
    applyWeather();

    return true;
  }

  function setWeather(type) {
    if (!WEATHER_TYPES[type]) return false;

    weather = type;

    if (initialized) {
      applyWeather();
    }

    document.dispatchEvent(
      new CustomEvent("superx:weatherChanged", {
        detail: { weather: weather }
      })
    );

    return true;
  }

  function setTimeOfDay(time) {
    const allowed = ["morning", "day", "sunset", "night"];

    if (!allowed.includes(time)) return false;

    timeOfDay = time;

    if (initialized) {
      applyLighting();
    }

    document.dispatchEvent(
      new CustomEvent("superx:timeChanged", {
        detail: { time: time }
      })
    );

    return true;
  }

  function update(dt) {
    if (!initialized) return;

    updateParticles(
      Math.max(0, Math.min(Number(dt) || 0, 0.1))
    );
  }

  function getWeatherTypes() {
    return Object.keys(WEATHER_TYPES).map(function (key) {
      return {
        id: key,
        name: WEATHER_TYPES[key].name
      };
    });
  }

  function getState() {
    return {
      initialized: initialized,
      weather: weather,
      timeOfDay: timeOfDay,
      particlesActive: !!particles
    };
  }

  function dispose() {
    removeParticles();

    if (scene && originalFog !== null) {
      scene.fog = originalFog;
    }

    scene = null;
    renderer = null;
    camera = null;
    ambientLight = null;
    sunLight = null;
    originalFog = null;
    initialized = false;
  }

  SX.weather = {
    init: init,
    setWeather: setWeather,
    setTimeOfDay: setTimeOfDay,
    update: update,
    getWeatherTypes: getWeatherTypes,
    getState: getState,
    dispose: dispose
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 22
   END
========================================================= */
