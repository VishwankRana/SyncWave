import { useRef } from "react";
import ChatPanel from "./ChatPanel.jsx";

function formatTime(ms) {
  if (!ms || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function PlayerPanel({
  activeRoom,
  currentTrack,
  currentTrackEmbedUrl,
  playerStatus,
  playerLabel,
  isPlaying,
  isHost,
  queue,
  // onCreateRoom,
  // onCopyInvite,
  onPlaybackToggle,
  messages,
  chatDraft,
  onChatDraftChange,
  onSendMessage,
  playerIframeRef,
  onPlayerLoad,
  skipVotes,
  membersCount,
  user,
  onSkipVote,
  onNextTrack,
  onPreviousTrack,
  currentTrackIndex,
  trackProgress,
  onSeek,
}) {
  const hasVoted = skipVotes?.voters?.includes(user?.userId) ?? false;
  const voteCount = skipVotes?.voters?.length ?? 0;
  const threshold = Math.ceil((membersCount || 1) / 2);
  const hasPrevious = currentTrackIndex > 0;
  const hasNext =
    currentTrackIndex >= 0 && currentTrackIndex < queue.length - 1;

  const seekBarRef = useRef(null);
  const currentTimeMs = trackProgress?.currentTimeMs ?? 0;
  const durationMs = trackProgress?.durationMs ?? 0;
  const progressPercent =
    durationMs > 0 ? Math.min(100, (currentTimeMs / durationMs) * 100) : 0;

  function handleSeekClick(e) {
    if (!isHost || !durationMs || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const positionMs = ratio * durationMs;
    onSeek(positionMs);
  }

  return (
    <div className="hero-panel-parent">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Live room</p>
          <h2>{activeRoom?.name ?? "Room"}</h2>
          <p className="hero-copy__lede">
            {activeRoom?.vibe ?? "Keep the room in sync with the player below."}
          </p>

          {/* <div className="hero-actions">
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
              Invite Friends
            </button>
          </div> */}

          <div className="hero-player">
            <div className="album-glow" />
            {currentTrackEmbedUrl ? (
              <iframe
                className="player-frame"
                src={currentTrackEmbedUrl}
                title={currentTrack?.title ?? "Music player"}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                ref={playerIframeRef}
                onLoad={onPlayerLoad}
              />
            ) : (
              <div className="empty-state">
                Add a YouTube or SoundCloud track to hear audio here.
              </div>
            )}
          </div>
        </div>
        <div className="album-card">
          <p className="eyebrow">Now Playing</p>
          {currentTrack ? (
            <>
              <h3>{currentTrack.title}</h3>
              <p>
                {currentTrack.artist ??
                  currentTrack.addedBy ??
                  "Unknown artist"}
              </p>
            </>
          ) : (
            <>
              <h3>No track queued</h3>
              <p>Add a YouTube or SoundCloud link to get the room moving.</p>
            </>
          )}
          <div className="player-status-line">
            <span className={`status-chip status-chip--${playerStatus}`}>
              {playerLabel}
            </span>
            <span>
              {currentTrack?.provider
                ? `${currentTrack.provider} stream`
                : "Waiting for a track"}
            </span>
          </div>

          {/* Seek Bar */}
          {currentTrack && (
            <div className="seek-bar-container">
              <span className="seek-bar__time">
                {formatTime(currentTimeMs)}
              </span>
              <div
                className={`seek-bar${isHost && durationMs > 0 ? " seek-bar--interactive" : ""}`}
                ref={seekBarRef}
                onClick={handleSeekClick}
                role="slider"
                aria-valuenow={Math.floor(currentTimeMs / 1000)}
                aria-valuemin={0}
                aria-valuemax={Math.floor(durationMs / 1000)}
                tabIndex={isHost ? 0 : -1}
              >
                <div className="seek-bar__track">
                  {durationMs > 0 ? (
                    <>
                      <div
                        className="seek-bar__fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                      {isHost && (
                        <div
                          className="seek-bar__thumb"
                          style={{ left: `${progressPercent}%` }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="seek-bar__fill seek-bar__fill--indeterminate" />
                  )}
                </div>
              </div>
              <span className="seek-bar__time">
                {durationMs > 0 ? formatTime(durationMs) : "--:--"}
              </span>
            </div>
          )}

          <div className="transport-row">
            <button
              className={`transport-button transport-button--small${!isHost || !hasPrevious ? " transport-button--disabled" : ""}`}
              onClick={onPreviousTrack}
              type="button"
              disabled={!isHost || !hasPrevious}
              title={
                !isHost
                  ? "Host only"
                  : !hasPrevious
                    ? "No previous track"
                    : "Previous track"
              }
            >
              ⏮
            </button>
            <button
              className={`transport-button${!isHost ? " transport-button--disabled" : ""}`}
              onClick={onPlaybackToggle}
              type="button"
              disabled={!isHost}
              title={!isHost ? "Only the host can control playback" : ""}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              className={`transport-button transport-button--small${!isHost || !hasNext ? " transport-button--disabled" : ""}`}
              onClick={onNextTrack}
              type="button"
              disabled={!isHost || !hasNext}
              title={
                !isHost
                  ? "Host only"
                  : !hasNext
                    ? "No next track"
                    : "Next track"
              }
            >
              ⏭
            </button>
            {!isHost && <span className="host-only-hint">Host only</span>}
            {currentTrack && (
              <button
                className={`skip-vote-button${hasVoted ? " skip-vote-button--voted" : ""}`}
                onClick={onSkipVote}
                type="button"
                disabled={hasVoted}
                title={
                  hasVoted
                    ? "You already voted to skip"
                    : "Vote to skip this track"
                }
              >
                ⏭ Skip {voteCount}/{threshold}
              </button>
            )}
            <span className="transport-row__queue-size">
              Queue: {queue.length} · Track {currentTrackIndex + 1}/
              {queue.length}
            </span>
          </div>
        </div>
      </section>
      <ChatPanel
        messages={messages}
        chatDraft={chatDraft}
        onChatDraftChange={onChatDraftChange}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}

export default PlayerPanel;
