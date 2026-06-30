import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DonutChartCenter, DonutLegend } from "./donut-chart-center.js";

describe("DonutChartCenter", () => {
  it("renders center label and legend outside the chart frame", () => {
    render(
      <DonutChartCenter
        chart={<div data-testid="chart">chart</div>}
        center={<span>12:30</span>}
        legend={<DonutLegend items={[{ key: "a", label: "Dev", color: "#000" }]} />}
      />
    );

    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByText("12:30")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });
});
