"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectDto, TimeLogDto, ListTimeLogsResponseDto } from "@kloqra/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ProjectColorDot,
  Spinner
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { FileText, ArrowRight, ArrowLeft, Download, Info } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { toDateInputValue } from "@/lib/export-date-presets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export function InvoiceWizard() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard State
  const [step, setStep] = useState(1);

  // Step 1 Form values
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));

  // Loaded logs for Step 1 validation / preview
  const [logs, setLogs] = useState<TimeLogDto[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Step 2 Form values
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const yr = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV-${yr}-${rand}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days due date default
    return toDateInputValue(d);
  });
  const [companyName, setCompanyName] = useState("Kloqra Workspace");
  const [clientName, setClientName] = useState("");

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Load projects
  useEffect(() => {
    if (!ws) return;
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws })
      .then(setProjects)
      .catch(() => {});
  }, [ws]);

  // Load logs preview when project or range changes
  const loadLogsPreview = useCallback(async () => {
    if (!ws || !projectId) {
      setLogs([]);
      return;
    }
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        from: new Date(from).toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        projectId
      });
      // We list the time logs
      const res = await api<ListTimeLogsResponseDto>(`${ROUTES.TIMELOGS.LIST}?${params}`, {
        workspaceId: ws
      });
      // Filter for billable logs only
      setLogs(res.items.filter((item) => item.isBillable));
    } catch (e) {
      setLogs([]);
      toast.error(e instanceof Error ? e.message : "Could not load billable time logs.");
    } finally {
      setLogsLoading(false);
    }
  }, [ws, projectId, from, to]);

  useEffect(() => {
    void loadLogsPreview();
  }, [loadLogsPreview]);

  // Handle project select side-effect: auto-fill clientName
  const handleProjectSelect = (id: string) => {
    setProjectId(id);
    const proj = projects.find((p) => p.id === id);
    if (proj?.clientName) {
      setClientName(proj.clientName);
    } else {
      setClientName("Default Client");
    }
  };

  const totalHours = useMemo(() => {
    return logs.reduce((sum, log) => sum + log.durationSec / 3600, 0);
  }, [logs]);

  const handleNextStep = () => {
    if (step < 3) setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const runInvoiceGeneration = async () => {
    if (!ws || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiDownloadPost(ROUTES.EXPORT.INVOICE, ws, {
        projectId,
        from: new Date(from).toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        invoiceNumber,
        dueDate: new Date(dueDate).toISOString(),
        companyName,
        clientName
      });
      await saveDownloadResponse(res, `invoice-${invoiceNumber}.pdf`);
      toast.success(`Invoice ${invoiceNumber} downloaded.`);
      setStep(1);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate invoice PDF";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <span>Invoice Wizard</span>
        </CardTitle>
        <CardDescription>
          Generate a professional PDF invoice from your team&apos;s billable time logs.
        </CardDescription>

        {/* Multi-step progress bar */}
        <div className="flex items-center justify-between w-full pt-4 text-xs font-medium text-muted-foreground">
          <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Project & Period</span>
          <span className="h-0.5 grow mx-4 bg-muted-foreground/20 rounded-full" />
          <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Billing Details</span>
          <span className="h-0.5 grow mx-4 bg-muted-foreground/20 rounded-full" />
          <span className={step >= 3 ? "text-primary font-bold" : ""}>3. Preview & Download</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={projectId} onValueChange={handleProjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project for invoice" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProjectColorDot color={p.color} />
                        {p.name} {p.clientName ? `(${p.clientName})` : ""}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from">Start Date</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">End Date</Label>
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>

            {/* Billable entries summary */}
            {projectId && (
              <div className="border bg-muted/20 p-4 rounded-xl space-y-2 text-sm">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  Time Logs Summary
                </p>
                {logsLoading ? (
                  <Spinner label="Checking time logs…" className="py-1" />
                ) : logs.length === 0 ? (
                  <p className="text-destructive flex items-center gap-1.5 font-medium">
                    <Info className="size-4" />
                    No billable time entries found for this project in the selected period.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Billable entries</p>
                      <p className="text-base font-bold">{logs.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total hours</p>
                      <p className="text-base font-bold">{totalHours.toFixed(2)}h</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!projectId || logs.length === 0 || logsLoading}
              onClick={handleNextStep}
            >
              <span>Continue</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Your Company Name (Bill From)</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Bill To)</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client Name"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/2" onClick={handlePrevStep}>
                <ArrowLeft className="size-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button
                className="w-1/2"
                disabled={!invoiceNumber.trim() || !companyName.trim() || !clientName.trim()}
                onClick={handleNextStep}
              >
                <span>Preview Details</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="border border-border/80 rounded-xl p-5 space-y-4 bg-muted/10 text-sm">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-base text-primary">{companyName}</h4>
                  <p className="text-xs text-muted-foreground">
                    Invoice Date: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-base text-primary">INVOICE</h4>
                  <p className="text-xs text-muted-foreground">#: {invoiceNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-b pb-3">
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Bill To
                  </span>
                  <span className="font-bold text-primary block">{clientName}</span>
                  <span className="text-muted-foreground">Project: {selectedProject?.name}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Details
                  </span>
                  <span className="block">Due Date: {new Date(dueDate).toLocaleDateString()}</span>
                  <span className="block">
                    Range: {new Date(from).toLocaleDateString()} -{" "}
                    {new Date(to).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
                  Logged billable hours
                </span>
                <div className="flex justify-between font-medium py-1.5 px-3 bg-muted/30 rounded-lg">
                  <span>
                    {selectedProject?.name} (Total: {logs.length} entries)
                  </span>
                  <span className="font-bold">{totalHours.toFixed(2)} hrs</span>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={handlePrevStep}
                disabled={loading}
              >
                <ArrowLeft className="size-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button className="w-1/2" onClick={runInvoiceGeneration} disabled={loading}>
                <Download className="size-4 mr-1.5" />
                <span>{loading ? "Generating PDF..." : "Download PDF"}</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
