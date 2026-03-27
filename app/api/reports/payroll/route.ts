import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

type PayrollQueryRow = {
  employee_id: number | string;
  task_id: number | string | null;
  first_name: string | null;
  last_name: string | null;
  is_salary: number | boolean | null;
  hours: number | string | null;
  mileage: number | string | null;
  reimbursement: number | string | null;
  task_name: string | null;
  task_type_name: string | null;
  date: string | null;
};

type Bucket = "Hours" | "PTO" | "Excluded";

type PayrollEntry = {
  hours: number;
  mileage: number;
  reimbursement: number;
  mileageValue: number;
  taskName: string;
  column: Bucket;
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
  ptoBreakdown: Array<{ taskName: string; hours: number }>;
  excludedBreakdown: Array<{ taskName: string; hours: number }>;
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

const PTO_HOLIDAY = "PTO - Holiday";
const PTO_SICK = "PTO - Sick";
const PTO_VACATION = "PTO - Vacation";

const PTO_TASK_IDS = new Set([540, 172]);
const EXCLUDED_TASK_IDS = new Set([241, 529, 525]);

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function normalizeTaskName(name: string | null): string {
  return (name ?? "Uncategorized").trim() || "Uncategorized";
}

function classifyBucket(
  taskTypeName: string | null,
  taskName: string | null,
  taskId: number,
): Bucket {
  const normalizedTask = (taskName ?? "").trim().toLowerCase();

  if (PTO_TASK_IDS.has(taskId) || normalizedTask.startsWith("pto -")) {
    return "PTO";
  }

  if (
    EXCLUDED_TASK_IDS.has(taskId) ||
    normalizedTask.includes("unpaid") ||
    normalizedTask.includes("excluded")
  ) {
    return "Excluded";
  }

  const normalized = (taskTypeName ?? "").trim().toLowerCase();
  if (normalized === "pto") return "PTO";
  if (normalized === "excluded") return "Excluded";
  return "Hours";
}

function getMileageRate(dateString: string | null): number {
  if (!dateString) return 0.58;
  if (dateString >= "2025-01-05") return 0.7;
  if (dateString >= "2024-01-14") return 0.67;
  if (dateString >= "2023-05-27") return 0.655;
  return 0.58;
}

function formatOrBlank(value: number): string {
  return value > 0 ? value.toFixed(2) : "";
}

function toBreakdownRows(map: Map<string, number>) {
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([taskName, hours]) => ({
      taskName,
      hours: Number(hours.toFixed(2)),
    }));
}

