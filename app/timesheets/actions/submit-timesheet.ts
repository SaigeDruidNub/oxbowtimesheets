"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function submitTimesheet(formData: FormData) {
  const session = await auth();
  const sessionUserId = (session?.user as any)?.id;
  const accessLevel = (session?.user as any)?.accessLevel;

  if (!sessionUserId) {
    return { error: "Unauthorized: No user session found." };
  }

  // Admins can submit on behalf of another employee
  const targetEmployeeId = formData.get("target_employee_id");
  const employee_id =
    accessLevel === "Admin" && targetEmployeeId
      ? targetEmployeeId
      : sessionUserId;

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
  const log_id = formData.get("log_id");

  if (!date || !job_id || !task_type_id) {
    return { error: "Missing required fields" };
  }

  if (log_id) {
    // Update existing timesheet
    const updateQuery = `
      UPDATE timesheets SET
        date = ?, job_id = ?, task_id = ?, task_type_id = ?, 
        hours = ?, ot_hours = ?, mileage = ?, reimbursement = ?, commission_amount = ?,
        notes = ?, classification_override = ?, is_hourly = ?, component_id = ?
      WHERE log_id = ? AND employee_id = ?
    `;
    const values = [
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
      employee_id,
    ];

    try {
      await query({ query: updateQuery, values });
      revalidatePath("/timesheets/admin");
      revalidatePath("/");
      return { success: true };
    } catch (error) {
      console.error("Error updating timesheet:", error);
      return { error: "Failed to update timesheet" };
    }
  }

  const insertQuery = `
    INSERT INTO timesheets (
      employee_id, date, job_id, task_id, task_type_id, 
      hours, ot_hours, mileage, reimbursement, commission_amount,
      notes, classification_override, is_hourly, resolved, manager_approved, component_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `;

  const values = [
    employee_id,
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
  ];

  try {
    await query({ query: insertQuery, values });
    revalidatePath("/timesheets/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    return { error: "Failed to submit timesheet" };
  }
}
