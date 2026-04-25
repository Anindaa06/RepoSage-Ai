import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import MarkdownRenderer from "../components/MarkdownRenderer";
import { useChat } from "../hooks/useChat";
import { useRepo } from "../hooks/useRepo";
import { streamChat } from "../services/api";

const suggestions = [
  "Explain the overall architecture of this project",
  "What design patterns are used in this codebase?",
  "Walk me through the data flow",
  "What are the main technical challenges this project solves?",
  "How would I set up this project locally?"
];

const Chatbot = () => {
  const { repoData, repoUrl } = useRepo();
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  const streamer = useMemo(
    () => ({
      streamer: async ({ repoUrl: currentRepoUrl, messages, onChunk, onDone, onError }) =>
        streamChat(currentRepoUrl, messages, onChunk, onDone, onError)
    }),
    []
  );

  const { messages, isStreaming, error, sendMessage, clearConversation } = useChat(streamer);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    const message = input;
    setInput("");
    await sendMessage({ repoUrl, content: message });
  };

  if (!repoData) {
    return (
      <section className="empty-state">
        <h2>No repository loaded</h2>
        <p>Analyze a repository first so the chatbot has code context.</p>
        <Link to="/" className="btn-accent">
          Go to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="chat-layout">
      <header className="page-header">
        <div>
          <h1>{repoData.meta?.name}</h1>
          <p className="muted">Chat</p>
        </div>
        <button type="button" className="btn-secondary" onClick={clearConversation}>
          Clear conversation
        </button>
      </header>

      <div className="chat-thread">
        {!messages.length ? (
          <div className="suggestions-wrap">
            <p className="muted">Try a starter question:</p>
            <div className="chip-row">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chip"
                  onClick={() => sendMessage({ repoUrl, content: suggestion })}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index + 1}`}>
            {message.role === "assistant" ? (
              <div className="assistant-bubble">
                <div className="assistant-meta">
                  <Sparkles size={14} />
                  <span>{repoData.meta?.name}</span>
                </div>
                {message.content ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <div className="typing-dots" aria-label="Assistant is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            ) : (
              <div className="user-bubble">{message.content}</div>
            )}
          </div>
        ))}

        {error ? <p className="error-text">{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form className="chat-input-dock" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
          placeholder="Ask anything about this repository..."
          rows={1}
          disabled={isStreaming}
        />
        <button type="submit" className="btn-accent icon-only" disabled={isStreaming}>
          <ArrowUp size={16} />
        </button>
      </form>
    </section>
  );
};

export default Chatbot;
