
/* =========================================================
   SUPERX LEGEND — FILE 99
   FILE: js/vehicle-race-director.js
   START: VEHICLE RACE DIRECTOR
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const CONFIG = {
    countdownSeconds: 5,
    defaultLaps: 3,
    maximumLaps: 100
  };

  let state = "idle";
  let countdown = 0;
  let currentLap = 0;
  let totalLaps = CONFIG.defaultLaps;
  let raceStartedAt = 0;
  let raceFinishedAt = 0;
  let lastLapTime = 0;
  let bestLapTime = 0;
  let lapHistory = [];
  let lights = 0;
  let pausedAt = 0;
  let totalPausedTime = 0;
  let timer = null;

  function emit(name, detail) {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function num(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clearTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function reset() {
    clearTimer();

    state = "idle";
    countdown = 0;
    currentLap = 0;
    totalLaps = CONFIG.defaultLaps;
    raceStartedAt = 0;
    raceFinishedAt = 0;
    lastLapTime = 0;
    bestLapTime = 0;
    lapHistory = [];
    lights = 0;
    pausedAt = 0;
    totalPausedTime = 0;

    emit("sx:race-director-reset");

    return getState();
  }

  function prepare(options) {
    reset();

    const settings = options || {};

    totalLaps = Math.max(
      1,
      Math.min(
        CONFIG.maximumLaps,
        Math.floor(num(settings.laps, CONFIG.defaultLaps))
      )
    );

    state = "ready";

    emit("sx:race-ready", {
      totalLaps
    });

    return getState();
  }

  function startCountdown() {
    if (state !== "ready") {
      return {
        success: false,
        message: "Race is not ready."
      };
    }

    clearTimer();

    state = "countdown";
    countdown = CONFIG.countdownSeconds;
    lights = 0;

    emit("sx:race-countdown-started", {
      countdown
    });

    timer = setInterval(function () {
      if (state !== "countdown") {
        clearTimer();
        return;
      }

      countdown--;

      lights = Math.min(
        CONFIG.countdownSeconds,
        CONFIG.countdownSeconds - countdown
      );

      emit("sx:race-countdown-tick", {
        countdown,
        lights
      });

      if (countdown <= 0) {
        clearTimer();
        startRace();
      }
    }, 1000);

    return getState();
  }

  function startRace() {
    if (state !== "countdown" && state !== "ready") {
      return false;
    }

    clearTimer();

    state = "racing";
    currentLap = 1;
    raceStartedAt = Date.now();
    raceFinishedAt = 0;
    lights = CONFIG.countdownSeconds;

    emit("sx:race-started", {
      totalLaps,
      currentLap,
      startTime: raceStartedAt
    });

    return getState();
  }

  function getElapsedTime() {
    if (!raceStartedAt) return 0;

    const end = raceFinishedAt || Date.now();

    return Math.max(
      0,
      (end - raceStartedAt - totalPausedTime) / 1000
    );
  }

  function completeLap(milliseconds) {
    if (state !== "racing") return false;

    const lapTime = Math.max(
      0,
      num(milliseconds, 0)
    );

    if (lapTime <= 0) {
      return {
        success: false,
        message: "Invalid lap time."
      };
    }

    lastLapTime = lapTime;

    if (
      bestLapTime === 0 ||
      lapTime < bestLapTime
    ) {
      bestLapTime = lapTime;
    }

    const lapResult = {
      lap: currentLap,
      time: lapTime,
      bestLap: bestLapTime,
      timestamp: Date.now()
    };

    lapHistory.push(lapResult);

    emit("sx:race-lap-completed", lapResult);

    if (currentLap >= totalLaps) {
      return finishRace();
    }

    currentLap++;

    if (currentLap === totalLaps) {
      emit("sx:race-final-lap", {
        currentLap,
        totalLaps
      });
    }

    emit("sx:race-next-lap", {
      currentLap,
      totalLaps
    });

    return {
      success: true,
      lap: currentLap,
      lastLapTime,
      bestLapTime
    };
  }

  function pause() {
    if (state !== "racing") return false;

    state = "paused";
    pausedAt = Date.now();

    emit("sx:race-director-paused");

    return true;
  }

  function resume() {
    if (state !== "paused") return false;

    totalPausedTime += Date.now() - pausedAt;
    pausedAt = 0;
    state = "racing";

    emit("sx:race-director-resumed");

    return true;
  }

  function finishRace() {
    if (
      state !== "racing" &&
      state !== "paused"
    ) {
      return false;
    }

    if (state === "paused" && pausedAt) {
      totalPausedTime += Date.now() - pausedAt;
      pausedAt = 0;
    }

    state = "finished";
    raceFinishedAt = Date.now();

    clearTimer();

    const result = {
      totalLaps,
      completedLaps: lapHistory.length,
      duration: getElapsedTime(),
      bestLapTime,
      lastLapTime,
      lapHistory: lapHistory.slice(),
      finishedAt: raceFinishedAt
    };

    emit("sx:race-director-finished", result);

    return result;
  }

  function abort() {
    if (state === "idle" || state === "finished") {
      return false;
    }

    clearTimer();

    state = "aborted";

    emit("sx:race-director-aborted", {
      currentLap,
      totalLaps,
      elapsed: getElapsedTime()
    });

    return true;
  }

  function getProgress() {
    return {
      currentLap,
      totalLaps,
      completedLaps: lapHistory.length,
      percentage: totalLaps > 0
        ? Math.min(
            100,
            (lapHistory.length / totalLaps) * 100
          )
        : 0,
      finalLap: currentLap === totalLaps &&
        state === "racing"
    };
  }

  function getState() {
    return {
      state,
      countdown,
      lights,
      currentLap,
      totalLaps,
      elapsed: getElapsedTime(),
      lastLapTime,
      bestLapTime,
      progress: getProgress(),
      paused: state === "paused",
      finished: state === "finished"
    };
  }

  function getLapHistory() {
    return lapHistory.map(
      lap => ({ ...lap })
    );
  }

  const api = {
    prepare,
    startCountdown,
    startRace,
    completeLap,
    pause,
    resume,
    finishRace,
    abort,
    reset,
    getState,
    getProgress,
    getElapsedTime,
    getLapHistory
  };

  SX.vehicleRaceDirector = api;

})();

/* =========================================================
   END: VEHICLE RACE DIRECTOR — FILE 99
   ========================================================= */
