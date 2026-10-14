import { prisma } from "@/lib/server/prisma";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  DEFAULT_MPESA_TILL_NUMBER,
  DEFAULT_WHATSAPP_NUMBER,
} from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Payment configuration                                               */
/*                                                                     */
/* Contact and payment-method values are stored in the SystemSetting   */
/* "global" record and are editable from the admin console. A legacy   */
/* contact.mpesaNumber is interpreted as the WhatsApp contact number;  */
/* Till remains unset until operations configures a separate value.     */
/* ------------------------------------------------------------------ */

export interface PaymentConfigContact {
  adminName: string;
  adminEmail: string;
  whatsappNumber: string;
  mpesaTillNumber: string;
}

export interface PaymentConfig {
  contact: PaymentConfigContact;
  enabledMethods: ("mpesa" | "paypal")[];
}

export const PAYMENT_CONFIG_DEFAULTS: PaymentConfig = {
  contact: {
    adminName: ADMIN_NAME,
    adminEmail: ADMIN_EMAIL,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    mpesaTillNumber: DEFAULT_MPESA_TILL_NUMBER,
  },
  enabledMethods: ["paypal"],
};

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "global" } });
    const global = (setting?.value ?? {}) as {
      contact?: Partial<PaymentConfigContact> & { mpesaNumber?: string };
      payments?: Partial<Record<"mpesa" | "paypal", boolean>>;
    };
    const savedContact = global.contact ?? {};
    const tillNumber = savedContact.mpesaTillNumber;
    const contact: PaymentConfigContact = {
      adminName: savedContact.adminName || PAYMENT_CONFIG_DEFAULTS.contact.adminName,
      adminEmail: savedContact.adminEmail || PAYMENT_CONFIG_DEFAULTS.contact.adminEmail,
      whatsappNumber:
        savedContact.whatsappNumber ||
        savedContact.mpesaNumber ||
        PAYMENT_CONFIG_DEFAULTS.contact.whatsappNumber,
      mpesaTillNumber: typeof tillNumber === "string" ? tillNumber.trim() : "",
    };
    const payments = global.payments ?? {};
    const enabledMethods = (["mpesa", "paypal"] as const).filter((method) => {
      const enabled =
        payments[method] === undefined
          ? PAYMENT_CONFIG_DEFAULTS.enabledMethods.includes(method)
          : payments[method];
      if (!enabled) return false;
      return method !== "mpesa" || contact.mpesaTillNumber.length > 0;
    });
    return { contact, enabledMethods };
  } catch {
    return PAYMENT_CONFIG_DEFAULTS;
  }
}

/* ------------------------------------------------------------------ */
/* Provider availability (driven by server-side environment variables  */
/* ------------------------------------------------------------------ */

const mpesaEnv = () => ({
  consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
  consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
  passkey: process.env.MPESA_PASSKEY ?? "",
  shortcode: process.env.MPESA_SHORTCODE ?? "",
  environment: process.env.MPESA_ENVIRONMENT ?? "sandbox",
});

export function isMpesaLiveConfigured() {
  const e = mpesaEnv();
  return Boolean(e.consumerKey && e.consumerSecret && e.passkey && e.shortcode);
}

const paypalEnv = () => ({
  clientId: process.env.PAYPAL_CLIENT_ID ?? "",
  clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  mode: process.env.PAYPAL_MODE ?? "sandbox",
  currency: process.env.PAYPAL_CURRENCY ?? "USD",
});

export function isPaypalLiveConfigured() {
  const e = paypalEnv();
  return Boolean(e.clientId && e.clientSecret);
}

/* ------------------------------------------------------------------ */
/* Safaricom Daraja API (official endpoints)                           */
/* ------------------------------------------------------------------ */
/* Enabled only when MPESA_* credentials are present. In the prototype */
/* the simulated STK flow is used instead, and no live prompt is sent. */

const darajaBase = (env: string) =>
  env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

async function darajaToken(env: ReturnType<typeof mpesaEnv>) {
  const auth = Buffer.from(`${env.consumerKey}:${env.consumerSecret}`).toString("base64");
  const url = `${darajaBase(env.environment)}/oauth/v1/generate?grant_type=client_credentials`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Daraja OAuth failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Daraja did not return an access token.");
  return body.access_token;
}

function darajaTimestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export interface StkPushRequest {
  phone: string;
  amount: number;
  reference: string;
  accountReference: string;
  description: string;
  callbackUrl: string;
}

