import { PlanEditPage } from "@/features/plans/plan-edit-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanEditPage planId={id} />;
}
