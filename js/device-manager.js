
/* =========================================================
   SUPERX LEGEND — FILE 52
   FILE: js/device-manager.js
   PURPOSE: Device detection, orientation and capabilities
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    initialized: false,
    device: {},
    orientation: "unknown",
    online: navigator.onLine,
    battery: null,
    listeners: new Set()
  };

  function detectDevice() {
    const ua = navigator.userAgent || "";
    const touch = (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );

    const mobile = /Android|iPhone|iPod|Mobile/i.test(ua);
    const tablet = /iPad|Tablet/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua));

    let type = "desktop";

    if (tablet) {
      type = "tablet";
    } else if (mobile) {
      type = "mobile";
    }

    return {
      type,
      mobile: type === "mobile",
      tablet: type === "tablet",
      desktop: type === "desktop",
      touch,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      memory: navigator.deviceMemory || null,
      processorCores: navigator.hardwareConcurrency || null,
      language: navigator.language || "en",
      platform: navigator.platform || "unknown",
      userAgent: ua
    };
  }

  function detectOrientation() {
    if (window.matchMedia) {
      if (window.matchMedia("(orientation: portrait)").matches) {
        return "portrait";
      }

      if (window.matchMedia("(orientation: landscape)").matches) {
        return "landscape";
      }
    }

    return window.innerWidth >= window.innerHeight
      ? "landscape"
      : "portrait";
  }

  function getCapabilities() {
    return {
      webGL: detectWebGL(),
      webAudio: Boolean(
        window.AudioContext ||
        window.webkitAudioContext
      ),
      gamepad: Boolean(navigator.getGamepads),
      vibration: Boolean(navigator.vibrate),
      fullscreen: Boolean(
        document.documentElement.requestFullscreen
      ),
      pointerLock: Boolean(
        document.body && document.body.requestPointerLock
      ),
      serviceWorker: "serviceWorker" in navigator,
      localStorage: canUseStorage(),
      touch: "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
    };
  }

  function detectWebGL() {
    try {
      const canvas = document.createElement("canvas");

      return Boolean(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
      );
    } catch (error) {
      return false;
    }
  }

  function canUseStorage() {
    try {
      const key = "__superx_device_test__";

      localStorage.setItem(key, "1");
      localStorage.removeItem(key);

      return true;
    } catch (error) {
      return false;
    }
  }

  function update() {
    state.device = detectDevice();
    state.orientation = detectOrientation();
    state.online = navigator.onLine;

    const data = getInfo();

    state.listeners.forEach(function (callback) {
      try {
        callback(data);
      } catch (error) {
        console.warn("SUPERX device listener error:", error);
      }
    });

    window.dispatchEvent(new CustomEvent("sx:device-updated", {
      detail: data
    }));

    return data;
  }

  function handleOnline() {
    state.online = true;

    window.dispatchEvent(new CustomEvent("sx:network-online"));
    update();
  }

  function handleOffline() {
    state.online = false;

    window.dispatchEvent(new CustomEvent("sx:network-offline"));
    update();
  }

  function handleResize() {
    update();
  }

  function handleOrientation() {
    update();
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      return function () {};
    }

    state.listeners.add(callback);

    return function unsubscribe() {
      state.listeners.delete(callback);
    };
  }

  function getInfo() {
    return {
      device: Object.assign({}, state.device),
      orientation: state.orientation,
      online: state.online,
      battery: state.battery,
      capabilities: getCapabilities()
    };
  }

  async function getBatteryInfo() {
    if (!navigator.getBattery) {
      state.battery = null;
      return null;
    }

    try {
      const battery = await navigator.getBattery();

      state.battery = {
        level: Math.round(battery.level * 100),
        charging: battery.charging
      };

      battery.addEventListener("levelchange", function () {
        state.battery = {
          level: Math.round(battery.level * 100),
          charging: battery.charging
        };

        update();
      });

      battery.addEventListener("chargingchange", function () {
        state.battery = {
          level: Math.round(battery.level * 100),
          charging: battery.charging
        };

        update();
      });

      return state.battery;
    } catch (error) {
      state.battery = null;
      return null;
    }
  }

  async function requestFullscreen() {
    const element = document.documentElement;

    if (!element.requestFullscreen) {
      return false;
    }

    try {
      await element.requestFullscreen();
      return true;
    } catch (error) {
      return false;
    }
  }

  async function exitFullscreen() {
    if (!document.exitFullscreen) {
      return false;
    }

    try {
      await document.exitFullscreen();
      return true;
    } catch (error) {
      return false;
    }
  }

  function vibrate(pattern) {
    if (!navigator.vibrate) return false;

    try {
      return navigator.vibrate(pattern || 50);
    } catch (error) {
      return false;
    }
  }

  function init() {
    if (state.initialized) {
      return getInfo();
    }

    state.initialized = true;

    state.device = detectDevice();
    state.orientation = detectOrientation();
    state.online = navigator.onLine;

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientation);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    getBatteryInfo();

    const info = getInfo();

    window.dispatchEvent(new CustomEvent("sx:device-ready", {
      detail: info
    }));

    return info;
  }

  function destroy() {
    if (!state.initialized) return;

    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleOrientation);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);

    state.listeners.clear();
    state.initialized = false;
  }

  SX.deviceManager = {
    init,
    update,
    getInfo,
    getCapabilities,
    getBatteryInfo,
    requestFullscreen,
    exitFullscreen,
    vibrate,
    subscribe,
    destroy
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 52 END
   ========================================================= */
      
