import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TicketType } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class SubmitTicketDto {
  @ApiProperty({ enum: TicketType, description: "Type of support request" })
  @IsEnum(TicketType)
  ticketType: TicketType;

  @ApiProperty({ description: "Brief subject of the ticket" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: "Detailed description of the issue" })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ description: "Name of the person submitting the ticket" })
  @IsString()
  @IsNotEmpty()
  requesterName: string;

  @ApiProperty({ description: "Email address of the requester" })
  @IsEmail()
  requesterEmail: string;

  @ApiPropertyOptional({ description: "Optional tenant ID context" })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({
    description: "Type-specific extra fields (stepsToReproduce, invoiceId, etc.)",
    type: "object"
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
