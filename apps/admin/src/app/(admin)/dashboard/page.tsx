import dynamic from "next/dynamic";

const DashboardPage = dynamic(
  () => import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })),
  { loading: () => null }
);

export default function Page() {
  return <DashboardPage />;
}
