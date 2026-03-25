"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export default function ArchivedTimesheetFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || "",
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const updateParams = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (startDate) params.set("startDate", startDate);
    else params.delete("startDate");

    if (endDate) params.set("endDate", endDate);
    else params.delete("endDate");

    router.push(`?${params.toString()}`);
  }, [router, searchParams, startDate, endDate]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    router.push("?");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-end",
        marginBottom: "1rem",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label
          style={{
            fontSize: "0.875rem",
            color: "var(--muted)",
            marginBottom: "0.25rem",
          }}
        >
          Start Date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem", // slightly rounded
            border: "1px solid var(--muted)",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label
          style={{
            fontSize: "0.875rem",
            color: "var(--muted)",
            marginBottom: "0.25rem",
          }}
        >
          End Date
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--muted)",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
      </div>
      <button
        onClick={updateParams}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          background: "var(--accent)",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        Apply
      </button>
      {(startDate || endDate) && (
        <button
          onClick={clearFilters}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--muted)",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
