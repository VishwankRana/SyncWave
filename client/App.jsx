import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../shared/contracts.js";
import AuthScreen from "./components/AuthScreen.jsx";
import RoomWorkspace from "./components/RoomWorkspace.jsx";
import Sidebar from "./components/Sidebar.jsx";
import {
  SOCKET_URL,
  createRoomProfile,
  generateInviteCode,
  getTrackEmbedUrl,
  initialRoomId,
  joinMessage,
  loadScriptOnce,
  makeRoomId,
  pendingInviteCode,
  resolveInviteCode,
} from "./lib/musicyfy.js";
import {
  getCurrentUser,
  getStoredToken,
  googleSignIn,
  login,
  register,
  storeToken,
} from "./lib/auth.js";
import "./App.css";

function getMemberCount(members) {
  if (!members) {
    return 0;
  }

  if (members instanceof Map) {
    return members.size;
  }

  return Object.keys(members).length;
}

function getMemberList(members) {
  if (!members) {
    return [];
  }

  if (members instanceof Map) {
    return Array.from(members.values());
  }

  return Object.values(members);
}

function App() {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId);
  const [token, setToken] = useState(() => getStoredToken());
  const [authMode, setAuthMode] = useState("login");
  const [authStatus, setAuthStatus] = useState(() =>
    getStoredToken() ? "checking" : "guest",
  );
  const [authNotice, setAuthNotice] = useState("");
  const [user, setUser] = useState(null);
  const [roomNameDraft, setRoomNameDraft] = useState("Studio Room");
  const [roomState, setRoomState] = useState(null);
  const [chatDraft, setChatDraft] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("offline");
  const [notice, setNotice] = useState("");
  const [playerStatus, setPlayerStatus] = useState("idle");
  const [skipVotes, setSkipVotes] = useState({ trackId: null, voters: [] });
  const [toast, setToast] = useState("");
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef(null);
  const playerIframeRef = useRef(null);
  const soundCloudWidgetRef = useRef(null);
  const displayNameRef = useRef("");
  const clockOffsetRef = useRef(0);
  const trackProgressRef = useRef({ currentTimeMs: 0, durationMs: 0 });

  const [trackProgress, setTrackProgress] = useState({
    currentTimeMs: 0,
    durationMs: 0,
  });


  useEffect(() => {
    displayNameRef.current = user?.name ?? "";
  }, [user]);

  // Fetch public rooms for discovery
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPublicRooms() {
      try {
        const res = await fetch("/api/rooms/public");
        const data = await res.json();
        if (data.ok && data.rooms) {
          setPublicRooms(data.rooms);
        }
      } catch {
        // silently fail
      }
    }

    fetchPublicRooms();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPublicRooms, 30000);
    return () => clearInterval(interval);
  }, [authStatus]);

  useEffect(() => {
    if (!token) {
      setAuthStatus("guest");
      setUser(null);
      return;
    }

    let cancelled = false;
    setAuthStatus("checking");

    async function restoreSession() {
      try {
        const result = await getCurrentUser(token);

        if (cancelled) {
          return;
        }

        setUser(result.user);
        setAuthStatus("authenticated");
        setAuthNotice("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        storeToken(null);
        setToken(null);
        setUser(null);
        setAuthStatus("guest");
        setAuthNotice(error.message || "Session expired");
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogout = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    storeToken(null);
    setToken(null);
    setUser(null);
    setRooms([]);
    setRoomState(null);
    setActiveRoomId(initialRoomId);
    setConnectionStatus("offline");
    setNotice("");
    setPlayerStatus("idle");
    setAuthStatus("guest");
    setAuthNotice("");
  }, []);

  const handleAuth = useCallback(async (type, credentials) => {
    setAuthNotice("");
    setAuthStatus("submitting");

    try {
      const result = await (type === "register"
        ? register(credentials)
        : login(credentials));

      storeToken(result.token);
      setToken(result.token);
      setUser(result.user);
      setAuthStatus("authenticated");
    } catch (error) {
      setAuthStatus("guest");
      setAuthNotice(error.message || "Authentication failed");
    }
  }, []);

  const handleGoogleAuth = useCallback(async (credential) => {
    setAuthNotice("");
    setAuthStatus("submitting");

    try {
      const result = await googleSignIn(credential);
      storeToken(result.token);
      setToken(result.token);
      setUser(result.user);
      setAuthStatus("authenticated");
    } catch (error) {
      setAuthStatus("guest");
      setAuthNotice(error.message || "Google authentication failed");
    }
  }, []);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null,
    [activeRoomId, rooms],
  );

  const memberList = useMemo(
    () => getMemberList(roomState?.members),
    [roomState?.members],
  );
  const membersCount = getMemberCount(roomState?.members);
  const queue = roomState?.queue ?? [];
  const messages = roomState?.chat ?? [];
  const currentTrack = roomState?.nowPlaying?.track ?? queue[0] ?? null;
  const isPlaying = roomState?.nowPlaying?.status === "playing";
  const playbackPositionMs = roomState?.nowPlaying?.positionMs ?? 0;
  const hostUserId = roomState?.hostUserId ?? null;
  const isHost = !!(user && hostUserId && user.userId === hostUserId);
  const currentTrackEmbedUrl = getTrackEmbedUrl(currentTrack);
  const history = roomState?.history ?? [];
  const currentTrackIndex = currentTrack
    ? queue.findIndex((t) => t.id === currentTrack.id)
    : -1;
  const playerLabel = !currentTrack
    ? "No track loaded"
    : playerStatus === "loading"
      ? "Buffering..."
      : isPlaying
        ? "Playing"
        : "Paused";

  const syncRoomProfileFromState = useCallback((state) => {
    if (!state?.roomId) {
      return;
    }

    setRooms((existing) => {
      const listenerCount = getMemberCount(state.members) || 1;
      const roomName =
        state.roomName ??
        existing.find((room) => room.id === state.roomId)?.name ??
        state.roomId;

      if (existing.some((room) => room.id === state.roomId)) {
        return existing.map((room) =>
          room.id === state.roomId
            ? {
                ...room,
                name: roomName,
                listeners: listenerCount,
                hostUserId: state.hostUserId ?? room.hostUserId,
              }
            : room,
        );
      }

      return [
        ...existing,
        createRoomProfile(
          state.roomId,
          roomName,
          state.createdByName ?? displayNameRef.current,
          listenerCount,
          state.hostUserId ?? null,
        ),
      ];
    });
  }, []);

  const joinRoom = useCallback(
    (socket, roomId) => {
      if (!socket || !roomId) {
        return;
      }

      setConnectionStatus(socket.connected ? "connected" : "connecting");
      socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId }, (ack) => {
        if (!ack?.ok || !ack.state) {
          setNotice(ack?.error ?? "Room could not be joined");
          return;
        }

        setRoomState(ack.state);
        syncRoomProfileFromState(ack.state);
        setNotice(`Joined ${ack.state.roomName ?? roomId}`);
      });
    },
    [syncRoomProfileFromState],
  );

  const requestClockSync = useCallback((socket) => {
    if (!socket) {
      return;
    }

    const clientSentAtMs = Date.now();
    socket.emit(SOCKET_EVENTS.CLOCK_SYNC, { clientSentAtMs }, (ack) => {
      if (!ack?.serverReceivedAtMs || !ack?.serverTransmitAtMs) {
        return;
      }

      const clientReceivedAtMs = Date.now();
      const roundTripMs = clientReceivedAtMs - clientSentAtMs;
      const oneWayMs = roundTripMs / 2;
      // offset = how much to add to local time to get server time
      clockOffsetRef.current =
        ack.serverReceivedAtMs - clientSentAtMs - oneWayMs;
    });
  }, []);

  const playEmbeddedTrack = useCallback(
    (track = currentTrack) => {
      const iframe = playerIframeRef.current;

      if (!iframe || !track) {
        return;
      }

      if (track.provider === "youtube") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "playVideo",
            args: "",
          }),
          "*",
        );
        return;
      }

      if (track.provider === "soundcloud") {
        soundCloudWidgetRef.current?.play();
      }
    },
    [currentTrack],
  );

  const pauseEmbeddedTrack = useCallback(
    (track = currentTrack) => {
      const iframe = playerIframeRef.current;

      if (!iframe || !track) {
        return;
      }

      if (track.provider === "youtube") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "pauseVideo",
            args: "",
          }),
          "*",
        );
        return;
      }

      if (track.provider === "soundcloud") {
        soundCloudWidgetRef.current?.pause();
      }
    },
    [currentTrack],
  );

  // Calculate where the player should be based on server time
  const seekToSyncPosition = useCallback((nowPlaying) => {
    if (
      !nowPlaying?.track ||
      nowPlaying.status !== "playing" ||
      !nowPlaying.startedAtMs
    ) {
      return;
    }

    const iframe = playerIframeRef.current;
    if (!iframe) {
      return;
    }

    // Convert local time to server time, then calculate position
    const serverNowMs = Date.now() + clockOffsetRef.current;
    const elapsedMs = serverNowMs - nowPlaying.startedAtMs;
    const seekSeconds = Math.max(0, (nowPlaying.positionMs + elapsedMs) / 1000);

    if (nowPlaying.track.provider === "youtube" && seekSeconds > 1) {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seekSeconds, true],
        }),
        "*",
      );
    }

    if (
      nowPlaying.track.provider === "soundcloud" &&
      soundCloudWidgetRef.current
    ) {
      try {
        soundCloudWidgetRef.current.seekTo(seekSeconds * 1000);
      } catch {
        // widget may not be ready
      }
    }
  }, []);

  useEffect(() => {
    if (!token || authStatus !== "authenticated") {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnectionStatus("offline");
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: {
        token,
      },
    });

    socketRef.current = socket;
    setConnectionStatus("connecting");

    const fetchMyRooms = (sock) => {
      sock.emit(SOCKET_EVENTS.MY_ROOMS_LIST, {}, (ack) => {
        if (!ack?.ok || !ack.rooms) return;

        setRooms((existing) => {
          const merged = [...existing];
          for (const r of ack.rooms) {
            if (!merged.some((x) => x.id === r.roomId)) {
              merged.push(
                createRoomProfile(
                  r.roomId,
                  r.roomName,
                  r.createdByName,
                  r.listeners,
                  r.hostUserId,
                ),
              );
            }
          }
          return merged;
        });
      });
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      requestClockSync(socket);
      fetchMyRooms(socket);
    };

    const handleDisconnect = () => {
      setConnectionStatus("offline");
    };

    const handleRoomState = (state) => {
      // null state means room was deleted
      if (!state) {
        setRoomState(null);
        setNotice("This room has been deleted");
        return;
      }

      setRoomState(state);
      syncRoomProfileFromState(state);
      setConnectionStatus("connected");

      // Sync playback position when receiving room state
      if (
        state?.nowPlaying?.status === "playing" &&
        state?.nowPlaying?.startedAtMs
      ) {
        setTimeout(() => seekToSyncPosition(state.nowPlaying), 1500);
      }
    };

    const handlePresence = ({ roomId, members }) => {
      setRoomState((existing) =>
        existing && existing.roomId === roomId
          ? {
              ...existing,
              members,
            }
          : existing,
      );
      setRooms((existing) =>
        existing.map((room) =>
          room.id === roomId
            ? {
                ...room,
                listeners: getMemberCount(members),
              }
            : room,
        ),
      );
    };

    const handleChat = (message) => {
      const normalized = joinMessage(message);
      setRoomState((existing) =>
        existing
          ? {
              ...existing,
              chat: [...existing.chat, normalized].slice(-100),
            }
          : existing,
      );
    };

    const handlePlayback = ({ roomId, nowPlaying, queue: nextQueue }) => {
      setRoomState((existing) =>
        existing && existing.roomId === roomId
          ? {
              ...existing,
              nowPlaying,
              queue: nextQueue ?? existing.queue,
            }
          : existing,
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", (error) => {
      setConnectionStatus("offline");
      setNotice(
        error.message === "Authentication error"
          ? "Please sign in again"
          : "Backend connection failed",
      );

      if (error.message === "Authentication error") {
        handleLogout();
      }
    });
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);
    socket.on(SOCKET_EVENTS.CHAT_NEW, handleChat);
    socket.on(SOCKET_EVENTS.PLAYBACK_UPDATE, handlePlayback);

    const handleSkipVoteUpdate = ({ skipVotes: sv }) => {
      setSkipVotes(sv ?? { trackId: null, voters: [] });
    };
    socket.on(SOCKET_EVENTS.SKIP_VOTE_UPDATE, handleSkipVoteUpdate);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [
    authStatus,
    handleLogout,
    requestClockSync,
    seekToSyncPosition,
    syncRoomProfileFromState,
    token,
  ]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !activeRoomId || authStatus !== "authenticated") {
      return;
    }

    if (socket.connected) {
      joinRoom(socket, activeRoomId);
      return;
    }

    const onConnect = () => joinRoom(socket, activeRoomId);
    socket.once("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [activeRoomId, authStatus, joinRoom]);

  useEffect(() => {
    let cancelled = false;

    async function prepareSoundCloudWidget() {
      setPlayerStatus(currentTrack ? "loading" : "idle");

      if (currentTrack?.provider !== "soundcloud" || !playerIframeRef.current) {
        soundCloudWidgetRef.current = null;
        return;
      }

      try {
        await loadScriptOnce(
          "https://w.soundcloud.com/player/api.js",
          "soundcloud-widget-api",
        );

        if (
          cancelled ||
          !playerIframeRef.current ||
          typeof window.SC?.Widget !== "function"
        ) {
          return;
        }

        soundCloudWidgetRef.current = window.SC.Widget(playerIframeRef.current);
        setPlayerStatus("ready");
      } catch {
        soundCloudWidgetRef.current = null;
        setPlayerStatus("error");
      }
    }

    void prepareSoundCloudWidget();

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) {
      setPlayerStatus("idle");
      return;
    }

    if (isPlaying) {
      playEmbeddedTrack();
      return;
    }

    pauseEmbeddedTrack();
  }, [currentTrack, isPlaying, pauseEmbeddedTrack, playEmbeddedTrack]);

  useEffect(() => {
    if (currentTrack) {
      setPlayerStatus("loading");
      return;
    }

    setPlayerStatus("idle");
  }, [currentTrack]);

  // ============ AUTO-PLAY NEXT TRACK ============
  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !activeRoomId || !currentTrack) {
      return;
    }

    // YouTube: listen for "ended" state via postMessage
    function handleYouTubeMessage(event) {
      if (currentTrack?.provider !== "youtube") {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // YouTube iframe API sends info with playerState: 0 when video ends
        if (data?.event === "onStateChange" && data?.info === 0) {
          socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
            roomId: activeRoomId,
            type: "next",
          });
        }
      } catch {
        // ignore non-JSON messages
      }
    }

    window.addEventListener("message", handleYouTubeMessage);

    // SoundCloud: listen for FINISH event
    const widget = soundCloudWidgetRef.current;
    let scBound = false;

    if (
      currentTrack?.provider === "soundcloud" &&
      widget &&
      window.SC?.Widget?.Events
    ) {
      try {
        widget.bind(window.SC.Widget.Events.FINISH, () => {
          socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
            roomId: activeRoomId,
            type: "next",
          });
        });
        scBound = true;
      } catch {
        // widget not ready yet
      }
    }

    return () => {
      window.removeEventListener("message", handleYouTubeMessage);

      if (scBound && widget && window.SC?.Widget?.Events) {
        try {
          widget.unbind(window.SC.Widget.Events.FINISH);
        } catch {
          // ignore
        }
      }
    };
  }, [activeRoomId, currentTrack]);

  // ============ TRACK PROGRESS (for seek bar) ============
  useEffect(() => {
    if (!currentTrack) {
      setTrackProgress({ currentTimeMs: 0, durationMs: 0 });
      trackProgressRef.current = { currentTimeMs: 0, durationMs: 0 };
      return;
    }

    let rafId = null;
    let lastUpdate = 0;
    let ytDuration = 0;

    // YouTube: send "listening" handshake so the iframe sends infoDelivery events
    function initYouTubeListener() {
      const iframe = playerIframeRef.current;
      if (!iframe || currentTrack?.provider !== "youtube") return;

      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening" }),
          "*",
        );
      } catch {
        // cross-origin issue
      }
    }

    // Send immediately and retry a few times (iframe might not be ready)
    initYouTubeListener();
    const initRetries = [500, 1000, 2000, 4000];
    const retryTimers = initRetries.map((delay) =>
      setTimeout(initYouTubeListener, delay),
    );

    // YouTube: listen for infoDelivery postMessages
    function handleYouTubeInfo(event) {
      if (currentTrack?.provider !== "youtube") return;

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data?.event === "infoDelivery" && data?.info) {
          const info = data.info;

          if (typeof info.currentTime === "number") {
            trackProgressRef.current.currentTimeMs = info.currentTime * 1000;
          }

          if (typeof info.duration === "number" && info.duration > 0) {
            ytDuration = info.duration * 1000;
            trackProgressRef.current.durationMs = ytDuration;
          }
        }
      } catch {
        // ignore non-JSON
      }
    }

    window.addEventListener("message", handleYouTubeInfo);

    // SoundCloud: poll widget for position
    let scInterval = null;

    if (currentTrack?.provider === "soundcloud") {
      scInterval = setInterval(() => {
        const widget = soundCloudWidgetRef.current;
        if (!widget) return;

        try {
          widget.getPosition((pos) => {
            trackProgressRef.current.currentTimeMs = pos;
          });
          widget.getDuration((dur) => {
            if (dur > 0) trackProgressRef.current.durationMs = dur;
          });
        } catch {
          // widget not ready
        }
      }, 500);
    }

    // Update React state at ~2fps for the UI
    function tick() {
      const now = performance.now();
      if (now - lastUpdate > 400) {
        lastUpdate = now;

        // Fallback: compute from server state if YouTube hasn't reported
        if (
          currentTrack?.provider === "youtube" &&
          trackProgressRef.current.currentTimeMs === 0 &&
          roomState?.nowPlaying?.startedAtMs &&
          roomState?.nowPlaying?.status === "playing"
        ) {
          const serverNow = Date.now() + clockOffsetRef.current;
          const elapsed = serverNow - roomState.nowPlaying.startedAtMs;
          trackProgressRef.current.currentTimeMs =
            (roomState.nowPlaying.positionMs ?? 0) + elapsed;
        }

        setTrackProgress({ ...trackProgressRef.current });
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("message", handleYouTubeInfo);
      retryTimers.forEach(clearTimeout);
      if (scInterval) clearInterval(scInterval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    currentTrack,
    roomState?.nowPlaying?.startedAtMs,
    roomState?.nowPlaying?.status,
    roomState?.nowPlaying?.positionMs,
  ]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleCopyInvite() {
    if (!activeRoomId) {
      setNotice("Join or create a room first");
      return;
    }

    try {
      const { inviteLink } = await generateInviteCode(token, activeRoomId);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        showToast("✓ Invite link copied! Expires in 1 hour.");
      } else {
        // Fallback for older browsers / insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast("✓ Invite link copied! Expires in 1 hour.");
      }
    } catch (error) {
      showToast(error.message || "Failed to generate invite");
    }
  }

  // ============ INVITE CODE RESOLUTION ============
  // Resolve /join/:code URL on mount → store the roomId for auto-join
  useEffect(() => {
    if (!pendingInviteCode) return;

    let cancelled = false;

    async function resolve() {
      try {
        const { roomId } = await resolveInviteCode(pendingInviteCode);
        if (cancelled) return;

        setPendingRoomId(roomId);
        // Clean the URL without a page reload
        window.history.replaceState(null, "", "/");
        showToast("Invite link accepted! Joining room...");
      } catch (error) {
        if (cancelled) return;
        window.history.replaceState(null, "", "/");
        showToast(error.message || "Invalid or expired invite link");
      }
    }

    void resolve();
    return () => { cancelled = true; };
  }, []); // runs once on mount

  // Auto-join the pending invite room after authentication completes
  useEffect(() => {
    if (!pendingRoomId || authStatus !== "authenticated") return;

    setActiveRoomId(pendingRoomId);
    setPendingRoomId(null);
  }, [pendingRoomId, authStatus]);

  function handleCreateRoom() {
    const roomName = roomNameDraft.trim() || "New Room";
    const roomId = makeRoomId(roomName);
    const uniqueRoomId = rooms.some((room) => room.id === roomId)
      ? `${roomId}-${Date.now().toString(36)}`
      : roomId;
    const socket = socketRef.current;

    if (!socket) {
      setNotice("Backend is still connecting");
      return;
    }

    socket.emit(
      SOCKET_EVENTS.ROOM_CREATE,
      {
        roomId: uniqueRoomId,
        roomName,
      },
      (ack) => {
        if (!ack?.ok || !ack.state) {
          setNotice(ack?.error ?? "Could not create room");
          return;
        }

        ensureRoomProfile(uniqueRoomId, roomName, user?.name, user?.userId);
        setActiveRoomId(uniqueRoomId);
        setRoomState(ack.state);
        syncRoomProfileFromState(ack.state);
        setNotice(`Created ${roomName}`);
      },
    );
  }

  const ensureRoomProfile = useCallback(
    (roomId, roomName, host = displayNameRef.current, hostId = null) => {
      setRooms((existing) => {
        if (existing.some((room) => room.id === roomId)) {
          return existing;
        }

        return [
          ...existing,
          createRoomProfile(roomId, roomName, host, 1, hostId),
        ];
      });
    },
    [],
  );

  function handleDeleteRoom(roomId) {
    const socket = socketRef.current;

    if (!socket) {
      setNotice("Backend is still connecting");
      return;
    }

    socket.emit(SOCKET_EVENTS.ROOM_DELETE, { roomId }, (ack) => {
      if (!ack?.ok) {
        setNotice(ack?.error ?? "Could not delete room");
        return;
      }

      setRooms((existing) => existing.filter((room) => room.id !== roomId));

      if (activeRoomId === roomId) {
        setActiveRoomId(null);
        setRoomState(null);
      }

      setNotice("Room deleted");
    });
  }

  function handleSendMessage(event) {
    event.preventDefault();

    const text = chatDraft.trim();
    const socket = socketRef.current;

    if (!text || !socket || !roomState) {
      return;
    }

    socket.emit(SOCKET_EVENTS.CHAT_SEND, {
      roomId: activeRoomId,
      text,
    });

    setChatDraft("");
  }

  function handleAddTrack(event) {
    event.preventDefault();

    const socket = socketRef.current;
    const url = trackUrl.trim();

    if (!socket || !roomState || !url) {
      setNotice("Add a YouTube or SoundCloud URL first");
      return;
    }

    socket.emit(
      SOCKET_EVENTS.QUEUE_ADD,
      {
        roomId: activeRoomId,
        url,
      },
      (ack) => {
        if (!ack?.ok) {
          setNotice(ack?.error ?? "Could not add track");
          return;
        }

        setTrackUrl("");
        setNotice(`Added ${ack.track.title}`);
      },
    );
  }

  function handleRemoveTrack(trackId) {
    const socket = socketRef.current;

    if (!socket || !roomState) {
      return;
    }

    socket.emit(SOCKET_EVENTS.QUEUE_REMOVE, {
      roomId: activeRoomId,
      trackId,
    });
  }

  function handleMoveTrack(trackId, direction) {
    const socket = socketRef.current;

    if (!socket || !roomState) {
      return;
    }

    socket.emit(SOCKET_EVENTS.QUEUE_REORDER, {
      roomId: activeRoomId,
      trackId,
      direction,
    });
  }

  function handlePlayTrack(track) {
    const socket = socketRef.current;

    if (!socket || !roomState || !track) {
      return;
    }

    if (currentTrack?.id === track.id) {
      playEmbeddedTrack(track);
    }

    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: "play",
      positionMs: 0,
      track,
    });
  }

  function handlePlaybackToggle() {
    const socket = socketRef.current;

    if (!socket || !roomState) {
      return;
    }

    if (!isHost) {
      setNotice("Only the host can control playback");
      return;
    }

    if (isPlaying) {
      pauseEmbeddedTrack();
    } else {
      playEmbeddedTrack();
    }

    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: isPlaying ? "pause" : "play",
      positionMs: playbackPositionMs,
      track: currentTrack,
    });
  }

  function handleNextTrack() {
    const socket = socketRef.current;
    if (!socket || !roomState) return;

    if (!isHost) {
      setNotice("Only the host can control playback");
      return;
    }

    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: "next",
      hostTriggered: true,
    });
  }

  function handlePreviousTrack() {
    const socket = socketRef.current;
    if (!socket || !roomState) return;

    if (!isHost) {
      setNotice("Only the host can control playback");
      return;
    }

    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: "previous",
    });
  }

  function handleSearchYouTube(query, callback) {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.SEARCH_YOUTUBE, { query }, (ack) => {
      if (ack?.ok) {
        callback(ack.results);
      } else {
        callback([]);
      }
    });
  }

  function handleAddSearchResult(url) {
    const socket = socketRef.current;
    if (!socket || !roomState || !url) return;

    socket.emit(
      SOCKET_EVENTS.QUEUE_ADD,
      { roomId: activeRoomId, url },
      (ack) => {
        if (!ack?.ok) {
          setNotice(ack?.error ?? "Could not add track");
          return;
        }
        setNotice(`Added ${ack.track.title}`);
      },
    );
  }

  function handleRequeue(url) {
    handleAddSearchResult(url);
  }

  function handleSkipVote() {
    const socket = socketRef.current;
    if (!socket || !roomState || !currentTrack) return;

    socket.emit(SOCKET_EVENTS.SKIP_VOTE, {
      roomId: activeRoomId,
    });
  }

  function handleSeek(positionMs) {
    const socket = socketRef.current;
    if (!socket || !roomState || !currentTrack) return;

    if (!isHost) {
      setNotice("Only the host can seek");
      return;
    }

    // Seek the local player immediately for responsiveness
    const seekSeconds = positionMs / 1000;
    const iframe = playerIframeRef.current;

    if (currentTrack.provider === "youtube" && iframe) {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seekSeconds, true],
        }),
        "*",
      );
    }

    if (currentTrack.provider === "soundcloud" && soundCloudWidgetRef.current) {
      try {
        soundCloudWidgetRef.current.seekTo(positionMs);
      } catch {
        // widget not ready
      }
    }

    // Emit to server so all clients sync
    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: "play",
      positionMs,
      track: currentTrack,
    });
  }

  if (authStatus === "checking") {
    return (
      <main className="auth-screen">
        <section className="auth-panel auth-panel--loading">
          <p className="eyebrow">Session</p>
          <h2>Restoring your account...</h2>
        </section>
      </main>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSubmit={handleAuth}
        onGoogleAuth={handleGoogleAuth}
        isSubmitting={authStatus === "submitting"}
        notice={authNotice}
      />
    );
  }

  return (
    <div className="app-shell">
      <button
        className="mobile-menu-toggle"
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(roomId) => {
          setActiveRoomId(roomId);
          setSidebarOpen(false);
        }}
        connectionStatus={connectionStatus}
        user={user}
        roomNameDraft={roomNameDraft}
        onRoomNameDraftChange={setRoomNameDraft}
        onCreateRoom={handleCreateRoom}
        onLogout={handleLogout}
        notice={notice}
        members={memberList}
        membersCount={membersCount}
        hostUserId={hostUserId}
        onDeleteRoom={handleDeleteRoom}
        onCopyInvite={handleCopyInvite}
        publicRooms={publicRooms}
        isOpen={sidebarOpen}
      />

      <RoomWorkspace
        activeRoom={activeRoom}
        currentTrack={currentTrack}
        currentTrackEmbedUrl={currentTrackEmbedUrl}
        playerStatus={playerStatus}
        playerLabel={playerLabel}
        isPlaying={isPlaying}
        isHost={isHost}
        queue={queue}
        messages={messages}
        trackUrl={trackUrl}
        onTrackUrlChange={setTrackUrl}
        onAddTrack={handleAddTrack}
        onCopyInvite={handleCopyInvite}
        onPlayTrack={handlePlayTrack}
        onMoveTrack={handleMoveTrack}
        onRemoveTrack={handleRemoveTrack}
        onPlaybackToggle={handlePlaybackToggle}
        onCreateRoom={handleCreateRoom}
        onChatDraftChange={setChatDraft}
        chatDraft={chatDraft}
        onSendMessage={handleSendMessage}
        playerIframeRef={playerIframeRef}
        onPlayerLoad={() => {
          setPlayerStatus("ready");

          if (currentTrack?.provider === "soundcloud" && window.SC?.Widget) {
            soundCloudWidgetRef.current = window.SC.Widget(
              playerIframeRef.current,
            );
          }

          // Send YouTube listening handshake for seek bar progress
          if (currentTrack?.provider === "youtube" && playerIframeRef.current) {
            try {
              playerIframeRef.current.contentWindow?.postMessage(
                JSON.stringify({ event: "listening" }),
                "*",
              );
            } catch {
              // cross-origin issue
            }
          }

          if (isPlaying) {
            playEmbeddedTrack();
          } else {
            pauseEmbeddedTrack();
          }
        }}
        onSearch={handleSearchYouTube}
        onAddSearchResult={handleAddSearchResult}
        history={history}
        onRequeue={handleRequeue}
        skipVotes={skipVotes}
        membersCount={membersCount}
        user={user}
        onSkipVote={handleSkipVote}
        onNextTrack={handleNextTrack}
        onPreviousTrack={handlePreviousTrack}
        currentTrackIndex={currentTrackIndex}
        trackProgress={trackProgress}
        onSeek={handleSeek}
      />

      {toast && (
        <div className="copy-toast" key={toast}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
