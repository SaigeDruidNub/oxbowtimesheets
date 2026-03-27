"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type BreakdownRow = {
  taskName: string;
  hours: number;
};

type PayrollRow = {
  employeeId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  isSalary: boolean;
  numTimesheets: number;
  totalHours: number;
  payrollHours: number;
  overtimeHours: number;
  ptoTotal: number;
  excludedTotal: number;
  mileageTotal: number;
  totalReimbursement: number;
  onlyReimbursement: number;
  ptoBreakdown: BreakdownRow[];
  excludedBreakdown: BreakdownRow[];
  csv: {
    first_name: string;
    last_name: string;
    regular_hours: string;
    overtime_hours: string;
    holiday_hours: string;
    sick_hours: string;
    vacation_hours: string;
    reimbursement: string;
  };
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getPreviousWeekRange(today = new Date()) {
  const dayOfWeek = today.getDay();
  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - dayOfWeek);

  const startDate = new Date(thisWeekSunday);
  startDate.setDate(thisWeekSunday.getDate() - 7);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate: toInputDate(startDate),
    endDate: toInputDate(endDate),
  };
}

function createCSVFromRows(rows: PayrollRow[]): string {
  const headerKeys = [
    "first_name",
    "last_name",
    "regular_hours",
    "overtime_hours",
    "holiday_hours",
    "sick_hours",
    "vacation_hours",
    "reimbursement",
  ];

  const csvRows = [headerKeys.join(",")];

  for (const row of rows) {
    csvRows.push(
      [
        row.csv.first_name,
        row.csv.last_name,
        row.csv.regular_hours,
        row.csv.overtime_hours,
        row.csv.holiday_hours,
        row.csv.sick_hours,
        row.csv.vacation_hours,
        row.csv.reimbursement,
      ].join(","),
    );
  }

  return `${csvRows.join("\n")}\n`;
}

function downloadCSV(rows: PayrollRow[], startDate: string, endDate: string) {
  const csv = createCSVFromRows(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `payroll-${startDate}-${endDate}.csv`);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  if (!rows.length) {
    return <span style={{ opacity: 0.45 }}>-</span>;
  }

  return (
    <div style={{ display: "grid", gap: "0.2rem" }}>
      {rows.map((row) => (
        <div
          key={row.taskName}
          style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {row.hours.toFixed(2)}
          </span>
          <span style={{ opacity: 0.6 }}>{row.taskName}</span>
        </div>
      ))}
    </div>
  );
}

export default function PayrollNewReports() {
  const defaultRange = useMemo(() => getPreviousWeekRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedStartDate = useMemo(() => parseInputDate(startDate), [startDate]);
  const parsedEndDate = useMemo(() => parseInputDate(endDate), [endDate]);

  const displayedTimespan = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) return "Choose a valid date range";
    if (parsedEndDate < parsedStartDate)
      return "End date must be on or after start date";
    return `${dateFormatter.format(parsedStartDate)} - ${dateFormatter.format(parsedEndDate)}`;
  }, [parsedStartDate, parsedEndDate]);

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

    async function loadPayrollRows() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/reports/payroll?startDate=${startDate}&endDate=${endDate}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { rows: PayrollRow[] };
        setRows(payload.rows ?? []);
      } catch {
        if (abortController.signal.aborted) return;
        setRows([]);
        setError("Unable to load payroll data for this date range.");
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    loadPayrollRows();
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
        .payroll-row {
          transition: background-color 120ms ease;
        }
        .payroll-row:hover {
          background-color: color-mix(in srgb, var(--accent) 12%, transparent) !important;
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
        Reports — Payroll (New)
      </h2>

      <p
        style={{ color: "var(--foreground)", marginTop: 16, marginBottom: 20 }}
      >
        Payroll totals by employee with PTO and excluded breakdowns.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: 16,
        }}
      >
        <label
          htmlFor="payrollStartDate"
          style={{
            fontWeight: 600,
            color: "var(--foreground)",
            fontSize: "0.95rem",
          }}
        >
          Select a timespan:
        </label>
        <input
          id="payrollStartDate"
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
        <button
          onClick={() => downloadCSV(rows, startDate, endDate)}
          style={downloadButtonStyle}
          disabled={isLoading || rows.length === 0}
        >
          Download CSV
        </button>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid rgba(180, 70, 70, 0.35)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: 16,
            background: "rgba(180, 70, 70, 0.08)",
            color: "var(--foreground)",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 1080,
            color: "var(--foreground)",
          }}
        >
          <thead>
            <tr>
              <th style={headerStyle}>Name</th>
              <th style={headerStyle}># of Timesheets</th>
              <th style={headerStyle}>Total Hours</th>
              <th style={headerStyle}>Payroll Hours</th>
              <th style={headerStyle}>PTO</th>
              <th style={headerStyle}>Excluded</th>
              <th style={headerStyle}>Mileage</th>
              <th style={headerStyle}>Total Reimbursement</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td style={cellStyle} colSpan={8}>
                  Loading payroll data…
                </td>
              </tr>
            ) : null}

            {!isLoading && !error && rows.length === 0 ? (
              <tr>
                <td style={cellStyle} colSpan={8}>
                  No payroll entries found for this range.
                </td>
              </tr>
            ) : null}

            {!isLoading &&
              !error &&
              rows.map((row, index) => (
                <tr
                  key={row.employeeId}
                  className="payroll-row"
                  style={{
                    background:
                      index % 2 === 0 ? "transparent" : "rgba(0,0,0,0.035)",
                  }}
                >
                  <td style={cellStyle}>{row.fullName}</td>
                  <td style={cellStyle}>{row.numTimesheets}</td>
                  <td style={cellStyle}>{row.totalHours.toFixed(2)}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      {row.isSalary ? (
                        <>
                          <span>{row.totalHours.toFixed(2)}</span>
                          <span style={{ opacity: 0.45 }}>Salaried</span>
                        </>
                      ) : (
                        <>
                          <span>{row.payrollHours.toFixed(2)}</span>
                          {row.overtimeHours > 0 ? (
                            <span style={{ color: "var(--accent)" }}>
                              {row.overtimeHours.toFixed(2)} OT
                            </span>
                          ) : (
                            <span style={{ opacity: 0.45 }}>-</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <BreakdownList rows={row.ptoBreakdown} />
                  </td>
                  <td style={cellStyle}>
                    <BreakdownList rows={row.excludedBreakdown} />
                  </td>
                  <td style={cellStyle}>{row.mileageTotal.toFixed(2)}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{row.totalReimbursement.toFixed(2)}</span>
                      <span style={{ opacity: 0.45 }}>
                        {row.onlyReimbursement > 0
                          ? `${row.onlyReimbursement.toFixed(2)} Reimbursement`
                          : "-"}
                      </span>
                    </div>
                  </td>
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

const downloadButtonStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--accent) 18%, var(--surface))",
  color: "var(--foreground)",
  fontWeight: 700,
  padding: "0.45rem 0.75rem",
  cursor: "pointer",
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
  verticalAlign: "top",
};
