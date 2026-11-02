
/* =========================================================
   SUPERX LEGEND — FILE 42 START
   FILE: js/save-manager.js
   PURPOSE: Local save backup and restore manager
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const BACKUP_VERSION = 1;
  const BACKUP_NAME = "SUPERX_LEGEND_BACKUP";

  const STORAGE_KEYS = [
    "superx_player",
    "superx_settings",
    "superx_achievements",
    "superx_daily_rewards",
    "superx_challenges",
    "superx_leaderboard",
    "superx_quests",
    "superx_tutorial_v1"
  ];

  function getPlayerData() {
    try {
      return SX.player
        ? JSON.parse(JSON.stringify(SX.player))
        : null;
    } catch (error) {
      return null;
    }
  }

  function collectStorage() {
    const result = {};

    STORAGE_KEYS.forEach(key => {
      try {
        const value = localStorage.getItem(key);

        if (value !== null) {
          result[key] = value;
        }
      } catch (error) {
        console.warn("Could not read save key:", key);
      }
    });

    return result;
  }

  function createBackup() {
    const backup = {
      application: BACKUP_NAME,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      player: getPlayerData(),
      storage: collectStorage()
    };

    return backup;
  }

  function downloadBackup() {
    const backup = createBackup();
    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob([json], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const date = new Date().toISOString()
      .replace(/[:.]/g, "-");

    link.href = url;
    link.download = `SUPERX-Backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
  }

  function validateBackup(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid backup file.");
    }

    if (data.application !== BACKUP_NAME) {
      throw new Error("This is not a SUPERX backup.");
    }

    if (data.version !== BACKUP_VERSION) {
      throw new Error("Unsupported backup version.");
    }

    if (
      !data.storage ||
      typeof data.storage !== "object" ||
      Array.isArray(data.storage)
    ) {
      throw new Error("Backup data is incomplete.");
    }

    Object.entries(data.storage).forEach(([key, value]) => {
      if (
        !STORAGE_KEYS.includes(key) ||
        typeof value !== "string"
      ) {
        throw new Error("Backup contains invalid save data.");
      }

      try {
        JSON.parse(value);
      } catch (error) {
        throw new Error("Backup contains damaged save data.");
      }
    });

    return true;
  }

  function restoreBackup(data) {
    validateBackup(data);

    const previousValues = {};

    STORAGE_KEYS.forEach(key => {
      previousValues[key] = localStorage.getItem(key);
    });

    try {
      Object.entries(data.storage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      if (SX.storage && typeof SX.storage.load === "function") {
        SX.storage.load();
      }

      document.dispatchEvent(new CustomEvent("sx:save-restored", {
        detail: {
          createdAt: data.createdAt || null
        }
      }));

      if (SX.notifications && SX.notifications.success) {
        SX.notifications.success(
          "Backup restored",
          "Your saved game data has been imported."
        );
      }

      return true;

    } catch (error) {
      STORAGE_KEYS.forEach(key => {
        try {
          const oldValue = previousValues[key];

          if (oldValue === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, oldValue);
          }
        } catch (restoreError) {
          console.error("Save rollback failed:", restoreError);
        }
      });

      throw new Error("Could not restore backup. Previous data was preserved where possible.");
    }
  }

  function importFile(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new Error("Please select a backup file."));
        return;
      }

      if (!file.name.toLowerCase().endsWith(".json")) {
        reject(new Error("Only JSON backup files are supported."));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Backup file is too large."));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          restoreBackup(data);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Could not read the selected file."));
      };

      reader.readAsText(file);
    });
  }

  function getBackupInfo(data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    return {
      application: data.application || "Unknown",
      version: data.version || 0,
      createdAt: data.createdAt || null,
      hasPlayerData: Boolean(data.player),
      storageItems: data.storage
        ? Object.keys(data.storage).length
        : 0
    };
  }

  function createImportInput() {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    document.body.appendChild(input);

    return input;
  }

  function openImportDialog() {
    const input = createImportInput();

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];

      if (!file) {
        input.remove();
        return;
      }

      try {
        await importFile(file);
      } catch (error) {
        if (SX.notifications && SX.notifications.error) {
          SX.notifications.error(
            "Import failed",
            error.message
          );
        } else {
          alert(error.message);
        }
      } finally {
        input.remove();
      }
    });

    input.click();
  }

  SX.saveManager = {
    createBackup,
    downloadBackup,
    validateBackup,
    restoreBackup,
    importFile,
    getBackupInfo,
    openImportDialog,
    getSupportedKeys: () => [...STORAGE_KEYS]
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 42 END
   FILE: js/save-manager.js
========================================================= */
