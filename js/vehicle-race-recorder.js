/* =========================================================
   SUPERX LEGEND — FILE 92
   FILE: js/vehicle-race-recorder.js
   START: VEHICLE RACE RECORDER
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_recorder_v2";
  const MAX_RECORDS = 100;
  const MAX_SAMPLES = 3600;
  const SAMPLE_INTERVAL = 250;

  let activeRace = null;
  let records = [];
  let sampleTimer = null;

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
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
      speed: number(telemetry.speed),
      rpm: number(telemetry.rpm),
      gear: number(transmission.gear, 1),
      throttle: number(telemetry.throttle),
      brake: number(telemetry.brake),
      steering: number(telemetry.steering)
    };
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(records.slice(0, MAX_RECORDS))
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      records = Array.isArray(saved)
        ? saved
            .filter(item => item && typeof item === "object")
            .slice(0, MAX_RECORDS)
        : [];
    } catch (_) {
      records = [];
    }
  }

  function stopSampling() {
    if (sampleTimer !== null) {
      clearInterval(sampleTimer);
      sampleTimer = null;
    }
  }

  function startSampling() {
    stopSampling();

    sampleTimer = setInterval(function () {
      if (activeRace && activeRace.status === "recording") {
        sample(false);
      }
    }, SAMPLE_INTERVAL);
  }

  function start(options = {}) {
    if (activeRace) {
      return {
        success: false,
        message: "Race recording is already active."
      };
    }

    activeRace = {
      id: "race_record_" + Date.now(),
      carId: getCarId(),
      raceName: String(options.raceName || "Free Race").slice(0, 80),
      mapName: String(options.mapName || "Unknown Map").slice(0, 80),
      startedAt: Date.now(),
      elapsed: 0,
      distance: 0,
      bestSpeed: 0,
      maximumRPM: 0,
      samples: [],
      events: [],
      laps: [],
      status: "recording",
      lastSampleAt: 0,
      pausedDuration: 0,
      pausedAt: 0
    };

    addEvent("race_started", {
      raceName: activeRace.raceName,
      mapName: activeRace.mapName
    });

    startSampling();

    emit("sx:race-recording-started", {
      id: activeRace.id,
      carId: activeRace.carId
    });

    sample(true);

    return {
      success: true,
      id: activeRace.id
    };
  }

  function addEvent(type, detail = {}) {
    if (!activeRace) return false;

    activeRace.events.push({
      type: String(type || "event"),
      detail: clone(detail) || {},
      time: Date.now(),
      elapsed: activeRace.elapsed
    });

    if (activeRace.events.length > 1000) {
      activeRace.events.shift();
    }

    return true;
  }

  function sample(force = false) {
    if (!activeRace || activeRace.status !== "recording") {
      return false;
    }

    const now = Date.now();

    if (
      !force &&
      now - activeRace.lastSampleAt < SAMPLE_INTERVAL
    ) {
      return false;
    }

    const vehicle = getVehicleSnapshot();
    const elapsed = Math.max(
      0,
      (now - activeRace.startedAt - activeRace.pausedDuration) / 1000
    );

    const sampleData = {
      time: now,
      elapsed,
      ...vehicle
    };

    activeRace.samples.push(sampleData);
    activeRace.lastSampleAt = now;
    activeRace.elapsed = elapsed;

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
    if (!activeRace || activeRace.status !== "recording") {
      return false;
    }

    const amount = number(kilometres);

    if (amount <= 0) return false;

    activeRace.distance += amount;

    addEvent("distance_recorded", {
      kilometres: amount
    });

    return activeRace.distance;
  }

  function recordLap(lapData = {}) {
    if (!activeRace) return false;

    const lap = {
      number: activeRace.laps.length + 1,
      time: Math.max(0, number(lapData.milliseconds)),
      position: number(lapData.position),
      timestamp: Date.now()
    };

    activeRace.laps.push(lap);
    addEvent("lap_completed", lap);

    return { ...lap };
  }

  function recordCheckpoint(checkpointId) {
    return addEvent("checkpoint_completed", {
      checkpointId: String(checkpointId ?? "checkpoint")
    });
  }

  function pause() {
    if (!activeRace || activeRace.status !== "recording") {
      return false;
    }

    sample(true);
    activeRace.status = "paused";
    activeRace.pausedAt = Date.now();

    addEvent("race_paused");

    emit("sx:race-recording-paused", {
      id: activeRace.id
    });

    return true;
  }

  function resume() {
    if (!activeRace || activeRace.status !== "paused") {
      return false;
    }

    const now = Date.now();

    activeRace.pausedDuration += Math.max(
      0,
      now - activeRace.pausedAt
    );

    activeRace.pausedAt = 0;
    activeRace.status = "recording";

    addEvent("race_resumed");
    startSampling();

    emit("sx:race-recording-resumed", {
      id: activeRace.id
    });

    return true;
  }

  function createSummary(race, status) {
    const samples = race.samples || [];

    const totalSpeed = samples.reduce(
      (sum, item) => sum + number(item.speed),
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

  function finish(options = {}) {
    if (!activeRace) {
      return {
        success: false,
        message: "No active race recording."
      };
    }

    if (activeRace.status === "recording") {
      sample(true);
    } else if (activeRace.status === "paused") {
      activeRace.pausedDuration += Math.max(
        0,
        Date.now() - activeRace.pausedAt
      );
      activeRace.pausedAt = 0;
    }

    stopSampling();

    const finalStatus = options.status === "abandoned"
      ? "abandoned"
      : "completed";

    activeRace.status = finalStatus;
    activeRace.elapsed = Math.max(
      0,
      (Date.now() - activeRace.startedAt - activeRace.pausedDuration) / 1000
    );

    addEvent("race_finished", {
      status: finalStatus
    });

    const summary = createSummary(activeRace, finalStatus);

    const result = {
      ...summary,
      samples: clone(activeRace.samples) || [],
      events: clone(activeRace.events) || [],
      laps: clone(activeRace.laps) || []
    };

    records.unshift(result);

    if (records.length > MAX_RECORDS) {
      records.length = MAX_RECORDS;
    }

    activeRace = null;
    save();

    emit("sx:race-recording-finished", summary);

    return {
      success: true,
      summary
    };
  }

  function getActiveRace() {
    return activeRace ? clone(activeRace) : null;
  }

  function getRecords(limit) {
    const count = Number.isInteger(limit) && limit > 0
      ? limit
      : records.length;

    return clone(records.slice(0, count)) || [];
  }

  function getRecord(id) {
    const record = records.find(item => item.id === id);
    return record ? clone(record) : null;
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
      ...records.map(item => number(item.bestSpeed))
    );

    const longestDistance = Math.max(
      ...records.map(item => number(item.distance))
    );

    const fastestRace = records
      .filter(item => item.status === "completed")
      .slice()
      .sort((a, b) => number(a.duration) - number(b.duration))[0] || null;

    return {
      fastestSpeed,
      longestDistance,
      fastestRace: clone(fastestRace)
    };
  }

  function deleteRecord(id) {
    const index = records.findIndex(item => item.id === id);

    if (index < 0) return false;

    records.splice(index, 1);
    save();

    emit("sx:race-record-deleted", { id });

    return true;
  }

  function clearRecords() {
    records = [];
    save();

    emit("sx:race-records-cleared");

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
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

  window.addEventListener("sx:lap-completed", event => {
    if (activeRace && event.detail) {
      recordLap(event.detail);
    }
  });

  window.addEventListener("sx:checkpoint-completed", event => {
    if (activeRace && event.detail) {
      recordCheckpoint(
        event.detail.checkpointId || "checkpoint"
      );
    }
  });

})();

/* =========================================================
   END: VEHICLE RACE RECORDER — FILE 92
   ========================================================= */
         
