"use client";

import { Icon } from "@iconify/react";
import { useRecording } from "@/components/record/recording-provider";

export function RecordButton({ label = "Record" }: { label?: string }) {
  const { openPanel } = useRecording();
  return (
    <button
      type="button"
      onClick={openPanel}
      className="flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-5 text-[0.875rem] text-white shadow-[0_10px_24px_rgba(37,99,235,.28)] transition-opacity hover:opacity-90"
    >
      <Icon icon="solar:videocamera-record-bold" style={{ fontSize: "0.9375rem" }} />
      {label}
    </button>
  );
}
