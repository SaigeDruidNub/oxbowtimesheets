"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProject(formData: FormData) {
  const id = formData.get("id") as string;
  const legacy_id = formData.get("legacy_id") as string;
  const job_name = formData.get("job_name") as string;
  const status = formData.get("status") as string;
  const description = formData.get("description") as string;
  const client_name = formData.get("client_name") as string;
  const manager_id = formData.get("manager_id") || null;
  const supervisor_id = formData.get("site_supervisor_id") || null;

  // Get all selected team members
  const teamMembers = formData.getAll("team_members");

  try {
    // 1. Update Project Info
    await query({
      query: `
        UPDATE jobs 
        SET legacy_id = ?, job_name = ?, status = ?, description = ?, client_name = ?, manager_id = ?, site_supervisor_id = ?
        WHERE id = ?
      `,
      values: [
        legacy_id,
        job_name,
        status,
        description,
        client_name,
        manager_id,
        supervisor_id,
        id,
      ],
    });

    // 2. Update Team Members
    // First remove all existing team members for this project
    await query({
      query: "DELETE FROM employees_jobs WHERE job_id = ?",
      values: [id],
    });

    // Then insert the new ones
    if (teamMembers.length > 0) {
      // Create value placeholders (?, ?), (?, ?)...
      const placeholders = teamMembers.map(() => "(?, ?)").join(", ");
      const values = teamMembers.flatMap((empId) => [id, empId]); // [job_id, emp_id, job_id, emp_id...]

      await query({
        query: `INSERT INTO employees_jobs (job_id, employee_id) VALUES ${placeholders}`,
        values: values,
      });
    }

    revalidatePath(`/projects/open/${id}`);
    revalidatePath(`/projects/open`); // Also update the list view just in case status/name changes
    return { success: true };
  } catch (error: any) {
    console.error("Error updating project:", error);
    return { error: error.message };
  }
}
