
/* =========================================================
   SUPERX LEGEND — FILE 57
   FILE: js/route-manager.js
   PURPOSE: Route generation, navigation and race distance
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const RouteManager = {
    routes: new Map(),
    activeRoute: null,
    activeIndex: 0,
    completed: false,
    paused: false,

    createRoute(options = {}) {
      const id = options.id || "route-" + Date.now();

      const points = Array.isArray(options.points)
        ? options.points.map((point, index) => ({
            x: Number(point.x) || 0,
            y: Number(point.y) || 0,
            z: Number(point.z) || 0,
            index
          }))
        : [];

      if (points.length < 2) {
        return {
          success: false,
          message: "A route needs at least two points."
        };
      }

      const route = {
        id,
        name: options.name || "SUPERX Route",
        world: options.world || "village",
        points,
        checkpoints: [],
        segments: [],
        totalDistance: 0,
        createdAt: Date.now()
      };

      for (let i = 1; i < points.length; i++) {
        const length = this.distance(points[i - 1], points[i]);

        route.totalDistance += length;
        route.segments.push({
          from: i - 1,
          to: i,
          distance: length,
          cumulativeDistance: route.totalDistance
        });
      }

      route.checkpoints = this.generateCheckpoints(
        points,
        options.checkpointCount || 5
      );

      this.routes.set(id, route);

      return { success: true, route };
    },

    distance(a, b) {
      if (!a || !b) return 0;

      const dx = (Number(b.x) || 0) - (Number(a.x) || 0);
      const dy = (Number(b.y) || 0) - (Number(a.y) || 0);
      const dz = (Number(b.z) || 0) - (Number(a.z) || 0);

      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    generateCheckpoints(points, count) {
      const checkpoints = [];
      const total = points.length - 1;

      count = Math.max(1, Math.min(
        Math.floor(Number(count) || 5),
        total
      ));

      const used = new Set();

      for (let i = 1; i <= count; i++) {
        const index = Math.round((i / (count + 1)) * total);

        if (used.has(index)) continue;
        used.add(index);

        const point = points[index];

        checkpoints.push({
          id: "checkpoint-" + i,
          x: point.x,
          y: point.y,
          z: point.z,
          pointIndex: index,
          reached: false
        });
      }

      return checkpoints;
    },

    loadRoute(id) {
      const route = this.routes.get(id);
      if (!route) return false;

      this.activeRoute = route;
      this.activeIndex = 0;
      this.completed = false;
      this.paused = false;

      route.checkpoints.forEach(checkpoint => {
        checkpoint.reached = false;
      });

      this.emit("route-loaded", {
        routeId: route.id,
        name: route.name,
        distance: route.totalDistance
      });

      return true;
    },

    loadRouteData(route) {
      if (!route || !Array.isArray(route.points)) return false;

      const result = this.createRoute({
        id: route.id,
        name: route.name,
        world: route.world,
        points: route.points,
        checkpointCount: route.checkpoints
          ? route.checkpoints.length
          : 5
      });

      if (!result.success) return false;
      return this.loadRoute(result.route.id);
    },

    getCurrentPoint() {
      if (!this.activeRoute) return null;
      return this.activeRoute.points[this.activeIndex] || null;
    },

    getNextPoint() {
      if (!this.activeRoute) return null;
      return this.activeRoute.points[this.activeIndex + 1] || null;
    },

    advance() {
      if (!this.activeRoute || this.completed || this.paused) {
        return false;
      }

      if (this.activeIndex < this.activeRoute.points.length - 1) {
        this.activeIndex++;

        this.emit("route-progress", this.getProgress());

        return true;
      }

      this.completed = true;

      this.emit("route-completed", {
        routeId: this.activeRoute.id,
        distance: this.activeRoute.totalDistance
      });

      return false;
    },

    updateCheckpoint(position, radius = 12) {
      if (!this.activeRoute || !position || this.paused) {
        return null;
      }

      const checkpoint = this.activeRoute.checkpoints.find(
        item => !item.reached
      );

      if (!checkpoint) return null;

      if (this.distance(position, checkpoint) <= radius) {
        checkpoint.reached = true;

        this.emit("route-checkpoint", {
          checkpointId: checkpoint.id,
          routeId: this.activeRoute.id,
          pointIndex: checkpoint.pointIndex
        });

        return checkpoint;
      }

      return null;
    },

    getProgress(position) {
      if (!this.activeRoute) {
        return {
          active: false,
          percentage: 0,
          distanceTotal: 0,
          distanceTravelled: 0,
          distanceRemaining: 0
        };
      }

      const route = this.activeRoute;
      const current = route.points[this.activeIndex];

      let remaining = 0;

      for (let i = this.activeIndex + 1; i < route.points.length; i++) {
        remaining += this.distance(
          route.points[i - 1],
          route.points[i]
        );
      }

      let distanceFromCurrent = 0;

      if (position && current) {
        distanceFromCurrent = Math.min(
          this.distance(position, current),
          this.activeIndex > 0
            ? this.distance(
                route.points[this.activeIndex - 1],
                current
              )
            : this.distance(current, route.points[1])
        );
      }

      const travelled = Math.max(
        0,
        Math.min(
          route.totalDistance,
          route.totalDistance - remaining - distanceFromCurrent
        )
      );

      const percentage = route.totalDistance > 0
        ? (travelled / route.totalDistance) * 100
        : 0;

      return {
        active: true,
        routeId: route.id,
        distanceTotal: route.totalDistance,
        distanceTravelled: travelled,
        distanceRemaining: Math.max(
          0,
          route.totalDistance - travelled
        ),
        percentage: Math.round(percentage * 10) / 10,
        currentIndex: this.activeIndex,
        totalPoints: route.points.length,
        completed: this.completed,
        paused: this.paused
      };
    },

    pause() {
      if (!this.activeRoute || this.completed) return false;
      this.paused = true;
      this.emit("route-paused", { routeId: this.activeRoute.id });
      return true;
    },

    resume() {
      if (!this.activeRoute || this.completed) return false;
      this.paused = false;
      this.emit("route-resumed", { routeId: this.activeRoute.id });
      return true;
    },

    getRoute(id) {
      return this.routes.get(id) || null;
    },

    getAllRoutes() {
      return Array.from(this.routes.values());
    },

    getActiveRoute() {
      return this.activeRoute;
    },

    clearActiveRoute() {
      this.activeRoute = null;
      this.activeIndex = 0;
      this.completed = false;
      this.paused = false;
    },

    removeRoute(id) {
      if (this.activeRoute && this.activeRoute.id === id) {
        this.clearActiveRoute();
      }

      return this.routes.delete(id);
    },

    emit(name, detail) {
      window.dispatchEvent(new CustomEvent("sx:" + name, {
        detail: detail || {}
      }));
    },

    reset() {
      this.clearActiveRoute();
      this.routes.clear();
    }
  };

  SX.routeManager = RouteManager;

  window.dispatchEvent(new CustomEvent("sx:route-manager-ready"));

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 57
   END
========================================================= */
