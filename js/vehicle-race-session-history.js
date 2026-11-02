
/* =========================================================
   SUPERX LEGEND — FILE 106
   FILE: js/vehicle-race-session-history.js
   MODULE: Race Session History Manager
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

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeString(value) {
    return String(value == null ? "" : value)
      .slice(0, 120);
  }

  function getAll() {
    const manager = stats();

    if (!manager || typeof manager.getHistory !== "function") {
      return [];
    }

    try {
      const records = manager.getHistory();
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.warn("[SUPERX SessionHistory] Read failed:", error);
      return [];
    }
  }

  function getTimestamp(item) {
    const timestamp = Date.parse(
      item.endedAt || item.startedAt || ""
    );

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function matchesSearch(item, query) {
    if (!query) return true;

    const searchable = [
      item.id,
      item.startedAt,
      item.endedAt,
      item.racesPlayed,
      item.racesWon,
      item.totalDistanceKm
    ].map(safeString).join(" ").toLowerCase();

    return searchable.includes(query.toLowerCase());
  }

  function matchesFilter(item, filter) {
    if (filter === "all") return true;

    if (filter === "wins") {
      return safeNumber(item.racesWon) > 0;
    }

    if (filter === "no-wins") {
      return safeNumber(item.racesWon) === 0;
    }

    if (filter === "long") {
      return safeNumber(item.durationSeconds) >= 1800;
    }

    if (filter === "short") {
      return safeNumber(item.durationSeconds) < 1800;
    }

    return true;
  }

  function sortRecords(records, sort) {
    const result = records.slice();

    if (sort === "oldest") {
      result.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    } else if (sort === "most-wins") {
      result.sort((a, b) =>
        safeNumber(b.racesWon) - safeNumber(a.racesWon)
      );
    } else if (sort === "longest") {
      result.sort((a, b) =>
        safeNumber(b.durationSeconds) -
        safeNumber(a.durationSeconds)
      );
    } else if (sort === "distance") {
      result.sort((a, b) =>
        safeNumber(b.totalDistanceKm) -
        safeNumber(a.totalDistanceKm)
      );
    } else {
      result.sort((a, b) => getTimestamp(b) - getTimestamp(a));
    }

    return result;
  }

  function getFilteredRecords(options = {}) {
    const search = options.search !== undefined
      ? safeString(options.search).trim()
      : state.search;

    const filter = options.filter || state.filter;
    const sort = options.sort || state.sort;

    const filtered = getAll().filter(item =>
      matchesSearch(item, search) &&
      matchesFilter(item, filter)
    );

    return sortRecords(filtered, sort);
  }

  function getPage(options = {}) {
    const records = getFilteredRecords(options);

    const pageSize = Math.max(
      1,
      Math.min(100, Math.floor(
        safeNumber(options.pageSize, state.pageSize)
      ))
    );

    const pageCount = Math.max(
      1,
      Math.ceil(records.length / pageSize)
    );

    const requestedPage = Math.floor(
      safeNumber(options.page, state.page)
    );

    const page = Math.max(
      1,
      Math.min(pageCount, requestedPage)
    );

    const start = (page - 1) * pageSize;

    return {
      records: records.slice(start, start + pageSize),
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
    const allowed = [
      "all",
      "wins",
      "no-wins",
      "long",
      "short"
    ];

    if (!allowed.includes(value)) return getPage();

    state.filter = value;
    state.page = 1;

    return getPage();
  }

  function setSort(value) {
    const allowed = [
      "newest",
      "oldest",
      "most-wins",
      "longest",
      "distance"
    ];

    if (!allowed.includes(value)) return getPage();

    state.sort = value;
    state.page = 1;

    return getPage();
  }

  function setPage(page) {
    state.page = Math.max(1, Math.floor(
      safeNumber(page, 1)
    ));

    return getPage();
  }

  function setPageSize(size) {
    state.pageSize = Math.max(
      1,
      Math.min(100, Math.floor(safeNumber(size, 10)))
    );

    state.page = 1;
    return getPage();
  }

  function getSession(id) {
    const record = getAll().find(item => item.id === id);

    return record
      ? JSON.parse(JSON.stringify(record))
      : null;
  }

  function deleteSession(id) {
    const manager = stats();

    if (!manager || typeof manager.deleteSession !== "function") {
      return false;
    }

    const deleted = manager.deleteSession(id);

    if (deleted) {
      state.page = 1;
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
    return {
      search: state.search,
      sort: state.sort,
      page: state.page,
      pageSize: state.pageSize,
      filter: state.filter
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
    getViewState
  };

  console.info("[SUPERX] Race Session History loaded.");

})(window);

/* ======================= END FILE 106 ======================= */
