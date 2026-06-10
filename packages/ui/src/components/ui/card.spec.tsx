import { render, screen } from "@testing-library/react";
import { Card, CardContent, CardHeader, CardTitle } from "./card.js";

describe("Card", () => {
  it("renders card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>Details</CardContent>
      </Card>
    );
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});
