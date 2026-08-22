import {
  createDeviceToken,
  revokeDeviceToken,
  listDeviceTokens,
  generatePairingCode,
} from "@/lib/db/devices";
import {
  createPairingRequest,
  getPairingRequest,
  approvePairingRequest,
  attachTokenToPairing,
  takePairingToken,
} from "@/lib/db/pairing";

export interface DeviceTokenData {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export class DeviceService {
  static async getDeviceTokens(userId: string): Promise<DeviceTokenData[]> {
    const deviceTokens = await listDeviceTokens(userId);

    return deviceTokens.map((d) => ({
      id: d.id,
      label: d.label ?? null,
      createdAt: d.createdAt.toISOString(),
      lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
      revoked: !!d.revokedAt,
    }));
  }

  /**
   * Extension pairing — step 1. Initializes a pairing request with a generated or
   * provided pairing code. Returns the code and expiration time.
   */
  static async initPairing(code?: string) {
    const pairingCode = code ?? generatePairingCode();

    // Reject collisions
    const existing = await getPairingRequest(pairingCode);
    if (existing) {
      throw new Error("code already in use");
    }

    const request = await createPairingRequest(pairingCode);
    return {
      code: pairingCode,
      expiresAt: request.expiresAt.toISOString(),
    };
  }

  /**
   * Extension pairing — approve. Approves a pending pairing request and mints
   * a device token for the user/workspace. Returns the raw token (stored hashed after this).
   */
  static async approvePairing(code: string, userId: string, workspaceId: string, label?: string) {
    const pairing = await getPairingRequest(code);
    if (!pairing) throw new Error("Pairing request not found");
    if (pairing.status === "approved") throw new Error("This device was already approved");
    if (pairing.status === "expired") throw new Error("Pairing request expired");

    const approved = await approvePairingRequest(code, userId, workspaceId);
    if (!approved) throw new Error("Pairing request expired or already approved");

    const { token } = await createDeviceToken(userId, workspaceId, label ?? "Chrome extension");

    // Bridge the token to the extension's status poll (one-time retrieval).
    await attachTokenToPairing(code, token);

    return { token };
  }

  /**
   * Extension pairing — status poll. Returns the status and token if approved
   * (token returned exactly once, then cleared).
   */
  static async getPairingStatus(code: string) {
    const pairing = await getPairingRequest(code);
    if (!pairing) throw new Error("Pairing request not found");

    const status = pairing.status;

    if (status === "approved") {
      const token = await takePairingToken(pairing.id);
      return { status: "approved" as const, token };
    }

    return { status, token: null };
  }

  /**
   * Revoke a device token (owned by the user).
   */
  static async revokeDevice(deviceId: string, userId: string) {
    const revoked = await revokeDeviceToken(deviceId, userId);
    if (!revoked) throw new Error("Device not found");
    return revoked;
  }

  /**
   * Get a pairing request by code (used by server components).
   */
  static async getPairing(code: string) {
    return await getPairingRequest(code);
  }
}
