const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";

const initialRoomId =
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("room");

function makeRoomId(value) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `room-${Date.now()}`;
}

function createRoomProfile(roomId, name, host, listeners = 1, hostUserId = null) {
  return {
    id: roomId,
    name,
    vibe: "Fresh room ready for live sync",
    host,
    hostUserId,
    listeners,
    sourceMix: "Open queue",
  };
}

function formatMessageTime(sentAtMs) {
  if (!sentAtMs) {
    return "now";
  }

  return new Date(sentAtMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function joinMessage(message) {
  return {
    id: message.id,
    name: message.name,
    text: message.text,
    time: formatMessageTime(message.sentAtMs),
    sentAtMs: message.sentAtMs,
  };
}

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    const videoId = parsed.searchParams.get("v");
    return videoId || null;
  } catch {
    return null;
  }
}

function loadScriptOnce(src, id) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const existing = document.getElementById(id);
  if (existing) {
    return Promise.resolve();
  }

  const loaded = document.querySelector(`script[data-src="${src}"]`);
  if (loaded) {
    return new Promise((resolve, reject) => {
      if (loaded.getAttribute("data-ready") === "true") {
        resolve();
        return;
      }

      loaded.addEventListener("load", () => resolve(), { once: true });
      loaded.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.src = src;
    script.addEventListener("load", () => {
      script.dataset.ready = "true";
      resolve();
    });
    script.addEventListener("error", () =>
      reject(new Error(`Failed to load ${src}`)),
    );
    document.head.appendChild(script);
  });
}

function getTrackEmbedUrl(track) {
  if (!track?.url) {
    return null;
  }

  const origin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;

  if (track.provider === "youtube") {
    const videoId = getYouTubeVideoId(track.url);
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`
      : null;
  }

  if (track.provider === "soundcloud") {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;
  }

  return null;
}

export {
  SOCKET_URL,
  initialRoomId,
  makeRoomId,
  createRoomProfile,
  joinMessage,
  loadScriptOnce,
  getTrackEmbedUrl,
};
