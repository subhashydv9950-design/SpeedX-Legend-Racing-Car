
/* =========================================================
   FILE 134: vehicle-race-session-sync-validator.js
   PATH: js/vehicle-race-session-sync-validator.js

   PURPOSE:
   Validate race session data before synchronization.

   SAFETY:
   - Read-only validation.
   - Never modifies the original payload.
   - Never uploads or stores session data.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  if (SX.vehicleRaceSessionSyncValidator) {
    console.warn("SUPERX: Sync validator already initialized.");
    return;
  }

  const DEFAULTS = {
    maxPayloadBytes: 2 * 1024 * 1024,
    maxSessionIdLength: 160,
    maxVersion: 10000
  };

  let config = Object.assign({}, DEFAULTS);
  let validationCount = 0;

  function addError(errors, code, message) {
    errors.push({
      code: code,
      message: message
    });
  }

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

  function measurePayload(payload) {
    try {
      const serialized = JSON.stringify(payload);

      if (typeof serialized !== "string") {
        return {
          valid: false,
          bytes: 0
        };
      }

      return {
        valid: true,
        bytes: new TextEncoder().encode(serialized).length
      };
    } catch (error) {
      return {
        valid: false,
        bytes: 0
      };
    }
  }

  function validateSessionId(sessionId, errors) {
    if (typeof sessionId !== "string") {
      addError(
        errors,
        "INVALID_SESSION_ID",
        "sessionId must be a string."
      );

      return;
    }

    const value = sessionId.trim();

    if (!value) {
      addError(
        errors,
        "EMPTY_SESSION_ID",
        "sessionId cannot be empty."
      );
    }

    if (value.length > config.maxSessionIdLength) {
      addError(
        errors,
        "SESSION_ID_TOO_LONG",
        "sessionId exceeds the allowed length."
      );
    }
  }

  function validateVersion(version, errors) {
    if (
      !Number.isInteger(version) ||
      version < 1 ||
      version > config.maxVersion
    ) {
      addError(
        errors,
        "INVALID_SCHEMA_VERSION",
        "schemaVersion must be a valid positive integer."
      );
    }
  }

  function validateTimestamps(payload, errors) {
    const fields = [
      "createdAt",
      "updatedAt"
    ];

    fields.forEach(function (field) {
      if (payload[field] === undefined) {
        return;
      }

      const value = payload[field];

      if (
        typeof value !== "string" ||
        Number.isNaN(Date.parse(value))
      ) {
        addError(
          errors,
          "INVALID_TIMESTAMP",
          field + " must be a valid date string."
        );
      }
    });
  }

  function validatePayload(payload, options) {
    options = options || {};

    validationCount += 1;

    const errors = [];
    const warnings = [];

    if (!isPlainObject(payload)) {
      addError(
        errors,
        "INVALID_PAYLOAD",
        "Payload must be a plain object."
      );

      return {
        valid: false,
        checkedAt: new Date().toISOString(),
        errors: errors,
        warnings: warnings
      };
    }

    validateSessionId(
      payload.sessionId,
      errors
    );

    validateVersion(
      payload.schemaVersion,
      errors
    );

    validateTimestamps(
      payload,
      errors
    );

    const size = measurePayload(payload);

    if (!size.valid) {
      addError(
        errors,
        "SERIALIZATION_FAILED",
        "Payload cannot be safely serialized."
      );
    } else {
      if (size.bytes > config.maxPayloadBytes) {
        addError(
          errors,
          "PAYLOAD_TOO_LARGE",
          "Payload exceeds the configured size limit."
        );
      }

      if (size.bytes > config.maxPayloadBytes * 0.8) {
        warnings.push({
          code: "PAYLOAD_NEAR_LIMIT",
          message: "Payload is close to the size limit."
        });
      }
    }

    if (
      options.expectedSessionId &&
      payload.sessionId !== options.expectedSessionId
    ) {
      addError(
        errors,
        "SESSION_ID_MISMATCH",
        "Payload sessionId does not match the expected ID."
      );
    }

    if (
      options.expectedVersion !== undefined &&
      payload.schemaVersion !== options.expectedVersion
    ) {
      addError(
        errors,
        "VERSION_MISMATCH",
        "Payload schemaVersion does not match the expected version."
      );
    }

    return {
      valid: errors.length === 0,

      checkedAt: new Date().toISOString(),

      sessionId:
        typeof payload.sessionId === "string"
          ? payload.sessionId
          : null,

      schemaVersion:
        Number.isInteger(payload.schemaVersion)
          ? payload.schemaVersion
          : null,

      payloadBytes: size.bytes,

      errors: errors,

      warnings: warnings
    };
  }

  function configure(options) {
    options = options || {};

    const next = Object.assign({}, config);

    if (options.maxPayloadBytes !== undefined) {
      const value = Number(options.maxPayloadBytes);

      if (
        !Number.isFinite(value) ||
        value < 1024
      ) {
        return {
          success: false,
          error: "maxPayloadBytes must be at least 1024."
        };
      }

      next.maxPayloadBytes = Math.floor(value);
    }

    if (options.maxSessionIdLength !== undefined) {
      const value = Number(options.maxSessionIdLength);

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 1024
      ) {
        return {
          success: false,
          error: "Invalid maxSessionIdLength."
        };
      }

      next.maxSessionIdLength = value;
    }

    if (options.maxVersion !== undefined) {
      const value = Number(options.maxVersion);

      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 10000
      ) {
        return {
          success: false,
          error: "Invalid maxVersion."
        };
      }

      next.maxVersion = value;
    }

    config = next;

    return {
      success: true,
      config: Object.assign({}, config)
    };
  }

  function getConfig() {
    return Object.assign({}, config);
  }

  function getStatistics() {
    return {
      validationCount: validationCount,
      maxPayloadBytes: config.maxPayloadBytes,
      maxSessionIdLength: config.maxSessionIdLength,
      maxVersion: config.maxVersion
    };
  }

  function resetStatistics() {
    validationCount = 0;
    return true;
  }

  SX.vehicleRaceSessionSyncValidator = {
    validatePayload: validatePayload,

    configure: configure,

    getConfig: getConfig,

    getStatistics: getStatistics,

    resetStatistics: resetStatistics
  };

  console.info(
    "SUPERX: Race Session Sync Payload Validator initialized."
  );

})(window);

/* ================= END FILE 134 ================= */
