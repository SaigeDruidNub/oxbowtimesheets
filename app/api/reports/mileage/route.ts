import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

type MileageQueryRow = {
  employee: string;
  reimbursement: number | string | null;
  projectName: string;
  totalMiles: number | string | null;
};

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

  // Reimbursement is computed from mileage × the rate in effect on each entry's date
  // (mirrors getMileageRate() from the previous iteration).
  const sql = `
    SELECT
      TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS employee,
      j.job_name AS projectName,
      ROUND(SUM(
        COALESCE(t.mileage, 0) * CASE
          WHEN t.date >= '2025-01-05' THEN 0.70
          WHEN t.date >= '2024-01-14' THEN 0.67
          WHEN t.date >= '2023-05-27' THEN 0.655
          ELSE 0.58
        END
      ), 2) AS reimbursement,
      ROUND(SUM(COALESCE(t.mileage, 0)), 2) AS totalMiles
    FROM timesheets t
    INNER JOIN employees e ON e.id = t.employee_id
    INNER JOIN jobs j ON j.id = t.job_id
    WHERE t.date >= ?
      AND t.date <= ?
      AND COALESCE(t.mileage, 0) > 0
    GROUP BY t.employee_id, t.job_id, e.first_name, e.last_name, j.job_name
    ORDER BY totalMiles DESC, reimbursement DESC, employee ASC, projectName ASC
  `;

  try {
    const rawRows = (await query({
      query: sql,
      values: [startDate, endDate],
    })) as MileageQueryRow[];

    const rows = rawRows.map((row) => ({
      employee: row.employee,
      projectName: row.projectName,
      reimbursement: Number(row.reimbursement ?? 0),
      totalMiles: Number(row.totalMiles ?? 0),
    }));

    return NextResponse.json({
      rows,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Failed to fetch mileage report rows", error);
    return NextResponse.json(
      { error: "Failed to fetch mileage report rows." },
      { status: 500 },
    );
  }
}
