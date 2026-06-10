import { describe, expect, it } from "vitest";
import { SEED_EMAIL_DOMAIN, SEED_USERS, SEED_WORKSPACES } from "./seed-data";

describe("seed-data", () => {
  it("uses kloqra.dev for all demo accounts", () => {
    for (const user of SEED_USERS) {
      expect(user.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)).toBe(true);
    }
  });

  it("includes Acme Corporation as the primary demo workspace", () => {
    expect(SEED_WORKSPACES[0]?.name).toBe("Acme Corporation");
    expect(SEED_WORKSPACES[0]?.slug).toBe("acme");
  });
});
