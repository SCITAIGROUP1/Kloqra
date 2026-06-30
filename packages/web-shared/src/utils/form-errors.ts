"use client";

export type FieldErrorMap<TField extends string> = Partial<Record<TField, string>>;

export function extractFieldErrorsFromMessage<TField extends string>(
  message: string,
  labelMap: Record<TField, string | string[]>
): {
  fieldErrors: FieldErrorMap<TField>;
  formError: string;
} {
  const [baseMessage = "", ...detailParts] = message.split(" — ");
  const details = detailParts
    .flatMap((part) => part.split(";"))
    .map((part) => part.trim())
    .filter(Boolean);

  const fieldErrors: FieldErrorMap<TField> = {};
  const unmatched: string[] = [];

  for (const detail of details) {
    const loweredDetail = detail.toLowerCase();
    let matchedField: TField | null = null;

    for (const [field, labels] of Object.entries(labelMap) as Array<[TField, string | string[]]>) {
      const candidates = Array.isArray(labels) ? labels : [labels];
      const didMatch = candidates.some((label) => loweredDetail.startsWith(label.toLowerCase()));
      if (!didMatch) continue;
      matchedField = field;
      if (!fieldErrors[field]) {
        fieldErrors[field] = detail;
      }
      break;
    }

    if (!matchedField) {
      unmatched.push(detail);
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const normalizedBase = baseMessage.trim();
  const shouldSuppressValidationBase =
    hasFieldErrors && normalizedBase.toLowerCase() === "validation failed";

  const formErrorParts = [shouldSuppressValidationBase ? "" : normalizedBase, ...unmatched].filter(
    Boolean
  );

  return {
    fieldErrors,
    formError: formErrorParts.join(" — ")
  };
}
