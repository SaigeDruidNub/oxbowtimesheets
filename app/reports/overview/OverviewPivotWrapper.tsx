"use client";

import dynamic from "next/dynamic";

const OverviewPivotClient = dynamic(() => import("./OverviewPivotClient"), {
  ssr: false,
  loading: () => (
    <div style={{ color: "var(--foreground)", padding: "1rem" }}>
      Loading pivot table…
    </div>
  ),
});

export default function OverviewPivotWrapper() {
  return <OverviewPivotClient />;
}
