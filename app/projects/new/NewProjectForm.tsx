"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createProject } from "../actions/create-project";

const initialState = {
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-medium"
    >
      {pending ? "Creating..." : "Create Project"}
    </button>
  );
}

export default function NewProjectForm({
  employees,
  taskTypes,
}: {
  employees: any[];
  taskTypes: any[];
}) {
  // @ts-ignore
  const [state, formAction] = useFormState(createProject, initialState);

  // Filter out terminated employees if necessary, but assuming all are active for now or filtering in query
  // Sort employees alphabetically
  const sortedEmployees = [...employees].sort((a, b) =>
    (a.first_name + " " + a.last_name).localeCompare(
      b.first_name + " " + b.last_name,
    ),
  );

  return (
    <form action={formAction} className="space-y-6 text-white text-sm">
      {state?.error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded text-white">
          {state.error}
        </div>
      )}

      {/* Header Info */}
      <h2 className="text-2xl font-bold mb-4">Creating New Project!</h2>

      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            name="job_name"
            type="text"
            className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Project #</label>
          <input
            name="legacy_id"
            type="text"
            defaultValue="26-018"
            className="w-1/3 bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white focus:border-[var(--accent)] outline-none"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Manager *</label>
          <select
            name="manager_id"
            required
            className="w-1/2 bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white focus:border-[var(--accent)] outline-none appearance-none"
          >
            <option value="">Select a manager</option>
            {sortedEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members List */}
      <div className="mt-6">
        <label className="block mb-2 font-medium">Members</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {sortedEmployees.map((emp) => (
            <label
              key={emp.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-[var(--background)]/50 p-1 rounded"
            >
              <input
                type="checkbox"
                name="members"
                value={emp.id}
                className="rounded border-[var(--muted)] accent-[var(--accent)] bg-[var(--background)] w-4 h-4"
              />
              <span>
                {emp.first_name} {emp.last_name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Project Settings */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Project Settings</h3>

        <div className="space-y-4 max-w-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <span>Design Project</span>
            <input
              type="checkbox"
              name="is_design"
              className="rounded border-[var(--muted)] accent-[var(--accent)] bg-[var(--background)] w-4 h-4"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <span>Referred Project</span>
            <input
              type="checkbox"
              name="is_referral"
              className="rounded border-[var(--muted)] accent-[var(--accent)] bg-[var(--background)] w-4 h-4"
            />
          </label>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Designer</label>
            <select
              name="designer_id"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              <option value="">None</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Site Supervisor</label>
            <select
              name="site_supervisor_id"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              <option value="">None</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Lead Carpenter</label>
            <select
              name="lead_carpenter_id"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              <option value="">None</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Department</label>
            <select
              name="department"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              <option value="Admin">Admin</option>
              <option value="Design">Design</option>
              <option value="Design (NC)">Design (NC)</option>
              <option value="Construction">Construction</option>
              <option value="Millwork">Millwork</option>
            </select>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Task Type</label>
            <select
              name="task_type_id"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              {taskTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
            <label>Status</label>
            <select
              name="status"
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none"
            >
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Hold">Hold</option>
              <option value="Perpetual">Perpetual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Components Section */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Components</h3>

        <div className="flex gap-2 mb-4 border-b border-[var(--muted)]/30 pb-2">
          <button
            type="button"
            className="px-3 py-1 bg-[var(--surface)] border border-[var(--muted)] text-[var(--muted)] rounded opacity-50 cursor-not-allowed"
          >
            New Component
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-[var(--surface)] border border-[var(--accent)] text-white rounded hover:bg-[var(--accent)]/10"
          >
            Add Component
          </button>
          <span className="text-xs text-[var(--muted)] self-center italic">
            (Form Submit Still Required)
          </span>
        </div>

        <div className="space-y-4 max-w-lg">
          <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
            <label>Client Name *</label>
            <input
              name="client_name"
              type="text"
              required
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
            <label>Client Phone *</label>
            <input
              name="client_phone"
              type="text"
              required
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-4 items-center">
            <label>Client Email *</label>
            <input
              name="client_email"
              type="email"
              required
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
            <label className="pt-2">Description *</label>
            <textarea
              name="description"
              rows={3}
              required
              className="bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-white outline-none focus:border-[var(--accent)]"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-4 pt-6 mt-8 border-t border-[var(--muted)]/20">
        <Link
          href="/projects"
          className="px-4 py-2 rounded border border-[var(--muted)] hover:bg-[var(--muted)]/20 text-white font-medium"
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
