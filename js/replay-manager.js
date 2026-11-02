
/* =========================================================
   SUPERX LEGEND — FILE 54
   FILE: js/replay-manager.js
   PURPOSE: Race replay recording and playback data
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    recording: false,
    playing: false,
    samples: [],
    duration: 0,
    startedAt: 0,
    playbackIndex: 0,
    playbackTime: 0,
    playbackSpeed: 1,
    maxDuration: 180,
    sampleInterval: 100,
    lastSampleAt: 0,
    timer: null,
    listeners: new Set()
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
    }));
  }

  function notify() {
    const data = getState();

    state.listeners.forEach(function (callback) {
      try {
        callback(data);
      } catch (error) {
        console.warn("SUPERX replay listener error:", error);
      }
    });
  }

  function number(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function createSample(data) {
    data = data || {};

    return {
      time: Date.now() - state.startedAt,

      position: {
        x: number(data.x, 0),
        y: number(data.y, 0),
        z: number(data.z, 0)
      },

      rotation: {
        x: number(data.rotationX, 0),
        y: number(data.rotationY, 0),
        z: number(data.rotationZ, 0)
      },

      speed: Math.max(0, number(data.speed, 0)),
      rpm: Math.max(0, number(data.rpm, 0)),
      gear: number(data.gear, 1),
      steering: number(data.steering, 0),
      throttle: number(data.throttle, 0),
      brake: number(data.brake, 0),
      distance: Math.max(0, number(data.distance, 0))
    };
  }

  function startRecording(options) {
    options = options || {};

    stopPlayback();

    state.samples = [];
    state.duration = 0;
    state.startedAt = Date.now();
    state.lastSampleAt = 0;
    state.recording = true;

    if (options.maxDuration) {
      state.maxDuration = Math.max(
        10,
        Math.min(600, Number(options.maxDuration))
      );
    }

    emit("sx:replay-recording-started", getState());
    notify();

    return true;
  }

  function record(data) {
    if (!state.recording) return false;

    const now = Date.now();

    if (
      state.lastSampleAt &&
      now - state.lastSampleAt < state.sampleInterval
    ) {
      return false;
    }

    const sample = createSample(data);

    state.samples.push(sample);
    state.lastSampleAt = now;
    state.duration = sample.time;

    if (state.duration >= state.maxDuration * 1000) {
      stopRecording();
    }

    return true;
  }

  function stopRecording() {
    if (!state.recording) return false;

    state.recording = false;

    state.duration = state.samples.length
      ? state.samples[state.samples.length - 1].time
      : 0;

    emit("sx:replay-recording-stopped", getState());
    notify();

    return true;
  }

  function interpolate(a, b, amount) {
    return a + (b - a) * amount;
  }

  function interpolateSample(first, second, amount) {
    const result = {};

    [
      "speed",
      "rpm",
      "gear",
      "steering",
      "throttle",
      "brake",
      "distance"
    ].forEach(function (key) {
      result[key] = interpolate(
        first[key],
        second[key],
        amount
      );
    });

    result.position = {};
    result.rotation = {};

    ["x", "y", "z"].forEach(function (axis) {
      result.position[axis] = interpolate(
        first.position[axis],
        second.position[axis],
        amount
      );

      result.rotation[axis] = interpolate(
        first.rotation[axis],
        second.rotation[axis],
        amount
      );
    });

    return result;
  }

  function getSampleAt(time) {
    if (!state.samples.length) return null;

    const target = Math.max(
      0,
      Math.min(Number(time) || 0, state.duration)
    );

    let low = 0;
    let high = state.samples.length - 1;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);

      if (state.samples[middle].time < target) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    const second = state.samples[low];
    const first = state.samples[Math.max(0, low - 1)];

    if (first === second || second.time === first.time) {
      return JSON.parse(JSON.stringify(second));
    }

    const amount = (
      target - first.time
    ) / (
      second.time - first.time
    );

    return interpolateSample(first, second, amount);
  }

  function startPlayback(options) {
    options = options || {};

    if (!state.samples.length) return false;

    stopRecording();
    stopPlayback();

    state.playing = true;
    state.playbackTime = Math.max(
      0,
      Math.min(Number(options.startTime) || 0, state.duration)
    );

    state.playbackSpeed = Math.max(
      0.25,
      Math.min(4, Number(options.speed) || 1)
    );

    state.playbackIndex = 0;

    emit("sx:replay-playback-started", getState());
    notify();

    return true;
  }

  function updatePlayback(deltaTime) {
    if (!state.playing) return null;

    const delta = Math.max(0, number(deltaTime, 0));

    state.playbackTime +=
      delta * 1000 * state.playbackSpeed;

    if (state.playbackTime >= state.duration) {
      state.playbackTime = state.duration;

      const finalSample = getSampleAt(state.playbackTime);

      stopPlayback();

      emit("sx:replay-playback-finished", {
        sample: finalSample
      });

      return finalSample;
    }

    const sample = getSampleAt(state.playbackTime);

    emit("sx:replay-frame", {
      time: state.playbackTime,
      sample
    });

    return sample;
  }

  function pausePlayback() {
    if (!state.playing) return false;

    state.playing = false;
    emit("sx:replay-playback-paused", getState());
    notify();

    return true;
  }

  function resumePlayback() {
    if (state.playing || !state.samples.length) {
      return false;
    }

    state.playing = true;

    emit("sx:replay-playback-resumed", getState());
    notify();

    return true;
  }

  function stopPlayback() {
    if (!state.playing) return false;

    state.playing = false;
    state.playbackIndex = 0;

    emit("sx:replay-playback-stopped", getState());
    notify();

    return true;
  }

  function seek(time) {
    if (!state.samples.length) return null;

    state.playbackTime = Math.max(
      0,
      Math.min(Number(time) || 0, state.duration)
    );

    const sample = getSampleAt(state.playbackTime);

    emit("sx:replay-seek", {
      time: state.playbackTime,
      sample
    });

    notify();

    return sample;
  }

  function setPlaybackSpeed(speed) {
    state.playbackSpeed = Math.max(
      0.25,
      Math.min(4, number(speed, 1))
    );

    notify();
    return state.playbackSpeed;
  }

  function exportReplay() {
    return {
      version: 1,
      game: "SUPERX LEGEND",
      createdAt: new Date().toISOString(),
      duration: state.duration,
      sampleCount: state.samples.length,
      samples: state.samples.map(function (sample) {
        return JSON.parse(JSON.stringify(sample));
      })
    };
  }

  function importReplay(data) {
    if (
      !data ||
      data.game !== "SUPERX LEGEND" ||
      !Array.isArray(data.samples) ||
      data.samples.length > 20000
    ) {
      return false;
    }

    const valid = data.samples.every(function (sample) {
      return (
        sample &&
        Number.isFinite(sample.time) &&
        sample.position &&
        sample.rotation
      );
    });

    if (!valid) return false;

    stopRecording();
    stopPlayback();

    state.samples = data.samples.map(function (sample) {
      return JSON.parse(JSON.stringify(sample));
    });

    state.duration = state.samples.length
      ? state.samples[state.samples.length - 1].time
      : 0;

    emit("sx:replay-imported", getState());
    notify();

    return true;
  }

  function clear() {
    stopRecording();
    stopPlayback();

    state.samples = [];
    state.duration = 0;
    state.playbackTime = 0;

    emit("sx:replay-cleared");
    notify();
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      return function () {};
    }

    state.listeners.add(callback);

    return function unsubscribe() {
      state.listeners.delete(callback);
    };
  }

  function getState() {
    return {
      recording: state.recording,
      playing: state.playing,
      sampleCount: state.samples.length,
      duration: state.duration,
      playbackTime: state.playbackTime,
      playbackSpeed: state.playbackSpeed,
      progress: state.duration > 0
        ? Math.round(
            state.playbackTime / state.duration * 100
          )
        : 0
    };
  }

  SX.replayManager = {
    startRecording,
    record,
    stopRecording,
    startPlayback,
    updatePlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    seek,
    setPlaybackSpeed,
    getSampleAt,
    exportReplay,
    importReplay,
    clear,
    subscribe,
    getState
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 54 END
   ========================================================= */
               
