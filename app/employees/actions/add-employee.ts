"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addEmployee(formData: FormData) {
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const email = formData.get("email") as string;
  const access_level = formData.get("access_level") as string;
  const worker_owner = formData.get("worker_owner") === "on" ? 1 : 0;
  const member_owner_date = formData.get("member_owner_date") || null;
  const is_commission = formData.get("is_commission") === "on" ? 1 : 0;
  const is_temp = formData.get("is_temp") === "on" ? 1 : 0;
  const pto_start_date = formData.get("pto_start_date") || null;
  const hourly_rate = formData.get("hourly_rate")
    ? parseFloat(formData.get("hourly_rate") as string)
    : 0;
  const is_salary = formData.get("is_salary") === "on" ? 1 : 0;

  try {
    await query({
      query: `
        INSERT INTO employees (
          first_name, last_name, email, access_level, worker_owner, 
          member_owner_date, is_commission, is_temp, pto_start_date, 
          hourly_rate, is_salary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        first_name,
        last_name,
        email,
        access_level,
        worker_owner,
        member_owner_date,
        is_commission,
        is_temp,
        pto_start_date,
        hourly_rate,
        is_salary,
      ],
    });

    revalidatePath("/employees/active");
    return { success: true };
  } catch (error) {
    console.error("Failed to add employee:", error);
    return { success: false, error: "Failed to add employee" };
  }
}
