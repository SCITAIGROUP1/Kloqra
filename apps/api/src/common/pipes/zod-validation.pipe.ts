import { ErrorCodes } from "@kloqra/contracts";
import { type PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        details: result.error.flatten()
      });
    }
    return result.data;
  }
}
