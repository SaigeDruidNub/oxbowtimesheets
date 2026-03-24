"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 flex items-center gap-2 transition-colors cursor-pointer"
    >
      <span>←</span> Back
    </button>
  );
}
