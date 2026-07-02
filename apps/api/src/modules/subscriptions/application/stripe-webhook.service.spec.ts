import { ErrorCodes } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StripeWebhookService } from "./stripe-webhook.service";

describe("StripeWebhookService", () => {
  let service: StripeWebhookService;
  let mockStripeClient: { getClient: ReturnType<typeof vi.fn> };
  let mockPrisma: {
    stripeWebhookEvent: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  };
  let mockSync: { handleCheckoutCompleted: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      stripeWebhookEvent: {
        findUnique: vi.fn(),
        create: vi.fn()
      }
    };
    mockSync = {
      handleCheckoutCompleted: vi.fn()
    };
    mockStripeClient = {
      getClient: vi.fn()
    };
    service = new StripeWebhookService(
      mockStripeClient as never,
      mockPrisma as never,
      mockSync as never
    );
  });

  it("rejects invalid signature", () => {
    mockStripeClient.getClient.mockReturnValue({
      webhooks: {
        constructEvent: () => {
          throw new Error("bad sig");
        }
      }
    });
    Object.assign(service as unknown as { stripeClient: unknown }, {
      stripeClient: {
        getClient: mockStripeClient.getClient,
        getWebhookSecret: () => "whsec_test"
      }
    });

    const webhook = new StripeWebhookService(
      {
        getClient: mockStripeClient.getClient,
        getWebhookSecret: () => "whsec_test"
      } as never,
      mockPrisma as never,
      mockSync as never
    );

    expect(() => webhook.constructEvent(Buffer.from("{}"), "sig")).toThrow(
      expect.objectContaining({
        code: ErrorCodes.VALIDATION_ERROR
      })
    );
  });

  it("skips duplicate webhook events", async () => {
    mockPrisma.stripeWebhookEvent.findUnique.mockResolvedValue({ id: "evt_1" });
    const result = await service.processEvent({
      id: "evt_1",
      type: "checkout.session.completed"
    } as never);
    expect(result.processed).toBe(false);
    expect(mockPrisma.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });

  it("processes new checkout.session.completed events", async () => {
    mockPrisma.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    mockPrisma.stripeWebhookEvent.create.mockResolvedValue({ id: "evt_2" });

    const session = { metadata: { tenantId: "t-1" } };
    const result = await service.processEvent({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: session }
    } as never);

    expect(result.processed).toBe(true);
    expect(mockSync.handleCheckoutCompleted).toHaveBeenCalledWith(session);
  });
});
