import dynamic from "next/dynamic";

const AdminTimeTrackerPage = dynamic(
  () =>
    import("@/features/time-tracker/time-tracker-page").then((m) => ({
      default: m.AdminTimeTrackerPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <AdminTimeTrackerPage />;
}
