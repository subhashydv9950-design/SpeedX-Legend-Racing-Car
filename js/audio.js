
/* ========================================
   SUPERX LEGEND RACING CAR
   PART 12 — ENGINE & SOUND SYSTEM
======================================== */

(function () {
  "use strict";

  let audioContext = null;
  let engineOscillator = null;
  let engineGain = null;
  let masterGain = null;
  let audioEnabled = true;
  let engineRunning = false;

  function initAudio() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return false;

    if (!audioContext) {
      audioContext = new AudioContextClass();

      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(audioContext.destination);

      engineOscillator = audioContext.createOscillator();
      engineOscillator.type = "sawtooth";
      engineOscillator.frequency.value = 45;

      engineGain = audioContext.createGain();
      engineGain.gain.value = 0;

      engineOscillator.connect(engineGain);
      engineGain.connect(masterGain);
      engineOscillator.start();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return true;
  }

  function setEnabled(enabled) {
    audioEnabled = Boolean(enabled);

    if (masterGain && audioContext) {
      masterGain.gain.setTargetAtTime(
        audioEnabled ? 0.35 : 0,
        audioContext.currentTime,
        0.08
      );
    }
  }

  function startEngine() {
    if (!initAudio()) return;

    engineRunning = true;
    engineGain.gain.setTargetAtTime(
      audioEnabled ? 0.055 : 0,
      audioContext.currentTime,
      0.25
    );
  }

  function stopEngine() {
    if (!audioContext || !engineGain) return;

    engineRunning = false;
    engineGain.gain.setTargetAtTime(
      0,
      audioContext.currentTime,
      0.12
    );
  }

  function updateEngine(speed, rpm) {
    if (!audioContext || !engineOscillator || !engineRunning) return;

    const safeRPM = Math.max(800, Math.min(9000, Number(rpm) || 800));
    const frequency = 35 + safeRPM / 55;

    engineOscillator.frequency.setTargetAtTime(
      frequency,
      audioContext.currentTime,
      0.08
    );

    const volume = Math.min(
      0.12,
      0.025 + Math.max(0, Number(speed) || 0) / 1500
    );

    engineGain.gain.setTargetAtTime(
      audioEnabled ? volume : 0,
      audioContext.currentTime,
      0.1
    );
  }

  function playTone(frequency, duration, volume, type) {
    if (!audioEnabled || !initAudio()) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type || "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume || 0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function horn() {
    if (!initAudio() || !audioEnabled) return;

    playTone(390, 0.35, 0.12, "sawtooth");
    playTone(490, 0.35, 0.09, "square");
  }

  function collision() {
    playTone(90, 0.25, 0.18, "sawtooth");
    playTone(55, 0.4, 0.12, "triangle");
  }

  function gearShift() {
    playTone(180, 0.12, 0.07, "triangle");
  }

  function buttonSound() {
    playTone(620, 0.07, 0.035, "sine");
  }

  // Connect existing buttons if they are present.
  document.addEventListener("DOMContentLoaded", function () {
    const hornButton = document.getElementById("hornBtn");
    const musicButton = document.getElementById("musicBtn");

    if (hornButton) {
      hornButton.addEventListener("click", horn);
    }

    if (musicButton) {
      musicButton.addEventListener("click", function () {
        setEnabled(!audioEnabled);
        musicButton.textContent = audioEnabled ? "🔊" : "🔇";
      });
    }

    // Browsers require an interaction before audio can start.
    document.addEventListener("pointerdown", function unlockAudio() {
      initAudio();
      document.removeEventListener("pointerdown", unlockAudio);
    }, { once: true });
  });

  window.SuperXAudio = {
    init: initAudio,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    toggle: () => setEnabled(!audioEnabled),
    startEngine,
    stopEngine,
    updateEngine,
    horn,
    collision,
    gearShift,
    buttonSound,
    isEnabled: () => audioEnabled
  };

})();

/* ========== END OF PART 12 ========== */