export async function initiateMpesaStkPush(input: StkPushRequest) {
  const env = mpesaEnv();
  if (!isMpesaLiveConfigured()) return null;
  const token = await darajaToken(env);
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${env.shortcode}${env.passkey}${timestamp}`).toString("base64");
  const res = await fetch(`${darajaBase(env.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: env.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(input.amount),
      PartyA: input.phone,
      PartyB: env.shortcode,
      PhoneNumber: input.phone,
      CallBackURL: input.callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.description.slice(0, 13),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    ResponseDescription?: string;
  };
  if (body.ResponseCode && body.ResponseCode !== "0") {
    throw new Error(body.ResponseDescription || "M-Pesa STK push was rejected.");
  }
  return {
    checkoutRequestId: body.CheckoutRequestID ?? "",
    merchantRequestId: body.MerchantRequestID ?? "",
    raw: body,
  };
}

export interface StkQueryResult {
  resultCode: string;
  resultDesc: string;
}

export async function queryMpesaStk(checkoutRequestId: string): Promise<StkQueryResult | null> {
  const env = mpesaEnv();
  if (!isMpesaLiveConfigured()) return null;
  const token = await darajaToken(env);
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${env.shortcode}${env.passkey}${timestamp}`).toString("base64");
  const res = await fetch(`${darajaBase(env.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: env.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ResultCode?: string;
    ResultDesc?: string;
  };
  if (body.ResultCode === undefined || body.ResultCode === null) return null;
  return { resultCode: String(body.ResultCode), resultDesc: body.ResultDesc ?? "" };
}

/* ------------------------------------------------------------------ */
/* Safaricom Daraja Dynamic QR (official endpoint)                     */
/* ------------------------------------------------------------------ */
/* Requires only OAuth consumer credentials; the Till number is sent   */
/* as the credit party identifier (CPI). Results are cached briefly to */
/* avoid regenerating identical QR payloads.                           */

export type MpesaQrTrxCode = "BG" | "PB" | "WA" | "SB" | "SM";

export interface MpesaQrInput {
  tillNumber: string;
  amount: number;
  merchantName?: string;
  reference?: string;
  trxCode?: MpesaQrTrxCode;
  size?: "300" | "500";
}

export interface MpesaQrResult {
  image: string;
  base64: string;
  amount: number;
  responseDescription: string;
}

const QR_CACHE_TTL_MS = 10 * 60 * 1000;
const qrCache = new Map<string, { result: MpesaQrResult; expiresAt: number }>();

export function isMpesaQrConfigured() {
  const e = mpesaEnv();
  return Boolean(e.consumerKey && e.consumerSecret);
}

export async function generateMpesaQr(input: MpesaQrInput): Promise<MpesaQrResult> {
  const env = mpesaEnv();
  if (!isMpesaQrConfigured()) throw new Error("M-Pesa QR is not configured.");
  const amount = Math.min(Math.max(Math.round(input.amount), 1), 999_999);
  const cacheKey = `${env.environment}:${input.tillNumber}:${amount}:${input.reference ?? ""}`;
  const cached = qrCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const token = await darajaToken(env);
  const res = await fetch(`${darajaBase(env.environment)}/mpesa/qrcode/v1/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      MerchantName: (input.merchantName || "Zentra").slice(0, 26),
      RefNo: (input.reference || `ZENTRA${input.tillNumber}`).slice(0, 12),
      Amount: amount,
      TrxCode: input.trxCode ?? "BG",
      CPI: input.tillNumber,
      Size: input.size ?? "300",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    QRCode?: string;
  };
  if (!res.ok || (body.ResponseCode && body.ResponseCode !== "0") || !body.QRCode) {
    throw new Error(body.ResponseDescription || `Daraja QR generation failed (${res.status}).`);
  }
  const base64 = body.QRCode;
  const result: MpesaQrResult = {
    image: base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`,
    base64,
    amount,
    responseDescription: body.ResponseDescription ?? "",
  };
  qrCache.set(cacheKey, { result, expiresAt: Date.now() + QR_CACHE_TTL_MS });
  return result;
}

/* ------------------------------------------------------------------ */
/* PayPal Orders API v2 (official endpoints)                           */
/* ------------------------------------------------------------------ */
/* Enabled only when PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are set.  */

const paypalBase = (mode: string) =>
  mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function paypalToken(env: ReturnType<typeof paypalEnv>) {
  const auth = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
  const res = await fetch(`${paypalBase(env.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("PayPal did not return an access token.");
  return body.access_token;
}

export interface PaypalOrderInput {
  amount: number;
  reference: string;
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaypalOrderResult {
  orderId: string;
  approveUrl: string;
  status: string;
}

export async function createPaypalOrder(input: PaypalOrderInput): Promise<PaypalOrderResult | null> {
  const env = paypalEnv();
  if (!isPaypalLiveConfigured()) return null;
  const token = await paypalToken(env);
  const res = await fetch(`${paypalBase(env.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.idempotencyKey,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.reference,
          invoice_id: input.reference,
          amount: {
            currency_code: env.currency,
            value: input.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Zentra",
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    links?: { rel: string; href: string }[];
  };
  if (!res.ok || !body.id) throw new Error("Could not create PayPal order.");
  const approve = body.links?.find((l) => l.rel === "approve");
  return {
    orderId: body.id,
    approveUrl: approve?.href ?? "",
    status: body.status ?? "",
  };
}

export interface PaypalCaptureResult {
  status: string;
  captureId: string;
  grossAmount: number;
  currency: string;
}

export async function capturePaypalOrder(orderId: string): Promise<PaypalCaptureResult | null> {
  const env = paypalEnv();
  if (!isPaypalLiveConfigured()) return null;
  const token = await paypalToken(env);
  const res = await fetch(`${paypalBase(env.mode)}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: string;
    purchase_units?: {
      payments?: {
        captures?: { id?: string; amount?: { value?: string; currency_code?: string }; status?: string }[];
      };
    }[];
  };
  if (!res.ok) return null;
  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: body.status ?? "",
    captureId: capture?.id ?? "",
    grossAmount: Number(capture?.amount?.value ?? 0),
    currency: capture?.amount?.currency_code ?? env.currency,
  };
}

export { darajaBase };
