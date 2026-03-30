"use server";

import { auth } from "@/auth";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveOwnerDoc(html: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  await query({
    query: "UPDATE document_html SET html = ? ORDER BY updated ASC LIMIT 1",
    values: [html],
  });

  revalidatePath("/documents/home");
  return { success: true };
}

export async function saveWorkerDoc(html: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  await query({
    query: "UPDATE document_html SET html = ? ORDER BY updated DESC LIMIT 1",
    values: [html],
  });

  revalidatePath("/documents/home");
  return { success: true };
}
