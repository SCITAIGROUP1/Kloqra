import {
  Bug,
  CreditCard,
  BarChart2,
  Lightbulb,
  AlertTriangle,
  Shield,
  MessageSquare
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TicketTypeKey =
  | "BUG_REPORT"
  | "BILLING"
  | "PLAN_QUESTION"
  | "FEATURE_REQUEST"
  | "IN_APP_REPORT"
  | "SECURITY"
  | "GENERAL";

export type TicketPriorityKey = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type TicketStatusKey =
  | "OPEN"
  | "PENDING"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "RESOLVED"
  | "CLOSED";

interface TypeConfig {
  label: string;
  Icon: LucideIcon;
  badgeClass: string;
}

export const TICKET_TYPE_CONFIG: Record<TicketTypeKey, TypeConfig> = {
  BUG_REPORT: {
    label: "Bug",
    Icon: Bug,
    badgeClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
  },
  BILLING: {
    label: "Billing",
    Icon: CreditCard,
    badgeClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
  },
  PLAN_QUESTION: {
    label: "Plan",
    Icon: BarChart2,
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
  },
  FEATURE_REQUEST: {
    label: "Feature Req.",
    Icon: Lightbulb,
    badgeClass:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
  },
  IN_APP_REPORT: {
    label: "In-App",
    Icon: AlertTriangle,
    badgeClass:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
  },
  SECURITY: {
    label: "Security",
    Icon: Shield,
    badgeClass:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-700"
  },
  GENERAL: {
    label: "General",
    Icon: MessageSquare,
    badgeClass:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800"
  }
};

export const PRIORITY_CONFIG: Record<
  TicketPriorityKey,
  { label: string; dotClass: string; textClass: string }
> = {
  CRITICAL: {
    label: "Critical",
    dotClass: "bg-rose-600",
    textClass: "text-rose-600 dark:text-rose-400"
  },
  HIGH: { label: "High", dotClass: "bg-red-500", textClass: "text-red-600 dark:text-red-400" },
  MEDIUM: {
    label: "Medium",
    dotClass: "bg-amber-400",
    textClass: "text-amber-600 dark:text-amber-400"
  },
  LOW: { label: "Low", dotClass: "bg-slate-400", textClass: "text-slate-500 dark:text-slate-400" }
};

export const STATUS_CONFIG: Record<TicketStatusKey, { label: string; badgeClass: string }> = {
  OPEN: {
    label: "Open",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  PENDING: {
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
  },
  ON_HOLD: {
    label: "On Hold",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  },
  RESOLVED: {
    label: "Resolved",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  CLOSED: {
    label: "Closed",
    badgeClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
  }
};

export function TicketTypeBadge({ type }: { type: TicketTypeKey }) {
  const cfg = TICKET_TYPE_CONFIG[type] ?? TICKET_TYPE_CONFIG.GENERAL;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: TicketPriorityKey }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.textClass}`}>
      <span
        className={`h-2 w-2 rounded-full ${cfg.dotClass} ${priority === "CRITICAL" ? "animate-pulse" : ""}`}
      />
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatusKey }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeClass}`}
    >
      {cfg.label}
    </span>
  );
}

/** Render type-specific metadata fields in a readable key→value format */
export function TicketMetadataPanel({
  ticketType: _ticketType,
  metadata
}: {
  ticketType: TicketTypeKey;
  metadata: Record<string, unknown>;
}) {
  const FIELD_LABELS: Record<string, string> = {
    severity: "Severity",
    stepsToReproduce: "Steps to Reproduce",
    expectedBehavior: "Expected Behavior",
    actualBehavior: "Actual Behavior",
    browserEnv: "Browser / Env",
    billingIssueType: "Issue Type",
    invoiceId: "Invoice / Transaction ID",
    transactionDate: "Transaction Date",
    currentPlan: "Current Plan",
    interestedPlan: "Interested Plan",
    questionDetail: "Question About",
    productArea: "Product Area",
    businessImpact: "Business Impact",
    appArea: "App Area",
    frequency: "Frequency",
    incidentType: "Incident Type",
    affectedArea: "Affected Area",
    inquiryCategory: "Category"
  };

  const entries = Object.entries(metadata).filter(
    ([, v]) => v !== "" && v !== undefined && v !== null
  );
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="text-xs text-muted-foreground block">{FIELD_LABELS[key] ?? key}</span>
          <span className="text-sm font-medium break-words">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}
