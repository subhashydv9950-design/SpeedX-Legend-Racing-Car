
/* =========================================================
   SUPERX LEGEND — FILE 25
   FILE: js/hud.js
   START
========================================================= */

(function () {
  "use strict";

  window.SUPERX = window.SUPERX || {};
  const SX = window.SUPERX;

  const SELECTORS = {
    speed: ["#hudSpeed", "#speedValue", "[data-hud='speed']"],
    gear: ["#hudGear", "#gearValue", "[data-hud='gear']"],
    rpm: ["#hudRPM", "#rpmValue", "[data-hud='rpm']"],
    timer: ["#hudTimer", "#raceTimer", "[data-hud='timer']"],
    distance: ["#hudDistance", "[data-hud='distance']"],
    progress: ["#hudProgress", "[data-hud='progress']"],
    progressBar: ["#hudProgressBar", "[data-hud='progress-bar']"],
    pause: ["#pauseGameBtn", "#hudPauseBtn"],
    camera: ["#cameraSwitchBtn", "#hudCameraBtn"],
    minimap: ["#miniMapCanvas", "#hudMinimap"]
  };

  let elements = {};
  let initialized = false;
  let paused = false;
  let startTime = 0;
  let elapsedTime = 0;
  let lastFrame = 0;
  let animationFrame = null;

  let mapContext = null;
  let mapPoints = [];
  let playerPosition = { x: 0, z: 0 };
  let playerRotation = 0;

  function findElement(selectors) {
    for (let i = 0; i < selectors.length; i++) {
      const element = document.querySelector(selectors[i]);
      if (element) return element;
    }
    return null;
  }

  function cacheElements() {
    Object.keys(SELECTORS).forEach(function (key) {
      elements[key] = findElement(SELECTORS[key]);
    });

    if (elements.minimap) {
      mapContext = elements.minimap.getContext("2d");
    }
  }

  function setText(element, value) {
    if (element) element.textContent = String(value);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const remaining = Math.floor(safe % 60);
    const milliseconds = Math.floor((safe % 1) * 100);

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remaining).padStart(2, "0") +
      "." +
      String(milliseconds).padStart(2, "0")
    );
  }

  function updateSpeed(speed) {
    const value = Math.max(0, Math.round(Number(speed) || 0));
    setText(elements.speed, value);

    if (elements.speed) {
      elements.speed.setAttribute("aria-label", value + " kilometers per hour");
    }
  }

  function updateGear(gear) {
    const value = gear === "R" || gear === "N"
      ? gear
      : Math.max(1, Math.round(Number(gear) || 1));

    setText(elements.gear, value);
  }

  function updateRPM(rpm) {
    const value = Math.max(0, Math.round(Number(rpm) || 0));
    setText(elements.rpm, value);

    if (elements.rpm) {
      elements.rpm.style.setProperty(
        "--rpm-level",
        Math.min(1, value / 9000)
      );
    }
  }

  function updateProgress(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));

    setText(elements.progress, Math.round(value) + "%");

    if (elements.progressBar) {
      elements.progressBar.style.width = value + "%";
      elements.progressBar.setAttribute("aria-valuenow", String(value));
    }
  }

  function updateDistance(distance) {
    const value = Math.max(0, Number(distance) || 0);

    setText(
      elements.distance,
      value >= 1000
        ? (value / 1000).toFixed(2) + " km"
        : Math.round(value) + " m"
    );
  }

  function updateTimer(seconds) {
    elapsedTime = Math.max(0, Number(seconds) || 0);
    setText(elements.timer, formatTime(elapsedTime));
  }

  function update(data) {
    if (!initialized || !data) return;

    if (data.speed !== undefined) updateSpeed(data.speed);
    if (data.gear !== undefined) updateGear(data.gear);
    if (data.rpm !== undefined) updateRPM(data.rpm);

    if (data.progress !== undefined) {
      updateProgress(data.progress);
    }

    if (data.distance !== undefined) {
      updateDistance(data.distance);
    }

    if (data.elapsedTime !== undefined) {
      updateTimer(data.elapsedTime);
    }

    if (data.position) {
      playerPosition.x = Number(data.position.x) || 0;
      playerPosition.z = Number(data.position.z) || 0;
    }

    if (data.rotation !== undefined) {
      playerRotation = Number(data.rotation) || 0;
    }

    if (data.mapPoints) {
      setMapPoints(data.mapPoints);
    }

    drawMinimap();
  }

  function setMapPoints(points) {
    if (!Array.isArray(points)) return;

    mapPoints = points.filter(function (point) {
      return point &&
        Number.isFinite(Number(point.x)) &&
        Number.isFinite(Number(point.z));
    });
  }

  function drawMinimap() {
    if (!mapContext || !elements.minimap) return;

    const canvas = elements.minimap;
    const ctx = mapContext;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(9, 10, 20, 0.92)";
    ctx.fillRect(0, 0, width, height);

    if (mapPoints.length > 1) {
      const xs = mapPoints.map(function (p) { return Number(p.x); });
      const zs = mapPoints.map(function (p) { return Number(p.z); });

      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minZ = Math.min.apply(null, zs);
      const maxZ = Math.max.apply(null, zs);

      const rangeX = Math.max(1, maxX - minX);
      const rangeZ = Math.max(1, maxZ - minZ);
      const padding = 18;

      function convert(point) {
        return {
          x: padding +
            ((Number(point.x) - minX) / rangeX) *
            (width - padding * 2),
          y: padding +
            ((Number(point.z) - minZ) / rangeZ) *
            (height - padding * 2)
        };
      }

      ctx.beginPath();

      mapPoints.forEach(function (point, index) {
        const pos = convert(point);

        if (index === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });

      ctx.strokeStyle = "#a78bfa";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.stroke();

      const start = convert(mapPoints[0]);
      const finish = convert(mapPoints[mapPoints.length - 1]);

      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(finish.x, finish.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-playerRotation);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function togglePause() {
    paused = !paused;

    document.dispatchEvent(
      new CustomEvent(
        paused ? "superx:pauseRequested" : "superx:resumeRequested"
      )
    );

    if (elements.pause) {
      elements.pause.setAttribute(
        "aria-label",
        paused ? "Resume game" : "Pause game"
      );
    }

    return paused;
  }

  function switchCamera() {
    if (!SX.camera) return;

    SX.camera.next();
  }

  function bindEvents() {
    if (elements.pause) {
      elements.pause.addEventListener("click", togglePause);
    }

    if (elements.camera) {
      elements.camera.addEventListener("click", switchCamera);
    }
  }

  function startTimer() {
    startTime = performance.now();
    elapsedTime = 0;
    lastFrame = startTime;
    paused = false;

    stopTimerLoop();

    function tick(now) {
      if (!initialized) return;

      if (!paused) {
        elapsedTime += Math.max(
          0,
          Math.min((now - lastFrame) / 1000, 0.1)
        );

        updateTimer(elapsedTime);
      }

      lastFrame = now;
      animationFrame = requestAnimationFrame(tick);
    }

    animationFrame = requestAnimationFrame(tick);
  }

  function stopTimerLoop() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function reset() {
    paused = false;
    elapsedTime = 0;

    update({
      speed: 0,
      gear: "N",
      rpm: 0,
      progress: 0,
      distance: 0,
      elapsedTime: 0
    });
  }

  function setPaused(value) {
    paused = !!value;
    lastFrame = performance.now();
  }

  function getState() {
    return {
      initialized: initialized,
      paused: paused,
      elapsedTime: elapsedTime,
      mapPoints: mapPoints.length
    };
  }

  function init(options) {
    options = options || {};

    if (initialized) dispose();

    cacheElements();
    bindEvents();

    if (options.mapPoints) {
      setMapPoints(options.mapPoints);
    }

    initialized = true;
    reset();

    if (options.autoStart) {
      startTimer();
    }

    return true;
  }

  function dispose() {
    stopTimerLoop();

    if (elements.pause) {
      elements.pause.removeEventListener("click", togglePause);
    }

    if (elements.camera) {
      elements.camera.removeEventListener("click", switchCamera);
    }

    elements = {};
    mapContext = null;
    mapPoints = [];
    initialized = false;
    paused = false;
  }

  SX.hud = {
    init: init,
    update: update,
    updateSpeed: updateSpeed,
    updateGear: updateGear,
    updateRPM: updateRPM,
    updateProgress: updateProgress,
    updateDistance: updateDistance,
    updateTimer: updateTimer,
    setMapPoints: setMapPoints,
    drawMinimap: drawMinimap,
    startTimer: startTimer,
    stopTimer: stopTimerLoop,
    togglePause: togglePause,
    setPaused: setPaused,
    reset: reset,
    getState: getState,
    dispose: dispose
  };

})();

/* =========================================================
   SUPERX LEGEND — FILE 25
   END
========================================================= */
  
