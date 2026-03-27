import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";

type OverviewQueryRow = {
  date: string | null;
  employeeId: number | string;
  employeeName: string | null;
  firstName: string | null;
  projectName: string | null;
  componentName: string | null;
  taskName: string | null;
  taskClassification: string | null;
  taskTypeName: string | null;
  billingType: string | null;
  department: string | null;
  managerName: string | null;
  managerFirstName: string | null;
  siteSupervisorFirstName: string | null;
  leadCarpenterFirstName: string | null;
  jobStatus: string | null;
  hours: number | string | null;
  overtimeHours: number | string | null;
  mileage: number | string | null;
  reimbursement: number | string | null;
  commissionAmount: number | string | null;
  notes: string | null;
  classificationOverride: string | null;
  isSalary: number | boolean | null;
  managerApproved: number | boolean | null;
  isDesign: number | boolean | null;
};

type OverviewPivotRow = {
  date: string;
  employeeId: number;
  employeeName: string;
  firstName: string;
  projectName: string;
  componentName: string;
  taskName: string;
  taskClassification: string;
  taskTypeName: string;
  billingType: string;
  department: string;
  managerName: string;
  managerFirstName: string;
  siteSupervisorFirstName: string;
  leadCarpenterFirstName: string;
  jobStatus: string;
  hours: number;
  overtimeHours: number;
  totalHours: number;
  mileage: number;
  reimbursement: number;
  commissionAmount: number;
  notes: string;
  classificationOverride: string;
  isSalary: boolean;
  managerApproved: boolean;
  isDesign: boolean;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return Number(value ?? 0) === 1;
}

function normalizeText(value: string | null, fallback: string): string {
  return (value ?? "").trim() || fallback;
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
      DATE_FORMAT(t.date, '%Y-%m-%d') AS date,
      t.employee_id AS employeeId,
      TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employeeName,
      e.first_name AS firstName,
      j.job_name AS projectName,
      COALESCE(jc.component_name, '') AS componentName,
      COALESCE(tsk.name, 'Uncategorized') AS taskName,
      COALESCE(tsk.classification, '') AS taskClassification,
      COALESCE(tt.name, 'Uncategorized') AS taskTypeName,
      COALESCE(jtt.name, 'Unknown') AS billingType,
      COALESCE(j.department, '') AS department,
      TRIM(CONCAT(mgr.first_name, ' ', COALESCE(mgr.last_name, ''))) AS managerName,
      mgr.first_name AS managerFirstName,
      ss.first_name AS siteSupervisorFirstName,
      lc.first_name AS leadCarpenterFirstName,
      COALESCE(j.status, '') AS jobStatus,
      j.is_design AS isDesign,
      COALESCE(t.hours, 0) AS hours,
      COALESCE(t.ot_hours, 0) AS overtimeHours,
      COALESCE(t.mileage, 0) AS mileage,
      COALESCE(t.reimbursement, 0) AS reimbursement,
      COALESCE(t.commission_amount, 0) AS commissionAmount,
      COALESCE(t.notes, '') AS notes,
      COALESCE(t.classification_override, '') AS classificationOverride,
      e.is_salary AS isSalary,
      t.manager_approved AS managerApproved
    FROM timesheets t
    INNER JOIN employees e ON e.id = t.employee_id
    INNER JOIN jobs j ON j.id = t.job_id
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    LEFT JOIN task_types jtt ON j.task_type_id = jtt.id
    LEFT JOIN jobs_components jc ON t.component_id = jc.id
    LEFT JOIN employees mgr ON mgr.id = j.manager_id
    LEFT JOIN employees ss ON ss.id = j.site_supervisor_id
    LEFT JOIN employees lc ON lc.id = j.lead_carpenter_id
    WHERE t.date >= ?
      AND t.date <= ?
      AND t.resolved = 1
      AND e.email <> 'hidden'
    ORDER BY t.date ASC, employeeName ASC, projectName ASC
  `;

  try {
    const rawRows = (await query({
      query: sql,
      values: [startDate, endDate],
    })) as OverviewQueryRow[];

    const rows: OverviewPivotRow[] = rawRows.map((row) => {
      const hours = toNumber(row.hours);
      const overtimeHours = toNumber(row.overtimeHours);

      return {
        date: (row.date ?? "").slice(0, 10),
        employeeId: toNumber(row.employeeId),
        employeeName: normalizeText(row.employeeName, "Unknown Employee"),
        firstName: normalizeText(row.firstName, "Unknown"),
        projectName: normalizeText(row.projectName, "Unknown Project"),
        taskName: normalizeText(row.taskName, "Uncategorized"),
        taskClassification: normalizeText(row.taskClassification, ""),
        componentName: normalizeText(row.componentName, ""),
        taskTypeName: normalizeText(row.taskTypeName, "Uncategorized"),
        billingType: normalizeText(row.billingType, "Unknown"),
        department: normalizeText(row.department, ""),
        managerName: normalizeText(row.managerName, "Unknown"),
        managerFirstName: normalizeText(row.managerFirstName, ""),
        siteSupervisorFirstName: normalizeText(row.siteSupervisorFirstName, ""),
        leadCarpenterFirstName: normalizeText(row.leadCarpenterFirstName, ""),
        jobStatus: normalizeText(row.jobStatus, ""),
        hours,
        overtimeHours,
        totalHours: Number((hours + overtimeHours).toFixed(2)),
        mileage: toNumber(row.mileage),
        reimbursement: toNumber(row.reimbursement),
        commissionAmount: toNumber(row.commissionAmount),
        notes: normalizeText(row.notes, ""),
        classificationOverride: normalizeText(row.classificationOverride, ""),
        isSalary: toBoolean(row.isSalary),
        managerApproved: toBoolean(row.managerApproved),
        isDesign: toBoolean(row.isDesign),
      };
    });

    return NextResponse.json({
      rows,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Failed to fetch overview report rows", error);
    return NextResponse.json(
      { error: "Failed to fetch overview report rows." },
      { status: 500 },
    );
  }
}
