"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface Project {
  id: number;
  legacy_id: string; // Project #
  job_name: string; // Project
  status: string;
  department: string;
  billing_type: string;
  manager_name: string;
}

interface OpenProjectsTableProps {
  initialProjects: Project[];
}

type SortConfig = {
  key: keyof Project;
  direction: "asc" | "desc";
} | null;

export default function OpenProjectsTable({
  initialProjects,
}: OpenProjectsTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Derive sort state from URL search params
  const sortKey = searchParams.get("sort") as keyof Project | null;
  const sortOrder = searchParams.get("order") as "asc" | "desc" | null;

  // Derive filter state from URL search params
  const statusFilter = searchParams.get("status") || "";
  const managerFilter = searchParams.get("manager") || "";
  const departmentFilter = searchParams.get("department") || "";
  const billingTypeFilter = searchParams.get("billing_type") || "";

  const sortConfig: SortConfig =
    sortKey && sortOrder ? { key: sortKey, direction: sortOrder } : null;

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(
      initialProjects.map((p) => p.status).filter(Boolean),
    );
    return Array.from(statuses).sort();
  }, [initialProjects]);

  const uniqueManagers = useMemo(() => {
    const managers = new Set(
      initialProjects.map((p) => p.manager_name).filter(Boolean),
    );
    return Array.from(managers).sort();
  }, [initialProjects]);

  const uniqueDepartments = useMemo(() => {
    const departments = new Set(
      initialProjects.map((p) => p.department).filter(Boolean),
    );
    return Array.from(departments).sort();
  }, [initialProjects]);

  const uniqueBillingTypes = useMemo(() => {
    const billingTypes = new Set(
      initialProjects.map((p) => p.billing_type).filter(Boolean),
    );
    return Array.from(billingTypes).sort();
  }, [initialProjects]);

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...initialProjects];

    // Apply filters
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (managerFilter) {
      result = result.filter((p) => p.manager_name === managerFilter);
    }
    if (departmentFilter) {
      result = result.filter((p) => p.department === departmentFilter);
    }
    if (billingTypeFilter) {
      result = result.filter((p) => p.billing_type === billingTypeFilter);
    }

    // Apply sort
    if (sortConfig !== null) {
      result.sort((a, b) => {
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
    return result;
  }, [
    initialProjects,
    sortConfig,
    statusFilter,
    managerFilter,
    departmentFilter,
    billingTypeFilter,
  ]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const requestSort = (key: keyof Project) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    const params = new URLSearchParams(searchParams);
    params.set("sort", key);
    params.set("order", direction);
    replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const getSortIndicator = (key: keyof Project) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-[var(--surface)] p-4 rounded-lg border border-[var(--muted)]/20 shadow-sm">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="status-filter"
            className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--muted)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] min-w-[150px]"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="manager-filter"
            className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
          >
            Manager
          </label>
          <select
            id="manager-filter"
            value={managerFilter}
            onChange={(e) => updateFilter("manager", e.target.value)}
            className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--muted)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] min-w-[150px]"
          >
            <option value="">All Managers</option>
            {uniqueManagers.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="department-filter"
            className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
          >
            Department
          </label>
          <select
            id="department-filter"
            value={departmentFilter}
            onChange={(e) => updateFilter("department", e.target.value)}
            className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--muted)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] min-w-[150px]"
          >
            <option value="">All Departments</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="billing-filter"
            className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider"
          >
            Billing Type
          </label>
          <select
            id="billing-filter"
            value={billingTypeFilter}
            onChange={(e) => updateFilter("billing_type", e.target.value)}
            className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--muted)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] min-w-[150px]"
          >
            <option value="">All Billing Types</option>
            {uniqueBillingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter ||
          managerFilter ||
          departmentFilter ||
          billingTypeFilter) && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.delete("status");
              params.delete("manager");
              params.delete("department");
              params.delete("billing_type");
              replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            className="mt-5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] underline transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="overflow-auto md:overflow-visible rounded-lg border border-[var(--muted)]/20 shadow-xl bg-[var(--surface)] max-h-[calc(100vh-250px)] md:max-h-none">
        <table className="min-w-full text-left text-xs whitespace-nowrap md:whitespace-normal">
          <thead className="uppercase tracking-wider border-b border-[var(--muted)]/20 bg-[var(--background)]/5 text-[var(--muted)] sticky top-0 md:static backdrop-blur-sm bg-[var(--surface)] z-10 md:z-auto">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 font-medium sticky left-0 md:static bg-[var(--surface)] z-20 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("legacy_id")}
              >
                Project #{getSortIndicator("legacy_id")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium sticky left-[calc(4rem+20px)] md:static bg-[var(--surface)] z-20 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("job_name")}
              >
                Project{getSortIndicator("job_name")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("status")}
              >
                Status{getSortIndicator("status")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("department")}
              >
                Department{getSortIndicator("department")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("billing_type")}
              >
                Billing Type{getSortIndicator("billing_type")}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-medium cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                onClick={() => requestSort("manager_name")}
              >
                Manager{getSortIndicator("manager_name")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--muted)]/20">
            {filteredAndSortedProjects.map((project) => (
              <tr
                key={project.id}
                className="even:bg-[var(--background)]/20 hover:bg-[var(--accent)]/10 transition-colors"
                style={{ color: "var(--foreground)" }}
              >
                <td className="px-4 py-3 font-medium sticky left-0 md:static bg-[var(--surface)] md:bg-transparent z-10 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none hover:underline cursor-pointer">
                  <Link href={`/projects/open/${project.id}`}>
                    {project.legacy_id}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium sticky left-[calc(4rem+20px)] md:static bg-[var(--surface)] md:bg-transparent z-10 md:z-auto shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:shadow-none hover:underline cursor-pointer">
                  <Link href={`/projects/open/${project.id}`}>
                    {project.job_name}
                  </Link>
                </td>
                <td className="px-4 py-3">{project.status}</td>
                <td className="px-4 py-3">{project.department}</td>
                <td className="px-4 py-3">{project.billing_type}</td>
                <td className="px-4 py-3">{project.manager_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
