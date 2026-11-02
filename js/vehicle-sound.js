
/* =========================================================
   SUPERX LEGEND — FILE 70
   FILE: js/vehicle-sound.js
   PURPOSE: Vehicle engine, acceleration, braking and gear sounds
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VehicleSound = {
    context: null,
    masterGain: null,
    engineGain: null,
    engineOscillator: null,
    engineFilter: null,

    initialized: false,
    engineRunning: false,
    enabled: true,
    volume: 0.65,

    speed: 0,
    rpm: 900,
    gear: 1,
    throttle: 0,
    brake: 0,

    lastShiftTime: 0,

    init(options = {}) {
      if (this.initialized) return true;

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return false;

      try {
        this.context = new AudioContext();

        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.volume;

        this.engineGain = this.context.createGain();
        this.engineGain.gain.value = 0;

        this.engineFilter = this.context.createBiquadFilter();
        this.engineFilter.type = "lowpass";
        this.engineFilter.frequency.value = 1200;

        this.engineOscillator = this.context.createOscillator();
        this.engineOscillator.type = "sawtooth";
        this.engineOscillator.frequency.value = 45;

        this.engineOscillator.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);

        this.engineOscillator.start();

        this.initialized = true;

        if (options.autoStart) {
          this.startEngine();
        }

        return true;
      } catch (error) {
        console.warn("SUPERX vehicle sound:", error);
        this.destroy();
        return false;
      }
    },

    async unlock() {
      if (!this.initialized && !this.init()) {
        return false;
      }

      try {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }

        return true;
      } catch (error) {
        return false;
      }
    },

    startEngine() {
      if (!this.initialized && !this.init()) {
        return false;
      }

      this.unlock();

      this.engineRunning = true;

      this.engineGain.gain.setTargetAtTime(
        this.enabled ? 0.18 : 0,
        this.context.currentTime,
        0.15
      );

      this.updateEngine();
      return true;
    },

    stopEngine() {
      if (!this.initialized) return;

      this.engineRunning = false;

      this.engineGain.gain.setTargetAtTime(
        0,
        this.context.currentTime,
        0.2
      );
    },

    update(data = {}) {
      if (Number.isFinite(data.speed)) {
        this.speed = Math.max(0, data.speed);
      }

      if (Number.isFinite(data.rpm)) {
        this.rpm = Math.max(700, data.rpm);
      }

      if (Number.isFinite(data.gear)) {
        this.gear = data.gear;
      }

      if (Number.isFinite(data.throttle)) {
        this.throttle = Math.max(
          0,
          Math.min(1, data.throttle)
        );
      }

      if (Number.isFinite(data.brake)) {
        this.brake = Math.max(
          0,
          Math.min(1, data.brake)
        );
      }

      this.updateEngine();
    },

    updateEngine() {
      if (!this.initialized || !this.engineRunning) {
        return;
      }

      const time = this.context.currentTime;

      const normalizedRPM = Math.max(
        0,
        Math.min(1, (this.rpm - 700) / 6500)
      );

      const frequency = 35 + normalizedRPM * 190;

      this.engineOscillator.frequency.setTargetAtTime(
        frequency,
        time,
        0.06
      );

      this.engineFilter.frequency.setTargetAtTime(
        450 + normalizedRPM * 2200,
        time,
        0.08
      );

      const engineVolume = this.enabled
        ? 0.10 + normalizedRPM * 0.17 + this.throttle * 0.08
        : 0;

      this.engineGain.gain.setTargetAtTime(
        engineVolume,
        time,
        0.08
      );
    },

    playTone(frequency, duration, volume = 0.2, type = "sine") {
      if (!this.initialized || !this.enabled) return;

      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(
        0.0001,
        this.context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        volume,
        this.context.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.context.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(this.masterGain);

      oscillator.start();
      oscillator.stop(
        this.context.currentTime + duration + 0.03
      );

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },

    gearShift(newGear) {
      const now = Date.now();

      if (now - this.lastShiftTime < 180) return;

      this.lastShiftTime = now;

      const direction = newGear > this.gear ? 1 : -1;

      this.gear = newGear;

      this.playTone(
        direction > 0 ? 145 : 95,
        0.12,
        0.12,
        "triangle"
      );

      this.dispatch("gear-shift", {
        gear: newGear,
        direction
      });
    },

    playBrake() {
      this.playTone(110, 0.16, 0.08, "triangle");
    },

    playSkid() {
      this.playTone(520, 0.35, 0.09, "sawtooth");
    },

    playCollision(intensity = 1) {
      const level = Math.max(
        0.05,
        Math.min(0.35, intensity * 0.15)
      );

      this.playTone(65, 0.25, level, "square");
    },

    playHorn() {
      if (!this.initialized || !this.enabled) return;

      this.playTone(440, 0.35, 0.16, "sawtooth");
      this.playTone(554, 0.35, 0.13, "sawtooth");
    },

    setVolume(value) {
      this.volume = Math.max(
        0,
        Math.min(1, Number(value) || 0)
      );

      if (this.masterGain && this.context) {
        this.masterGain.gain.setTargetAtTime(
          this.volume,
          this.context.currentTime,
          0.05
        );
      }

      return this.volume;
    },

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (this.engineGain && this.context) {
        this.engineGain.gain.setTargetAtTime(
          this.enabled && this.engineRunning ? 0.18 : 0,
          this.context.currentTime,
          0.1
        );
      }

      return this.enabled;
    },

    toggle() {
      return this.setEnabled(!this.enabled);
    },

    dispatch(name, detail) {
      window.dispatchEvent(
        new CustomEvent(`sx:vehicle-sound-${name}`, {
          detail
        })
      );
    },

    getState() {
      return {
        initialized: this.initialized,
        engineRunning: this.engineRunning,
        enabled: this.enabled,
        volume: this.volume,
        speed: this.speed,
        rpm: this.rpm,
        gear: this.gear
      };
    },

    destroy() {
      try {
        if (this.engineOscillator) {
          this.engineOscillator.stop();
          this.engineOscillator.disconnect();
        }

        if (this.context && this.context.state !== "closed") {
          this.context.close();
        }
      } catch (error) {
        // Audio context may already be closed.
      }

      this.context = null;
      this.masterGain = null;
      this.engineGain = null;
      this.engineOscillator = null;
      this.engineFilter = null;

      this.initialized = false;
      this.engineRunning = false;
    }
  };

  SX.vehicleSound = VehicleSound;

  // Unlock audio after the player's first interaction.
  document.addEventListener("pointerdown", () => {
    if (!VehicleSound.initialized) {
      VehicleSound.init();
    }

    VehicleSound.unlock();
  }, { once: true });

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 70
   FILE: js/vehicle-sound.js
   END
========================================================= */
