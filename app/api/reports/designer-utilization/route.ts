import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDesignerAdmin = user.accessLevel === "Designer Admin";

  if (!user.isCommission && !isDesignerAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sql = `
    SELECT
      e.id,
      e.first_name,
      e.last_name,
      IFNULL(
        SUM(CASE WHEN YEAR(t.date) = YEAR(CURDATE()) AND j.is_design = 1 THEN (t.hours + t.ot_hours) ELSE 0 END) /
        NULLIF(SUM(CASE WHEN YEAR(t.date) = YEAR(CURDATE()) THEN (t.hours + t.ot_hours) ELSE 0 END), 0),
      0) AS YTD,
      IFNULL(
        SUM(CASE WHEN t.date >= DATE(DATE_FORMAT(CURDATE(), '%Y-%m-01') - INTERVAL ((MONTH(CURDATE())-1) % 3) MONTH) AND j.is_design = 1 THEN (t.hours + t.ot_hours) ELSE 0 END) /
        NULLIF(SUM(CASE WHEN t.date >= DATE(DATE_FORMAT(CURDATE(), '%Y-%m-01') - INTERVAL ((MONTH(CURDATE())-1) % 3) MONTH) THEN (t.hours + t.ot_hours) ELSE 0 END), 0),
      0) AS QTD,
      IFNULL(
        SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-1 DAY) AND j.is_design = 1 THEN (t.hours + t.ot_hours) ELSE 0 END) /
        NULLIF(SUM(CASE WHEN t.date >= DATE_SUB(CURDATE(), INTERVAL DAYOFWEEK(CURDATE())-1 DAY) THEN (t.hours + t.ot_hours) ELSE 0 END), 0),
      0) AS WTD
    FROM employees e
    JOIN timesheets t ON t.employee_id = e.id
    LEFT JOIN jobs j ON t.job_id = j.id
    WHERE e.is_commission = 1
      AND e.email != 'hidden'
      ${!isDesignerAdmin ? "AND e.id = ?" : ""}
    GROUP BY e.id, e.first_name, e.last_name
    ORDER BY e.first_name ASC
  `;

  const values = isDesignerAdmin ? [] : [user.id];

  try {
    const rows = (await query({ query: sql, values })) as any[];
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Designer utilization query failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
