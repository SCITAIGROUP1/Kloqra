import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema, queryUuidArraySchema } from "./common.dto";

export const taskAssigneeSchema = z.object({
  userId: uuidSchema,
  userName: z.string().min(1).max(120)
});

export const taskSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  categoryId: uuidSchema,
  categoryName: z.string().min(1).max(120).optional(),
  taskName: z.string().min(1).max(200),
  billableDefault: z.boolean(),
  isCommon: z.boolean(),
  assignees: z.array(taskAssigneeSchema)
});

export const taskListItemSchema = taskSchema.omit({ assignees: true });

export const createTaskSchema = z.object({
  projectId: uuidSchema,
  categoryId: uuidSchema,
  taskName: z.string().min(1).max(200),
  billableDefault: z.boolean().default(true),
  isCommon: z.boolean().default(true),
  assigneeUserIds: z.array(uuidSchema).default([])
});

export const updateTaskSchema = z.object({
  categoryId: uuidSchema.optional(),
  taskName: z.string().min(1).max(200).optional(),
  billableDefault: z.boolean().optional(),
  isCommon: z.boolean().optional(),
  assigneeUserIds: z.array(uuidSchema).optional()
});

export const listTasksQuerySchema = listPaginationQuerySchema.extend({
  projectId: queryUuidArraySchema,
  categoryId: uuidSchema.optional()
});

export const listTasksResponseSchema = createPaginatedListResponseSchema(taskListItemSchema);

export type TaskAssigneeDto = z.infer<typeof taskAssigneeSchema>;
export type TaskDto = z.infer<typeof taskSchema>;
export type TaskListItemDto = z.infer<typeof taskListItemSchema>;
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type ListTasksResponse = z.infer<typeof listTasksResponseSchema>;
