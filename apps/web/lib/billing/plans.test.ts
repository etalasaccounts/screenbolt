import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "@/lib/shared/errors";

vi.mock("@/lib/db/subscriptions", () => ({
  getUserSubscription: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { getUserSubscription } from "@/lib/db/subscriptions";
import { db } from "@/lib/db";
import { getUserPlan, getPlanLimits, assertVideoQuota, assertDurationAllowed } from "./plans";

const mockGetUserSubscription = vi.mocked(getUserSubscription);
const mockDb = vi.mocked(db);

function mockVideoCount(total: number) {
  (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total }]),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVideoCount(0);
});

describe("getUserPlan", () => {
  it("returns free when no subscription exists", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns free when subscription is expired", async () => {
    mockGetUserSubscription.mockResolvedValue({
      id: "sub-1", userId: "user-1", plan: "pro", status: "expired",
      midtransOrderId: null, midtransTransactionId: null,
      currentPeriodStart: null, currentPeriodEnd: new Date("2020-01-01"),
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(await getUserPlan("user-1")).toBe("free");
  });

  it("returns pro when subscription is active and not expired", async () => {
    const future = new Date(Date.now() + 86400_000);
    mockGetUserSubscription.mockResolvedValue({
      id: "sub-1", userId: "user-1", plan: "pro", status: "active",
      midtransOrderId: null, midtransTransactionId: null,
      currentPeriodStart: null, currentPeriodEnd: future,
      createdAt: new Date(), updatedAt: new Date(),
    });
    expect(await getUserPlan("user-1")).toBe("pro");
  });
});

describe("getPlanLimits", () => {
  it("returns correct limits for free", () => {
    const limits = getPlanLimits("free");
    expect(limits.maxVideos).toBe(15);
    expect(limits.maxDurationSeconds).toBe(300);
    expect(limits.addAudio).toBe(false);
  });

  it("returns correct limits for pro", () => {
    const limits = getPlanLimits("pro");
    expect(limits.maxVideos).toBeNull();
    expect(limits.maxDurationSeconds).toBe(1800);
    expect(limits.addAudio).toBe(true);
  });

  it("returns correct limits for business", () => {
    const limits = getPlanLimits("business");
    expect(limits.maxVideos).toBeNull();
    expect(limits.maxDurationSeconds).toBeNull();
    expect(limits.addAudio).toBe(true);
  });
});

describe("assertVideoQuota", () => {
  it("does not throw when free user has fewer than 15 videos", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    mockVideoCount(14);
    await expect(assertVideoQuota("user-1")).resolves.toBeUndefined();
  });

  it("throws ValidationError when free user has exactly 15 videos", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    mockVideoCount(15);
    await expect(assertVideoQuota("user-1")).rejects.toThrow(ValidationError);
  });

  it("does not throw when pro user has many videos", async () => {
    const future = new Date(Date.now() + 86400_000);
    mockGetUserSubscription.mockResolvedValue({
      id: "sub-1", userId: "user-1", plan: "pro", status: "active",
      midtransOrderId: null, midtransTransactionId: null,
      currentPeriodStart: null, currentPeriodEnd: future,
      createdAt: new Date(), updatedAt: new Date(),
    });
    mockVideoCount(100);
    await expect(assertVideoQuota("user-1")).resolves.toBeUndefined();
  });
});

describe("assertDurationAllowed", () => {
  it("does not throw when free user is within 300s", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    await expect(assertDurationAllowed("user-1", 300)).resolves.toBeUndefined();
  });

  it("throws ValidationError when free user exceeds 300s", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    await expect(assertDurationAllowed("user-1", 301)).rejects.toThrow(ValidationError);
  });

  it("allows up to 1800s for pro", async () => {
    const future = new Date(Date.now() + 86400_000);
    mockGetUserSubscription.mockResolvedValue({
      id: "sub-1", userId: "user-1", plan: "pro", status: "active",
      midtransOrderId: null, midtransTransactionId: null,
      currentPeriodStart: null, currentPeriodEnd: future,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await expect(assertDurationAllowed("user-1", 1800)).resolves.toBeUndefined();
    await expect(assertDurationAllowed("user-1", 1801)).rejects.toThrow(ValidationError);
  });

  it("allows any duration for business", async () => {
    const future = new Date(Date.now() + 86400_000);
    mockGetUserSubscription.mockResolvedValue({
      id: "sub-1", userId: "user-1", plan: "business", status: "active",
      midtransOrderId: null, midtransTransactionId: null,
      currentPeriodStart: null, currentPeriodEnd: future,
      createdAt: new Date(), updatedAt: new Date(),
    });
    await expect(assertDurationAllowed("user-1", 99999)).resolves.toBeUndefined();
  });
});
