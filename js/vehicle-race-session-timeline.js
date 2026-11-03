/* =========================================================
   SUPERX LEGEND — FILE 114
   FILE: js/vehicle-race-session-timeline.js
   MODULE: Advanced Race Session Timeline
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_timeline_v2";
  const LEGACY_KEY = "superx_race_session_timeline_v1";

  const MAX_SESSIONS = 100;
  const MAX_EVENTS_PER_SESSION = 500;
  const MAX_TEXT = 180;

  const EVENT_TYPES = [
    "session-start",
    "race-start",
    "race-finish",
    "checkpoint",
    "lap-complete",
    "pause",
    "resume",
    "weather-change",
    "car-change",
    "penalty",
    "reward",
    "milestone",
    "custom",
    "session-finish"
  ];

  function now() {
    return Date.now();
  }

  function createId(prefix) {
    return prefix + "_" + now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function safeText(value, fallback = "") {
    if (typeof value !== "string" && typeof value !== "number") {
      return fallback;
    }

    return String(value)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, MAX_TEXT) || fallback;
  }

  function safeNumber(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeMetadata(metadata) {
    const meta = metadata && typeof metadata === "object"
      ? metadata
      : {};

    return {
      mode: safeText(meta.mode, "unknown"),
      map: safeText(meta.map, "unknown"),
      car: safeText(meta.car, "unknown")
    };
  }

  function normalizeEvent(event) {
    const item = event && typeof event === "object"
      ? event
      : {};

    const type = EVENT_TYPES.includes(item.type)
      ? item.type
      : "custom";

    let data = {};

    try {
      if (item.data && typeof item.data === "object") {
        data = JSON.parse(JSON.stringify(item.data));
      }
    } catch (_) {
      data = {};
    }

    return {
      id: safeText(item.id, createId("event")),
      type,
      title: safeText(item.title, type.replace(/-/g, " ")),
      description: safeText(item.description),
      timestamp: Math.max(0, safeNumber(item.timestamp, now())),
      elapsedMs: Math.max(0, safeNumber(item.elapsedMs)),
      lap: Math.max(0, safeNumber(item.lap)),
      checkpoint: Math.max(0, safeNumber(item.checkpoint)),
      data
    };
  }

  function normalizeSession(item) {
    if (!item || typeof item.id !== "string" ||
        !Array.isArray(item.events)) {
      return null;
    }

    return {
      id: safeText(item.id),
      createdAt: safeNumber(item.createdAt, now()),
      updatedAt: safeNumber(item.updatedAt, now()),
      metadata: normalizeMetadata(item.metadata),
      events: item.events
        .slice(-MAX_EVENTS_PER_SESSION)
        .map(normalizeEvent)
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_KEY);

      if (!raw) return { sessions: [] };

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.sessions)) {
        return { sessions: [] };
      }

      return {
        sessions: parsed.sessions
          .map(normalizeSession)
          .filter(Boolean)
          .slice(0, MAX_SESSIONS)
      };
    } catch (error) {
      console.warn("[SUPERX Timeline] Load failed:", error);
      return { sessions: [] };
    }
  }

  let store = loadStore();

  function save() {
    try {
      store.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      store.sessions = store.sessions.slice(0, MAX_SESSIONS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      return true;
    } catch (error) {
      console.warn("[SUPERX Timeline] Save failed:", error);
      return false;
    }
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent("sx:" + name, {
      detail
    }));
  }

  function findSession(sessionId) {
    return store.sessions.find(session => session.id === sessionId) || null;
  }

  function createSession(sessionId, metadata) {
    const timestamp = now();

    return {
      id: sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: normalizeMetadata(metadata),
      events: []
    };
  }

  function getOrCreateSession(sessionId, metadata) {
    const id = safeText(sessionId);

    if (!id) {
      throw new Error("A valid session ID is required.");
    }

    let session = findSession(id);

    if (!session) {
      session = createSession(id, metadata);
      store.sessions.unshift(session);
    }

    return session;
  }

  function addEvent(sessionId, event, metadata) {
    const session = getOrCreateSession(sessionId, metadata);
    const entry = normalizeEvent(event);

    const previous = session.events.slice();
    const previousUpdatedAt = session.updatedAt;

    session.events.push(entry);

    if (session.events.length > MAX_EVENTS_PER_SESSION) {
      session.events.shift();
    }

    session.updatedAt = now();

    if (!save()) {
      session.events = previous;
      session.updatedAt = previousUpdatedAt;
      return null;
    }

    emit("race-timeline-updated", {
      sessionId: session.id,
      event: clone(entry)
    });

    return clone(entry);
  }

  function startSession(sessionId, metadata) {
    const session = getOrCreateSession(sessionId, metadata);

    if (!session.events.some(event => event.type === "session-start")) {
      addEvent(sessionId, {
        type: "session-start",
        title: "Session started",
        description: "Race session timeline created."
      }, metadata);
    }

    return getTimeline(sessionId);
  }

  function getTimeline(sessionId, options = {}) {
    const session = findSession(sessionId);
    if (!session) return [];

    let events = session.events.slice();

    if (options.type) {
      events = events.filter(event => event.type === options.type);
    }

    if (options.search) {
      const query = String(options.search).toLowerCase();

      events = events.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.type.toLowerCase().includes(query)
      );
    }

    if (options.from != null) {
      const from = safeNumber(options.from, 0);
      events = events.filter(event => event.timestamp >= from);
    }

    if (options.to != null) {
      const to = safeNumber(options.to, Infinity);
      events = events.filter(event => event.timestamp <= to);
    }

    if (options.limit != null) {
      const limit = Math.max(0, Math.floor(safeNumber(options.limit)));
      events = limit === 0 ? [] : events.slice(-limit);
    }

    return clone(events);
  }

  function getSessions() {
    return store.sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: clone(session.metadata),
      eventCount: session.events.length,
      firstEvent: session.events[0] ? clone(session.events[0]) : null,
      lastEvent: session.events.length
        ? clone(session.events[session.events.length - 1])
        : null
    }));
  }

  function getSessionSummary(sessionId) {
    const session = findSession(sessionId);
    if (!session) return null;

    const counts = {};

    session.events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return {
      id: session.id,
      metadata: clone(session.metadata),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totalEvents: session.events.length,
      eventCounts: counts,
      durationMs: session.events.length > 1
        ? Math.max(0,
            session.events[session.events.length - 1].timestamp -
            session.events[0].timestamp)
        : 0
    };
  }

  function updateMetadata(sessionId, metadata) {
    const session = findSession(sessionId);

    if (!session || !metadata || typeof metadata !== "object") {
      return false;
    }

    const previous = clone(session.metadata);

    ["mode", "map", "car"].forEach(key => {
      if (metadata[key] !== undefined) {
        session.metadata[key] = safeText(
          metadata[key],
          session.metadata[key]
        );
      }
    });

    session.updatedAt = now();

    if (!save()) {
      session.metadata = previous;
      return false;
    }

    emit("race-timeline-metadata-updated", {
      sessionId,
      metadata: clone(session.metadata)
    });

    return true;
  }

  function deleteEvent(sessionId, eventId) {
    const session = findSession(sessionId);
    if (!session) return false;

    const index = session.events.findIndex(event => event.id === eventId);
    if (index < 0) return false;

    const removed = session.events.splice(index, 1)[0];
    const previousUpdatedAt = session.updatedAt;

    session.updatedAt = now();

    if (!save()) {
      session.events.splice(index, 0, removed);
      session.updatedAt = previousUpdatedAt;
      return false;
    }

    emit("race-timeline-event-deleted", {
      sessionId,
      eventId
    });

    return true;
  }

  function deleteSession(sessionId) {
    const index = store.sessions.findIndex(session => session.id === sessionId);
    if (index < 0) return false;

    const removed = store.sessions.splice(index, 1)[0];

    if (!save()) {
      store.sessions.splice(index, 0, removed);
      return false;
    }

    emit("race-timeline-session-deleted", { sessionId });
    return true;
  }

  function clearAll() {
    const previous = store.sessions;
    store.sessions = [];

    if (!save()) {
      store.sessions = previous;
      return false;
    }

    emit("race-timeline-cleared", {});
    return true;
  }

  function exportSession(sessionId) {
    const session = findSession(sessionId);
    return session ? JSON.stringify(clone(session), null, 2) : null;
  }

  function importSession(jsonText) {
    try {
      const imported = typeof jsonText === "string"
        ? JSON.parse(jsonText)
        : jsonText;

      const normalized = normalizeSession(imported);

      if (!normalized) {
        return {
          success: false,
          error: "Invalid timeline data."
        };
      }

      const session = {
        ...normalized,
        id: createId("import"),
        createdAt: now(),
        updatedAt: now()
      };

      store.sessions.unshift(session);

      if (!save()) {
        store.sessions.shift();
        return {
          success: false,
          error: "Could not save imported timeline."
        };
      }

      emit("race-timeline-imported", {
        sessionId: session.id
      });

      return {
        success: true,
        sessionId: session.id
      };
    } catch (error) {
      return {
        success: false,
        error: "Could not import timeline data."
      };
    }
  }

  function getEventTypes() {
    return EVENT_TYPES.slice();
  }

  SX.vehicleRaceSessionTimeline = {
    startSession,
    addEvent,
    getTimeline,
    getSessions,
    getSessionSummary,
    updateMetadata,
    deleteEvent,
    deleteSession,
    clearAll,
    exportSession,
    importSession,
    getEventTypes
  };

  console.info("[SUPERX] Advanced Race Session Timeline loaded.");

})(window);

/* ======================= FILE 114 END ======================= */
                            
