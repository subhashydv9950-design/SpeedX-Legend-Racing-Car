
/* =========================================================
   SUPERX LEGEND — FILE 91
   FILE: js/vehicle-lap-timer.js
   START: VEHICLE LAP TIMER SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_lap_timer_v1";

  const MAX_LAPS = 500;
  const MAX_SECTORS = 10;

  let session = null;
  let history = {};
  let timerFrame = null;
  let lastUpdate = 0;

  function getCarId() {
    const car = SX.getSelectedCar
      ? SX.getSelectedCar()
      : null;

    return String(
      car && (car.id || car.name)
        ? car.id || car.name
        : "default"
    );
  }

  function formatTime(milliseconds) {
    const ms = Math.max(0, milliseconds || 0);

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor(
      (ms % 1000) / 10
    );

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0") +
      "." +
      String(centiseconds).padStart(2, "0")
    );
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.warn("[SUPERX LapTimer] Save failed:", error);
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      history =
        saved && typeof saved === "object" &&
        !Array.isArray(saved)
          ? saved
          : {};
    } catch (error) {
      history = {};
    }
  }

  function getCarHistory() {
    const id = getCarId();

    if (!history[id]) {
      history[id] = {
        laps: [],
        bestLap: null,
        totalRaces: 0
      };
    }

    return history[id];
  }

  function startSession(options) {
    if (session) {
      return {
        success: false,
        message: "Lap timer is already running."
      };
    }

    const settings = options || {};

    session = {
      id: "lap_" + Date.now(),
      carId: getCarId(),
      status: "running",
      startedAt: performance.now(),
      currentLap: 1,
      lapStartedAt: performance.now(),
      completedLaps: [],
      sectors: [],
      sectorStartedAt: performance.now(),
      sectorIndex: 0,
      sectorCount: Math.max(
        1,
        Math.min(
          MAX_SECTORS,
          Number(settings.sectorCount) || 3
        )
      ),
      lastLapTime: null,
      bestLap: null,
      pausedDuration: 0,
      pauseStartedAt: null
    };

    const record = getCarHistory();
    record.totalRaces += 1;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:lap-session-started", {
        detail: {
          sessionId: session.id,
          carId: session.carId
        }
      })
    );

    return {
      success: true,
      sessionId: session.id
    };
  }

  function getElapsed(now) {
    if (!session) return 0;

    if (session.status === "paused") {
      now = session.pauseStartedAt;
    }

    return Math.max(
      0,
      now -
      session.lapStartedAt -
      session.pausedDuration
    );
  }

  function update() {
    if (!session || session.status !== "running") {
      return getState();
    }

    const now = performance.now();

    if (now - lastUpdate >= 50) {
      lastUpdate = now;

      window.dispatchEvent(
        new CustomEvent("sx:lap-timer-update", {
          detail: getState()
        })
      );
    }

    return getState();
  }

  function completeSector() {
    if (!session || session.status !== "running") {
      return {
        success: false,
        message: "No active lap."
      };
    }

    const now = performance.now();

    const elapsed =
      now -
      session.sectorStartedAt;

    session.sectors.push({
      number: session.sectorIndex + 1,
      milliseconds: elapsed,
      time: formatTime(elapsed)
    });

    session.sectorIndex += 1;
    session.sectorStartedAt = now;

    window.dispatchEvent(
      new CustomEvent("sx:lap-sector-completed", {
        detail: {
          sector: session.sectorIndex,
          milliseconds: elapsed
        }
      })
    );

    return {
      success: true,
      sector: session.sectorIndex,
      milliseconds: elapsed,
      formatted: formatTime(elapsed)
    };
  }

  function completeLap() {
    if (!session || session.status !== "running") {
      return {
        success: false,
        message: "No active lap."
      };
    }

    const now = performance.now();

    const lapTime =
      now -
      session.lapStartedAt -
      session.pausedDuration;

    const lap = {
      number: session.currentLap,
      milliseconds: lapTime,
      time: formatTime(lapTime),
      sectors: session.sectors.map(
        sector => ({ ...sector })
      ),
      completedAt: Date.now()
    };

    session.completedLaps.push(lap);
    session.lastLapTime = lapTime;

    const previousBest = session.bestLap;

    if (
      previousBest === null ||
      lapTime < previousBest
    ) {
      session.bestLap = lapTime;
    }

    const record = getCarHistory();

    record.laps.unshift({
      ...lap,
      sessionId: session.id
    });

    if (record.laps.length > MAX_LAPS) {
      record.laps.length = MAX_LAPS;
    }

    if (
      record.bestLap === null ||
      record.bestLap === undefined ||
      lapTime < record.bestLap
    ) {
      record.bestLap = lapTime;
    }

    save();

    const result = {
      ...lap,
      isPersonalBest:
        record.bestLap === lapTime,
      isSessionBest:
        session.bestLap === lapTime
    };

    window.dispatchEvent(
      new CustomEvent("sx:lap-completed", {
        detail: result
      })
    );

    session.currentLap += 1;
    session.lapStartedAt = now;
    session.sectorStartedAt = now;
    session.sectorIndex = 0;
    session.sectors = [];
    session.pausedDuration = 0;

    return {
      success: true,
      lap: result
    };
  }

  function pause() {
    if (!session || session.status !== "running") {
      return false;
    }

    session.status = "paused";
    session.pauseStartedAt = performance.now();

    return true;
  }

  function resume() {
    if (!session || session.status !== "paused") {
      return false;
    }

    const now = performance.now();

    const pauseDuration =
      now - session.pauseStartedAt;

    session.pausedDuration += pauseDuration;
    session.sectorStartedAt += pauseDuration;

    session.pauseStartedAt = null;
    session.status = "running";

    return true;
  }

  function finishSession() {
    if (!session) {
      return {
        success: false,
        message: "No active session."
      };
    }

    const finished = {
      id: session.id,
      carId: session.carId,
      completedLaps: session.completedLaps.length,
      bestLap: session.bestLap,
      bestLapFormatted: session.bestLap !== null
        ? formatTime(session.bestLap)
        : "--:--.--",
      laps: session.completedLaps.map(
        lap => ({ ...lap })
      ),
      finishedAt: Date.now()
    };

    session.status = "finished";
    session = null;

    window.dispatchEvent(
      new CustomEvent("sx:lap-session-finished", {
        detail: finished
      })
    );

    return {
      success: true,
      result: finished
    };
  }

  function resetSession() {
    if (!session) return false;

    session = null;

    window.dispatchEvent(
      new CustomEvent("sx:lap-session-reset")
    );

    return true;
  }

  function getAverageLap() {
    if (!session || !session.completedLaps.length) {
      return null;
    }

    const total = session.completedLaps.reduce(
      (sum, lap) => sum + lap.milliseconds,
      0
    );

    return total / session.completedLaps.length;
  }

  function getState() {
    if (!session) {
      return {
        active: false,
        status: "stopped",
        currentLap: 0,
        elapsed: 0,
        formatted: "00:00.00"
      };
    }

    const elapsed = getElapsed(performance.now());

    return {
      active: true,
      status: session.status,
      currentLap: session.currentLap,
      elapsed,
      formatted: formatTime(elapsed),
      lastLap: session.lastLapTime,
      lastLapFormatted: session.lastLapTime !== null
        ? formatTime(session.lastLapTime)
        : "--:--.--",
      bestLap: session.bestLap,
      bestLapFormatted: session.bestLap !== null
        ? formatTime(session.bestLap)
        : "--:--.--",
      completedLaps: session.completedLaps.length,
      sectorsCompleted: session.sectorIndex,
      sectorCount: session.sectorCount
    };
  }

  function getHistory(limit) {
    const record = getCarHistory();

    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : record.laps.length;

    return {
      laps: record.laps.slice(0, count).map(
        lap => ({ ...lap })
      ),
      bestLap: record.bestLap,
      bestLapFormatted: record.bestLap !== null
        ? formatTime(record.bestLap)
        : "--:--.--",
      totalRaces: record.totalRaces
    };
  }

  function clearHistory() {
    const record = getCarHistory();

    record.laps = [];
    record.bestLap = null;
    record.totalRaces = 0;

    save();

    return true;
  }

  function init() {
    load();

    if (!timerFrame) {
      const loop = () => {
        update();
        timerFrame = requestAnimationFrame(loop);
      };

      timerFrame = requestAnimationFrame(loop);
    }

    return api;
  }

  const api = {
    init,
    startSession,
    completeSector,
    completeLap,
    pause,
    resume,
    finishSession,
    resetSession,
    update,
    getState,
    getHistory,
    getAverageLap,
    clearHistory,
    formatTime
  };

  SX.vehicleLapTimer = api;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE LAP TIMER SYSTEM — FILE 91
   ========================================================= */
      
