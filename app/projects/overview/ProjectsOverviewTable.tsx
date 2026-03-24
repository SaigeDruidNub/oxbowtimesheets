"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface ProjectOverviewData {
  id: number;
  legacy_id: string;
  start_date: string | null;
  project_type: string;
  status: string;
  project_name: string;
  manager: string;
  unapproved_count: number;
  oldest_unapproved: string | null;
}

interface ProjectsOverviewTableProps {
  initialData: ProjectOverviewData[];
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US");
};

type SortConfig = {
  key: keyof ProjectOverviewData;
  direction: "asc" | "desc";
} | null;

export default function ProjectsOverviewTable({
  initialData,
}: ProjectsOverviewTableProps) {
  // Filters State
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(["Design", "Construction", "Millwork", "Admin", "Design (NC)"]),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(["Active", "Pending", "Perpetual", "Hold"]),
  );
  const [showUnapprovedOnly, setShowUnapprovedOnly] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Derived Filters Options
  const allTypes = useMemo(
    () => Array.from(new Set(initialData.map((d) => d.project_type))).sort(),
    [initialData],
  );
  const allStatuses = useMemo(
    () => Array.from(new Set(initialData.map((d) => d.status))).sort(),
    [initialData],
  );

  // Filter Data
  const filteredData = useMemo(() => {
    let data = initialData.filter((item) => {
      if (!selectedTypes.has(item.project_type)) return false;
      if (!selectedStatuses.has(item.status)) return false;
      if (showUnapprovedOnly && item.unapproved_count === 0) return false;
      return true;
    });

    if (sortConfig !== null) {
      data = [...data].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return data;
  }, [
    initialData,
    selectedTypes,
    selectedStatuses,
    showUnapprovedOnly,
    sortConfig,
  ]);

  const requestSort = (key: keyof ProjectOverviewData) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof ProjectOverviewData) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const toggleStatus = (status: string) => {
    const newSet = new Set(selectedStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setSelectedStatuses(newSet);
  };

  const copyToClipboard = () => {
    const headers = [
      "PROJECT #",
      "START DATE",
      "PROJECT TYPE",
      "STATUS",
      "PROJECT NAME",
      "UNAPPROVED TIMESHEETS",
      "OLDEST UNAPPROVED",
      "MANAGER",
    ];
    const rows = filteredData.map((d) => [
      d.legacy_id,
      formatDate(d.start_date),
      d.project_type,
      d.status,
      d.project_name,
      d.unapproved_count,
      formatDate(d.oldest_unapproved),
      d.manager,
    ]);

    const csvContent = [
      headers.join("\t"),
      ...rows.map((r) => r.join("\t")),
    ].join("\n");

    navigator.clipboard.writeText(csvContent);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold">Projects Overview</h1>
        <button
          onClick={copyToClipboard}
          className="bg-[var(--surface)] border border-[var(--muted)] text-[var(--foreground)] px-4 py-2 rounded hover:bg-[var(--accent)] hover:text-white transition-colors text-sm font-medium"
        >
          Copy to Clipboard
        </button>
      </div>

      {/* Filters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Project Types */}
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--muted)]/20 shadow-sm">
          <h3 className="text-sm font-bold mb-3 text-white">Project Types:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {allTypes.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type)}
                  onChange={() => toggleType(type)}
                  className="rounded border-[var(--muted)] accent-[var(--accent)] w-4 h-4 cursor-pointer"
                />
                <span className="text-white">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Project Statuses */}
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--muted)]/20 shadow-sm">
          <h3 className="text-sm font-bold mb-3 text-white">
            Project Statuses:
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {allStatuses.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                  className="rounded border-[var(--muted)] accent-[var(--accent)] w-4 h-4 cursor-pointer"
                />
                <span className="text-white">{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Unapproved Timesheets */}
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--muted)]/20 shadow-sm flex flex-col justify-center">
          <h3 className="text-sm font-bold mb-3 text-white">
            Unapproved Timesheets:
          </h3>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showUnapprovedOnly}
              onChange={(e) => setShowUnapprovedOnly(e.target.checked)}
              className="rounded border-[var(--muted)] accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
            <span className="text-white">Has Unapproved</span>
          </label>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--muted)]/20 shadow-sm bg-[var(--surface)]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[var(--background)] text-white uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("legacy_id")}
              >
                Project #{getSortIndicator("legacy_id")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("start_date")}
              >
                Start Date{getSortIndicator("start_date")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("project_type")}
              >
                Project Type{getSortIndicator("project_type")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("status")}
              >
                Status{getSortIndicator("status")}
              </th>
              <th
                className="px-4 py-3 w-full cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("project_name")}
              >
                Project Name{getSortIndicator("project_name")}
              </th>
              <th
                className="px-4 py-3 text-center cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("unapproved_count")}
              >
                Unapproved
                <br />
                Timesheets{getSortIndicator("unapproved_count")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("oldest_unapproved")}
              >
                Oldest Unapproved{getSortIndicator("oldest_unapproved")}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-[var(--accent)]"
                onClick={() => requestSort("manager")}
              >
                Manager{getSortIndicator("manager")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--muted)]/20">
            {filteredData.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-[var(--accent)]/10 transition-colors text-white"
              >
                <td className="px-4 py-3 font-mono">
                  <Link
                    href={`/projects/open/${project.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {project.legacy_id}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatDate(project.start_date)}</td>
                <td className="px-4 py-3">{project.project_type}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                      ${
                        project.status === "Active" ||
                        project.status === "Perpetual"
                          ? "border-[var(--accent)] text-white"
                          : project.status === "Pending"
                            ? "border-[var(--muted)] text-white"
                            : "border-[var(--muted)] text-[var(--muted)]"
                      }`}
                  >
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/projects/open/${project.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {project.project_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center font-medium">
                  {project.unapproved_count > 0 ? (
                    <span className="text-white font-bold">
                      {project.unapproved_count}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {project.oldest_unapproved ? (
                    <span className="text-white font-medium">
                      {formatDate(project.oldest_unapproved)}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="px-4 py-3">{project.manager}</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white">
                  No projects found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
