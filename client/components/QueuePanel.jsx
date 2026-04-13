import { useCallback, useEffect, useRef, useState } from "react";

function QueuePanel({
  queue,
  trackUrl,
  onTrackUrlChange,
  onAddTrack,
  onPlayTrack,
  onMoveTrack,
  onRemoveTrack,
  onSearch,
  onAddSearchResult,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const resultsRef = useRef(null);

  const doSearch = useCallback(
    (query) => {
      if (!query.trim() || !onSearch) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      onSearch(query, (results) => {
        setSearchResults(results);
        setIsSearching(false);
        setShowResults(true);
      });
    },
    [onSearch],
  );

  function handleSearchInput(value) {
    setSearchQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(() => doSearch(value), 350);
  }

  function handleAddResult(result) {
    if (onAddSearchResult) {
      onAddSearchResult(result.url);
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="panel panel--wide queue-panel">
      <div className="panel-heading queue-panel__heading">
        <div>
          <p className="eyebrow">Room Queue</p>
          <h3>Queue</h3>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section" ref={resultsRef}>
        <label className="field queue-panel__field">
          <span>🔍 Search YouTube</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowResults(true);
            }}
            placeholder="Search for songs, artists..."
          />
        </label>

        {showResults && (searchResults.length > 0 || isSearching) && (
          <div className="search-results">
            {isSearching ? (
              <div className="search-results__loading">Searching...</div>
            ) : (
              searchResults.map((result) => (
                <div key={result.id} className="search-result-row">
                  {result.thumbnail && (
                    <img
                      className="search-result__thumb"
                      src={result.thumbnail}
                      alt=""
                    />
                  )}
                  <div className="search-result__info">
                    <strong>{result.title}</strong>
                    <span>
                      {result.durationFormatted || "YouTube"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mini-button search-result__add"
                    onClick={() => handleAddResult(result)}
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* URL Input */}
      <form className="queue-form" onSubmit={onAddTrack}>
        <label className="field queue-panel__field">
          <span>Track URL</span>
          <input
            type="url"
            value={trackUrl}
            onChange={(event) => onTrackUrlChange(event.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </label>

        <button
          className="secondary-button secondary-button--compact"
          type="submit"
        >
          Add Track
        </button>
      </form>

      <div className="queue-table">
        {queue.length === 0 ? (
          <div className="empty-state queue-panel__empty">
            Add the first track to make the room alive.
          </div>
        ) : (
          queue.map((track, index) => (
            <article key={track.id} className="queue-row">
              <div className="queue-row__index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="queue-row__track">
                <strong>{track.title}</strong>
                <span>
                  {track.artist ?? track.provider} - Added by {track.addedBy}
                </span>
              </div>
              <span className="queue-row__pill">
                {track.source ?? track.provider ?? "Track"}
              </span>
              <div className="queue-row__actions">
                <button
                  type="button"
                  className="mini-button"
                  onClick={() => onPlayTrack(track)}
                >
                  Play now
                </button>
                <button
                  type="button"
                  className="mini-button"
                  onClick={() => onMoveTrack(track.id, "up")}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="mini-button"
                  onClick={() => onMoveTrack(track.id, "down")}
                  disabled={index === queue.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="mini-button mini-button--danger"
                  onClick={() => onRemoveTrack(track.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default QueuePanel;
