
/* =========================================================
   SUPERX LEGEND — FILE 123
   FILE: js/vehicle-race-session-integrity.js

   SESSION DATA INTEGRITY
   - Session and report validation
   - Data normalization
   - Import validation
   - Integrity scoring and reports
   - Safe handling of malformed values

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
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function number(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const result = Number(value);

    return Number.isFinite(result) ? result : null;
  }

  function safeText(value, maxLength) {
    if (typeof value !== "string" && typeof value !== "number") {
      return "";
    }

    return String(value)
      .replace(/[\u0000-\u001F\u007F<>]/g, "")
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

  function getTimestamp(session, primary, fallback) {
    const first = number(session[primary]);

    if (first !== null) return first;

    return fallback ? number(session[fallback]) : null;
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
        warnings: [],
        checkedAt: Date.now()
      };
    }

    const id = session.id || session.sessionId;

    if (
      id === undefined ||
      id === null ||
      String(id).trim() === ""
    ) {
      addIssue(
        errors,
        "MISSING_SESSION_ID",
        "Session ID is missing.",
        "error"
      );
    } else if (String(id).length > LIMITS.maxSessionIdLength) {
      addIssue(
        warnings,
        "LONG_SESSION_ID",
        "Session ID exceeds the recommended length."
      );
    }

    const start = getTimestamp(session, "startedAt", "createdAt");

    const finish = getTimestamp(session, "finishedAt", "endedAt");

    if (start === null) {
      addIssue(
        warnings,
        "MISSING_START_TIME",
        "Session start time is missing."
      );
    }

    if (
      finish !== null &&
      start !== null &&
      finish < start
    ) {
      addIssue(
        errors,
        "INVALID_TIME_RANGE",
        "Session finish time is earlier than its start time.",
        "error"
      );
    }

    const numericFields = [
      {
        keys: ["distanceKm", "totalDistanceKm"],
        code: "INVALID_DISTANCE",
        label: "Distance"
      },
      {
        keys: ["coinsEarned", "totalCoins"],
        code: "INVALID_COINS",
        label: "Earned coins"
      },
      {
        keys: ["xpEarned", "totalXP"],
        code: "INVALID_XP",
        label: "Earned XP"
      },
      {
        keys: ["durationSeconds"],
        code: "INVALID_DURATION",
        label: "Duration"
      },
      {
        keys: ["penalties", "totalPenalties"],
        code: "INVALID_PENALTIES",
        label: "Penalties"
      }
    ];

    numericFields.forEach(function (field) {
      const key = field.keys.find(function (name) {
        return session[name] !== undefined;
      });

      if (!key) return;

      const value = number(session[key]);

      if (value === null || value < 0) {
        addIssue(
          errors,
          field.code,
          field.label + " must be a non-negative number.",
          "error"
        );
      }
    });

    if (
      session.position !== undefined ||
      session.bestPosition !== undefined
    ) {
      const position = number(
        session.position !== undefined
          ? session.position
          : session.bestPosition
      );

      if (position === null || position < 0) {
        addIssue(
          warnings,
          "INVALID_POSITION",
          "Race position is invalid."
        );
      }
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
        const value = number(lap);

        if (value === null || value <= 0) {
          addIssue(
            warnings,
            "INVALID_LAP_" + index,
            "Lap " + (index + 1) + " has an invalid time."
          );
        }
      });
    }

    const totalIssues = errors.length + warnings.length;

    const score = Math.max(
      0,
      Math.round(100 * (1 - totalIssues / 10))
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
        warnings: [],
        checkedAt: Date.now()
      };
    }

    if (
      report.id === undefined ||
      report.id === null ||
      String(report.id).trim() === ""
    ) {
      addIssue(
        warnings,
        "REPORT_ID_MISSING",
        "Report ID is missing."
      );
    }

    if (
      number(report.generatedAt) === null ||
      Number(report.generatedAt) <= 0
    ) {
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
    } else if (Object.keys(report.sections).length === 0) {
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

    output.startedAt = getTimestamp(
      session,
      "startedAt",
      "createdAt"
    );

    output.finishedAt = getTimestamp(
      session,
      "finishedAt",
      "endedAt"
    );

    output.distanceKm = Math.max(
      0,
      number(
        session.distanceKm !== undefined
          ? session.distanceKm
          : session.totalDistanceKm
      ) || 0
    );

    output.coinsEarned = Math.max(
      0,
      number(
        session.coinsEarned !== undefined
          ? session.coinsEarned
          : session.totalCoins
      ) || 0
    );

    output.xpEarned = Math.max(
      0,
      number(
        session.xpEarned !== undefined
          ? session.xpEarned
          : session.totalXP
      ) || 0
    );

    output.position = Math.max(
      0,
      number(
        session.position !== undefined
          ? session.position
          : session.bestPosition
      ) || 0
    );

    output.durationSeconds = Math.max(
      0,
      number(session.durationSeconds) || 0
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
          message: "Imported data must be an object.",
          severity: "error"
        }],
        warnings: []
      };
    }

    if (data.sections !== undefined) {
      const result = validateReport(data);

      return {
        valid: result.valid,
        type: "report",
        errors: result.errors,
        warnings: result.warnings
      };
    }

    if (Array.isArray(data.sessions)) {
      const errors = [];
      const warnings = [];

      data.sessions.forEach(function (session, index) {
        const result = validateSession(session);

        result.errors.forEach(function (issue) {
          errors.push({
            ...issue,
            message: "Session " + (index + 1) + ": " + issue.message
          });
        });

        result.warnings.forEach(function (issue) {
          warnings.push({
            ...issue,
            message: "Session " + (index + 1) + ": " + issue.message
          });
        });
      });

      return {
        valid: errors.length === 0,
        type: "session_collection",
        sessionCount: data.sessions.length,
        errors: errors,
        warnings: warnings
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
      score: number(validation.score),
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
      version: 2,
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

  console.log("[SUPERX] Race Session Integrity ready.");

})(window);

/* ======================= FILE 123 END ======================= */
         
