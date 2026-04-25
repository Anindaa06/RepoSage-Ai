import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

let groqClient = null;

const getGroq = () => {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groqClient;
};

const safeText = (value) => (typeof value === "string" ? value : value ? JSON.stringify(value) : "");

const formatStructure = (structure = []) => {
  if (!Array.isArray(structure) || structure.length === 0) return "No file structure available.";
  return structure
    .slice(0, 50)
    .map((item) => `- ${item.path} (${item.type}, ${item.size ?? 0} bytes)`)
    .join("\n");
};

export const buildRepoContext = (repoData) => {
  const meta = repoData?.meta || {};
  const topics = Array.isArray(meta.topics) && meta.topics.length ? meta.topics.join(", ") : "None";
  const keyFiles = Array.isArray(repoData?.keyFiles) ? repoData.keyFiles : [];
  const readme = safeText(repoData?.readme).slice(0, 1500);
  const keyFileSections = keyFiles
    .slice(0, 8)
    .map((file) => `--- ${file.path} ---\n${safeText(file.content).slice(0, 500)}`)
    .join("\n\n");

  return `Repository: ${meta.name || "Unknown"}
Description: ${meta.description || "No description"}
Stars: ${meta.stars ?? 0} | Language: ${meta.language || "Unknown"} | License: ${meta.license || "Unknown"}
Topics: ${topics}

README Summary:
${readme || "README not available."}

Project Structure:
${formatStructure(repoData?.structure)}

Key Files:
${keyFileSections || "No key file contents available."}`;
};

const normalizeMessages = (messages = []) =>
  messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: safeText(m.content) }));

export const streamClaudeResponse = async ({
  systemPrompt,
  messages,
  onText,
  onDone,
  onError,
  signal
}) => {
  const normalized = normalizeMessages(messages);
  const safeMessages =
    normalized.length > 0
      ? normalized
      : [{ role: "user", content: "Begin the requested analysis." }];

  try {
    const stream = await getGroq().chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...safeMessages
      ],
      stream: true
    });

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) onText(text);
    }

    onDone();
  } catch (error) {
    if (!signal?.aborted) onError(error);
  }
};