import { prisma } from "@/lib/server/prisma";
import { fail, ok, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapDeposit } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";
import { PAYMENT_METHOD_META } from "@/lib/constants";
import {
  createPaypalOrder,
  getPaymentConfig,
  initiateMpesaStkPush,
  isMpesaLiveConfigured,
  isPaypalLiveConfigured,
} from "@/lib/server/payments";
import { isUniqueConstraintError, operationReference, readIdempotencyKey } from "@/lib/server/idempotency";
import { parsePositiveMoney } from "@/lib/server/money";
import { getGlobalSettings } from "@/lib/server/settings";
import { normalizePhoneKE } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);
    const { searchParams } = new URL(req.url);
    const rawLimit = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

    const deposits = await prisma.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return ok(deposits.map(mapDeposit));
  } catch (error) {
    return serverError(error);
  }
}

async function replayDeposit(
  userId: string,
  reference: string,
  input: { amountCents: number; phone: string; method: PaymentMethod; providerReference: string }
) {
  const existing = await prisma.deposit.findUnique({ where: { reference } });
  if (!existing) return null;

  const matches =
    existing.userId === userId &&
    Math.round(Number(existing.amount) * 100) === input.amountCents &&
    existing.phone === input.phone &&
    existing.method === input.method &&
    (existing.providerReference ?? "") === input.providerReference;
  if (!matches) {
    return fail("This request key was already used for a different deposit.", "idempotency_conflict", undefined, 409);
  }
  if (existing.status === "initiated") {
    return fail("Your payment request is still being processed. Retry shortly.", "payment_in_progress", undefined, 409);
  }
  if (existing.status === "failed" || existing.status === "cancelled") {
    return fail("This deposit attempt has ended. Start a new deposit to try again.", "previous_attempt_closed", undefined, 409);
  }

  const paypal = existing.checkoutRequestId && existing.providerApprovalUrl
    ? {
        paypal: {
          orderId: existing.checkoutRequestId,
          approveUrl: existing.providerApprovalUrl,
          status: "CREATED",
        },
      }
    : {};
  const verificationNote = existing.method === "paypal" && !existing.checkoutRequestId
    ? "Your PayPal payment is pending verification. Your Deposit Wallet is credited only after the payment is confirmed by operations."
    : undefined;
  const demoNote = existing.method === "mpesa" && existing.checkoutRequestId?.endsWith("_DEMO")
    ? "No live STK push was sent. This simulated prompt updates the payment status automatically; no real payment is made."
    : undefined;

  return ok({
    deposit: mapDeposit(existing),
    ...paypal,
    ...(verificationNote ? { verificationNote } : {}),
    ...(demoNote ? { demoNote } : {}),
  });
}

