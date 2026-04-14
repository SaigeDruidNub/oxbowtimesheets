"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClassRates } from "@/app/projects/actions/save-class-rates";
import type { ProjectDetails, TeamMember, ProjectClassRate } from "../page";
import { CLASS_RATES, LABOR_CLASSES, fmtDate } from "./shared";

export function OverviewTab({
  project,
  team,
  projectId,
  initialRates,
}: {
  project: ProjectDetails;
  team: TeamMember[];
  projectId: number;
  initialRates: ProjectClassRate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [rates, setRates] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const [cls, rate] of Object.entries(CLASS_RATES)) {
      base[cls] = String(rate);
    }
    for (const r of initialRates) {
      base[r.labor_class] = String(r.rate);
    }
    return base;
  });

  function handleRateChange(cls: string, val: string) {
    setSaveOk(false);
    setRates((prev) => ({ ...prev, [cls]: val }));
  }

  function handleSaveRates() {
    setSaveError(null);
    setSaveOk(false);
    const parsed: Record<string, number> = {};
    for (const [cls, val] of Object.entries(rates)) {
      const n = parseFloat(val);
      if (!isNaN(n)) parsed[cls] = n;
    }
    startTransition(async () => {
      const result = await saveClassRates(projectId, parsed);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveOk(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project info */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Project Information
        </h2>
        <dl className="divide-y divide-gray-800 text-sm">
          {[
            ["Created", fmtDate(project.created)],
            ["Status", project.status],
            ["Department", project.department ?? "—"],
            ["Manager", `${project.manager_first} ${project.manager_last}`],
            [
              "Supervisor",
              project.supervisor_first
                ? `${project.supervisor_first} ${project.supervisor_last}`
                : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] py-2">
              <dt className="text-gray-400">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {project.description && (
          <div className="mt-4">
            <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-300 bg-black/20 p-3 rounded border border-gray-800 leading-relaxed">
              {project.description}
            </p>
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Client
        </h2>
        <dl className="divide-y divide-gray-800 text-sm">
          {[
            ["Name", project.client_name ?? "—"],
            ["Phone", project.client_phone ?? "—"],
            ["Email", project.client_email ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[140px_1fr] py-2">
              <dt className="text-gray-400">{label}</dt>
              <dd>
                {label === "Email" && project.client_email ? (
                  <a
                    href={`mailto:${project.client_email}`}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Team */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800 lg:col-span-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Team Members
        </h2>
        {team.length === 0 ? (
          <p className="text-gray-500 italic text-sm">
            No team members assigned.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {team.map((m) => (
              <span
                key={m.id}
                className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700"
              >
                {m.first_name} {m.last_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Class Rates */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Labor Class Rates
          </h2>
          <div className="flex items-center gap-2">
            {saveOk && <span className="text-green-400 text-xs">Saved ✓</span>}
            {saveError && (
              <span className="text-red-400 text-xs">{saveError}</span>
            )}
            <button
              onClick={handleSaveRates}
              disabled={isPending}
              className="px-3 py-1.5 text-xs bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded transition-opacity"
            >
              {isPending ? "Saving…" : "Save Rates"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
          {LABOR_CLASSES.map((cls) => (
            <div key={cls} className="flex items-center gap-2">
              <label className="text-xs text-gray-400 w-36 shrink-0">
                {cls}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={rates[cls] ?? ""}
                  onChange={(e) => handleRateChange(cls, e.target.value)}
                  className="w-20 bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-gray-500"
                />
              </div>
            </div>
          ))}
        </div>
        {initialRates.length > 0 && (
          <p className="mt-3 text-xs text-[var(--accent)]">
            ✓ This project has custom rates saved.
          </p>
        )}
      </div>
    </div>
  );
}
