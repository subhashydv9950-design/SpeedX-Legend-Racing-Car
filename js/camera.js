
/* =========================================================
   SUPERX LEGEND — FILE 21
   FILE: js/camera.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};

  const SX = window.SUPERX;

  const CAMERA_MODES = [
    {
      id: "third",
      name: "Third Person",
      position: { x: 0, y: 5.2, z: 11.5 },
      lookAt: { x: 0, y: 1.2, z: 0 },
      fov: 65
    },
    {
      id: "close",
      name: "Close Chase",
      position: { x: 0, y: 3.2, z: 6.2 },
      lookAt: { x: 0, y: 1, z: 0 },
      fov: 72
    },
    {
      id: "front",
      name: "Front / Bumper",
      position: { x: 0, y: 1.5, z: -1.8 },
      lookAt: { x: 0, y: 1.2, z: -12 },
      fov: 75
    },
    {
      id: "cockpit",
      name: "Cockpit",
      position: { x: 0, y: 1.65, z: 0.25 },
      lookAt: { x: 0, y: 1.4, z: -12 },
      fov: 78
    }
  ];

  let camera = null;
  let car = null;
  let modeIndex = 0;
  let smoothness = 5;
  let initialized = false;
  let lookTarget = null;

  function getMode() {
    return CAMERA_MODES[modeIndex];
  }

  function setCameraPosition(position, target, dt) {
    if (!camera || !car) return;

    const factor = Math.min(1, Math.max(0.01, dt * smoothness));

    const desiredPosition = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    );

    const desiredLook = new THREE.Vector3(
      target.x,
      target.y,
      target.z
    );

    car.localToWorld(desiredPosition);
    car.localToWorld(desiredLook);

    camera.position.lerp(desiredPosition, factor);

    if (!lookTarget) {
      lookTarget = desiredLook.clone();
    } else {
      lookTarget.lerp(desiredLook, factor);
    }

    camera.lookAt(lookTarget);
  }

  function applyMode() {
    if (!camera) return;

    const mode = getMode();

    camera.fov = mode.fov;
    camera.updateProjectionMatrix();

    if (SX.ui && typeof SX.ui.showToast === "function") {
      SX.ui.showToast(mode.name);
    }

    document.dispatchEvent(
      new CustomEvent("superx:cameraChanged", {
        detail: {
          id: mode.id,
          name: mode.name,
          index: modeIndex
        }
      })
    );
  }

  function init(options) {
    options = options || {};

    camera = options.camera || null;
    car = options.car || null;

    if (!camera || !car || typeof THREE === "undefined") {
      console.warn("SUPERX Camera: camera or car missing.");
      return false;
    }

    modeIndex = 0;
    lookTarget = null;
    initialized = true;

    applyMode();
    update(1 / 60);

    return true;
  }

  function update(dt) {
    if (!initialized || !camera || !car) return;

    const mode = getMode();

    setCameraPosition(
      mode.position,
      mode.lookAt,
      Math.max(0.001, Math.min(dt || 0.016, 0.1))
    );
  }

  function next() {
    modeIndex = (modeIndex + 1) % CAMERA_MODES.length;
    applyMode();
    return getMode();
  }

  function previous() {
    modeIndex =
      (modeIndex - 1 + CAMERA_MODES.length) % CAMERA_MODES.length;

    applyMode();
    return getMode();
  }

  function setMode(mode) {
    const index = CAMERA_MODES.findIndex(function (item) {
      return item.id === mode || item.name === mode;
    });

    if (index === -1) return false;

    modeIndex = index;
    applyMode();
    return true;
  }

  function setCar(newCar) {
    if (!newCar) return false;

    car = newCar;
    lookTarget = null;
    return true;
  }

  function setCamera(newCamera) {
    if (!newCamera) return false;

    camera = newCamera;
    applyMode();
    return true;
  }

  function setSmoothness(value) {
    smoothness = Math.max(1, Math.min(15, Number(value) || 5));
  }

  function getModes() {
    return CAMERA_MODES.map(function (mode) {
      return {
        id: mode.id,
        name: mode.name
      };
    });
  }

  function getState() {
    return {
      initialized: initialized,
      mode: getMode().id,
      modeName: getMode().name,
      modeIndex: modeIndex,
      totalModes: CAMERA_MODES.length
    };
  }

  function dispose() {
    camera = null;
    car = null;
    lookTarget = null;
    initialized = false;
    modeIndex = 0;
  }

  SX.camera = {
    init: init,
    update: update,
    next: next,
    previous: previous,
    setMode: setMode,
    setCar: setCar,
    setCamera: setCamera,
    setSmoothness: setSmoothness,
    getModes: getModes,
    getState: getState,
    dispose: dispose
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 21
   END
========================================================= */
