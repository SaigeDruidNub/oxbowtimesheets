"use server";

import { query } from "@/lib/db";
import { auth } from "@/auth";

export async function getTimesheets() {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    return [];
  }

  // Calculate current week (Sunday to Saturday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startDateStr = startOfWeek.toISOString().split("T")[0];
  const endDateStr = endOfWeek.toISOString().split("T")[0];

  // Fetch timesheets for the current user for the current week
  // Join with jobs, tasks, and task_types to get names
  const timesheetQuery = `
    SELECT 
      t.log_id, 
      t.date, 
      t.job_id,
      t.task_id,
      t.task_type_id,
      t.component_id,
      t.hours, 
      t.ot_hours, 
      t.mileage, 
      t.reimbursement,
      t.commission_amount,
      t.is_hourly,
      t.notes,
      t.classification_override,
      j.job_name, 
      tsk.name as task_name,
      tt.name as task_type_name,
      c.component_name
    FROM timesheets t
    LEFT JOIN jobs j ON t.job_id = j.id
    LEFT JOIN tasks tsk ON t.task_id = tsk.id
    LEFT JOIN task_types tt ON t.task_type_id = tt.id
    LEFT JOIN jobs_components c ON t.component_id = c.id
    WHERE t.employee_id = ? AND t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC
  `;

  try {
    const timesheets = (await query({
      query: timesheetQuery,
      values: [currentUserId, startDateStr, endDateStr],
    })) as any[];

    return timesheets;
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return [];
  }
}
