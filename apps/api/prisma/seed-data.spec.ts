import { describe, expect, it } from "vitest";
import {
  SEED_ADMINS,
  SEED_EMAIL_DOMAIN,
  SEED_MEMBERS,
  SEED_USERS,
  SEED_WORKSPACES
} from "./seed-data";

describe("seed-data", () => {
  it("uses kloqra.dev for all demo accounts", () => {
    for (const user of SEED_USERS) {
      expect(user.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)).toBe(true);
    }
  });

  it("includes Softcodeit as the primary workspace", () => {
    expect(SEED_WORKSPACES[0]?.name).toBe("Softcodeit");
    expect(SEED_WORKSPACES[0]?.slug).toBe("softcodeit");
  });

  it("seeds one admin and one member by default", () => {
    expect(SEED_ADMINS).toHaveLength(1);
    expect(SEED_MEMBERS).toHaveLength(1);
    expect(SEED_USERS).toHaveLength(2);
    expect(SEED_ADMINS[0]?.email).toBe("admin@kloqra.dev");
    expect(SEED_MEMBERS[0]?.email).toBe("member@kloqra.dev");
  });
});
