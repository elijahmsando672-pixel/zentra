import { prisma } from "@/lib/server/prisma";
import { ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { maskPhone } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req);
    const kind = String(body.kind ?? "id");

    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: "pending", verificationStatus: "pending" },
    });

    const maskedHint =
      kind === "id"
        ? `Document received for ${maskPhone(user.phone)} — review usually completes within 24 hours.`
        : kind === "selfie"
          ? "Selfie received and matched to your document on file."
          : "Proof of address received. Our team will review it shortly.";

    return ok({ status: "pending" as const, maskedHint });
  } catch (error) {
    return serverError(error);
  }
}
