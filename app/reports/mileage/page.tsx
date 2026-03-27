"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type MileageRow = {
  employee: string;
  reimbursement: number;
  projectName: string;
  totalMiles: number;
};

type SortKey = keyof MileageRow;
type SortDir = "asc" | "desc";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function parseInputDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatMiles(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function sortRows(
  rows: MileageRow[],
  key: SortKey,
  dir: SortDir,
): MileageRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    let cmp = 0;
    if (typeof av === "string" && typeof bv === "string") {
      cmp = av.localeCompare(bv);
    } else {
      cmp = (av as number) - (bv as number);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function MileageReports() {
  const [startDate, setStartDate] = useState("2026-03-22");
  const [endDate, setEndDate] = useState("2026-03-27");
  const [rows, setRows] = useState<MileageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("totalMiles");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const parsedStartDate = useMemo(() => parseInputDate(startDate), [startDate]);
  const parsedEndDate = useMemo(() => parseInputDate(endDate), [endDate]);

  const displayedTimespan = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) return "Choose a valid date range";
    if (parsedEndDate < parsedStartDate)
      return "End date must be on or after start date";
    return `${dateFormatter.format(parsedStartDate)} - ${dateFormatter.format(parsedEndDate)}`;
  }, [parsedStartDate, parsedEndDate]);

  const sortedRows = useMemo(
    () => sortRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir],
  );

  useEffect(() => {
    const hasValidRange =
      parsedStartDate && parsedEndDate && parsedEndDate >= parsedStartDate;

    if (!hasValidRange) {
      setRows([]);
      setError("Choose a valid date range.");
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function loadMileageRows() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/reports/mileage?startDate=${startDate}&endDate=${endDate}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { rows: MileageRow[] };
        setRows(payload.rows ?? []);
      } catch {
        if (abortController.signal.aborted) return;
        setRows([]);
        setError("Unable to load mileage data for this date range.");
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    loadMileageRows();
    return () => abortController.abort();
  }, [startDate, endDate, parsedStartDate, parsedEndDate]);

  function onStartDateChange(value: string) {
    setStartDate(value);
    if (value > endDate) setEndDate(value);
  }

  function onEndDateChange(value: string) {
    if (value < startDate) setStartDate(value);
    setEndDate(value);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

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
      <style>{`
        .mileage-row {
          transition: background-color 120ms ease;
        }
        .mileage-row:hover {
          background-color: color-mix(in srgb, var(--accent) 12%, transparent) !important;
        }
        .mileage-sort-btn {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          font-weight: 700;
          color: inherit;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .mileage-sort-btn:hover {
          color: var(--accent);
        }
      `}</style>

      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
          color: "var(--foreground)",
        }}
      >
        Mileage Per Project
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: 16,
          marginBottom: 20,
        }}
      >
        <label
          htmlFor="startDate"
          style={{
            fontWeight: 600,
            color: "var(--foreground)",
            fontSize: "0.95rem",
          }}
        >
          Select a timespan:
        </label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          style={dateInputStyle}
          aria-label="Start date"
        />
        <span style={{ color: "var(--muted)", fontWeight: 600 }}>to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          style={dateInputStyle}
          aria-label="End date"
        />
        <span
          style={{
            color: "var(--foreground)",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          {displayedTimespan}
        </span>
      </div>

      {error && (
        <div
          style={{
            border: "1px solid rgba(180,70,70,0.35)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: 16,
            background: "rgba(180,70,70,0.08)",
            color: "var(--foreground)",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 560,
            color: "var(--foreground)",
          }}
        >
          <thead>
            <tr>
              {(
                [
                  ["employee", "Employee"],
                  ["reimbursement", "Reimbursement"],
                  ["projectName", "Project Name"],
                  ["totalMiles", "Total Miles"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} style={headerStyle}>
                  <button
                    className="mileage-sort-btn"
                    onClick={() => handleSort(key)}
                    aria-label={`Sort by ${label}`}
                  >
                    {label}
                    <span
                      style={{
                        opacity: key === sortKey ? 1 : 0.4,
                        fontSize: "0.8em",
                      }}
                    >
                      {sortIndicator(key)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td style={cellStyle} colSpan={4}>
                  Loading mileage data…
                </td>
              </tr>
            )}
            {!isLoading && !error && sortedRows.length === 0 && (
              <tr>
                <td style={cellStyle} colSpan={4}>
                  No mileage entries found for this range.
                </td>
              </tr>
            )}
            {!isLoading &&
              !error &&
              sortedRows.map((row, index) => (
                <tr
                  key={`${row.employee}-${row.projectName}-${index}`}
                  className="mileage-row"
                  style={{
                    background:
                      index % 2 === 0 ? "transparent" : "rgba(0,0,0,0.035)",
                  }}
                >
                  <td style={cellStyle}>{row.employee}</td>
                  <td style={cellStyle}>
                    ${numberFormatter.format(row.reimbursement)}
                  </td>
                  <td style={cellStyle}>{row.projectName}</td>
                  <td style={cellStyle}>{formatMiles(row.totalMiles)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const dateInputStyle: CSSProperties = {
  background: "#f4f4f5",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "0.45rem 0.55rem",
  fontSize: "0.95rem",
  fontWeight: 500,
};

const headerStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid rgba(0,0,0,0.1)",
  padding: "0.6rem 0.75rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const cellStyle: CSSProperties = {
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  padding: "0.55rem 0.75rem",
  whiteSpace: "nowrap",
};
