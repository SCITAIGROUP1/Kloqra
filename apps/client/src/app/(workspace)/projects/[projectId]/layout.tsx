import { MemberProjectDetailShell } from "@/features/projects/project-detail-shell";

export default function MemberProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return <MemberProjectDetailShell>{children}</MemberProjectDetailShell>;
}
