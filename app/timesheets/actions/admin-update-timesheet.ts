"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function adminUpdateTimesheet(formData: FormData) {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    return { error: "Unauthorized" };
  }

  const log_id = formData.get("log_id");
  const date = formData.get("date");
  const job_id = formData.get("job_id");
  const task_id = formData.get("task_id");
  const task_type_id = formData.get("task_type_id");
  const hours = parseFloat(formData.get("hours") as string) || 0;
  const ot_hours = parseFloat(formData.get("ot_hours") as string) || 0;
  const mileage = parseFloat(formData.get("mileage") as string) || 0;
  const reimbursement =
    parseFloat(formData.get("reimbursement") as string) || 0;
  const commission_amount =
    parseFloat(formData.get("commission_amount") as string) || 0;
  const notes = formData.get("notes") || "";
  const classification_override =
    formData.get("classification_override") || null;
  const is_hourly = formData.get("is_hourly") === "on" ? 1 : 0;
  const component_id = formData.get("component_id") || null;

  if (!log_id || !date || !job_id || !task_type_id) {
    return { error: "Missing required fields" };
  }

  const updateQuery = `
    UPDATE timesheets SET
      date = ?, job_id = ?, task_id = ?, task_type_id = ?, 
      hours = ?, ot_hours = ?, mileage = ?, reimbursement = ?, commission_amount = ?,
      notes = ?, classification_override = ?, is_hourly = ?, component_id = ?
    WHERE log_id = ?
  `;

  try {
    await query({
      query: updateQuery,
      values: [
        date,
        job_id,
        task_id,
        task_type_id,
        hours,
        ot_hours,
        mileage,
        reimbursement,
        commission_amount,
        notes,
        classification_override,
        is_hourly,
        component_id,
        log_id,
      ],
    });
    revalidatePath("/reports/timecard-archive");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return { error: "Failed to update timesheet" };
  }
}

export async function adminSplitTimesheet(formData: FormData) {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id;

  if (!currentUserId) {
    return { error: "Unauthorized" };
  }

  const log_id = formData.get("log_id");
  const original_hours =
    parseFloat(formData.get("original_hours") as string) || 0;
  const split_hours = parseFloat(formData.get("split_hours") as string) || 0;

  if (!log_id) {
    return { error: "Missing timesheet ID" };
  }

  if (split_hours <= 0 || split_hours >= original_hours) {
    return {
      error: "Split hours must be greater than 0 and less than original hours",
    };
  }

  const remaining_hours = original_hours - split_hours;

  // Fields for the new split entry
  const date = formData.get("split_date");
  const job_id = formData.get("split_job_id");
  const task_id = formData.get("split_task_id");
  const task_type_id = formData.get("split_task_type_id");
  const ot_hours = parseFloat(formData.get("split_ot_hours") as string) || 0;
  const mileage = parseFloat(formData.get("split_mileage") as string) || 0;
  const reimbursement =
    parseFloat(formData.get("split_reimbursement") as string) || 0;
  const commission_amount =
    parseFloat(formData.get("split_commission_amount") as string) || 0;
  const notes = formData.get("split_notes") || "";
  const classification_override =
    formData.get("split_classification_override") || null;
  const is_hourly = formData.get("split_is_hourly") === "on" ? 1 : 0;
  const component_id = formData.get("split_component_id") || null;
  const employee_id = formData.get("employee_id");

  if (!date || !job_id || !task_type_id || !employee_id) {
    return { error: "Missing required fields for split entry" };
  }

  try {
    // Reduce hours on the original timesheet
    await query({
      query: `UPDATE timesheets SET hours = ? WHERE log_id = ?`,
      values: [remaining_hours, log_id],
    });

    // Insert the new split entry
    await query({
      query: `
        INSERT INTO timesheets (
          employee_id, date, job_id, task_id, task_type_id,
          hours, ot_hours, mileage, reimbursement, commission_amount,
          notes, classification_override, is_hourly, component_id,
          resolved, manager_approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      `,
      values: [
        employee_id,
        date,
        job_id,
        task_id,
        task_type_id,
        split_hours,
        ot_hours,
        mileage,
        reimbursement,
        commission_amount,
        notes,
        classification_override,
        is_hourly,
        component_id,
      ],
    });

    revalidatePath("/reports/timecard-archive");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error splitting timesheet:", error);
    return { error: "Failed to split timesheet" };
  }
}
