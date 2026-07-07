/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useSessionStore: {
      getState: () => ({ session: { user: { id: "user-1" } } })
    }
  };
});

describe("onboarding-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("reads wizard completion from scoped JSON storage", async () => {
    const { markWizardDone, isWizardDone } = await import("./onboarding-storage");
    expect(isWizardDone()).toBe(false);
    markWizardDone();
    expect(isWizardDone()).toBe(true);
  });

  it("clears scoped onboarding flags for the signed-in user", async () => {
    const { markWizardDone, clearOnboardingStorage, isWizardDone } =
      await import("./onboarding-storage");
    markWizardDone();
    expect(isWizardDone()).toBe(true);
    clearOnboardingStorage();
    expect(isWizardDone()).toBe(false);
  });

  it("migrates legacy onboarding flags into scoped storage", async () => {
    localStorage.setItem("kloqra_onboarding_done", "true");
    const { isWizardDone } = await import("./onboarding-storage");
    expect(isWizardDone()).toBe(true);
    expect(localStorage.getItem("kloqra_onboarding_done")).toBeNull();
  });
});
