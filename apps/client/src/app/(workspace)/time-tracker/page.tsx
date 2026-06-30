import dynamic from "next/dynamic";

const TimeTrackerPage = dynamic(
  () =>
    import("@/features/time-tracker/time-tracker-page").then((m) => ({
      default: m.TimeTrackerPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <TimeTrackerPage />;
}
