import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import remarkGfm from "remark-gfm";

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const HeadingWithId = ({ level, children }) => {
  const text = String(children).replace(/,/g, "");
  const id = slugify(text);
  const Tag = `h${level}`;
  return <Tag id={id}>{children}</Tag>;
};

const MarkdownRenderer = ({ content }) => {
  const [copiedKey, setCopiedKey] = useState("");

  const components = useMemo(
    () => ({
      h1: ({ children }) => <HeadingWithId level={1}>{children}</HeadingWithId>,
      h2: ({ children }) => <HeadingWithId level={2}>{children}</HeadingWithId>,
      h3: ({ children }) => <HeadingWithId level={3}>{children}</HeadingWithId>,
      code({ inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const codeString = String(children).replace(/\n$/, "");
        const copyId = `${match?.[1] || "plain"}-${codeString.length}`;

        if (!inline) {
          return (
            <div className="markdown-code">
              <button
                type="button"
                className="copy-code-btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(codeString);
                  setCopiedKey(copyId);
                  setTimeout(() => setCopiedKey(""), 1200);
                }}
              >
                {copiedKey === copyId ? "Copied" : "Copy"}
              </button>
              <SyntaxHighlighter
                style={atomOneDark}
                language={match?.[1] || "text"}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  background: "var(--code-bg)",
                  borderRadius: 10,
                  border: "1px solid var(--border)"
                }}
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }

        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        );
      }
    }),
    [copiedKey]
  );

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
