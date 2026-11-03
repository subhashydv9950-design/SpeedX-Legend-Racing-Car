
/* =========================================================
   SUPERX LEGEND RACING CAR
   FILE 141: js/vehicle-setup-presets.js

   START — FILE 141
   Vehicle Setup Preset Manager
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_setup_presets_v1";
  const MAX_PRESETS = 30;
  const MAX_NAME_LENGTH = 32;

  const state = {
    presets: [],
    initialized: false,
    activePresetId: null
  };

  function createId() {
    return "setup_" +
      Date.now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanName(name) {
    if (typeof name !== "string") {
      throw new Error("Preset का नाम सही नहीं है।");
    }

    const cleaned = name.trim().slice(0, MAX_NAME_LENGTH);

    if (!cleaned) {
      throw new Error("Preset का नाम खाली नहीं हो सकता।");
    }

    return cleaned;
  }

  function validateSetup(setup) {
    if (
      !setup ||
      typeof setup !== "object" ||
      Array.isArray(setup)
    ) {
      throw new Error("Vehicle Setup डेटा सही नहीं है।");
    }

    const json = JSON.stringify(setup);

    if (!json || json.length > 50000) {
      throw new Error("Setup डेटा की सीमा पार हो गई है।");
    }

    /*
      पुराने Upgrade सिस्टम की Settings
      और नए Vehicle Setup सिस्टम की Settings
      दोनों को सुरक्षित रखा गया है।
    */
    const allowedKeys = [
      // Legacy upgrade settings
      "engine",
      "gearbox",
      "brakes",
      "tyres",
      "suspension",
      "steering",
      "turbo",
      "finalDrive",
      "camber",

      // Vehicle Setup settings
      "steeringSensitivity",
      "steeringAssist",
      "brakeBalance",
      "suspensionStiffness",
      "rideHeight",
      "tyreGrip",
      "downforce",
      "tractionControl",
      "abs",
      "stabilityControl"
    ];

    const result = {};

    allowedKeys.forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(setup, key)) {
        return;
      }

      const value = setup[key];

      if (
        typeof value !== "number" &&
        typeof value !== "string" &&
        typeof value !== "boolean"
      ) {
        throw new Error(
          "Setup में अमान्य Value मिली: " + key
        );
      }

      if (
        typeof value === "number" &&
        !Number.isFinite(value)
      ) {
        throw new Error(
          "Setup में अमान्य Number मिली: " + key
        );
      }

      if (
        typeof value === "string" &&
        value.length > 100
      ) {
        throw new Error(
          "Setup की String Value बहुत बड़ी है।"
        );
      }

      result[key] = value;
    });

    if (Object.keys(result).length === 0) {
      throw new Error("Setup में कोई मान्य Setting नहीं मिली।");
    }

    return result;
  }

  function saveToStorage() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.presets)
      );

      return true;
    } catch (error) {
      throw new Error(
        "Preset सेव नहीं हो पाया। Storage उपलब्ध नहीं है।"
      );
    }
  }

  function loadFromStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        state.presets = [];
        state.initialized = true;
        return true;
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error("Preset Storage Format गलत है।");
      }

      state.presets = parsed
        .filter(function (item) {
          return (
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            item.setup &&
            typeof item.setup === "object"
          );
        })
        .slice(0, MAX_PRESETS)
        .map(function (item) {
          return {
            id: item.id,
            name: item.name.slice(0, MAX_NAME_LENGTH),
            carId: item.carId || null,
            setup: validateSetup(item.setup),
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null
          };
        });

      state.initialized = true;
      return true;

    } catch (error) {
      state.presets = [];
      state.initialized = true;
      return false;
    }
  }

  function ensureInitialized() {
    if (!state.initialized) {
      loadFromStorage();
    }
  }

  function savePreset(name, setup, carId) {
    ensureInitialized();

    const safeName = cleanName(name);
    const safeSetup = validateSetup(setup);

    if (state.presets.length >= MAX_PRESETS) {
      throw new Error(
        "अधिकतम 30 Presets ही सेव किए जा सकते हैं।"
      );
    }

    const now = new Date().toISOString();

    const preset = {
      id: createId(),
      name: safeName,
      carId: carId === undefined ? null : String(carId),
      setup: safeSetup,
      createdAt: now,
      updatedAt: now
    };

    state.presets.push(preset);

    try {
      saveToStorage();
    } catch (error) {
      state.presets.pop();
      throw error;
    }

    return clone(preset);
  }

  function updatePreset(id, changes) {
    ensureInitialized();

    const preset = state.presets.find(function (item) {
      return item.id === id;
    });

    if (!preset) {
      throw new Error("Preset नहीं मिला।");
    }

    changes = changes || {};

    const updated = Object.assign({}, preset);

    if (changes.name !== undefined) {
      updated.name = cleanName(changes.name);
    }

    if (changes.setup !== undefined) {
      updated.setup = validateSetup(changes.setup);
    }

    if (changes.carId !== undefined) {
      updated.carId = changes.carId === null
        ? null
        : String(changes.carId);
    }

    updated.updatedAt = new Date().toISOString();

    const index = state.presets.indexOf(preset);
    state.presets[index] = updated;

    try {
      saveToStorage();
    } catch (error) {
      state.presets[index] = preset;
      throw error;
    }

    return clone(updated);
  }

  function deletePreset(id) {
    ensureInitialized();

    const index = state.presets.findIndex(function (item) {
      return item.id === id;
    });

    if (index === -1) return false;

    const removed = state.presets.splice(index, 1)[0];

    try {
      saveToStorage();
    } catch (error) {
      state.presets.splice(index, 0, removed);
      throw error;
    }

    if (state.activePresetId === id) {
      state.activePresetId = null;
    }

    return true;
  }

  function getPreset(id) {
    ensureInitialized();

    const preset = state.presets.find(function (item) {
      return item.id === id;
    });

    return preset ? clone(preset) : null;
  }

  function getAll(options) {
    ensureInitialized();

    options = options || {};

    let result = state.presets.slice();

    if (options.carId !== undefined) {
      result = result.filter(function (item) {
        return item.carId === String(options.carId);
      });
    }

    return clone(result);
  }

  async function applyPreset(id, adapter) {
    ensureInitialized();

    if (!adapter || typeof adapter.apply !== "function") {
      throw new Error(
        "Preset लागू करने के लिए adapter.apply Function आवश्यक है।"
      );
    }

    const preset = getPreset(id);

    if (!preset) {
      throw new Error("लागू करने के लिए Preset नहीं मिला।");
    }

    const result = await adapter.apply(
      clone(preset.setup),
      preset.carId
    );

    if (result === false) {
      throw new Error("Vehicle Setup लागू नहीं हो पाया।");
    }

    state.activePresetId = preset.id;

    return {
      success: true,
      presetId: preset.id,
      presetName: preset.name
    };
  }

  function getState() {
    ensureInitialized();

    return {
      initialized: state.initialized,
      totalPresets: state.presets.length,
      maxPresets: MAX_PRESETS,
      activePresetId: state.activePresetId
    };
  }

  function exportPresets() {
    ensureInitialized();

    return {
      format: "SUPERX-VEHICLE-SETUPS",
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: clone(state.presets)
    };
  }

  function importPresets(data) {
    ensureInitialized();

    if (
      !data ||
      data.format !== "SUPERX-VEHICLE-SETUPS" ||
      data.version !== 1 ||
      !Array.isArray(data.presets)
    ) {
      throw new Error("Preset Import Format सही नहीं है।");
    }

    if (data.presets.length > MAX_PRESETS) {
      throw new Error("Import में 30 से अधिक Presets हैं।");
    }

    const imported = data.presets.map(function (item) {
      if (!item || typeof item !== "object") {
        throw new Error("Import में अमान्य Preset मिला।");
      }

      return {
        id: createId(),
        name: cleanName(item.name),
        carId: item.carId === null || item.carId === undefined
          ? null
          : String(item.carId),
        setup: validateSetup(item.setup),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    if (state.presets.length + imported.length > MAX_PRESETS) {
      throw new Error(
        "मौजूदा और नए Presets मिलाकर 30 से अधिक हो जाएँगे।"
      );
    }

    const previous = state.presets.slice();

    state.presets = state.presets.concat(imported);

    try {
      saveToStorage();
    } catch (error) {
      state.presets = previous;
      throw error;
    }

    return {
      imported: imported.length,
      total: state.presets.length
    };
  }

  SX.vehicleSetupPresets = {
    init: loadFromStorage,
    save: savePreset,
    update: updatePreset,
    delete: deletePreset,
    get: getPreset,
    getAll: getAll,
    apply: applyPreset,
    getState: getState,
    exportAll: exportPresets,
    importAll: importPresets
  };

})(window);

/* =========================================================
   END — FILE 141
   ========================================================= */
     
