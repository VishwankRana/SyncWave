function Sidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  connectionStatus,
  user,
  inviteDraft,
  onInviteDraftChange,
  onJoinInvite,
  roomNameDraft,
  onRoomNameDraftChange,
  onCreateRoom,
  onCopyInvite,
  onLogout,
  notice,
  members,
  membersCount,
  hostUserId,
  onDeleteRoom,
}) {
  const myRooms = rooms.filter(
    (room) => room.hostUserId && room.hostUserId === user?.userId,
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <p className="eyebrow">Music Rooms</p>
          <h1>SyncWave</h1>
        </div>
      </div>

      <div className={`status-pill status-pill--${connectionStatus}`}>
        {connectionStatus === "connected"
          ? "Live"
          : connectionStatus === "connecting"
            ? "Connecting"
            : "Offline"}
      </div>

      <div className="sidebar-section">
        <div className="section-heading">
          <span>In This Room</span>
          <span>{membersCount}</span>
        </div>

        {membersCount === 0 ? (
          <div className="empty-state sidebar-card__empty">
            Join a room to see who is listening.
          </div>
        ) : (
          <div className="room-list">
            {members.map((member) => (
              <article key={member.id} className="room-chip room-chip--member">
                <span className="room-chip__title">
                  {member.name}
                  {member.id === hostUserId && (
                    <span className="host-badge">HOST</span>
                  )}
                </span>
                <span className="room-chip__meta">
                  {member.id === hostUserId
                    ? "Room host"
                    : "Joined the session"}
                </span>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="section-heading">
          <span>My Rooms</span>
          <span>{myRooms.length}</span>
        </div>

        {myRooms.length === 0 ? (
          <div className="empty-state sidebar-card__empty">
            You haven't created any rooms yet.
          </div>
        ) : (
          <div className="room-list">
            {myRooms.map((room) => (
              <div
                key={room.id}
                className={`room-chip room-chip--my ${room.id === activeRoomId ? "room-chip--active" : ""}`}
              >
                <button
                  className="room-chip__body"
                  onClick={() => onSelectRoom(room.id)}
                  type="button"
                >
                  <span className="room-chip__title">{room.name}</span>
                  <span className="room-chip__meta">
                    {room.listeners} listening now
                  </span>
                </button>
                <button
                  className="room-chip__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRoom(room.id);
                  }}
                  type="button"
                  title="Delete room"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-card">
        <p className="eyebrow">Session Setup</p>
        <div className="setup-form">
          <div className="auth-summary">
            <span className="auth-summary__label">Signed in as</span>
            <strong>{user?.name}</strong>
            <span className="auth-summary__meta">{user?.email}</span>
          </div>

          <label className="field">
            <span>New room</span>
            <input
              type="text"
              value={roomNameDraft}
              onChange={(event) => onRoomNameDraftChange(event.target.value)}
              placeholder="Room name"
            />
          </label>

          <div className="setup-actions">
            <button
              className="primary-button"
              type="button"
              onClick={onCreateRoom}
            >
              Create Room
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onCopyInvite}
            >
              Copy Invite
            </button>

            <label className="field">
              <span>Join room</span>
              <input
                type="text"
                value={inviteDraft}
                onChange={(event) => onInviteDraftChange(event.target.value)}
                placeholder="Invite link or room code"
              />
            </label>

            <button
              className="primary-button"
              type="button"
              onClick={onJoinInvite}
            >
              Join Room
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onLogout}
            >
              Log Out
            </button>
          </div>
        </div>

        <p className="sidebar-card__hint">
          You are in {membersCount} member{membersCount === 1 ? "" : "s"} right
          now.
        </p>
        {notice ? <p className="sidebar-card__notice">{notice}</p> : null}
      </div>
    </aside>
  );
}

export default Sidebar;
