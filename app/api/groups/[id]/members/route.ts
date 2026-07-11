import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { addMemberSchema } from "@/lib/validations/group";
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

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const result = addMemberSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: z.flattenError(result.error).fieldErrors },
      { status: 400 },
    );
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email: result.data.email },
  });
  if (!invitedUser) {
    return NextResponse.json(
      { error: "No user found with that email." },
      { status: 404 },
    );
  }

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: invitedUser.id } },
  });
  if (alreadyMember) {
    return NextResponse.json(
      { error: "User is already in this group." },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.groupMember.create({ data: { groupId, userId: invitedUser.id } }),
      prisma.activityLog.create({
        data: {
          groupId,
          userId,
          actionType: "MEMBER_ADDED",
          metadata: { addedEmail: invitedUser.email },
        },
      }),
    ]);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member.", error);
    return NextResponse.json(
      { error: "Failed to add member." },
      { status: 500 },
    );
  }
}
