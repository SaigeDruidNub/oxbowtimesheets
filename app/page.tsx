import { getTimesheetFormData } from "./timesheets/actions/get-form-data";
import { getTimesheets } from "./timesheets/actions/get-timesheets";
import { getPTO } from "./timesheets/actions/get-pto";
import { getTenWeekAverage } from "./timesheets/actions/get-ten-week-average";
import TimesheetDashboard from "./components/TimesheetDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [formData, timesheets, ptoData, tenWeekAverage] = await Promise.all([
    getTimesheetFormData(),
    getTimesheets(),
    getPTO(),
    getTenWeekAverage(),
  ]);

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "2rem" }}>
      <TimesheetDashboard
        initialTimesheets={timesheets}
        formData={formData}
        ptoData={ptoData}
        tenWeekAverage={tenWeekAverage}
      />
    </div>
  );
}
