import { z } from "zod";
import { uuidSchema } from "./common.dto";

export const taskSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  categoryId: uuidSchema,
  categoryName: z.string().min(1).max(120).optional(),
  taskName: z.string().min(1).max(200),
  billableDefault: z.boolean()
});

export const createTaskSchema = z.object({
  projectId: uuidSchema,
  categoryId: uuidSchema,
  taskName: z.string().min(1).max(200),
  billableDefault: z.boolean().default(true)
});

export const updateTaskSchema = z.object({
  categoryId: uuidSchema.optional(),
  taskName: z.string().min(1).max(200).optional(),
  billableDefault: z.boolean().optional()
});

export const listTasksQuerySchema = z.object({
  projectId: uuidSchema.optional(),
  categoryId: uuidSchema.optional()
});

export type TaskDto = z.infer<typeof taskSchema>;
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
