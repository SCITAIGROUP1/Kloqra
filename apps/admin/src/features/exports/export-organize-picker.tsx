"use client";

import type { ExportGroupByDimension, ExportSheetLayout } from "@kloqra/contracts";
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kloqra/ui";
import { GROUP_BY_DIMENSION_OPTIONS } from "@/lib/export-group-by";
import type { ExportOrganizePreset, ExportScenarioId } from "@/lib/export-organize";
import {
  applyOrganizePreset,
  describeOrganize,
  getOrganizePresetDescription,
  getOrganizePresetLabel,
  organizeOptionsForScenario,
  organizePresetFromBody
} from "@/lib/export-organize";
import { groupByForSheetLayout, SHEET_LAYOUT_OPTIONS } from "@/lib/export-sheet-layout";

const READING_ORDER_PRIMARY: ExportGroupByDimension[] = [
  "member",
  "project",
  "client",
  "day",
  "week",
  "category"
];

function secondaryOptionsForPrimary(
  primary: ExportGroupByDimension | undefined
): ExportGroupByDimension[] {
  if (!primary) return [];
  const all: ExportGroupByDimension[] = [
    "member",
    "project",
    "client",
    "day",
    "week",
    "category",
    "task"
  ];
  return all.filter((d) => d !== primary);
}

type QuickProps = {
  mode: "quick";
  scenarioId: ExportScenarioId;
  value: ExportOrganizePreset;
  onChange: (preset: ExportOrganizePreset) => void;
};

type CustomProps = {
  mode: "custom";
  sheetLayout: ExportSheetLayout;
  groupBy: ExportGroupByDimension[];
  onSheetLayoutChange: (layout: ExportSheetLayout) => void;
  onGroupByChange: (groupBy: ExportGroupByDimension[]) => void;
};

export type ExportOrganizePickerProps = QuickProps | CustomProps;

export function ExportOrganizePicker(props: ExportOrganizePickerProps) {
  if (props.mode === "quick") {
    return <QuickOrganizePicker {...props} />;
  }
  return <CustomOrganizePicker {...props} />;
}

function QuickOrganizePicker({ scenarioId, value, onChange }: QuickProps) {
  const options = organizeOptionsForScenario(scenarioId);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">How should the file be organized?</p>
      <div className="space-y-2">
        {options.map((preset) => (
          <label
            key={preset}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
              value === preset
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              name="organize-preset"
              className="mt-1"
              checked={value === preset}
              onChange={() => onChange(preset)}
            />
            <span>
              <span className="text-sm font-medium">{getOrganizePresetLabel(preset)}</span>
              <span className="mt-1 block text-xs text-muted-foreground leading-relaxed">
                {getOrganizePresetDescription(preset)}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{describeOrganize(value)}</p>
    </div>
  );
}

function CustomOrganizePicker({
  sheetLayout,
  groupBy,
  onSheetLayoutChange,
  onGroupByChange
}: CustomProps) {
  const safeGroupBy = Array.isArray(groupBy) ? groupBy : [];
  const primary = safeGroupBy[0];
  const secondary = safeGroupBy[1] ?? "";

  const layoutLabel =
    SHEET_LAYOUT_OPTIONS.find((o) => o.id === sheetLayout)?.label ?? "Standard Workbook";

  function onFileStructureChange(layout: ExportSheetLayout) {
    onSheetLayoutChange(layout);
  }

  function onPrimaryChange(dim: string) {
    if (dim === "__none__") {
      onGroupByChange(groupByForSheetLayout(sheetLayout, safeGroupBy.slice(1)));
      return;
    }
    const nextDim = dim as ExportGroupByDimension;
    const extras = safeGroupBy.slice(1).filter((d) => d !== nextDim);
    onGroupByChange(groupByForSheetLayout(sheetLayout, [nextDim, ...extras]));
  }

  function onSecondaryChange(dim: string) {
    const base = primary ? [primary] : [];
    const nextSecondary = dim === "__none__" ? [] : ([dim] as ExportGroupByDimension[]);
    onGroupByChange(groupByForSheetLayout(sheetLayout, [...base, ...nextSecondary]));
  }

  const showReadingOrder = sheetLayout === "standard";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">File structure</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SHEET_LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFileStructureChange(opt.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                sheetLayout === opt.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <p className="text-sm font-medium">{opt.label}</p>
            </button>
          ))}
        </div>
      </div>

      {showReadingOrder ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Group first by</Label>
            <Select value={primary ?? "__none__"} onValueChange={onPrimaryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose grouping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {READING_ORDER_PRIMARY.map((dim) => (
                  <SelectItem key={dim} value={dim}>
                    {GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === dim)?.label ?? dim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Then by (optional)</Label>
            <Select
              value={secondary || "__none__"}
              onValueChange={onSecondaryChange}
              disabled={!primary}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {secondaryOptionsForPrimary(primary).map((dim) => (
                  <SelectItem key={dim} value={dim}>
                    {GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === dim)?.label ?? dim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {layoutLabel} — inner rows follow the layout&apos;s default grouping.
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        {describeOrganize({ sheetLayout, groupBy: safeGroupBy })}
      </p>
    </div>
  );
}

export function organizePresetToCustomState(preset: ExportOrganizePreset): {
  sheetLayout: ExportSheetLayout;
  groupBy: ExportGroupByDimension[];
} {
  return applyOrganizePreset(preset);
}

export function customStateToOrganizePreset(
  sheetLayout: ExportSheetLayout,
  groupBy: ExportGroupByDimension[]
): ExportOrganizePreset | null {
  return organizePresetFromBody({ sheetLayout, groupBy });
}
