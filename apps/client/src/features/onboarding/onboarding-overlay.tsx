"use client";

import { PROJECT_COLORS, ROUTES } from "@kloqra/contracts";
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Button,
  CrossfadePresence,
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  ProjectColorPicker,
  cn
} from "@kloqra/ui";
import { fetchListItems } from "@kloqra/web-shared";
import { ArrowRight, Clock, HelpCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OnboardingFeatureCard } from "./onboarding-feature-card";
import {
  FINISH_HIGHLIGHTS,
  ONBOARDING_STEP_IDS,
  PROJECTS_DASHBOARD_CARDS,
  TOTAL_ONBOARDING_STEPS,
  TRACK_TIME_CARDS,
  getStepNumber,
  getStepTitle,
  type OnboardingStepId
} from "./onboarding-steps";
import { isWizardDone, markWizardDone } from "./onboarding-storage";
import { useIsImpersonating } from "@/hooks/use-is-impersonating";
import { api } from "@/lib/api";
import { useProjectsStore } from "@/stores/projects.store";
import { useSessionStore } from "@/stores/session.store";

export type OnboardingCompleteOptions = {
  startTour: boolean;
};

interface OnboardingOverlayProps {
  onComplete?: (options: OnboardingCompleteOptions) => void;
  forceOpen?: boolean;
  replay?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OnboardingOverlay({
  onComplete,
  forceOpen,
  replay = false,
  onOpenChange
}: OnboardingOverlayProps) {
  const [show, setShow] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? "";
  const isAdmin = session?.workspaceRole === "ADMIN";
  const isImpersonating = useIsImpersonating();
  const userName = session?.user.name ?? "there";

  const { projects, setProjects, setTasks } = useProjectsStore();

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PROJECT_COLORS[0] ?? "#10b981");
  const [creating, setCreating] = useState(false);

  const stepId = ONBOARDING_STEP_IDS[stepIndex] ?? "welcome";
  const stepNumber = getStepNumber(stepId);
  const progressPercent = (stepNumber / TOTAL_ONBOARDING_STEPS) * 100;

  useEffect(() => {
    if (isImpersonating) return;
    if (forceOpen !== undefined) {
      setShow(forceOpen);
      return;
    }
    if (typeof window !== "undefined" && !replay && !isWizardDone()) {
      setShow(true);
    }
  }, [forceOpen, replay, isImpersonating]);

  useEffect(() => {
    if (replay && forceOpen) {
      setStepIndex(0);
    }
  }, [replay, forceOpen]);

  useEffect(() => {
    if (!show || !ws || isAdmin) return;
    void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
  }, [show, ws, isAdmin, setProjects]);

  const closeOverlay = () => {
    setShow(false);
    onOpenChange?.(false);
  };

  const handleComplete = (options: OnboardingCompleteOptions) => {
    if (typeof window !== "undefined" && !replay) {
      markWizardDone();
    }
    closeOverlay();
    onComplete?.(options);
  };

  const handleSkip = () => {
    handleComplete({ startTour: false });
  };

