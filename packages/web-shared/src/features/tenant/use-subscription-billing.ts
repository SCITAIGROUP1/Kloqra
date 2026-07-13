"use client";

import {
  ROUTES,
  type ChangeSubscriptionPlanDto,
  type CheckoutSessionResponseDto,
  type CreateCheckoutSessionDto,
  type CreateSalesInquiryDto,
  type PortalSessionResponseDto,
  type SalesInquiryDto,
  type TenantSubscriptionDto
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useCreateCheckoutSession() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = useCallback(
    async (input: CreateCheckoutSessionDto) => {
      if (!ws) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await api<CheckoutSessionResponseDto>(ROUTES.TENANTS.CHECKOUT, {
          method: "POST",
          workspaceId: ws,
          body: JSON.stringify(input)
        });
        return result.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [ws]
  );

  return { createCheckout, loading, error };
}

export function useChangeSubscriptionPlan() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePlan = useCallback(
    async (input: ChangeSubscriptionPlanDto) => {
      if (!ws) return null;
      setLoading(true);
      setError(null);
      try {
        return await api<TenantSubscriptionDto>(ROUTES.TENANTS.SUBSCRIPTION, {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify(input)
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not change plan");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [ws]
  );

  return { changePlan, loading, error };
}

export function useCreatePortalSession() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPortal = useCallback(async () => {
    if (!ws) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await api<PortalSessionResponseDto>(ROUTES.TENANTS.PORTAL, {
        method: "POST",
        workspaceId: ws
      });
      return result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
      return null;
    } finally {
      setLoading(false);
    }
  }, [ws]);

  return { createPortal, loading, error };
}

export function useSalesInquiry() {
  // Tenant-scoped: works in organization account mode without a workspace header.
  const workspaceId = useTenantApiWorkspaceId();
  const [inquiry, setInquiry] = useState<SalesInquiryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<SalesInquiryDto | null>(
        ROUTES.TENANTS.SALES_INQUIRY,
        tenantApiOptions(workspaceId)
      );
      setInquiry(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sales inquiry");
      setInquiry(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { inquiry, loading, error, reload, setInquiry };
}

export function useSubmitSalesInquiry() {
  const workspaceId = useTenantApiWorkspaceId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: CreateSalesInquiryDto) => {
      setLoading(true);
      setError(null);
      try {
        return await api<SalesInquiryDto>(ROUTES.TENANTS.SALES_INQUIRY, {
          method: "POST",
          ...tenantApiOptions(workspaceId),
          body: JSON.stringify(input)
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit sales inquiry");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  return { submit, loading, error };
}

export function useUploadSalesReceipt() {
  const workspaceId = useTenantApiWorkspaceId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        return await api<SalesInquiryDto>(ROUTES.TENANTS.SALES_INQUIRY_RECEIPTS, {
          method: "POST",
          ...tenantApiOptions(workspaceId),
          body: form
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not upload receipt");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  return { upload, loading, error };
}
