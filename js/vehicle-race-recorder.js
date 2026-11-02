
/* =========================================================
   SUPERX LEGEND — FILE 92
   FILE: js/vehicle-race-recorder.js
   START: VEHICLE RACE RECORDER
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_recorder_v1";

  const MAX_RECORDS = 100;
  const MAX_SAMPLES = 3600;

  let activeRace = null;
  let records = [];
  let sampleTimer = 0;

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

  function number(value, fallback) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records)
      );
    } catch (error) {
      console.warn(
        "[SUPERX Race Recorder] Save failed:",
        error
      );
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      records = Array.isArray(saved)
        ? saved
        : [];
    } catch (error) {
      records = [];
    }
  }

  function getVehicleSnapshot() {
    const telemetry = SX.vehicleTelemetry &&
      SX.vehicleTelemetry.getData
      ? SX.vehicleTelemetry.getData()
      : {};

    const transmission = SX.vehicleTransmission &&
      SX.vehicleTransmission.getState
      ? SX.vehicleTransmission.getState()
      : {};

    return {
      speed: number(telemetry.speed, 0),
      rpm: number(telemetry.rpm, 0),
      gear: number(transmission.gear, 1),
      throttle: number(telemetry.throttle, 0),
      brake: number(telemetry.brake, 0),
      steering: number(telemetry.steering, 0)
    };
  }

  function start(options) {
    if (activeRace) {
      return {
        success: false,
        message: "Race recording is already active."
      };
    }

    const settings = options || {};

    activeRace = {
      id: "race_record_" + Date.now(),
      carId: getCarId(),
      raceName: String(
        settings.raceName || "Free Race"
      ).slice(0, 80),
      mapName: String(
        settings.mapName || "Unknown Map"
      ).slice(0, 80),
      startedAt: Date.now(),
      elapsed: 0,
      distance: 0,
      bestSpeed: 0,
      maximumRPM: 0,
      samples: [],
      events: [],
      laps: [],
      status: "recording",
      lastSampleAt: 0
    };

    addEvent("race_started", {
      raceName: activeRace.raceName,
      mapName: activeRace.mapName
    });

    window.dispatchEvent(
      new CustomEvent("sx:race-recording-started", {
        detail: {
          id: activeRace.id,
          carId: activeRace.carId
        }
      })
    );

    return {
      success: true,
      id: activeRace.id
    };
  }

  function addEvent(type, detail) {
    if (!activeRace) return false;

    activeRace.events.push({
      type: String(type),
      detail: detail || {},
      time: Date.now(),
      elapsed: activeRace.elapsed
    });

    if (activeRace.events.length > 1000) {
      activeRace.events.shift();
    }

    return true;
  }

  function sample(force) {
    if (!activeRace || activeRace.status !== "recording") {
      return false;
    }

    const now = Date.now();

    if (
      !force &&
      now - activeRace.lastSampleAt < 250
    ) {
      return false;
    }

    const vehicle = getVehicleSnapshot();

    const sampleData = {
      time: now,
      elapsed: (now - activeRace.startedAt) / 1000,
      ...vehicle
    };

    activeRace.samples.push(sampleData);
    activeRace.lastSampleAt = now;

    activeRace.elapsed = sampleData.elapsed;

    activeRace.bestSpeed = Math.max(
      activeRace.bestSpeed,
      vehicle.speed
    );

    activeRace.maximumRPM = Math.max(
      activeRace.maximumRPM,
      vehicle.rpm
    );

    if (activeRace.samples.length > MAX_SAMPLES) {
      activeRace.samples.shift();
    }

    return true;
  }

  function recordDistance(kilometres) {
    if (!activeRace) return false;

    const amount = number(kilometres, 0);

    if (amount <= 0) return false;

    activeRace.distance += amount;

    addEvent("distance_recorded", {
      kilometres: amount
    });

    return activeRace.distance;
  }

  function recordLap(lapData) {
    if (!activeRace) return false;

    const data = lapData || {};

    const lap = {
      number: activeRace.laps.length + 1,
      time: Math.max(
        0,
        number(data.milliseconds, 0)
      ),
      position: number(data.position, 0),
      timestamp: Date.now()
    };

    activeRace.laps.push(lap);

    addEvent("lap_completed", lap);

    return lap;
  }

  function recordCheckpoint(checkpointId) {
    return addEvent("checkpoint_completed", {
      checkpointId: String(checkpointId)
    });
  }

  function pause() {
    if (!activeRace || activeRace.status !== "recording") {
      return false;
    }

    activeRace.status = "paused";
    activeRace.pausedAt = Date.now();

    addEvent("race_paused");

    return true;
  }

  function resume() {
    if (!activeRace || activeRace.status !== "paused") {
      return false;
    }

    const pauseDuration =
      Date.now() - activeRace.pausedAt;

    activeRace.startedAt += pauseDuration;
    activeRace.status = "recording";

    delete activeRace.pausedAt;

    addEvent("race_resumed");

    return true;
  }

  function createSummary(race, status) {
    const samples = race.samples || [];

    const totalSpeed = samples.reduce(
      (sum, item) => sum + item.speed,
      0
    );

    const averageSpeed = samples.length
      ? totalSpeed / samples.length
      : 0;

    return {
      id: race.id,
      carId: race.carId,
      raceName: race.raceName,
      mapName: race.mapName,
      startedAt: race.startedAt,
      finishedAt: Date.now(),
      duration: Number(race.elapsed.toFixed(2)),
      distance: Number(race.distance.toFixed(2)),
      bestSpeed: Number(race.bestSpeed.toFixed(1)),
      averageSpeed: Number(averageSpeed.toFixed(1)),
      maximumRPM: Math.round(race.maximumRPM),
      lapsCompleted: race.laps.length,
      eventsCount: race.events.length,
      status
    };
  }

  function finish(options) {
    if (!activeRace) {
      return {
        success: false,
        message: "No active race recording."
      };
    }

    if (activeRace.status === "recording") {
      sample(true);
    }

    const settings = options || {};

    const finalStatus = settings.status === "abandoned"
      ? "abandoned"
      : "completed";

    activeRace.status = finalStatus;

    addEvent("race_finished", {
      status: finalStatus
    });

    const summary = createSummary(
      activeRace,
      finalStatus
    );

    const result = {
      ...summary,
      samples: activeRace.samples,
      events: activeRace.events,
      laps: activeRace.laps
    };

    records.unshift(result);

    if (records.length > MAX_RECORDS) {
      records.length = MAX_RECORDS;
    }

    activeRace = null;

    save();

    window.dispatchEvent(
      new CustomEvent("sx:race-recording-finished", {
        detail: summary
      })
    );

    return {
      success: true,
      summary
    };
  }

  function getActiveRace() {
    if (!activeRace) return null;

    return JSON.parse(
      JSON.stringify(activeRace)
    );
  }

  function getRecords(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : records.length;

    return records.slice(0, count).map(
      item => ({ ...item })
    );
  }

  function getRecord(id) {
    const record = records.find(
      item => item.id === id
    );

    return record
      ? JSON.parse(JSON.stringify(record))
      : null;
  }

  function getBestRecords() {
    if (!records.length) {
      return {
        fastestSpeed: 0,
        longestDistance: 0,
        fastestRace: null
      };
    }

    const fastestSpeed = Math.max(
      ...records.map(item => item.bestSpeed || 0)
    );

    const longestDistance = Math.max(
      ...records.map(item => item.distance || 0)
    );

    const fastestRace = records
      .filter(item => item.status === "completed")
      .sort((a, b) => a.duration - b.duration)[0] || null;

    return {
      fastestSpeed,
      longestDistance,
      fastestRace
    };
  }

  function deleteRecord(id) {
    const index = records.findIndex(
      item => item.id === id
    );

    if (index === -1) return false;

    records.splice(index, 1);

    save();

    return true;
  }

  function clearRecords() {
    records = [];
    save();

    return true;
  }

  function getState() {
    if (!activeRace) {
      return {
        active: false,
        status: "stopped"
      };
    }

    return {
      active: true,
      status: activeRace.status,
      id: activeRace.id,
      elapsed: activeRace.elapsed,
      distance: activeRace.distance,
      bestSpeed: activeRace.bestSpeed,
      sampleCount: activeRace.samples.length
    };
  }

  function init() {
    load();

    return api;
  }

  const api = {
    init,
    start,
    sample,
    addEvent,
    recordDistance,
    recordLap,
    recordCheckpoint,
    pause,
    resume,
    finish,
    getActiveRace,
    getState,
    getRecords,
    getRecord,
    getBestRecords,
    deleteRecord,
    clearRecords
  };

  SX.vehicleRaceRecorder = api;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  // Listen to existing game events when available.
  window.addEventListener("sx:lap-completed", event => {
    if (!activeRace || !event.detail) return;

    recordLap(event.detail);
  });

  window.addEventListener("sx:checkpoint-completed", event => {
    if (!activeRace || !event.detail) return;

    recordCheckpoint(
      event.detail.checkpointId || "checkpoint"
    );
  });

})();

/* =========================================================
   END: VEHICLE RACE RECORDER — FILE 92
   ========================================================= */
  
