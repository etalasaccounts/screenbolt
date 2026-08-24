import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { getUserPlan } from "@/lib/billing/plans";
import { BillingService } from "@/lib/services/billing.service";
import { BillingView } from "./_components/billing-view";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [plan, subscription] = await Promise.all([
    getUserPlan(user.id),
    BillingService.getUserSubscription(user.id),
  ]);

  const clientKey = process.env.MIDTRANS_CLIENT_KEY ?? "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  return (
    <BillingView
      plan={plan}
      subscription={
        subscription
          ? {
              status: subscription.status,
              currentPeriodEnd:
                subscription.currentPeriodEnd?.toISOString() ?? null,
            }
          : null
      }
      clientKey={clientKey}
      isProduction={isProduction}
    />
  );
}
