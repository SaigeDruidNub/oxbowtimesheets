"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const timesheetsSubmenu = [
  { label: "My Timesheets", href: "/" },
  { label: "Admin Timesheets", href: "/timesheets/admin" },
  { label: "Archived Timesheets", href: "/timesheets/archived" },
];

const projectsSubmenu = [
  { label: "My Projects", href: "/projects/my" },
  { label: "Archived Projects", href: "/projects/archived" },
  { label: "Open Projects", href: "/projects/open" },
  { label: "Commission Projects", href: "/projects/commission" },
  { label: "Project Overview", href: "/projects/overview" },
  { label: "New Project", href: "/projects/new" },
];

const commissionsSubmenu = [
  { label: "History", href: "/commissions/history" },
  { label: "Weekly Generation", href: "/commissions/weekly" },
  { label: "C.I. Ledger", href: "/commissions/ci-ledger" },
];

const reportsSubmenu = [
  { label: "Open Timesheets", href: "/reports/open-timesheets" },
  { label: "Admin", href: "/reports/admin" },
  { label: "PTO Audit", href: "/reports/pto-audit" },
  { label: "Mileage", href: "/reports/mileage" },
  { label: "Payroll", href: "/reports/payroll" },
  { label: "Payroll (New)", href: "/reports/payroll-new" },
  { label: "Overview", href: "/reports/overview" },
  { label: "Project Updates", href: "/reports/project-updates" },
  { label: "Timecard Archive", href: "/reports/timecard-archive" },
  { label: "MO Audit (New)", href: "/reports/mo-audit-new" },
];

const employeesSubmenu = [
  { label: "Active Employees", href: "/employees/active" },
  { label: "Archived Employees", href: "/employees/archived" },
  { label: "Task Editor", href: "/employees/task-editor" },
];

const uploadsSubmenu = [
  { label: "Upload Timesheets", href: "/uploads/timesheets" },
  { label: "Upload Jobs", href: "/uploads/jobs" },
];

const documentsSubmenu = [
  { label: "Documents Home", href: "/documents/home" },
  { label: "Edit Documents", href: "/documents/edit" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [timesheetsExpanded, setTimesheetsExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [commissionsExpanded, setCommissionsExpanded] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [employeesExpanded, setEmployeesExpanded] = useState(false);
  const [uploadsExpanded, setUploadsExpanded] = useState(false);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);

  useEffect(() => {
    if (pathname === "/" || pathname.startsWith("/timesheets")) {
      setTimesheetsExpanded(true);
    } else if (pathname.startsWith("/projects")) {
      setProjectsExpanded(true);
    } else if (pathname.startsWith("/commissions")) {
      setCommissionsExpanded(true);
    } else if (pathname.startsWith("/reports")) {
      setReportsExpanded(true);
    } else if (pathname.startsWith("/employees")) {
      setEmployeesExpanded(true);
    } else if (pathname.startsWith("/uploads")) {
      setUploadsExpanded(true);
    } else if (pathname.startsWith("/documents")) {
      setDocumentsExpanded(true);
    }
  }, [pathname]);

  return (
    <aside className="w-full md:w-[220px] bg-none py-4 px-2 md:py-8 md:px-2 flex flex-col gap-3 items-center md:items-end">
      <nav style={{ width: "100%" }}>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            color: "var(--foreground)",
            fontWeight: 500,
            fontSize: 17,
          }}
        >
          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setTimesheetsExpanded((prev) => !prev)}
            >
              <span>Timesheets</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {timesheetsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {timesheetsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {timesheetsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setProjectsExpanded((prev) => !prev)}
            >
              <span>Projects</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {projectsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {projectsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {projectsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setCommissionsExpanded((prev) => !prev)}
            >
              <span>Commissions</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {commissionsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {commissionsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {commissionsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setReportsExpanded((prev) => !prev)}
            >
              <span>Reports</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {reportsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {reportsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {reportsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setEmployeesExpanded((prev) => !prev)}
            >
              <span>Employees</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {employeesExpanded ? "▾" : "▸"}
              </span>
            </div>
            {employeesExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {employeesSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setUploadsExpanded((prev) => !prev)}
            >
              <span>Uploads</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {uploadsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {uploadsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {uploadsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          <li style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "var(--foreground)",
                padding: "6px 0",
                userSelect: "none",
              }}
              onClick={() => setDocumentsExpanded((prev) => !prev)}
            >
              <span>Documents</span>
              <span style={{ fontSize: 12, marginLeft: 8 }}>
                {documentsExpanded ? "▾" : "▸"}
              </span>
            </div>
            {documentsExpanded && (
              <ul
                style={{
                  listStyle: "none",
                  padding: "0 0 0 14px",
                  margin: "2px 0 6px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {documentsSubmenu.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "#ffffff"
                            : "var(--foreground)",
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: isActive
                            ? "var(--accent)"
                            : "transparent",
                          transition: "background 0.15s, color 0.15s",
                        }}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
}
