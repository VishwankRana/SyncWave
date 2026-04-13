function LandingPage({
  rooms,
  user,
  inviteDraft,
  onInviteDraftChange,
  onEnterApp,
  onJoinInvite,
  onCopyInvite,
  onLogout,
  notice,
}) {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <div className="brand brand--landing">
            <div className="brand-mark">M</div>
            <div>
              <p className="eyebrow">Music Rooms</p>
              <h1>Musicyfy</h1>
            </div>
          </div>

          <p className="eyebrow">Listen together</p>
          <h2>Bring people into one room, one queue, and one shared moment.</h2>
          <p className="landing-copy__lede">
            Musicyfy connects rooms, playback, and chat. Create a room or join one
            from an invite link to start listening together.
          </p>

          <div className="landing-actions">
            <button className="primary-button" type="button" onClick={onEnterApp}>
              Open App
            </button>
            <button className="secondary-button" type="button" onClick={onCopyInvite}>
              Copy Invite
            </button>
          </div>

          <div className="landing-card landing-card--form">
            <div className="landing-profile-card">
              <div>
                <p className="eyebrow">Signed In</p>
                <strong>{user?.name}</strong>
                <p className="landing-profile-card__meta">{user?.email}</p>
              </div>
              <button className="secondary-button" type="button" onClick={onLogout}>
                Log Out
              </button>
            </div>
          </div>

          <div className="landing-card landing-card--form">
            <p className="eyebrow">Join by invite</p>
            <label className="field">
              <span>Invite link or room code</span>
              <input
                type="text"
                value={inviteDraft}
                onChange={(event) => onInviteDraftChange(event.target.value)}
                placeholder="Paste an invite link"
              />
            </label>
            <div className="landing-actions">
              <button className="primary-button" type="button" onClick={onJoinInvite}>
                Join Room
              </button>
            </div>
          </div>

          {notice ? <p className="landing-copy__notice">{notice}</p> : null}
        </div>

        <div className="landing-hero__visual">
          <div className="landing-room-list">
            <div className="section-heading">
              <span>Rooms</span>
              <span>{rooms.length}</span>
            </div>
            {rooms.length === 0 ? (
              <div className="empty-state landing-room-list__empty">
                No rooms yet. Create one from the app view.
              </div>
            ) : (
              <div className="room-list room-list--landing">
                {rooms.map((room) => (
                  <article key={room.id} className="room-chip room-chip--preview">
                    <span className="room-chip__title">{room.name}</span>
                    <span className="room-chip__meta">
                      {room.listeners} listeners
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
