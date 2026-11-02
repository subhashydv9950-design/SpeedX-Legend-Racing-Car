
/* =========================================================
   SUPERX LEGEND — FILE 32
   FILE: js/auth.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = (window.SUPERX = window.SUPERX || {});

  const state = {
    initialized: false,
    authenticated: false,
    user: null,
    provider: null
  };

  function emit(eventName, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(`superx:auth-${eventName}`, { detail })
    );
  }

  function getProfileName() {
    return (
      SX.player?.name ||
      SX.player?.username ||
      "Player"
    );
  }

  function getUser() {
    return state.user ? { ...state.user } : null;
  }

  function getStatus() {
    return {
      initialized: state.initialized,
      authenticated: state.authenticated,
      provider: state.provider,
      user: getUser()
    };
  }

  function getProvider() {
    return SX.authProvider || null;
  }

  function registerProvider(provider) {
    if (!provider || typeof provider !== "object") {
      return {
        success: false,
        message: "Invalid authentication provider."
      };
    }

    const required = [
      "signIn",
      "signOut",
      "getCurrentUser"
    ];

    for (const method of required) {
      if (typeof provider[method] !== "function") {
        return {
          success: false,
          message: `Missing authentication method: ${method}`
        };
      }
    }

    SX.authProvider = provider;

    emit("provider-ready");

    return { success: true };
  }

  function normalizeUser(user, providerName) {
    if (!user || typeof user !== "object") {
      return null;
    }

    return {
      id: String(user.id || user.uid || ""),
      name: String(
        user.name ||
        user.displayName ||
        getProfileName()
      ).slice(0, 30),
      email: String(user.email || ""),
      avatar: String(
        user.avatar ||
        user.photoURL ||
        ""
      ),
      provider: providerName || "unknown"
    };
  }

  async function signIn(providerName, credentials = {}) {
    const provider = getProvider();

    if (!provider) {
      return {
        success: false,
        message:
          "Authentication backend is not configured. Login is not available yet."
      };
    }

    if (state.authenticated) {
      return {
        success: false,
        message: "You are already signed in."
      };
    }

    try {
      emit("signing-in", { provider: providerName });

      const result = await provider.signIn({
        provider: String(providerName || ""),
        credentials
      });

      if (!result || result.success === false) {
        throw new Error(
          result?.message || "Sign-in failed."
        );
      }

      const user = normalizeUser(
        result.user || result,
        providerName
      );

      if (!user || !user.id) {
        throw new Error("Invalid user information received.");
      }

      state.user = user;
      state.provider = providerName;
      state.authenticated = true;

      emit("signed-in", { user: getUser() });

      return {
        success: true,
        user: getUser()
      };

    } catch (error) {
      emit("sign-in-error", {
        message: error.message
      });

      return {
        success: false,
        message: error.message || "Sign-in failed."
      };
    }
  }

  async function signInWithGoogle() {
    return signIn("google");
  }

  async function signInWithFacebook() {
    return signIn("facebook");
  }

  async function signInWithPhone(phoneNumber) {
    const phone = String(phoneNumber || "").trim();

    if (!phone) {
      return {
        success: false,
        message: "Enter your mobile number."
      };
    }

    return signIn("phone", {
      phoneNumber: phone
    });
  }

  async function signOut() {
    const provider = getProvider();

    try {
      if (provider && state.authenticated) {
        await provider.signOut();
      }

      state.user = null;
      state.provider = null;
      state.authenticated = false;

      emit("signed-out");

      return { success: true };

    } catch (error) {
      return {
        success: false,
        message: error.message || "Sign-out failed."
      };
    }
  }

  async function refreshUser() {
    const provider = getProvider();

    if (!provider) {
      return {
        success: false,
        message: "Authentication backend is not configured."
      };
    }

    try {
      const user = await provider.getCurrentUser();

      if (!user) {
        state.user = null;
        state.provider = null;
        state.authenticated = false;

        return { success: true, user: null };
      }

      state.user = normalizeUser(
        user,
        user.provider || state.provider
      );

      state.provider = state.user.provider;
      state.authenticated = Boolean(state.user.id);

      emit("user-refreshed", { user: getUser() });

      return {
        success: true,
        user: getUser()
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  function updateProfileName(name) {
    const value = String(name || "").trim();

    if (!value || value.length > 30) {
      return {
        success: false,
        message: "Name must contain 1–30 characters."
      };
    }

    if (SX.player) {
      SX.player.name = value;

      if (typeof SX.savePlayer === "function") {
        SX.savePlayer();
      }
    }

    if (state.user) {
      state.user.name = value;
    }

    emit("profile-updated", { name: value });

    return { success: true };
  }

  function bindUI(root = document) {
    root.querySelectorAll("[data-auth-action]").forEach(button => {
      if (button.dataset.authBound === "true") return;

      button.dataset.authBound = "true";

      button.addEventListener("click", async () => {
        const action = button.dataset.authAction;

        button.disabled = true;

        let result;

        try {
          if (action === "google") {
            result = await signInWithGoogle();
          } else if (action === "facebook") {
            result = await signInWithFacebook();
          } else if (action === "phone") {
            const input = root.querySelector("[data-auth-phone]");
            result = await signInWithPhone(input?.value);
          } else if (action === "logout") {
            result = await signOut();
          } else {
            result = {
              success: false,
              message: "Unknown authentication action."
            };
          }

          button.dispatchEvent(
            new CustomEvent("superx:auth-action-result", {
              bubbles: true,
              detail: { action, result }
            })
          );

        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function init(root = document) {
    bindUI(root);

    state.initialized = true;

    if (getProvider()) {
      await refreshUser();
    }

    emit("initialized", getStatus());

    return getStatus();
  }

  SX.auth = {
    init,
    registerProvider,
    getUser,
    getStatus,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signInWithPhone,
    signOut,
    refreshUser,
    updateProfileName
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), {
      once: true
    });
  } else {
    init();
  }

})();

/* =========================================================
   SUPERX LEGEND — FILE 32
   END
========================================================= */
