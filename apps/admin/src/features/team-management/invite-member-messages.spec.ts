import { describe, expect, it } from "vitest";
import { inviteMemberSuccessMessage } from "./invite-member-messages";

describe("inviteMemberSuccessMessage", () => {
  it("includes the invited email address", () => {
    expect(inviteMemberSuccessMessage("alex@example.com")).toBe(
      "Team member created successfully. An invitation email has been sent to alex@example.com."
    );
  });
});
