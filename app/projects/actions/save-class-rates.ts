"use server";

import { query } from "@/lib/db";

export async function saveClassRates(
  jobId: number,
  rates: Record<string, number>,
) {
  if (!jobId) return { error: "Job ID required" };

  try {
    // Delete existing overrides for this job then re-insert
    await query({
      query: `DELETE FROM job_class_rates WHERE job_id = ?`,
      values: [jobId],
    });

    const entries = Object.entries(rates).filter(
      ([, rate]) => rate != null && !isNaN(rate),
    );

    for (const [labor_class, rate] of entries) {
      await query({
        query: `INSERT INTO job_class_rates (job_id, labor_class, rate) VALUES (?, ?, ?)`,
        values: [jobId, labor_class, rate],
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error saving class rates:", error);
    return { error: error.message };
  }
}
