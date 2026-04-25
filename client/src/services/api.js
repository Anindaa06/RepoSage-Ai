const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const analyzeRepo = async (repoUrl) => {
  const response = await fetch(`${BASE_URL}/repo/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "Unable to analyze repository.");
  }

  return response.json();
};

const streamSSE = async (endpoint, payload, onChunk, onDone, onError) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok || !response.body) {
      const message = await response.text();
      throw new Error(message || "Streaming request failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        if (data === "[DONE]") {
          completed = true;
          onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            onChunk?.(parsed.text);
          }
        } catch (error) {
          onError?.(error);
          return;
        }
      }
    }

    if (!completed) {
      onDone?.();
    }
  } catch (error) {
    onError?.(error);
  }
};

export const streamExplanation = async (repoUrl, onChunk, onDone, onError) =>
  streamSSE("/explain", { repoUrl }, onChunk, onDone, onError);

export const streamChat = async (repoUrl, messages, onChunk, onDone, onError) =>
  streamSSE("/chat", { repoUrl, messages }, onChunk, onDone, onError);

export const streamInterview = async (repoUrl, messages, phase, onChunk, onDone, onError) =>
  streamSSE("/interview", { repoUrl, messages, phase }, onChunk, onDone, onError);

export { BASE_URL };
