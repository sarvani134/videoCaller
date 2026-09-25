import { useEffect, useRef } from "react"

function ChatWindow({ messages, message, onMessageChange, onSend, onClose, connected }) {
  const listRef = useRef(null)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  return (
    <aside className="chat-window" id="meeting-chat" aria-labelledby="chat-title" onKeyDown={(event) => { if (event.key === "Escape") onClose() }}>
      <header className="chat-header">
        <div><h2 id="chat-title">Meeting chat</h2><p>Messages are visible to everyone in this meeting</p></div>
        <button type="button" className="chat-close" onClick={onClose} aria-label="Close chat" title="Close chat">&times;</button>
      </header>
      <div className="chat-legend"><span>Host</span><span>Participant</span></div>
      <div className="chat-messages" ref={listRef} role="log" aria-label="Meeting messages" aria-live="polite" tabIndex={0}>
        {messages.length === 0 ? <div className="chat-empty"><strong>Start the conversation</strong><p>Say hello or share a thought with everyone.</p></div> : messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender === "Host" ? "chat-host" : "chat-participant"}${msg.isOwn ? " chat-own" : ""}`}>
            <span className="chat-sender">{msg.sender === "Host" ? "Host" : "Participant"}{msg.isOwn ? " · You" : ""}</span>
            <p className="chat-bubble">{msg.data}</p>
          </div>
        ))}
      </div>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); if (connected && message.trim()) onSend(message) }}>
        <div className="chat-input-row">
          <input ref={inputRef} aria-label="Message" placeholder="Write a message…" value={message} onChange={(event) => onMessageChange(event.target.value)} />
          <button type="submit" className="chat-send" disabled={!connected || !message.trim()} aria-label="Send message" title="Send message">
            <svg className="chat-send-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" /></svg>
          </button>
        </div>
        <p>{connected ? "Press Enter to send" : "Waiting for connection…"}</p>
      </form>
    </aside>
  )
}
export default ChatWindow
