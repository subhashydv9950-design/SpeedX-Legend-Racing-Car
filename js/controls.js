
/* ==========================================
   SUPERX LEGEND RACING CAR
   PART 7 — MOBILE & KEYBOARD CONTROLS
   FILE: js/controls.js
========================================== */

(() => {
  "use strict";

  const activePointers = new Map();
  const keyStates = new Set();

  let steeringMode = "buttons";
  let sensitivity = 1;
  let steeringValue = 0;

  const controlNames = {
    acceleratorBtn: "accelerator",
    brakeBtn: "brake",
    reverseBtn: "reverse",
    handbrakeBtn: "handbrake",
    steerLeft: "left",
    steerRight: "right"
  };

  function setControl(name, pressed) {
    window.SuperXPhysics?.setControl(name, pressed);
  }

  function releaseAll() {
    activePointers.forEach((name) => {
      setControl(name, false);
    });

    activePointers.clear();

    keyStates.forEach((name) => {
      setControl(name, false);
    });

    keyStates.clear();
    steeringValue = 0;
    window.SuperXPhysics?.setSteering(0);
  }

  function bindHoldButton(element, controlName) {
    if (!element) return;

    element.style.touchAction = "none";

    const press = (event) => {
      event.preventDefault();

      try {
        element.setPointerCapture(event.pointerId);
      } catch (_) {}

      activePointers.set(event.pointerId, controlName);
      setControl(controlName, true);
      element.classList.add("control-active");
    };

    const release = (event) => {
      if (!activePointers.has(event.pointerId)) return;

      activePointers.delete(event.pointerId);

      const stillPressed = [...activePointers.values()]
        .includes(controlName);

      if (!stillPressed) {
        setControl(controlName, false);
        element.classList.remove("control-active");
      }
    };

    element.addEventListener("pointerdown", press);
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("lostpointercapture", release);
  }

  function bindSteeringButtons() {
    bindHoldButton(
      document.getElementById("steerLeft"), "left"
    );

    bindHoldButton(
      document.getElementById("steerRight"), "right"
    );
  }

  function bindPedals() {
    Object.entries(controlNames).forEach(([id, control]) => {
      if (id === "steerLeft" || id === "steerRight") return;

      bindHoldButton(document.getElementById(id), control);
    });
  }

  function bindKeyboard() {
    const keyMap = {
      ArrowUp: "accelerator",
      KeyW: "accelerator",
      ArrowDown: "brake",
      KeyS: "brake",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
      Space: "handbrake",
      KeyR: "reverse"
    };

    document.addEventListener("keydown", (event) => {
      const control = keyMap[event.code];
      if (!control) return;

      // Avoid scrolling the page while driving.
      if (event.code.startsWith("Arrow") || event.code === "Space") {
        event.preventDefault();
      }

      if (event.repeat) return;

      keyStates.add(control);
      setControl(control, true);
    });

    document.addEventListener("keyup", (event) => {
      const control = keyMap[event.code];
      if (!control) return;

      keyStates.delete(control);

      const stillPressed = [...keyStates].includes(control) ||
        [...activePointers.values()].includes(control);

      if (!stillPressed) setControl(control, false);
    });

    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) releaseAll();
    });
  }

  function setMode(mode) {
    steeringMode = mode;

    const wheel = document.getElementById("steeringWheel");
    const buttons = document.getElementById("steeringButtons");

    if (wheel) {
      wheel.hidden = mode !== "wheel";
    }

    if (buttons) {
      buttons.hidden = mode !== "buttons";
    }

    steeringValue = 0;
    window.SuperXPhysics?.setSteering(0);
  }

  function bindWheel() {
    const wheel = document.getElementById("steeringWheel");
    if (!wheel) return;

    let pointerId = null;
    let centerX = 0;
    let startX = 0;

    wheel.style.touchAction = "none";

    wheel.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      pointerId = event.pointerId;
      startX = event.clientX;

      const rect = wheel.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;

      try {
        wheel.setPointerCapture(pointerId);
      } catch (_) {}
    });

    wheel.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;

      const rect = wheel.getBoundingClientRect();
      const delta = (event.clientX - centerX) /
        Math.max(35, rect.width * 0.42);

      steeringValue = Math.max(-1, Math.min(1, delta * sensitivity));

      window.SuperXPhysics?.setSteering(steeringValue);

      wheel.style.transform =
        `rotate(${steeringValue * 110}deg)`;
    });

    const finish = (event) => {
      if (pointerId !== event.pointerId) return;

      pointerId = null;
      steeringValue = 0;

      window.SuperXPhysics?.setSteering(0);
      wheel.style.transform = "rotate(0deg)";
    };

    wheel.addEventListener("pointerup", finish);
    wheel.addEventListener("pointercancel", finish);
    wheel.addEventListener("lostpointercapture", finish);
  }

  function bindSensitivity() {
    const slider = document.getElementById("steeringSensitivity");
    if (!slider) return;

    slider.addEventListener("input", () => {
      sensitivity = Math.max(
        0.3, Math.min(2, Number(slider.value) || 1)
      );
    });
  }

  function init() {
    bindPedals();
    bindSteeringButtons();
    bindKeyboard();
    bindWheel();
    bindSensitivity();

    setMode("buttons");

    window.SuperXControls = {
      setMode,
      setSensitivity(value) {
        sensitivity = Math.max(0.3, Math.min(2, Number(value) || 1));
      },
      releaseAll,
      getState() {
        return {
          steeringMode,
          sensitivity,
          steeringValue,
          pressedControls: [...activePointers.values()]
        };
      }
    };

    console.log("SUPERX Controls loaded");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

/* ========== END OF PART 7 ========== */
