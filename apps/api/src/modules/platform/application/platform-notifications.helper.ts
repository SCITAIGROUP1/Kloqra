import { PlatformNotificationType } from "@kloqra/contracts";
import type { PlatformNotificationsDispatchService } from "./platform-notifications-dispatch.service";

export function notifyTenantCreated(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; name: string; slug: string; excludePlatformUserId?: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.TENANT_CREATED,
      title: "Tenant created",
      body: `${input.name} (${input.slug}) was provisioned.`,
      metadata: { href: `/tenants/${input.tenantId}`, tenantId: input.tenantId },
      excludePlatformUserId: input.excludePlatformUserId
    })
    .catch(() => undefined);
}

export function notifyTenantUpdated(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; name: string; excludePlatformUserId?: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.TENANT_UPDATED,
      title: "Tenant updated",
      body: `${input.name} was updated.`,
      metadata: { href: `/tenants/${input.tenantId}`, tenantId: input.tenantId },
      excludePlatformUserId: input.excludePlatformUserId
    })
    .catch(() => undefined);
}

export function notifyTenantSuspended(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; name: string; excludePlatformUserId?: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.TENANT_SUSPENDED,
      title: "Tenant suspended",
      body: `${input.name} was suspended.`,
      metadata: {
        href: `/tenants/${input.tenantId}`,
        tenantId: input.tenantId,
        variant: "warning"
      },
      excludePlatformUserId: input.excludePlatformUserId
    })
    .catch(() => undefined);
}

export function notifyTenantChurned(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; name: string; excludePlatformUserId?: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.TENANT_CHURNED,
      title: "Tenant churned",
      body: `${input.name} was marked churned.`,
      metadata: {
        href: `/tenants/${input.tenantId}`,
        tenantId: input.tenantId,
        variant: "attention"
      },
      excludePlatformUserId: input.excludePlatformUserId
    })
    .catch(() => undefined);
}

export function notifyTenantDeleted(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; name: string; excludePlatformUserId?: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.TENANT_DELETED,
      title: "Tenant deleted",
      body: `${input.name} was permanently deleted.`,
      metadata: { tenantId: input.tenantId, variant: "warning" },
      excludePlatformUserId: input.excludePlatformUserId
    })
    .catch(() => undefined);
}

export function notifySubscriptionDrift(
  dispatch: PlatformNotificationsDispatchService,
  input: { driftCount: number }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.SUBSCRIPTION_DRIFT,
      title: "Subscription drift detected",
      body: `${input.driftCount} tenant subscription(s) may be out of sync with Stripe.`,
      metadata: { href: "/ops", variant: "warning" }
    })
    .catch(() => undefined);
}

export function notifyQueueFailures(
  dispatch: PlatformNotificationsDispatchService,
  input: { queueName: string; failedCount: number }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.QUEUE_FAILURE,
      title: "Queue failures detected",
      body: `${input.queueName} queue has ${input.failedCount} failed job(s).`,
      metadata: { href: "/ops", variant: "warning" }
    })
    .catch(() => undefined);
}

export function notifySalesInquiry(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; tenantName: string; planName: string; message?: string | null }
): void {
  const snippet = input.message?.trim() ? ` Message: ${input.message.trim().slice(0, 200)}` : "";
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.SALES_INQUIRY,
      title: `Sales inquiry — ${input.planName}`,
      body: `${input.tenantName} requested ${input.planName}.${snippet}`,
      metadata: {
        href: `/tenants/${input.tenantId}`,
        tenantId: input.tenantId,
        variant: "attention"
      }
    })
    .catch(() => undefined);
}

export function notifySalesReceiptUploaded(
  dispatch: PlatformNotificationsDispatchService,
  input: { tenantId: string; tenantName: string; planName: string; inquiryId: string }
): void {
  void dispatch
    .notifyAll({
      type: PlatformNotificationType.SALES_RECEIPT_UPLOADED,
      title: "Payment receipt uploaded",
      body: `${input.tenantName} uploaded a receipt for ${input.planName}.`,
      metadata: {
        href: `/tenants/${input.tenantId}`,
        tenantId: input.tenantId,
        inquiryId: input.inquiryId,
        variant: "info"
      }
    })
    .catch(() => undefined);
}
