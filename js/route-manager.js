
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
        totalDistance: 0,
        createdAt: Date.now()
      };

      for (let i = 0; i < points.length; i++) {
        if (i === 0) continue;

        route.totalDistance += this.distance(
          points[i - 1],
          points[i]
        );
      }

      route.checkpoints = this.generateCheckpoints(
        points,
        options.checkpointCount || 5
      );

      this.routes.set(id, route);

      return {
        success: true,
        route
      };
    },

    distance(a, b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;

      return Math.sqrt(
        dx * dx + dy * dy + dz * dz
      );
    },

    generateCheckpoints(points, count) {
      const checkpoints = [];
      const total = points.length - 1;

      count = Math.max(
        1,
        Math.min(Number(count) || 5, total)
      );

      for (let i = 1; i <= count; i++) {
        const index = Math.round(
          (i / (count + 1)) * total
        );

        const point = points[index];

        if (point) {
          checkpoints.push({
            id: "checkpoint-" + i,
            x: point.x,
            y: point.y,
            z: point.z,
            reached: false
          });
        }
      }

      return checkpoints;
    },

    loadRoute(id) {
      const route = this.routes.get(id);

      if (!route) return false;

      this.activeRoute = route;
      this.activeIndex = 0;
      this.completed = false;

      route.checkpoints.forEach(checkpoint => {
        checkpoint.reached = false;
      });

      return true;
    },

    loadRouteData(route) {
      if (!route || !Array.isArray(route.points)) {
        return false;
      }

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

      return this.activeRoute.points[
        this.activeIndex
      ] || null;
    },

    getNextPoint() {
      if (!this.activeRoute) return null;

      return this.activeRoute.points[
        this.activeIndex + 1
      ] || null;
    },

    advance() {
      if (!this.activeRoute || this.completed) {
        return false;
      }

      if (
        this.activeIndex <
        this.activeRoute.points.length - 1
      ) {
        this.activeIndex++;
        return true;
      }

      this.completed = true;

      window.dispatchEvent(
        new CustomEvent("sx:route-completed", {
          detail: {
            routeId: this.activeRoute.id,
            distance: this.activeRoute.totalDistance
          }
        })
      );

      return false;
    },

    updateCheckpoint(position, radius = 12) {
      if (!this.activeRoute || !position) {
        return null;
      }

      const checkpoint = this.activeRoute.checkpoints.find(
        item => !item.reached
      );

      if (!checkpoint) return null;

      const distance = this.distance(
        position,
        checkpoint
      );

      if (distance <= radius) {
        checkpoint.reached = true;

        window.dispatchEvent(
          new CustomEvent("sx:route-checkpoint", {
            detail: {
              checkpointId: checkpoint.id,
              routeId: this.activeRoute.id
            }
          })
        );

        return checkpoint;
      }

      return null;
    },

    getProgress(position) {
      if (!this.activeRoute) {
        return {
          active: false,
          percentage: 0,
          distanceRemaining: 0
        };
      }

      const route = this.activeRoute;
      const current = route.points[this.activeIndex];

      let remaining = 0;

      for (
        let i = this.activeIndex + 1;
        i < route.points.length;
        i++
      ) {
        remaining += this.distance(
          route.points[i - 1],
          route.points[i]
        );
      }

      let distanceFromCurrent = 0;

      if (position && current) {
        distanceFromCurrent = this.distance(
          position,
          current
        );
      }

      const travelled = Math.max(
        0,
        route.totalDistance - remaining -
        distanceFromCurrent
      );

      const percentage = route.totalDistance > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (travelled / route.totalDistance) * 100
            )
          )
        : 0;

      return {
        active: true,
        routeId: route.id,
        distanceTotal: route.totalDistance,
        distanceTravelled: travelled,
        distanceRemaining: remaining,
        percentage: Math.round(percentage * 10) / 10,
        currentIndex: this.activeIndex,
        totalPoints: route.points.length,
        completed: this.completed
      };
    },

    getRoute(id) {
      return this.routes.get(id) || null;
    },

    getAllRoutes() {
      return Array.from(this.routes.values());
    },

    clearActiveRoute() {
      this.activeRoute = null;
      this.activeIndex = 0;
      this.completed = false;
    },

    removeRoute(id) {
      if (
        this.activeRoute &&
        this.activeRoute.id === id
      ) {
        this.clearActiveRoute();
      }

      return this.routes.delete(id);
    },

    reset() {
      this.clearActiveRoute();
      this.routes.clear();
    }
  };

  SX.routeManager = RouteManager;

  window.dispatchEvent(
    new CustomEvent("sx:route-manager-ready")
  );

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 57
   FILE: js/route-manager.js
   END
========================================================= */
