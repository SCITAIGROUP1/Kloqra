import { cn } from "@kloqra/ui";

export type PasswordStrength = {
  score: number;
  label: string;
  colorClass: string;
  percentage: number;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Weak", colorClass: "bg-muted", percentage: 0 };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  let label = "Weak";
  let colorClass = "bg-destructive"; // Red
  let percentage = 20;

  if (score === 5) {
    label = "Strong";
    colorClass = "bg-emerald-500"; // Green
    percentage = 100;
  } else if (score >= 3) {
    label = "Medium";
    colorClass = "bg-amber-500"; // Yellow/Orange
    percentage = score === 4 ? 80 : 60;
  } else {
    label = "Weak";
    colorClass = "bg-destructive";
    percentage = score === 2 ? 40 : 20;
  }

  return { score, label, colorClass, percentage };
}

export function PasswordStrengthIndicator({ password }: { password?: string }) {
  const { label, colorClass, percentage } = calculatePasswordStrength(password ?? "");

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p
        className={cn(
          "text-[10px] font-semibold text-right",
          label === "Strong"
            ? "text-emerald-500"
            : label === "Medium"
              ? "text-amber-500"
              : "text-destructive"
        )}
      >
        {label}
      </p>
    </div>
  );
}
