
/* =========================================================
   SUPERX LEGEND — FILE 53
   FILE: js/network-manager.js
   PURPOSE: Network status and connection monitoring
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    initialized: false,
    online: navigator.onLine,
    connection: null,
    latency: null,
    lastChecked: null,
    listeners: new Set(),
    checkInProgress: false
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
    }));
  }

  function getConnectionInfo() {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null;

    if (!connection) {
      return null;
    }

    return {
      type: connection.type || "unknown",
      effectiveType: connection.effectiveType || "unknown",
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
      saveData: Boolean(connection.saveData)
    };
  }

  function getState() {
    return {
      online: state.online,
      connection: state.connection,
      latency: state.latency,
      lastChecked: state.lastChecked,
      checking: state.checkInProgress
    };
  }

  function notify() {
    const data = getState();

    state.listeners.forEach(function (callback) {
      try {
        callback(data);
      } catch (error) {
        console.warn("SUPERX network listener error:", error);
      }
    });

    emit("sx:network-status", data);
  }

  function handleOnline() {
    state.online = true;
    state.connection = getConnectionInfo();

    notify();
    emit("sx:network-restored");
  }

  function handleOffline() {
    state.online = false;
    state.latency = null;

    notify();
    emit("sx:network-lost");
  }

  function handleConnectionChange() {
    state.connection = getConnectionInfo();
    notify();
  }

  async function checkConnection(url) {
    if (!navigator.onLine) {
      state.online = false;
      state.latency = null;
      notify();

      return {
        online: false,
        latency: null
      };
    }

    if (state.checkInProgress) {
      return getState();
    }

    state.checkInProgress = true;

    const target = url || "./";
    const started = performance.now();

    try {
      const response = await fetch(target, {
        method: "HEAD",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Connection check failed");
      }

      state.latency = Math.round(
        performance.now() - started
      );

      state.online = true;
      state.lastChecked = Date.now();
    } catch (error) {
      state.latency = null;
      state.online = navigator.onLine;
      state.lastChecked = Date.now();
    } finally {
      state.checkInProgress = false;
      notify();
    }

    return getState();
  }

  function getConnectionQuality() {
    if (!state.online) return "offline";

    if (state.latency === null) {
      return "unknown";
    }

    if (state.latency < 100) return "excellent";
    if (state.latency < 250) return "good";
    if (state.latency < 500) return "fair";

    return "poor";
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

  function init() {
    if (state.initialized) {
      return getState();
    }

    state.initialized = true;
    state.online = navigator.onLine;
    state.connection = getConnectionInfo();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection && connection.addEventListener) {
      connection.addEventListener(
        "change",
        handleConnectionChange
      );
    }

    notify();

    return getState();
  }

  function destroy() {
    if (!state.initialized) return;

    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection && connection.removeEventListener) {
      connection.removeEventListener(
        "change",
        handleConnectionChange
      );
    }

    state.listeners.clear();
    state.initialized = false;
  }

  SX.networkManager = {
    init,
    checkConnection,
    getState,
    getConnectionQuality,
    getConnectionInfo,
    subscribe,
    destroy
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 53 END
   ========================================================= */
