
/* =========================================================
   SUPERX LEGEND — FILE 93
   FILE: js/vehicle-ghost.js
   START: VEHICLE GHOST SYSTEM
   ========================================================= */

(function () {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_vehicle_ghost_v1";

  let ghostData = null;
  let ghostVehicle = null;
  let playbackIndex = 0;
  let playbackTime = 0;
  let playing = false;
  let visible = true;
  let playbackSpeed = 1;
  let loop = false;

  function number(value, fallback) {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getRecorder() {
    return SX.vehicleRaceRecorder || null;
  }

  function getPosition(sample) {
    const position = sample.position || {};

    return {
      x: number(position.x, number(sample.x, 0)),
      y: number(position.y, number(sample.y, 0)),
      z: number(position.z, number(sample.z, 0))
    };
  }

  function normalizeSamples(samples) {
    if (!Array.isArray(samples)) return [];

    return samples
      .filter(sample => sample && typeof sample === "object")
      .map((sample, index) => ({
        time: number(sample.elapsed, number(sample.time, index * 0.25)),
        position: getPosition(sample),
        rotation: sample.rotation || {
          x: 0,
          y: 0,
          z: 0
        },
        speed: number(sample.speed, 0),
        rpm: number(sample.rpm, 0),
        gear: number(sample.gear, 1),
        steering: number(sample.steering, 0)
      }))
      .sort((a, b) => a.time - b.time);
  }

  function loadFromRecord(recordId) {
    const recorder = getRecorder();

    if (!recorder) {
      return {
        success: false,
        message: "Race recorder is unavailable."
      };
    }

    const record = recorder.getRecord(recordId);

    if (!record || !Array.isArray(record.samples)) {
      return {
        success: false,
        message: "Race recording not found."
      };
    }

    return loadData({
      id: record.id,
      carId: record.carId,
      raceName: record.raceName,
      mapName: record.mapName,
      samples: record.samples
    });
  }

  function loadData(data) {
    if (!data || !Array.isArray(data.samples)) {
      return {
        success: false,
        message: "Invalid ghost recording."
      };
    }

    const samples = normalizeSamples(data.samples);

    if (samples.length < 2) {
      return {
        success: false,
        message: "Ghost needs at least two samples."
      };
    }

    ghostData = {
      id: String(data.id || "ghost_" + Date.now()),
      carId: String(data.carId || "default"),
      raceName: String(data.raceName || "Ghost Race"),
      mapName: String(data.mapName || "Unknown Map"),
      samples
    };

    playbackIndex = 0;
    playbackTime = 0;
    playing = false;

    return {
      success: true,
      sampleCount: samples.length,
      duration: samples[samples.length - 1].time
    };
  }

  function save() {
    if (!ghostData) return false;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(ghostData)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Ghost] Save failed:", error);
      return false;
    }
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return {
          success: false,
          message: "No saved ghost found."
        };
      }

      return loadData(JSON.parse(saved));
    } catch (error) {
      return {
        success: false,
        message: "Could not load saved ghost."
      };
    }
  }

  function setVehicle(vehicle) {
    ghostVehicle = vehicle || null;

    if (ghostVehicle) {
      ghostVehicle.visible = visible;
    }

    return !!ghostVehicle;
  }

  function interpolate(a, b, amount) {
    return a + (b - a) * amount;
  }

  function getInterpolatedSample(time) {
    if (!ghostData || !ghostData.samples.length) {
      return null;
    }

    const samples = ghostData.samples;

    if (time <= samples[0].time) {
      return clone(samples[0]);
    }

    const last = samples[samples.length - 1];

    if (time >= last.time) {
      return clone(last);
    }

    while (
      playbackIndex < samples.length - 2 &&
      samples[playbackIndex + 1].time < time
    ) {
      playbackIndex++;
    }

    while (
      playbackIndex > 0 &&
      samples[playbackIndex].time > time
    ) {
      playbackIndex--;
    }

    const a = samples[playbackIndex];
    const b = samples[playbackIndex + 1];

    const duration = b.time - a.time;

    const t = duration > 0
      ? Math.max(0, Math.min(1, (time - a.time) / duration))
      : 0;

    return {
      time,
      position: {
        x: interpolate(a.position.x, b.position.x, t),
        y: interpolate(a.position.y, b.position.y, t),
        z: interpolate(a.position.z, b.position.z, t)
      },
      rotation: {
        x: interpolate(
          number(a.rotation.x, 0),
          number(b.rotation.x, 0),
          t
        ),
        y: interpolate(
          number(a.rotation.y, 0),
          number(b.rotation.y, 0),
          t
        ),
        z: interpolate(
          number(a.rotation.z, 0),
          number(b.rotation.z, 0),
          t
        )
      },
      speed: interpolate(a.speed, b.speed, t),
      rpm: interpolate(a.rpm, b.rpm, t),
      gear: t < 0.5 ? a.gear : b.gear,
      steering: interpolate(a.steering, b.steering, t)
    };
  }

  function applySample(sample) {
    if (!sample || !ghostVehicle) return false;

    const position = sample.position;
    const rotation = sample.rotation;

    if (ghostVehicle.position && ghostVehicle.position.set) {
      ghostVehicle.position.set(
        position.x,
        position.y,
        position.z
      );
    }

    if (ghostVehicle.rotation && ghostVehicle.rotation.set) {
      ghostVehicle.rotation.set(
        rotation.x,
        rotation.y,
        rotation.z
      );
    }

    ghostVehicle.visible = visible;

    ghostVehicle.userData = ghostVehicle.userData || {};

    ghostVehicle.userData.ghostSpeed = sample.speed;
    ghostVehicle.userData.ghostRPM = sample.rpm;
    ghostVehicle.userData.ghostGear = sample.gear;

    return true;
  }

  function play() {
    if (!ghostData) {
      return {
        success: false,
        message: "Load a ghost recording first."
      };
    }

    playing = true;

    return {
      success: true,
      time: playbackTime
    };
  }

  function pause() {
    playing = false;
    return true;
  }

  function stop() {
    playing = false;
    playbackTime = 0;
    playbackIndex = 0;

    const first = ghostData && ghostData.samples[0];

    if (first) applySample(first);

    return true;
  }

  function seek(seconds) {
    if (!ghostData) return false;

    const last = ghostData.samples[
      ghostData.samples.length - 1
    ];

    playbackTime = Math.max(
      0,
      Math.min(last.time, number(seconds, 0))
    );

    playbackIndex = 0;

    return applySample(
      getInterpolatedSample(playbackTime)
    );
  }

  function update(deltaTime) {
    if (!ghostData || !playing) return null;

    const dt = Math.max(
      0,
      Math.min(0.1, number(deltaTime, 0))
    );

    const last = ghostData.samples[
      ghostData.samples.length - 1
    ];

    playbackTime += dt * playbackSpeed;

    if (playbackTime >= last.time) {
      if (loop) {
        playbackTime = playbackTime % last.time;
        playbackIndex = 0;
      } else {
        playbackTime = last.time;
        playing = false;
      }
    }

    const sample = getInterpolatedSample(playbackTime);

    applySample(sample);

    return sample;
  }

  function setVisible(value) {
    visible = !!value;

    if (ghostVehicle) {
      ghostVehicle.visible = visible;
    }

    return visible;
  }

  function setPlaybackSpeed(value) {
    playbackSpeed = Math.max(
      0.25,
      Math.min(3, number(value, 1))
    );

    return playbackSpeed;
  }

  function setLoop(value) {
    loop = !!value;
    return loop;
  }

  function getState() {
    return {
      loaded: !!ghostData,
      playing,
      visible,
      loop,
      playbackTime,
      playbackSpeed,
      sampleCount: ghostData
        ? ghostData.samples.length
        : 0,
      duration: ghostData
        ? ghostData.samples[ghostData.samples.length - 1].time
        : 0,
      raceName: ghostData ? ghostData.raceName : null,
      mapName: ghostData ? ghostData.mapName : null
    };
  }

  function clear() {
    playing = false;
    playbackTime = 0;
    playbackIndex = 0;
    ghostData = null;
    ghostVehicle = null;

    return true;
  }

  const api = {
    loadFromRecord,
    loadData,
    save,
    loadSaved,
    setVehicle,
    play,
    pause,
    stop,
    seek,
    update,
    setVisible,
    setPlaybackSpeed,
    setLoop,
    getInterpolatedSample,
    getState,
    clear
  };

  SX.vehicleGhost = api;

})();

/* =========================================================
   END: VEHICLE GHOST SYSTEM — FILE 93
   ========================================================= */
    
