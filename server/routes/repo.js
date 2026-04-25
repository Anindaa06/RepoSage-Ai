import { Router } from "express";

import { fetchRepoData, getCachedRepoData, setCachedRepoData } from "../services/githubService.js";

const router = Router();

router.post("/analyze", async (req, res, next) => {
  try {
    const { repoUrl } = req.body || {};

    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ error: "repoUrl is required." });
    }

    const cache = req.app.locals.repoCache;
    const cached = getCachedRepoData(cache, repoUrl);
    if (cached) {
      return res.json(cached);
    }

    const repoData = await fetchRepoData(repoUrl);
    setCachedRepoData(cache, repoUrl, repoData);

    return res.json(repoData);
  } catch (error) {
    return next(error);
  }
});

export default router;
