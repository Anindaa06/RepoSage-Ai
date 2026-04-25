import { useCallback, useEffect, useRef, useState } from "react";

export const useChat = ({ streamer }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError("");
    messagesRef.current = [];
  }, []);

  const sendMessage = useCallback(
    async ({ repoUrl, content = "", payload = {}, injectUser = true }) => {
      if (isStreaming) return;

      const cleaned = content.trim();
      if (injectUser && !cleaned) return;

      setIsStreaming(true);
      setError("");

      const baseMessages = [...messagesRef.current];
      const outboundMessages = injectUser
        ? [...baseMessages, { role: "user", content: cleaned }]
        : [...baseMessages];

      setMessages([...outboundMessages, { role: "assistant", content: "" }]);
      messagesRef.current = [...outboundMessages, { role: "assistant", content: "" }];

      let assistantText = "";

      try {
        await streamer({
          repoUrl,
          messages: outboundMessages,
          ...payload,
          onChunk: (chunk) => {
            assistantText += chunk;
            setMessages((previous) => {
              const next = [...previous];
              if (!next.length) return previous;
              next[next.length - 1] = { role: "assistant", content: assistantText };
              messagesRef.current = next;
              return next;
            });
          },
          onDone: () => {
            setIsStreaming(false);
            if (!assistantText.trim()) {
              setMessages((previous) => {
                const next = [...previous];
                if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content.trim()) {
                  next.pop();
                }
                messagesRef.current = next;
                return next;
              });
            }
          },
          onError: (streamError) => {
            const message = streamError?.message || "Failed to stream response.";
            setIsStreaming(false);
            setError(message);
            setMessages((previous) => {
              const next = [...previous];
              if (next[next.length - 1]?.role === "assistant" && !next[next.length - 1].content.trim()) {
                next.pop();
              }
              messagesRef.current = next;
              return next;
            });
          }
        });
      } catch (streamError) {
        setIsStreaming(false);
        setError(streamError?.message || "Failed to stream response.");
      }
    },
    [isStreaming, streamer]
  );

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearConversation,
    setMessages
  };
};
