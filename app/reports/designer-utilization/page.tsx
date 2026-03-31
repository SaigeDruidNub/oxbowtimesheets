"use client";

import { useEffect, useState } from "react";

type UtilizationRow = {
  id: number;
  first_name: string;
  last_name: string;
  YTD: number;
  QTD: number;
  WTD: number;
};

function getColor(value: number): string {
  if (value >= 0.6) return "var(--success_col, #22c55e)";
  if (value >= 0.4) return "var(--overhead_col, #f59e0b)";
  return "var(--alert_col, #ef4444)";
}

function formatPct(value: number): string {
  return (value * 100).toFixed(1) + "%";
}

export default function DesignerUtilizationPage() {
  const [rows, setRows] = useState<UtilizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/designer-utilization")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            `${res.status}: ${body?.error ?? "Failed to load utilization data"}`,
          );
        }
        return res.json();
      })
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const isAdminView = rows.length > 1;
  const title = isAdminView
    ? "Designer Utilization Report"
    : "Designer Utilization";

  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        padding: "1.5rem 2rem 2rem 2rem",
        marginBottom: 32,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: "0 0 1.5rem 0",
          color: "var(--foreground)",
        }}
      >
        {title}
      </h2>

      {loading && <p style={{ color: "var(--foreground)" }}>Loading…</p>}

      {error && <p style={{ color: "var(--alert_col, #ef4444)" }}>{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <p style={{ color: "var(--foreground)" }}>No data available.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 15,
            color: "var(--foreground)",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid var(--muted, #334155)" }}>
              {isAdminView && (
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Name</th>
              )}
              <th style={{ textAlign: "right", padding: "8px 12px" }}>WTD</th>
              <th style={{ textAlign: "right", padding: "8px 12px" }}>QTD</th>
              <th style={{ textAlign: "right", padding: "8px 12px" }}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                style={{ borderBottom: "1px solid var(--muted, #334155)" }}
              >
                {isAdminView && (
                  <td style={{ padding: "10px 12px" }}>
                    {row.first_name} {row.last_name}
                  </td>
                )}
                {(["WTD", "QTD", "YTD"] as const).map((period) => (
                  <td
                    key={period}
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      fontWeight: 600,
                      color: getColor(row[period]),
                    }}
                  >
                    {formatPct(row[period])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          gap: "1.5rem",
          fontSize: 13,
          color: "var(--foreground)",
          opacity: 0.7,
        }}
      >
        <span style={{ color: "var(--success_col, #22c55e)" }}>● ≥ 60%</span>
        <span style={{ color: "var(--overhead_col, #f59e0b)" }}>● ≥ 40%</span>
        <span style={{ color: "var(--alert_col, #ef4444)" }}>● &lt; 40%</span>
        <span>— design hours / total hours</span>
      </div>
    </section>
  );
}
