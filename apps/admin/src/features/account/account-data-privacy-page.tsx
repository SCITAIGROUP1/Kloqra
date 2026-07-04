"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@kloqra/ui";
import { useTenantDataExport } from "@kloqra/web-shared";
import {
  Database,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileArchive,
  Trash2,
  RefreshCw,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";
import { getWorkspaceId } from "@/stores/session.store";

export function AccountDataPrivacyPage() {
  const workspaceId = getWorkspaceId() ?? "";
  const { job, loading, error, startExport, refreshJob } = useTenantDataExport();

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importJob, setImportJob] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    const timer = window.setInterval(() => {
      void refreshJob(job.id);
    }, 2000);
    return () => {
      window.clearInterval(timer);
    };
  }, [job, refreshJob]);

  // Poll latest import job status
  useEffect(() => {
    if (!importJob || importJob.status === "ready" || importJob.status === "failed") {
      if (importJob?.status === "ready" && importing) {
        toast.success(
          `Import completed successfully! Organization workspaces and logs have been restored.`
        );
        setImporting(false);
        setSelectedFile(null);
      } else if (importJob?.status === "failed" && importing) {
        toast.error(`Import failed: ${importJob.errorMessage || "Validation failed"}`);
        setImporting(false);
      }
      return;
    }

    setImporting(true);
    if (importJob.status === "queued") setImportProgress(25);
    else if (importJob.status === "running") setImportProgress(65);

    const timer = window.setInterval(async () => {
      try {
        const latest = await api<any>(ROUTES.TENANTS.DATA_IMPORT, { workspaceId });
        setImportJob(latest);
      } catch {
        window.clearInterval(timer);
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [importJob, importing, workspaceId]);

  // Load initial latest import job on mount
  useEffect(() => {
    if (!workspaceId) return;
    api<any>(ROUTES.TENANTS.DATA_IMPORT, { workspaceId })
      .then((data) => {
        if (data && (data.status === "queued" || data.status === "running")) {
          setImportJob(data);
          setSelectedFile({ name: data.filename, size: data.byteSize } as any);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  async function handleStartExport() {
    const created = await startExport();
    if (created) {
      toast.success("Organization export started. This may take a few minutes.");
    }
  }

  async function handleDownload() {
    if (!job || job.status !== "ready") return;
    try {
      const response = await apiDownloadGet(
        ROUTES.TENANTS.DATA_EXPORT_JOB_DOWNLOAD(job.id),
        workspaceId
      );
      saveDownloadResponse(response, job.filename ?? "organization-export.zip");
      toast.success("Export downloaded successfully.");
    } catch {
      toast.error("Could not download export.");
    }
  }

  // Import Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        setSelectedFile(file);
      } else {
        toast.error("Only ZIP files are supported for import.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setSelectedFile(file);
      } else {
        toast.error("Only ZIP files are supported.");
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setImporting(true);
    setImportProgress(10);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await api<any>(ROUTES.TENANTS.DATA_IMPORT, {
        method: "POST",
        workspaceId,
        body: formData
      });
      setImportJob(res);
      toast.info("Import enqueued in background. Checking progress...");
    } catch (err) {
      setImporting(false);
      setImportProgress(0);
      const message = err instanceof Error ? err.message : "Failed to import data.";
      toast.error(message);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <AppBar
        title="Data & privacy"
        description="Manage data portability, compliance requests, and organization backups."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Card */}
        <Card className="border border-border/40 hover:shadow-lg transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-card to-muted/10">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Database className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Organization data export</CardTitle>
                <CardDescription className="text-xs">
                  Portability backup of your entire organization.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Creates a comprehensive ZIP archive containing a manifest.json metadata file and
              time-entry JSON spreadsheets for every workspace. Exports are held in storage for
              exactly 7 days.
            </p>

            {error && (
              <div className="p-3.5 bg-destructive/10 text-destructive text-sm rounded-xl flex items-start gap-2.5 border border-destructive/20 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Stepper progress if enqueued or running */}
            {job && (job.status === "queued" || job.status === "running") && (
              <div className="p-4 bg-muted/40 border border-border/50 rounded-2xl space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Export Progress</span>
                  <span className="flex items-center gap-1.5 text-indigo-500">
                    <Loader2 className="size-3.5 animate-spin" />
                    {job.status === "running" ? "Processing" : "Queued"}
                  </span>
                </div>

                <div className="relative space-y-3 pl-6 border-l border-indigo-500/20">
                  {/* Step 1 */}
                  <div className="relative flex items-center gap-3">
                    <div
                      className={`absolute -left-[30px] size-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
                        job.status === "running"
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "bg-background border-indigo-500 text-indigo-500 animate-pulse"
                      }`}
                    >
                      {job.status === "running" ? "✓" : "1"}
                    </div>
                    <span
                      className={`text-sm ${job.status === "running" ? "text-muted-foreground line-through" : "font-medium text-foreground"}`}
                    >
                      Queue task received & scheduled
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex items-center gap-3">
                    <div
                      className={`absolute -left-[30px] size-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
                        job.status === "running"
                          ? "bg-background border-indigo-500 text-indigo-500 animate-pulse"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      2
                    </div>
                    <span
                      className={`text-sm ${job.status === "running" ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      Compiling workspace time entries
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex items-center gap-3">
                    <div className="absolute -left-[30px] size-4 rounded-full border-2 bg-background border-border text-muted-foreground flex items-center justify-center text-[10px]">
                      3
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Packaging ZIP compression archive
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ready State Card */}
            {job && job.status === "ready" && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">
                      Backup Archive Ready
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.filename} • {job.byteSize ? formatBytes(job.byteSize) : "N/A"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => void handleDownload()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0 shadow-sm transition-transform active:scale-95 duration-200 flex items-center gap-2"
                >
                  <Download className="size-4" />
                  Download
                </Button>
              </div>
            )}

            <Button
              type="button"
              disabled={loading || job?.status === "queued" || job?.status === "running"}
              onClick={() => void handleStartExport()}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium shadow-sm transition-all py-5 rounded-xl flex items-center justify-center gap-2"
            >
              {loading || job?.status === "queued" || job?.status === "running" ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Generating Export Package...
                </>
              ) : (
                <>
                  <Database className="size-4" />
                  Export all organization data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card (The Import Option!) */}
        <Card className="border border-border/40 hover:shadow-lg transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-card to-muted/10">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Organization data import</CardTitle>
                <CardDescription className="text-xs">
                  Restore workspaces and logs from a backup ZIP.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload a previously exported Kloqra compliance backup ZIP. The system will extract the
              manifest, provision/match workspaces, and merge all time-log entry records.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".zip"
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group transition-all duration-300 ${
                    dragActive
                      ? "border-purple-500 bg-purple-500/5 shadow-inner scale-[0.98]"
                      : "border-border/60 hover:border-purple-400 hover:bg-purple-500/[0.01]"
                  }`}
                >
                  <div className="p-3 bg-muted rounded-full group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors">
                    <UploadCloud className="size-7 text-muted-foreground group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold group-hover:text-purple-500 transition-colors">
                      Drag & drop your backup ZIP
                    </p>
                    <p className="text-xs text-muted-foreground">or click to browse local files</p>
                  </div>
                </div>
              ) : (
                /* Selected File Card */
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                      <FileArchive className="size-5 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={importing}
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 h-auto rounded-xl shrink-0"
                  >
                    <Trash2 className="size-4.5" />
                  </Button>
                </div>
              )}

              {/* Progress bar during import */}
              {importing && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    <span className="flex items-center gap-1.5 text-purple-500">
                      <Loader2 className="size-3.5 animate-spin" />
                      Parsing archive...
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={importing || !selectedFile}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium shadow-sm transition-all py-5 rounded-xl flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing Backup Data...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Upload & import organization backup
                    <ChevronRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
