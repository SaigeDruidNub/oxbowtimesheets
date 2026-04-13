"use server";

import { query } from "@/lib/db";

export async function createProjectSummary(jobId: number) {
  if (!jobId) return { error: "Job is required" };

  try {
    await query({
      query: `INSERT INTO project_summaries (job_id, is_active) VALUES (?, 1)`,
      values: [jobId],
    });
    return { success: true };
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return { error: "A summary already exists for that project." };
    }
    console.error("Error creating project summary:", error);
    return { error: error.message };
  }
}
