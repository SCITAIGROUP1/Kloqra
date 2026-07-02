import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { z } from "zod";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { PrismaService } from "../../../../common/prisma/prisma.service";

const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPERADMIN", "SUPPORT"]),
  password: z.string().min(8)
});

@Controller("platform/staff")
@UseGuards(PlatformGuard)
export class PlatformStaffController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStaff(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Query("page") pageQuery?: string,
    @Query("limit") limitQuery?: string,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("isActive") isActiveQuery?: string
  ) {
    if (user.platformRole !== "SUPERADMIN") {
      throw new Error("Unauthorized");
    }

    const page = Math.max(1, parseInt(pageQuery || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(limitQuery || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.PlatformUserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } }
      ];
    }

    if (role) {
      where.role = role as any;
    }

    if (isActiveQuery !== undefined) {
      where.isActive = isActiveQuery === "true";
    }

    const [staff, total] = await Promise.all([
      this.prisma.platformUser.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      this.prisma.platformUser.count({ where })
    ]);

    return {
      items: staff.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  @Post()
  async createStaff(@CurrentPlatformUser() user: PlatformRequestUser, @Body() body: any) {
    if (user.platformRole !== "SUPERADMIN") {
      throw new Error("Unauthorized");
    }

    const parsed = createStaffSchema.parse(body);
    const existingUser = await this.prisma.platformUser.findUnique({
      where: { email: parsed.email }
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.password, salt);

    const newUser = await this.prisma.platformUser.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        role: parsed.role,
        passwordHash
      }
    });

    return { id: newUser.id, success: true };
  }

  @Delete(":id")
  async deleteStaff(@CurrentPlatformUser() user: PlatformRequestUser, @Param("id") id: string) {
    if (user.platformRole !== "SUPERADMIN") {
      throw new Error("Unauthorized");
    }

    if (user.platformUserId === id) {
      throw new Error("Cannot delete yourself");
    }

    await this.prisma.platformUser.delete({
      where: { id }
    });

    return { success: true };
  }
}
