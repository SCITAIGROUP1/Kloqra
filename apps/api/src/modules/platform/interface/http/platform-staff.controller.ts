import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { z } from "zod";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformSuperadminGuard } from "../../../../common/guards/platform-superadmin.guard";
import { PrismaService } from "../../../../common/prisma/prisma.service";

const createStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPERADMIN", "SUPPORT"]),
  password: z.string().min(8)
});

const updateStaffSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["SUPERADMIN", "SUPPORT"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

@Controller("platform/staff")
@UseGuards(PlatformSuperadminGuard)
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

  @Patch(":id")
  async updateStaff(
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Param("id") id: string,
    @Body() body: any
  ) {
    if (user.platformRole !== "SUPERADMIN") {
      throw new Error("Unauthorized");
    }

    const parsed = updateStaffSchema.parse(body);

    if (parsed.email) {
      const existingUser = await this.prisma.platformUser.findUnique({
        where: { email: parsed.email }
      });
      if (existingUser && existingUser.id !== id) {
        throw new Error("User with this email already exists");
      }
    }

    if (user.platformUserId === id) {
      if (parsed.isActive === false) {
        throw new Error("Cannot deactivate yourself");
      }
      if (parsed.role && parsed.role !== "SUPERADMIN") {
        throw new Error("Cannot demote yourself");
      }
    }

    const data: Prisma.PlatformUserUpdateInput = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.email !== undefined) data.email = parsed.email;
    if (parsed.role !== undefined) data.role = parsed.role;
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive;

    if (parsed.password) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(parsed.password, salt);
    }

    const updatedUser = await this.prisma.platformUser.update({
      where: { id },
      data
    });

    return { id: updatedUser.id, success: true };
  }
}
