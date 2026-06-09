import { ProjectDetailShell } from "@/features/projects/project-detail-shell";

export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return <ProjectDetailShell>{children}</ProjectDetailShell>;
}
