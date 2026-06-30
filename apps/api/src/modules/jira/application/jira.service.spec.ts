import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { JiraService } from "./jira.service";

const baseWorkspace = {
  id: "ws-1",
  settings: {
    jiraSiteUrl: "https://acme.atlassian.net",
    jiraServiceEmail: "jira-bot@acme.com",
    jiraServiceToken: "ATATT3xtoken"
  }
};

const baseUser = { id: "user-1", jiraEmail: "alice@acme.com" };

describe("JiraService", () => {
  let service: JiraService;
  let mockPrisma: any;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPrisma = {
      user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
      workspace: { findUniqueOrThrow: vi.fn() }
    };
    service = new JiraService(mockPrisma);
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── getMyIssues ────────────────────────────────────────────────────────────

  describe("getMyIssues", () => {
    it("returns connected:false when user has no jiraEmail", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ jiraEmail: null });
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result).toEqual({ connected: false, issues: [] });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns connected:false when workspace has no jiraSiteUrl", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        settings: { jiraServiceEmail: "bot@acme.com", jiraServiceToken: "token" }
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result).toEqual({ connected: false, issues: [] });
    });

    it("returns connected:false when workspace has no jiraServiceToken", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        settings: { jiraSiteUrl: "https://acme.atlassian.net", jiraServiceEmail: "bot@acme.com" }
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result).toEqual({ connected: false, issues: [] });
    });

    it("returns issues when all credentials are set and Jira responds", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);

      // First fetch: user search (returns accountId)
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ accountId: "acc-123", emailAddress: "alice@acme.com", active: true }]
      });

      // Second fetch: JQL search
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "PROJ-1",
              fields: {
                summary: "Fix login bug",
                status: { statusCategory: { name: "In Progress" } }
              }
            }
          ]
        })
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result.connected).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({ key: "PROJ-1", summary: "Fix login bug" });
    });

    it("falls back to email-based assignee when user search fails", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);

      // First fetch: user search fails
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 400 });

      // Second fetch: JQL search succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ issues: [] })
      });

      const result = await service.getMyIssues("user-1", "ws-1");

      expect(result.connected).toBe(true);
      const jqlCall = fetchSpy.mock.calls[1];
      const body = JSON.parse(jqlCall[1].body);
      expect(body.jql).toContain("alice@acme.com");
    });

    it("throws BAD_GATEWAY when Jira is unreachable", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(baseUser);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);

      fetchSpy.mockResolvedValueOnce({ ok: false, status: 400 }); // user search
      fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED")); // JQL search

      await expect(service.getMyIssues("user-1", "ws-1")).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof DomainException && err.getStatus() === HttpStatus.BAD_GATEWAY
      );
    });
  });

  // ── verifyWorkspaceCredentials ─────────────────────────────────────────────

  describe("verifyWorkspaceCredentials", () => {
    const dto = {
      jiraSiteUrl: "https://acme.atlassian.net",
      jiraServiceEmail: "bot@acme.com",
      jiraServiceToken: "ATATT3xtoken"
    };

    it("returns displayName on successful verification", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ displayName: "Jira Bot" })
      });

      const result = await service.verifyWorkspaceCredentials("ws-1", dto);

      expect(result).toEqual({ ok: true, displayName: "Jira Bot" });
    });

    it("throws UNAUTHORIZED for 401 from Jira", async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 401 });

      await expect(service.verifyWorkspaceCredentials("ws-1", dto)).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof DomainException && err.getStatus() === HttpStatus.UNAUTHORIZED
      );
    });

    it("loads existing token from workspace when token not provided", async () => {
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ displayName: "Jira Bot" })
      });

      const result = await service.verifyWorkspaceCredentials("ws-1", {
        jiraSiteUrl: dto.jiraSiteUrl,
        jiraServiceEmail: dto.jiraServiceEmail
      });

      expect(result.ok).toBe(true);
    });

    it("throws when no token provided and none stored", async () => {
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ settings: {} });

      await expect(
        service.verifyWorkspaceCredentials("ws-1", {
          jiraSiteUrl: dto.jiraSiteUrl,
          jiraServiceEmail: dto.jiraServiceEmail
        })
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof DomainException && err.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY
      );
    });
  });

  // ── verifyUserEmail ────────────────────────────────────────────────────────

  describe("verifyUserEmail", () => {
    it("returns user info when email matches an active Jira user", async () => {
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            accountId: "acc-456",
            displayName: "Alice Smith",
            emailAddress: "alice@acme.com",
            active: true
          }
        ]
      });

      const result = await service.verifyUserEmail("ws-1", { jiraEmail: "alice@acme.com" });

      expect(result).toEqual({ ok: true, displayName: "Alice Smith", accountId: "acc-456" });
    });

    it("throws NOT_FOUND when email not in Jira", async () => {
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue(baseWorkspace);
      fetchSpy.mockResolvedValue({ ok: true, json: async () => [] });

      await expect(
        service.verifyUserEmail("ws-1", { jiraEmail: "nobody@acme.com" })
      ).rejects.toSatisfy(
        (err: unknown) => err instanceof DomainException && err.getStatus() === HttpStatus.NOT_FOUND
      );
    });

    it("throws when workspace has no Jira credentials", async () => {
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({ settings: {} });

      await expect(
        service.verifyUserEmail("ws-1", { jiraEmail: "alice@acme.com" })
      ).rejects.toSatisfy(
        (err: unknown) =>
          err instanceof DomainException && err.getStatus() === HttpStatus.UNPROCESSABLE_ENTITY
      );
    });
  });

  // ── updateCredentials ──────────────────────────────────────────────────────

  describe("updateCredentials", () => {
    it("saves jiraEmail to the user record", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateCredentials("user-1", { jiraEmail: "alice@acme.com" });

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { jiraEmail: "alice@acme.com" } })
      );
    });

    it("clears jiraEmail when null is passed", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateCredentials("user-1", { jiraEmail: null });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { jiraEmail: null } })
      );
    });

    it("does not update when jiraEmail is undefined", async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateCredentials("user-1", {});

      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
    });
  });
});
