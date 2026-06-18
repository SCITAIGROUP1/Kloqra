import { z } from "zod";

export const jiraIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  statusCategory: z.string().optional()
});

export const jiraIssuesResponseSchema = z.object({
  connected: z.boolean(),
  issues: z.array(jiraIssueSchema)
});

export const updateJiraCredentialsSchema = z.object({
  jiraEmail: z.string().email().nullable().optional()
});

export const verifyWorkspaceJiraSchema = z.object({
  jiraSiteUrl: z.string().url(),
  jiraServiceEmail: z.string().email(),
  jiraServiceToken: z.string().max(500).optional()
});

export const verifyWorkspaceJiraResponseSchema = z.object({
  ok: z.boolean(),
  displayName: z.string().optional()
});

export const verifyUserJiraSchema = z.object({
  jiraEmail: z.string().email()
});

export const verifyUserJiraResponseSchema = z.object({
  ok: z.boolean(),
  displayName: z.string(),
  accountId: z.string()
});

export type JiraIssueDto = z.infer<typeof jiraIssueSchema>;
export type JiraIssuesResponseDto = z.infer<typeof jiraIssuesResponseSchema>;
export type UpdateJiraCredentialsDto = z.infer<typeof updateJiraCredentialsSchema>;
export type VerifyWorkspaceJiraDto = z.infer<typeof verifyWorkspaceJiraSchema>;
export type VerifyWorkspaceJiraResponseDto = z.infer<typeof verifyWorkspaceJiraResponseSchema>;
export type VerifyUserJiraDto = z.infer<typeof verifyUserJiraSchema>;
export type VerifyUserJiraResponseDto = z.infer<typeof verifyUserJiraResponseSchema>;
