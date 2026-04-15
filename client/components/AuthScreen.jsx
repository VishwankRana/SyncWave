import { useEffect, useRef, useState } from "react";

function AuthScreen({
  mode,
  onModeChange,
  onSubmit,
  onGoogleAuth,
  isSubmitting,
  notice,
}) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const isGoogleConfigured = Boolean(googleClientId);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const googleBtnRef = useRef(null);

  function updateField(field, value) {
    setForm((existing) => ({
      ...existing,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(mode, form);
  }

  // Load Google Sign-In script and render the button
  useEffect(() => {
    if (!isGoogleConfigured || !googleBtnRef.current) return;

    // Load GSI script
    const existingScript = document.getElementById("google-gsi-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleButton(googleClientId);
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGoogleButton(googleClientId);
    }

    function initGoogleButton(id) {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: id,
        callback: (response) => {
          if (response.credential) {
            onGoogleAuth(response.credential);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: 320,
      });
    }
  }, [googleClientId, isGoogleConfigured, onGoogleAuth]);

  const isRegister = mode === "register";

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand brand--landing">
          <div className="brand-mark">M</div>
          <div>
            <p className="eyebrow">Music Rooms</p>
            <h1>SyncWave</h1>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">{isRegister ? "Create account" : "Welcome back"}</p>
          <h2>{isRegister ? "Start your room with a real account." : "Sign in to join the session."}</h2>
          <p>
            Authentication now powers room identity, chat, queue actions, and socket access.
          </p>
        </div>

        {/* Google Sign-In Button */}
        {isGoogleConfigured ? (
          <div className="google-signin-wrapper">
            <div ref={googleBtnRef} className="google-signin-btn" />
            <div className="auth-divider">
              <span className="auth-divider__line" />
              <span className="auth-divider__text">or</span>
              <span className="auth-divider__line" />
            </div>
          </div>
        ) : (
          <p className="landing-copy__notice">
            Google Sign-In is not configured yet. Add{" "}
            <code>VITE_GOOGLE_CLIENT_ID</code> to your <code>.env</code> and
            restart the client.
          </p>
        )}

        <div className="auth-toggle">
          <button
            className={`nav-pill ${!isRegister ? "nav-pill--active" : ""}`}
            type="button"
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            className={`nav-pill ${isRegister ? "nav-pill--active" : ""}`}
            type="button"
            onClick={() => onModeChange("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your display name"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Enter your password"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Working..."
              : isRegister
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        {notice ? <p className="landing-copy__notice">{notice}</p> : null}
      </section>
    </main>
  );
}

export default AuthScreen;
