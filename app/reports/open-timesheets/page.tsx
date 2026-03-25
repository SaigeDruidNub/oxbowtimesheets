import { getAllUnapprovedTimesheets } from "@/app/timesheets/actions/get-all-unapproved-timesheets";
import { getTimesheetFormData } from "@/app/timesheets/actions/get-form-data";
import UnapprovedTimesheetsClient from "./UnapprovedTimesheetsClient";

export default async function OpenTimesheetsPage() {
  const timesheets = await getAllUnapprovedTimesheets();
  const formData = await getTimesheetFormData();

  return (
    <div className="p-6">
      <UnapprovedTimesheetsClient
        initialTimesheets={timesheets}
        formData={formData}
      />
    </div>
  );
}
