import dynamic from "next/dynamic";

const SubmissionsPage = dynamic(
  () =>
    import("@/features/submissions/submissions-page").then((m) => ({
      default: m.SubmissionsPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <SubmissionsPage />;
}
