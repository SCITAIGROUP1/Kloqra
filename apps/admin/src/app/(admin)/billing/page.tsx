import { redirect } from "next/navigation";
import { BillingPage } from "@/features/billing/billing-page";
import { isClientCommercialFeaturesEnabled } from "@/lib/client-commercial-features";

export default function Page() {
  if (!isClientCommercialFeaturesEnabled()) {
    redirect("/dashboard");
  }
  return <BillingPage />;
}
