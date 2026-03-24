"use client";

import { useState } from "react";
import { updateEmployee } from "../actions/update-employee";
import { useRouter } from "next/navigation";

// Define locally or import from a shared types file
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  access_level: string;
  worker_owner: number;
  member_owner_date: string | Date | null;
  is_commission: number;
  is_temp: number;
  legacy_pto: number;
  pto_start_date: string | Date | null;
  sub_id: number | null;
  hourly_rate: number;
  is_salary: number;
}

export default function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("id", employee.id.toString());

    // Explicitly handle checkboxes if they are unchecked, formData normally just omits them
    // But since the server action defaults checks to "on", that logic holds for update too
    // However, if unchecked, it won't be in formData, so server action sees undefined, or empty string.
    // The server action checks `=== "on"`, so if unchecked it is false. Correct.

    const result = await updateEmployee(formData);

    if (result.success) {
      onClose();
      router.refresh();
      // No reset needed as component will unmount or stay populated
    } else {
      alert("Error updating employee: " + result.error);
    }
    setLoading(false);
  };

  // Helper to format date for input value="YYYY-MM-DD"
  const formatDateForInput = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[var(--muted)]/20">
          <h2 className="text-xl font-bold">
            Edit Employee: {employee.first_name} {employee.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                name="first_name"
                defaultValue={employee.first_name}
                required
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                name="last_name"
                defaultValue={employee.last_name}
                required
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={employee.email}
                required
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Access Level
              </label>
              <select
                name="access_level"
                defaultValue={employee.access_level}
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Hourly Rate ($)
              </label>
              <input
                name="hourly_rate"
                type="number"
                step="0.01"
                min="0"
                defaultValue={employee.hourly_rate}
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Date Fields */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Member Owner Date
              </label>
              <input
                name="member_owner_date"
                type="date"
                defaultValue={formatDateForInput(employee.member_owner_date)}
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                PTO Start Date
              </label>
              <input
                name="pto_start_date"
                type="date"
                defaultValue={formatDateForInput(employee.pto_start_date)}
                className="w-full bg-[var(--background)] border border-[var(--muted)]/40 rounded px-3 py-2 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="worker_owner"
                  defaultChecked={employee.worker_owner === 1}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm">Worker Owner</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_commission"
                  defaultChecked={employee.is_commission === 1}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm">Commission</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_temp"
                  defaultChecked={employee.is_temp === 1}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm">Temp</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_salary"
                  defaultChecked={employee.is_salary === 1}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm">Salary</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--muted)]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:brightness-110 transition-all font-medium"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
