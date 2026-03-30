"use client";

import { useState, useEffect } from "react";
import { TimesheetFormData, TimesheetEntry } from "../types";
import AdminTimesheetModal from "./AdminTimesheetModal";
import { FaEdit } from "react-icons/fa";

interface TimesheetViewProps {
  initialTimesheets: TimesheetEntry[];
  formData: TimesheetFormData;
  targetEmployee?: { id: number; name: string } | null;
}

export default function TimesheetView({
  initialTimesheets,
  formData,
  targetEmployee,
}: TimesheetViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(
    null,
  );

  // Auto-open modal when navigated here for a specific employee
  useEffect(() => {
    if (targetEmployee) {
      setSelectedEntry(null);
      setIsModalOpen(true);
    }
  }, [targetEmployee]);

  const handleEdit = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-maximum-blue)]">
          Admin Timesheets (Current Week)
        </h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-[var(--color-maximum-blue)] text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm font-medium"
        >
          Add New Entry
        </button>
      </div>

      {/* Timesheet List Table */}
      <div className="bg-[var(--color-paynes-gray)] text-white rounded-lg shadow overflow-hidden border border-[var(--color-light-gray)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-black-pearl)]/50 border-b border-[var(--color-light-gray)]/20 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Project</th>
                <th className="p-4 font-semibold">Task</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold text-right">Hours</th>
                <th className="p-4 font-semibold text-right">OT</th>
                <th className="p-4 font-semibold text-center">Hrly?</th>
                <th className="p-4 font-semibold text-right">Mileage</th>
                <th className="p-4 font-semibold text-right">Reimb.</th>
                <th className="p-4 font-semibold text-right">Comm.</th>
                <th className="p-4 font-semibold">Notes</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-light-gray)]/20 text-sm">
              {initialTimesheets.length > 0 ? (
                initialTimesheets.map((entry) => (
                  <tr
                    key={entry.log_id}
                    className="hover:bg-[var(--color-black-pearl)]/30 transition-colors"
                  >
                    <td className="p-4 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-white font-medium">
                      {entry.job_name}
                    </td>
                    <td className="p-4">{entry.task_name}</td>
                    <td className="p-4 text-[var(--color-light-gray)]">
                      {entry.task_type_name || "-"}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {entry.hours > 0 ? entry.hours.toFixed(2) : "-"}
                    </td>
                    <td className="p-4 text-right font-mono text-white">
                      {entry.ot_hours > 0 ? entry.ot_hours.toFixed(2) : "-"}
                    </td>
                    <td className="p-4 text-center">
                      {entry.is_hourly ? (
                        <span className="text-[var(--color-maximum-blue)] font-bold text-xl">
                          ✓
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-white">
                      {entry.mileage > 0 ? entry.mileage.toFixed(2) : "-"}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {entry.reimbursement > 0
                        ? `$${entry.reimbursement.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {entry.commission_amount > 0
                        ? `$${entry.commission_amount.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="p-4 max-w-xs truncate text-[var(--color-light-gray)]">
                      {entry.notes}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleEdit(entry)}
                        title="Edit"
                        className="text-gray-400 hover:text-[var(--color-maximum-blue)] transition-colors"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="p-8 text-center text-[var(--color-light-gray)]"
                  >
                    No timesheet entries found for this week. Click "Add New
                    Entry" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminTimesheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        timesheet={selectedEntry || undefined}
        targetEmployee={!selectedEntry ? targetEmployee : null}
      />
    </div>
  );
}
