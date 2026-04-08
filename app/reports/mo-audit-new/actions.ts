"use server";

import { query } from "@/lib/db";

export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  pto_start_date: string | null;
};

export type WeeklyRow = {
  weekStart: string;
  total: number;
  totalExcludingPatronage: number;
  unpaidTimeOff: number;
};

function toDateString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const rows = (await query({
    query: `
      SELECT id, first_name, last_name, pto_start_date
      FROM employees
      WHERE email != 'hidden'
        AND member_owner_date IS NULL
      ORDER BY first_name ASC, last_name ASC
    `,
  })) as any[];

  return rows.map((row) => ({
    id: Number(row.id),
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    pto_start_date: toDateString(row.pto_start_date),
  }));
}

export async function getMOAuditWeeklyData(
  employeeId: number,
): Promise<WeeklyRow[]> {
  const rows = (await query({
    query: `
      SELECT
        DATE_FORMAT(DATE_SUB(t.date, INTERVAL DAYOFWEEK(t.date) - 1 DAY), '%Y-%m-%d') AS weekStart,
        ROUND(SUM(t.hours), 2) AS total,
        ROUND(SUM(
          CASE
            WHEN tk.classification = 'Patronage' THEN 0
            WHEN t.classification_override = 'Patronage' THEN 0
            ELSE t.hours
          END
        ), 2) AS totalExcludingPatronage,
        ROUND(SUM(
          CASE WHEN t.task_id = 241 THEN t.hours ELSE 0 END
        ), 2) AS unpaidTimeOff
      FROM timesheets t
        LEFT JOIN tasks tk ON tk.id = t.task_id
      WHERE t.employee_id = ?
        AND t.resolved = 1
      GROUP BY weekStart
      ORDER BY weekStart ASC
    `,
    values: [employeeId],
  })) as any[];

  return rows.map((row) => ({
    weekStart: String(row.weekStart),
    total: Number(row.total ?? 0),
    totalExcludingPatronage: Number(row.totalExcludingPatronage ?? 0),
    unpaidTimeOff: Number(row.unpaidTimeOff ?? 0),
  }));
}
