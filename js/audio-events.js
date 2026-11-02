
/* =========================================================
   SUPERX LEGEND — FILE 24
   FILE: js/audio-events.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  let initialized = false;
  let listeners = [];

  function play(method) {
    if (!SX.audio || typeof SX.audio[method] !== "function") {
      return;
    }

    SX.audio[method]();
  }

  function listen(target, eventName, handler) {
    target.addEventListener(eventName, handler);

    listeners.push({
      target: target,
      eventName: eventName,
      handler: handler
    });
  }

  function onInteraction(event) {
    const target = event.target.closest(
      "button, [role='button'], .clickable"
    );

    if (!target || target.disabled) return;

    if (
      target.matches(
        "[data-sound='none'], .no-sound"
      )
    ) {
      return;
    }

    const sound = target.dataset.sound;

    if (sound === "success") {
      play("playSuccess");
    } else if (sound === "horn") {
      play("playHorn");
    } else {
      play("playUI");
    }
  }

  function onGameEvent(event) {
    const detail = event.detail || {};

    switch (event.type) {
      case "superx:carStarted":
        play("startEngine");
        break;

      case "superx:carStopped":
        play("stopEngine");
        break;

      case "superx:horn":
        play("playHorn");
        break;

      case "superx:brake":
        play("playBrake");
        break;

      case "superx:collision":
        play("playCollision");
        break;

      case "superx:raceFinished":
      case "superx:mapCompleted":
        play("playSuccess");
        break;

      case "superx:engineUpdate":
        if (SX.audio && SX.audio.updateEngine) {
          SX.audio.updateEngine(
            detail.speed || 0,
            detail.acceleration || 0
          );
        }
        break;
    }
  }

  function onFirstInteraction() {
    if (SX.audio && SX.audio.unlock) {
      SX.audio.unlock();
    }

    window.removeEventListener(
      "pointerdown",
      onFirstInteraction
    );

    window.removeEventListener(
      "keydown",
      onFirstInteraction
    );
  }

  function init() {
    if (initialized) return;

    listen(document, "click", onInteraction);

    const gameEvents = [
      "superx:carStarted",
      "superx:carStopped",
      "superx:horn",
      "superx:brake",
      "superx:collision",
      "superx:raceFinished",
      "superx:mapCompleted",
      "superx:engineUpdate"
    ];

    gameEvents.forEach(function (eventName) {
      listen(document, eventName, onGameEvent);
    });

    window.addEventListener(
      "pointerdown",
      onFirstInteraction,
      { once: true }
    );

    window.addEventListener(
      "keydown",
      onFirstInteraction,
      { once: true }
    );

    initialized = true;
  }

  function dispose() {
    listeners.forEach(function (item) {
      item.target.removeEventListener(
        item.eventName,
        item.handler
      );
    });

    listeners = [];

    window.removeEventListener(
      "pointerdown",
      onFirstInteraction
    );

    window.removeEventListener(
      "keydown",
      onFirstInteraction
    );

    initialized = false;
  }

  SX.audioEvents = {
    init: init,
    dispose: dispose,
    getState: function () {
      return {
        initialized: initialized,
        listeners: listeners.length
      };
    }
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 24
   END
========================================================= */
