
/* =========================================================
   SUPERX LEGEND — FILE 122
   FILE: js/vehicle-race-session-report-templates.js

   PURPOSE:
   - Provide reusable report templates.
   - Select report sections.
   - Format reports for different purposes.
   - Prepare data for FILE 120 report generator.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const TEMPLATES = {
    full: {
      id: "full",
      name: "Full Report",
      description: "Complete race session report.",
      sections: [
        "identity",
        "race-result",
        "vehicle",
        "performance",
        "laps",
        "penalties",
        "rewards",
        "session-time"
      ]
    },

    performance: {
      id: "performance",
      name: "Performance Report",
      description: "Speed, lap and driving performance.",
      sections: [
        "identity",
        "vehicle",
        "performance",
        "laps",
        "penalties"
      ]
    },

    rewards: {
      id: "rewards",
      name: "Rewards Report",
      description: "Coins, XP and race rewards.",
      sections: [
        "identity",
        "race-result",
        "rewards"
      ]
    },

    clean: {
      id: "clean",
      name: "Clean Race Report",
      description: "Clean racing and penalty information.",
      sections: [
        "identity",
        "race-result",
        "vehicle",
        "penalties",
        "performance"
      ]
    },

    quick: {
      id: "quick",
      name: "Quick Summary",
      description: "Short summary of a race.",
      sections: [
        "identity",
        "race-result",
        "rewards"
      ]
    }
  };

  const SECTION_LABELS = {
    identity: "Session Information",
    "race-result": "Race Result",
    vehicle: "Vehicle Information",
    performance: "Performance",
    laps: "Lap Details",
    penalties: "Penalties",
    rewards: "Rewards",
    "session-time": "Session Timing"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clean(value, limit) {
    if (value === null || value === undefined) return "";

    return String(value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, limit || 120);
  }

  function getTemplates() {
    return Object.keys(TEMPLATES).map(function (key) {
      const item = TEMPLATES[key];

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        sections: item.sections.slice()
      };
    });
  }

  function getTemplate(templateId) {
    const template = TEMPLATES[templateId];

    return template ? clone(template) : null;
  }

  function getSections(templateId) {
    const template = TEMPLATES[templateId];

    if (!template) return [];

    return template.sections.map(function (id) {
      return {
        id: id,
        label: SECTION_LABELS[id]
      };
    });
  }

  function createReportData(templateId, input) {
    const template = TEMPLATES[templateId];

    if (!template) {
      return {
        success: false,
        error: "Unknown report template."
      };
    }

    const data = input && typeof input === "object"
      ? input
      : {};

    const output = {
      templateId: template.id,
      templateName: template.name,
      generatedAt: Date.now(),
      sections: {}
    };

    const sections = template.sections;

    if (sections.includes("identity")) {
      output.sections.identity = {
        sessionId: clean(data.sessionId, 120),
        player: clean(data.player, 60),
        mode: clean(data.mode, 50),
        map: clean(data.map, 80)
      };
    }

    if (sections.includes("race-result")) {
      output.sections.raceResult = {
        completed: data.completed === true,
        position: Math.max(0, Number(data.position) || 0),
        totalRacers: Math.max(
          0,
          Number(data.totalRacers) || 0
        )
      };
    }

    if (sections.includes("vehicle")) {
      output.sections.vehicle = {
        car: clean(data.car, 80)
      };
    }

    if (sections.includes("performance")) {
      output.sections.performance = {
        averageSpeed: Math.max(
          0,
          Number(data.averageSpeed) || 0
        ),
        maxSpeed: Math.max(
          0,
          Number(data.maxSpeed) || 0
        ),
        distanceKm: Math.max(
          0,
          Number(data.distanceKm) || 0
        ),
        bestLapMs: Math.max(
          0,
          Number(data.bestLapMs) || 0
        )
      };
    }

    if (sections.includes("laps")) {
      output.sections.laps = {
        lapTimes: Array.isArray(data.lapTimes)
          ? data.lapTimes
              .map(Number)
              .filter(function (value) {
                return Number.isFinite(value) && value > 0;
              })
              .slice(0, 100)
          : []
      };
    }

    if (sections.includes("penalties")) {
      output.sections.penalties = {
        count: Math.max(
          0,
          Number(data.penalties) || 0
        ),
        cleanRace: data.cleanRace === true
      };
    }

    if (sections.includes("rewards")) {
      output.sections.rewards = {
        coins: Math.max(0, Number(data.coinsEarned) || 0),
        xp: Math.max(0, Number(data.xpEarned) || 0)
      };
    }

    if (sections.includes("session-time")) {
      output.sections.sessionTime = {
        durationMs: Math.max(
          0,
          Number(data.durationMs) || 0
        ),
        startedAt: Number(data.startedAt) || null,
        finishedAt: Number(data.finishedAt) || null
      };
    }

    return {
      success: true,
      report: output
    };
  }

  function customizeSections(templateId, selectedSections) {
    const template = TEMPLATES[templateId];

    if (!template || !Array.isArray(selectedSections)) {
      return {
        success: false,
        error: "Invalid template or sections."
      };
    }

    const allowed = template.sections;

    const selected = selectedSections.filter(function (id) {
      return allowed.includes(id);
    });

    return {
      success: true,
      templateId: templateId,
      sections: selected.map(function (id) {
        return {
          id: id,
          label: SECTION_LABELS[id]
        };
      })
    };
  }

  function createCustomReport(input, selectedSections) {
    const data = input && typeof input === "object"
      ? input
      : {};

    if (!Array.isArray(selectedSections)) {
      return {
        success: false,
        error: "Sections must be an array."
      };
    }

    const available = [
      "identity",
      "race-result",
      "vehicle",
      "performance",
      "laps",
      "penalties",
      "rewards",
      "session-time"
    ];

    const selected = selectedSections.filter(function (id) {
      return available.includes(id);
    });

    if (!selected.length) {
      return {
        success: false,
        error: "Select at least one report section."
      };
    }

    const temporary = {
      id: "custom",
      name: "Custom Report",
      sections: selected
    };

    TEMPLATES.__temporary = temporary;

    const result = createReportData("__temporary", data);

    delete TEMPLATES.__temporary;

    if (result.success) {
      result.report.templateId = "custom";
      result.report.templateName = "Custom Report";
    }

    return result;
  }

  SX.vehicleRaceSessionReportTemplates = {
    getTemplates: getTemplates,
    getTemplate: getTemplate,
    getSections: getSections,
    createReportData: createReportData,
    customizeSections: customizeSections,
    createCustomReport: createCustomReport
  };

  console.log("[SUPERX] Race Session Report Templates ready.");

})(window);

/* ======================= FILE 122 END ======================= */
