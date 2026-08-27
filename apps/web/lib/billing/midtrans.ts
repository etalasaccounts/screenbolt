import crypto from "crypto";

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
const BASE_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

export type SnapTokenParams = {
  orderId: string;
  grossAmount: number; // in IDR
  customerName: string;
  customerEmail: string;
  planLabel: string; // e.g. "Screenbolt Pro"
};

export async function createSnapToken(
  params: SnapTokenParams,
): Promise<{ token: string; redirectUrl: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not set");

  const credentials = Buffer.from(`${serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    item_details: [
      {
        id: "item-1",
        price: params.grossAmount,
        quantity: 1,
        name: params.planLabel,
      },
    ],
  };

  const response = await fetch(`${BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Midtrans] ${response.status} | key prefix: ${serverKey.slice(0, 12)} | body: ${text}`);
    throw new Error(`Midtrans SNAP error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return { token: data.token, redirectUrl: data.redirect_url };
}

const STATUS_BASE_URL = IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

export type TransactionStatusResponse = {
  order_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  transaction_id: string;
  fraud_status?: string;
};

/** Docs: success = settlement|capture AND fraud_status (if present) = accept */
export function isSuccessfulTransaction(
  transactionStatus: string,
  fraudStatus?: string,
): boolean {
  if (transactionStatus !== "settlement" && transactionStatus !== "capture") return false;
  if (fraudStatus && fraudStatus !== "accept") return false;
  return true;
}

export async function getTransactionStatus(orderId: string): Promise<TransactionStatusResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not set");

  const credentials = Buffer.from(`${serverKey}:`).toString("base64");
  const response = await fetch(`${STATUS_BASE_URL}/${orderId}/status`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Midtrans status check error ${response.status}: ${text}`);
  }

  return response.json();
}

export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}
