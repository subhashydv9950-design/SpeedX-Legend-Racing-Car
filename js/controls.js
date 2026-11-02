
/* =========================================
   SUPERX LEGEND RACING CAR
   PART 20 — MOBILE + KEYBOARD CONTROLS
   FILE: js/controls.js
========================================= */

(() => {
  "use strict";

  const active = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false
  };

  function sendControl(name, value) {
    active[name] = value;

    window.SuperXPhysics?.setControl?.(
      name,
      value
    );
  }

  function bindButton(id, control) {
    const button = document.getElementById(id);
    if (!button) return;

    button.style.touchAction = "none";

    button.addEventListener("pointerdown", event => {
      event.preventDefault();

      button.setPointerCapture?.(event.pointerId);
      sendControl(control, true);
      button.classList.add("control-active");
    });

    const release = event => {
      event.preventDefault();
      sendControl(control, false);
      button.classList.remove("control-active");
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      sendControl(control, false);
      button.classList.remove("control-active");
    });
  }

  function setupMobileControls() {
    bindButton("acceleratorBtn", "throttle");
    bindButton("brakeBtn", "brake");
    bindButton("leftBtn", "left");
    bindButton("rightBtn", "right");
    bindButton("handbrakeBtn", "handbrake");

    // Alternative IDs
    bindButton("gasButton", "throttle");
    bindButton("breakButton", "brake");
    bindButton("steerLeft", "left");
    bindButton("steerRight", "right");
  }

  function setupKeyboard() {
    const keyMap = {
      ArrowUp: "throttle",
      KeyW: "throttle",
      ArrowDown: "brake",
      KeyS: "brake",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      Space: "handbrake"
    };

    window.addEventListener("keydown", event => {
      const control = keyMap[event.code];

      if (!control) return;

      event.preventDefault();

      if (!event.repeat) {
        sendControl(control, true);
      }
    });

    window.addEventListener("keyup", event => {
      const control = keyMap[event.code];

      if (!control) return;

      event.preventDefault();
      sendControl(control, false);
    });

    window.addEventListener("blur", releaseAll);
  }

  function releaseAll() {
    Object.keys(active).forEach(control => {
      sendControl(control, false);
    });
  }

  function setSensitivity(value) {
    window.SuperXPhysics?.setSensitivity?.(value);
  }

  function initialize() {
    setupMobileControls();
    setupKeyboard();

    console.log("SUPERX controls initialized.");
  }

  window.SuperXControls = {
    initialize,
    releaseAll,
    setSensitivity,
    setControl: sendControl
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();

/* =========================================
   PART 20 END
========================================= */
