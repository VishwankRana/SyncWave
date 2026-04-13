import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../../shared/contracts.js";
import {
  SOCKET_URL,
  createRoomProfile,
  getTrackEmbedUrl,
  initialRoomId,
  joinMessage,
  loadScriptOnce,
  makeRoomId,
} from "../lib/musicyfy.js";

function loadPersistentValue(key) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) ?? "";
}

function getOrCreateUserId() {
  if (typeof window === "undefined") {
    return globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}`
  }

  const key = "musicyfy:userId"
  const existing = window.localStorage.getItem(key)

  if (existing) {
    return existing
  }

  const nextId =
    globalThis.crypto?.randomUUID?.() ??
    `user-${Date.now()}-${Math.random().toString(16).slice(2)}`
  window.localStorage.setItem(key, nextId)
  return nextId
}

function parseRoomId(input) {
  const value = input.trim()

  if (!value) {
    return ""
  }

  try {
    const parsed = new URL(value)
    const roomFromQuery = parsed.searchParams.get("room")

    if (roomFromQuery) {
      return roomFromQuery.trim()
    }

    const segments = parsed.pathname.split("/").filter(Boolean)
    return segments.at(-1)?.trim() ?? ""
  } catch {
    return value
  }
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack) => {
      resolve(ack)
    })
  })
}

function useMusicyfyApp() {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(initialRoomId ?? null);
  const [displayName, setDisplayName] = useState(() => loadPersistentValue("musicyfy:name"));
  const [inviteDraft, setInviteDraft] = useState(() => initialRoomId ?? "");
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [roomState, setRoomState] = useState(null);
  const [chatDraft, setChatDraft] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [notice, setNotice] = useState("");
  const [playerStatus, setPlayerStatus] = useState("idle");
  const [page, setPage] = useState(() =>
    typeof window !== "undefined" && window.location.pathname.startsWith("/app")
      ? "app"
      : "landing",
  );

  const socketRef = useRef(null);
  const appSectionRef = useRef(null);
  const playerIframeRef = useRef(null);
  const soundCloudWidgetRef = useRef(null);
  const suppressNextJoinRef = useRef(false);
  const displayNameRef = useRef(displayName);
  const userIdRef = useRef(getOrCreateUserId());

  useEffect(() => {
    displayNameRef.current = displayName;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("musicyfy:name", displayName);
    }
  }, [displayName]);

  useEffect(() => {
    const handlePopState = () => {
      setPage(window.location.pathname.startsWith("/app") ? "app" : "landing");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const membersCount = Object.keys(roomState?.members ?? {}).length;
  const queue = roomState?.queue ?? [];
  const messages = roomState?.chat ?? [];
  const currentTrack = roomState?.nowPlaying?.track ?? queue[0] ?? null;
  const isPlaying = roomState?.nowPlaying?.status === "playing";
  const playbackPositionMs = roomState?.nowPlaying?.positionMs ?? 0;
  const currentTrackEmbedUrl = getTrackEmbedUrl(currentTrack);
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
      const listenerCount = Object.keys(state.members ?? {}).length || 1;
      const roomName =
        state.roomName ??
        existing.find((room) => room.id === state.roomId)?.name ??
        state.roomId;

      if (existing.some((room) => room.id === state.roomId)) {
        return existing.map((room) =>
          room.id === state.roomId
            ? {
                ...room,
                listeners: listenerCount,
              }
            : room,
        );
      }

      return [
        ...existing,
        createRoomProfile(state.roomId, roomName, displayNameRef.current, listenerCount),
      ];
    });
  }, []);

  const requestRoomJoin = useCallback(
    async (socket, roomId) => {
      if (!socket || !roomId) {
        return { ok: false, error: "Room not found" };
      }

      const displayNameValue = displayNameRef.current.trim()

      if (!displayNameValue) {
        return { ok: false, error: "Enter a display name first" }
      }

      setConnectionStatus(socket.connected ? "connected" : "connecting");
      const ack = await emitWithAck(socket, SOCKET_EVENTS.ROOM_JOIN, {
        roomId,
        userId: userIdRef.current,
        name: displayNameValue,
      });

      if (!ack?.ok) {
        return {
          ok: false,
          error: ack?.error ?? "Room could not be joined",
        };
      }

      setRoomState(ack.state)
      syncRoomProfileFromState(ack.state)
      setPlayerStatus(ack.state.nowPlaying?.track ? "loading" : "idle")
      setActiveRoomId(roomId)
      setNotice(`Joined ${roomId}`)
      return { ok: true, state: ack.state }
    },
    [syncRoomProfileFromState],
  );

  const requestRoomCreate = useCallback(
    async (socket, roomName) => {
      if (!socket || !roomName) {
        return { ok: false, error: "Room name is required" }
      }

      const displayNameValue = displayNameRef.current.trim()

      if (!displayNameValue) {
        return { ok: false, error: "Enter a display name first" }
      }

      const roomId = makeRoomId(roomName)
      const ack = await emitWithAck(socket, SOCKET_EVENTS.ROOM_CREATE, {
        roomId,
        roomName,
        userId: userIdRef.current,
        name: displayNameValue,
      })

      if (!ack?.ok) {
        return {
          ok: false,
          error: ack?.error ?? "Room could not be created",
        }
      }

      setRoomState(ack.state)
      syncRoomProfileFromState(ack.state)
      setPlayerStatus(ack.state.nowPlaying?.track ? "loading" : "idle")
      setActiveRoomId(roomId)
      setNotice(`Created ${roomName}`)
      return { ok: true, state: ack.state, roomId }
    },
    [syncRoomProfileFromState],
  );

  const requestClockSync = useCallback((socket) => {
    if (!socket) {
      return;
    }

    const clientSentAtMs = Date.now();
    socket.emit(SOCKET_EVENTS.CLOCK_SYNC, { clientSentAtMs }, () => {});
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

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnectionStatus("connected");
      requestClockSync(socket);
    };

    const handleDisconnect = () => {
      setConnectionStatus("offline");
    };

    const handleRoomState = (state) => {
      setRoomState(state);
      syncRoomProfileFromState(state);
      setPlayerStatus(state?.nowPlaying?.track ? "loading" : "idle")
      setConnectionStatus("connected");
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
                listeners: Object.keys(members ?? {}).length,
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
      setPlayerStatus(nowPlaying?.track ? "loading" : "idle")
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", () => {
      setConnectionStatus("offline");
      setNotice("Backend connection failed");
    });
    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);
    socket.on(SOCKET_EVENTS.CHAT_NEW, handleChat);
    socket.on(SOCKET_EVENTS.PLAYBACK_UPDATE, handlePlayback);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [requestClockSync, syncRoomProfileFromState]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    if (!activeRoomId) {
      return;
    }

    if (suppressNextJoinRef.current) {
      suppressNextJoinRef.current = false;
      return;
    }

    let cancelled = false;

    async function attemptJoin(roomId) {
      const ack = await requestRoomJoin(socket, roomId);

      if (!ack?.ok && !cancelled) {
        setNotice(ack?.error ?? "Room could not be joined");
        setPage("landing");
      }
    }

    if (socket.connected) {
      void attemptJoin(activeRoomId);
      return;
    }

    const onConnect = () => void attemptJoin(activeRoomId);
    socket.once("connect", onConnect);

    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
    };
  }, [activeRoomId, requestRoomJoin]);

  useEffect(() => {
    const socket = socketRef.current;

    if (socket?.connected && activeRoomId && !suppressNextJoinRef.current) {
      void requestRoomJoin(socket, activeRoomId);
    }
  }, [activeRoomId, displayName, requestRoomJoin]);

  useEffect(() => {
    let cancelled = false;

    async function prepareSoundCloudWidget() {
      setPlayerStatus(currentTrack ? "loading" : "idle");

      if (currentTrack?.provider !== "soundcloud" || !playerIframeRef.current) {
        soundCloudWidgetRef.current = null;
        return;
      }

      try {
        await loadScriptOnce("https://w.soundcloud.com/player/api.js", "soundcloud-widget-api");

        if (cancelled || !playerIframeRef.current || typeof window.SC?.Widget !== "function") {
          return;
        }

        soundCloudWidgetRef.current = window.SC.Widget(playerIframeRef.current);
        setPlayerStatus("ready");
      } catch {
        soundCloudWidgetRef.current = null;
        setPlayerStatus("error");
      }
    }

    prepareSoundCloudWidget();

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  async function handleCreateRoom() {
    const roomName = roomNameDraft.trim();
    const displayNameValue = displayName.trim();
    const socket = socketRef.current;

    if (!roomName) {
      setNotice("Enter a room name first");
      return;
    }

    if (!displayNameValue) {
      setNotice("Enter a display name first");
      return;
    }

    if (!socket) {
      setNotice("Backend is still connecting");
      return;
    }

    suppressNextJoinRef.current = true
    const ack = await requestRoomCreate(socket, roomName)

    if (!ack?.ok) {
      suppressNextJoinRef.current = false
      setNotice(ack?.error ?? "Could not create room")
      return
    }

    setPage("app")
  }

  function handleCopyInvite() {
    if (!activeRoomId) {
      setNotice("Create or join a room first");
      return;
    }

    const invite = `${window.location.origin}?room=${activeRoomId}`;
    window.navigator.clipboard?.writeText(invite);
    setNotice(`Invite link copied for ${activeRoomId}`);
  }

  function handleEnterApp() {
    if (!displayName.trim()) {
      setNotice("Enter a display name first");
      return;
    }

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/app");
    }

    setPage("app");
    requestAnimationFrame(() => {
      appSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleJoinInvite() {
    const socket = socketRef.current
    const roomId = parseRoomId(inviteDraft)
    const displayNameValue = displayName.trim()

    if (!roomId) {
      setNotice("Paste an invite link or room code")
      return
    }

    if (!displayNameValue) {
      setNotice("Enter a display name first")
      return
    }

    if (!socket) {
      setNotice("Backend is still connecting")
      return
    }

    suppressNextJoinRef.current = true
    const ack = await requestRoomJoin(socket, roomId)

    if (!ack?.ok) {
      suppressNextJoinRef.current = false
      setActiveRoomId(null)
      setPage("landing")
      setNotice(ack?.error ?? "Room could not be joined")
      return
    }

    setPage("app")
  }

  function handleBackToLanding() {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
    }

    setPage("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSendMessage(event) {
    event.preventDefault();

    const text = chatDraft.trim();
    const socket = socketRef.current;
    const name = displayName.trim();

    if (!text || !socket || !roomState || !name) {
      setNotice("Enter a display name first");
      return;
    }

    socket.emit(SOCKET_EVENTS.CHAT_SEND, {
      roomId: activeRoomId,
      userId: userIdRef.current,
      name,
      text,
    });

    setChatDraft("");
  }

  function handleAddTrack(event) {
    event.preventDefault();

    const socket = socketRef.current;
    const url = trackUrl.trim();
    const userId = displayName.trim();
    const name = displayName.trim();

    if (!socket || !roomState || !url || !userId) {
      if (!userId) {
        setNotice("Enter a display name first");
        return;
      }

      setNotice("Add a YouTube or SoundCloud URL first");
      return;
    }

    socket.emit(
      SOCKET_EVENTS.QUEUE_ADD,
      {
        roomId: activeRoomId,
        url,
        userId,
        name,
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

    setPlayerStatus("loading")
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

    if (isPlaying) {
      pauseEmbeddedTrack();
    } else {
      playEmbeddedTrack();
    }

    setPlayerStatus("loading")
    socket.emit(SOCKET_EVENTS.PLAYBACK_COMMAND, {
      roomId: activeRoomId,
      type: isPlaying ? "pause" : "play",
      positionMs: playbackPositionMs,
      track: currentTrack,
    });
  }

  function handlePlayerLoad() {
    setPlayerStatus("ready");

    if (currentTrack?.provider === "soundcloud" && window.SC?.Widget) {
      soundCloudWidgetRef.current = window.SC.Widget(playerIframeRef.current);
    }

    if (isPlaying) {
      playEmbeddedTrack();
      return;
    }

    pauseEmbeddedTrack();
  }

  return {
    rooms,
    activeRoom,
    activeRoomId,
    setActiveRoomId,
    displayName,
    setDisplayName,
    inviteDraft,
    setInviteDraft,
    roomNameDraft,
    setRoomNameDraft,
    roomState,
    chatDraft,
    setChatDraft,
    trackUrl,
    setTrackUrl,
    connectionStatus,
    notice,
    playerStatus,
    page,
    setPage,
    membersCount,
    queue,
    messages,
    currentTrack,
    isPlaying,
    currentTrackEmbedUrl,
    playerLabel,
    appSectionRef,
    playerIframeRef,
    handleCreateRoom,
    handleCopyInvite,
    handleEnterApp,
    handleJoinInvite,
    handleBackToLanding,
    handleSendMessage,
    handleAddTrack,
    handleRemoveTrack,
    handleMoveTrack,
    handlePlayTrack,
    handlePlaybackToggle,
    handlePlayerLoad,
  };
}

export default useMusicyfyApp;
