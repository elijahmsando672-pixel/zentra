import { ok, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { generateMpesaQr, getPaymentConfig, isMpesaQrConfigured } from "@/lib/server/payments";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { MAX_DEPOSIT, MIN_DEPOSIT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const throttle = await consumeRateLimit(`mpesa-qr:${requestIp(req)}`, 30, 60_000);
    if (!throttle.allowed) {
      return ok({
        available: false,
        reason: "Too many QR requests. Please wait a moment and try again.",
        tillNumber: "",
        merchantName: "",
        amount: 0,
      });
    }

    const { searchParams } = new URL(req.url);
    const rawAmount = Number(searchParams.get("amount") ?? 0);
    const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0;

    const config = await getPaymentConfig();
    const tillNumber = config.contact.mpesaTillNumber;
    const merchantName = config.contact.adminName;

    if (!tillNumber) {
      return ok({
        available: false,
        reason: "M-Pesa deposits are not configured.",
        tillNumber: "",
        merchantName,
        amount,
      });
    }
    if (!isMpesaQrConfigured()) {
      return ok({
        available: false,
        reason: "Live M-Pesa credentials are not configured.",
        tillNumber,
        merchantName,
        amount,
      });
    }
    if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      return ok({
        available: false,
        reason: `Enter an amount between KES ${MIN_DEPOSIT.toLocaleString()} and KES ${MAX_DEPOSIT.toLocaleString()}.`,
        tillNumber,
        merchantName,
        amount,
      });
    }

    const qr = await generateMpesaQr({ tillNumber, amount, merchantName });
    return ok({
      available: true,
      tillNumber,
      merchantName,
      amount: qr.amount,
      image: qr.image,
    });
  } catch (error) {
    return serverError(error);
  }
}
