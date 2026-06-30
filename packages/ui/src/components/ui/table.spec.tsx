import { render, screen } from "@testing-library/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

describe("Table", () => {
  it("renders table headers and cells", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Design review</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Design review" })).toBeInTheDocument();
  });
});
