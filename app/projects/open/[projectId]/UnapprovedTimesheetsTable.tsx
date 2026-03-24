"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UnapprovedTimesheetRow from "./UnapprovedTimesheetRow";
import { approveTimesheets } from "@/app/projects/actions/approve-timesheets";

interface Component {
  id: number;
  component_name: string;
}

interface TimesheetTableProps {
  entries: any[];
  components: Component[];
}

export default function UnapprovedTimesheetsTable({
  entries,
  components,
}: TimesheetTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(entries.map((e) => e.log_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);

    const result = await approveTimesheets(selectedIds);

    if (result.success) {
      router.refresh();
      setSelectedIds([]);
    } else {
      console.error("Failed to approve timesheets", result.error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[--surface] rounded-lg shadow-sm border border-gray-800 overflow-hidden mt-2">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-200 uppercase tracking-wider text-xs">
          Recent Time Entries (Unapproved)
        </h2>
        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={loading}
            className="px-4 py-2 bg-[#0a6481] hover:bg-[#084e66] text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {loading
              ? "Approving..."
              : `Approve Selected (${selectedIds.length})`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-gray-400 font-medium uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={
                    entries.length > 0 && selectedIds.length === entries.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-[var(--accent)] rounded border-[var(--muted)] bg-[var(--background)] focus:ring-offset-[var(--surface)] cursor-pointer"
                />
              </th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Task</th>
              <th className="px-6 py-4">Component</th>
              <th className="px-6 py-4">Notes</th>
              <th className="px-6 py-4 text-right">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {entries.map((entry) => (
              <UnapprovedTimesheetRow
                key={entry.log_id}
                entry={entry}
                components={components}
                isSelected={selectedIds.includes(entry.log_id)}
                onSelect={(checked) => handleSelectRow(entry.log_id, checked)}
              />
            ))}
            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500 italic"
                >
                  No time entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
