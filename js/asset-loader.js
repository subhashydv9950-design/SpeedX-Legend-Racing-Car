
/* =========================================================
   SUPERX LEGEND — FILE 50
   FILE: js/asset-loader.js
   PURPOSE: Central asset loading and progress tracking
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
    queue: [],
    maxConcurrent: 4,
    processing: false
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, {
      detail: detail || {}
    }));
  }

  function reportProgress() {
    const completed = state.loaded + state.failed;

    const progress = state.total > 0
      ? Math.round((completed / state.total) * 100)
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

  function getCached(url) {
    return state.cache.has(url)
      ? state.cache.get(url)
      : null;
  }

  function loadImage(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid image URL"));
    }

    const cached = getCached(url);

    if (cached) return cached;

    const promise = new Promise(function (resolve, reject) {
      const image = new Image();

      image.onload = function () {
        state.loaded++;
        reportProgress();
        resolve(image);
      };

      image.onerror = function () {
        state.failed++;

        state.failures.push({
          url,
          type: "image",
          time: Date.now()
        });

        reportProgress();
        reject(new Error("Image failed to load: " + url));
      };

      image.decoding = "async";
      image.src = url;

      if (image.complete && image.naturalWidth > 0) {
        state.loaded++;
        reportProgress();
        resolve(image);
      }
    });

    state.cache.set(url, promise);
    return promise;
  }

  function loadAudio(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid audio URL"));
    }

    const cached = getCached(url);

    if (cached) return cached;

    const promise = new Promise(function (resolve, reject) {
      const audio = new Audio();

      audio.preload = "auto";

      audio.addEventListener("canplaythrough", function () {
        state.loaded++;
        reportProgress();
        resolve(audio);
      }, { once: true });

      audio.addEventListener("error", function () {
        state.failed++;

        state.failures.push({
          url,
          type: "audio",
          time: Date.now()
        });

        reportProgress();
        reject(new Error("Audio failed to load: " + url));
      }, { once: true });

      audio.src = url;
      audio.load();
    });

    state.cache.set(url, promise);
    return promise;
  }

  function loadJSON(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid JSON URL"));
    }

    const cached = getCached(url);

    if (cached) return cached;

    const promise = fetch(url, {
      method: "GET",
      cache: "default"
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();
    }).then(function (data) {
      state.loaded++;
      reportProgress();
      return data;
    }).catch(function (error) {
      state.failed++;

      state.failures.push({
        url,
        type: "json",
        time: Date.now(),
        message: error.message
      });

      reportProgress();
      throw error;
    });

    state.cache.set(url, promise);
    return promise;
  }

  function loadText(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid text URL"));
    }

    const cached = getCached(url);

    if (cached) return cached;

    const promise = fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.text();
    }).then(function (text) {
      state.loaded++;
      reportProgress();
      return text;
    }).catch(function (error) {
      state.failed++;

      state.failures.push({
        url,
        type: "text",
        time: Date.now(),
        message: error.message
      });

      reportProgress();
      throw error;
    });

    state.cache.set(url, promise);
    return promise;
  }

  function loadModel(url) {
    if (!url || typeof url !== "string") {
      return Promise.reject(new Error("Invalid model URL"));
    }

    const cached = getCached(url);

    if (cached) return cached;

    if (!window.THREE || !window.THREE.GLTFLoader) {
      return Promise.reject(
        new Error("THREE.GLTFLoader is not available")
      );
    }

    const promise = new Promise(function (resolve, reject) {
      const loader = new window.THREE.GLTFLoader();

      loader.load(
        url,
        function (gltf) {
          state.loaded++;
          reportProgress();
          resolve(gltf);
        },
        function (event) {
          if (event && event.total) {
            emit("sx:model-loading", {
              url,
              progress: Math.round(
                (event.loaded / event.total) * 100
              )
            });
          }
        },
        function (error) {
          state.failed++;

          state.failures.push({
            url,
            type: "model",
            time: Date.now(),
            message: error?.message || "Model load failed"
          });

          reportProgress();
          reject(error);
        }
      );
    });

    state.cache.set(url, promise);
    return promise;
  }

  function loadAll(items) {
    if (!Array.isArray(items)) {
      return Promise.reject(
        new Error("Assets must be an array")
      );
    }

    state.total += items.length;
    reportProgress();

    const results = [];

    return items.reduce(function (chain, item, index) {
      return chain.then(function () {
        let task;

        switch (item.type) {
          case "image":
            task = loadImage(item.url);
            break;

          case "audio":
            task = loadAudio(item.url);
            break;

          case "json":
            task = loadJSON(item.url);
            break;

          case "text":
            task = loadText(item.url);
            break;

          case "model":
            task = loadModel(item.url);
            break;

          default:
            task = Promise.reject(
              new Error("Unknown asset type: " + item.type)
            );
        }

        return task.then(function (result) {
          results[index] = {
            success: true,
            item,
            result
          };
        }).catch(function (error) {
          results[index] = {
            success: false,
            item,
            error: error.message
          };
        });
      });
    }, Promise.resolve()).then(function () {
      emit("sx:assets-complete", {
        results,
        loaded: state.loaded,
        failed: state.failed
      });

      return results;
    });
  }

  function preloadImages(urls) {
    if (!Array.isArray(urls)) {
      return Promise.resolve([]);
    }

    state.total += urls.length;
    reportProgress();

    return Promise.allSettled(
      urls.map(loadImage)
    );
  }

  function clearCache(url) {
    if (url) {
      state.cache.delete(url);
      return;
    }

    state.cache.clear();
  }

  function resetProgress() {
    state.loaded = 0;
    state.failed = 0;
    state.total = 0;
    state.failures = [];

    reportProgress();
  }

  function getState() {
    return {
      loaded: state.loaded,
      failed: state.failed,
      total: state.total,
      active: state.active,
      cachedAssets: state.cache.size,
      failures: state.failures.slice()
    };
  }

  SX.assetLoader = {
    loadImage,
    loadAudio,
    loadJSON,
    loadText,
    loadModel,
    loadAll,
    preloadImages,
    clearCache,
    resetProgress,
    reportProgress,
    getState
  };

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 50 END
   ========================================================= */
  
