import { Copy, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import LoadingState from "../components/LoadingState";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { useRepo } from "../hooks/useRepo";
import { streamExplanation } from "../services/api";

const loadingSteps = ["Analyzing repository structure...", "Reading key files...", "Generating breakdown..."];

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const Explainer = () => {
  const { repoData, repoUrl } = useRepo();
  const [markdown, setMarkdown] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    if (!isGenerating || markdown) return undefined;
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % loadingSteps.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [isGenerating, markdown]);

  const sections = useMemo(() => {
    const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
    return matches.map((match) => {
      const title = match[1].trim();
      return {
        title,
        id: slugify(title)
      };
    });
  }, [markdown]);

  useEffect(() => {
    if (!markdown) return undefined;

    const sectionEls = Array.from(document.querySelectorAll(".explainer-content .markdown-body h2"));
    if (!sectionEls.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.1 }
    );

    sectionEls.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [markdown]);

  const handleGenerate = async () => {
    if (!repoUrl) return;
    setIsGenerating(true);
    setError("");
    setMarkdown("");
    setStepIndex(0);

    await streamExplanation(
      repoUrl,
      (chunk) => {
        setMarkdown((previous) => previous + chunk);
      },
      () => {
        setIsGenerating(false);
      },
      (streamError) => {
        setError(streamError?.message || "Could not generate explanation.");
        setIsGenerating(false);
      }
    );
  };

  if (!repoData) {
    return (
      <section className="empty-state">
        <h2>Repository not loaded yet</h2>
        <p>Go to Home, paste a GitHub URL, and analyze it first.</p>
        <Link to="/" className="btn-accent">
          Back to Home
        </Link>
      </section>
    );
  }

  return (
    <section className="explainer-layout">
      <aside className="explainer-nav">
        <h4>Sections</h4>
        {sections.length ? (
          <nav>
            {sections.map((section) => (
              <button
                type="button"
                className={`section-link ${activeSection === section.id ? "active" : ""}`}
                key={section.id}
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {section.title}
              </button>
            ))}
          </nav>
        ) : (
          <p className="muted">Generate analysis to view section map.</p>
        )}
      </aside>

      <div className="explainer-content">
        <header className="page-header">
          <div>
            <h1>{repoData.meta?.name}</h1>
            <p className="muted">Technical Breakdown</p>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-secondary" onClick={handleGenerate} disabled={isGenerating}>
              <WandSparkles size={16} />
              {isGenerating ? "Generating..." : "Generate Analysis"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(markdown)}
              disabled={!markdown}
            >
              <Copy size={16} />
              Copy as Markdown
            </button>
          </div>
        </header>

        {error ? <p className="error-text">{error}</p> : null}

        {isGenerating && !markdown ? <LoadingState message={loadingSteps[stepIndex]} lines={6} /> : null}

        {markdown ? <MarkdownRenderer content={markdown} /> : null}
      </div>
    </section>
  );
};

export default Explainer;
