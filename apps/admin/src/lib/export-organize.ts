import type { ExportBodyDto, ExportGroupByDimension, ExportSheetLayout } from "@kloqra/contracts";

export type ExportOrganizePreset =
  | "person_sheets_chronological"
  | "person_sheets_by_project"
  | "one_file_by_person"
  | "one_file_by_project"
  | "one_file_by_client"
  | "client_sheets_chronological"
  | "project_sheets_chronological"
  | "summary_by_hours"
  | "summary_alphabetical";

export type ExportScenarioId =
  | "payroll"
  | "client_billing"
  | "project_review"
  | "team_summary"
  | "missing_time"
  | "capacity"
  | "approval_status";

type PresetMeta = {
  sheetLayout: ExportSheetLayout;
  groupBy: ExportGroupByDimension[];
  label: string;
  description: string;
};

const PRESETS: Record<ExportOrganizePreset, PresetMeta> = {
  person_sheets_chronological: {
    sheetLayout: "tabs_per_member",
    groupBy: ["member", "day"],
    label: "Each person on their own sheet",
    description:
      "Each team member gets their own sheet. Days are listed in order, starting with the earliest."
  },
  person_sheets_by_project: {
    sheetLayout: "tabs_per_member",
    groupBy: ["member", "project", "day"],
    label: "Each person on their own sheet, grouped by project",
    description:
      "Each person gets their own sheet. Projects are grouped inside, with days listed in date order."
  },
  one_file_by_person: {
    sheetLayout: "standard",
    groupBy: ["member", "day"],
    label: "Everyone in one file, grouped by person",
    description:
      "One workbook with sections per person. Days are listed oldest to newest within each section."
  },
  one_file_by_project: {
    sheetLayout: "standard",
    groupBy: ["project", "member"],
    label: "Everyone in one file, grouped by project",
    description:
      "One workbook with sections per project. Team members are listed inside each project."
  },
  one_file_by_client: {
    sheetLayout: "standard",
    groupBy: ["client", "project"],
    label: "Everyone in one file, grouped by client",
    description: "One workbook with sections per client. Projects are listed under each client."
  },
  client_sheets_chronological: {
    sheetLayout: "tabs_per_client",
    groupBy: ["client", "project"],
    label: "Each client on their own sheet",
    description:
      "Each client gets their own sheet. Projects are listed underneath, with days in date order."
  },
  project_sheets_chronological: {
    sheetLayout: "tabs_per_project",
    groupBy: ["project", "member"],
    label: "Each project on their own sheet",
    description:
      "Each project gets its own sheet. Team members are listed inside, with days in date order."
  },
  summary_by_hours: {
    sheetLayout: "standard",
    groupBy: ["member"],
    label: "Summary sorted by hours",
    description: "Everyone in one file. People with the most hours appear first."
  },
  summary_alphabetical: {
    sheetLayout: "standard",
    groupBy: [],
    label: "Summary sorted alphabetically",
    description: "Everyone in one file. People are listed A to Z by name."
  }
};

const SCENARIO_ORGANIZE_OPTIONS: Record<ExportScenarioId, ExportOrganizePreset[]> = {
  payroll: ["person_sheets_chronological", "one_file_by_person", "person_sheets_by_project"],
  client_billing: ["client_sheets_chronological", "one_file_by_client"],
  project_review: ["project_sheets_chronological", "one_file_by_project"],
  team_summary: ["summary_by_hours", "one_file_by_person", "summary_alphabetical"],
  missing_time: ["summary_alphabetical", "one_file_by_person"],
  capacity: ["one_file_by_person", "summary_by_hours"],
  approval_status: ["summary_alphabetical", "one_file_by_person"]
};

export type AppliedOrganizePreset = {
  sheetLayout: ExportSheetLayout;
  groupBy: ExportGroupByDimension[];
};

export function applyOrganizePreset(preset: ExportOrganizePreset): AppliedOrganizePreset {
  const meta = PRESETS[preset];
  return {
    sheetLayout: meta.sheetLayout,
    groupBy: [...meta.groupBy]
  };
}

export function getOrganizePresetLabel(preset: ExportOrganizePreset): string {
  return PRESETS[preset].label;
}

export function getOrganizePresetDescription(preset: ExportOrganizePreset): string {
  return PRESETS[preset].description;
}

function groupByKey(groupBy: ExportGroupByDimension[]): string {
  return groupBy.join(",");
}

export function organizePresetFromBody(
  body: Pick<ExportBodyDto, "sheetLayout" | "groupBy">
): ExportOrganizePreset | null {
  const layout = body.sheetLayout ?? "standard";
  const groupBy = Array.isArray(body.groupBy) ? body.groupBy : [];
  const key = `${layout}:${groupByKey(groupBy)}`;

  const entries = Object.entries(PRESETS) as [ExportOrganizePreset, PresetMeta][];
  for (const [preset, meta] of entries) {
    if (`${meta.sheetLayout}:${groupByKey(meta.groupBy)}` === key) {
      return preset;
    }
  }
  return null;
}

export function describeOrganize(
  input: ExportOrganizePreset | Pick<ExportBodyDto, "sheetLayout" | "groupBy">
): string {
  if (typeof input === "string") {
    return PRESETS[input].description;
  }
  const preset = organizePresetFromBody(input);
  if (preset) return PRESETS[preset].description;
  const layout = input.sheetLayout ?? "standard";
  if (layout === "tabs_per_member") {
    return "Each team member gets their own sheet.";
  }
  if (layout === "tabs_per_project") {
    return "Each project gets its own sheet.";
  }
  if (layout === "tabs_per_client") {
    return "Each client gets their own sheet.";
  }
  if (layout === "tabs_per_category") {
    return "Each category gets its own sheet.";
  }
  return "Standard workbook with one tab per report type.";
}

export function organizeOptionsForScenario(scenarioId: ExportScenarioId): ExportOrganizePreset[] {
  return [...SCENARIO_ORGANIZE_OPTIONS[scenarioId]];
}
