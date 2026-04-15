import { SOCKET_URL } from "./musicyfy.js";

const AUTH_BASE_URL = `${SOCKET_URL}/api/auth`;
const TOKEN_STORAGE_KEY = "musicyfy:token";

async function requestAuth(path, options = {}) {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Authentication failed");
  }

  return payload;
}

function storeToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function register(credentials) {
  return requestAuth("/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

function login(credentials) {
  return requestAuth("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

function getCurrentUser(token) {
  return requestAuth("/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function googleSignIn(credential) {
  return requestAuth("/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export {
  getCurrentUser,
  getStoredToken,
  googleSignIn,
  login,
  register,
  storeToken,
  TOKEN_STORAGE_KEY,
};
