import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapSupportTicket } from "@/lib/server/mappers";
import type { SupportTicket, TicketPriority } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const items = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      include: { messages: true },
      orderBy: { updatedAt: "desc" },
    });

    return ok(items.map(mapSupportTicket));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req).catch(() => ({}));
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    const category = (body.category ?? "other") as SupportTicket["category"];
    const priority = (body.priority ?? "normal") as TicketPriority;

    if (subject.length < 6) {
      return fail("Please provide a clearer subject line.", "invalid_subject", { subject: "At least 6 characters." });
    }
    if (message.length < 15) {
      return fail("Please describe the issue in more detail.", "invalid_message", { message: "At least 15 characters." });
    }

    const now = new Date();
    const reference = `NX-TKT-${Date.now().toString(36).toUpperCase()}`;
    const slaDueAt = new Date(now.getTime() + (priority === "high" ? 4 : 24) * 3_600_000);

    const ticket = await prisma.supportTicket.create({
      data: {
        reference,
        userId: user.id,
        subject,
        category,
        status: "open",
        priority,
        slaDueAt,
        messages: {
          create: {
            author: user.fullName,
            authorRole: "user",
            body: message,
            at: now,
          },
        },
      },
      include: { messages: true },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        category: "support",
        title: "Ticket created",
        message: `Your ticket ${ticket.reference} has been received. Our team will respond shortly.`,
        actionUrl: `/support/${ticket.id}`,
        actionLabel: "Open ticket",
      },
    });

    return ok(mapSupportTicket(ticket));
  } catch (error) {
    return serverError(error);
  }
}
