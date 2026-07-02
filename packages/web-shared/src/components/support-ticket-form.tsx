"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Bug,
  CreditCard,
  BarChart2,
  Lightbulb,
  AlertTriangle,
  Shield,
  MessageSquare
} from "lucide-react";
import { useState } from "react";

// ---------- Types ----------
export type TicketTypeKey =
  | "BUG_REPORT"
  | "BILLING"
  | "PLAN_QUESTION"
  | "FEATURE_REQUEST"
  | "IN_APP_REPORT"
  | "SECURITY"
  | "GENERAL";

interface TicketTypeConfig {
  key: TicketTypeKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  slaHint: string;
}

const TICKET_TYPES: TicketTypeConfig[] = [
  {
    key: "BUG_REPORT",
    label: "Bug Report",
    description: "Something isn't working as expected",
    icon: <Bug className="h-5 w-5" />,
    color: "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    slaHint: "Response within 1 hour"
  },
  {
    key: "BILLING",
    label: "Billing & Payment",
    description: "Invoice, payment, charge, or refund issue",
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    slaHint: "Response within 2 hours"
  },
  {
    key: "PLAN_QUESTION",
    label: "Plan & Subscription",
    description: "Upgrade, downgrade, limits, or entitlement questions",
    icon: <BarChart2 className="h-5 w-5" />,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    slaHint: "Response within 4 hours"
  },
  {
    key: "FEATURE_REQUEST",
    label: "Feature Request",
    description: "Suggest an improvement or new feature",
    icon: <Lightbulb className="h-5 w-5" />,
    color:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    slaHint: "Response within 8 hours"
  },
  {
    key: "IN_APP_REPORT",
    label: "In-App Report",
    description: "Something looks wrong or broken inside the app",
    icon: <AlertTriangle className="h-5 w-5" />,
    color:
      "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    slaHint: "Response within 2 hours"
  },
  {
    key: "SECURITY",
    label: "Security Concern",
    description: "Unauthorized access, data exposure, or vulnerability",
    icon: <Shield className="h-5 w-5" />,
    color: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700",
    slaHint: "⚡ Response within 15 minutes"
  },
  {
    key: "GENERAL",
    label: "General Inquiry",
    description: "Partnerships, press, compliance, or anything else",
    icon: <MessageSquare className="h-5 w-5" />,
    color:
      "text-violet-600 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    slaHint: "Response within 8 hours"
  }
];

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y";

// ---------- Dynamic extra fields per type ----------

function BugFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Severity</Label>
        <Select onValueChange={(val) => register("severity", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select severity..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low — cosmetic issue</SelectItem>
            <SelectItem value="medium">Medium — feature degraded</SelectItem>
            <SelectItem value="high">High — significant workflow blocked</SelectItem>
            <SelectItem value="critical">Critical — app unusable / data risk</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
          Steps to Reproduce <span className="text-red-500">*</span>
        </Label>
        <textarea
          required
          rows={3}
          className={TEXTAREA_CLASS}
          placeholder="1. Go to..&#10;2. Click...&#10;3. See error"
          onChange={(e) => register("stepsToReproduce", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Expected Behavior</Label>
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            onChange={(e) => register("expectedBehavior", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Actual Behavior</Label>
          <textarea
            rows={2}
            className={TEXTAREA_CLASS}
            onChange={(e) => register("actualBehavior", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Browser / Environment</Label>
        <Select onValueChange={(val) => register("browserEnv", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select environment..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Chrome">Chrome</SelectItem>
            <SelectItem value="Firefox">Firefox</SelectItem>
            <SelectItem value="Safari">Safari</SelectItem>
            <SelectItem value="Edge">Edge</SelectItem>
            <SelectItem value="Mobile (iOS)">Mobile (iOS)</SelectItem>
            <SelectItem value="Mobile (Android)">Mobile (Android)</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BillingFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Issue Type <span className="text-red-500">*</span>
        </Label>
        <Select required onValueChange={(val) => register("billingIssueType", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select the type of issue..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payment_failed">Payment Failed</SelectItem>
            <SelectItem value="charge_dispute">Charge Dispute / Overcharge</SelectItem>
            <SelectItem value="refund_request">Refund Request</SelectItem>
            <SelectItem value="invoice_question">Invoice Question</SelectItem>
            <SelectItem value="payment_method">Update Payment Method</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Invoice / Transaction ID</Label>
          <Input placeholder="INV-12345" onChange={(e) => register("invoiceId", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Date of Charge</Label>
          <Input type="date" onChange={(e) => register("transactionDate", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function PlanFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Current Plan</Label>
          <Select onValueChange={(val) => register("currentPlan", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pilot">Pilot (Free)</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Interested In</Label>
          <Select onValueChange={(val) => register("interestedPlan", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>What do you need help with?</Label>
        <Select onValueChange={(val) => register("questionDetail", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pricing">Pricing / What&apos;s included</SelectItem>
            <SelectItem value="feature_limits">Feature limits on my plan</SelectItem>
            <SelectItem value="upgrade">Upgrading my plan</SelectItem>
            <SelectItem value="downgrade">Downgrading my plan</SelectItem>
            <SelectItem value="cancel">Cancellation</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FeatureRequestFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Product Area</Label>
        <Select onValueChange={(val) => register("productArea", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select area..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Time Tracking">Time Tracking</SelectItem>
            <SelectItem value="Projects">Projects</SelectItem>
            <SelectItem value="Reporting & Exports">Reporting & Exports</SelectItem>
            <SelectItem value="Approvals">Approvals</SelectItem>
            <SelectItem value="Team Management">Team Management</SelectItem>
            <SelectItem value="Billing">Billing</SelectItem>
            <SelectItem value="API & Integrations">API & Integrations</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Why is this important to you?</Label>
        <textarea
          rows={3}
          className={TEXTAREA_CLASS}
          placeholder="Describe the business problem this would solve..."
          onChange={(e) => register("businessImpact", e.target.value)}
        />
      </div>
    </div>
  );
}

function InAppReportFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Which part of the app?</Label>
        <Select onValueChange={(val) => register("appArea", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select area..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Time Tracker">Time Tracker</SelectItem>
            <SelectItem value="Projects">Projects</SelectItem>
            <SelectItem value="Dashboard">Dashboard</SelectItem>
            <SelectItem value="Reports">Reports</SelectItem>
            <SelectItem value="Approvals">Approvals</SelectItem>
            <SelectItem value="Team Management">Team Management</SelectItem>
            <SelectItem value="Settings">Settings</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>How often does this occur?</Label>
        <Select onValueChange={(val) => register("frequency", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select frequency..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="always">Always — every time I do this</SelectItem>
            <SelectItem value="sometimes">Sometimes — intermittent</SelectItem>
            <SelectItem value="rarely">Rarely — happened once or twice</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SecurityFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-4 border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20 rounded-lg p-4">
      <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">
        ⚡ Security tickets are treated as Critical priority and receive a 15-minute SLA response.
      </p>
      <div className="space-y-2">
        <Label>
          Incident Type <span className="text-red-500">*</span>
        </Label>
        <Select required onValueChange={(val) => register("incidentType", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unauthorized_access">Unauthorized Account Access</SelectItem>
            <SelectItem value="data_exposure">Potential Data Exposure</SelectItem>
            <SelectItem value="vulnerability">Vulnerability Found</SelectItem>
            <SelectItem value="account_compromise">Account Compromise</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
          Affected Area / Account <span className="text-red-500">*</span>
        </Label>
        <Input
          required
          placeholder="e.g. My account, workspace XYZ..."
          onChange={(e) => register("affectedArea", e.target.value)}
        />
      </div>
    </div>
  );
}

function GeneralFields({ register }: { register: (key: string, value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Inquiry Category</Label>
      <Select onValueChange={(val) => register("inquiryCategory", val)}>
        <SelectTrigger>
          <SelectValue placeholder="General" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="other">General</SelectItem>
          <SelectItem value="partnerships">Partnerships</SelectItem>
          <SelectItem value="press">Press & Media</SelectItem>
          <SelectItem value="compliance">Compliance / Legal</SelectItem>
          <SelectItem value="careers">Careers</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Main Component ----------
interface SupportTicketFormProps {
  requesterEmail?: string;
  requesterName?: string;
  tenantId?: string;
  apiBase: string;
  onSuccess?: () => void;
}

export function SupportTicketForm({
  requesterEmail: prefillEmail = "",
  requesterName: prefillName = "",
  tenantId,
  apiBase,
  onSuccess
}: SupportTicketFormProps) {
  const [step, setStep] = useState<"type" | "details" | "success">("type");
  const [selectedType, setSelectedType] = useState<TicketTypeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Base fields
  const [email, setEmail] = useState(prefillEmail);
  const [name, setName] = useState(prefillName);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // Dynamic metadata fields collected via register callback
  const [meta, setMeta] = useState<Record<string, string>>({});

  const register = (key: string, value: string) => {
    setMeta((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBase}/helpdesk/tickets/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketType: selectedType.key,
          subject,
          body,
          requesterEmail: email,
          requesterName: name || email.split("@")[0],
          tenantId,
          metadata: Object.keys(meta).length > 0 ? meta : undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to submit ticket. Please try again.");
      }
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Success state ----
  if (step === "success") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold">Ticket Submitted!</h3>
        <p className="text-muted-foreground text-sm">
          We&apos;ve received your {selectedType?.label.toLowerCase()} and will reply to{" "}
          <strong>{email}</strong> {selectedType?.slaHint.toLowerCase()}.
        </p>
        <Button
          variant="link"
          onClick={() => {
            setStep("type");
            setSelectedType(null);
            setSubject("");
            setBody("");
            setMeta({});
            setError("");
          }}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  // ---- Step 1: Pick ticket type ----
  if (step === "type") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">What do you need help with?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the category that best fits your issue
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TICKET_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setStep("details");
              }}
              className={`group flex items-start gap-3 p-4 rounded-xl border text-left hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all ${t.color}`}
            >
              <span className="mt-0.5 shrink-0 bg-background/50 p-1.5 rounded-lg border border-border/50">
                {t.icon}
              </span>
              <div className="flex-1">
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{t.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Step 2: Fill in details ----
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Back + header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setStep("type");
            setError("");
          }}
          className="h-8 gap-1 pl-1.5 text-muted-foreground -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${selectedType!.color}`}
        >
          {selectedType!.icon}
          {selectedType!.label}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{selectedType!.slaHint}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Contact info (only shown if not prefilled) */}
      {(!prefillEmail || !prefillName) && (
        <div className="grid grid-cols-2 gap-3">
          {!prefillName && (
            <div className="space-y-2">
              <Label>
                Your Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
          )}
          {!prefillEmail && (
            <div className={`space-y-2 ${prefillName ? "col-span-2" : ""}`}>
              <Label>
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
              />
            </div>
          )}
        </div>
      )}

      {/* Subject */}
      <div className="space-y-2">
        <Label>
          Subject <span className="text-red-500">*</span>
        </Label>
        <Input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={
            selectedType?.key === "BUG_REPORT"
              ? "e.g. Time log not saving on mobile"
              : selectedType?.key === "BILLING"
                ? "e.g. Charged twice for March"
                : "Brief summary of your request..."
          }
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>
          Description <span className="text-red-500">*</span>
        </Label>
        <textarea
          required
          rows={4}
          className={TEXTAREA_CLASS}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Please describe your issue in as much detail as possible..."
        />
      </div>

      {/* Dynamic type-specific fields */}
      {selectedType?.key === "BUG_REPORT" && <BugFields register={register} />}
      {selectedType?.key === "BILLING" && <BillingFields register={register} />}
      {selectedType?.key === "PLAN_QUESTION" && <PlanFields register={register} />}
      {selectedType?.key === "FEATURE_REQUEST" && <FeatureRequestFields register={register} />}
      {selectedType?.key === "IN_APP_REPORT" && <InAppReportFields register={register} />}
      {selectedType?.key === "SECURITY" && <SecurityFields register={register} />}
      {selectedType?.key === "GENERAL" && <GeneralFields register={register} />}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : `Submit ${selectedType?.label ?? "Request"}`}
      </Button>
    </form>
  );
}
