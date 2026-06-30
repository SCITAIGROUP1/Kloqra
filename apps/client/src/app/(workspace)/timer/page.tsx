import dynamic from "next/dynamic";

const TimerPage = dynamic(
  () =>
    import("@/features/timer/timer-page").then((m) => ({
      default: m.TimerPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <TimerPage />;
}
