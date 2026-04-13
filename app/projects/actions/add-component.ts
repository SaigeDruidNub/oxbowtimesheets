"use server";

import { query } from "@/lib/db";

export async function addComponent(jobId: number | string, name: string) {
  if (!name || !name.trim()) {
    return { error: "Component name is required" };
  }

  try {
    const result: any = await query({
      query: `INSERT INTO jobs_components (job_id, component_name, budget) VALUES (?, ?, 0)`,
      values: [jobId, name.trim()],
    });

    // Return the new ID if possible, though MySQL implementation in lib/db might vary on what it returns
    // Usually result.insertId
    return { success: true, newId: result.insertId };
  } catch (error: any) {
    console.error("Error adding component:", error);
    return { error: error.message };
  }
}
