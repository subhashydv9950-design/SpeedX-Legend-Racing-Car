
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 140: js/vehicle-race-session-sync-workflow.js

   START — FILE 140
   Session Import Workflow Coordinator
   ========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    mounted: false,
    busy: false,
    container: null,
    adapters: null,
    panel: null,
    elements: null
  };

  function requireFunction(object, name, label) {
    if (!object || typeof object[name] !== "function") {
      throw new Error(
        label + " का " + name + " Function उपलब्ध नहीं है।"
      );
    }
  }

  function validateAdapters(adapters) {
    [
      "getSession",
      "exportSession",
      "previewImport",
      "getValidatedSession",
      "createBackup",
      "applySession"
    ].forEach(function (name) {
      requireFunction(adapters, name, "Workflow Adapter");
    });
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function setStatus(message, type) {
    if (!state.elements || !state.elements.status) return;

    state.elements.status.textContent = message;
    state.elements.status.dataset.type = type || "info";
  }

  function setBusy(value) {
    state.busy = Boolean(value);

    if (!state.elements) return;

    state.elements.confirm.disabled = state.busy;
    state.elements.apply.disabled = state.busy;

    if (state.busy) {
      state.elements.apply.textContent = "Processing...";
    } else {
      state.elements.apply.textContent = "Apply Imported Session";
    }
  }

  function getLatestPreview() {
    const importer = SX.vehicleRaceSessionSyncImport;

    if (
      !importer ||
      typeof importer.getLastPreview !== "function"
    ) {
      throw new Error(
        "FILE 136 का getLastPreview API उपलब्ध नहीं है।"
      );
    }

    return importer.getLastPreview();
  }

  function addStyles() {
    if (document.getElementById("sx-sync-workflow-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "sx-sync-workflow-styles";

    style.textContent = `
      .sx-sync-workflow {
        width: 100%;
        margin: 16px auto 0;
        padding: 16px;
        box-sizing: border-box;
        border: 1px solid #49345f;
        border-radius: 14px;
        background: #171321;
        color: #f4edff;
        font-family: Arial, sans-serif;
      }

      .sx-sync-workflow * {
        box-sizing: border-box;
      }

      .sx-sync-workflow h3 {
        margin: 0 0 8px;
        font-size: 16px;
      }

      .sx-sync-workflow p {
        color: #bcb0ce;
        font-size: 13px;
        line-height: 1.5;
      }

      .sx-sync-workflow label {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 14px 0;
        font-size: 13px;
        line-height: 1.5;
      }

      .sx-sync-workflow input {
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        margin: 1px 0 0;
        accent-color: #a66aff;
      }

      .sx-sync-workflow button {
        display: block;
        width: 100%;
        min-height: 46px;
        padding: 12px;
        border: 0;
        border-radius: 10px;
        background: #843fe0;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .sx-sync-workflow button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .sx-sync-workflow-status {
        margin-top: 12px;
        padding: 10px;
        border-radius: 8px;
        background: #251d32;
        color: #d9c9ef;
        font-size: 12px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .sx-sync-workflow-status[data-type="error"] {
        color: #ffaaaa;
      }

      .sx-sync-workflow-status[data-type="success"] {
        color: #a8f0c2;
      }
    `;

    document.head.appendChild(style);
  }

  function renderApplySection(container) {
    const section = createElement(
      "section",
      "sx-sync-workflow"
    );

    section.setAttribute(
      "aria-label",
      "Session Import Apply"
    );

    section.appendChild(
      createElement("h3", "", "Apply Imported Session")
    );

    section.appendChild(
      createElement(
        "p",
        "",
        "Preview की जाँच करने के बाद ही Session लागू करें। Apply करने से पहले Backup बनाया जाएगा।"
      )
    );

    const label = createElement("label");

    const checkbox = createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = false;

    const labelText = createElement(
      "span",
      "",
      "मैं समझता हूँ कि Import करने से गेम की मौजूदा Session जानकारी बदल सकती है। मैंने Preview जाँच लिया है और Backup बनाने की अनुमति देता हूँ।"
    );

    label.append(checkbox, labelText);

    const applyButton = createElement(
      "button",
      "",
      "Apply Imported Session"
    );

    applyButton.type = "button";
    applyButton.disabled = true;

    const status = createElement(
      "div",
      "sx-sync-workflow-status",
      "पहले JSON फ़ाइल का Preview तैयार करें।"
    );

    status.dataset.type = "info";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    checkbox.addEventListener("change", function () {
      applyButton.disabled =
        state.busy || !checkbox.checked;
    });

    applyButton.addEventListener("click", applyLatestPreview);

    section.append(label, applyButton, status);
    container.appendChild(section);

    state.elements = {
      section: section,
      confirm: checkbox,
      apply: applyButton,
      status: status
    };
  }

  async function applyLatestPreview() {
    if (state.busy) return;

    if (!state.elements.confirm.checked) {
      setStatus(
        "पहले Confirmation Checkbox चुनें।",
        "error"
      );
      return;
    }

    const applyManager = SX.vehicleRaceSessionSyncApply;

    if (!applyManager || typeof applyManager.apply !== "function") {
      setStatus(
        "FILE 139 का Apply Manager उपलब्ध नहीं है।",
        "error"
      );
      return;
    }

    setBusy(true);
    setStatus("Preview और Backup की जाँच हो रही है...", "info");

    try {
      const preview = getLatestPreview();

      if (!preview || preview.valid !== true) {
        throw new Error(
          "कोई वैध Import Preview नहीं मिला। पहले Preview चलाएँ।"
        );
      }

      const result = await applyManager.apply(preview, {
        confirmed: true,

        getValidatedSession:
          state.adapters.getValidatedSession,

        createBackup:
          state.adapters.createBackup,

        applySession:
          state.adapters.applySession
      });

      setStatus(
        result.message || "Session Apply पूरा हुआ।",
        "success"
      );

      state.elements.confirm.checked = false;

    } catch (error) {
      setStatus(
        error && error.message
          ? error.message
          : "Session Apply नहीं हो सका।",
        "error"
      );

    } finally {
      setBusy(false);

      state.elements.apply.disabled =
        !state.elements.confirm.checked;
    }
  }

  function mount(container, adapters) {
    if (state.mounted) {
      unmount();
    }

    if (!container || !container.appendChild) {
      throw new Error("एक वैध HTML Container आवश्यक है।");
    }

    validateAdapters(adapters);

    const integration = SX.vehicleRaceSessionSyncIntegration;

    if (!integration || typeof integration.mount !== "function") {
      throw new Error("FILE 138 Integration API उपलब्ध नहीं है।");
    }

    addStyles();

    const panel = integration.mount(container, {
      getSession: adapters.getSession,
      exportSession: adapters.exportSession,
      previewImport: adapters.previewImport
    });

    state.container = container;
    state.adapters = adapters;
    state.panel = panel;
    state.mounted = true;

    renderApplySection(container);

    return {
      mounted: true,
      unmount: unmount,
      apply: applyLatestPreview
    };
  }

  function unmount() {
    if (!state.mounted) return false;

    if (state.elements && state.elements.section) {
      state.elements.section.remove();
    }

    if (
      SX.vehicleRaceSessionSyncIntegration &&
      typeof SX.vehicleRaceSessionSyncIntegration.unmount === "function"
    ) {
      SX.vehicleRaceSessionSyncIntegration.unmount();
    }

    state.container = null;
    state.adapters = null;
    state.panel = null;
    state.elements = null;
    state.mounted = false;
    state.busy = false;

    return true;
  }

  function getState() {
    return {
      mounted: state.mounted,
      busy: state.busy,
      hasContainer: Boolean(state.container),
      hasAdapters: Boolean(state.adapters)
    };
  }

  SX.vehicleRaceSessionSyncWorkflow = {
    mount: mount,
    unmount: unmount,
    apply: applyLatestPreview,
    getState: getState
  };

})(window, document);

/* =========================================================
   END — FILE 140
   ========================================================= */
