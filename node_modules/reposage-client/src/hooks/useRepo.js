import { createContext, createElement, useContext, useMemo, useState } from "react";

import { analyzeRepo as analyzeRepoRequest } from "../services/api";

const RepoContext = createContext(null);

const STORAGE_KEY_URL = "reposage_repo_url";
const STORAGE_KEY_DATA = "reposage_repo_data";

const loadFromStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const RepoProvider = ({ children }) => {
  const [repoUrl, setRepoUrl] = useState(() => loadFromStorage(STORAGE_KEY_URL) || "");
  const [repoData, setRepoData] = useState(() => loadFromStorage(STORAGE_KEY_DATA) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeRepo = async (nextRepoUrl) => {
    const normalized = nextRepoUrl.trim();
    if (!normalized) {
      throw new Error("Please enter a valid GitHub repository URL.");
    }

    setRepoUrl(normalized);
    saveToStorage(STORAGE_KEY_URL, normalized);
    setIsLoading(true);
    setError("");

    try {
      const data = await analyzeRepoRequest(normalized);
      setRepoData(data);
      saveToStorage(STORAGE_KEY_DATA, data);
      return data;
    } catch (err) {
      const message = err.message || "Failed to analyze repository.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      repoUrl,
      repoData,
      isLoading,
      error,
      analyzeRepo,
      setRepoUrl,
      setRepoData,
      setError
    }),
    [repoUrl, repoData, isLoading, error]
  );

  return createElement(RepoContext.Provider, { value }, children);
};

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error("useRepo must be used inside RepoProvider.");
  }
  return context;
};