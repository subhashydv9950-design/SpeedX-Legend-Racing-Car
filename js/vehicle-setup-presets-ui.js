
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 142: js/vehicle-setup-presets-ui.js

   START — FILE 142
   Vehicle Setup Presets UI
   ========================================================= */

(function (window, document) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    container: null,
    adapter: null,
    busy: false,
    selectedId: null
  };

  function getAPI() {
    const api = SX.vehicleSetupPresets;

    if (!api) {
      throw new Error("FILE 141 Preset Manager लोड नहीं है।");
    }

    return api;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;

    return node;
  }

  function button(text, className, callback) {
    const node = element("button", className, text);

    node.type = "button";
    node.addEventListener("click", callback);

    return node;
  }

  function getCurrentCarId() {
    if (typeof state.adapter.getCarId !== "function") {
      return null;
    }

    return state.adapter.getCarId();
  }

  function setStatus(message, type) {
    const status = state.container &&
      state.container.querySelector("[data-sx-preset-status]");

    if (!status) return;

    status.textContent = message;
    status.dataset.type = type || "info";
  }

  function setBusy(value) {
    state.busy = Boolean(value);

    if (!state.container) return;

    state.container
      .querySelectorAll("button, input")
      .forEach(function (node) {
        node.disabled = state.busy;
      });
  }

  function addStyles() {
    if (document.getElementById("sx-preset-ui-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "sx-preset-ui-styles";

    style.textContent = `
      .sx-preset-ui {
        width: 100%;
        max-width: 850px;
        margin: 0 auto;
        padding: 16px;
        box-sizing: border-box;
        color: #f7f2ff;
        background: #12101a;
        border: 1px solid #38294d;
        border-radius: 16px;
        font-family: Arial, sans-serif;
      }

      .sx-preset-ui * {
        box-sizing: border-box;
      }

      .sx-preset-ui h2 {
        margin: 0 0 7px;
        font-size: 20px;
      }

      .sx-preset-ui h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }

      .sx-preset-ui .sx-preset-muted {
        color: #aaa0ba;
        font-size: 12px;
        line-height: 1.5;
      }

      .sx-preset-ui .sx-preset-save {
        margin-top: 16px;
        padding: 14px;
        background: #1b1725;
        border: 1px solid #38294d;
        border-radius: 12px;
      }

      .sx-preset-ui input {
        display: block;
        width: 100%;
        min-height: 44px;
        margin: 10px 0;
        padding: 11px;
        border: 1px solid #514064;
        border-radius: 9px;
        background: #100e17;
        color: white;
        font-size: 14px;
      }

      .sx-preset-ui button {
        min-height: 42px;
        padding: 10px 13px;
        border: 0;
        border-radius: 9px;
        background: #7739d2;
        color: white;
        font-weight: 700;
        cursor: pointer;
      }

      .sx-preset-ui button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .sx-preset-ui .sx-preset-save-btn {
        width: 100%;
      }

      .sx-preset-ui .sx-preset-list {
        display: grid;
        grid-template-columns: repeat(
          auto-fit,
          minmax(min(100%, 230px), 1fr)
        );
        gap: 12px;
        margin-top: 14px;
      }

      .sx-preset-ui .sx-preset-card {
        min-width: 0;
        padding: 13px;
        border: 1px solid #392b4c;
        border-radius: 12px;
        background: #1b1725;
      }

      .sx-preset-ui .sx-preset-card.selected {
        border-color: #a16aff;
        background: #241a35;
      }

      .sx-preset-ui .sx-preset-name {
        margin: 0 0 6px;
        font-size: 15px;
        overflow-wrap: anywhere;
      }

      .sx-preset-ui .sx-preset-meta {
        margin: 0 0 12px;
        color: #aaa0ba;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      .sx-preset-ui .sx-preset-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .sx-preset-ui .sx-preset-actions button {
        min-width: 0;
        font-size: 12px;
      }

      .sx-preset-ui .sx-preset-delete {
        background: #633044;
      }

      .sx-preset-ui .sx-preset-status {
        margin-top: 14px;
        padding: 10px;
        border-radius: 9px;
        background: #211b2d;
        color: #d8c9ec;
        font-size: 12px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .sx-preset-ui .sx-preset-status[data-type="error"] {
        color: #ffaaaa;
      }

      .sx-preset-ui .sx-preset-status[data-type="success"] {
        color: #a9edc1;
      }

      @media (max-width: 420px) {
        .sx-preset-ui {
          padding: 12px;
        }

        .sx-preset-ui .sx-preset-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function renderList() {
    const list = state.container.querySelector(
      "[data-sx-preset-list]"
    );

    list.replaceChildren();

    const presets = getAPI().getAll({
      carId: getCurrentCarId()
    });

    if (!presets.length) {
      list.appendChild(
        element(
          "p",
          "sx-preset-muted",
          "इस कार के लिए अभी कोई Preset सेव नहीं है।"
        )
      );

      return;
    }

    presets.forEach(function (preset) {
      const card = element("article", "sx-preset-card");

      if (state.selectedId === preset.id) {
        card.classList.add("selected");
      }

      const name = element(
        "h4",
        "sx-preset-name",
        preset.name
      );

      const date = element(
        "p",
        "sx-preset-meta",
        "Updated: " +
          (preset.updatedAt
            ? new Date(preset.updatedAt).toLocaleDateString()
            : "Unknown")
      );

      const actions = element(
        "div",
        "sx-preset-actions"
      );

      const applyButton = button(
        "Apply",
        "",
        function () {
          applyPreset(preset.id);
        }
      );

      const deleteButton = button(
        "Delete",
        "sx-preset-delete",
        function () {
          deletePreset(preset.id);
        }
      );

      actions.append(applyButton, deleteButton);
      card.append(name, date, actions);
      list.appendChild(card);
    });
  }

  async function saveCurrentPreset() {
    if (state.busy) return;

    try {
      const nameInput = state.container.querySelector(
        "[data-sx-preset-name]"
      );

      const name = nameInput.value.trim();

      if (!name) {
        throw new Error("पहले Preset का नाम लिखें।");
      }

      if (typeof state.adapter.getSetup !== "function") {
        throw new Error("Current Vehicle Setup Adapter उपलब्ध नहीं है।");
      }

      setBusy(true);

      const setup = await state.adapter.getSetup();

      const preset = getAPI().save(
        name,
        setup,
        getCurrentCarId()
      );

      nameInput.value = "";
      state.selectedId = preset.id;

      renderList();

      setStatus(
        "Preset सफलतापूर्वक सेव हो गया: " + preset.name,
        "success"
      );

    } catch (error) {
      setStatus(
        error.message || "Preset सेव नहीं हो पाया।",
        "error"
      );

    } finally {
      setBusy(false);
    }
  }

  async function applyPreset(id) {
    if (state.busy) return;

    if (typeof state.adapter.applySetup !== "function") {
      setStatus(
        "Garage का applySetup Adapter उपलब्ध नहीं है।",
        "error"
      );
      return;
    }

    setBusy(true);

    try {
      const result = await getAPI().apply(id, {
        apply: state.adapter.applySetup
      });

      state.selectedId = id;

      renderList();

      setStatus(
        "Preset लागू हो गया: " + result.presetName,
        "success"
      );

    } catch (error) {
      setStatus(
        error.message || "Preset लागू नहीं हो पाया।",
        "error"
      );

    } finally {
      setBusy(false);
    }
  }

  function deletePreset(id) {
    if (state.busy) return;

    const preset = getAPI().get(id);

    if (!preset) {
      setStatus("Preset नहीं मिला।", "error");
      return;
    }

    const confirmed = window.confirm(
      '"' + preset.name + '" Preset Delete करना चाहते हैं?"
    );

    if (!confirmed) return;

    try {
      getAPI().delete(id);

      if (state.selectedId === id) {
        state.selectedId = null;
      }

      renderList();
      setStatus("Preset Delete हो गया।", "success");

    } catch (error) {
      setStatus(
        error.message || "Preset Delete नहीं हो पाया।",
        "error"
      );
    }
  }

  function render(container, adapter) {
    if (!container || !container.appendChild) {
      throw new Error("एक वैध HTML Container आवश्यक है।");
    }

    if (!adapter || typeof adapter !== "object") {
      throw new Error("Garage Adapter आवश्यक है।");
    }

    if (typeof adapter.getSetup !== "function") {
      throw new Error("Adapter में getSetup Function आवश्यक है।");
    }

    if (typeof adapter.applySetup !== "function") {
      throw new Error("Adapter में applySetup Function आवश्यक है।");
    }

    getAPI().init();
    addStyles();

    state.container = container;
    state.adapter = adapter;
    state.selectedId = null;

    const panel = element("section", "sx-preset-ui");

    panel.appendChild(
      element("h2", "", "Vehicle Setup Presets")
    );

    panel.appendChild(
      element(
        "p",
        "sx-preset-muted",
        "अपनी कार की Tuning Settings सेव करें और जरूरत के अनुसार लागू करें।"
      )
    );

    const saveSection = element(
      "div",
      "sx-preset-save"
    );

    saveSection.appendChild(
      element("h3", "", "Save Current Setup")
    );

    const input = element("input");

    input.type = "text";
    input.maxLength = 32;
    input.placeholder = "Preset Name (जैसे Street Setup)";
    input.dataset.sxPresetName = "true";

    const saveButton = button(
      "Save Vehicle Setup",
      "sx-preset-save-btn",
      saveCurrentPreset
    );

    saveSection.append(input, saveButton);

    const listHeading = element(
      "h3",
      "",
      "Saved Presets"
    );

    listHeading.style.marginTop = "20px";

    const list = element(
      "div",
      "sx-preset-list"
    );

    list.dataset.sxPresetList = "true";

    const status = element(
      "div",
      "sx-preset-status",
      "Garage Presets तैयार हैं।"
    );

    status.dataset.sxPresetStatus = "true";
    status.dataset.type = "info";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    panel.append(
      saveSection,
      listHeading,
      list,
      status
    );

    container.replaceChildren(panel);

    renderList();

    return {
      element: panel,
      refresh: renderList,
      destroy: destroy
    };
  }

  function destroy() {
    if (!state.container) return false;

    state.container.replaceChildren();

    state.container = null;
    state.adapter = null;
    state.selectedId = null;
    state.busy = false;

    return true;
  }

  SX.vehicleSetupPresetsUI = {
    render: render,
    refresh: renderList,
    destroy: destroy
  };

})(window, document);

/* =========================================================
   END — FILE 142
   ========================================================= */
  
