import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import { AppModal } from "./app-modal.js";

describe("AppModal", () => {
  it("renders title, description, and body", () => {
    render(
      <AppModal
        open
        title="Create project"
        description="Add a project to organize work."
        icon={<Sparkles className="size-5" />}
        footer={<button type="button">Save</button>}
      >
        <p>Form content</p>
      </AppModal>
    );

    expect(screen.getByRole("heading", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByText("Add a project to organize work.")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
