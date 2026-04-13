import { useState } from "react";

function AuthScreen({
  mode,
  onModeChange,
  onSubmit,
  isSubmitting,
  notice,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

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

  const isRegister = mode === "register";

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand brand--landing">
          <div className="brand-mark">M</div>
          <div>
            <p className="eyebrow">Music Rooms</p>
            <h1>Musicyfy</h1>
          </div>
        </div>

        <div className="auth-copy">
          <p className="eyebrow">{isRegister ? "Create account" : "Welcome back"}</p>
          <h2>{isRegister ? "Start your room with a real account." : "Sign in to join the session."}</h2>
          <p>
            Authentication now powers room identity, chat, queue actions, and socket access.
          </p>
        </div>

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
