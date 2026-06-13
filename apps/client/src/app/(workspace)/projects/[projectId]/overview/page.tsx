import dynamic from "next/dynamic";

const MemberProjectOverview = dynamic(
  () =>
    import("@/features/projects/member-project-overview").then((m) => ({
      default: m.MemberProjectOverview
    })),
  { loading: () => null }
);

export default function MemberProjectOverviewPage() {
  return <MemberProjectOverview />;
}
