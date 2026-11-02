
/* =========================================================
   SUPERX LEGEND — FILE 23
   FILE: js/audio.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  let context = null;
  let masterGain = null;
  let musicGain = null;
  let effectsGain = null;

  let musicEnabled = true;
  let effectsEnabled = true;
  let musicVolume = 0.35;
  let effectsVolume = 0.75;

  let engineOscillator = null;
  let engineGain = null;
  let engineFilter = null;
  let engineRunning = false;

  let initialized = false;
  let unlocked = false;

  function createAudioContext() {
    if (context) return true;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn("SUPERX Audio: Web Audio API unavailable.");
      return false;
    }

    context = new AudioContextClass();

    masterGain = context.createGain();
    musicGain = context.createGain();
    effectsGain = context.createGain();

    musicGain.connect(masterGain);
    effectsGain.connect(masterGain);
    masterGain.connect(context.destination);

    updateVolumes();

    initialized = true;
    return true;
  }

  async function unlock() {
    if (!createAudioContext()) return false;

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      unlocked = context.state === "running";
      return unlocked;
    } catch (error) {
      console.warn("SUPERX Audio unlock failed:", error);
      return false;
    }
  }

  function updateVolumes() {
    if (!context || !musicGain || !effectsGain) return;

    musicGain.gain.setTargetAtTime(
      musicEnabled ? musicVolume : 0,
      context.currentTime,
      0.05
    );

    effectsGain.gain.setTargetAtTime(
      effectsEnabled ? effectsVolume : 0,
      context.currentTime,
      0.05
    );
  }

  function createTone(frequency, duration, type, volume, destination) {
    if (!context || !unlocked) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime
    );

    gain.gain.setValueAtTime(
      Math.max(0.0001, volume || 0.1),
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(destination || effectsGain);

    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  function playUI() {
    createTone(620, 0.08, "sine", 0.12);
  }

  function playSuccess() {
    if (!context || !unlocked) return;

    createTone(520, 0.14, "sine", 0.13);
    setTimeout(function () {
      createTone(780, 0.18, "sine", 0.13);
    }, 110);
  }

  function playHorn() {
    if (!context || !unlocked) return;

    createTone(390, 0.35, "square", 0.13);
    createTone(480, 0.35, "square", 0.10);
  }

  function playBrake() {
    createTone(150, 0.16, "sawtooth", 0.07);
  }

  function playCollision() {
    if (!context || !unlocked) return;

    const bufferSize = context.sampleRate * 0.22;
    const buffer = context.createBuffer(
      1,
      bufferSize,
      context.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    gain.gain.value = 0.22;

    source.connect(gain);
    gain.connect(effectsGain);
    source.start();
  }

  function startEngine() {
    if (!createAudioContext() || !unlocked || engineRunning) return;

    engineOscillator = context.createOscillator();
    engineFilter = context.createBiquadFilter();
    engineGain = context.createGain();

    engineOscillator.type = "sawtooth";
    engineOscillator.frequency.value = 65;

    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 350;

    engineGain.gain.value = 0.025;

    engineOscillator.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(effectsGain);

    engineOscillator.start();
    engineRunning = true;
  }

  function updateEngine(speed, acceleration) {
    if (!engineRunning || !context) return;

    const normalizedSpeed = Math.max(
      0,
      Math.min(1, (Number(speed) || 0) / 520)
    );

    const throttle = Math.max(
      0,
      Math.min(1, Number(acceleration) || 0)
    );

    const frequency = 55 + normalizedSpeed * 190 + throttle * 65;

    engineOscillator.frequency.setTargetAtTime(
      frequency,
      context.currentTime,
      0.08
    );

    engineFilter.frequency.setTargetAtTime(
      250 + normalizedSpeed * 850,
      context.currentTime,
      0.08
    );

    engineGain.gain.setTargetAtTime(
      0.018 + normalizedSpeed * 0.035,
      context.currentTime,
      0.08
    );
  }

  function stopEngine() {
    if (!engineRunning) return;

    try {
      engineOscillator.stop();
      engineOscillator.disconnect();
      engineFilter.disconnect();
      engineGain.disconnect();
    } catch (error) {
      // Audio nodes may already be stopped.
    }

    engineOscillator = null;
    engineFilter = null;
    engineGain = null;
    engineRunning = false;
  }

  function setMusicEnabled(enabled) {
    musicEnabled = !!enabled;
    updateVolumes();
  }

  function setEffectsEnabled(enabled) {
    effectsEnabled = !!enabled;
    updateVolumes();
  }

  function setMusicVolume(value) {
    musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    updateVolumes();
  }

  function setEffectsVolume(value) {
    effectsVolume = Math.max(0, Math.min(1, Number(value) || 0));
    updateVolumes();
  }

  function getState() {
    return {
      initialized: initialized,
      unlocked: unlocked,
      musicEnabled: musicEnabled,
      effectsEnabled: effectsEnabled,
      musicVolume: musicVolume,
      effectsVolume: effectsVolume,
      engineRunning: engineRunning
    };
  }

  function dispose() {
    stopEngine();

    if (context) {
      context.close();
    }

    context = null;
    masterGain = null;
    musicGain = null;
    effectsGain = null;
    initialized = false;
    unlocked = false;
  }

  SX.audio = {
    unlock: unlock,
    playUI: playUI,
    playSuccess: playSuccess,
    playHorn: playHorn,
    playBrake: playBrake,
    playCollision: playCollision,
    startEngine: startEngine,
    updateEngine: updateEngine,
    stopEngine: stopEngine,
    setMusicEnabled: setMusicEnabled,
    setEffectsEnabled: setEffectsEnabled,
    setMusicVolume: setMusicVolume,
    setEffectsVolume: setEffectsVolume,
    getState: getState,
    dispose: dispose
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 23
   END
========================================================= */
