import axios from "axios";

const GITHUB_API_BASE = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_STRUCTURE_FILES = 200;
const MAX_FILE_CONTENT_LENGTH = 8000;
const ROOT_FILE_SIZE_LIMIT = 50 * 1024;

const EXCLUDED_PATH_PARTS = ["node_modules", ".git", "dist", "build", "coverage", ".next"];
const LOCK_FILE_NAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock"
];
const MANIFEST_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod"
];
const COMMON_ENTRY_CANDIDATES = [
  "src/index.tsx",
  "src/index.ts",
  "src/index.jsx",
  "src/index.js",
  "src/main.tsx",
  "src/main.ts",
  "src/main.jsx",
  "src/main.js",
  "index.tsx",
  "index.ts",
  "index.jsx",
  "index.js",
  "main.py",
  "app.py",
  "cmd/main.go",
  "main.go"
];
const SOURCE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".php",
  ".rb",
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".scala",
  ".vue",
  ".svelte"
];

const createGitHubClient = () => {
  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers,
    timeout: 20000
  });
};

const toGitHubContentPath = (path) =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const truncateContent = (content = "") => {
  if (content.length <= MAX_FILE_CONTENT_LENGTH) {
    return content;
  }
  return `${content.slice(0, MAX_FILE_CONTENT_LENGTH)}\n... [truncated]`;
};

const parseRepoUrl = (input) => {
  if (!input || typeof input !== "string") {
    throw new Error("Repository URL is required.");
  }

  const trimmed = input.trim().replace(/\.git$/i, "").replace(/\/+$/, "");
  const shorthandMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);

  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2] };
  }

  const urlMatch = trimmed.match(
    /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/.*)?$/i
  );

  if (!urlMatch) {
    throw new Error("Invalid GitHub URL format. Use owner/repo or https://github.com/owner/repo.");
  }

  return {
    owner: urlMatch[1],
    repo: urlMatch[2]
  };
};

const getCacheKey = (repoUrl) => {
  try {
    const parsed = parseRepoUrl(repoUrl);
    return `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`;
  } catch {
    return String(repoUrl || "").trim().toLowerCase();
  }
};

export const getCachedRepoData = (cache, repoUrl) => {
  const key = getCacheKey(repoUrl);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

export const setCachedRepoData = (cache, repoUrl, value) => {
  const key = getCacheKey(repoUrl);
  cache.set(key, { value, timestamp: Date.now() });
};

const isLockFile = (path) => LOCK_FILE_NAMES.some((lockFile) => path.endsWith(lockFile));
const isExcludedPath = (path) =>
  EXCLUDED_PATH_PARTS.some((part) => path.split("/").includes(part)) || isLockFile(path);
const isRootFile = (path) => !path.includes("/");
const isSourceFile = (path) => SOURCE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

const selectManifestPath = (allFiles) => {
  for (const manifest of MANIFEST_FILES) {
    const inRoot = allFiles.find((file) => file.path === manifest);
    if (inRoot) {
      return inRoot.path;
    }

    const nested = allFiles.find((file) => file.path.endsWith(`/${manifest}`));
    if (nested) {
      return nested.path;
    }
  }
  return null;
};

const findReadmePath = (allFiles) => {
  const rootReadme = allFiles.find((file) => /^README(\..+)?$/i.test(file.path));
  if (rootReadme) return rootReadme.path;

  const anyReadme = allFiles.find((file) => /README/i.test(file.path));
  return anyReadme?.path || null;
};

const resolveMainEntryPath = (allFiles, packageInfo) => {
  const byPath = new Set(allFiles.map((file) => file.path));

  if (packageInfo && packageInfo.type === "package.json" && packageInfo.parsed) {
    const { main, module, bin } = packageInfo.parsed;
    const binEntry = typeof bin === "string" ? bin : bin && typeof bin === "object" ? Object.values(bin)[0] : null;
    const manifestEntries = [main, module, binEntry].filter(Boolean);

    for (const entry of manifestEntries) {
      const normalized = String(entry).replace(/^\.\/+/, "");
      if (byPath.has(normalized)) {
        return normalized;
      }
    }
  }

  return COMMON_ENTRY_CANDIDATES.find((candidate) => byPath.has(candidate)) || null;
};

const parsePackageInfo = (manifestPath, manifestContent) => {
  if (!manifestPath || !manifestContent) {
    return {};
  }

  if (manifestPath.endsWith("package.json")) {
    try {
      return {
        type: "package.json",
        parsed: JSON.parse(manifestContent)
      };
    } catch {
      return { type: "package.json", raw: manifestContent };
    }
  }

  if (manifestPath.endsWith("requirements.txt")) {
    const dependencies = manifestContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    return {
      type: "requirements.txt",
      dependencies
    };
  }

  if (manifestPath.endsWith("pyproject.toml")) {
    return {
      type: "pyproject.toml",
      raw: manifestContent
    };
  }

  if (manifestPath.endsWith("Cargo.toml")) {
    return {
      type: "Cargo.toml",
      raw: manifestContent
    };
  }

  if (manifestPath.endsWith("go.mod")) {
    return {
      type: "go.mod",
      raw: manifestContent
    };
  }

  return {};
};

const fetchFileContent = async ({ client, owner, repo, path, ref }) => {
  try {
    const encodedPath = toGitHubContentPath(path);
    const response = await client.get(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
      params: { ref }
    });

    const data = response.data;

    if (Array.isArray(data)) {
      return "";
    }

    if (typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }

    if (data.download_url) {
      const raw = await axios.get(data.download_url, { responseType: "text" });
      return String(raw.data || "");
    }

    return "";
  } catch {
    return "";
  }
};

