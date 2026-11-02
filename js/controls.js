
/* =====================================================
   SUPERX LEGEND — PART 31 START
   FILE: js/controls.js
===================================================== */

(() => {
  "use strict";

  const active = {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false
  };

  let initialized = false;

  const buttonMap = {
    acceleratorBtn: "throttle",
    gasButton: "throttle",
    brakeBtn: "brake",
    breakButton: "brake",
    leftBtn: "left",
    steerLeft: "left",
    rightBtn: "right",
    steerRight: "right",
    handbrakeBtn: "handbrake"
  };

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

  function send(name, value) {
    if (!(name in active)) return;

    active[name] = Boolean(value);

    window.SuperXPhysics?.setControl?.(
      name,
      active[name]
    );
  }

  function releaseAll() {
    Object.keys(active).forEach(name => {
      send(name, false);
    });

    document.querySelectorAll(".control-active")
      .forEach(button => {
        button.classList.remove("control-active");
      });
  }

  function bindButton(id, control) {
    const button = document.getElementById(id);

    if (!button || button.dataset.superxControlBound === "true") {
      return;
    }

    button.dataset.superxControlBound = "true";
    button.style.touchAction = "none";

    button.addEventListener("pointerdown", event => {
      event.preventDefault();

      if (window.SuperXRace?.getState?.().paused) return;

      button.setPointerCapture?.(event.pointerId);
      send(control, true);
      button.classList.add("control-active");
    });

    const release = event => {
      event.preventDefault();
      send(control, false);
      button.classList.remove("control-active");
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", () => {
      send(control, false);
      button.classList.remove("control-active");
    });

    button.addEventListener("contextmenu", event => {
      event.preventDefault();
    });
  }

  function setupButtons() {
    Object.entries(buttonMap).forEach(([id, control]) => {
      bindButton(id, control);
    });
  }

  function setupKeyboard() {
    if (window.superxKeyboardBound) return;
    window.superxKeyboardBound = true;

    window.addEventListener("keydown", event => {
      const control = keyMap[event.code];
      if (!control) return;

      event.preventDefault();

      if (!event.repeat) {
        send(control, true);
      }
    });

    window.addEventListener("keyup", event => {
      const control = keyMap[event.code];
      if (!control) return;

      event.preventDefault();
      send(control, false);
    });

    window.addEventListener("blur", releaseAll);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) releaseAll();
    });
  }

  function setSensitivity(value) {
    window.SuperXPhysics?.setSensitivity?.(value);
  }

  function initialize() {
    setupButtons();
    setupKeyboard();
    initialized = true;
  }

  window.SuperXControls = {
    initialize,
    releaseAll,
    setSensitivity,
    setControl: send,
    getState: () => ({ ...active }),
    isInitialized: () => initialized
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})();

/* =====================================================
   SUPERX LEGEND — PART 31 END
===================================================== */
