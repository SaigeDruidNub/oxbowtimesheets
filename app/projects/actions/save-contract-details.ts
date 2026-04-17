"use server";

import { query } from "@/lib/db";

export interface ContractDetails {
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  description: string | null;
  architect_designer_info: string | null;
  commencement_date: string | null;
  substantial_completion: string | null;
  drawings_reference: string | null;
  default_contract_type: string | null;
  csl_holder: string | null;
  waste_disposal: string | null;
  role_director: string | null;
  role_construction_pm: string | null;
  role_junior_pm: string | null;
  role_pm_assistant: string | null;
  role_site_supervisor: string | null;
  role_designer_name: string | null;
  contract_total: number | null;
  deposit_percent: number | null;
  contract_signed: string | null;
}

export async function saveContractDetails(
  jobId: number,
  details: ContractDetails,
) {
  if (!jobId) return { error: "Job ID required" };

  try {
    await query({
      query: `
        UPDATE jobs SET
          client_name = ?,
          client_email = ?,
          client_phone = ?,
          client_address = ?,
          description = ?,
          architect_designer_info = ?,
          commencement_date = ?,
          substantial_completion = ?,
          drawings_reference = ?,
          default_contract_type = ?,
          csl_holder = ?,
          waste_disposal = ?,
          role_director = ?,
          role_construction_pm = ?,
          role_junior_pm = ?,
          role_pm_assistant = ?,
          role_site_supervisor = ?,
          role_designer_name = ?,
          contract_total = ?,
          deposit_percent = ?,
          contract_signed = ?
        WHERE id = ?
      `,
      values: [
        details.client_name || null,
        details.client_email || null,
        details.client_phone || null,
        details.client_address || null,
        details.description || null,
        details.architect_designer_info || null,
        details.commencement_date || null,
        details.substantial_completion || null,
        details.drawings_reference || null,
        details.default_contract_type || "Billable Fixed",
        details.csl_holder || null,
        details.waste_disposal || null,
        details.role_director || null,
        details.role_construction_pm || null,
        details.role_junior_pm || null,
        details.role_pm_assistant || null,
        details.role_site_supervisor || null,
        details.role_designer_name || null,
        details.contract_total ?? null,
        details.deposit_percent ?? null,
        details.contract_signed || null,
        jobId,
      ],
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error saving contract details:", error);
    return { error: error.message };
  }
}
