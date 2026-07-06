import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema } from "./common.dto";

export const categorySchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  isActive: z.boolean(),
  taskCount: z.number().int().nonnegative().optional()
});

export const categoryListItemSchema = categorySchema.omit({ workspaceId: true });

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional()
});

export const listCategoriesQuerySchema = listPaginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional()
});

export const listCategoriesResponseSchema =
  createPaginatedListResponseSchema(categoryListItemSchema);

export const bulkCategoryImportItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional()
});

export const bulkCategoryImportSchema = z.object({
  categories: z.array(bulkCategoryImportItemSchema).min(1).max(500)
});

export const bulkCategoryImportResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  enqueuedCount: z.number().int().nonnegative()
});

export type CategoryDto = z.infer<typeof categorySchema>;
export type CategoryListItemDto = z.infer<typeof categoryListItemSchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type ListCategoriesResponse = z.infer<typeof listCategoriesResponseSchema>;
export type BulkCategoryImportItemDto = z.infer<typeof bulkCategoryImportItemSchema>;
export type BulkCategoryImportDto = z.infer<typeof bulkCategoryImportSchema>;
export type BulkCategoryImportResponseDto = z.infer<typeof bulkCategoryImportResponseSchema>;
