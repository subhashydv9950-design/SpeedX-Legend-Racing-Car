/* =========================================================
   SUPERX LEGEND — FILE 91
   FILE: js/vehicle-lap-timer.js
   START: VEHICLE LAP TIMER SYSTEM
========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const STORAGE_KEY = "superx_lap_timer_v2";

  const MAX_LAPS = 500;
  const MAX_SECTORS = 10;

  let session = null;
  let history = {};
  let lastUpdate = 0;
  let animationFrame = null;
  let initialized = false;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail: detail || {}
    }));
  }

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
    const ms = Math.max(0, Number(milliseconds) || 0);
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return (
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0") + "." +
      String(centiseconds).padStart(2, "0")
    );
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      return true;
    } catch (error) {
      console.warn("[SUPERX LapTimer] Save failed:", error);
      return false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      history = saved && typeof saved === "object" &&
        !Array.isArray(saved) ? saved : {};
    } catch (error) {
      history = {};
    }
  }

  function getCarHistory(carId) {
    const id = carId || getCarId();

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
    const now = performance.now();

    session = {
      id: "lap_" + Date.now(),
      carId: getCarId(),
      status: "running",
      startedAt: now,
      currentLap: 1,
      lapStartedAt: now,
      completedLaps: [],
      sectors: [],
      sectorStartedAt: now,
      sectorIndex: 0,
      sectorCount: Math.max(
        1,
        Math.min(MAX_SECTORS, Math.floor(
          Number(settings.sectorCount) || 3
        ))
      ),
      lastLapTime: null,
      bestLap: null,
      pausedDuration: 0,
      pauseStartedAt: null
    };

    getCarHistory(session.carId).totalRaces++;
    save();

    emit("lap-session-started", {
      sessionId: session.id,
      carId: session.carId
    });

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
      now - session.lapStartedAt - session.pausedDuration
    );
  }

  function update() {
    if (!session || session.status !== "running") {
      return getState();
    }

    const now = performance.now();

    if (now - lastUpdate >= 50) {
      lastUpdate = now;
      emit("lap-timer-update", getState());
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

    if (session.sectorIndex >= session.sectorCount) {
      return {
        success: false,
        message: "All sectors are already completed."
      };
    }

    const now = performance.now();
    const elapsed = now - session.sectorStartedAt;

    const sector = {
      number: session.sectorIndex + 1,
      milliseconds: elapsed,
      time: formatTime(elapsed)
    };

    session.sectors.push(sector);
    session.sectorIndex++;
    session.sectorStartedAt = now;

    emit("lap-sector-completed", {
      sector: sector.number,
      milliseconds: elapsed,
      time: sector.time
    });

    return {
      success: true,
      sector: sector.number,
      milliseconds: elapsed,
      formatted: sector.time
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
    const lapTime = getElapsed(now);

    if (lapTime <= 0) {
      return {
        success: false,
        message: "Invalid lap time."
      };
    }

    const lap = {
      number: session.currentLap,
      milliseconds: lapTime,
      time: formatTime(lapTime),
      sectors: session.sectors.map(sector => ({ ...sector })),
      completedAt: Date.now()
    };

    session.completedLaps.push(lap);
    session.lastLapTime = lapTime;

    if (session.bestLap === null || lapTime < session.bestLap) {
      session.bestLap = lapTime;
    }

    const record = getCarHistory(session.carId);

    record.laps.unshift({
      ...lap,
      sessionId: session.id
    });

    if (record.laps.length > MAX_LAPS) {
      record.laps.length = MAX_LAPS;
    }

    const isPersonalBest =
      record.bestLap === null || lapTime < record.bestLap;

    if (isPersonalBest) {
      record.bestLap = lapTime;
    }

    save();

    const result = {
      ...lap,
      isPersonalBest,
      isSessionBest: lapTime === session.bestLap
    };

    emit("lap-completed", result);

    session.currentLap++;
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
    if (!session || session.status !== "running") return false;

    session.status = "paused";
    session.pauseStartedAt = performance.now();

    emit("lap-session-paused", {
      sessionId: session.id
    });

    return true;
  }

  function resume() {
    if (!session || session.status !== "paused") return false;

    const now = performance.now();
    const pauseDuration = now - session.pauseStartedAt;

    session.pausedDuration += pauseDuration;
    session.sectorStartedAt += pauseDuration;
    session.pauseStartedAt = null;
    session.status = "running";

    emit("lap-session-resumed", {
      sessionId: session.id
    });

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
      laps: session.completedLaps.map(lap => ({ ...lap })),
      finishedAt: Date.now()
    };

    const sessionId = session.id;
    session = null;

    emit("lap-session-finished", finished);

    return {
      success: true,
      sessionId,
      result: finished
    };
  }

  function resetSession() {
    if (!session) return false;

    const sessionId = session.id;
    session = null;

    emit("lap-session-reset", {
      sessionId: sessionId
    });

    return true;
  }

  function getAverageLap() {
    if (!session || !session.completedLaps.length) return null;

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
      sessionId: session.id,
      carId: session.carId,
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
      sectorCount: session.sectorCount,
      paused: session.status === "paused"
    };
  }

  function getHistory(limit) {
    const record = getCarHistory();
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : record.laps.length;

    return {
      laps: record.laps.slice(0, count).map(lap => ({ ...lap })),
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
    emit("lap-history-cleared", { carId: getCarId() });

    return true;
  }

  function destroy() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    session = null;
    initialized = false;
  }

  function init() {
    if (initialized) return api;

    load();
    initialized = true;

    const loop = function () {
      if (!initialized) return;

      update();
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

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
    formatTime,
    destroy
  };

  SX.vehicleLapTimer = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();

/* =========================================================
   END: VEHICLE LAP TIMER SYSTEM — FILE 91
========================================================= */

