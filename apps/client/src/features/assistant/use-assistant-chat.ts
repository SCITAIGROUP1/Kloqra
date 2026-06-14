"use client";

import {
  assistantChatResponseSchema,
  ROUTES,
  type AssistantChatMessageDto,
  type AssistantChatResponseDto
} from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

export function useAssistantChat() {
  const workspaceId = useSessionStore((s) => s.session?.workspaceId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(
    async (
      history: AssistantChatMessageDto[],
      userContent: string
    ): Promise<AssistantChatResponseDto | null> => {
      if (!workspaceId) return null;

      const nextMessages: AssistantChatMessageDto[] = [
        ...history,
        { role: "user" as const, content: userContent }
      ].slice(-10);

      setLoading(true);
      setError(null);
      try {
        const raw = await api<unknown>(ROUTES.ASSISTANT.CHAT, {
          method: "POST",
          workspaceId,
          body: JSON.stringify({ messages: nextMessages })
        });
        const parsed = assistantChatResponseSchema.safeParse(raw);
        if (!parsed.success) {
          toast.error("Unexpected assistant response");
          return null;
        }
        return parsed.data;
      } catch {
        const message = "Could not reach the help assistant. Try again in a moment.";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  return { sendMessage, loading, error, clearError };
}
