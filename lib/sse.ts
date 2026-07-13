type Controller = ReadableStreamDefaultController<Uint8Array>;

// In-memory registry: groupId → set of open SSE connections
const subscribers = new Map<string, Set<Controller>>();

export function subscribe(groupId: string, controller: Controller): void {
  if (!subscribers.has(groupId)) {
    subscribers.set(groupId, new Set());
  }
  subscribers.get(groupId)!.add(controller);
}

export function unsubscribe(groupId: string, controller: Controller): void {
  const subs = subscribers.get(groupId);
  if (!subs) return;
  subs.delete(controller);
  if (subs.size === 0) subscribers.delete(groupId);
}

export function broadcast(groupId: string): void {
  const subs = subscribers.get(groupId);
  if (!subs || subs.size === 0) return;
  const msg = new TextEncoder().encode("data: refresh\n\n");
  for (const ctrl of subs) {
    try {
      ctrl.enqueue(msg);
    } catch {
      // Controller is closed, remove stale subscriber
      subs.delete(ctrl);
    }
  }
}