export async function POST(req: Request) {
  const retryRequest = req.clone();
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const settings = await getGlobalSettings();
    if (settings.maintenanceMode || !settings.depositsEnabled) {
      return fail("Deposits are temporarily paused. Please try again later.", "deposits_disabled", undefined, 503);
    }

    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey) {
      return fail("A valid Idempotency-Key header is required.", "idempotency_key_required");
    }

    const body = await req.json();
    const phone = normalizePhoneKE(String(body.phone ?? ""));
    const parsedAmount = parsePositiveMoney(body.amount);
    const method: PaymentMethod = body.method === "paypal" ? "paypal" : "mpesa";
    const providerReference = String(body.providerReference ?? "").trim();
    if (!parsedAmount) return fail("Enter a valid amount with no more than two decimal places.", "invalid_amount");
    const amount = parsedAmount.value;
    const reference = operationReference("DEP", user.id, idempotencyKey);

    const previous = await replayDeposit(user.id, reference, {
      amountCents: parsedAmount.cents,
      phone,
      method,
      providerReference,
    });
    if (previous) return previous;

    if (method === "mpesa" && !Number.isInteger(amount)) {
      return fail("M-Pesa deposits must be a whole number of shillings.", "invalid_amount", {
        amount: "Enter a whole number of shillings for M-Pesa.",
      });
    }

    const paymentConfig = await getPaymentConfig();
    if (method === "mpesa" && !paymentConfig.contact.mpesaTillNumber) {
      return fail(
        "M-Pesa deposits are unavailable until a Till number is configured.",
        "method_unconfigured",
        { method: "Choose PayPal or ask an administrator to configure an M-Pesa Till." },
        409
      );
    }
    if (!paymentConfig.enabledMethods.includes(method)) {
      return fail(`${PAYMENT_METHOD_META[method].label} payments are currently disabled.`, "method_disabled", {
        method: "Choose an available payment method.",
      });
    }
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return fail("Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678.", "invalid_phone", {
        phone: "Use a format like 0712 345 678.",
      });
    }
    if (amount < settings.minDeposit) {
      return fail(`The minimum deposit is KES ${settings.minDeposit.toLocaleString()}.`, "below_min", {
        amount: `Minimum KES ${settings.minDeposit.toLocaleString()}.`,
      });
    }
    if (amount > settings.maxDeposit) {
      return fail(`The maximum deposit is KES ${settings.maxDeposit.toLocaleString()}.`, "above_max", {
        amount: `Maximum KES ${settings.maxDeposit.toLocaleString()}.`,
      });
    }
    if (method === "paypal" && !providerReference) {
      return fail(
        "Enter the PayPal transaction ID (or reference) you will send, so the payment can be matched.",
        "reference_required",
        { providerReference: "A PayPal transaction reference is required." }
      );
    }
    if (method === "paypal" && !/^[A-Za-z0-9-_]{6,64}$/.test(providerReference)) {
      return fail("Enter a valid PayPal transaction reference (6-64 letters, numbers, dashes or underscores).", "invalid_reference", {
        providerReference: "Use the reference shown on your PayPal receipt.",
      });
    }

    const now = new Date();
    const initialEvents = [
      {
        id: `${reference}_ev1`,
        label: "Deposit started",
        description: "Your deposit request is being prepared.",
        timestamp: now.toISOString(),
        status: "current",
      },
    ];

    if (method === "mpesa" && isMpesaLiveConfigured()) {
      const reservation = await prisma.deposit.create({
        data: {
          reference,
          userId: user.id,
          amount: parsedAmount.decimal,
          fee: 0,
          wallet: "deposit",
          phone,
          method,
          status: "initiated",
          events: initialEvents,
        },
      });
      const stk = await initiateMpesaStkPush({
        phone,
        amount,
        reference,
        accountReference: reference,
        description: "Zentra deposit",
        callbackUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/api/payments/mpesa/callback`,
      });
      if (!stk) return serverError(new Error("M-Pesa cashier configuration is incomplete."));
      const events = [
        {
          id: `${reference}_ev2`,
          label: "STK push requested",
          description: `A payment prompt was sent to ${phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2")}.`,
          timestamp: now.toISOString(),
          status: "current",
        },
      ];
      const deposit = await prisma.deposit.update({
        where: { id: reservation.id },
        data: {
          status: "pending",
          checkoutRequestId: stk.checkoutRequestId,
          merchantRequestId: stk.merchantRequestId,
          events,
        },
      });
      return ok({ deposit: mapDeposit(deposit) });
    }

    if (method === "paypal" && isPaypalLiveConfigured()) {
      const reservation = await prisma.deposit.create({
        data: {
          reference,
          userId: user.id,
          amount: parsedAmount.decimal,
          fee: 0,
          wallet: "deposit",
          phone,
          method,
          providerReference,
          status: "initiated",
          events: initialEvents,
        },
      });
      const order = await createPaypalOrder({
        amount,
        reference,
        idempotencyKey,
        returnUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/wallet/deposit?paypal=success&ref=${reference}`,
        cancelUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/wallet/deposit?paypal=cancelled&ref=${reference}`,
      });
      if (!order) return serverError(new Error("PayPal configuration is incomplete."));
      const events = [
        {
          id: `${reference}_ev2`,
          label: "PayPal order created",
          description: `Checkout started for ${reference}. Complete payment on PayPal to finish.`,
          timestamp: now.toISOString(),
          status: "current",
        },
      ];
      const deposit = await prisma.deposit.update({
        where: { id: reservation.id },
        data: {
          status: "pending",
          checkoutRequestId: order.orderId,
          providerApprovalUrl: order.approveUrl,
          events,
        },
      });
      return ok({
        deposit: mapDeposit(deposit),
        paypal: { orderId: order.orderId, approveUrl: order.approveUrl, status: order.status },
      });
    }

    if (method === "paypal") {
      const deposit = await prisma.deposit.create({
        data: {
          reference,
          userId: user.id,
          amount: parsedAmount.decimal,
          fee: 0,
          wallet: "deposit",
          phone,
          method,
          providerReference,
          status: "pending",
          events: [
            {
              id: `${reference}_ev1`,
              label: "Reference submitted",
              description: `PayPal reference ${providerReference} recorded. Awaiting verification before your Deposit Wallet is credited.`,
              timestamp: now.toISOString(),
              status: "current",
            },
          ],
        },
      });
      return ok({
        deposit: mapDeposit(deposit),
        verificationNote:
          "Your PayPal payment is pending verification. Your Deposit Wallet is credited only after the payment is confirmed by operations.",
      });
    }

    const checkoutRequestId = `ws_CO_${now.getTime()}_DEMO`;
    const merchantRequestId = `mer_${now.getTime()}`;
    const deposit = await prisma.deposit.create({
      data: {
        reference,
        userId: user.id,
        amount: parsedAmount.decimal,
        fee: 0,
        wallet: "deposit",
        phone,
        method: "mpesa",
        status: "pending",
        checkoutRequestId,
        merchantRequestId,
        events: [
          {
            id: `${reference}_ev2`,
            label: "STK push requested",
            description: `A payment prompt was sent to ${phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2")}.`,
            timestamp: now.toISOString(),
            status: "current",
          },
        ],
      },
    });
    return ok({
      deposit: mapDeposit(deposit),
      demoNote:
        "No live STK push was sent. This simulated prompt updates the payment status automatically; no real payment is made.",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      try {
        const user = await getCurrentUser();
        if (user) {
          const idempotencyKey = readIdempotencyKey(req);
          const body = await retryRequest.json();
          const parsedAmount = parsePositiveMoney(body.amount);
          if (idempotencyKey && parsedAmount) {
            const replay = await replayDeposit(user.id, operationReference("DEP", user.id, idempotencyKey), {
              amountCents: parsedAmount.cents,
              phone: normalizePhoneKE(String(body.phone ?? "")),
              method: body.method === "paypal" ? "paypal" : "mpesa",
              providerReference: String(body.providerReference ?? "").trim(),
            });
            if (replay) return replay;
          }
        }
      } catch {
        // Keep the original database error if the duplicate cannot be replayed.
      }
    }
    return serverError(error);
  }
}
