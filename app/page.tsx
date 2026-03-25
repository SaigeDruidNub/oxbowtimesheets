import { getTimesheetFormData } from "./timesheets/actions/get-form-data";
import { getTimesheets } from "./timesheets/actions/get-timesheets";
import TimesheetDashboard from "./components/TimesheetDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [formData, timesheets] = await Promise.all([
    getTimesheetFormData(),
    getTimesheets(),
  ]);

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "2rem" }}>
      <TimesheetDashboard initialTimesheets={timesheets} formData={formData} />
    </div>
  );
}
