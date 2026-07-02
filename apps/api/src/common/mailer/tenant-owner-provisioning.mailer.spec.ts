import { describe, expect, it, vi, beforeEach } from "vitest";
import { adminClientOrigin } from "./admin-origin.util";
import { TenantOwnerProvisioningMailer } from "./tenant-owner-provisioning.mailer";

describe("TenantOwnerProvisioningMailer", () => {
  let mailer: TenantOwnerProvisioningMailer;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue({ sent: true });
    mailer = new TenantOwnerProvisioningMailer({ send, isConfigured: true } as never);
  });

  it("sends tenant admin credentials to the admin portal", async () => {
    await mailer.sendTenantAdminCredentials({
      to: "admin@example.com",
      organizationName: "ABC",
      temporaryPassword: "TempPass123!",
      inviterName: "Kloqra Platform"
    });

    const adminLogin = `${adminClientOrigin()}/login`;
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("Organization admin access for ABC"),
        html: expect.stringContaining(adminLogin),
        text: expect.stringContaining("Sign in to Kloqra Admin")
      })
    );
    expect(send.mock.calls[0]?.[0]?.html).toContain("Kloqra Platform");
    expect(send.mock.calls[0]?.[0]?.html).not.toContain("localhost:3000");
  });

  it("sends tenant admin added notice to the admin portal", async () => {
    await mailer.sendTenantAdminAdded({
      to: "admin@example.com",
      organizationName: "ABC",
      inviterName: "Jordan Owner"
    });

    const adminLogin = `${adminClientOrigin()}/login`;
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        html: expect.stringContaining(adminLogin),
        text: expect.stringContaining("organization administrator")
      })
    );
  });
});
