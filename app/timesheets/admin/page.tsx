import { getTimesheetFormData } from "../actions/get-form-data";
import { getTimesheets } from "../actions/get-timesheets";
import TimesheetView from "./TimesheetView";
import { query } from "@/lib/db";

// Ensure dynamic rendering to fetch fresh data on every request
export const dynamic = "force-dynamic";

export default async function AdminTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ forEmployee?: string }>;
}) {
  const { forEmployee } = await searchParams;

  let targetEmployee: { id: number; name: string } | null = null;
  if (forEmployee) {
    const empId = parseInt(forEmployee);
    if (!isNaN(empId)) {
      const rows = (await query({
        query: "SELECT id, first_name, last_name FROM employees WHERE id = ?",
        values: [empId],
      })) as any[];
      if (rows[0]) {
        targetEmployee = {
          id: rows[0].id,
          name: `${rows[0].first_name} ${rows[0].last_name}`,
        };
      }
    }
  }

  // Fetch data in parallel
  const [formData, timesheets] = await Promise.all([
    getTimesheetFormData(),
    getTimesheets(),
  ]);

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <TimesheetView
        initialTimesheets={timesheets}
        formData={formData}
        targetEmployee={targetEmployee}
      />
    </div>
  );
}
