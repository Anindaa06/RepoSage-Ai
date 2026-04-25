import { ArrowUp, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import MarkdownRenderer from "../components/MarkdownRenderer";
import VoiceButton from "../components/VoiceButton";
import { useChat } from "../hooks/useChat";
import { useRepo } from "../hooks/useRepo";
import { useVoice } from "../hooks/useVoice";
import { streamInterview } from "../services/api";

const parseScores = (text = "") => {
  const patterns = {
    technicalDepth: /Technical Depth:\s*(\d{1,2})\s*\/\s*10/i,
    communicationClarity: /Communication Clarity:\s*(\d{1,2})\s*\/\s*10/i,
    problemSolving: /Problem-solving approach:\s*(\d{1,2})\s*\/\s*10/i,
    overall: /Overall:\s*(\d{1,2})\s*\/\s*10/i
  };

  const scores = {};
  let found = false;

  Object.entries(patterns).forEach(([key, regex]) => {
    const match = text.match(regex);
    if (match) {
      scores[key] = Number(match[1]);
      found = true;
    }
  });

  return found ? scores : null;
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

const InterviewFeedback = ({ scores, feedback }) => {
  const rows = [
    { label: "Technical Depth", key: "technicalDepth" },
    { label: "Communication", key: "communicationClarity" },
    { label: "Problem Solving", key: "problemSolving" },
    { label: "Overall Score", key: "overall" }
  ];

  return (
    <div className="feedback-card">
      <h3>Interview Complete</h3>
      {rows.map((row) => {
        const value = scores?.[row.key] ?? 0;
        return (
          <div className="feedback-row" key={row.key}>
            <span>{row.label}</span>
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(value / 10) * 100}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
            <span>{value}/10</span>
          </div>
        );
      })}
      <div className="feedback-text">
        <MarkdownRenderer content={feedback} />
      </div>
    </div>
  );
};

const MockInterview = () => {
  const { repoData, repoUrl } = useRepo();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Not Started");
  const [phase, setPhase] = useState("intro");
  const [seconds, setSeconds] = useState(0);
  const [readAloud, setReadAloud] = useState(false);
  const [scores, setScores] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const endRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastSpokenRef = useRef("");

  const streamer = useMemo(
    () => ({
      streamer: async ({ repoUrl: currentRepoUrl, messages, phase: currentPhase, onChunk, onDone, onError }) =>
        streamInterview(currentRepoUrl, messages, currentPhase, onChunk, onDone, onError)
    }),
    []
  );

  const { messages, isStreaming, error, sendMessage, clearConversation } = useChat(streamer);
  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    speak,
    stopSpeaking
  } = useVoice();

  const started = status !== "Not Started";
  const isComplete = status === "Complete";

  // Timer
  useEffect(() => {
    if (!started || isComplete) return undefined;
    const interval = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [started, isComplete]);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Read aloud
  useEffect(() => {
    if (!readAloud || isStreaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content || last.content === lastSpokenRef.current) return;
    lastSpokenRef.current = last.content;
    speak(last.content);
  }, [messages, isStreaming, readAloud, speak]);

  // Detect interview complete
  useEffect(() => {
    if (isStreaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    const parsed = parseScores(last.content);
    if (parsed) {
      setScores(parsed);
      setFeedbackText(last.content);
      setStatus("Complete");
      setPhase("feedback");
      stopListening();
      stopSpeaking();
    }
  }, [messages, isStreaming, stopListening, stopSpeaking]);

  // Sync voice transcript → text input
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [isListening, transcript]);

  // Auto-submit after 1.5s silence
  useEffect(() => {
    if (!isListening || !transcript.trim() || isStreaming || isComplete) return undefined;
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(async () => {
      const spoken = transcript.trim();
      stopListening();
      clearTranscript();
      setInput("");
      if (spoken) {
        await sendMessage({ repoUrl, content: spoken, payload: { phase } });
      }
    }, 1500);
    return () => clearTimeout(silenceTimerRef.current);
  }, [isListening, transcript, isStreaming, isComplete, stopListening, clearTranscript, sendMessage, repoUrl, phase]);

  const questionCount = messages.filter((message) => {
    if (message.role !== "assistant") return false;
    return !parseScores(message.content);
  }).length;

  const startInterview = async () => {
    clearConversation();
    setScores(null);
    setFeedbackText("");
    setSeconds(0);
    setStatus("In Progress");
    setPhase("intro");
    await sendMessage({
      repoUrl,
      content: "",
      injectUser: false,
      payload: { phase: "intro" }
    });
    setPhase("questioning");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim() || isComplete) return;
    const answer = input.trim();
    setInput("");
    const nextPhase = questionCount > 2 ? "followup" : "questioning";
    setPhase(nextPhase);
    await sendMessage({
      repoUrl,
      content: answer,
      payload: { phase: nextPhase }
    });
  };

  if (!repoData) {
    return (
      <section className="empty-state">
        <h2>No repository loaded</h2>
        <p>Analyze a repository first so the interview can be tailored.</p>
        <Link to="/" className="btn-accent">
          Go to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="chat-layout interview">
      <header className="page-header">
        <div className="interview-header-grid">
          <h1>Mock Interview</h1>
          <span className="badge">{repoData.meta?.name}</span>
          <span className={`status-pill ${isComplete ? "complete" : started ? "active" : ""}`}>{status}</span>
          <span className="timer">{formatTime(seconds)}</span>
        </div>
      </header>

      {!started ? (
        <div className="pre-interview">
          <h2>Ready to practice?</h2>
          <p>
            The AI will ask you technical questions about <strong>{repoData.meta?.name}</strong> and evaluate your answers.
          </p>
          <ul>
            <li>Speak or type your answers</li>
            <li>Explain your reasoning</li>
            <li>Ask clarifying questions if needed</li>
          </ul>
          <button type="button" className="btn-accent" onClick={startInterview}>
            Start Interview
          </button>
        </div>
      ) : (
        <>
          <div className="chat-thread">
            <p className="muted progress-line">Question {Math.max(questionCount, 1)} of ~10</p>
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index + 1}`}>
                {message.role === "assistant" ? (
                  <div className="assistant-bubble">
                    <p className="assistant-label">Interviewer</p>
                    {message.content ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="user-bubble">
                    <p className="assistant-label">You</p>
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            {error ? <p className="error-text">{error}</p> : null}
            <div ref={endRef} />
          </div>

          {isComplete && scores ? <InterviewFeedback scores={scores} feedback={feedbackText} /> : null}

          <form className="chat-input-dock interview-dock" onSubmit={handleSubmit}>
            <div className="voice-toggle-row">
              <label className="switch-wrap">
                <input
                  type="checkbox"
                  checked={readAloud}
                  onChange={(event) => {
                    setReadAloud(event.target.checked);
                    if (!event.target.checked) stopSpeaking();
                  }}
                />
                <span>
                  <Volume2 size={14} />
                  Read questions aloud
                </span>
              </label>
            </div>

            <div className="interview-input-row">
              {isSupported ? (
                <VoiceButton
                  isListening={isListening}
                  transcript={transcript}
                  onStart={startListening}
                  onStop={stopListening}
                  disabled={isStreaming || isComplete}
                />
              ) : (
                <p className="muted">Voice input is not supported in this browser.</p>
              )}
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                rows={1}
                placeholder="Type your answer or click the mic to speak..."
                disabled={isStreaming || isComplete}
              />
              <button type="submit" className="btn-accent icon-only" disabled={isStreaming || isComplete}>
                <ArrowUp size={16} />
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
};

export default MockInterview;