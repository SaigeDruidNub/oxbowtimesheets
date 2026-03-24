"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateEmployee(formData: FormData) {
  const id = formData.get("id") as string;
  const first_name = formData.get("first_name") as string;
  const last_name = formData.get("last_name") as string;
  const email = formData.get("email") as string;
  const access_level = formData.get("access_level") as string;
  const worker_owner = formData.get("worker_owner") === "on" ? 1 : 0;

  const memberOwnerDateRaw = formData.get("member_owner_date");
  const member_owner_date =
    memberOwnerDateRaw && memberOwnerDateRaw !== "" ? memberOwnerDateRaw : null;

  const is_commission = formData.get("is_commission") === "on" ? 1 : 0;
  const is_temp = formData.get("is_temp") === "on" ? 1 : 0;

  const ptoStartDateRaw = formData.get("pto_start_date");
  const pto_start_date =
    ptoStartDateRaw && ptoStartDateRaw !== "" ? ptoStartDateRaw : null;

  const hourly_rate = formData.get("hourly_rate")
    ? parseFloat(formData.get("hourly_rate") as string)
    : 0;
  const is_salary = formData.get("is_salary") === "on" ? 1 : 0;

  try {
    await query({
      query: `
        UPDATE employees SET
          first_name = ?,
          last_name = ?,
          email = ?,
          access_level = ?,
          worker_owner = ?,
          member_owner_date = ?,
          is_commission = ?,
          is_temp = ?,
          pto_start_date = ?,
          hourly_rate = ?,
          is_salary = ?
        WHERE id = ?
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
        id,
      ],
    });

    revalidatePath("/employees/active");
    return { success: true };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: "Failed to update employee" };
  }
}
