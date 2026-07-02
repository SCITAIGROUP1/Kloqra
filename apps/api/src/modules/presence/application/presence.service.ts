import { Injectable } from "@nestjs/common";
import { type Request, type Response } from "express";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";
import { timerKey } from "../../../common/redis/timer-keys";

const SSE_SNAPSHOT_DEBOUNCE_MS = 1000;

@Injectable()
export class PresenceService {
  private pools = new Map<
    string,
    {
      sub: any;
      listeners: Set<() => void>;
    }
  >();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  private async subscribeWorkspace(
    workspaceId: string,
    onMessage: () => void
  ): Promise<{ unsubscribe: () => Promise<void> }> {
    let pool = this.pools.get(workspaceId);
    if (!pool) {
      const sub = this.redis.getClient().duplicate();
      await sub.subscribe(`presence:${workspaceId}`);
      const listeners = new Set<() => void>();
      sub.on("message", () => {
        for (const listener of listeners) {
          listener();
        }
      });
      pool = { sub, listeners };
      this.pools.set(workspaceId, pool);
    }
    pool.listeners.add(onMessage);

    return {
      unsubscribe: async () => {
        pool.listeners.delete(onMessage);
        if (pool.listeners.size === 0) {
          this.pools.delete(workspaceId);
          try {
            await pool.sub.unsubscribe(`presence:${workspaceId}`);
            await pool.sub.quit();
          } catch {
            // ignore
          }
        }
      }
    };
  }

  async snapshot(
    workspaceId: string,
    userId?: string,
    role?: "ADMIN" | "MEMBER",
    managedProjectIds?: string[]
  ) {
    const scopedUserIds =
      role === "MEMBER" && managedProjectIds && managedProjectIds.length > 0
        ? await this.teamUserIdsForProjects(workspaceId, managedProjectIds)
        : undefined;

    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        ...(scopedUserIds ? { userId: { in: scopedUserIds } } : {})
      },
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

    if (members.length === 0) {
      return { members: [], updatedAt: new Date().toISOString() };
    }

    const keys = members.map((m) => timerKey(workspaceId, m.userId));
    const rawValues = await this.redis.getClient().mget(...keys);

    for (let i = 0; i < members.length; i++) {
      const raw = rawValues[i];
      if (!raw) continue;
      const m = members[i];
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
            where: {
              id: { in: [...taskIds] },
              ...(managedProjectIds && managedProjectIds.length > 0 && role === "MEMBER"
                ? { projectId: { in: managedProjectIds } }
                : {})
            },
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

  private async teamUserIdsForProjects(workspaceId: string, projectIds: string[]) {
    const rows = await this.prisma.teamMember.findMany({
      where: {
        isActive: true,
        team: { project: { workspaceId, id: { in: projectIds } } }
      },
      select: { userId: true }
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  async streamSse(
    workspaceId: string,
    req: Request,
    res: Response,
    userId?: string,
    role?: "ADMIN" | "MEMBER",
    managedProjectIds?: string[]
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const send = async () => {
      const snapshot = await this.snapshot(workspaceId, userId, role, managedProjectIds);
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
    const { unsubscribe } = await this.subscribeWorkspace(workspaceId, () => scheduleSend());

    req.on("close", async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      await unsubscribe();
      res.end();
    });
  }
}
