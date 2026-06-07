import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const presenceMemberSchema = z.object({
  userId: uuidSchema,
  userName: z.string(),
  taskId: uuidSchema,
  taskName: z.string(),
  projectName: z.string(),
  startedAt: isoDatetimeSchema,
  isPaused: z.boolean().optional()
});

export const presenceSnapshotSchema = z.object({
  members: z.array(presenceMemberSchema),
  updatedAt: isoDatetimeSchema
});

export type PresenceMemberDto = z.infer<typeof presenceMemberSchema>;
export type PresenceSnapshotDto = z.infer<typeof presenceSnapshotSchema>;
