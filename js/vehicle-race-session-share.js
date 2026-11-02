
/* =========================================================
   SUPERX LEGEND — FILE 119
   FILE: js/vehicle-race-session-share.js

   PURPOSE:
   - Create share-ready race session summaries.
   - Generate plain text and JSON share data.
   - Copy summaries using the browser clipboard API.
   - Use Web Share API when supported.
   - No automatic upload or external account access.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const MAX_TEXT = 500;

  function clean(value, limit) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || 100);
  }

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function createShareData(sessionId, details) {
    const id = clean(sessionId, 120);

    if (!id) return null;

    const data = details && typeof details === "object"
      ? details
      : {};

    return {
      game: "SUPERX LEGEND",
      sessionId: id,
      title: clean(data.title, 100) || "Race Session",
      player: clean(data.player, 50) || "Player",
      car: clean(data.car, 80) || "Unknown Car",
      map: clean(data.map, 80) || "Unknown Map",
      mode: clean(data.mode, 50) || "Unknown Mode",
      position: Math.max(0, number(data.position)),
      totalRacers: Math.max(0, number(data.totalRacers)),
      duration: clean(data.duration, 30),
      bestLap: clean(data.bestLap, 30),
      distance: Math.max(0, number(data.distance)),
      coins: Math.max(0, number(data.coins)),
      xp: Math.max(0, number(data.xp)),
      sharedAt: Date.now()
    };
  }

  function formatText(data, options) {
    if (!data || typeof data !== "object") return "";

    const settings = options || {};
    const lines = [
      "🏁 SUPERX LEGEND",
      clean(data.title, 100),
      "",
      "Player: " + clean(data.player, 50),
      "Car: " + clean(data.car, 80),
      "Map: " + clean(data.map, 80),
      "Mode: " + clean(data.mode, 50)
    ];

    if (data.position > 0) {
      lines.push(
        "Position: " + data.position +
        (data.totalRacers > 0
          ? " / " + data.totalRacers
          : "")
      );
    }

    if (data.duration) {
      lines.push("Duration: " + clean(data.duration, 30));
    }

    if (data.bestLap) {
      lines.push("Best Lap: " + clean(data.bestLap, 30));
    }

    if (data.distance > 0) {
      lines.push(
        "Distance: " + data.distance.toFixed(2) + " km"
      );
    }

    lines.push("Coins: " + data.coins);
    lines.push("XP: " + data.xp);

    if (settings.includeSessionId !== false) {
      lines.push("Session ID: " + clean(data.sessionId, 120));
    }

    if (settings.message) {
      lines.push("");
      lines.push(
        clean(settings.message, MAX_TEXT)
      );
    }

    lines.push("");
    lines.push("#SUPERXLEGEND #Racing");

    return lines.join("\n");
  }

  function createText(sessionId, details, options) {
    const data = createShareData(sessionId, details);

    return data
      ? formatText(data, options)
      : "";
  }

  function createJSON(sessionId, details) {
    const data = createShareData(sessionId, details);

    if (!data) return null;

    return JSON.stringify(data, null, 2);
  }

  async function copyText(text) {
    const value = clean(text, 4000);

    if (!value) {
      return {
        success: false,
        reason: "empty-text"
      };
    }

    try {
      if (
        window.navigator.clipboard &&
        typeof window.navigator.clipboard.writeText === "function"
      ) {
        await window.navigator.clipboard.writeText(value);

        return { success: true };
      }

      return {
        success: false,
        reason: "clipboard-not-supported"
      };
    } catch (error) {
      return {
        success: false,
        reason: "clipboard-permission-denied"
      };
    }
  }

  async function shareText(text, title) {
    const value = clean(text, 4000);

    if (!value) {
      return {
        success: false,
        reason: "empty-text"
      };
    }

    if (typeof window.navigator.share !== "function") {
      return {
        success: false,
        reason: "share-not-supported"
      };
    }

    try {
      await window.navigator.share({
        title: clean(title, 100) || "SUPERX LEGEND Race",
        text: value
      });

      return { success: true };
    } catch (error) {
      if (error && error.name === "AbortError") {
        return {
          success: false,
          reason: "share-cancelled"
        };
      }

      return {
        success: false,
        reason: "share-failed"
      };
    }
  }

  function getShareCapabilities() {
    return {
      clipboard: Boolean(
        window.navigator.clipboard &&
        window.navigator.clipboard.writeText
      ),
      nativeShare: typeof window.navigator.share === "function"
    };
  }

  function createPreview(sessionId, details, options) {
    const data = createShareData(sessionId, details);

    if (!data) return null;

    return {
      data: data,
      text: formatText(data, options),
      capabilities: getShareCapabilities()
    };
  }

  SX.vehicleRaceSessionShare = {
    createShareData: createShareData,
    formatText: formatText,
    createText: createText,
    createJSON: createJSON,
    copyText: copyText,
    shareText: shareText,
    getShareCapabilities: getShareCapabilities,
    createPreview: createPreview
  };

  console.log("[SUPERX] Race Session Share ready.");

})(window);

/* ======================= FILE 119 END ======================= */
          
