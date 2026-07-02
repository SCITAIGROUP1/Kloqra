import type { ErrorCode } from "@kloqra/contracts";
import { HttpException, HttpStatus } from "@nestjs/common";

export class DomainException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown
  ) {
    super(details === undefined ? { code, message } : { code, message, details }, status);
  }
}
