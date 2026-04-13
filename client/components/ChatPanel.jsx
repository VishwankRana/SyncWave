function ChatPanel({
  messages = [],
  chatDraft = "",
  onChatDraftChange,
  onSendMessage,
}) {
  return (
    <section className="panel chat-panel">
      <div className="panel-heading chat-panel__heading">
        <div>
          <p className="eyebrow">Room Chat</p>
          <h3>Chat</h3>
        </div>
      </div>

      <div className="chat-feed">
        {messages.length === 0 ? (
          <div className="empty-state chat-feed__empty">
            Say hi to the room. Messages will show up here.
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="chat-message">
              <div className="chat-message__header">
                <strong>{message.name}</strong>
                <span>{message.time}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))
        )}
      </div>

      <form className="chat-composer" onSubmit={onSendMessage}>
        <input
          type="text"
          value={chatDraft}
          onChange={(event) => onChatDraftChange(event.target.value)}
          placeholder="Send a message to the room"
        />
        <button className="primary-button" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}

export default ChatPanel;
