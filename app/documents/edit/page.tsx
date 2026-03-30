import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import DocumentEditor from "./DocumentEditor";

async function getDocuments() {
  const result = await query({
    query: "SELECT html FROM document_html ORDER BY updated ASC",
  });
  return result as { html: string }[];
}

async function isWorkerOwner(userId: number): Promise<boolean> {
  const result = (await query({
    query: "SELECT worker_owner FROM employees WHERE id = ?",
    values: [userId],
  })) as any[];
  return result[0]?.worker_owner === 1;
}

export default async function EditDocuments() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  const user = session.user as any;
  if (user?.accessLevel !== "Admin") redirect("/documents/home");

  const userId = (session.user as any)?.id;
  const [docs, ownerAccess] = await Promise.all([
    getDocuments(),
    isWorkerOwner(userId),
  ]);

  return (
    <DocumentEditor
      ownerHtml={docs[0]?.html ?? ""}
      workerHtml={docs[1]?.html ?? ""}
      isOwner={ownerAccess}
    />
  );
}
