export function formatWidgetGroupTabLabel(label: string) {
  return label
    .replace(" Stat Cards", "")
    .replace(" Actions & Workflows", "")
    .replace(" Analytics", "")
    .replace(" & People", "")
    .replace(" & Trends", "");
}
