import type { AssistantTurn } from "./assistant-provider";

export const ASSISTANT_TURNS_STORAGE_KEY = "kloqra-assistant-turns-v1";
export const ASSISTANT_FEEDBACK_STORAGE_KEY = "kloqra-assistant-feedback-v1";
export const MAX_STORED_TURNS = 20;

export type AssistantFeedback = {
  turnIndex: number;
  helpful: boolean;
};

export function loadStoredTurns(): AssistantTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ASSISTANT_TURNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AssistantTurn =>
          typeof item === "object" &&
          item !== null &&
          (item as AssistantTurn).role !== undefined &&
          typeof (item as AssistantTurn).content === "string"
      )
      .slice(-MAX_STORED_TURNS);
  } catch {
    return [];
  }
}

export function saveStoredTurns(turns: AssistantTurn[]): void {
  if (typeof window === "undefined") return;
  try {
    if (turns.length === 0) {
      clearStoredTurns();
      return;
    }
    sessionStorage.setItem(
      ASSISTANT_TURNS_STORAGE_KEY,
      JSON.stringify(turns.slice(-MAX_STORED_TURNS))
    );
  } catch {
    // ignore quota errors
  }
}

export function clearStoredTurns(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ASSISTANT_TURNS_STORAGE_KEY);
}

export function loadStoredFeedback(): AssistantFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(ASSISTANT_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AssistantFeedback =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AssistantFeedback).turnIndex === "number" &&
        typeof (item as AssistantFeedback).helpful === "boolean"
    );
  } catch {
    return [];
  }
}

export function saveStoredFeedback(feedback: AssistantFeedback[]): void {
  if (typeof window === "undefined") return;
  try {
    if (feedback.length === 0) {
      clearStoredFeedback();
      return;
    }
    sessionStorage.setItem(ASSISTANT_FEEDBACK_STORAGE_KEY, JSON.stringify(feedback));
  } catch {
    // ignore quota errors
  }
}

export function clearStoredFeedback(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ASSISTANT_FEEDBACK_STORAGE_KEY);
}
