"use client";

import * as React from "react";
import { cn } from "../../lib/utils.js";
import { Input } from "./input.js";
import { SearchableSelect, type SearchableSelectOption } from "./searchable-select.js";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" }
];

export function getCountryFromTimezone(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (
        tz.includes("New_York") ||
        tz.includes("Chicago") ||
        tz.includes("Los_Angeles") ||
        tz.includes("Denver")
      ) {
        return COUNTRIES.find((c) => c.code === "US")!;
      }
      if (tz.includes("Colombo")) {
        return COUNTRIES.find((c) => c.code === "LK")!;
      }
      if (tz.includes("London")) {
        return COUNTRIES.find((c) => c.code === "GB")!;
      }
      if (tz.includes("Toronto") || tz.includes("Vancouver")) {
        return COUNTRIES.find((c) => c.code === "CA")!;
      }
      if (tz.includes("Sydney") || tz.includes("Melbourne")) {
        return COUNTRIES.find((c) => c.code === "AU")!;
      }
      if (tz.includes("Kolkata") || tz.includes("India")) {
        return COUNTRIES.find((c) => c.code === "IN")!;
      }
      if (tz.includes("Berlin")) {
        return COUNTRIES.find((c) => c.code === "DE")!;
      }
      if (tz.includes("Paris")) {
        return COUNTRIES.find((c) => c.code === "FR")!;
      }
      if (tz.includes("Madrid")) {
        return COUNTRIES.find((c) => c.code === "ES")!;
      }
      if (tz.includes("Singapore")) {
        return COUNTRIES.find((c) => c.code === "SG")!;
      }
      if (tz.includes("Tokyo")) {
        return COUNTRIES.find((c) => c.code === "JP")!;
      }
    }
  } catch {
    // Ignore timezone resolution error
  }

  try {
    const lang = navigator.language;
    if (lang) {
      if (lang.endsWith("US")) return COUNTRIES.find((c) => c.code === "US")!;
      if (lang.endsWith("GB")) return COUNTRIES.find((c) => c.code === "GB")!;
      if (lang.endsWith("LK")) return COUNTRIES.find((c) => c.code === "LK")!;
      if (lang.endsWith("IN")) return COUNTRIES.find((c) => c.code === "IN")!;
      if (lang.endsWith("CA")) return COUNTRIES.find((c) => c.code === "CA")!;
      if (lang.endsWith("AU")) return COUNTRIES.find((c) => c.code === "AU")!;
    }
  } catch {
    // Ignore language resolution error
  }

  return COUNTRIES[0]!;
}

export function parsePhoneNumber(phone: string | null | undefined): {
  country: Country;
  nationalNumber: string;
} {
  if (!phone) {
    const defaultCountry = getCountryFromTimezone();
    return { country: defaultCountry, nationalNumber: "" };
  }

  let bestMatch = COUNTRIES[0]!;
  let longestMatchLen = 0;

  for (const c of COUNTRIES) {
    if (phone.startsWith(c.dialCode)) {
      if (c.dialCode.length > longestMatchLen) {
        longestMatchLen = c.dialCode.length;
        bestMatch = c;
      }
    }
  }

  const nationalNumber = longestMatchLen > 0 ? phone.slice(longestMatchLen) : phone;
  return { country: bestMatch, nationalNumber };
}

export interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  disabled = false,
  className
}: CountryPhoneInputProps) {
  const { nationalNumber } = React.useMemo(() => parsePhoneNumber(value), [value]);

  const [selectedCountry, setSelectedCountry] = React.useState<Country>(() => {
    return parsePhoneNumber(value).country;
  });

  // Keep selected country in sync if external value changes to a non-empty string
  React.useEffect(() => {
    if (value) {
      setSelectedCountry(parsePhoneNumber(value).country);
    }
  }, [value]);

  const selectOptions = React.useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: `${c.flag} ${c.dialCode}`,
        searchText: `${c.name} ${c.dialCode} ${c.code}`
      })),
    []
  );

  function handleCountryChange(code: string) {
    const nextCountry = COUNTRIES.find((c) => c.code === code);
    if (nextCountry) {
      setSelectedCountry(nextCountry);
      const cleanNational = nationalNumber.replace(/\D/g, "");
      if (cleanNational) {
        onChange(`${nextCountry.dialCode}${cleanNational}`);
      } else {
        onChange("");
      }
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanNational = e.target.value.replace(/\D/g, "");
    if (cleanNational) {
      onChange(`${selectedCountry.dialCode}${cleanNational}`);
    } else {
      onChange("");
    }
  }

  const renderOption = React.useCallback((opt: SearchableSelectOption) => {
    const c = COUNTRIES.find((x) => x.code === opt.value);
    if (!c) return opt.label;
    return (
      <div className="flex items-center gap-2">
        <span className="text-base">{c.flag}</span>
        <span className="font-medium text-sm">{c.dialCode}</span>
        <span className="text-muted-foreground text-xs truncate max-w-[140px]">{c.name}</span>
      </div>
    );
  }, []);

  const renderValue = React.useCallback((opt: SearchableSelectOption | undefined) => {
    if (!opt) return "";
    const c = COUNTRIES.find((x) => x.code === opt.value);
    if (!c) return opt.label;
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <span>{c.flag}</span>
        <span>{c.dialCode}</span>
      </span>
    );
  }, []);

  return (
    <div className={cn("flex items-center gap-2 max-w-md", className)}>
      <SearchableSelect
        value={selectedCountry.code}
        onValueChange={handleCountryChange}
        options={selectOptions}
        disabled={disabled}
        className="w-[110px] shrink-0"
        contentClassName="!w-[280px]"
        renderOption={renderOption}
        renderValue={renderValue}
        placeholder="Code"
        searchPlaceholder="Search country…"
      />
      <Input
        type="tel"
        value={nationalNumber}
        onChange={handlePhoneChange}
        disabled={disabled}
        placeholder="Phone number"
        className="flex-1"
      />
    </div>
  );
}
