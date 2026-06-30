import {
  ErrorCodes,
  parseWorkspaceSettings,
  type JiraIssuesResponseDto,
  type UpdateJiraCredentialsDto,
  type VerifyUserJiraDto,
  type VerifyUserJiraResponseDto,
  type VerifyWorkspaceJiraDto,
  type VerifyWorkspaceJiraResponseDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class JiraService {
  constructor(private prisma: PrismaService) {}

  async getMyIssues(userId: string, workspaceId: string): Promise<JiraIssuesResponseDto> {
    const [user, workspace] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { jiraEmail: true }
      }),
      this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { settings: true }
      })
    ]);

    const settings = parseWorkspaceSettings(workspace.settings);

    if (
      !user.jiraEmail ||
      !settings.jiraSiteUrl ||
      !settings.jiraServiceEmail ||
      !settings.jiraServiceToken
    ) {
      return { connected: false, issues: [] };
    }

    const auth = Buffer.from(`${settings.jiraServiceEmail}:${settings.jiraServiceToken}`).toString(
      "base64"
    );
    const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };

    // Jira Cloud GDPR mode requires accountId in JQL, not email.
    let assigneeClause = `assignee = "${user.jiraEmail}"`;
    try {
      const userRes = await fetch(
        `${settings.jiraSiteUrl}/rest/api/3/user/search?query=${encodeURIComponent(user.jiraEmail)}&maxResults=10`,
        { headers }
      );
      if (userRes.ok) {
        const users = (await userRes.json()) as {
          accountId: string;
          emailAddress?: string;
          active: boolean;
        }[];
        const match = users.find(
          (u) => u.active && u.emailAddress?.toLowerCase() === user.jiraEmail!.toLowerCase()
        );
        if (match) {
          assigneeClause = `assignee = "${match.accountId}"`;
        }
      }
    } catch {
      // Fall back to email-based assignee if lookup fails
    }

    const jql = `${assigneeClause} AND statusCategory = "In Progress" ORDER BY updated DESC`;

    let res: Response;
    try {
      res = await fetch(`${settings.jiraSiteUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ jql, fields: ["summary", "status"], maxResults: 50 })
      });
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Could not reach Jira — check the workspace Site URL",
        HttpStatus.BAD_GATEWAY
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        res.status === 401 || res.status === 403
          ? "Jira authentication failed — check the workspace service credentials"
          : `Jira returned ${res.status}: ${body.slice(0, 200)}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    const data = (await res.json()) as {
      issues?: {
        key: string;
        fields: { summary: string; status?: { statusCategory?: { name?: string } } };
      }[];
    };

    return {
      connected: true,
      issues: (data.issues ?? []).map((i) => ({
        key: i.key,
        summary: i.fields.summary,
        statusCategory: i.fields.status?.statusCategory?.name
      }))
    };
  }

  async verifyWorkspaceCredentials(
    workspaceId: string,
    dto: VerifyWorkspaceJiraDto
  ): Promise<VerifyWorkspaceJiraResponseDto> {
    let token = dto.jiraServiceToken;

    if (!token) {
      const workspace = await this.prisma.workspace.findUniqueOrThrow({
        where: { id: workspaceId },
        select: { settings: true }
      });
      const settings = parseWorkspaceSettings(workspace.settings);
      token = settings.jiraServiceToken;
    }

    if (!token) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No API token provided and no existing token saved for this workspace",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const auth = Buffer.from(`${dto.jiraServiceEmail}:${token}`).toString("base64");

    let res: Response;
    try {
      res = await fetch(`${dto.jiraSiteUrl}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" }
      });
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Could not reach Jira — check the Site URL",
        HttpStatus.BAD_GATEWAY
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Jira rejected the credentials — check the service account email and API token",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!res.ok) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Jira returned an unexpected error (${res.status})`,
        HttpStatus.BAD_GATEWAY
      );
    }

    const data = (await res.json()) as { displayName?: string };
    return { ok: true, displayName: data.displayName };
  }

  async verifyUserEmail(
    workspaceId: string,
    dto: VerifyUserJiraDto
  ): Promise<VerifyUserJiraResponseDto> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { settings: true }
    });
    const settings = parseWorkspaceSettings(workspace.settings);

    if (!settings.jiraSiteUrl || !settings.jiraServiceEmail || !settings.jiraServiceToken) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Jira is not configured for this workspace — ask your admin to set it up",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    const auth = Buffer.from(`${settings.jiraServiceEmail}:${settings.jiraServiceToken}`).toString(
      "base64"
    );
    const query = encodeURIComponent(dto.jiraEmail);

    let res: Response;
    try {
      res = await fetch(
        `${settings.jiraSiteUrl}/rest/api/3/user/search?query=${query}&maxResults=10`,
        { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } }
      );
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Could not reach Jira — workspace configuration may be incorrect",
        HttpStatus.BAD_GATEWAY
      );
    }

    if (!res.ok) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        res.status === 401
          ? "Jira authentication failed — contact your admin"
          : `Jira returned ${res.status}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    const users = (await res.json()) as {
      accountId: string;
      displayName: string;
      emailAddress?: string;
      active: boolean;
    }[];

    const match = users.find(
      (u) => u.active && u.emailAddress?.toLowerCase() === dto.jiraEmail.toLowerCase()
    );

    if (!match) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        `No active Jira user found with email "${dto.jiraEmail}"`,
        HttpStatus.NOT_FOUND
      );
    }

    return { ok: true, displayName: match.displayName, accountId: match.accountId };
  }

  async updateCredentials(userId: string, dto: UpdateJiraCredentialsDto): Promise<{ ok: boolean }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.jiraEmail !== undefined ? { jiraEmail: dto.jiraEmail } : {})
      }
    });
    return { ok: true };
  }
}
