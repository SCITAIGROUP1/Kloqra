import { SubscriptionDetailPage } from "@/features/subscriptions/subscription-detail-page";

export default async function Page({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <SubscriptionDetailPage tenantId={tenantId} />;
}
