import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Group not found or access denied." },
      { status: 404 },
    );
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
        settlements: {
          include: {
            paidBy: { select: { id: true, name: true } },
            paidTo: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Failed to fetch group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group." },
      { status: 500 },
    );
  }
}
