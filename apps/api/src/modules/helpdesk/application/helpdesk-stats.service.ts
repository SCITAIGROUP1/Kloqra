import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class HelpdeskStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement stats queries
}
