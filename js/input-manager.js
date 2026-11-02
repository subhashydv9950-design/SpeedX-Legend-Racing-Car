
/* =========================================================
   SUPERX LEGEND — FILE 47 START
   FILE: js/input-manager.js
   PURPOSE: Unified keyboard, touch and gamepad input
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    enabled: true,
    keyboard: {},
    gamepad: {},
    touch: {},
    gamepadConnected: false,
    activeDevice: "keyboard",
    sensitivity: 1,
    listeners: new Map()
  };

  const KEY_BINDINGS = {
    accelerate: ["ArrowUp", "KeyW"],
    brake: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    handbrake: ["Space"],
    reverse: ["KeyR"],
    horn: ["KeyH"],
    headlights: ["KeyL"],
    indicatorLeft: ["KeyQ"],
    indicatorRight: ["KeyE"],
    pause: ["Escape", "KeyP"],
    camera: ["KeyC"]
  };

  function notify(action, pressed, source) {
    const callbacks = state.listeners.get(action);

    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback({
          action,
          pressed,
          source
        });
      } catch (error) {
        console.error("SUPERX input callback error:", error);
      }
    });
  }

  function setInput(action, pressed, source) {
    if (!state.enabled || !action) return;

    const collection = source === "touch"
      ? state.touch
      : source === "gamepad"
        ? state.gamepad
        : state.keyboard;

    const previous = Boolean(collection[action]);
    collection[action] = Boolean(pressed);

    state.activeDevice = source;

    if (previous !== Boolean(pressed)) {
      notify(action, Boolean(pressed), source);
    }
  }

  function isPressed(action) {
    return Boolean(
      state.keyboard[action] ||
      state.touch[action] ||
      state.gamepad[action]
    );
  }

  function handleKeyDown(event) {
    if (!state.enabled) return;

    if (
      event.target &&
      (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable
      )
    ) {
      return;
    }

    Object.entries(KEY_BINDINGS).forEach(([action, keys]) => {
      if (keys.includes(event.code)) {
        event.preventDefault();
        setInput(action, true, "keyboard");
      }
    });
  }

  function handleKeyUp(event) {
    Object.entries(KEY_BINDINGS).forEach(([action, keys]) => {
      if (keys.includes(event.code)) {
        setInput(action, false, "keyboard");
      }
    });
  }

  function releaseAll(source) {
    const collection = source === "touch"
      ? state.touch
      : source === "gamepad"
        ? state.gamepad
        : state.keyboard;

    Object.keys(collection).forEach(action => {
      if (collection[action]) {
        setInput(action, false, source);
      }
    });
  }

  function bindTouch(selector, action) {
    const element = document.querySelector(selector);

    if (!element) return false;

    const start = event => {
      event.preventDefault();
      setInput(action, true, "touch");
    };

    const end = event => {
      event.preventDefault();
      setInput(action, false, "touch");
    };

    element.addEventListener("pointerdown", start);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("lostpointercapture", end);

    element.style.touchAction = "none";

    return true;
  }

  function bindDefaultTouchControls() {
    const controls = {
      "#controlLeft": "left",
      "#controlRight": "right",
      "#controlAccelerator": "accelerate",
      "#controlBrake": "brake",
      "#controlHandbrake": "handbrake",
      "#controlHorn": "horn"
    };

    Object.entries(controls).forEach(([selector, action]) => {
      bindTouch(selector, action);
    });
  }

  function pollGamepad() {
    if (!state.enabled || !navigator.getGamepads) return;

    const pads = navigator.getGamepads();
    const pad = Array.from(pads).find(Boolean);

    if (!pad) {
      if (state.gamepadConnected) {
        state.gamepadConnected = false;
        releaseAll("gamepad");
      }
      return;
    }

    state.gamepadConnected = true;
    state.activeDevice = "gamepad";

    const pressed = index => Boolean(
      pad.buttons[index] && pad.buttons[index].pressed
    );

    setInput("accelerate", pressed(7) || pressed(0), "gamepad");
    setInput("brake", pressed(6) || pressed(1), "gamepad");
    setInput("handbrake", pressed(2), "gamepad");
    setInput("horn", pressed(3), "gamepad");

    const axis = pad.axes[0] || 0;
    const threshold = 0.25;

    setInput("left", axis < -threshold, "gamepad");
    setInput("right", axis > threshold, "gamepad");
  }

  let gamepadFrame = null;

  function gamepadLoop() {
    if (!state.enabled) {
      gamepadFrame = null;
      return;
    }

    pollGamepad();
    gamepadFrame = requestAnimationFrame(gamepadLoop);
  }

  function startGamepadPolling() {
    if (gamepadFrame !== null) return;

    gamepadFrame = requestAnimationFrame(gamepadLoop);
  }

  function stopGamepadPolling() {
    if (gamepadFrame !== null) {
      cancelAnimationFrame(gamepadFrame);
      gamepadFrame = null;
    }

    releaseAll("gamepad");
  }

  function on(action, callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    if (!state.listeners.has(action)) {
      state.listeners.set(action, new Set());
    }

    const callbacks = state.listeners.get(action);
    callbacks.add(callback);

    return () => callbacks.delete(callback);
  }

  function setSensitivity(value) {
    const sensitivity = Number(value);

    if (!Number.isFinite(sensitivity)) return false;

    state.sensitivity = Math.max(
      0.2,
      Math.min(2, sensitivity)
    );

    return true;
  }

  function getState() {
    const actions = Object.keys(KEY_BINDINGS);

    return {
      enabled: state.enabled,
      activeDevice: state.activeDevice,
      gamepadConnected: state.gamepadConnected,
      sensitivity: state.sensitivity,
      pressed: actions.filter(isPressed)
    };
  }

  function enable() {
    if (state.enabled) return true;

    state.enabled = true;
    startGamepadPolling();

    return true;
  }

  function disable() {
    state.enabled = false;

    releaseAll("keyboard");
    releaseAll("touch");
    stopGamepadPolling();

    return true;
  }

  function init(options = {}) {
    if (options.sensitivity !== undefined) {
      setSensitivity(options.sensitivity);
    }

    if (options.bindTouch !== false) {
      bindDefaultTouchControls();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", () => {
      releaseAll("keyboard");
      releaseAll("touch");
    });

    startGamepadPolling();

    return true;
  }

  SX.inputManager = {
    init,
    on,
    bindTouch,
    isPressed,
    setSensitivity,
    getState,
    enable,
    disable,
    getBindings: () => ({ ...KEY_BINDINGS }),
    isEnabled: () => state.enabled
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 47 END
   FILE: js/input-manager.js
========================================================= */
      
