
/* =========================================================
   FILE 136: vehicle-race-session-sync-import.js
   PATH: js/vehicle-race-session-sync-import.js

   PURPOSE:
   Safely inspect and preview imported race sessions.

   DEPENDENCIES:
   FILE 134 - Sync Payload Validator
   FILE 135 - Sync Export Manager (format reference)

   SAFETY:
   - No automatic import or overwrite.
   - No cloud upload.
   - No execution of imported content.
   - Original player progress remains unchanged.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncImport) {
    console.warn("SUPERX: Sync import manager already exists.");
    return;
  }

  const FORMAT_NAME = "SUPERX-RACE-SESSION";
  const FORMAT_VERSION = 1;
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

  let importCount = 0;
  let lastPreviewAt = null;
  let lastPreview = null;

  const BLOCKED_KEYS = [
    "__proto__",
    "prototype",
    "constructor"
  ];

  function isPlainObject(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function inspectObject(value, depth) {
    if (depth > 50) {
      return {
        valid: false,
        error: "Maximum JSON nesting depth exceeded."
      };
    }

    if (!value || typeof value !== "object") {
      return { valid: true };
    }

    const keys = Object.keys(value);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (BLOCKED_KEYS.indexOf(key) !== -1) {
        return {
          valid: false,
          error: "Unsafe property detected: " + key
        };
      }

      const result = inspectObject(
        value[key],
        depth + 1
      );

      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  function getValidator() {
    return SX.vehicleRaceSessionSyncValidator || null;
  }

  function parseJson(jsonText) {
    if (typeof jsonText !== "string") {
      return {
        success: false,
        error: "Import content must be a JSON string."
      };
    }

    const bytes = new TextEncoder().encode(jsonText).length;

    if (bytes === 0) {
      return {
        success: false,
        error: "Import file is empty."
      };
    }

    if (bytes > MAX_IMPORT_BYTES) {
      return {
        success: false,
        error: "Import file exceeds the 2 MB limit."
      };
    }

    let parsed;

    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      return {
        success: false,
        error: "Invalid JSON format."
      };
    }

    if (!isPlainObject(parsed)) {
      return {
        success: false,
        error: "JSON root must be an object."
      };
    }

    const inspection = inspectObject(parsed, 0);

    if (!inspection.valid) {
      return {
        success: false,
        error: inspection.error
      };
    }

    return {
      success: true,
      data: parsed,
      bytes: bytes
    };
  }

  function validateEnvelope(envelope) {
    if (envelope.exportFormat !== FORMAT_NAME) {
      return {
        valid: false,
        error: "Unknown export format."
      };
    }

    if (envelope.exportVersion !== FORMAT_VERSION) {
      return {
        valid: false,
        error: "Unsupported export format version."
      };
    }

    if (!isPlainObject(envelope.session)) {
      return {
        valid: false,
        error: "Session data is missing or invalid."
      };
    }

    if (
      typeof envelope.exportedAt !== "string" ||
      Number.isNaN(Date.parse(envelope.exportedAt))
    ) {
      return {
        valid: false,
        error: "Invalid export timestamp."
      };
    }

    return { valid: true };
  }

  function previewImport(jsonText, options) {
    options = options || {};

    const parsed = parseJson(jsonText);

    if (!parsed.success) {
      return parsed;
    }

    const envelope = parsed.data;

    const envelopeCheck = validateEnvelope(envelope);

    if (!envelopeCheck.valid) {
      return {
        success: false,
        error: envelopeCheck.error
      };
    }

    const validator = getValidator();

    if (
      !validator ||
      typeof validator.validatePayload !== "function"
    ) {
      return {
        success: false,
        error: "FILE 134 Sync Validator is not loaded."
      };
    }

    const session = clone(envelope.session);

    if (!session) {
      return {
        success: false,
        error: "Session data could not be copied."
      };
    }

    const validation = validator.validatePayload(
      session,
      options.validation || {}
    );

    if (!validation.valid) {
      return {
        success: false,
        error: "Imported session failed validation.",
        validation: validation
      };
    }

    const preview = {
      success: true,

      previewOnly: true,

      importFormat: FORMAT_NAME,

      exportVersion: envelope.exportVersion,

      exportedAt: envelope.exportedAt,

      inspectedAt: new Date().toISOString(),

      fileBytes: parsed.bytes,

      sessionId: session.sessionId,

      schemaVersion: session.schemaVersion,

      validation: validation,

      session: session,

      applied: false
    };

    importCount += 1;

    lastPreviewAt = preview.inspectedAt;

    lastPreview = clone(preview);

    return clone(preview);
  }

  function previewFile(file, options) {
    if (
      !file ||
      typeof file.text !== "function"
    ) {
      return Promise.resolve({
        success: false,
        error: "A valid File object is required."
      });
    }

    if (
      file.size <= 0 ||
      file.size > MAX_IMPORT_BYTES
    ) {
      return Promise.resolve({
        success: false,
        error: "File size is invalid or exceeds 2 MB."
      });
    }

    return file.text().then(function (text) {
      return previewImport(text, options);
    }).catch(function () {
      return {
        success: false,
        error: "Unable to read the selected file."
      };
    });
  }

  function getLastPreview() {
    return clone(lastPreview);
  }

  function getStatistics() {
    return {
      importPreviewCount: importCount,
      lastPreviewAt: lastPreviewAt,
      maxImportBytes: MAX_IMPORT_BYTES,
      automaticApply: false
    };
  }

  function clearPreview() {
    lastPreview = null;
    lastPreviewAt = null;

    return true;
  }

  function resetStatistics() {
    importCount = 0;
    return true;
  }

  SX.vehicleRaceSessionSyncImport = {
    parseJson: parseJson,

    previewImport: previewImport,

    previewFile: previewFile,

    getLastPreview: getLastPreview,

    getStatistics: getStatistics,

    clearPreview: clearPreview,

    resetStatistics: resetStatistics
  };

  console.info(
    "SUPERX: Race Session Sync Import Manager initialized."
  );

})(window);

/* ================= END FILE 136 ================= */
