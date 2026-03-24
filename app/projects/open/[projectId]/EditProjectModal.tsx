"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/app/projects/actions/update-project";

interface EditProjectModalProps {
  project: any;
  team: any[];
  allEmployees: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProjectModal({
  project,
  team,
  allEmployees,
  isOpen,
  onClose,
}: EditProjectModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("info");
  const [selectedTeam, setSelectedTeam] = useState<number[]>(
    team.map((t) => t.id),
  );
  const [loading, setLoading] = useState(false);
  const [errorQuery, setErrorQuery] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setErrorQuery("");

    const result = await updateProject(formData);

    if (result && result.error) {
      setErrorQuery(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      router.refresh(); // Refresh the page to show latest data
    }
  }

  const toggleTeamMember = (id: number) => {
    setSelectedTeam((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[--surface] border border-[var(--muted)]/30 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-[var(--muted)]/30">
          <h2 className="text-xl font-semibold text-[--foreground]">
            Edit Project: {project.job_name}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[--foreground] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-[var(--muted)]/30 px-6">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-[--accent] text-[--foreground]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("info")}
          >
            Project Information
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "team"
                ? "border-[--accent] text-[--foreground]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("team")}
          >
            Team Members ({selectedTeam.length})
          </button>
        </div>

        <form action={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <input type="hidden" name="id" value={project.id} />
          {errorQuery && (
            <div className="bg-red-900/20 border border-red-900 text-red-100 p-3 rounded mb-4 text-sm">
              {errorQuery}
            </div>
          )}

          <div className={activeTab === "info" ? "block" : "hidden"}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Job Name
                  </label>
                  <input
                    type="text"
                    name="job_name"
                    required
                    defaultValue={project.job_name}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Project # (Legacy ID)
                  </label>
                  <input
                    type="text"
                    name="legacy_id"
                    defaultValue={project.legacy_id || ""}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={project.status}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option
                      value="Active"
                      className="bg-[var(--background)] text-[var(--foreground)]"
                    >
                      Active
                    </option>
                    <option
                      value="Closed"
                      className="bg-[var(--background)] text-[var(--foreground)]"
                    >
                      Closed
                    </option>
                    <option
                      value="Pending"
                      className="bg-[var(--background)] text-[var(--foreground)]"
                    >
                      Pending
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    name="client_name"
                    defaultValue={project.client_name || ""}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Manager
                  </label>
                  <select
                    name="manager_id"
                    defaultValue={project.manager_id || ""}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option
                      value=""
                      className="bg-[var(--background)] text-[var(--foreground)]"
                    >
                      Select Manager
                    </option>
                    {allEmployees.map((emp) => (
                      <option
                        key={emp.id}
                        value={emp.id}
                        className="bg-[var(--background)] text-[var(--foreground)]"
                      >
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                    Site Supervisor
                  </label>
                  <select
                    name="site_supervisor_id"
                    defaultValue={project.site_supervisor_id || ""}
                    className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option
                      value=""
                      className="bg-[var(--background)] text-[var(--foreground)]"
                    >
                      Select Supervisor
                    </option>
                    {allEmployees.map((emp) => (
                      <option
                        key={emp.id}
                        value={emp.id}
                        className="bg-[var(--background)] text-[var(--foreground)]"
                      >
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-[var(--muted)] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={project.description || ""}
                  className="w-full bg-[var(--background)] border border-[var(--muted)] rounded px-3 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          <div className={activeTab === "team" ? "block" : "hidden"}>
            <div className="space-y-4">
              <div className="bg-[var(--background)] p-4 rounded border border-[var(--muted)] max-h-[400px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                      selectedTeam.includes(emp.id)
                        ? "bg-[var(--accent)]/20 border border-[var(--accent)]/30"
                        : "hover:bg-[var(--foreground)]/5 border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="team_members"
                      value={emp.id}
                      checked={selectedTeam.includes(emp.id)}
                      onChange={() => toggleTeamMember(emp.id)}
                      className="form-checkbox h-4 w-4 text-[var(--accent)] rounded border-[var(--muted)] bg-[var(--background)] focus:ring-offset-[var(--surface)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      {emp.first_name} {emp.last_name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] italic text-center">
                Select employees to be part of this project team.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 border-t border-[var(--muted)]/20 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[--accent] hover:bg-[--accent]/90 text-white text-sm font-medium rounded shadow-lg transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
