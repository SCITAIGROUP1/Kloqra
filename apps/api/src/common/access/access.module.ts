import { Module } from "@nestjs/common";
import { AdminOrProjectManagerGuard } from "../guards/admin-or-project-manager.guard";
import { PrismaModule } from "../prisma/prisma.module";
import { ProjectAccessService } from "./project-access.service";

@Module({
  imports: [PrismaModule],
  providers: [ProjectAccessService, AdminOrProjectManagerGuard],
  exports: [ProjectAccessService, AdminOrProjectManagerGuard]
})
export class AccessModule {}
