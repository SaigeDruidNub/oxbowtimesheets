import { getActiveEmployees } from "./actions";
import MOAuditClient from "./MOAuditClient";

export default async function MOAuditNew() {
  const employees = await getActiveEmployees();

  return (
    <div className="p-6">
      <MOAuditClient employees={employees} />
    </div>
  );
}
