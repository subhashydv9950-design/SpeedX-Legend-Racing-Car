
/* =========================================================
   FILE 135: vehicle-race-session-sync-export.js
   PATH: js/vehicle-race-session-sync-export.js

   PURPOSE:
   Export race session data as JSON.

   DEPENDENCIES:
   FILE 134 - Sync Payload Validator

   SAFETY:
   - Does not modify original session data.
   - Does not upload data.
   - Export requires an explicit user action.
========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncExport) {
    console.warn("SUPERX: Sync export manager already exists.");
    return;
  }

  const MODULE_NAME = "vehicleRaceSessionSyncExport";

  let exportCount = 0;
  let lastExportAt = null;

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function getValidator() {
    return SX.vehicleRaceSessionSyncValidator || null;
  }

  function validate(data, options) {
    const validator = getValidator();

    if (
      !validator ||
      typeof validator.validatePayload !== "function"
    ) {
      return {
        valid: false,
        errors: [{
          code: "VALIDATOR_UNAVAILABLE",
          message: "FILE 134 Sync Validator is not loaded."
        }]
      };
    }

    return validator.validatePayload(data, options);
  }

  function prepareExport(data, options) {
    options = options || {};

    const copiedData = clone(data);

    if (!copiedData) {
      return {
        success: false,
        error: "Session data could not be copied safely."
      };
    }

    const validation = validate(
      copiedData,
      options.validation || {}
    );

    if (!validation.valid) {
      return {
        success: false,
        error: "Session data failed validation.",
        validation: validation
      };
    }

    const payload = {
      exportFormat: "SUPERX-RACE-SESSION",
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      session: copiedData
    };

    return {
      success: true,
      previewOnly: true,
      payload: payload,
      validation: validation
    };
  }

  function createJson(data, options) {
    const result = prepareExport(data, options);

    if (!result.success) {
      return result;
    }

    let json;

    try {
      json = JSON.stringify(
        result.payload,
        null,
        2
      );
    } catch (error) {
      return {
        success: false,
        error: "JSON generation failed."
      };
    }

    return {
      success: true,
      json: json,
      bytes: new TextEncoder().encode(json).length,
      validation: result.validation
    };
  }

  function sanitizeFilename(value) {
    return String(value || "race-session")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80) || "race-session";
  }

  function downloadJson(data, filename, options) {
    const result = createJson(data, options);

    if (!result.success) {
      return result;
    }

    if (
      !window.URL ||
      typeof window.URL.createObjectURL !== "function" ||
      typeof document.createElement !== "function"
    ) {
      return {
        success: false,
        error: "File download is not supported in this browser."
      };
    }

    let objectUrl = null;

    try {
      const blob = new Blob(
        [result.json],
        { type: "application/json;charset=utf-8" }
      );

      objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = objectUrl;

      link.download =
        sanitizeFilename(filename) + ".json";

      link.style.display = "none";

      document.body.appendChild(link);

      link.click();

      link.remove();

      exportCount += 1;

      lastExportAt = new Date().toISOString();

      return {
        success: true,
        filename: link.download,
        bytes: result.bytes,
        exportedAt: lastExportAt
      };
    } catch (error) {
      return {
        success: false,
        error: "Download could not be started."
      };
    } finally {
      if (objectUrl) {
        window.setTimeout(function () {
          window.URL.revokeObjectURL(objectUrl);
        }, 1000);
      }
    }
  }

  function getStatistics() {
    return {
      exportCount: exportCount,
      lastExportAt: lastExportAt,
      format: "JSON",
      formatVersion: 1
    };
  }

  function resetStatistics() {
    exportCount = 0;
    lastExportAt = null;
    return true;
  }

  SX[MODULE_NAME] = {
    prepareExport: prepareExport,

    createJson: createJson,

    downloadJson: downloadJson,

    getStatistics: getStatistics,

    resetStatistics: resetStatistics,

    sanitizeFilename: sanitizeFilename
  };

  console.info(
    "SUPERX: Race Session Sync Export Manager initialized."
  );

})(window, document);

/* ================= END FILE 135 ================= */
