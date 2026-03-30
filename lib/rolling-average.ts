import { query } from "@/lib/db";

// Task IDs excluded from hour totals (same as PTO settings)
const EXCLUDE_TASK_IDS = [540, 172, 529, 241, 525].join(", ");

export interface RollingAverageResult {
  employee_id: number;
  average: number;
}

export async function getTenWeekRollingAverage(): Promise<
  RollingAverageResult[]
> {
  const sql = `
    SELECT
      timesheets.employee_id,
      ROUND(SUM(timesheets.hours) / 10, 2) AS average
    FROM timesheets
    WHERE
      CAST(timesheets.date AS DATE) >= DATE_SUB(CURDATE(), INTERVAL 10 WEEK)
      AND timesheets.task_id NOT IN (${EXCLUDE_TASK_IDS})
    GROUP BY timesheets.employee_id
  `;
  return (await query({ query: sql })) as RollingAverageResult[];
}

export async function getMyTenWeekRollingAverage(
  userId: number,
): Promise<number> {
  const sql = `
    SELECT
      timesheets.employee_id,
      ROUND(SUM(timesheets.hours) / 10, 2) AS average
    FROM timesheets
    WHERE
      timesheets.employee_id = ?
      AND CAST(timesheets.date AS DATE) >= DATE_SUB(CURDATE(), INTERVAL 10 WEEK)
      AND timesheets.task_id NOT IN (${EXCLUDE_TASK_IDS})
    GROUP BY timesheets.employee_id
  `;
  const results = (await query({
    query: sql,
    values: [userId],
  })) as RollingAverageResult[];
  return results[0]?.average ?? 0;
}
