import { useState, useEffect, useCallback } from "react";

const EMOJI_OPTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Love" },
  { emoji: "👏", label: "Clap" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🎵", label: "Music" },
];

function ReactionBar({ onSendReaction, bursts }) {
  return (
    <div className="reaction-bar">
      <div className="reaction-buttons">
        {EMOJI_OPTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            className="reaction-button"
            type="button"
            onClick={() => onSendReaction(emoji)}
            title={label}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="reaction-burst-layer" aria-hidden="true">
        {bursts.map((burst) => (
          <span
            key={burst.id}
            className="reaction-burst"
            style={{
              left: `${burst.x}%`,
              animationDelay: `${burst.delay}ms`,
            }}
          >
            {burst.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

export function useReactions(socketRef, activeRoomId) {
  const [bursts, setBursts] = useState([]);

  const handleSendReaction = useCallback(
    (emoji) => {
      const socket = socketRef.current;

      if (!socket || !activeRoomId) {
        return;
      }

      socket.emit("reaction:send", {
        roomId: activeRoomId,
        emoji,
      });
    },
    [socketRef, activeRoomId],
  );

  const handleReactionBurst = useCallback((reaction) => {
    const count = 3 + Math.floor(Math.random() * 4);
    const newBursts = Array.from({ length: count }, (_, i) => ({
      id: `${reaction.id}-${i}`,
      emoji: reaction.emoji,
      x: 10 + Math.random() * 80,
      delay: i * 80,
    }));

    setBursts((existing) => [...existing, ...newBursts]);

    setTimeout(() => {
      setBursts((existing) =>
        existing.filter((b) => !b.id.startsWith(reaction.id)),
      );
    }, 2500);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket) {
      return;
    }

    socket.on("reaction:burst", handleReactionBurst);

    return () => {
      socket.off("reaction:burst", handleReactionBurst);
    };
  }, [socketRef, handleReactionBurst]);

  return { bursts, handleSendReaction };
}

export default ReactionBar;
