import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const startTimerSchema = z.object({
  taskId: uuidSchema
});

export const stopTimerSchema = z.object({
  description: z.string().max(2000).optional(),
  isBillable: z.boolean().optional()
});

export const activeTimerSchema = z.object({
  userId: uuidSchema,
  workspaceId: uuidSchema,
  taskId: uuidSchema,
  startedAt: isoDatetimeSchema,
  elapsedSec: z.number().int().nonnegative(),
  isPaused: z.boolean().optional(),
  pausedAt: isoDatetimeSchema.nullable().optional(),
  accumulatedSec: z.number().int().nonnegative().optional()
});

export const pauseTimerSchema = z.object({});
export type PauseTimerDto = z.infer<typeof pauseTimerSchema>;

export const autoStoppedTimerSchema = z.object({
  autostopped: z.literal(true),
  stoppedAt: isoDatetimeSchema,
  durationSec: z.number().int().nonnegative()
});

export type StartTimerDto = z.infer<typeof startTimerSchema>;
export type StopTimerDto = z.infer<typeof stopTimerSchema>;
export type ActiveTimerDto = z.infer<typeof activeTimerSchema>;
export type AutoStoppedTimerDto = z.infer<typeof autoStoppedTimerSchema>;

export const activeTimerCountSchema = z.object({
  count: z.number().int().nonnegative(),
  members: z.array(
    z.object({
      userId: uuidSchema,
      userName: z.string(),
      projectName: z.string().nullable(),
      taskName: z.string().nullable()
    })
  )
});

export type ActiveTimerCountDto = z.infer<typeof activeTimerCountSchema>;
