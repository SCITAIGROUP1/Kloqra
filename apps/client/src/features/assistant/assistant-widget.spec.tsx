/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssistantProvider,
  useAssistant,
  useSuppressAssistantLauncher
} from "./assistant-provider";
import { ASSISTANT_FEEDBACK_STORAGE_KEY, ASSISTANT_TURNS_STORAGE_KEY } from "./assistant-storage";
import { AssistantWidget } from "./assistant-widget";

const mockSendMessage = vi.fn().mockResolvedValue({
  reply: "Open Timer and click Start.",
  links: [{ label: "Timer", href: "/timer" }]
});

vi.mock("./use-assistant-chat", () => ({
  useAssistantChat: () => ({
    loading: false,
    error: null,
    clearError: vi.fn(),
    sendMessage: mockSendMessage
  })
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/timer"
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: { user: { firstName: string } } }) => unknown) =>
    selector({ session: { user: { firstName: "Sam" } } })
}));

function OpenAssistantOnMount() {
  const { openAssistant } = useAssistant();
  useEffect(() => {
    openAssistant();
  }, [openAssistant]);
  return <AssistantWidget />;
}

describe("AssistantWidget", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockSendMessage.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  function getDialog() {
    return screen.getAllByRole("dialog", { name: "Help assistant" })[0]!;
  }

  it("shows FAB when collapsed", () => {
    render(
      <AssistantProvider>
        <AssistantWidget />
      </AssistantProvider>
    );

    expect(screen.getByRole("button", { name: "Open help assistant" })).toBeTruthy();
  });

  it("hides FAB while launcher suppression is active", () => {
    function SuppressLauncher() {
      useSuppressAssistantLauncher(true);
      return null;
    }

    render(
      <AssistantProvider>
        <SuppressLauncher />
        <AssistantWidget />
      </AssistantProvider>
    );

    const fab = screen.getByLabelText("Open help assistant", { selector: "button" });
    expect(fab.getAttribute("aria-hidden")).toBe("true");
    expect(fab.className).toContain("opacity-0");
  });

  it("renders contextual starter prompts when expanded on timer route", () => {
    render(
      <AssistantProvider>
        <OpenAssistantOnMount />
      </AssistantProvider>
    );

    expect(screen.getByRole("dialog", { name: "Help assistant" })).toBeTruthy();
    expect(screen.getByText(/Hi Sam!/i)).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "How do I start a timer?" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Why can't I edit this entry?" }).length
    ).toBeGreaterThan(0);
  });

  it("shows assistant reply after sending a message", async () => {
    render(
      <AssistantProvider>
        <OpenAssistantOnMount />
      </AssistantProvider>
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "How do I start a timer?" }).length
      ).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole("button", { name: "How do I start a timer?" })[0]!);

    await waitFor(() => {
      expect(screen.getByText(/Open Timer and click Start/i)).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: "Timer" }).getAttribute("href")).toBe("/timer");
  });

  it("minimizes and closes from header controls", () => {
    render(
      <AssistantProvider>
        <OpenAssistantOnMount />
      </AssistantProvider>
    );

    const dialog = getDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Minimize help assistant" }));
    expect(within(dialog).queryByLabelText("Assistant message")).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Expand help assistant" }));
    expect(within(dialog).getByLabelText("Assistant message")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close help assistant" }));
    expect(screen.queryByRole("dialog", { name: "Help assistant" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open help assistant" })).toBeTruthy();
  });

  it("clears conversation on new chat", async () => {
    render(
      <AssistantProvider>
        <OpenAssistantOnMount />
      </AssistantProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "How do I start a timer?" })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Open Timer and click Start/i)).toBeTruthy();
    });

    fireEvent.click(within(getDialog()).getByRole("button", { name: "Start new chat" }));
    expect(screen.queryByText(/Open Timer and click Start/i)).toBeNull();
    expect(sessionStorage.getItem(ASSISTANT_TURNS_STORAGE_KEY)).toBeNull();
  });

  it("stores feedback in session storage", async () => {
    render(
      <AssistantProvider>
        <OpenAssistantOnMount />
      </AssistantProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "How do I start a timer?" })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Open Timer and click Start/i)).toBeTruthy();
    });

    fireEvent.click(within(getDialog()).getByRole("button", { name: "Helpful response" }));

    await waitFor(() => {
      const raw = sessionStorage.getItem(ASSISTANT_FEEDBACK_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(raw).toContain('"helpful":true');
    });
  });
});
