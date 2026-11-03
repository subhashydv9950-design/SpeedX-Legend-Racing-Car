
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 139: js/vehicle-race-session-sync-apply.js

   START — FILE 139
   Safe Session Import Apply Manager
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    busy: false,
    lastResult: null,
    applyCount: 0,
    failureCount: 0
  };

  function requireFunction(options, name) {
    if (typeof options[name] !== "function") {
      throw new Error(
        name + " के लिए वैध Function देना आवश्यक है।"
      );
    }
  }

  function validatePreview(preview) {
    if (!preview || typeof preview !== "object") {
      throw new Error("Import Preview उपलब्ध नहीं है।");
    }

    if (preview.valid !== true) {
      throw new Error(
        preview.message || "Import Preview वैध नहीं है।"
      );
    }

    return true;
  }

  function validateSession(session) {
    if (
      !session ||
      typeof session !== "object" ||
      Array.isArray(session)
    ) {
      throw new Error("Apply करने के लिए Session डेटा सही नहीं है।");
    }

    return true;
  }

  async function apply(preview, options) {
    if (state.busy) {
      throw new Error("Import प्रक्रिया पहले से चल रही है।");
    }

    options = options || {};

    validatePreview(preview);

    requireFunction(options, "getValidatedSession");
    requireFunction(options, "createBackup");
    requireFunction(options, "applySession");

    if (options.confirmed !== true) {
      throw new Error(
        "Session लागू करने से पहले स्पष्ट Confirmation आवश्यक है।"
      );
    }

    state.busy = true;

    try {
      const session = await options.getValidatedSession(preview);

      validateSession(session);

      const backupResult = await options.createBackup();

      if (
        backupResult === false ||
        backupResult === null ||
        backupResult === undefined
      ) {
        throw new Error(
          "Backup सफल नहीं हुआ। Import रोक दिया गया।"
        );
      }

      const result = await options.applySession(session);

      if (result === false) {
        throw new Error("Session Apply नहीं हो सका।");
      }

      state.applyCount += 1;

      state.lastResult = {
        success: true,
        appliedAt: new Date().toISOString(),
        message: "Session सफलतापूर्वक लागू किया गया।"
      };

      return {
        success: true,
        message: state.lastResult.message,
        appliedAt: state.lastResult.appliedAt
      };

    } catch (error) {
      state.failureCount += 1;

      state.lastResult = {
        success: false,
        failedAt: new Date().toISOString(),
        message: error && error.message
          ? error.message
          : "Session Apply विफल हुआ।"
      };

      throw error;

    } finally {
      state.busy = false;
    }
  }

  function getState() {
    return {
      busy: state.busy,
      applyCount: state.applyCount,
      failureCount: state.failureCount,
      lastResult: state.lastResult
        ? Object.assign({}, state.lastResult)
        : null
    };
  }

  function resetStatistics() {
    if (state.busy) {
      return false;
    }

    state.applyCount = 0;
    state.failureCount = 0;
    state.lastResult = null;

    return true;
  }

  SX.vehicleRaceSessionSyncApply = {
    apply: apply,
    getState: getState,
    resetStatistics: resetStatistics
  };

})(window);

/* =========================================================
   END — FILE 139
   ========================================================= */