const fetchReadme = async ({ client, owner, repo }) => {
  try {
    const response = await client.get(`/repos/${owner}/${repo}/readme`, {
      headers: {
        Accept: "application/vnd.github.raw"
      },
      responseType: "text"
    });
    return String(response.data || "");
  } catch {
    return "";
  }
};

const buildStructure = (allFiles) =>
  allFiles.slice(0, MAX_STRUCTURE_FILES).map((file) => ({
    path: file.path,
    type: "file",
    size: file.size || 0
  }));

const buildKeyFilePaths = ({ allFiles, readmePath, manifestPath, mainEntryPath }) => {
  const ordered = [];
  const seen = new Set();
  const add = (path) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    ordered.push(path);
  };

  add(readmePath);
  add(manifestPath);
  add(mainEntryPath);

  const rootFiles = allFiles
    .filter(
      (file) => isRootFile(file.path) && !isExcludedPath(file.path) && (file.size || 0) < ROOT_FILE_SIZE_LIMIT
    )
    .map((file) => file.path);

  rootFiles.forEach(add);

  const sourceFiles = allFiles
    .filter((file) => isSourceFile(file.path) && !isExcludedPath(file.path))
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .map((file) => file.path);

  for (const sourcePath of sourceFiles) {
    if (ordered.length >= 15) break;
    add(sourcePath);
  }

  return ordered;
};

export const fetchRepoData = async (repoUrl) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const client = createGitHubClient();

  const repoResponse = await client.get(`/repos/${owner}/${repo}`);
  const repoMeta = repoResponse.data;
  const defaultBranch = repoMeta.default_branch || "main";

  const [readme, languagesResponse, treeResponse] = await Promise.all([
    fetchReadme({ client, owner, repo }),
    client.get(`/repos/${owner}/${repo}/languages`).catch(() => ({ data: {} })),
    client
      .get(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}`, {
        params: { recursive: 1 }
      })
      .catch(() => ({ data: { tree: [] } }))
  ]);

  const treeItems = Array.isArray(treeResponse.data?.tree) ? treeResponse.data.tree : [];
  const allFiles = treeItems.filter((item) => item.type === "blob");
  const structure = buildStructure(allFiles);

  const readmePath = findReadmePath(allFiles);
  const manifestPath = selectManifestPath(allFiles);

  let manifestContent = "";
  if (manifestPath) {
    manifestContent = await fetchFileContent({
      client,
      owner,
      repo,
      path: manifestPath,
      ref: defaultBranch
    });
  }

  const packageInfo = parsePackageInfo(manifestPath, manifestContent);
  const mainEntryPath = resolveMainEntryPath(allFiles, packageInfo);
  const keyFilePaths = buildKeyFilePaths({
    allFiles,
    readmePath,
    manifestPath,
    mainEntryPath
  });

  const preFetched = new Map();
  if (readmePath && readme) preFetched.set(readmePath, readme);
  if (manifestPath && manifestContent) preFetched.set(manifestPath, manifestContent);

  const keyFiles = (
    await Promise.all(
      keyFilePaths.map(async (path) => {
        const content =
          preFetched.get(path) ||
          (await fetchFileContent({
            client,
            owner,
            repo,
            path,
            ref: defaultBranch
          }));

        if (!content) {
          return null;
        }

        return {
          path,
          content: truncateContent(content)
        };
      })
    )
  ).filter(Boolean);

  return {
    meta: {
      name: repoMeta.name,
      description: repoMeta.description,
      stars: repoMeta.stargazers_count,
      forks: repoMeta.forks_count,
      language: repoMeta.language,
      topics: Array.isArray(repoMeta.topics) ? repoMeta.topics : [],
      license: repoMeta.license?.spdx_id || repoMeta.license?.name || "Unspecified",
      createdAt: repoMeta.created_at,
      updatedAt: repoMeta.updated_at,
      homepage: repoMeta.homepage
    },
    readme,
    structure,
    keyFiles,
    packageInfo,
    languages: languagesResponse.data || {}
  };
};
