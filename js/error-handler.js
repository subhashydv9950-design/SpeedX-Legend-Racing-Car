
/* =========================================================
   SUPERX LEGEND — FILE 46 START
   FILE: js/error-handler.js
   PURPOSE: Central error handling and diagnostics
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MAX_ERRORS = 100;
  const errors = [];

  let initialized = false;

  function createErrorId() {
    return "SX-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function normalizeError(error, context = {}) {
    const source = error instanceof Error
      ? error
      : new Error(String(error || "Unknown error"));

    return {
      id: createErrorId(),
      message: source.message || "Unknown error",
      name: source.name || "Error",
      stack: source.stack || "",
      context: String(context.context || "general"),
      timestamp: new Date().toISOString()
    };
  }

  function record(error, context = {}) {
    const entry = normalizeError(error, context);

    errors.push(entry);

    if (errors.length > MAX_ERRORS) {
      errors.shift();
    }

    console.error(
      "[SUPERX ERROR]",
      entry.id,
      entry.message
    );

    document.dispatchEvent(new CustomEvent(
      "sx:error-recorded",
      {
        detail: {
          id: entry.id,
          message: entry.message,
          context: entry.context
        }
      }
    ));

    return entry;
  }

  function showFriendlyMessage(entry) {
    const message = "Something went wrong. Please try again.";

    if (
      SX.notifications &&
      typeof SX.notifications.error === "function"
    ) {
      SX.notifications.error(
        "Game error",
        message
      );
    }

    return {
      message,
      errorId: entry.id
    };
  }

  function handle(error, context = {}) {
    const entry = record(error, context);

    if (context.silent !== true) {
      showFriendlyMessage(entry);
    }

    return entry;
  }

  function handleWindowError(event) {
    const error = event.error || event.message || "Unknown window error";

    handle(error, {
      context: "window"
    });
  }

  function handlePromiseRejection(event) {
    handle(event.reason || "Unhandled promise rejection", {
      context: "promise"
    });
  }

  function init() {
    if (initialized) return true;

    window.addEventListener("error", handleWindowError);

    window.addEventListener(
      "unhandledrejection",
      handlePromiseRejection
    );

    initialized = true;

    return true;
  }

  function getErrors(limit = 20) {
    const safeLimit = Math.max(
      1,
      Math.min(Number(limit) || 20, MAX_ERRORS)
    );

    return errors.slice(-safeLimit).map(entry => ({
      ...entry
    }));
  }

  function getLatestError() {
    if (!errors.length) return null;

    return {
      ...errors[errors.length - 1]
    };
  }

  function clearErrors() {
    errors.length = 0;
  }

  function getErrorCount() {
    return errors.length;
  }

  function exportLogs() {
    const report = {
      application: "SUPERX LEGEND",
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent || "Unknown",
      errors: getErrors(MAX_ERRORS)
    };

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "SUPERX-error-report.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
  }

  function destroy() {
    if (!initialized) return;

    window.removeEventListener("error", handleWindowError);

    window.removeEventListener(
      "unhandledrejection",
      handlePromiseRejection
    );

    initialized = false;
  }

  SX.errorHandler = {
    init,
    record,
    handle,
    getErrors,
    getLatestError,
    getErrorCount,
    clearErrors,
    exportLogs,
    destroy,
    isInitialized: () => initialized
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 46 END
   FILE: js/error-handler.js
========================================================= */
 
