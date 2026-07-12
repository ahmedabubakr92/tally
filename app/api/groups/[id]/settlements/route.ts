import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { recordSettlementSchema } from "@/lib/validations/settlement";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Inavlid request body." },
      { status: 400 },
    );
  }

  const result = recordSettlementSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: z.flattenError(result.error).fieldErrors },
      { status: 400 },
    );
  }

  const { paidById, paidToId, amount, idempotencyKey } = result.data;

  if (paidById === paidToId) {
    return NextResponse.json(
      { error: "Payer and recipient must be different." },
      { status: 400 },
    );
  }

  try {
    // Caller must be a member
    const callerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!callerMembership) {
      return NextResponse.json(
        { error: "Not a member of this group." },
        { status: 403 },
      );
    }

    // Both parties must be members
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));

    if (!memberIds.has(paidById) || !memberIds.has(paidToId)) {
      return NextResponse.json(
        { error: "Both parties must be members of this group." },
        { status: 400 },
      );
    }

    // Fetch names for the activity log
    const [paidByUser, paidToUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: paidById },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: paidToId },
        select: { name: true },
      }),
    ]);

    const normalizedAmount = (Math.round(amount * 100) / 100).toFixed(2);

    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          groupId,
          paidById,
          paidToId,
          amount: normalizedAmount,
          idempotencyKey,
        },
      });

      await tx.activityLog.create({
        data: {
          groupId,
          userId,
          actionType: "SETTLEMENT_RECORDED",
          metadata: {
            amount: normalizedAmount,
            paidByName: paidByUser?.name ?? paidById,
            paidToName: paidToUser?.name ?? paidToId,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate request." },
        { status: 409 },
      );
    }
    console.error("Failed to record settlement,", error);
    return NextResponse.json(
      { error: "Failed to record settlement." },
      { status: 500 },
    );
  }
}
