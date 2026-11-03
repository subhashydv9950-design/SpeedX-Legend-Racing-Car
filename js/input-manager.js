
/* =========================================================
   SUPERX LEGEND — FILE 47 START
   FILE: js/input-manager.js
   PURPOSE: Unified Keyboard, Touch & Gamepad Input
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    enabled: false,
    initialized: false,
    keyboard: {},
    touch: {},
    gamepad: {},
    listeners: new Map(),
    cleanups: [],
    touchBindings: [],
    activeDevice: "keyboard",
    gamepadConnected: false,
    sensitivity: 1,
    gamepadFrame: null,
    deadzone: 0.22
  };

  const KEY_BINDINGS = {
    accelerate: ["ArrowUp", "KeyW"],
    brake: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    handbrake: ["Space", "ShiftLeft", "ShiftRight"],
    reverse: ["KeyR"],
    horn: ["KeyH"],
    headlights: ["KeyL"],
    indicatorLeft: ["KeyQ"],
    indicatorRight: ["KeyE"],
    pause: ["Escape", "KeyP"],
    camera: ["KeyC"]
  };

  function listen(target, event, handler, options) {
    if (!target) return;

    target.addEventListener(event, handler, options);

    state.cleanups.push(() => {
      target.removeEventListener(event, handler, options);
    });
  }

  function getCollection(source) {
    if (source === "touch") return state.touch;
    if (source === "gamepad") return state.gamepad;
    return state.keyboard;
  }

  function isPressed(action) {
    return Boolean(
      state.keyboard[action] ||
      state.touch[action] ||
      state.gamepad[action]
    );
  }

  function notify(action, pressed, source) {
    const callbacks = state.listeners.get(action);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback({
          action,
          pressed,
          source,
          active: isPressed(action)
        });
      } catch (error) {
        console.error("SUPERX input callback:", error);
      }
    });
  }

  function setInput(action, pressed, source) {
    if (!action) return;

    const collection = getCollection(source);
    const wasActive = isPressed(action);

    collection[action] = Boolean(pressed);

    const isActive = isPressed(action);

    if (wasActive !== isActive) {
      notify(action, isActive, source);
    }

    if (pressed) {
      state.activeDevice = source;
    }
  }

  function releaseAll(source) {
    const collection = getCollection(source);

    Object.keys(collection).forEach(action => {
      setInput(action, false, source);
    });
  }

  function isTypingTarget(target) {
    if (!target) return false;

    const tag = target.tagName;

    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable
    );
  }

  function handleKeyDown(event) {
    if (!state.enabled || isTypingTarget(event.target)) return;

    Object.entries(KEY_BINDINGS).forEach(([action, keys]) => {
      if (!keys.includes(event.code)) return;

      event.preventDefault();
      setInput(action, true, "keyboard");
    });
  }

  function handleKeyUp(event) {
    Object.entries(KEY_BINDINGS).forEach(([action, keys]) => {
      if (keys.includes(event.code)) {
        setInput(action, false, "keyboard");
      }
    });
  }

  function bindTouch(selector, action) {
    const element = document.querySelector(selector);

    if (!element) return false;

    const pointers = new Set();

    const start = event => {
      if (!state.enabled) return;

      event.preventDefault();

      pointers.add(event.pointerId);

      try {
        element.setPointerCapture(event.pointerId);
      } catch (_) {}

      element.classList.add("active");
      setInput(action, true, "touch");
    };

    const end = event => {
      if (event) event.preventDefault();

      pointers.delete(event.pointerId);

      if (!pointers.size) {
        element.classList.remove("active");
        setInput(action, false, "touch");
      }
    };

    element.style.touchAction = "none";

    listen(element, "pointerdown", start, { passive: false });
    listen(element, "pointerup", end, { passive: false });
    listen(element, "pointercancel", end, { passive: false });
    listen(element, "lostpointercapture", end);
    listen(element, "contextmenu", event => event.preventDefault());

    state.touchBindings.push({
      element,
      action,
      pointers
    });

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
    const pad = Array.from(pads || []).find(Boolean);

    if (!pad) {
      if (state.gamepadConnected) {
        state.gamepadConnected = false;
        releaseAll("gamepad");
      }
      return;
    }

    state.gamepadConnected = true;

    const button = index => {
      const item = pad.buttons[index];
      return Boolean(item && item.pressed);
    };

    const axis = Number(pad.axes[0]) || 0;
    const deadzone = state.deadzone;

    setInput(
      "accelerate",
      button(7) || button(0),
      "gamepad"
    );

    setInput(
      "brake",
      button(6) || button(1),
      "gamepad"
    );

    setInput("handbrake", button(2), "gamepad");
    setInput("horn", button(3), "gamepad");

    setInput("left", axis < -deadzone, "gamepad");
    setInput("right", axis > deadzone, "gamepad");

    if (Math.abs(axis) > deadzone) {
      state.activeDevice = "gamepad";
    }
  }

  function gamepadLoop() {
    state.gamepadFrame = null;

    if (!state.enabled) return;

    pollGamepad();

    state.gamepadFrame = requestAnimationFrame(gamepadLoop);
  }

  function startGamepadPolling() {
    if (state.gamepadFrame !== null) return;

    state.gamepadFrame = requestAnimationFrame(gamepadLoop);
  }

  function stopGamepadPolling() {
    if (state.gamepadFrame !== null) {
      cancelAnimationFrame(state.gamepadFrame);
      state.gamepadFrame = null;
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

    return () => {
      callbacks.delete(callback);

      if (!callbacks.size) {
        state.listeners.delete(action);
      }
    };
  }

  function setSensitivity(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return false;

    state.sensitivity = Math.max(
      0.2,
      Math.min(2, number)
    );

    return state.sensitivity;
  }

  function getState() {
    const actions = Object.keys(KEY_BINDINGS);

    return {
      enabled: state.enabled,
      initialized: state.initialized,
      activeDevice: state.activeDevice,
      gamepadConnected: state.gamepadConnected,
      sensitivity: state.sensitivity,
      pressed: actions.filter(isPressed)
    };
  }

  function enable() {
    if (!state.initialized) return false;
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

    state.touchBindings.forEach(binding => {
      binding.element.classList.remove("active");
    });

    return true;
  }

  function destroy() {
    disable();

    state.cleanups.forEach(remove => remove());
    state.cleanups = [];

    state.touchBindings = [];

    state.keyboard = {};
    state.touch = {};
    state.gamepad = {};

    state.gamepadConnected = false;
    state.initialized = false;

    return true;
  }

  function init(options = {}) {
    if (state.initialized) {
      destroy();
    }

    if (options.sensitivity !== undefined) {
      setSensitivity(options.sensitivity);
    }

    if (options.deadzone !== undefined) {
      const value = Number(options.deadzone);

      if (Number.isFinite(value)) {
        state.deadzone = Math.max(
          0.05,
          Math.min(0.8, value)
        );
      }
    }

    state.enabled = true;
    state.initialized = true;

    listen(window, "keydown", handleKeyDown);
    listen(window, "keyup", handleKeyUp);

    listen(window, "blur", () => {
      releaseAll("keyboard");
      releaseAll("touch");
    });

    listen(window, "gamepaddisconnected", () => {
      state.gamepadConnected = false;
      releaseAll("gamepad");
    });

    if (options.bindTouch !== false) {
      bindDefaultTouchControls();
    }

    startGamepadPolling();

    return true;
  }

  SX.inputManager = {
    init,
    destroy,
    on,
    bindTouch,
    isPressed,
    setSensitivity,
    getState,
    enable,
    disable,

    getBindings() {
      return Object.fromEntries(
        Object.entries(KEY_BINDINGS).map(([key, value]) => [
          key,
          [...value]
        ])
      );
    },

    isEnabled() {
      return state.enabled;
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 47 END
   FILE: js/input-manager.js
========================================================= */
