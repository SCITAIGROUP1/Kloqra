import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { JiraService } from "./application/jira.service";
import { JiraController } from "./interface/http/jira.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [JiraController],
  providers: [JiraService]
})
export class JiraModule {}
