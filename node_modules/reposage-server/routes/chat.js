import { Router } from "express";

import { buildRepoContext, streamClaudeResponse } from "../services/claudeService.js";
import { fetchRepoData, getCachedRepoData, setCachedRepoData } from "../services/githubService.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { repoUrl, messages } = req.body || {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ error: "repoUrl is required." });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array." });
    }

    const cache = req.app.locals.repoCache;
    let repoData = getCachedRepoData(cache, repoUrl);
    if (!repoData) {
      repoData = await fetchRepoData(repoUrl);
      setCachedRepoData(cache, repoUrl, repoData);
    }

    const repoContext = buildRepoContext(repoData);
    const systemPrompt = `You are an expert on the following GitHub repository. Answer questions about it thoroughly and technically. Always reference specific files, functions, or code patterns when relevant. If asked about something not in the codebase, say so clearly.

${repoContext}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    await streamClaudeResponse({
      systemPrompt,
      messages,
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