function createPayrollRows(rawRows: PayrollQueryRow[]): PayrollRow[] {
  const byEmployee = new Map<
    number,
    {
      employeeId: number;
      firstName: string;
      lastName: string;
      fullName: string;
      isSalary: boolean;
      entries: PayrollEntry[];
    }
  >();

  for (const row of rawRows) {
    const employeeId = toNumber(row.employee_id);
    if (!employeeId) continue;

    const firstName = (row.first_name ?? "").trim();
    const lastName = (row.last_name ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const isSalary = Boolean(row.is_salary);

    if (!byEmployee.has(employeeId)) {
      byEmployee.set(employeeId, {
        employeeId,
        firstName,
        lastName,
        fullName,
        isSalary,
        entries: [],
      });
    }

    const taskId = toNumber(row.task_id);
    const bucket = classifyBucket(row.task_type_name, row.task_name, taskId);
    const mileage = toNumber(row.mileage);

    byEmployee.get(employeeId)!.entries.push({
      hours: toNumber(row.hours),
      mileage,
      reimbursement: toNumber(row.reimbursement),
      mileageValue: Number((mileage * getMileageRate(row.date)).toFixed(2)),
      taskName: normalizeTaskName(row.task_name),
      column: bucket,
    });
  }

  return [...byEmployee.values()]
    .map((employee): PayrollRow => {
      const hourEntries = employee.entries.filter(
        (entry) => entry.column === "Hours",
      );
      const ptoEntries = employee.entries.filter(
        (entry) => entry.column === "PTO",
      );
      const excludedEntries = employee.entries.filter(
        (entry) => entry.column === "Excluded",
      );

      const totalHours = hourEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0,
      );
      const overtimeHours = employee.isSalary
        ? 0
        : Math.max(totalHours - 40, 0);
      const payrollHours = employee.isSalary
        ? totalHours
        : Math.min(totalHours, 40);

      const ptoMap = new Map<string, number>();
      for (const entry of ptoEntries) {
        ptoMap.set(
          entry.taskName,
          (ptoMap.get(entry.taskName) ?? 0) + entry.hours,
        );
      }

      const excludedMap = new Map<string, number>();
      for (const entry of excludedEntries) {
        excludedMap.set(
          entry.taskName,
          (excludedMap.get(entry.taskName) ?? 0) + entry.hours,
        );
      }

      const ptoBreakdown = toBreakdownRows(ptoMap);
      const excludedBreakdown = toBreakdownRows(excludedMap);

      const ptoTotal = ptoEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const excludedTotal = excludedEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0,
      );
      const mileageTotal = employee.entries.reduce(
        (sum, entry) => sum + entry.mileage,
        0,
      );
      const onlyReimbursement = employee.entries.reduce(
        (sum, entry) => sum + entry.reimbursement,
        0,
      );
      const totalReimbursement = employee.entries.reduce(
        (sum, entry) => sum + entry.reimbursement + entry.mileageValue,
        0,
      );

      const holidayHours = ptoEntries
        .filter((entry) => entry.taskName === PTO_HOLIDAY)
        .reduce((sum, entry) => sum + entry.hours, 0);
      const sickHours = ptoEntries
        .filter((entry) => entry.taskName === PTO_SICK)
        .reduce((sum, entry) => sum + entry.hours, 0);
      const vacationHours = ptoEntries
        .filter((entry) => entry.taskName === PTO_VACATION)
        .reduce((sum, entry) => sum + entry.hours, 0);

      return {
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: employee.fullName,
        isSalary: employee.isSalary,
        numTimesheets: employee.entries.length,
        totalHours: Number(totalHours.toFixed(2)),
        payrollHours: Number(payrollHours.toFixed(2)),
        overtimeHours: Number(overtimeHours.toFixed(2)),
        ptoTotal: Number(ptoTotal.toFixed(2)),
        excludedTotal: Number(excludedTotal.toFixed(2)),
        mileageTotal: Number(mileageTotal.toFixed(2)),
        totalReimbursement: Number(totalReimbursement.toFixed(2)),
        onlyReimbursement: Number(onlyReimbursement.toFixed(2)),
        ptoBreakdown,
        excludedBreakdown,
        csv: {
          first_name: employee.firstName,
          last_name: employee.lastName,
          regular_hours: employee.isSalary ? "" : formatOrBlank(payrollHours),
          overtime_hours: employee.isSalary ? "" : formatOrBlank(overtimeHours),
          holiday_hours: formatOrBlank(holidayHours),
          sick_hours: formatOrBlank(sickHours),
          vacation_hours: formatOrBlank(vacationHours),
          reimbursement: totalReimbursement.toFixed(2),
        },
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return NextResponse.json(
      { error: "Invalid startDate or endDate. Expected YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (endDate < startDate) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate." },
      { status: 400 },
    );
  }

  const sql = `
    SELECT
      t.employee_id,
      t.task_id,
      e.first_name,
      e.last_name,
      e.is_salary,
      t.hours,
      COALESCE(t.mileage, 0) AS mileage,
      COALESCE(t.reimbursement, 0) AS reimbursement,
      tsk.name AS task_name,
      tt.name AS task_type_name,
      t.date
    FROM timesheets t
    INNER JOIN employees e ON e.id = t.employee_id
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    WHERE t.date >= ?
      AND t.date <= ?
      AND t.resolved = 1
      AND e.email <> 'hidden'
    ORDER BY e.first_name ASC, e.last_name ASC, t.date ASC
  `;

  try {
    const rawRows = (await query({
      query: sql,
      values: [startDate, endDate],
    })) as PayrollQueryRow[];

    const rows = createPayrollRows(rawRows);

    return NextResponse.json({
      rows,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Failed to fetch payroll report rows", error);
    return NextResponse.json(
      { error: "Unable to load payroll data for the selected date range." },
      { status: 500 },
    );
  }
}
