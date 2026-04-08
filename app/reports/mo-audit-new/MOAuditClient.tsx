"use client";

import { useState } from "react";
import { getMOAuditWeeklyData, type Employee, type WeeklyRow } from "./actions";

type WeekWithMO = WeeklyRow & { countsformo: boolean };

type FilledWeek =
  | WeekWithMO
  | {
      weekStart: string;
      total: 0;
      totalExcludingPatronage: 0;
      unpaidTimeOff: 0;
      countsformo: false;
      noTimecard: true;
    };

function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isStartDateInWeek(
  weekStart: string,
  startDate: string | null,
): boolean {
  if (!startDate) return false;
  const week = parseLocalDate(weekStart);
  const start = parseLocalDate(startDate.slice(0, 10));
  if (!week || !start) return false;
  const weekEnd = new Date(week);
  weekEnd.setDate(week.getDate() + 6);
  return start >= week && start <= weekEnd;
}

function getFilledWeeklyData(weeklyData: WeekWithMO[]): FilledWeek[] {
  if (!weeklyData.length) return [];
  const sorted = [...weeklyData].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime(),
  );
  const filled: FilledWeek[] = [];
  const current = parseLocalDate(sorted[0].weekStart)!;
  const end = parseLocalDate(sorted[sorted.length - 1].weekStart)!;

  while (current <= end) {
    const weekStr = toLocalDateString(current);
    const found = sorted.find((w) => w.weekStart === weekStr);
    if (found) {
      filled.push(found);
    } else {
      filled.push({
        weekStart: weekStr,
        total: 0,
        totalExcludingPatronage: 0,
        unpaidTimeOff: 0,
        countsformo: false,
        noTimecard: true,
      });
    }
    current.setDate(current.getDate() + 7);
  }
  return filled;
}

interface Props {
  employees: Employee[];
}

export default function MOAuditClient({ employees }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [weeklyData, setWeeklyData] = useState<WeekWithMO[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedEmployee =
    employees.find((e) => String(e.id) === selectedId) ?? null;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (!id) {
      setWeeklyData([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getMOAuditWeeklyData(Number(id));
      setWeeklyData(
        data.map((week) => ({
          ...week,
          countsformo: week.totalExcludingPatronage >= 8,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  const filledWeeklyData = getFilledWeeklyData(weeklyData);
  const moWeeks = filledWeeklyData.filter((w) => w.countsformo).length;

  return (
    <div className="moaudit-container">
      <h1>MO Audit Report</h1>
      <label htmlFor="employee-select">Select Employee:</label>
      <select id="employee-select" value={selectedId} onChange={handleChange}>
        <option value="">-- Select --</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.first_name} {emp.last_name}
          </option>
        ))}
      </select>

      {loading && (
        <p style={{ color: "#90caf9", marginTop: "1em" }}>Loading...</p>
      )}

      {!loading && filledWeeklyData.length > 0 && (
        <>
          <div
            style={{
              background: "#232e3a",
              color: "#90caf9",
              padding: "0.7em 1.2em",
              borderRadius: "8px",
              margin: "1.2em 0",
              border: "1.5px solid #1976d2",
              fontWeight: "bold",
              boxShadow: "0 1px 6px #0004",
              alignItems: "center",
              gap: "0.7em",
              display: "flex",
            }}
          >
            {moWeeks >= 104 && (
              <span
                style={{
                  fontSize: "1.5em",
                  color: "#4caf50",
                  verticalAlign: "middle",
                }}
                title="Eligible for MO"
              >
                ✓
              </span>
            )}
            <span>Total Weeks for MO Status: {moWeeks} / 104</span>
          </div>

          <div className="moaudit-report">
            {filledWeeklyData.map((week) => (
              <div
                key={week.weekStart}
                className="moaudit-week-box"
                style={{
                  border: "1px solid #333",
                  background: "#181c20",
                  margin: "1em 0",
                  padding: "1em",
                  borderRadius: "10px",
                  color: "#e0e0e0",
                  boxShadow: "0 2px 8px #0002",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    color: "#90caf9",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5em",
                  }}
                >
                  {"noTimecard" in week && week.noTimecard ? (
                    <span
                      style={{ fontSize: "1.2em", color: "#f44336" }}
                      title="No timecards"
                    >
                      ✗
                    </span>
                  ) : week.countsformo ? (
                    <span
                      style={{ fontSize: "1.2em", color: "#4caf50" }}
                      title="Counts for MO"
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: "1.2em", color: "#f44336" }}
                      title="Does not count for MO"
                    >
                      ✗
                    </span>
                  )}
                  {"noTimecard" in week && week.noTimecard ? (
                    <span>
                      Week Starting: {week.weekStart}
                      <br /> No timecards filled
                    </span>
                  ) : (
                    <>Week Starting: {week.weekStart}</>
                  )}
                </h3>

                {!("noTimecard" in week && week.noTimecard) && (
                  <ul style={{ listStyle: "none", padding: 0 }}>
                    <li>
                      <strong>Total Hours:</strong> {week.total}
                    </li>
                    <li>
                      <strong>Total Excluding Patronage:</strong>{" "}
                      {week.totalExcludingPatronage}
                    </li>
                    <li>
                      <strong>Unpaid Time Off:</strong> {week.unpaidTimeOff}
                    </li>
                  </ul>
                )}

                {selectedEmployee &&
                  !("noTimecard" in week && week.noTimecard) &&
                  isStartDateInWeek(
                    week.weekStart,
                    selectedEmployee.pto_start_date,
                  ) && (
                    <div
                      style={{
                        background: "#232e3a",
                        color: "#90caf9",
                        padding: "0.7em 1.2em",
                        borderRadius: "8px",
                        marginTop: "1.2em",
                        border: "1.5px solid #1976d2",
                        fontWeight: "bold",
                        boxShadow: "0 1px 6px #0004",
                        display: "inline-block",
                      }}
                    >
                      <span style={{ marginRight: "0.5em", fontSize: "1.1em" }}>
                        🎉
                      </span>
                      Official Start Date:{" "}
                      {selectedEmployee.pto_start_date
                        ? (parseLocalDate(
                            selectedEmployee.pto_start_date,
                          )?.toLocaleDateString() ?? "Unknown")
                        : "Unknown"}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
