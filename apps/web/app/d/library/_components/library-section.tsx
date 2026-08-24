"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { useVideos } from "@/lib/hooks/use-videos";
import { LibrarySkeleton } from "./library-skeleton";
import { LibraryView } from "./library-view";

export function LibrarySection() {
  const router = useRouter();
  const { data, isLoading, error } = useVideos();

  useEffect(() => {
    if (error instanceof Error && error.message === "NO_ACTIVE_WORKSPACE") {
      router.replace("/d/settings");
    }
  }, [error, router]);

  // Loading state - show skeleton
  if (isLoading || !data) {
    return <LibrarySkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Icon icon="solar:danger-linear" className="mb-4 text-red-500" style={{ fontSize: "2rem" }} />
        <p className="text-[#090b0c]/50">Failed to load recordings</p>
      </div>
    );
  }

  // Success state - render dumb view component
  return <LibraryView videos={data.videos} timeSaved={data.timeSaved} />;
}
