import dynamic from "next/dynamic";

const TimesheetPage = dynamic(
  () =>
    import("@/features/timesheet/timesheet-page").then((m) => ({
      default: m.TimesheetPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <TimesheetPage />;
}
