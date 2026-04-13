import PlayerPanel from "./PlayerPanel.jsx";
import QueuePanel from "./QueuePanel.jsx";
import HistoryPanel from "./HistoryPanel.jsx";

function RoomWorkspace({
  activeRoom,
  currentTrack,
  currentTrackEmbedUrl,
  playerStatus,
  playerLabel,
  isPlaying,
  isHost,
  queue,
  messages,
  trackUrl,
  onTrackUrlChange,
  onAddTrack,
  onPlayTrack,
  onMoveTrack,
  onRemoveTrack,
  onPlaybackToggle,
  onCreateRoom,
  onCopyInvite,
  chatDraft,
  playerIframeRef,
  onPlayerLoad,
  onChatDraftChange,
  onSendMessage,
  onSearch,
  onAddSearchResult,
  history,
  onRequeue,
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
  return (
    <main className="main-stage">
      <PlayerPanel
        activeRoom={activeRoom}
        currentTrack={currentTrack}
        currentTrackEmbedUrl={currentTrackEmbedUrl}
        playerStatus={playerStatus}
        playerLabel={playerLabel}
        isPlaying={isPlaying}
        queue={queue}
        onCreateRoom={onCreateRoom}
        onCopyInvite={onCopyInvite}
        onPlaybackToggle={onPlaybackToggle}
        isHost={isHost}
        messages={messages}
        chatDraft={chatDraft}
        onChatDraftChange={onChatDraftChange}
        onSendMessage={onSendMessage}
        playerIframeRef={playerIframeRef}
        onPlayerLoad={onPlayerLoad}
        skipVotes={skipVotes}
        membersCount={membersCount}
        user={user}
        onSkipVote={onSkipVote}
        onNextTrack={onNextTrack}
        onPreviousTrack={onPreviousTrack}
        currentTrackIndex={currentTrackIndex}
        trackProgress={trackProgress}
        onSeek={onSeek}
      />

      <section className="content-grid" id="room-app">
        <QueuePanel
          queue={queue}
          trackUrl={trackUrl}
          onTrackUrlChange={onTrackUrlChange}
          onAddTrack={onAddTrack}
          onPlayTrack={onPlayTrack}
          onMoveTrack={onMoveTrack}
          onRemoveTrack={onRemoveTrack}
          onSearch={onSearch}
          onAddSearchResult={onAddSearchResult}
        />
        <HistoryPanel
          history={history}
          onRequeue={onRequeue}
        />
      </section>
    </main>
  );
}

export default RoomWorkspace;