  const handleNext = () => {
    if (stepIndex < TOTAL_ONBOARDING_STEPS - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !ws) return;

    setCreating(true);
    try {
      const newProj = await api<ProjectDto>(ROUTES.PROJECTS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          name: projectName.trim(),
          clientName: clientName.trim() || undefined,
          color: selectedColor
        })
      });

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

      const me = session?.user.id;
      if (!me) throw new Error("Session required");

      await api<TaskDto>(ROUTES.TASKS.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          projectId: newProj.id,
          categoryId: categories[0]!.id,
          taskName: "General Tasks",
          assigneeUserIds: [me]
        })
      });

      const [allProjects, allTasks] = await Promise.all([
        fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }),
        fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws })
      ]);
      setProjects(allProjects);
      setTasks(allTasks);

      toast.success(`Project "${projectName}" and default task created!`);
      setStepIndex(ONBOARDING_STEP_IDS.indexOf("track-time"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const adminMustCreateProject = stepId === "workspace" && isAdmin && projects.length === 0;
  const isFinishStep = stepId === "finish";

  if (!show) return null;

  return (
    <Dialog open={show}>
      <DialogContent size="xl" showClose={false} className="min-h-[520px]">
        <DialogTitle className="sr-only">{getStepTitle(stepId, userName, isAdmin)}</DialogTitle>
        <DialogBody className="flex min-h-[520px] flex-col justify-between py-6">
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Getting Started
                </span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Step {stepNumber} of {TOTAL_ONBOARDING_STEPS}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <CrossfadePresence presenceKey={stepId}>
              <StepContent
                stepId={stepId}
                userName={userName}
                isAdmin={isAdmin}
                projects={projects}
                projectName={projectName}
                setProjectName={setProjectName}
                clientName={clientName}
                setClientName={setClientName}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                creating={creating}
                onCreateProject={handleCreateProject}
              />
            </CrossfadePresence>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className={cn(
                "text-xs transition-opacity duration-200",
                stepIndex === 0 && "pointer-events-none opacity-0"
              )}
            >
              Back
            </Button>

            <div className="flex flex-wrap justify-end gap-2">
              {!isFinishStep ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="text-xs"
                  >
                    Skip onboarding
                  </Button>
                  {!adminMustCreateProject ? (
                    <Button type="button" size="sm" onClick={handleNext} className="gap-1 text-xs">
                      <span>Next</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleComplete({ startTour: false })}
                    className="text-xs"
                  >
                    Go to Timer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleComplete({ startTour: true })}
                    className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  >
                    <span>Take the quick tour</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

type StepContentProps = {
  stepId: OnboardingStepId;
  userName: string;
  isAdmin: boolean;
  projects: ProjectDto[];
  projectName: string;
  setProjectName: (v: string) => void;
  clientName: string;
  setClientName: (v: string) => void;
  selectedColor: string;
  setSelectedColor: (v: string) => void;
  creating: boolean;
  onCreateProject: (e: React.FormEvent) => void;
};

function StepContent({
  stepId,
  userName,
  isAdmin,
  projects,
  projectName,
  setProjectName,
  clientName,
  setClientName,
  selectedColor,
  setSelectedColor,
  creating,
  onCreateProject
}: StepContentProps) {
  switch (stepId) {
    case "welcome":
      return (
        <div className="space-y-4">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Welcome to Kloqra, {userName}!
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Track time across projects, explore personal insights on your dashboard, submit
            timesheets for approval, and stay on top of assigned work — all in one place.
          </p>
          <p className="text-sm text-muted-foreground">
            This quick setup takes about 3 minutes. You can replay it anytime from the sparkles icon
            in the header.
          </p>
        </div>
      );

    case "workspace":
      return (
        <div className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Create your first project</h2>
                <p className="text-xs text-muted-foreground">
                  As an admin, set up projects and assign tasks to your team. We&apos;ll create a
                  default task assigned to you.
                </p>
              </div>
              <form onSubmit={onCreateProject} className="mt-2 space-y-4">
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
                <Button type="submit" size="sm" className="h-9 w-full text-xs" disabled={creating}>
                  {creating ? "Creating project..." : "Create project & advance"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Your assigned projects</h2>
                <p className="text-xs text-muted-foreground">
                  Your workspace administrator assigns you to projects and tasks. Open a project to
                  see your stats and personalize your display color.
                </p>
              </div>
              <div className="mt-3 flex min-h-[160px] flex-col justify-center rounded-lg border border-border/50 bg-muted/20 p-4">
                {projects.length === 0 ? (
                  <div className="py-6 text-center">
                    <HelpCircle className="mx-auto mb-2 size-8 animate-bounce text-muted-foreground opacity-60" />
                    <p className="text-sm font-semibold">No projects assigned yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Ask your admin to assign you to projects and tasks. You&apos;ll only see tasks
                      you&apos;re assigned to when tracking time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Current assigned projects
                    </p>
                    <ul className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1">
                      {projects.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 bg-card p-2 text-xs font-medium"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: p.myColor ?? p.color }}
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
      );

    case "track-time":
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Three ways to track time</h2>
            <p className="text-xs text-muted-foreground">
              Use the right tool for how you work — live tracking, list editing, or calendar
              planning.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {TRACK_TIME_CARDS.map((card) => (
              <OnboardingFeatureCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      );

    case "projects-dashboard":
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Projects & dashboard</h2>
            <p className="text-xs text-muted-foreground">
              Monitor your progress and customize how you see your workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROJECTS_DASHBOARD_CARDS.map((card) => (
              <OnboardingFeatureCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      );

    case "finish":
      return (
        <div className="space-y-4">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
            <Clock className="size-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            You&apos;re almost ready!
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {FINISH_HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{text}</span>
              </div>
            ))}
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
              <span className="font-semibold text-foreground">Keyboard shortcuts: </span>
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
                Space
              </kbd>{" "}
              or{" "}
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">
                Ctrl+Shift+T
              </kbd>{" "}
              toggles your active timer.
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Take the quick tour to see where everything lives, or jump straight to the Timer.
          </p>
        </div>
      );

    default:
      return null;
  }
}
