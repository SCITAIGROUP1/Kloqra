import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CategoriesService } from "./application/categories.service";
import { CategoriesController } from "./interface/http/categories.controller";

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService]
})
export class CategoriesModule {}
