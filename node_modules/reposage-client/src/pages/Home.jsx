import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, MessageCircle, MicVocal } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoadingState from "../components/LoadingState";
import RepoInput from "../components/RepoInput";
import { useRepo } from "../hooks/useRepo";

const featureCards = [
  {
    title: "Deep Explainer",
    description:
      "Get a complete technical breakdown structured for interviews. Architecture, stack, key concepts, and 10 interview Q&As.",
    icon: BookOpenText,
    path: "/explain"
  },
  {
    title: "Repo Chatbot",
    description: "Ask anything about the codebase. Get precise, contextual answers with code references.",
    icon: MessageCircle,
    path: "/chat"
  },
  {
    title: "Mock Interview",
    description: "Practice a real technical interview about this project. With voice support.",
    icon: MicVocal,
    path: "/interview"
  }
];

const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const Home = () => {
  const navigate = useNavigate();
  const { repoData, repoUrl, isLoading, error, analyzeRepo, setError } = useRepo();
  const [inputValue, setInputValue] = useState(repoUrl || "");

  const safeTopics = useMemo(() => repoData?.meta?.topics || [], [repoData]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await analyzeRepo(inputValue);
    } catch {
      // handled in context
    }
  };

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-block"
      >
        <h1 className="hero-title">
          Understand <span className="hero-accent">any codebase</span>.
          <br />
          In minutes.
        </h1>
        <p className="hero-subtitle">
          Paste a GitHub repo URL and get a complete technical breakdown, an AI chat assistant, and a mock interview
          all tailored to that exact project.
        </p>
      </motion.div>

      <RepoInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} isLoading={isLoading} />

      {error ? <p className="error-text">{error}</p> : null}

      {isLoading ? <LoadingState message="Fetching repository metadata..." lines={5} /> : null}

      {repoData ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="repo-card reveal-item"
          transition={{ duration: 0.5 }}
        >
          <div className="repo-stats">
            <span>⭐ {repoData.meta?.stars ?? 0}</span>
            <span>🍴 {repoData.meta?.forks ?? 0}</span>
            <span>📝 {repoData.meta?.language || "Unknown"}</span>
          </div>
          <h2>{repoData.meta?.name}</h2>
          <p className="repo-description">{repoData.meta?.description || "No description provided."}</p>
          <div className="repo-topics">
            <span className="muted">Topics:</span>
            {safeTopics.length ? safeTopics.map((topic) => <span key={topic} className="topic-pill">{topic}</span>) : <span className="muted">None</span>}
          </div>
          <p className="muted">Last updated: {formatDate(repoData.meta?.updatedAt)}</p>
        </motion.div>
      ) : null}

      <div className="feature-grid">
        {featureCards.map(({ title, description, icon: Icon, path }) => (
          <motion.article
            key={title}
            className="feature-card reveal-item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Icon size={28} className="feature-icon" />
            <h3>{title}</h3>
            <p>{description}</p>
            <button type="button" className="btn-secondary" onClick={() => navigate(path)}>
              Open
              <ArrowRight size={14} />
            </button>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default Home;
