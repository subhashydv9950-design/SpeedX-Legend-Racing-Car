/* =========================================
   SUPERX LEGEND RACING CAR
   PART 23 — COMPLETE AUDIO SYSTEM
   FILE: js/audio.js
========================================= */

(() => {
  "use strict";

  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let musicTimer = null;

  const settings = {
    sound: true,
    music: false,
    engine: false,
    volume: 0.65
  };

  function initializeAudio() {
    if (context) {
      if (context.state === "suspended") context.resume();
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    context = new AudioContextClass();

    master = context.createGain();
    master.gain.value = settings.volume;
    master.connect(context.destination);
  }

  function tone(frequency, duration, type = "sine", volume = 0.2) {
    if (!settings.sound) return;

    initializeAudio();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(master);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function startEngine() {
    initializeAudio();

    if (!context || engineOsc) return;

    engineOsc = context.createOscillator();
    engineGain = context.createGain();
    engineFilter = context.createBiquadFilter();

    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 55;

    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 180;

    engineGain.gain.value = 0.001;

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    engineOsc.start();

    settings.engine = true;
  }

  function updateEngine(speed = 0, rpm = 900) {
    if (!engineOsc || !context || !settings.engine) return;

    const frequency = 45 + Math.max(0, speed) * 1.1;

    engineOsc.frequency.setTargetAtTime(
      frequency,
      context.currentTime,
      0.08
    );

    engineFilter.frequency.setTargetAtTime(
      Math.min(900, 120 + rpm * 0.12),
      context.currentTime,
      0.08
    );

    engineGain.gain.setTargetAtTime(
      settings.sound ? 0.07 : 0,
      context.currentTime,
      0.08
    );
  }

  function stopEngine() {
    if (!engineOsc) return;

    try {
      engineOsc.stop();
      engineOsc.disconnect();
      engineGain.disconnect();
      engineFilter.disconnect();
    } catch (error) {}

    engineOsc = null;
    engineGain = null;
    engineFilter = null;

    settings.engine = false;
  }

  function playHorn() {
    tone(390, 0.45, "sawtooth", 0.3);
  }

  function playCollision() {
    tone(90, 0.25, "triangle", 0.35);
    setTimeout(() => tone(55, 0.2, "sawtooth", 0.2), 100);
  }

  function playGear() {
    tone(420, 0.08, "square", 0.12);
  }

  function playButton() {
    tone(650, 0.06, "sine", 0.1);
  }

  function playBrake() {
    tone(170, 0.12, "triangle", 0.12);
  }

  function setVolume(value) {
    settings.volume = Math.max(
      0,
      Math.min(1, Number(value))
    );

    if (master) {
      master.gain.setTargetAtTime(
        settings.volume,
        context.currentTime,
        0.05
      );
    }
  }

  function setSound(enabled) {
    settings.sound = Boolean(enabled);

    if (!settings.sound) {
      stopEngine();
    } else {
      const physics = window.SuperXPhysics?.state;
      if (physics?.running) {
        startEngine();
      }
    }
  }

  function setMusic(enabled) {
    settings.music = Boolean(enabled);

    if (!settings.music) {
      stopMusic();
      return;
    }

    startMusic();
  }

  function startMusic() {
    initializeAudio();

    if (!context || musicTimer) return;

    const notes = [261, 329, 392, 329, 293, 349, 440, 349];
    let index = 0;

    musicTimer = setInterval(() => {
      if (!settings.music || !settings.sound) return;

      tone(notes[index % notes.length], 0.3, "sine", 0.045);
      index++;
    }, 420);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function toggleSound() {
    setSound(!settings.sound);
  }

  function toggleMusic() {
    setMusic(!settings.music);
  }

  // Update engine from existing physics state.
  let previousGear = null;

  function audioLoop() {
    const physics = window.SuperXPhysics?.state;

    if (physics && settings.engine) {
      updateEngine(physics.speed, physics.rpm);

      if (
        previousGear !== null &&
        previousGear !== physics.gear
      ) {
        playGear();
      }

      previousGear = physics.gear;
    }

    requestAnimationFrame(audioLoop);
  }

  window.SuperXAudio = {
    initializeAudio,
    startEngine,
    stopEngine,
    updateEngine,
    playHorn,
    playCollision,
    playGear,
    playButton,
    playBrake,
    setVolume,
    setSound,
    setMusic,
    toggleSound,
    toggleMusic,
    getSettings: () => ({ ...settings })
  };

  window.addEventListener("pointerdown", initializeAudio, {
    once: true
  });

  requestAnimationFrame(audioLoop);

})();

/* =========================================
   PART 23 END
========================================= */

