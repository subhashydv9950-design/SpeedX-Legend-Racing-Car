/* =========================================================
   SUPERX LEGEND — FILE 106
   FILE: js/vehicle-race-session-history.js
   MODULE: RACE SESSION HISTORY MANAGER
   START: RACE SESSION HISTORY MANAGER
   ========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};
  const stats = () => SX.vehicleRaceSessionStats || null;

  const state = {
    search: "",
    sort: "newest",
    page: 1,
    pageSize: 10,
    filter: "all"
  };

  const FILTERS = ["all", "wins", "no-wins", "long", "short"];
  const SORTS = ["newest", "oldest", "most-wins", "longest", "distance"];

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeString(value, limit = 120) {
    return String(value == null ? "" : value).trim().slice(0, limit);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getAll() {
    const manager = stats();

    if (!manager || typeof manager.getHistory !== "function") return [];

    try {
      const records = manager.getHistory();
      return Array.isArray(records)
        ? records.filter(item => item && typeof item === "object")
        : [];
    } catch (error) {
      console.warn("[SUPERX SessionHistory] Read failed:", error);
      return [];
    }
  }

  function getTimestamp(item) {
    const value = Date.parse(item.endedAt || item.startedAt || "");
    return Number.isFinite(value) ? value : 0;
  }

  function matchesSearch(item, query) {
    if (!query) return true;

    const searchable = [
      item.id,
      item.startedAt,
      item.endedAt,
      item.racesPlayed,
      item.racesWon,
      item.racesLost,
      item.totalDistanceKm,
      item.totalCoins,
      item.totalXP,
      ...Object.keys(item.raceModes || {})
    ].map(value => safeString(value, 200)).join(" ").toLowerCase();

    return searchable.includes(query.toLowerCase());
  }

  function matchesFilter(item, filter) {
    const wins = safeNumber(item.racesWon);
    const duration = safeNumber(item.durationSeconds);

    switch (filter) {
      case "wins": return wins > 0;
      case "no-wins": return wins === 0;
      case "long": return duration >= 1800;
      case "short": return duration < 1800;
      default: return true;
    }
  }

  function sortRecords(records, sort) {
    const result = records.slice();

    const comparators = {
      oldest: (a, b) => getTimestamp(a) - getTimestamp(b),
      "most-wins": (a, b) => safeNumber(b.racesWon) - safeNumber(a.racesWon),
      longest: (a, b) => safeNumber(b.durationSeconds) - safeNumber(a.durationSeconds),
      distance: (a, b) => safeNumber(b.totalDistanceKm) - safeNumber(a.totalDistanceKm)
    };

    result.sort(comparators[sort] || ((a, b) =>
      getTimestamp(b) - getTimestamp(a)
    ));

    return result;
  }

  function getFilteredRecords(options = {}) {
    const search = options.search !== undefined
      ? safeString(options.search)
      : state.search;

    const filter = FILTERS.includes(options.filter)
      ? options.filter
      : state.filter;

    const sort = SORTS.includes(options.sort)
      ? options.sort
      : state.sort;

    return sortRecords(
      getAll().filter(item =>
        matchesSearch(item, search) &&
        matchesFilter(item, filter)
      ),
      sort
    );
  }

  function getPage(options = {}) {
    const records = getFilteredRecords(options);

    const pageSize = Math.max(1, Math.min(100,
      Math.floor(safeNumber(options.pageSize, state.pageSize))
    ));

    const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
    const requested = Math.floor(safeNumber(options.page, state.page));
    const page = Math.max(1, Math.min(pageCount, requested));
    const start = (page - 1) * pageSize;

    return {
      records: clone(records.slice(start, start + pageSize)),
      totalRecords: records.length,
      page,
      pageSize,
      pageCount,
      hasPrevious: page > 1,
      hasNext: page < pageCount
    };
  }

  function setSearch(value) {
    state.search = safeString(value);
    state.page = 1;
    return getPage();
  }

  function setFilter(value) {
    if (!FILTERS.includes(value)) return getPage();

    state.filter = value;
    state.page = 1;
    return getPage();
  }

  function setSort(value) {
    if (!SORTS.includes(value)) return getPage();

    state.sort = value;
    state.page = 1;
    return getPage();
  }

  function setPage(page) {
    state.page = Math.max(1, Math.floor(safeNumber(page, 1)));
    return getPage();
  }

  function setPageSize(size) {
    state.pageSize = Math.max(1, Math.min(100,
      Math.floor(safeNumber(size, 10))
    ));
    state.page = 1;
    return getPage();
  }

  function getSession(id) {
    const record = getAll().find(item => item.id === String(id));
    return record ? clone(record) : null;
  }

  function deleteSession(id) {
    const manager = stats();

    if (!manager || typeof manager.deleteSession !== "function") {
      return false;
    }

    const deleted = manager.deleteSession(id);

    if (deleted) {
      state.page = 1;
      window.dispatchEvent(new CustomEvent("sx:session-history-updated", {
        detail: { action: "delete", id: String(id) }
      }));
    }

    return deleted;
  }

  function resetView() {
    state.search = "";
    state.sort = "newest";
    state.page = 1;
    state.pageSize = 10;
    state.filter = "all";
    return getPage();
  }

  function getViewState() {
    return clone(state);
  }

  function getSummary() {
    const records = getAll();

    return {
      sessions: records.length,
      races: records.reduce((sum, item) =>
        sum + safeNumber(item.racesPlayed), 0),
      wins: records.reduce((sum, item) =>
        sum + safeNumber(item.racesWon), 0),
      distanceKm: records.reduce((sum, item) =>
        sum + safeNumber(item.totalDistanceKm), 0),
      coins: records.reduce((sum, item) =>
        sum + safeNumber(item.totalCoins), 0),
      xp: records.reduce((sum, item) =>
        sum + safeNumber(item.totalXP), 0)
    };
  }

  SX.vehicleRaceSessionHistory = {
    getAll,
    getSession,
    getFilteredRecords,
    getPage,
    setSearch,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    deleteSession,
    resetView,
    getViewState,
    getSummary,
    getFilters: () => FILTERS.slice(),
    getSortOptions: () => SORTS.slice()
  };

  console.info("[SUPERX] Race Session History loaded.");

})(window);

/* =========================================================
   END: RACE SESSION HISTORY MANAGER — FILE 106
   ========================================================= */

