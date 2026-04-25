import { Router } from "express";

import { buildRepoContext, streamClaudeResponse } from "../services/claudeService.js";
import { fetchRepoData, getCachedRepoData, setCachedRepoData } from "../services/githubService.js";

const router = Router();

const INTERVIEW_BASE_PROMPT = `You are a senior software engineer conducting a technical interview about a specific project. Your job is to assess the candidate's depth of understanding.

Interview Guidelines:
- Start with broad questions, then drill down based on answers
- Ask follow-up questions that probe deeper ("Can you explain how that works under the hood?", "What would happen if X?")
- Be encouraging but rigorous
- If an answer is vague, push for specifics
- After 8-10 exchanges, provide detailed feedback with scores

Question Categories to Cover:
1. Project overview and purpose
2. Architecture and design decisions
3. Specific implementation details
4. Challenges and how they were solved
5. Scalability and performance
6. Testing and reliability
7. Security considerations
8. What you'd improve

Scoring (provide at end):
- Technical Depth: /10
- Communication Clarity: /10
- Problem-solving approach: /10
- Overall: /10`;

router.post("/", async (req, res, next) => {
  try {
    const { repoUrl, messages, phase } = req.body || {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ error: "repoUrl is required." });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array." });
    }

    const interviewPhase = ["intro", "questioning", "followup", "feedback"].includes(phase)
      ? phase
      : "questioning";

    const cache = req.app.locals.repoCache;
    let repoData = getCachedRepoData(cache, repoUrl);
    if (!repoData) {
      repoData = await fetchRepoData(repoUrl);
      setCachedRepoData(cache, repoUrl, repoData);
    }

    const repoContext = buildRepoContext(repoData);
    const systemPrompt = `${INTERVIEW_BASE_PROMPT}

${repoContext}

Current phase: ${interviewPhase}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const safeMessages =
      messages.length > 0
        ? messages
        : [
            {
              role: "user",
              content: "Start the interview by introducing the process and asking the first technical question."
            }
          ];

    await streamClaudeResponse({
      systemPrompt,
      messages: safeMessages,
      signal: abortController.signal,
      onText: (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
      onDone: () => {
        res.write("data: [DONE]\n\n");
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ error: error.message || "Streaming failed." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    });

    return null;
  } catch (error) {
    return next(error);
  }
});

export default router;
