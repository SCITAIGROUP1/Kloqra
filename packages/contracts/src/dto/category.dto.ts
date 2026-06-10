import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema } from "./common.dto";

export const categorySchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  taskCount: z.number().int().nonnegative().optional()
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional()
});

export const listCategoriesQuerySchema = listPaginationQuerySchema;

export const listCategoriesResponseSchema = createPaginatedListResponseSchema(categorySchema);

export type CategoryDto = z.infer<typeof categorySchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type ListCategoriesResponse = z.infer<typeof listCategoriesResponseSchema>;
