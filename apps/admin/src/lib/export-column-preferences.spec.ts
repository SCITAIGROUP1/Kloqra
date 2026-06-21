/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  defaultColumnsMap,
  loadExportColumnPreferences,
  mergeColumnPreferences,
  saveExportColumnPreferences
} from "./export-column-preferences";

const WORKSPACE_ID = "ws-column-prefs-test";

describe("export-column-preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(mergeColumnPreferences(null)).toEqual(defaultColumnsMap());
  });

  it("persists and restores column order per report type", () => {
    const columns = defaultColumnsMap();
    columns.time_entries = ["date", "hours", "project"];

    saveExportColumnPreferences(WORKSPACE_ID, columns);

    const stored = loadExportColumnPreferences(WORKSPACE_ID);
    expect(stored?.time_entries).toEqual(["date", "hours", "project"]);
    expect(mergeColumnPreferences(stored).time_entries).toEqual(["date", "hours", "project"]);
  });

  it("drops unknown column keys when merging stored preferences", () => {
    const merged = mergeColumnPreferences({
      time_entries: ["date", "not_a_real_column", "hours"]
    });
    expect(merged.time_entries).toEqual(["date", "hours"]);
  });
});
