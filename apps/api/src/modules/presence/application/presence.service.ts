import { Injectable } from "@nestjs/common";
import { type Request, type Response } from "express";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

const SSE_SNAPSHOT_DEBOUNCE_MS = 1000;

@Injectable()
export class PresenceService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async snapshot(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });

    const active: {
      userId: string;
      userName: string;
      taskId: string;
      taskName: string;
      projectName: string;
      startedAt: string;
      isPaused: boolean;
    }[] = [];

    const taskIds = new Set<string>();
    const timerStates: {
      userId: string;
      userName: string;
      taskId: string;
      startedAt: string;
      isPaused: boolean;
    }[] = [];

    for (const m of members) {
      const raw = await this.redis.getClient().get(`timer:${workspaceId}:${m.userId}`);
      if (!raw) continue;
      const state = JSON.parse(raw) as { taskId: string; startedAt: string; isPaused?: boolean };
      taskIds.add(state.taskId);
      timerStates.push({
        userId: m.userId,
        userName: m.user.name,
        taskId: state.taskId,
        startedAt: state.startedAt,
        isPaused: state.isPaused ?? false
      });
    }

    const tasks =
      taskIds.size > 0
        ? await this.prisma.task.findMany({
            where: { id: { in: [...taskIds] } },
            include: { project: true }
          })
        : [];
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    for (const state of timerStates) {
      const task = taskById.get(state.taskId);
      if (!task) continue;
      active.push({
        userId: state.userId,
        userName: state.userName,
        taskId: task.id,
        taskName: task.taskName,
        projectName: task.project.name,
        startedAt: state.startedAt,
        isPaused: state.isPaused
      });
    }

    return {
      members: active,
      updatedAt: new Date().toISOString()
    };
  }

  async streamSse(workspaceId: string, req: Request, res: Response): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const send = async () => {
      const snapshot = await this.snapshot(workspaceId);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    };

    const scheduleSend = () => {
      pending = true;
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (!pending) return;
        pending = false;
        void send();
      }, SSE_SNAPSHOT_DEBOUNCE_MS);
    };

    await send();
    const sub = this.redis.getClient().duplicate();
    await sub.subscribe(`presence:${workspaceId}`);
    sub.on("message", () => scheduleSend());

    req.on("close", () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void sub.unsubscribe();
      void sub.quit();
      res.end();
    });
  }
}
