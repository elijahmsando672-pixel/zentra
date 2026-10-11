import { prisma } from "@/lib/server/prisma";
import { ok, fail, serverError } from "@/lib/server/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") ?? "").trim().toUpperCase();
    if (!code) return fail("Enter an invite code to continue.", "invalid_code");

    const user = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { fullName: true },
    });
    if (!user) return fail("That invite code is not recognised.", "invalid_code");

    return ok({ sponsorName: user.fullName });
  } catch (error) {
    return serverError(error);
  }
}
