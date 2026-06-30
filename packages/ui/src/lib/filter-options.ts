export type FilterableOption = {
  value: string;
  label: string;
  keywords?: string;
};

export function getOptionSearchText(option: FilterableOption): string {
  return `${option.label} ${option.keywords ?? ""}`.trim().toLowerCase();
}

export function filterOptionsByQuery<T extends FilterableOption>(
  options: T[],
  query: string,
  getSearchText: (option: T) => string = getOptionSearchText
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter((option) => getSearchText(option).toLowerCase().includes(normalized));
}
