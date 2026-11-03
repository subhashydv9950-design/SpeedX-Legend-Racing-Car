
/* =========================================================
   SUPERX LEGEND — FILE 50 START
   FILE: js/asset-loader.js
   PURPOSE: Advanced Asset Loading & Cache Management
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const state = {
    loaded: 0,
    failed: 0,
    total: 0,
    active: 0,
    cache: new Map(),
    failures: [],
    maxConcurrent: 4
  };

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  function reportProgress() {
    const completed = state.loaded + state.failed;

    const progress = state.total
      ? Math.min(100, Math.round(completed / state.total * 100))
      : 0;

    const data = {
      loaded: state.loaded,
      failed: state.failed,
      total: state.total,
      completed,
      progress,
      active: state.active
    };

    if (SX.loading && typeof SX.loading.update === "function") {
      SX.loading.update(progress, "Loading game assets...");
    }

    emit("sx:asset-progress", data);

    return data;
  }

  function recordFailure(url, type, error) {
    state.failed++;

    state.failures.push({
      url,
      type,
      time: Date.now(),
      message: error?.message || "Asset loading failed"
    });

    reportProgress();
  }

  function track(url, type, task) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid asset URL"));
    }

    if (state.cache.has(url)) {
      return state.cache.get(url);
    }

    state.active++;

    const promise = Promise.resolve()
      .then(task)
      .then(result => {
        state.loaded++;
        return result;
      })
      .catch(error => {
        recordFailure(url, type, error);
        throw error;
      })
      .finally(() => {
        state.active = Math.max(0, state.active - 1);
        reportProgress();
      });

    state.cache.set(url, promise);

    return promise;
  }

  function loadImage(url) {
    return track(url, "image", () => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        let settled = false;

        function finish(error) {
          if (settled) return;
          settled = true;

          image.onload = null;
          image.onerror = null;

          if (error) reject(error);
          else resolve(image);
        }

        image.onload = () => finish();

        image.onerror = () => {
          finish(new Error("Image failed to load: " + url));
        };

        image.decoding = "async";
        image.src = url;

        if (image.complete) {
          if (image.naturalWidth > 0) {
            finish();
          } else {
            finish(new Error("Invalid image: " + url));
          }
        }
      });
    });
  }

  function loadAudio(url) {
    return track(url, "audio", () => {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        let settled = false;

        function cleanup() {
          audio.removeEventListener("canplaythrough", success);
          audio.removeEventListener("error", failure);
        }

        function success() {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(audio);
        }

        function failure() {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("Audio failed to load: " + url));
        }

        audio.preload = "auto";
        audio.addEventListener("canplaythrough", success);
        audio.addEventListener("error", failure);

        audio.src = url;
        audio.load();

        if (audio.readyState >= 4) {
          success();
        }
      });
    });
  }

  function loadJSON(url) {
    return track(url, "json", async () => {
      const response = await fetch(url, {
        method: "GET",
        cache: "default"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();
    });
  }

  function loadText(url) {
    return track(url, "text", async () => {
      const response = await fetch(url, {
        method: "GET",
        cache: "default"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.text();
    });
  }

  function loadModel(url) {
    return track(url, "model", () => {
      if (
        !window.THREE ||
        !window.THREE.GLTFLoader
      ) {
        throw new Error("THREE.GLTFLoader is unavailable");
      }

      return new Promise((resolve, reject) => {
        const loader = new window.THREE.GLTFLoader();

        loader.load(
          url,

          gltf => resolve(gltf),

          event => {
            if (!event || !event.total) return;

            emit("sx:model-loading", {
              url,
              progress: Math.round(
                event.loaded / event.total * 100
              )
            });
          },

          error => reject(error || new Error("Model load failed"))
        );
      });
    });
  }

  function loadAsset(item) {
    if (!item || !item.url) {
      return Promise.reject(new Error("Invalid asset item"));
    }

    switch (item.type) {
      case "image":
        return loadImage(item.url);

      case "audio":
        return loadAudio(item.url);

      case "json":
        return loadJSON(item.url);

      case "text":
        return loadText(item.url);

      case "model":
        return loadModel(item.url);

      default:
        return Promise.reject(
          new Error("Unknown asset type: " + item.type)
        );
    }
  }

  async function loadAll(items, options = {}) {
    if (!Array.isArray(items)) {
      throw new Error("Assets must be an array");
    }

    const concurrency = Math.max(
      1,
      Math.min(
        12,
        Number(options.concurrency) || state.maxConcurrent
      )
    );

    state.total += items.length;
    reportProgress();

    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
      while (true) {
        const index = nextIndex++;

        if (index >= items.length) return;

        const item = items[index];

        try {
          const result = await loadAsset(item);

          results[index] = {
            success: true,
            item,
            result
          };
        } catch (error) {
          results[index] = {
            success: false,
            item,
            error: error.message
          };
        }

        emit("sx:asset-item-complete", {
          index,
          item,
          result: results[index]
        });
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    );

    await Promise.all(workers);

    emit("sx:assets-complete", {
      results,
      loaded: state.loaded,
      failed: state.failed,
      total: state.total
    });

    return results;
  }

  async function preloadImages(urls) {
    if (!Array.isArray(urls)) return [];

    return loadAll(
      urls.map(url => ({
        type: "image",
        url
      }))
    );
  }

  function clearCache(url) {
    if (url) {
      state.cache.delete(url);
      return true;
    }

    state.cache.clear();
    return true;
  }

  function resetProgress() {
    state.loaded = 0;
    state.failed = 0;
    state.total = 0;
    state.active = 0;
    state.failures = [];

    reportProgress();
  }

  function setConcurrency(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return false;

    state.maxConcurrent = Math.max(
      1,
      Math.min(12, Math.floor(number))
    );

    return state.maxConcurrent;
  }

  function getState() {
    return {
      loaded: state.loaded,
      failed: state.failed,
      total: state.total,
      active: state.active,
      maxConcurrent: state.maxConcurrent,
      cachedAssets: state.cache.size,
      progress: state.total
        ? Math.round(
            (state.loaded + state.failed) / state.total * 100
          )
        : 0,
      failures: state.failures.map(item => ({ ...item }))
    };
  }

  SX.assetLoader = {
    loadImage,
    loadAudio,
    loadJSON,
    loadText,
    loadModel,
    loadAsset,
    loadAll,
    preloadImages,
    clearCache,
    resetProgress,
    reportProgress,
    setConcurrency,
    getState
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 50 END
   FILE: js/asset-loader.js
========================================================= */
