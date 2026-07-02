"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Spinner,
  cn
} from "@kloqra/ui";
import {
  Building2,
  Folder,
  FolderKanban,
  Briefcase,
  Users,
  ChevronRight,
  ChevronDown,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Globe,
  Clock,
  Calendar,
  Mail,
  FolderTree,
  Compass
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

type NodeType =
  | "tenant"
  | "workspace"
  | "workspace-members-group"
  | "workspace-member"
  | "projects-group"
  | "project"
  | "project-member";

interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  children?: TreeNode[];
  data?: any;
}

export function AccountWorkspacesTreePage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";

  const [treeData, setTreeData] = useState<any[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tree interactive state
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Panning state
  const [panOffset, setPanOffset] = useState({ x: 80, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all tree data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tree, tenant] = await Promise.all([
        api<any[]>(ROUTES.TENANTS.WORKSPACES_TREE, { workspaceId: ws }),
        api<any>(ROUTES.TENANTS.CURRENT, { workspaceId: ws })
      ]);
      setTreeData(tree);
      setTenantInfo(tenant);

      // Select the root tenant node by default once loaded
      if (tenant) {
        const rootNode: TreeNode = {
          id: "tenant-root",
          type: "tenant",
          label: tenant.name,
          data: tenant
        };
        setSelectedNode(rootNode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces tree");
      toast.error("Error loading workspaces tree data");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    if (ws) {
      void loadData();
    }
  }, [ws, loadData]);

  // Handle native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        toast.error(`Could not enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Convert raw API response to hierarchial TreeNode structure
  const rawTree = useMemo(() => {
    if (!tenantInfo) return null;

    const rootNode: TreeNode = {
      id: "tenant-root",
      type: "tenant",
      label: tenantInfo.name,
      data: tenantInfo,
      children: []
    };

    const workspaceNodes = treeData.map((workspace: any) => {
      const wsNode: TreeNode = {
        id: `workspace-${workspace.id}`,
        type: "workspace",
        label: workspace.name,
        data: workspace,
        children: []
      };

      // 1. Direct Workspace Members Group
      if (workspace.members && workspace.members.length > 0) {
        const membersNode: TreeNode = {
          id: `workspace-${workspace.id}-members-group`,
          type: "workspace-members-group",
          label: `Members (${workspace.members.length})`,
          children: workspace.members.map((member: any) => ({
            id: `workspace-${workspace.id}-member-${member.id}`,
            type: "workspace-member",
            label: member.user?.name || member.userEmail,
            data: { ...member, workspaceName: workspace.name }
          }))
        };
        wsNode.children!.push(membersNode);
      }

      // 2. Projects & Teams Group
      if (workspace.projects && workspace.projects.length > 0) {
        const projectsNode: TreeNode = {
          id: `workspace-${workspace.id}-projects-group`,
          type: "projects-group",
          label: `Projects (${workspace.projects.length})`,
          children: workspace.projects.map((project: any) => {
            const projectNode: TreeNode = {
              id: `project-${project.id}`,
              type: "project",
              label: project.name,
              data: { ...project, workspaceName: workspace.name },
              children: []
            };

            const teamMembers = project.team?.members || [];
            if (teamMembers.length > 0) {
              projectNode.children = teamMembers.map((teamMember: any) => ({
                id: `project-${project.id}-member-${teamMember.id}`,
                type: "project-member",
                label: teamMember.user?.name || "Unknown member",
                data: { ...teamMember, projectName: project.name, workspaceName: workspace.name }
              }));
            }

            return projectNode;
          })
        };
        wsNode.children!.push(projectsNode);
      }

      return wsNode;
    });

    rootNode.children = workspaceNodes;
    return rootNode;
  }, [treeData, tenantInfo]);

  // Recursively filter tree nodes and collect auto-expansion IDs
  const { filteredTree, autoExpandMap } = useMemo(() => {
    const expandMap: Record<string, boolean> = {};
    if (!rawTree) return { filteredTree: null, autoExpandMap: expandMap };
    if (!searchQuery.trim()) return { filteredTree: rawTree, autoExpandMap: expandMap };

    const query = searchQuery.trim().toLowerCase();

    const cloneNode = (node: TreeNode): TreeNode | null => {
      const labelMatches = node.label.toLowerCase().includes(query);

      let metaMatches = false;
      const user = node.data?.user;
      if (user) {
        metaMatches =
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.jobTitle?.toLowerCase().includes(query) ||
          user.department?.toLowerCase().includes(query);
      }

      const isMatch = labelMatches || metaMatches;

      if (node.children) {
        const validChildren: TreeNode[] = [];
        for (const child of node.children) {
          const clonedChild = cloneNode(child);
          if (clonedChild) {
            validChildren.push(clonedChild);
          }
        }

        if (validChildren.length > 0) {
          expandMap[node.id] = true;
          return {
            ...node,
            children: validChildren
          };
        }
      }

      if (isMatch) {
        return { ...node };
      }

      return null;
    };

    const result = cloneNode(rawTree);
    return { filteredTree: result, autoExpandMap: expandMap };
  }, [rawTree, searchQuery]);

  // Apply auto-expansions when search query changes
  useEffect(() => {
    if (searchQuery.trim() && Object.keys(autoExpandMap).length > 0) {
      setExpandedNodes((prev) => ({ ...prev, ...autoExpandMap }));
    }
  }, [searchQuery, autoExpandMap]);

  // Expand / Collapse All Helpers
  const expandAll = () => {
    const newExpanded: Record<string, boolean> = { "tenant-root": true };
    const traverse = (node: TreeNode) => {
      if (node.children && node.children.length > 0) {
        newExpanded[node.id] = true;
        node.children.forEach(traverse);
      }
    };
    if (rawTree) {
      traverse(rawTree);
    }
    setExpandedNodes(newExpanded);
  };

  const collapseAll = () => {
    setExpandedNodes({ "tenant-root": true });
  };

  // Node Click Toggles
  const toggleNodeExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Panning Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(".org-card") ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setPanOffset({ x: 80, y: 40 });
    setZoomScale(1.0);
  };

  // Render Org Chart node recursively
  const renderOrgChartNode = (node: TreeNode, index = 0, total = 1) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] ?? node.id === "tenant-root";
    const isSelected = selectedNode?.id === node.id;

    // Check if this node or any child matches search query
    const isSearchMatch =
      searchQuery.trim() !== "" &&
      (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data?.user?.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data?.user?.department?.toLowerCase().includes(searchQuery.toLowerCase()));

    const getAccentColor = () => {
      switch (node.type) {
        case "tenant":
          return "bg-blue-600";
        case "workspace":
          return "bg-amber-500";
        case "workspace-members-group":
        case "projects-group":
          return "bg-purple-500";
        case "project":
          return "bg-emerald-500";
        case "workspace-member":
        case "project-member":
          return "bg-sky-500";
        default:
          return "bg-slate-400";
      }
    };

    const getAvatar = () => {
      if (node.type === "workspace-member" || node.type === "project-member") {
        const name = node.label;
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 border border-primary/15">
            {initials}
          </div>
        );
      }

      const size = 16;
      switch (node.type) {
        case "tenant":
          return (
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/15">
              <Building2 size={size} />
            </div>
          );
        case "workspace":
          return (
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/15">
              <Folder size={size} />
            </div>
          );
        case "workspace-members-group":
          return (
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/15">
              <Users size={size} />
            </div>
          );
        case "projects-group":
          return (
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/15">
              <FolderKanban size={size} />
            </div>
          );
        case "project":
          return (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/15">
              <Briefcase size={size} />
            </div>
          );
        default:
          return (
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
              <FolderTree size={size} />
            </div>
          );
      }
    };

    const getSubtext = () => {
      switch (node.type) {
        case "tenant":
          return "Organization Root";
        case "workspace":
          return "Workspace";
        case "workspace-members-group":
          return "Member Directory";
        case "projects-group":
          return "Project Directory";
        case "project":
          return "Project";
        case "workspace-member":
        case "project-member":
          return node.data?.user?.jobTitle || "Employee";
        default:
          return "";
      }
    };

    return (
      <div key={node.id} className="flex flex-col items-center relative animate-fade-in">
        {/* Horizontal connector line above child node */}
        {total > 1 && (
          <div
            className="absolute top-0 h-px bg-border/80"
            style={{
              left: index === 0 ? "50%" : "0",
              right: index === total - 1 ? "50%" : "0"
            }}
          />
        )}

        {/* Vertical connector line above child node */}
        {node.id !== "tenant-root" && <div className="w-px h-6 bg-border/80 shrink-0" />}

        {/* Node Card */}
        <div
          onClick={() => setSelectedNode(node)}
          className={cn(
            "org-card relative flex flex-col w-60 border rounded-xl bg-card shadow-sm hover:shadow-md hover:border-muted-foreground/30 transition-all duration-200 cursor-pointer select-none overflow-hidden shrink-0",
            isSelected ? "border-primary ring-2 ring-primary/20" : "",
            isSearchMatch ? "ring-2 ring-amber-500/40 border-amber-500" : ""
          )}
        >
          {/* Top colored accent bar */}
          <div className={cn("h-1 w-full", getAccentColor())} />

          <div className="p-3 flex items-center gap-3">
            {getAvatar()}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate" title={node.label}>
                {node.label}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate">{getSubtext()}</p>
            </div>
          </div>

          {/* Bottom toggle bar if node has children */}
          {hasChildren && (
            <button
              onClick={(e) => toggleNodeExpand(node.id, e)}
              className="w-full border-t bg-muted/30 hover:bg-muted/50 py-1.5 px-3 flex items-center justify-between text-[10px] font-medium text-muted-foreground transition-colors"
            >
              <span>{isExpanded ? "Collapse" : `Expand (${node.children!.length})`}</span>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
        </div>

        {/* Vertical connector line below parent card */}
        {hasChildren && isExpanded && <div className="w-px h-6 bg-border/80 shrink-0" />}

        {/* Render Children Row */}
        {hasChildren && isExpanded && (
          <div className="flex flex-row justify-center gap-6 relative pt-0">
            {node.children!.map((child, childIdx) =>
              renderOrgChartNode(child, childIdx, node.children!.length)
            )}
          </div>
        )}
      </div>
    );
  };

  // Render context-specific detail panel contents
  const renderDetailPanel = () => {
    if (!selectedNode) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
          <FolderTree size={48} className="stroke-[1.5] mb-4 text-muted-foreground/60" />
          <p className="text-sm font-medium">No node selected</p>
          <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
            Select any node in the org chart canvas to explore its details and analytics.
          </p>
        </div>
      );
    }

    const { type, label, data } = selectedNode;

    switch (type) {
      case "tenant":
        return (
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">
                Organization Root
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Overview and system metadata of the company context.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Workspaces</span>
                <p className="text-2xl font-bold text-foreground">{treeData.length}</p>
              </div>
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <div>
                  <Badge variant="default" className="mt-1 capitalize">
                    {data?.status || "Active"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="border rounded-xl bg-card/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Organization Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Slug ID</span>
                  <span className="font-medium text-foreground">{data?.slug}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Created Date</span>
                  <span className="font-medium text-foreground">
                    {data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case "workspace": {
        const settings = data?.settings || {};
        const expectedHours = settings.expectedWeeklyHours || 40;
        const targetHours = settings.dailyTargetHours || 8;
        const timezone = settings.timezone || "UTC";
        const weekStart = settings.weekStart || "monday";
        const approvalPeriod = settings.timesheetApprovalPeriod || "weekly";

        return (
          <div className="space-y-6">
            <div>
              <Badge
                variant="secondary"
                className="mb-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
              >
                Workspace
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Core workspace parameters and timesheet configurations.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Projects</span>
                <p className="text-2xl font-bold text-foreground">{data?.projects?.length || 0}</p>
              </div>
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Active Members</span>
                <p className="text-2xl font-bold text-foreground">{data?.members?.length || 0}</p>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Workspace settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Globe size={14} className="text-muted-foreground" />
                    {timezone}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Expected weekly hours</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Clock size={14} className="text-muted-foreground" />
                    {expectedHours}h / week
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Daily target hours</span>
                  <span className="font-medium text-foreground">{targetHours}h / day</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Week start</span>
                  <span className="font-medium text-foreground capitalize">{weekStart}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Approval period</span>
                  <span className="font-medium text-foreground capitalize">{approvalPeriod}</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "workspace-members-group":
        return (
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">
                Member Directory
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                List of all users provisioned directly in this workspace.
              </p>
            </div>
            <div className="p-8 border border-dashed rounded-xl bg-card/30 text-center">
              <Users size={32} className="mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">Workspace Members Folder</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Explore individual member nodes inside this folder to inspect roles, departments,
                and start dates.
              </p>
            </div>
          </div>
        );

      case "projects-group":
        return (
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2">
                Projects Directory
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                List of all active projects scoped inside this workspace.
              </p>
            </div>
            <div className="p-8 border border-dashed rounded-xl bg-card/30 text-center">
              <FolderKanban size={32} className="mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">Projects Folder</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Select specific project nodes to inspect the assigned project teams and active
                schedules.
              </p>
            </div>
          </div>
        );

      case "project": {
        const teamSize = data?.team?.members?.length || 0;
        return (
          <div className="space-y-6">
            <div>
              <Badge
                variant="secondary"
                className="mb-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
              >
                Project
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Parent Workspace: <strong className="text-foreground">{data?.workspaceName}</strong>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Team Size</span>
                <p className="text-2xl font-bold text-foreground">{teamSize} Employees</p>
              </div>
              <div className="p-4 border rounded-xl bg-card space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Project ID</span>
                <p
                  className="text-sm font-mono font-medium truncate text-foreground mt-1.5"
                  title={data?.id}
                >
                  {data?.id}
                </p>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Team Assigned</h3>
              {teamSize === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No team members assigned to this project team.
                </p>
              ) : (
                <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pr-1">
                  {data.team.members.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                        {(m.user?.name || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {m.user?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {m.role || "Member"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case "workspace-member":
      case "project-member": {
        const userDetails = data?.user || {};
        const memberName = userDetails.name || "Unknown Name";
        const email = userDetails.email || "N/A";
        const jobTitle = userDetails.jobTitle || "—";
        const department = userDetails.department || "—";
        const startRaw = userDetails.workStartDate;
        const activeState = data?.isActive !== false;

        const initials = memberName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center text-xl font-bold shrink-0 border border-sky-500/10 shadow-sm">
                {initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border-sky-500/20"
                  >
                    Employee Node
                  </Badge>
                  <Badge variant={activeState ? "default" : "secondary"}>
                    {activeState ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <h2
                  className="text-2xl font-bold tracking-tight text-foreground truncate"
                  title={memberName}
                >
                  {memberName}
                </h2>
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Mail size={14} className="shrink-0" />
                  {email}
                </p>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Job Title</span>
                  <strong className="text-foreground text-sm font-semibold">{jobTitle}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Department</span>
                  <strong className="text-foreground text-sm font-semibold">{department}</strong>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 text-sm space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar size={14} />
                    Work Start Date
                  </span>
                  <span className="font-medium text-foreground">
                    {startRaw ? new Date(startRaw).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Workspace context</span>
                  <span className="font-medium text-foreground">{data.workspaceName}</span>
                </div>
                {type === "workspace-member" ? (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Workspace Role</span>
                    <Badge variant="outline" className="uppercase">
                      {data.role}
                    </Badge>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Project Assigned</span>
                      <span className="font-medium text-foreground">{data.projectName}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Project Team Role</span>
                      <Badge variant="outline" className="uppercase">
                        {data.role}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <AppBar
        title="Workspaces Tree"
        description="Hierarchical distribution catalog for workspaces, projects, teams, and employee directories."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="shadow-sm"
          >
            <RefreshCw size={14} className={cn("mr-2", loading ? "animate-spin" : "")} />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-6 rounded-xl">
          <p className="text-sm font-semibold">Could not load workspaces tree</p>
          <p className="text-xs mt-1 text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
            Try again
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card/30">
          <Spinner size="lg" className="mb-4" />
          <p className="text-sm text-muted-foreground">Loading catalog tree structure…</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "grid gap-6 lg:grid-cols-5",
            isFullscreen ? "bg-background p-8 overflow-y-auto h-screen w-screen" : ""
          )}
        >
          {/* Left panel: interactive catalog tree canvas */}
          <Card
            className={cn(
              "lg:col-span-3 flex flex-col h-[700px] border shadow-sm rounded-xl overflow-hidden",
              isFullscreen ? "h-[calc(100vh-4rem)]" : ""
            )}
          >
            <CardHeader className="border-b bg-muted/20 pb-4 shrink-0 z-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderTree className="text-primary" size={18} />
                    Organization Chart Canvas
                  </CardTitle>
                  <CardDescription>
                    Drag the background to pan. Zoom or collapse nodes to navigate.
                  </CardDescription>
                </div>

                {/* Toolbar controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                  {/* Fullscreen control */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
                    className="h-8 w-8"
                  >
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </Button>

                  {/* Zoom controls */}
                  <div className="flex items-center border rounded-md h-8 bg-card shadow-sm px-1">
                    <button
                      onClick={() => setZoomScale((prev) => Math.max(prev - 0.1, 0.5))}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded disabled:opacity-40"
                      disabled={zoomScale <= 0.5}
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="text-[10px] font-mono px-1.5 select-none w-10 text-center shrink-0">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomScale((prev) => Math.min(prev + 0.1, 1.5))}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded disabled:opacity-40"
                      disabled={zoomScale >= 1.5}
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={resetView}
                      className="text-[9px] text-muted-foreground hover:text-foreground px-1 border-l ml-0.5"
                      title="Reset View & Zoom"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Expand/Collapse controls */}
                  <div className="flex items-center gap-1 border-l pl-1.5 ml-0.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAll}
                      className="h-7 text-[10px] px-2"
                    >
                      Expand all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAll}
                      className="h-7 text-[10px] px-2"
                    >
                      Collapse all
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search filter input */}
              <div className="relative mt-3 shrink-0">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog by name, job, department, role..."
                  className="pl-8 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent
              className={cn(
                "flex-1 relative overflow-hidden bg-muted/5 p-0 select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {filteredTree ? (
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                    transformOrigin: "0 0"
                  }}
                  className="absolute left-0 top-0 transition-transform duration-75 ease-out"
                >
                  <div className="p-8">{renderOrgChartNode(filteredTree)}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm font-medium">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search query parameters.
                  </p>
                </div>
              )}

              {/* Reset floating hint */}
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1.5 shadow-sm text-[10px] text-muted-foreground">
                <Compass size={12} />
                <span>Drag background to pan</span>
              </div>
            </CardContent>
          </Card>

          {/* Right panel: dynamic details panel */}
          <Card
            className={cn(
              "lg:col-span-2 border shadow-sm rounded-xl overflow-hidden flex flex-col h-[700px]",
              isFullscreen ? "h-[calc(100vh-4rem)]" : ""
            )}
          >
            <CardHeader className="border-b bg-muted/10 pb-4 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">Node Inspector</CardTitle>
              <CardDescription>Detailed specifications of selected node.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 bg-card/10">
              {renderDetailPanel()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
