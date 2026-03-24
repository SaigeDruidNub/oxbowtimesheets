import { getTimesheetFormData } from "../actions/get-form-data";
import { getTimesheets } from "../actions/get-timesheets";
import TimesheetView from "./TimesheetView";

// Ensure dynamic rendering to fetch fresh data on every request
export const dynamic = "force-dynamic";

export default async function AdminTimesheetPage() {
  // Fetch data in parallel
  const [formData, timesheets] = await Promise.all([
    getTimesheetFormData(),
    getTimesheets(),
  ]);

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <TimesheetView initialTimesheets={timesheets} formData={formData} />
    </div>
  );
}
