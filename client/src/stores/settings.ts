import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { MODELS, type ModelType } from "@/types";

// Theme types
export type Theme = "light" | "dark" | "system";

// Get initial theme from localStorage or default to system
const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("theme") as Theme | null;
  return saved ?? "system";
};

// Theme atom with localStorage persistence
export const themeAtom = atomWithStorage<Theme>("theme", getInitialTheme());

// Derived atom to get the actual theme (resolving 'system' to light/dark)
export const resolvedThemeAtom = atom((get) => {
  const theme = get(themeAtom);
  if (theme !== "system") {
    return theme;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
});

// Language atom with localStorage persistence
export const languageAtom = atomWithStorage<string>("language", "zh");

export const modelAtom = atomWithStorage<ModelType>(
  "ai_agent_model",
  MODELS.OLLAMA_MODEL,
);
