import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

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

export default async function DocumentsHome() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  const userId = (session.user as any)?.id;
  const [docs, ownerAccess] = await Promise.all([
    getDocuments(),
    isWorkerOwner(userId),
  ]);

  const ownerDocs = docs[0];
  const workerDocs = docs[1];

  return (
    <div className="space-y-8">
      {ownerAccess && ownerDocs && (
        <section>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "0.75rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--muted)",
            }}
          >
            Member Owner Documents
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: ownerDocs.html }}
            style={{ lineHeight: 1.6 }}
          />
        </section>
      )}
      {workerDocs && (
        <section>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "0.75rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--muted)",
            }}
          >
            Worker Documents
          </h1>
          <div
            dangerouslySetInnerHTML={{ __html: workerDocs.html }}
            style={{ lineHeight: 1.6 }}
          />
        </section>
      )}
    </div>
  );
}
