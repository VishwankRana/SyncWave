function HistoryPanel({ history, onRequeue }) {
  return (
    <section className="panel panel--wide history-panel">
      <div className="panel-heading history-panel__heading">
        <div>
          <p className="eyebrow">Listening History</p>
          <h3>Recently Played</h3>
        </div>
        <span className="history-panel__count">Last 5 tracks</span>
      </div>

      <div className="history-table">
        {history.length === 0 ? (
          <div className="empty-state history-panel__empty">
            No listening history yet — play a track to see it here.
          </div>
        ) : (
          [...history]
            .reverse()
            .slice(0, 5)
            .map((entry, index) => (
              <article
                key={`${entry.trackId}-${entry.playedAtMs}-${index}`}
                className="history-row"
              >
                <div className="history-row__icon">
                  {entry.provider === "youtube" ? "▶" : "☁"}
                </div>
                <div className="history-row__track">
                  <strong>{entry.title}</strong>
                  <span>
                    {entry.provider} · Played by {entry.playedBy} ·{" "}
                    {formatTimeAgo(entry.playedAtMs)}
                  </span>
                </div>
                <div className="history-row__actions">
                  <button
                    type="button"
                    className="mini-button"
                    onClick={() => onRequeue(entry.url)}
                    title="Add back to queue"
                  >
                    + Queue
                  </button>
                </div>
              </article>
            ))
        )}
      </div>
    </section>
  );
}

function formatTimeAgo(timestampMs) {
  if (!timestampMs) return "just now";

  const diffMs = Date.now() - timestampMs;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(timestampMs).toLocaleDateString();
}

export default HistoryPanel;
