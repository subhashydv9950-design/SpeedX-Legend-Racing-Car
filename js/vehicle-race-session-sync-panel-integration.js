
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 138: js/vehicle-race-session-sync-panel-integration.js

   START — FILE 138
   Session Sync Panel Integration
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const integration = {
    mounted: false,
    panel: null,
    container: null,
    callbacks: null
  };

  function getPanelAPI() {
    const api = SX.vehicleRaceSessionSyncPanel;

    if (!api || typeof api.render !== "function") {
      throw new Error(
        "FILE 137 का Session Sync Panel लोड नहीं है।"
      );
    }

    return api;
  }

  function validateCallbacks(options) {
    const required = [
      "getSession",
      "exportSession",
      "previewImport"
    ];

    required.forEach(function (name) {
      if (typeof options[name] !== "function") {
        throw new Error(
          "Integration के लिए " + name +
          " Function आवश्यक है।"
        );
      }
    });
  }

  function mount(container, options) {
    if (!container || typeof container.replaceChildren !== "function") {
      throw new Error("एक वैध HTML Container दें।");
    }

    options = options || {};

    validateCallbacks(options);

    const panelAPI = getPanelAPI();

    if (integration.mounted) {
      unmount();
    }

    const panel = panelAPI.render(container, {
      getSession: options.getSession,
      exportSession: options.exportSession,
      previewImport: options.previewImport
    });

    integration.container = container;
    integration.panel = panel;
    integration.callbacks = {
      getSession: options.getSession,
      exportSession: options.exportSession,
      previewImport: options.previewImport
    };

    integration.mounted = true;

    return {
      mounted: true,
      panel: panel,
      unmount: unmount,
      getState: getState
    };
  }

  function unmount() {
    if (!integration.mounted) {
      return false;
    }

    if (
      integration.container &&
      integration.panel &&
      integration.panel.element &&
      integration.panel.element.parentNode === integration.container
    ) {
      integration.container.replaceChildren();
    }

    integration.panel = null;
    integration.container = null;
    integration.callbacks = null;
    integration.mounted = false;

    return true;
  }

  function getState() {
    const panelState =
      integration.mounted &&
      typeof SX.vehicleRaceSessionSyncPanel.getState === "function"
        ? SX.vehicleRaceSessionSyncPanel.getState()
        : null;

    return {
      mounted: integration.mounted,
      hasContainer: Boolean(integration.container),
      hasPanel: Boolean(integration.panel),
      panelState: panelState
    };
  }

  function clearPreview() {
    if (!integration.mounted || !integration.panel) {
      return false;
    }

    if (typeof integration.panel.clear === "function") {
      integration.panel.clear();
      return true;
    }

    return false;
  }

  SX.vehicleRaceSessionSyncIntegration = {
    mount: mount,
    unmount: unmount,
    getState: getState,
    clearPreview: clearPreview
  };

})(window);

/* =========================================================
   END — FILE 138
   ========================================================= */
