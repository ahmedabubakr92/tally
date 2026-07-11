import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { createGroupSchema } from "@/lib/validations/group";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = createGroupSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: z.flattenError(result.error).fieldErrors },
      { status: 400 },
    );
  }

  const { name } = result.data;

  try {
    const group = await prisma.group.create({
      data: {
        name,
        createdBy: userId,
        members: { create: [{ userId }] },
        activities: {
          create: [
            {
              userId,
              actionType: "GROUP_CREATED",
              metadata: { groupName: name },
            },
          ],
        },
      },
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Failed to create group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups." },
      { status: 500 },
    );
  }
}
