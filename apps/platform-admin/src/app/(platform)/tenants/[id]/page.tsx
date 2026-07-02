import { TenantDetailPage } from "@/features/tenants/tenant-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TenantDetailPage tenantId={id} />;
}
