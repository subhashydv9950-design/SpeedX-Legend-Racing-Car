
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 137: js/vehicle-race-session-sync-panel.js

   START — FILE 137
   Race Session Import / Export Panel
   ========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const CONFIG = {
    maxFileSize: 2 * 1024 * 1024,
    allowedType: "application/json",
    panelClass: "sx-session-sync-panel"
  };

  const state = {
    container: null,
    options: {},
    selectedFile: null,
    preview: null,
    busy: false,
    initialized: false
  };

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function createButton(label, className, action) {
    const button = createElement(
      "button",
      className || "sx-sync-button",
      label
    );

    button.type = "button";
    button.addEventListener("click", action);

    return button;
  }

  function setStatus(message, type) {
    const status = state.container &&
      state.container.querySelector("[data-sx-sync-status]");

    if (!status) return;

    status.textContent = message;
    status.dataset.statusType = type || "info";
  }

  function setBusy(value) {
    state.busy = Boolean(value);

    if (!state.container) return;

    state.container
      .querySelectorAll("button, input")
      .forEach(function (control) {
        control.disabled = state.busy;
      });

    const exportButton = state.container.querySelector(
      "[data-sx-export]"
    );

    const previewButton = state.container.querySelector(
      "[data-sx-preview]"
    );

    if (exportButton) {
      exportButton.disabled = state.busy;
    }

    if (previewButton) {
      previewButton.disabled =
        state.busy || !state.selectedFile;
    }
  }

  function safeJsonText(value) {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value, null, 2);
  }

  function validateExportResult(result) {
    const json = safeJsonText(result);

    if (!json || typeof json !== "string") {
      throw new Error("Export से JSON डेटा नहीं मिला।");
    }

    if (json.length > CONFIG.maxFileSize) {
      throw new Error("Export फ़ाइल 2 MB से बड़ी है।");
    }

    const parsed = JSON.parse(json);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("Export JSON का Format सही नहीं है।");
    }

    return json;
  }

  function downloadJson(json) {
    const blob = new Blob(
      [json],
      { type: CONFIG.allowedType }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

    link.href = url;
    link.download = "superx-race-session-" +
      timestamp + ".json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function renderPreview(preview) {
    const area = state.container.querySelector(
      "[data-sx-preview-result]"
    );

    if (!area) return;

    area.replaceChildren();

    if (!preview || typeof preview !== "object") {
      area.appendChild(
        createElement("p", "sx-sync-muted",
          "Preview उपलब्ध नहीं है।")
      );
      return;
    }

    const heading = createElement(
      "h4",
      "sx-sync-preview-heading",
      "Import Preview"
    );

    area.appendChild(heading);

    const details = [
      ["स्थिति", preview.valid === false
        ? "Invalid"
        : "Preview तैयार"],
      ["मैसेज", preview.message || "Preview जाँच पूरी हुई"],
      ["चेतावनी", preview.warning || "कोई अतिरिक्त चेतावनी नहीं"]
    ];

    details.forEach(function (item) {
      const row = createElement("div", "sx-sync-preview-row");

      row.appendChild(
        createElement("span", "sx-sync-preview-label", item[0])
      );

      row.appendChild(
        createElement("span", "sx-sync-preview-value",
          String(item[1]))
      );

      area.appendChild(row);
    });

    const summary = preview.summary;

    if (summary && typeof summary === "object") {
      Object.keys(summary).slice(0, 12).forEach(function (key) {
        const row = createElement("div", "sx-sync-preview-row");

        row.appendChild(
          createElement("span", "sx-sync-preview-label", key)
        );

        row.appendChild(
          createElement("span", "sx-sync-preview-value",
            String(summary[key]))
        );

        area.appendChild(row);
      });
    }

    const note = createElement(
      "p",
      "sx-sync-safety-note",
      "यह केवल Preview है। आपकी मौजूदा गेम Progress में कोई बदलाव नहीं किया गया है।"
    );

    area.appendChild(note);
  }

  async function exportCurrentSession() {
    if (state.busy) return;

    const exporter = state.options.exportSession;
    const getSession = state.options.getSession;

    if (typeof exporter !== "function") {
      setStatus(
        "Export API उपलब्ध नहीं है। Panel को exportSession विकल्प के साथ initialize करें।",
        "error"
      );
      return;
    }

    if (typeof getSession !== "function") {
      setStatus(
        "Current session लेने के लिए getSession विकल्प आवश्यक है।",
        "error"
      );
      return;
    }

    setBusy(true);

    try {
      const session = await getSession();

      if (!session || typeof session !== "object") {
        throw new Error("कोई वैध Race Session उपलब्ध नहीं है।");
      }

      const result = await exporter(session);
      const json = validateExportResult(result);

      downloadJson(json);

      setStatus(
        "Session JSON फ़ाइल Export हो गई।",
        "success"
      );
    } catch (error) {
      setStatus(
        error && error.message
          ? error.message
          : "Export पूरा नहीं हो सका।",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFileSelection(event) {
    const file = event.target.files &&
      event.target.files[0];

    state.selectedFile = null;
    state.preview = null;

    const previewArea = state.container.querySelector(
      "[data-sx-preview-result]"
    );

    previewArea.replaceChildren();

    const previewButton = state.container.querySelector(
      "[data-sx-preview]"
    );

    if (!file) {
      previewButton.disabled = true;
      setStatus("कोई फ़ाइल नहीं चुनी गई।", "info");
      return;
    }

    if (
      file.type &&
      file.type !== CONFIG.allowedType &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      event.target.value = "";
      previewButton.disabled = true;
      setStatus("कृपया JSON फ़ाइल चुनें।", "error");
      return;
    }

    if (file.size > CONFIG.maxFileSize) {
      event.target.value = "";
      previewButton.disabled = true;
      setStatus("फ़ाइल 2 MB से बड़ी है।", "error");
      return;
    }

    state.selectedFile = file;
    previewButton.disabled = false;

    setStatus(
      "फ़ाइल चुनी गई: " + file.name,
      "success"
    );
  }

  async function previewSelectedFile() {
    if (state.busy || !state.selectedFile) return;

    const previewer = state.options.previewImport;

    if (typeof previewer !== "function") {
      setStatus(
        "Import Preview API उपलब्ध नहीं है। Panel को previewImport विकल्प के साथ initialize करें।",
        "error"
      );
      return;
    }

    setBusy(true);

    try {
      const file = state.selectedFile;
      const jsonText = await file.text();

      if (jsonText.length > CONFIG.maxFileSize) {
        throw new Error("JSON डेटा 2 MB से बड़ा है।");
      }

      const result = await previewer(jsonText);

      if (!result || typeof result !== "object") {
        throw new Error("Import Preview का परिणाम सही नहीं है।");
      }

      state.preview = result;
      renderPreview(result);

      if (result.valid === false) {
        setStatus(
          result.message || "Import डेटा मान्य नहीं है।",
          "error"
        );
      } else {
        setStatus(
          "Preview तैयार है। अभी कोई डेटा Import नहीं हुआ।",
          "success"
        );
      }
    } catch (error) {
      state.preview = null;
      renderPreview(null);

      setStatus(
        error && error.message
          ? error.message
          : "फ़ाइल Preview नहीं हो सकी।",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  function clearPanel() {
    state.selectedFile = null;
    state.preview = null;

    if (!state.container) return;

    const input = state.container.querySelector(
      "[data-sx-file]"
    );

    if (input) input.value = "";

    const preview = state.container.querySelector(
      "[data-sx-preview-result]"
    );

    if (preview) preview.replaceChildren();

    const previewButton = state.container.querySelector(
      "[data-sx-preview]"
    );

    if (previewButton) previewButton.disabled = true;

    setStatus("Panel साफ़ कर दिया गया।", "info");
  }

  function addStyles() {
    if (document.getElementById("sx-session-sync-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sx-session-sync-styles";

    style.textContent = `
      .${CONFIG.panelClass} {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        padding: 18px;
        box-sizing: border-box;
        color: #f5f3ff;
        background: #11101a;
        border: 1px solid #302744;
        border-radius: 18px;
        font-family: Arial, sans-serif;
      }

      .${CONFIG.panelClass} * {
        box-sizing: border-box;
      }

      .${CONFIG.panelClass} .sx-sync-title {
        margin: 0 0 7px;
        font-size: 20px;
      }

      .${CONFIG.panelClass} .sx-sync-muted {
        color: #aaa2bb;
        font-size: 13px;
        line-height: 1.5;
      }

      .${CONFIG.panelClass} .sx-sync-section {
        margin-top: 18px;
        padding: 15px;
        background: #191625;
        border: 1px solid #302744;
        border-radius: 14px;
      }

      .${CONFIG.panelClass} .sx-sync-section h3 {
        margin: 0 0 9px;
        font-size: 16px;
      }

      .${CONFIG.panelClass} .sx-sync-button {
        width: 100%;
        min-height: 44px;
        padding: 11px 14px;
        border: 0;
        border-radius: 10px;
        background: #7938d8;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      .${CONFIG.panelClass} .sx-sync-button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .${CONFIG.panelClass} .sx-sync-file {
        display: block;
        width: 100%;
        min-height: 44px;
        margin: 12px 0;
        padding: 9px;
        border: 1px dashed #725a91;
        border-radius: 10px;
        color: #eee7ff;
        background: #100e18;
      }

      .${CONFIG.panelClass} .sx-sync-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .${CONFIG.panelClass} .sx-sync-actions button {
        min-width: 0;
      }

      .${CONFIG.panelClass} .sx-sync-status {
        margin-top: 15px;
        padding: 11px;
        border-radius: 9px;
        background: #211c30;
        color: #d9ceef;
        font-size: 13px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .${CONFIG.panelClass} .sx-sync-status[data-status-type="error"] {
        color: #ffaaaa;
      }

      .${CONFIG.panelClass} .sx-sync-status[data-status-type="success"] {
        color: #a8f0c2;
      }

      .${CONFIG.panelClass} .sx-sync-preview-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid #302744;
        font-size: 13px;
      }

      .${CONFIG.panelClass} .sx-sync-preview-label {
        color: #aaa2bb;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .${CONFIG.panelClass} .sx-sync-preview-value {
        color: #fff;
        text-align: right;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .${CONFIG.panelClass} .sx-sync-safety-note {
        margin: 13px 0 0;
        padding: 10px;
        border-radius: 9px;
        background: #272035;
        color: #d5c9eb;
        font-size: 12px;
        line-height: 1.5;
      }

      @media (max-width: 420px) {
        .${CONFIG.panelClass} {
          padding: 12px;
          border-radius: 13px;
        }

        .${CONFIG.panelClass} .sx-sync-section {
          padding: 12px;
        }

        .${CONFIG.panelClass} .sx-sync-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function render(container, options) {
    if (!container || !container.appendChild) {
      throw new Error("एक वैध Panel Container आवश्यक है।");
    }

    state.container = container;
    state.options = options || {};
    state.selectedFile = null;
    state.preview = null;
    state.initialized = true;

    addStyles();

    const panel = createElement(
      "section",
      CONFIG.panelClass
    );

    panel.setAttribute(
      "aria-label",
      "Race Session Import Export"
    );

    const title = createElement(
      "h2",
      "sx-sync-title",
      "Race Session Backup"
    );

    const intro = createElement(
      "p",
      "sx-sync-muted",
      "अपनी Race Session JSON फ़ाइल Export करें या पहले से मौजूद JSON फ़ाइल का सुरक्षित Preview देखें।"
    );

    panel.append(title, intro);

    const exportSection = createElement(
      "div",
      "sx-sync-section"
    );

    exportSection.appendChild(
      createElement("h3", "", "Export Session")
    );

    exportSection.appendChild(
      createElement(
        "p",
        "sx-sync-muted",
        "वर्तमान Session को JSON फ़ाइल के रूप में सेव करें।"
      )
    );

    const exportButton = createButton(
      "Download Session JSON",
      "sx-sync-button",
      exportCurrentSession
    );

    exportButton.dataset.sxExport = "true";
    exportSection.appendChild(exportButton);

    const importSection = createElement(
      "div",
      "sx-sync-section"
    );

    importSection.appendChild(
      createElement("h3", "", "Import Preview")
    );

    importSection.appendChild(
      createElement(
        "p",
        "sx-sync-muted",
        "JSON फ़ाइल चुनें। सिस्टम डेटा की जाँच करके Preview दिखाएगा।"
      )
    );

    const fileInput = createElement(
      "input",
      "sx-sync-file"
    );

    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.dataset.sxFile = "true";
    fileInput.addEventListener("change", handleFileSelection);

    importSection.appendChild(fileInput);

    const actions = createElement(
      "div",
      "sx-sync-actions"
    );

    const previewButton = createButton(
      "Check Import Preview",
      "sx-sync-button",
      previewSelectedFile
    );

    previewButton.dataset.sxPreview = "true";
    previewButton.disabled = true;

    const clearButton = createButton(
      "Clear",
      "sx-sync-button",
      clearPanel
    );

    actions.append(previewButton, clearButton);
    importSection.appendChild(actions);

    const previewArea = createElement(
      "div",
      "sx-sync-preview-result"
    );

    previewArea.dataset.sxPreviewResult = "true";
    importSection.appendChild(previewArea);

    panel.appendChild(exportSection);
    panel.appendChild(importSection);

    const status = createElement(
      "div",
      "sx-sync-status",
      "तैयार।"
    );

    status.dataset.sxSyncStatus = "true";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    panel.appendChild(status);

    container.replaceChildren(panel);

    return {
      element: panel,
      clear: clearPanel,
      exportSession: exportCurrentSession,
      previewFile: previewSelectedFile
    };
  }

  function getState() {
    return {
      initialized: state.initialized,
      busy: state.busy,
      hasSelectedFile: Boolean(state.selectedFile),
      hasPreview: Boolean(state.preview)
    };
  }

  SX.vehicleRaceSessionSyncPanel = {
    render: render,
    clear: clearPanel,
    getState: getState
  };

})(window, document);

/* =========================================================
   END — FILE 137
   ========================================================= */
 
