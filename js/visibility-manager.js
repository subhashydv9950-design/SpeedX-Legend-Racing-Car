
/* =========================================================
   SUPERX LEGEND — FILE 51
   FILE: js/visibility-manager.js
   PURPOSE: App visibility, pause and resume management
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    initialized: false,
    hidden: document.hidden,
    paused: false,
    reasons: new Set(),
    callbacks: {
      pause: new Set(),
      resume: new Set(),
      visibility: new Set()
    },
    lastHiddenAt: null,
    totalHiddenTime: 0
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
    }));
  }

  function notify(type, detail) {
    state.callbacks[type].forEach(function (callback) {
      try {
        callback(detail);
      } catch (error) {
        console.warn("SUPERX visibility callback error:", error);
      }
    });
  }

  function pause(reason) {
    reason = reason || "manual";

    state.reasons.add(reason);

    if (state.paused) return false;

    state.paused = true;

    const detail = {
      paused: true,
      reason,
      reasons: Array.from(state.reasons),
      timestamp: Date.now()
    };

    if (SX.audio && typeof SX.audio.stopEngine === "function") {
      SX.audio.stopEngine();
    }

    emit("sx:game-paused", detail);
    notify("pause", detail);

    return true;
  }

  function resume(reason) {
    reason = reason || "manual";

    state.reasons.delete(reason);

    if (state.reasons.size > 0 || !state.paused) {
      return false;
    }

    state.paused = false;

    const detail = {
      paused: false,
      reason,
      timestamp: Date.now()
    };

    emit("sx:game-resumed", detail);
    notify("resume", detail);

    return true;
  }

  function setPaused(value, reason) {
    return value
      ? pause(reason)
      : resume(reason);
  }

  function handleVisibilityChange() {
    const hidden = document.hidden;

    state.hidden = hidden;

    const detail = {
      hidden,
      timestamp: Date.now()
    };

    if (hidden) {
      state.lastHiddenAt = Date.now();

      pause("visibility");

      if (SX.audio && typeof SX.audio.stopEngine === "function") {
        SX.audio.stopEngine();
      }
    } else {
      if (state.lastHiddenAt !== null) {
        state.totalHiddenTime +=
          Date.now() - state.lastHiddenAt;

        state.lastHiddenAt = null;
      }

      resume("visibility");
    }

    emit("sx:visibility-changed", detail);
    notify("visibility", detail);
  }

  function handleBlur() {
    pause("window-blur");
  }

  function handleFocus() {
    resume("window-blur");
  }

  function on(type, callback) {
    if (
      !state.callbacks[type] ||
      typeof callback !== "function"
    ) {
      return function () {};
    }

    state.callbacks[type].add(callback);

    return function unsubscribe() {
      state.callbacks[type].delete(callback);
    };
  }

  function isPaused() {
    return state.paused;
  }

  function isHidden() {
    return state.hidden;
  }

  function getState() {
    return {
      initialized: state.initialized,
      hidden: state.hidden,
      paused: state.paused,
      reasons: Array.from(state.reasons),
      lastHiddenAt: state.lastHiddenAt,
      totalHiddenTime: state.totalHiddenTime
    };
  }

  function init() {
    if (state.initialized) {
      return getState();
    }

    state.initialized = true;
    state.hidden = document.hidden;

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    window.addEventListener("pagehide", function () {
      pause("page-hide");
    });

    window.addEventListener("pageshow", function () {
      resume("page-hide");
    });

    if (state.hidden) {
      pause("visibility");
    }

    emit("sx:visibility-manager-ready", getState());

    return getState();
  }

  function destroy() {
    if (!state.initialized) return;

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);

    state.callbacks.pause.clear();
    state.callbacks.resume.clear();
    state.callbacks.visibility.clear();

    state.reasons.clear();
    state.paused = false;
    state.initialized = false;
  }

  SX.visibilityManager = {
    init,
    pause,
    resume,
    setPaused,
    isPaused,
    isHidden,
    on,
    getState,
    destroy
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 51 END
   ========================================================= */
