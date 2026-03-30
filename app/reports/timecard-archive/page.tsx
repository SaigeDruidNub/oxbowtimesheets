import { getAdminTimesheetFormData } from "@/app/timesheets/actions/get-admin-form-data";
import TimecardArchiveClient from "./TimecardArchiveClient";

export default async function TimecardArchive() {
  const formData = await getAdminTimesheetFormData();

  return (
    <div className="p-6">
      <TimecardArchiveClient formData={formData} />
    </div>
  );
}
