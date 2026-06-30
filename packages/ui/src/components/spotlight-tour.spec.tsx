import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotlightTour, type SpotlightTourStep } from "./spotlight-tour.js";

const steps: SpotlightTourStep[] = [
  {
    target: '[data-tour="target-a"]',
    title: "First stop",
    body: "Description for first stop."
  },
  {
    target: '[data-tour="target-b"]',
    title: "Second stop",
    body: "Description for second stop."
  }
];

describe("SpotlightTour", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    Element.prototype.scrollIntoView = vi.fn();

    const targetA = document.createElement("div");
    targetA.setAttribute("data-tour", "target-a");
    targetA.style.cssText = "position:fixed;top:100px;left:100px;width:80px;height:40px;";
    document.body.appendChild(targetA);

    const targetB = document.createElement("div");
    targetB.setAttribute("data-tour", "target-b");
    targetB.style.cssText = "position:fixed;top:200px;left:100px;width:80px;height:40px;";
    document.body.appendChild(targetB);
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    document.querySelectorAll("[data-tour]").forEach((el) => el.remove());
  });

  it("renders first step when open", () => {
    render(<SpotlightTour steps={steps} open />);
    expect(screen.getByRole("dialog", { name: "First stop" })).toBeInTheDocument();
    expect(screen.getByText("Description for first stop.")).toBeInTheDocument();
    expect(screen.getByText("Tour · 1 of 2")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<SpotlightTour steps={steps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("advances to next step on Next click", async () => {
    const user = userEvent.setup();
    render(<SpotlightTour steps={steps} open />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Second stop" })).toBeInTheDocument();
    expect(screen.getByText("Tour · 2 of 2")).toBeInTheDocument();
  });

  it("calls onComplete when Done is clicked on last step", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SpotlightTour steps={steps} open onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onSkip when Skip tour is clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<SpotlightTour steps={steps} open onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("shows mobile hint in fallback mode when target is missing", () => {
    document.querySelectorAll("[data-tour]").forEach((el) => el.remove());
    const stepsWithHint: SpotlightTourStep[] = [
      {
        target: '[data-tour="missing"]',
        title: "Hidden target",
        body: "Body text.",
        mobileHint: "Find this in the navigation menu."
      }
    ];
    render(<SpotlightTour steps={stepsWithHint} open />);
    expect(screen.getByText("Find this in the navigation menu.")).toBeInTheDocument();
  });
});
