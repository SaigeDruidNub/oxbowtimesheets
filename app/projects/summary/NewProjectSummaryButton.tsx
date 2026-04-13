"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProjectSummary } from "@/app/projects/actions/create-project-summary";

interface AvailableProject {
  id: number;
  legacy_id: string | null;
  job_name: string;
  status: string;
}

export default function NewProjectSummaryButton({
  availableProjects,
}: {
  availableProjects: AvailableProject[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setSelectedJobId("");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJobId) return;
    setError(null);

    startTransition(async () => {
      const result = await createProjectSummary(Number(selectedJobId));
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.push(`/projects/summary/${selectedJobId}`);
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white text-sm font-medium rounded transition-opacity"
      >
        + New Project Summary
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={handleClose}
        >
          <div
            className="bg-[--surface] border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-light mb-4">
              Start New Project Summary
            </h2>

            {availableProjects.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                All active projects already have summaries.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block">
                    Project
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) =>
                      setSelectedJobId(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full bg-black/30 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
                    required
                  >
                    <option value="">— Select a project —</option>
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.job_name}
                        {p.legacy_id ? ` (#${p.legacy_id})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !selectedJobId}
                    className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white text-sm font-medium rounded transition-opacity"
                  >
                    {isPending ? "Creating…" : "Create Summary"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
