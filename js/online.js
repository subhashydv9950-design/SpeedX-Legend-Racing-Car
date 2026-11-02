
/* =========================================================
   SUPERX LEGEND — FILE 31
   FILE: js/online.js
   START
========================================================= */

(() => {
  "use strict";

  const SX = (window.SUPERX = window.SUPERX || {});

  const CONFIG = {
    minPlayers: 2,
    maxPlayers: 12,
    quickJoinPlayers: 8,
    maxRoomName: 24,
    maxFriends: 100
  };

  const state = {
    connected: false,
    connecting: false,
    playerId: null,
    playerName: "Player",
    room: null,
    friends: [],
    invitations: [],
    lastError: null
  };

  function emit(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(`superx:online-${name}`, { detail })
    );
  }

  function getPlayerName() {
    const player = SX.player || {};
    return String(
      player.name ||
      player.username ||
      state.playerName ||
      "Player"
    ).slice(0, 24);
  }

  function makeId(prefix = "SX") {
    return (
      prefix +
      "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase() +
      "-" +
      Date.now().toString(36).toUpperCase()
    );
  }

  function setError(message) {
    state.lastError = message;
    emit("error", { message });
    return { success: false, message };
  }

  function getStatus() {
    return {
      connected: state.connected,
      connecting: state.connecting,
      playerId: state.playerId,
      playerName: state.playerName,
      room: state.room ? { ...state.room } : null,
      lastError: state.lastError,
      serverConfigured: Boolean(SX.onlineTransport)
    };
  }

  /*
   * Static GitHub Pages cannot create real multiplayer rooms.
   * A real server transport must be connected before multiplayer
   * operations can be enabled.
   */

  function registerTransport(transport) {
    if (!transport || typeof transport !== "object") {
      return setError("Invalid online transport.");
    }

    const required = [
      "connect",
      "disconnect",
      "createRoom",
      "joinRoom",
      "leaveRoom"
    ];

    for (const method of required) {
      if (typeof transport[method] !== "function") {
        return setError(
          `Online transport is missing: ${method}`
        );
      }
    }

    SX.onlineTransport = transport;

    emit("transport-ready");

    return { success: true };
  }

  async function connect(credentials = {}) {
    if (!SX.onlineTransport) {
      return setError(
        "Multiplayer server is not configured yet."
      );
    }

    if (state.connecting) {
      return setError("Connection is already in progress.");
    }

    state.connecting = true;
    state.lastError = null;
    state.playerName = getPlayerName();

    emit("connecting");

    try {
      const result = await SX.onlineTransport.connect({
        ...credentials,
        playerName: state.playerName
      });

      if (!result || result.success === false) {
        throw new Error(
          result?.message || "Connection failed."
        );
      }

      state.connected = true;
      state.playerId = result.playerId || makeId("PLAYER");
      state.connecting = false;

      emit("connected", getStatus());

      return {
        success: true,
        playerId: state.playerId
      };

    } catch (error) {
      state.connected = false;
      state.connecting = false;

      return setError(
        error.message || "Unable to connect."
      );
    }
  }

  async function disconnect() {
    try {
      if (SX.onlineTransport && state.connected) {
        await SX.onlineTransport.disconnect();
      }

      state.connected = false;
      state.connecting = false;
      state.playerId = null;
      state.room = null;

      emit("disconnected");

      return { success: true };

    } catch (error) {
      return setError(error.message);
    }
  }

  function validateRoomOptions(options = {}) {
    const name = String(options.name || "SUPERX ROOM").trim();
    const maxPlayers = Number(options.maxPlayers || CONFIG.maxPlayers);

    if (!name || name.length > CONFIG.maxRoomName) {
      return {
        success: false,
        message: "Room name must be 1–24 characters."
      };
    }

    if (
      !Number.isInteger(maxPlayers) ||
      maxPlayers < CONFIG.minPlayers ||
      maxPlayers > CONFIG.maxPlayers
    ) {
      return {
        success: false,
        message: "Room size must be between 2 and 12."
      };
    }

    return {
      success: true,
      options: {
        name,
        maxPlayers,
        isPrivate: Boolean(options.isPrivate),
        gameMode: String(options.gameMode || "race")
      }
    };
  }

  async function createRoom(options = {}) {
    if (!state.connected || !SX.onlineTransport) {
      return setError("Connect to the multiplayer server first.");
    }

    const validation = validateRoomOptions(options);

    if (!validation.success) return validation;

    try {
      const result = await SX.onlineTransport.createRoom(
        validation.options
      );

      if (!result || result.success === false) {
        throw new Error(result?.message || "Room creation failed.");
      }

      state.room = {
        id: result.roomId || result.id,
        name: validation.options.name,
        maxPlayers: validation.options.maxPlayers,
        players: result.players || [],
        isHost: true,
        gameMode: validation.options.gameMode
      };

      emit("room-created", { room: { ...state.room } });

      return {
        success: true,
        room: { ...state.room }
      };

    } catch (error) {
      return setError(error.message);
    }
  }

  async function joinRoom(roomId) {
    if (!state.connected || !SX.onlineTransport) {
      return setError("Connect to the multiplayer server first.");
    }

    const id = String(roomId || "").trim();

    if (!id) return setError("Enter a valid room ID.");

    try {
      const result = await SX.onlineTransport.joinRoom(id);

      if (!result || result.success === false) {
        throw new Error(result?.message || "Unable to join room.");
      }

      state.room = {
        id: result.roomId || id,
        name: result.name || "SUPERX ROOM",
        maxPlayers: result.maxPlayers || CONFIG.maxPlayers,
        players: result.players || [],
        isHost: false,
        gameMode: result.gameMode || "race"
      };

      emit("room-joined", { room: { ...state.room } });

      return {
        success: true,
        room: { ...state.room }
      };

    } catch (error) {
      return setError(error.message);
    }
  }

  async function quickJoin() {
    if (!state.connected || !SX.onlineTransport) {
      return setError("Connect to the multiplayer server first.");
    }

    if (typeof SX.onlineTransport.quickJoin !== "function") {
      return setError("Quick Join is not available on this server.");
    }

    try {
      const result = await SX.onlineTransport.quickJoin({
        targetPlayers: CONFIG.quickJoinPlayers
      });

      if (!result || result.success === false) {
        throw new Error(result?.message || "No room available.");
      }

      state.room = {
        id: result.roomId,
        name: result.name || "QUICK RACE",
        maxPlayers: result.maxPlayers || CONFIG.quickJoinPlayers,
        players: result.players || [],
        isHost: false,
        gameMode: result.gameMode || "race"
      };

      emit("quick-joined", { room: { ...state.room } });

      return {
        success: true,
        room: { ...state.room }
      };

    } catch (error) {
      return setError(error.message);
    }
  }

  async function leaveRoom() {
    if (!state.room) {
      return { success: true };
    }

    try {
      if (SX.onlineTransport) {
        await SX.onlineTransport.leaveRoom(state.room.id);
      }

      const oldRoom = state.room;
      state.room = null;

      emit("room-left", { room: oldRoom });

      return { success: true };

    } catch (error) {
      return setError(error.message);
    }
  }

  function getRoom() {
    return state.room ? { ...state.room } : null;
  }

  function getRoomCapacity() {
    if (!state.room) return null;

    return {
      current: state.room.players.length,
      maximum: state.room.maxPlayers,
      available: Math.max(
        0,
        state.room.maxPlayers - state.room.players.length
      )
    };
  }

  function addFriend(friend) {
    if (!friend || typeof friend !== "object") {
      return setError("Invalid friend information.");
    }

    const id = String(friend.id || "").trim();
    const name = String(friend.name || "").trim();

    if (!id || !name) {
      return setError("Friend ID and name are required.");
    }

    if (state.friends.some(item => item.id === id)) {
      return setError("Friend already exists.");
    }

    if (state.friends.length >= CONFIG.maxFriends) {
      return setError("Friend list is full.");
    }

    const item = {
      id,
      name: name.slice(0, 24),
      status: "offline",
      addedAt: Date.now()
    };

    state.friends.push(item);

    emit("friend-added", { friend: { ...item } });

    return {
      success: true,
      friend: { ...item }
    };
  }

  function removeFriend(friendId) {
    const before = state.friends.length;

    state.friends = state.friends.filter(
      friend => friend.id !== String(friendId)
    );

    const removed = before !== state.friends.length;

    if (removed) {
      emit("friend-removed", { friendId });
    }

    return { success: removed };
  }

  function getFriends() {
    return state.friends.map(friend => ({ ...friend }));
  }

  async function inviteFriend(friendId) {
    if (!state.connected || !state.room || !SX.onlineTransport) {
      return setError("Join a room before inviting friends.");
    }

    if (typeof SX.onlineTransport.inviteFriend !== "function") {
      return setError("Friend invitations are not supported yet.");
    }

    const friend = state.friends.find(
      item => item.id === String(friendId)
    );

    if (!friend) return setError("Friend not found.");

    try {
      const result = await SX.onlineTransport.inviteFriend({
        friendId: friend.id,
        roomId: state.room.id
      });

      if (!result || result.success === false) {
        throw new Error(result?.message || "Invitation failed.");
      }

      emit("invitation-sent", {
        friend,
        roomId: state.room.id
      });

      return { success: true };

    } catch (error) {
      return setError(error.message);
    }
  }

  function addInvitation(invitation) {
    if (!invitation || !invitation.roomId) {
      return setError("Invalid invitation.");
    }

    const item = {
      id: invitation.id || makeId("INVITE"),
      roomId: String(invitation.roomId),
      roomName: String(invitation.roomName || "SUPERX ROOM"),
      from: String(invitation.from || "Player"),
      receivedAt: Date.now()
    };

    state.invitations.push(item);

    emit("invitation-received", { invitation: { ...item } });

    return { success: true, invitation: { ...item } };
  }

  function getInvitations() {
    return state.invitations.map(item => ({ ...item }));
  }

  function removeInvitation(invitationId) {
    state.invitations = state.invitations.filter(
      item => item.id !== String(invitationId)
    );
  }

  function bindUI(root = document) {
    root.querySelectorAll("[data-online-action]").forEach(button => {
      if (button.dataset.onlineBound === "true") return;

      button.dataset.onlineBound = "true";

      button.addEventListener("click", async () => {
        const action = button.dataset.onlineAction;

        button.disabled = true;

        try {
          let result;

          if (action === "connect") {
            result = await connect();
          } else if (action === "disconnect") {
            result = await disconnect();
          } else if (action === "create-room") {
            const name =
              root.querySelector("[data-room-name]")?.value ||
              "SUPERX ROOM";

            const maxPlayers = Number(
              root.querySelector("[data-room-size]")?.value || 12
            );

            result = await createRoom({ name, maxPlayers });
          } else if (action === "quick-join") {
            result = await quickJoin();
          } else if (action === "leave-room") {
            result = await leaveRoom();
          } else if (action === "join-room") {
            const roomId =
              root.querySelector("[data-room-id]")?.value;

            result = await joinRoom(roomId);
          } else {
            result = setError("Unknown online action.");
          }

          button.dispatchEvent(
            new CustomEvent("superx:online-action-result", {
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

  function init(root = document) {
    bindUI(root);
    emit("initialized", getStatus());
    return getStatus();
  }

  SX.online = {
    config: { ...CONFIG },
    init,
    registerTransport,
    connect,
    disconnect,
    getStatus,
    createRoom,
    joinRoom,
    quickJoin,
    leaveRoom,
    getRoom,
    getRoomCapacity,
    addFriend,
    removeFriend,
    getFriends,
    inviteFriend,
    addInvitation,
    getInvitations,
    removeInvitation
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
   SUPERX LEGEND — FILE 31
   END
========================================================= */
        
