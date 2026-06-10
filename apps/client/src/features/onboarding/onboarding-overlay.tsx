"use client";

import { PROJECT_COLORS, ROUTES } from "@kloqra/contracts";
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  Input,
  Label,
  ProjectColorPicker,
  cn
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { Sparkles, Clock, ArrowRight, Check, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";

type Step = 1 | 2 | 3;

interface OnboardingOverlayProps {
  onComplete?: () => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<Step>(1);

  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? "";
  const isAdmin = session?.workspaceRole === "ADMIN";
  const userName = session?.user.name ?? "there";

  const { projects, setProjects, setTasks } = useProjectsStore();

  // Project Creation states (Admin only)
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PROJECT_COLORS[0] ?? "#10b981");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDone = localStorage.getItem("kloqra_onboarding_done");
      if (!isDone) {
        setShow(true);
      }
    }
  }, []);

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kloqra_onboarding_done", "true");
    }
    setShow(false);
    if (onComplete) onComplete();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !ws) return;

    setCreating(true);
    try {
      // 1. Create the project
      const newProj = await api<ProjectDto>(ROUTES.PROJECTS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          name: projectName.trim(),
          clientName: clientName.trim() || undefined,
          color: selectedColor
        })
      });

      // 2. Ensure there is at least one category for this workspace.
      let categories = await fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, {
        workspaceId: ws
      });
      if (categories.length === 0) {
        const general = await api<CategoryDto>(ROUTES.CATEGORIES.CREATE, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify({
            name: "General",
            description: "Default category for getting started"
          })
        });
        categories = [general];
      }

      // 3. Automatically create a default "General Tasks" task for this project
      await api<TaskDto>(ROUTES.TASKS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          projectId: newProj.id,
          categoryId: categories[0]!.id,
          taskName: "General Tasks"
        })
      });

      // 4. Refresh project/task stores
      const [allProjects, allTasks] = await Promise.all([
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }),
        fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws })
      ]);
      setProjects(allProjects);
      setTasks(allTasks);

      toast.success(`Project "${projectName}" and default task created!`);

      // Auto advance to step 3
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (!show) return null;

  return (
    <Dialog open={show}>
      <DialogContent size="xl" showClose={false} className="min-h-[480px]">
        <DialogBody className="flex min-h-[480px] flex-col justify-between py-6">
          {/* Step Header Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Getting Started
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    s === step ? "w-6 bg-primary" : "w-2 bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 flex flex-col justify-center">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Welcome to Kloqra, {userName}!
                </h1>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  Kloqra is a premium, unified time-tracking and productivity platform. Keep track
                  of tasks, monitor project budgets, manage timesheets, and generate automated
                  invoice sheets seamlessly.
                </p>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Let&apos;s run through a quick 2-minute setup to get your timer running!
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in-up">
                {isAdmin ? (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">
                        Create your first project
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        As an Admin, you can set up projects and team members. Let&apos;s create
                        your first project.
                      </p>
                    </div>

                    <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="onboarding-proj-name" className="text-xs">
                            Project Name
                          </Label>
                          <Input
                            id="onboarding-proj-name"
                            placeholder="e.g. Website Redesign"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            required
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="onboarding-client" className="text-xs">
                            Client (Optional)
                          </Label>
                          <Input
                            id="onboarding-client"
                            placeholder="e.g. Acme Corp"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Project Color Accent</Label>
                        <ProjectColorPicker
                          value={selectedColor}
                          onChange={setSelectedColor}
                          colors={PROJECT_COLORS}
                          className="gap-1.5"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        className="w-full text-xs h-9"
                        disabled={creating}
                      >
                        {creating ? "Creating project..." : "Create project & advance"}
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Your Assigned Projects</h2>
                      <p className="text-xs text-muted-foreground">
                        Your workspace administrator assigns you to projects and tasks.
                      </p>
                    </div>

                    <div className="min-h-[160px] rounded-lg border border-border/50 bg-muted/20 p-4 mt-3 flex flex-col justify-center">
                      {projects.length === 0 ? (
                        <div className="text-center py-6">
                          <HelpCircle className="size-8 text-muted-foreground opacity-60 mx-auto mb-2 animate-bounce" />
                          <p className="text-sm font-semibold">No projects assigned yet</p>
                          <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                            You haven&apos;t been assigned to any projects. You can ask your admin
                            or check out details once assigned.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Current Assigned Projects
                          </p>
                          <ul className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                            {projects.map((p) => (
                              <li
                                key={p.id}
                                className="flex items-center gap-2 rounded-md border border-border/60 bg-card p-2 text-xs font-medium"
                              >
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate">{p.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                  <Clock className="size-6 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  Ready to track your first hours!
                </h2>
                <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    To log hours, select your project and task on the main timer dashboard and hit{" "}
                    <strong className="text-foreground">Start timer</strong>.
                  </p>
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-foreground">
                      💡 Supercharge with Keyboard Shortcuts:
                    </span>
                    <span>
                      Press{" "}
                      <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
                        Space
                      </kbd>{" "}
                      or{" "}
                      <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
                        Ctrl+Shift+T
                      </kbd>{" "}
                      to instantly toggle your active timer!
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className={cn(
                "text-xs transition-opacity duration-200",
                step === 1 && "opacity-0 pointer-events-none"
              )}
            >
              Back
            </Button>

            <div className="flex gap-2">
              {step < 3 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleComplete}
                    className="text-xs"
                  >
                    Skip Onboarding
                  </Button>
                  {/* For Admin on Step 2, they must either create project to advance, or skip. But they can also click next if they already have projects. */}
                  {!(step === 2 && isAdmin && projects.length === 0) && (
                    <Button type="button" size="sm" onClick={handleNext} className="text-xs gap-1">
                      <span>Next</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleComplete}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <span>Start Tracking Now</span>
                  <Check className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
