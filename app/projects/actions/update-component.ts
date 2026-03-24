"use server";

import { query } from "@/lib/db";

export async function updateComponent(id: number, name: string) {
  if (!name || !name.trim()) {
    return { error: "Component name is required" };
  }

  try {
    const result: any = await query({
      query: `UPDATE jobs_components SET component_name = ? WHERE id = ?`,
      values: [name.trim(), id],
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating component:", error);
    return { error: error.message };
  }
}
