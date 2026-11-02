
/* =========================================================
   SUPERX LEGEND — FILE 114
   FILE: js/vehicle-race-session-timeline.js

   PURPOSE:
   - Record ordered events during a race session.
   - Keep a separate timeline for each session.
   - Search, filter, export and delete timeline entries.
   - Does not modify race results or session statistics.
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const STORAGE_KEY = "superx_race_session_timeline_v1";
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
    return prefix + "_" +
      now().toString(36) + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function safeText(value, fallback) {
    if (typeof value !== "string") return fallback || "";

    return value
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, MAX_TEXT);
  }

  function safeNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSession(sessionId, metadata) {
    const meta = metadata && typeof metadata === "object"
      ? metadata
      : {};

    return {
      id: sessionId,
      createdAt: now(),
      updatedAt: now(),
      metadata: {
        mode: safeText(meta.mode, "unknown"),
        map: safeText(meta.map, "unknown"),
        car: safeText(meta.car, "unknown")
      },
      events: []
    };
  }

  function normalizeEvent(event) {
    const item = event && typeof event === "object"
      ? event
      : {};

    const type = EVENT_TYPES.includes(item.type)
      ? item.type
      : "custom";

    return {
      id: createId("event"),
      type: type,
      title: safeText(item.title, type.replace(/-/g, " ")),
      description: safeText(item.description, ""),
      timestamp: safeNumber(item.timestamp, now()),
      elapsedMs: Math.max(
        0,
        safeNumber(item.elapsedMs, 0)
      ),
      lap: Math.max(0, safeNumber(item.lap, 0)),
      checkpoint: Math.max(
        0,
        safeNumber(item.checkpoint, 0)
      ),
      data: item.data && typeof item.data === "object"
        ? clone(item.data)
        : {}
    };
  }

  function loadStore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) return { sessions: [] };

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.sessions)) {
        return { sessions: [] };
      }

      return {
        sessions: parsed.sessions
          .filter(function (session) {
            return session &&
              typeof session.id === "string" &&
              Array.isArray(session.events);
          })
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
      store.sessions.sort(function (a, b) {
        return b.updatedAt - a.updatedAt;
      });

      store.sessions = store.sessions.slice(0, MAX_SESSIONS);

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(store)
      );

      return true;
    } catch (error) {
      console.warn("[SUPERX Timeline] Save failed:", error);
      return false;
    }
  }

  function findSession(sessionId) {
    return store.sessions.find(function (session) {
      return session.id === sessionId;
    }) || null;
  }

  function getOrCreateSession(sessionId, metadata) {
    const id = safeText(sessionId, "");

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
    const session = getOrCreateSession(
      sessionId,
      metadata
    );

    if (session.events.length >= MAX_EVENTS_PER_SESSION) {
      session.events.shift();
    }

    const entry = normalizeEvent(event);

    session.events.push(entry);
    session.updatedAt = now();

    save();

    window.dispatchEvent(new CustomEvent(
      "sx:race-timeline-updated",
      {
        detail: {
          sessionId: session.id,
          event: clone(entry)
        }
      }
    ));

    return clone(entry);
  }

  function startSession(sessionId, metadata) {
    const session = getOrCreateSession(
      sessionId,
      metadata
    );

    if (session.events.length === 0) {
      addEvent(sessionId, {
        type: "session-start",
        title: "Session started",
        description: "Race session timeline created."
      });
    }

    return getTimeline(sessionId);
  }

  function getTimeline(sessionId, options) {
    const session = findSession(sessionId);

    if (!session) return [];

    const settings = options || {};
    let events = session.events.slice();

    if (settings.type) {
      events = events.filter(function (event) {
        return event.type === settings.type;
      });
    }

    if (settings.search) {
      const query = String(settings.search).toLowerCase();

      events = events.filter(function (event) {
        return (
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.type.toLowerCase().includes(query)
        );
      });
    }

    if (settings.from != null) {
      events = events.filter(function (event) {
        return event.timestamp >= Number(settings.from);
      });
    }

    if (settings.to != null) {
      events = events.filter(function (event) {
        return event.timestamp <= Number(settings.to);
      });
    }

    if (settings.limit != null) {
      const limit = Math.max(
        0,
        Math.floor(Number(settings.limit) || 0)
      );

      events = events.slice(-limit);
    }

    return clone(events);
  }

  function getSessions() {
    return store.sessions.map(function (session) {
      return {
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        metadata: clone(session.metadata),
        eventCount: session.events.length,
        firstEvent: session.events[0]
          ? clone(session.events[0])
          : null,
        lastEvent: session.events.length
          ? clone(session.events[session.events.length - 1])
          : null
      };
    });
  }

  function getSessionSummary(sessionId) {
    const session = findSession(sessionId);

    if (!session) return null;

    const counts = {};

    session.events.forEach(function (event) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return {
      id: session.id,
      metadata: clone(session.metadata),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totalEvents: session.events.length,
      eventCounts: counts
    };
  }

  function updateMetadata(sessionId, metadata) {
    const session = findSession(sessionId);

    if (!session || !metadata || typeof metadata !== "object") {
      return false;
    }

    ["mode", "map", "car"].forEach(function (key) {
      if (metadata[key] !== undefined) {
        session.metadata[key] = safeText(
          metadata[key],
          session.metadata[key]
        );
      }
    });

    session.updatedAt = now();
    save();

    return true;
  }

  function deleteEvent(sessionId, eventId) {
    const session = findSession(sessionId);

    if (!session) return false;

    const before = session.events.length;

    session.events = session.events.filter(function (event) {
      return event.id !== eventId;
    });

    if (before === session.events.length) return false;

    session.updatedAt = now();
    save();

    return true;
  }

  function deleteSession(sessionId) {
    const before = store.sessions.length;

    store.sessions = store.sessions.filter(function (session) {
      return session.id !== sessionId;
    });

    if (before === store.sessions.length) return false;

    save();
    return true;
  }

  function clearAll() {
    store.sessions = [];
    save();

    window.dispatchEvent(new CustomEvent(
      "sx:race-timeline-cleared"
    ));

    return true;
  }

  function exportSession(sessionId) {
    const session = findSession(sessionId);

    if (!session) return null;

    return JSON.stringify(
      clone(session),
      null,
      2
    );
  }

  function importSession(jsonText) {
    try {
      const imported = typeof jsonText === "string"
        ? JSON.parse(jsonText)
        : jsonText;

      if (
        !imported ||
        typeof imported.id !== "string" ||
        !Array.isArray(imported.events)
      ) {
        return {
          success: false,
          error: "Invalid timeline data."
        };
      }

      const session = createSession(
        createId("import"),
        imported.metadata
      );

      session.events = imported.events
        .slice(0, MAX_EVENTS_PER_SESSION)
        .map(normalizeEvent);

      session.updatedAt = now();

      store.sessions.unshift(session);
      save();

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
    startSession: startSession,
    addEvent: addEvent,
    getTimeline: getTimeline,
    getSessions: getSessions,
    getSessionSummary: getSessionSummary,
    updateMetadata: updateMetadata,
    deleteEvent: deleteEvent,
    deleteSession: deleteSession,
    clearAll: clearAll,
    exportSession: exportSession,
    importSession: importSession,
    getEventTypes: getEventTypes
  };

  console.log("[SUPERX] Race Session Timeline ready.");

})(window);

/* ======================= FILE 114 END ======================= */
        
