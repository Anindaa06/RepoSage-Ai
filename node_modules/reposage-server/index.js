import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import chatRoutes from "./routes/chat.js";
import explainRoutes from "./routes/explain.js";
import interviewRoutes from "./routes/interview.js";
import repoRoutes from "./routes/repo.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.locals.repoCache = new Map();

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(
  cors({
    origin: "*"
  })
);
app.use(express.json({ limit: "1mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/repo", repoRoutes);
app.use("/api/explain", explainRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/interview", interviewRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RepoSage server running on http://localhost:${PORT}`);
});
