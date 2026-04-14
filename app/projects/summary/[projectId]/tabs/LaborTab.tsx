import type { LaborEntry } from "../page";
import { fmt, fmtDate } from "./shared";

export function LaborTab({ labor }: { labor: LaborEntry[] }) {
  const byEmployee: Record<
    string,
    {
      hours: number;
      ot_hours: number;
      mileage: number;
      reimbursement: number;
      entries: number;
    }
  > = {};
  for (const e of labor) {
    const key = `${e.employee_first} ${e.employee_last}`;
    if (!byEmployee[key])
      byEmployee[key] = {
        hours: 0,
        ot_hours: 0,
        mileage: 0,
        reimbursement: 0,
        entries: 0,
      };
    byEmployee[key].hours += Number(e.hours) || 0;
    byEmployee[key].ot_hours += Number(e.ot_hours) || 0;
    byEmployee[key].mileage += Number(e.mileage) || 0;
    byEmployee[key].reimbursement += Number(e.reimbursement) || 0;
    byEmployee[key].entries += 1;
  }

  const totalHours = labor.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const totalOT = labor.reduce((s, e) => s + (Number(e.ot_hours) || 0), 0);
  const totalMileage = labor.reduce((s, e) => s + (Number(e.mileage) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Total Hours", fmt(totalHours)],
          ["OT Hours", fmt(totalOT)],
          ["Mileage", fmt(totalMileage)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="bg-[--surface] border border-gray-800 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-light">{value}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Hours by Employee
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2 text-right">Entries</th>
              <th className="px-4 py-2 text-right">Reg Hrs</th>
              <th className="px-4 py-2 text-right">OT Hrs</th>
              <th className="px-4 py-2 text-right">Mileage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {Object.entries(byEmployee)
              .sort((a, b) => b[1].hours - a[1].hours)
              .map(([name, data]) => (
                <tr key={name} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2">{name}</td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {data.entries}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(data.hours)}</td>
                  <td className="px-4 py-2 text-right">{fmt(data.ot_hours)}</td>
                  <td className="px-4 py-2 text-right">{fmt(data.mileage)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            All Entries ({labor.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2 text-right">Hrs</th>
                <th className="px-4 py-2 text-right">OT</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {labor.map((e) => (
                <tr
                  key={e.log_id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    {fmtDate(e.date)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {e.employee_first} {e.employee_last}
                  </td>
                  <td className="px-4 py-2">{e.task_name ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {e.task_type_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {e.component_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">{fmt(e.hours)}</td>
                  <td className="px-4 py-2 text-right text-gray-400">
                    {fmt(e.ot_hours)}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-xs">
                    {e.notes ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
