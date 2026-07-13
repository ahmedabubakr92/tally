"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GroupEventListener({ groupId }: { groupId: string }) {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/groups/${groupId}/events`);

    es.onmessage = () => {
      router.refresh();
    };

    es.onerror = () => {
      // Browser auto-reconnects on error; nothing to do here
    };

    return () => {
      es.close();
    };
  }, [groupId, router]);

  return null;
}
