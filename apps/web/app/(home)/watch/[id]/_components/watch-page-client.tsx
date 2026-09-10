"use client";

import { useSyncExternalStore, useState } from "react";
import { PinGate } from "@/components/shell/pin-gate";

const noopSubscribe = () => () => {};

export function WatchPageClient({
  videoId,
  pinEnabled,
  children,
}: {
  videoId: string;
  pinEnabled: boolean;
  children: React.ReactNode;
}) {
  const sessionKey = `pin-unlocked-${videoId}`;

  // useSyncExternalStore avoids effect+setState: server snapshot = false (not mounted),
  // client snapshot = actual sessionStorage value read after hydration.
  const storedUnlocked = useSyncExternalStore(
    noopSubscribe,
    () => !pinEnabled || sessionStorage.getItem(sessionKey) === "1",
    () => false,
  );

  const [manuallyUnlocked, setManuallyUnlocked] = useState(false);
  const unlocked = storedUnlocked || manuallyUnlocked;

  if (!unlocked) return <PinGate videoId={videoId} onUnlock={() => setManuallyUnlocked(true)} />;
  return <>{children}</>;
}
