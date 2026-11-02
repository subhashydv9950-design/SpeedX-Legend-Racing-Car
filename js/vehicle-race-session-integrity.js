
/* =========================================================
   SUPERX LEGEND — FILE 123
   FILE: js/vehicle-race-session-integrity.js

   PURPOSE:
   - Validate race session data.
   - Detect missing and invalid values.
   - Check report structure.
   - Normalize imported session data.
   - Generate integrity summaries.

   DEPENDENCIES: None
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const LIMITS = {
    maxLapTimes: 100,
    maxSessionIdLength: 120,
    maxNameLength: 100,
    maxModeLength: 50,
    maxMapLength: 100,
    maxCarLength: 100
  };

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function number(value) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : null;
  }

  function safeText(value, maxLength) {
    if (typeof value !== "string") return "";

    return value
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, maxLength || 100);
  }

  function addIssue(list, code, message, severity) {
    list.push({
      code: code,
      message: message,
      severity: severity || "warning"
    });
  }

  function validateSession(session) {
    const errors = [];
    const warnings = [];

    if (!isObject(session)) {
      return {
        valid: false,
        score: 0,
        errors: [{
          code: "INVALID_SESSION",
          message: "Session must be an object.",
          severity: "error"
        }],
        warnings: []
      };
    }

    if (!session.id && !session.sessionId) {
      addIssue(
        errors,
        "MISSING_SESSION_ID",
        "Session ID is missing.",
        "error"
      );
    }

    if (!session.startedAt && !session.createdAt) {
      addIssue(
        warnings,
        "MISSING_START_TIME",
        "Session start time is missing."
      );
    }

    if (
      session.finishedAt &&
      session.startedAt &&
      Number(session.finishedAt) < Number(session.startedAt)
    ) {
      addIssue(
        errors,
        "INVALID_TIME_RANGE",
        "Session finish time is earlier than its start time.",
        "error"
      );
    }

    if (
      session.distanceKm !== undefined &&
      (
        number(session.distanceKm) === null ||
        Number(session.distanceKm) < 0
      )
    ) {
      addIssue(
        errors,
        "INVALID_DISTANCE",
        "Distance must be a non-negative number.",
        "error"
      );
    }

    if (
      session.coinsEarned !== undefined &&
      (
        number(session.coinsEarned) === null ||
        Number(session.coinsEarned) < 0
      )
    ) {
      addIssue(
        errors,
        "INVALID_COINS",
        "Earned coins value is invalid.",
        "error"
      );
    }

    if (
      session.xpEarned !== undefined &&
      (
        number(session.xpEarned) === null ||
        Number(session.xpEarned) < 0
      )
    ) {
      addIssue(
        errors,
        "INVALID_XP",
        "Earned XP value is invalid.",
        "error"
      );
    }

    if (
      session.lapTimes !== undefined &&
      !Array.isArray(session.lapTimes)
    ) {
      addIssue(
        errors,
        "INVALID_LAP_TIMES",
        "Lap times must be an array.",
        "error"
      );
    }

    if (Array.isArray(session.lapTimes)) {
      if (session.lapTimes.length > LIMITS.maxLapTimes) {
        addIssue(
          warnings,
          "TOO_MANY_LAPS",
          "Lap history exceeds the recommended limit."
        );
      }

      session.lapTimes.forEach(function (lap, index) {
        if (number(lap) === null || Number(lap) <= 0) {
          addIssue(
            warnings,
            "INVALID_LAP_" + index,
            "Lap " + (index + 1) + " has an invalid time."
          );
        }
      });
    }

    if (
      session.position !== undefined &&
      (
        number(session.position) === null ||
        Number(session.position) < 0
      )
    ) {
      addIssue(
        warnings,
        "INVALID_POSITION",
        "Race position is invalid."
      );
    }

    const totalIssues = errors.length + warnings.length;

    const score = Math.max(
      0,
      Math.round(
        100 * (1 - totalIssues / 10)
      )
    );

    return {
      valid: errors.length === 0,
      score: score,
      errors: errors,
      warnings: warnings,
      checkedAt: Date.now()
    };
  }

  function validateReport(report) {
    const errors = [];
    const warnings = [];

    if (!isObject(report)) {
      return {
        valid: false,
        errors: [{
          code: "INVALID_REPORT",
          message: "Report must be an object.",
          severity: "error"
        }],
        warnings: []
      };
    }

    if (!report.id) {
      addIssue(
        warnings,
        "REPORT_ID_MISSING",
        "Report ID is missing."
      );
    }

    if (!report.generatedAt) {
      addIssue(
        warnings,
        "REPORT_DATE_MISSING",
        "Report generation date is missing."
      );
    }

    if (!isObject(report.sections)) {
      addIssue(
        errors,
        "REPORT_SECTIONS_MISSING",
        "Report sections are missing or invalid.",
        "error"
      );
    }

    if (
      isObject(report.sections) &&
      Object.keys(report.sections).length === 0
    ) {
      addIssue(
        warnings,
        "EMPTY_REPORT",
        "Report contains no sections."
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      checkedAt: Date.now()
    };
  }

  function normalizeSession(session) {
    if (!isObject(session)) {
      return {
        success: false,
        error: "Invalid session data."
      };
    }

    const output = {};

    output.id = safeText(
      session.id || session.sessionId || "",
      LIMITS.maxSessionIdLength
    );

    output.player = safeText(
      session.player || session.playerName || "",
      LIMITS.maxNameLength
    );

    output.mode = safeText(
      session.mode || "",
      LIMITS.maxModeLength
    );

    output.map = safeText(
      session.map || "",
      LIMITS.maxMapLength
    );

    output.car = safeText(
      session.car || "",
      LIMITS.maxCarLength
    );

    output.startedAt = number(
      session.startedAt || session.createdAt
    );

    output.finishedAt = number(session.finishedAt);

    output.distanceKm = Math.max(
      0,
      number(session.distanceKm) || 0
    );

    output.coinsEarned = Math.max(
      0,
      number(session.coinsEarned) || 0
    );

    output.xpEarned = Math.max(
      0,
      number(session.xpEarned) || 0
    );

    output.position = Math.max(
      0,
      number(session.position) || 0
    );

    output.lapTimes = Array.isArray(session.lapTimes)
      ? session.lapTimes
          .map(number)
          .filter(function (value) {
            return value !== null && value > 0;
          })
          .slice(0, LIMITS.maxLapTimes)
      : [];

    output.normalizedAt = Date.now();

    const validation = validateSession(output);

    return {
      success: true,
      data: output,
      validation: validation
    };
  }

  function validateImport(data) {
    if (!isObject(data)) {
      return {
        valid: false,
        type: "unknown",
        errors: [{
          code: "INVALID_IMPORT",
          message: "Imported data must be an object."
        }]
      };
    }

    if (data.sections) {
      const result = validateReport(data);

      return {
        valid: result.valid,
        type: "report",
        errors: result.errors,
        warnings: result.warnings
      };
    }

    const result = validateSession(data);

    return {
      valid: result.valid,
      type: "session",
      errors: result.errors,
      warnings: result.warnings
    };
  }

  function getSummary(validation) {
    if (!isObject(validation)) {
      return {
        valid: false,
        score: 0,
        errorCount: 1,
        warningCount: 0,
        status: "INVALID"
      };
    }

    const errors = Array.isArray(validation.errors)
      ? validation.errors.length
      : 0;

    const warnings = Array.isArray(validation.warnings)
      ? validation.warnings.length
      : 0;

    const valid = validation.valid === true;

    return {
      valid: valid,
      score: number(validation.score) === null
        ? null
        : validation.score,
      errorCount: errors,
      warningCount: warnings,
      status: !valid
        ? "FAILED"
        : warnings > 0
          ? "WARNING"
          : "PASSED"
    };
  }

  function createIntegrityReport(session) {
    const validation = validateSession(session);

    return {
      type: "SUPERX_SESSION_INTEGRITY",
      version: 1,
      generatedAt: Date.now(),
      summary: getSummary(validation),
      validation: validation
    };
  }

  SX.vehicleRaceSessionIntegrity = {
    validateSession: validateSession,
    validateReport: validateReport,
    normalizeSession: normalizeSession,
    validateImport: validateImport,
    getSummary: getSummary,
    createIntegrityReport: createIntegrityReport
  };

  console.log(
    "[SUPERX] Race Session Integrity ready."
  );

})(window);

/* ======================= FILE 123 END ======================= */
      
