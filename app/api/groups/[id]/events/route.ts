import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribe, unsubscribe } from "@/lib/sse";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    return new Response("Group not found or access denied", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send an initial comment to establish the connection
      controller.enqueue(encoder.encode(": connected\n\n"));
      subscribe(groupId, controller);

      request.signal.addEventListener("abort", () => {
        unsubscribe(groupId, controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
