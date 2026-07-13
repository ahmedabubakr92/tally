"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GroupEventListener({ groupId }: { groupId: string }) {
  const router = useRouter();

  useEffect(() => {
    let es: EventSource;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      es = new EventSource(`/api/groups/${groupId}/events`);

      es.onmessage = () => {
        router.refresh();
      };

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED && !unmounted) {
          setTimeout(connect, 5_000);
        }
        // CONNECTING state: browser handles reconnect automatically
      };
    }

    connect();

    return () => {
      unmounted = true;
      es?.close();
    };
  }, [groupId, router]);

  return null;
}
