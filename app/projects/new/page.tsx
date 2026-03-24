import { query } from "@/lib/db";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const employees = (await query({
    query:
      "SELECT id, first_name, last_name FROM employees WHERE email != 'hidden' ORDER BY first_name ASC",
    values: [],
  })) as any[];

  const taskTypes = (await query({
    query: "SELECT id, name FROM task_types ORDER BY id ASC",
    values: [],
  })) as any[];

  return (
    <div className="max-w-5xl mx-auto p-8 bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--muted)]/20 min-h-screen">
      <NewProjectForm employees={employees} taskTypes={taskTypes} />
    </div>
  );
}
