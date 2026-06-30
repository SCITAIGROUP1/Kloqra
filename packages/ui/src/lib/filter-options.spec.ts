import { filterOptionsByQuery, getOptionSearchText } from "./filter-options.js";

describe("filterOptionsByQuery", () => {
  const options = [
    { value: "1", label: "Alex Chen", keywords: "alex@example.com" },
    { value: "2", label: "Sam Rivera", keywords: "sam@example.com" }
  ];

  it("returns all options for empty query", () => {
    expect(filterOptionsByQuery(options, "")).toEqual(options);
  });

  it("filters by label", () => {
    expect(filterOptionsByQuery(options, "sam")).toEqual([options[1]]);
  });

  it("filters by keywords", () => {
    expect(filterOptionsByQuery(options, "alex@")).toEqual([options[0]]);
  });

  it("getOptionSearchText combines label and keywords", () => {
    expect(getOptionSearchText(options[0])).toBe("alex chen alex@example.com");
  });
});
