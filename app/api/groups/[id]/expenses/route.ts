import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addExpenseSchema } from "@/lib/validations/expense";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

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
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const result = addExpenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: z.flattenError(result.error).fieldErrors },
      { status: 400 },
    );
  }

  const { title, amount, paidById, splitBetween, idempotencyKey } = result.data;

  try {
    const callerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!callerMembership) {
      return NextResponse.json(
        { error: "Not a member of this group." },
        { status: 403 },
      );
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));

    if (!memberIds.has(paidById)) {
      return NextResponse.json(
        { error: "Payer is not a member of this group." },
        { status: 400 },
      );
    }

    for (const uid of splitBetween) {
      if (!memberIds.has(uid)) {
        return NextResponse.json(
          { error: "A selected user is not a member of this group." },
          { status: 400 },
        );
      }
    }

    // Equal split with remainder going to the first person
    const n = splitBetween.length;
    const amountInFils = Math.round(amount * 100);
    const normalizedAmount = (amountInFils / 100).toFixed(2);
    const baseShareFils = Math.floor(amountInFils / n);
    const remainderFils = amountInFils - baseShareFils * n;

    const splits = splitBetween.map((uid, i) => ({
      userId: uid,
      shareAmount: (
        (i < remainderFils ? baseShareFils + 1 : baseShareFils) / 100
      ).toFixed(2),
    }));

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId,
          title,
          amount: normalizedAmount,
          paidById,
          idempotencyKey,
          splits: { create: splits },
        },
      });

      await tx.activityLog.create({
        data: {
          groupId,
          userId,
          actionType: "EXPENSE_ADDED",
          metadata: { title, amount: normalizedAmount, paidById },
        },
      });

      return created;
    });

    broadcast(groupId);

    return NextResponse.json({ expense }, { status: 201 });
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
    console.error("Failed to create expense.", error);
    return NextResponse.json(
      { error: "Failed to create expense." },
      { status: 500 },
    );
  }
}
