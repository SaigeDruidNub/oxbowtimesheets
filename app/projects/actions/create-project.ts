"use server";

import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProject(prevState: any, formData: FormData) {
  try {
    const jobName = formData.get("job_name") as string;
    const legacyId = formData.get("legacy_id") as string;
    const managerId = formData.get("manager_id");

    // Validate required fields
    if (!managerId) {
      return { error: "Manager is required" };
    }

    // Project Settings
    const isDesign = formData.get("is_design") === "on" ? 1 : 0;
    const isReferral = formData.get("is_referral") === "on" ? 1 : 0;
    const designerId = formData.get("designer_id");
    const siteSupervisorId = formData.get("site_supervisor_id");
    const leadCarpenterId = formData.get("lead_carpenter_id");
    const department = formData.get("department") as string;
    const taskTypeId = formData.get("task_type_id");
    const status = formData.get("status") as string;

    // Client Info
    const clientName = formData.get("client_name") as string;
    const clientPhone = formData.get("client_phone") as string;
    const clientEmail = formData.get("client_email") as string;
    const description = formData.get("description") as string;

    if (!clientName || !clientName.trim()) {
      return { error: "Client Name is required" };
    }
    if (!clientPhone || !clientPhone.trim()) {
      return { error: "Client Phone is required" };
    }
    if (!clientEmail || !clientEmail.trim()) {
      return { error: "Client Email is required" };
    }
    if (!description || !description.trim()) {
      return { error: "Description is required" };
    }

    // Members (employees_jobs)
    // We need to parse all checked members from formData.
    // Assuming inputs are named "members" with value employeeId
    const members = formData.getAll("members");

    // Insert Job
    const result: any = await query({
      query: `
        INSERT INTO jobs (
          job_name, legacy_id, manager_id, 
          is_design, is_referral, designer_id, site_supervisor_id, lead_carpenter_id,
          department, task_type_id, status,
          client_name, client_phone, client_email, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        jobName,
        legacyId,
        managerId,
        isDesign,
        isReferral,
        designerId || null,
        siteSupervisorId || null,
        leadCarpenterId || null,
        department,
        taskTypeId,
        status,
        clientName || null,
        clientPhone || null,
        clientEmail || null,
        description || null,
      ],
    });

    const newJobId = result.insertId;

    // Insert Members
    if (members && members.length > 0) {
      // Use Promise.all for parallel inserts
      await Promise.all(
        members.map((empId) =>
          query({
            query: `INSERT INTO employees_jobs (employee_id, job_id) VALUES (?, ?)`,
            values: [empId, newJobId],
          }),
        ),
      );
    }

    revalidatePath("/projects");
    revalidatePath("/projects/open");
  } catch (error: any) {
    console.error("Failed to create project:", error);
    return { error: error.message };
  }

  redirect("/projects/open");
}
