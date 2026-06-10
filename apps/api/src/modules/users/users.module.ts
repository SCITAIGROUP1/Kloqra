import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { Users2faService } from "./application/users-2fa.service";
import { UsersSessionsService } from "./application/users-sessions.service";
import { UsersService } from "./application/users.service";
import { UsersController } from "./interface/http/users.controller";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersSessionsService, Users2faService],
  exports: [UsersService, Users2faService]
})
export class UsersModule {}
