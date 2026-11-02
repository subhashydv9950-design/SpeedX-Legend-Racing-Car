
/* =========================================================
   SUPERX LEGEND — FILE 72
   FILE: js/vehicle-visual-effects.js
   PURPOSE: Vehicle smoke, dust, skid and collision effects
   START
========================================================= */

(function (window) {
  "use strict";

  const SX = window.SUPERX = window.SUPERX || {};

  const VisualEffects = {
    scene: null,
    vehicle: null,
    effects: [],
    enabled: true,
    initialized: false,

    settings: {
      smoke: true,
      dust: true,
      skid: true,
      collision: true,
      particleLimit: 160,
      particleLifetime: 1.5
    },

    init(options = {}) {
      this.scene = options.scene || null;
      this.vehicle = options.vehicle || null;

      if (!this.scene || !window.THREE) {
        return false;
      }

      this.clear();
      this.initialized = true;

      return true;
    },

    createParticle(position, options = {}) {
      if (!this.initialized ||
          !this.enabled ||
          this.effects.length >= this.settings.particleLimit) {
        return null;
      }

      const THREE = window.THREE;

      const material = new THREE.MeshBasicMaterial({
        color: options.color || 0xb9b9b9,
        transparent: true,
        opacity: options.opacity ?? 0.55,
        depthWrite: false
      });

      const geometry = new THREE.SphereGeometry(
        options.size || 0.12,
        6,
        6
      );

      const mesh = new THREE.Mesh(
        geometry,
        material
      );

      mesh.position.copy(position);

      this.scene.add(mesh);

      const particle = {
        mesh,
        velocity: new THREE.Vector3(
          options.vx || 0,
          options.vy || 0.5,
          options.vz || 0
        ),
        age: 0,
        lifetime: options.lifetime ||
          this.settings.particleLifetime,
        initialOpacity: options.opacity ?? 0.55,
        growth: options.growth || 0.35
      };

      this.effects.push(particle);

      return particle;
    },

    getVehiclePosition() {
      if (!this.vehicle?.position) return null;

      return this.vehicle.position.clone();
    },

    emitSmoke(position, amount = 3) {
      if (!this.settings.smoke) return;

      const origin = position?.clone
        ? position.clone()
        : this.getVehiclePosition();

      if (!origin) return;

      for (let i = 0; i < amount; i++) {
        this.createParticle(origin, {
          color: 0x777777,
          size: 0.13 + Math.random() * 0.1,
          opacity: 0.35,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.35 + Math.random() * 0.5,
          vz: (Math.random() - 0.5) * 0.8,
          growth: 0.5
        });
      }
    },

    emitDust(position, amount = 4) {
      if (!this.settings.dust) return;

      const origin = position?.clone
        ? position.clone()
        : this.getVehiclePosition();

      if (!origin) return;

      for (let i = 0; i < amount; i++) {
        this.createParticle(origin, {
          color: 0xc2a47b,
          size: 0.08 + Math.random() * 0.08,
          opacity: 0.45,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 0.2 + Math.random() * 0.3,
          vz: (Math.random() - 0.5) * 1.2,
          growth: 0.3
        });
      }
    },

    emitSkid(position, amount = 2) {
      if (!this.settings.skid) return;

      const origin = position?.clone
        ? position.clone()
        : this.getVehiclePosition();

      if (!origin) return;

      for (let i = 0; i < amount; i++) {
        this.createParticle(origin, {
          color: 0x333333,
          size: 0.1,
          opacity: 0.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.08,
          vz: (Math.random() - 0.5) * 0.5,
          growth: 0.2,
          lifetime: 0.7
        });
      }
    },

    emitCollision(position, intensity = 1) {
      if (!this.settings.collision) return;

      const origin = position?.clone
        ? position.clone()
        : this.getVehiclePosition();

      if (!origin) return;

      const count = Math.min(
        18,
        Math.max(4, Math.round(intensity * 12))
      );

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const upward = 0.3 + Math.random() * 1.5;

        this.createParticle(origin, {
          color: Math.random() > 0.5
            ? 0xffa52f
            : 0xffe6a3,
          size: 0.04 + Math.random() * 0.06,
          opacity: 0.9,
          vx: Math.cos(angle) * (0.5 + Math.random()),
          vy: upward,
          vz: Math.sin(angle) * (0.5 + Math.random()),
          growth: 0.08,
          lifetime: 0.45 + Math.random() * 0.4
        });
      }
    },

    update(deltaTime = 0.016) {
      if (!this.initialized) return;

      const dt = Math.min(
        Math.max(deltaTime, 0),
        0.05
      );

      for (let i = this.effects.length - 1; i >= 0; i--) {
        const particle = this.effects[i];

        particle.age += dt;

        if (particle.age >= particle.lifetime) {
          this.removeParticle(i);
          continue;
        }

        const mesh = particle.mesh;

        mesh.position.x += particle.velocity.x * dt;
        mesh.position.y += particle.velocity.y * dt;
        mesh.position.z += particle.velocity.z * dt;

        particle.velocity.y -= 0.45 * dt;

        const progress = particle.age / particle.lifetime;

        mesh.material.opacity =
          particle.initialOpacity * (1 - progress);

        const scale = 1 + progress * particle.growth;

        mesh.scale.setScalar(scale);
      }
    },

    removeParticle(index) {
      const particle = this.effects[index];

      if (!particle) return;

      this.scene?.remove(particle.mesh);

      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();

      this.effects.splice(index, 1);
    },

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (!this.enabled) {
        this.clear();
      }

      return this.enabled;
    },

    updateSettings(options = {}) {
      Object.keys(this.settings).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(options, key)) {
          this.settings[key] = options[key];
        }
      });

      this.settings.particleLimit = Math.max(
        10,
        Math.min(500, Number(this.settings.particleLimit) || 160)
      );

      return { ...this.settings };
    },

    getState() {
      return {
        enabled: this.enabled,
        initialized: this.initialized,
        activeParticles: this.effects.length,
        settings: { ...this.settings }
      };
    },

    clear() {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        this.removeParticle(i);
      }
    },

    destroy() {
      this.clear();

      this.scene = null;
      this.vehicle = null;
      this.initialized = false;
    }
  };

  SX.vehicleVisualEffects = VisualEffects;

  window.addEventListener("sx:vehicle-collision", event => {
    VisualEffects.emitCollision(
      event.detail?.position,
      event.detail?.intensity || 1
    );
  });

  window.addEventListener("sx:vehicle-skid", event => {
    VisualEffects.emitSkid(
      event.detail?.position,
      event.detail?.amount || 2
    );
  });

  window.addEventListener("sx:vehicle-dust", event => {
    VisualEffects.emitDust(
      event.detail?.position,
      event.detail?.amount || 4
    );
  });

})(window);

/* =========================================================
   SUPERX LEGEND — FILE 72
   FILE: js/vehicle-visual-effects.js
   END
========================================================= */
