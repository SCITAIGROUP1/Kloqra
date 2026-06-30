import { z } from "zod";

export const assistantChatRoleSchema = z.enum(["user", "assistant"]);

export const assistantChatMessageSchema = z.object({
  role: assistantChatRoleSchema,
  content: z.string().min(1).max(2000)
});

export const assistantChatRequestSchema = z.object({
  messages: z.array(assistantChatMessageSchema).min(1).max(10)
});

export const assistantLinkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(200)
});

export const assistantChatResponseSchema = z.object({
  reply: z.string().min(1).max(4000),
  links: z.array(assistantLinkSchema).max(5).optional()
});

/** NestJS → Python internal payload (not exposed to client). */
export const assistantInternalChatRequestSchema = assistantChatRequestSchema.extend({
  userDisplayName: z.string().max(120).optional()
});

export type AssistantChatMessageDto = z.infer<typeof assistantChatMessageSchema>;
export type AssistantChatRequestDto = z.infer<typeof assistantChatRequestSchema>;
export type AssistantLinkDto = z.infer<typeof assistantLinkSchema>;
export type AssistantChatResponseDto = z.infer<typeof assistantChatResponseSchema>;
export type AssistantInternalChatRequestDto = z.infer<typeof assistantInternalChatRequestSchema>;
