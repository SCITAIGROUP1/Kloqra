import { z } from "zod";
import { hexColorSchema } from "./common.dto";

export const userProjectColorHexSchema = hexColorSchema;

export const setUserProjectColorSchema = z.object({
  color: userProjectColorHexSchema
});

export type SetUserProjectColorDto = z.infer<typeof setUserProjectColorSchema>;

export type UserProjectColorParams = {
  projectId: string;
};
