import { Router } from "express";

import { buildRepoContext, streamClaudeResponse } from "../services/claudeService.js";
import { fetchRepoData, getCachedRepoData, setCachedRepoData } from "../services/githubService.js";

const router = Router();

const EXPLAIN_SYSTEM_PROMPT = `You are an expert software architect and technical educator. Analyze the provided GitHub repository and produce a comprehensive, structured explanation that makes the reader fully interview-ready.

Structure your response EXACTLY as follows using markdown:

# [Project Name] — Complete Technical Breakdown

## 🎯 What This Project Does
[2-3 paragraph executive summary. What problem it solves, who uses it, why it matters]

## 🏛️ Architecture Overview
[Explain the high-level architecture. How data flows, what the major components are, how they communicate]

## 🛠️ Tech Stack Deep Dive
[For each major technology/framework: what it is, WHY this project uses it, what alternatives exist and why this was chosen]

## 📁 Codebase Structure
[Walk through the folder structure. Explain what each major directory/file does and why it's organized this way]

## ⚙️ Core Features & How They Work
[For each major feature: explain the implementation approach, key functions/components involved, data flow]

## 🔑 Key Technical Concepts
[Explain 5-7 important technical concepts, patterns, or decisions in this codebase that an interviewer might ask about]

## 💡 Design Decisions & Trade-offs
[What architectural/technical decisions were made? What are the trade-offs? What would you do differently?]

## 🚀 How to Run & Deploy
[Setup instructions, environment variables, deployment approach]

## 🎤 Interview Questions & Model Answers
Generate 10 likely interview questions about this project with detailed model answers. Cover: architecture decisions, implementation challenges, scaling considerations, testing approach, security concerns.

Format each as:
**Q: [Question]**
A: [Detailed answer, 3-5 sentences]

Be thorough, technical, and precise. Assume the reader will be asked about this project in a senior engineering interview.`;

router.post("/", async (req, res, next) => {
  try {
    const { repoUrl } = req.body || {};
    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ error: "repoUrl is required." });
    }

    const cache = req.app.locals.repoCache;
    let repoData = getCachedRepoData(cache, repoUrl);

    if (!repoData) {
      repoData = await fetchRepoData(repoUrl);
      setCachedRepoData(cache, repoUrl, repoData);
    }

    const repoContext = buildRepoContext(repoData);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    await streamClaudeResponse({
      systemPrompt: `${EXPLAIN_SYSTEM_PROMPT}\n\nRepository Context:\n${repoContext}`,
      messages: [{ role: "user", content: "Generate the full breakdown now." }],
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
