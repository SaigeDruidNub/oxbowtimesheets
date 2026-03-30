"use client";

import { useState } from "react";
import AdminTimesheetModal from "@/app/timesheets/admin/AdminTimesheetModal";
import { TimesheetFormData } from "@/app/timesheets/types";

interface Props {
  employee: { id: number; first_name: string; last_name: string };
  formData: TimesheetFormData;
}

export default function AddTimecardButton({ employee, formData }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[var(--foreground)] text-xs font-medium border border-[var(--foreground)]/20 px-2 py-1 rounded hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors"
      >
        Add TC
      </button>
      <AdminTimesheetModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        formData={formData}
        targetEmployee={{
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
        }}
      />
    </>
  );
}
