"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import Plot from "react-plotly.js";
import PivotTableUI from "react-pivottable/PivotTableUI";
import PlotlyRenderers from "react-pivottable/PlotlyRenderers";
import TableRenderers from "react-pivottable/TableRenderers";
import "react-pivottable/pivottable.css";

type OverviewPivotRow = {
  date: string;
  employeeId: number;
  employeeName: string;
  firstName: string;
  projectName: string;
  componentName: string;
  taskName: string;
  taskClassification: string;
  taskTypeName: string;
  billingType: string;
  department: string;
  managerName: string;
  managerFirstName: string;
  siteSupervisorFirstName: string;
  leadCarpenterFirstName: string;
  jobStatus: string;
  hours: number;
  overtimeHours: number;
  totalHours: number;
  mileage: number;
  reimbursement: number;
  commissionAmount: number;
  notes: string;
  classificationOverride: string;
  isSalary: boolean;
  managerApproved: boolean;
  isDesign: boolean;
};

type PivotDataResponse = {
  rows: OverviewPivotRow[];
};

type PivotState = Partial<ComponentProps<typeof PivotTableUI>>;
type PivotDisplayRow = Record<string, string | number | boolean>;

const renderers = {
  ...TableRenderers,
  ...PlotlyRenderers(Plot),
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

function parseInputDate(value: string): Date | null {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousWeekRange(today = new Date()) {
  const dayOfWeek = today.getDay();
  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - dayOfWeek);

  const startDate = new Date(thisWeekSunday);
  startDate.setDate(thisWeekSunday.getDate() - 7);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate: toInputDate(startDate),
    endDate: toInputDate(endDate),
  };
}

function getIsoWeek(date: Date): number {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

function parseDaySortKey(s: string): number {
  // Parses "Mon 3/23/26" → sortable integer like 260323
  const parts = s.split(" ");
  if (parts.length < 2) return 0;
  const [m, d, y] = parts[1].split("/").map(Number);
  return (y ?? 0) * 10000 + (m ?? 0) * 100 + (d ?? 0);
}

const daySort = (a: string, b: string) =>
  parseDaySortKey(a) - parseDaySortKey(b);

function toPivotDisplayRow(row: OverviewPivotRow): PivotDisplayRow {
  const parsedDate = parseInputDate(row.date);

  const day = parsedDate
    ? `${weekdayFormatter.format(parsedDate)} ${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${String(parsedDate.getFullYear()).slice(2)}`
    : "Unknown";
  const month = parsedDate ? monthFormatter.format(parsedDate) : "Unknown";
  const week = parsedDate ? getIsoWeek(parsedDate) : 0;
  const year = parsedDate ? parsedDate.getFullYear() : 0;

  return {
    "Project Name": row.projectName,
    Worker: row.firstName,
    Class: row.taskClassification || row.taskTypeName,
    Component: row.componentName,
    Hours: row.totalHours,
    Miles: row.mileage,
    Task: row.taskName,
    Manager: row.managerFirstName,
    "Site Supervisor": row.siteSupervisorFirstName,
    "Lead Carpenter": row.leadCarpenterFirstName,
    "Billing Type": row.billingType,
    Day: day,
    Status: row.jobStatus,
    Month: month,
    Week: week,
    Year: year,
    Notes: row.notes,
    Department: row.department || "General",
    Commission: row.commissionAmount,
    "Is Design": row.isDesign ? "Yes" : "No",
  };
}

export default function OverviewPivotClient() {
  const defaultRange = useMemo(() => getPreviousWeekRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [rows, setRows] = useState<OverviewPivotRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pivotState, setPivotState] = useState<PivotState>({
    rows: ["Project Name", "Worker"],
    cols: ["Class"],
    vals: ["Hours"],
    aggregatorName: "Sum",
    rendererName: "Table",
  });
  const [copyLabel, setCopyLabel] = useState("Copy to Clipboard");
  const pivotContainerRef = useRef<HTMLDivElement>(null);

  const parsedStartDate = useMemo(() => parseInputDate(startDate), [startDate]);
  const parsedEndDate = useMemo(() => parseInputDate(endDate), [endDate]);

  const displayedTimespan = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) return "Choose a valid date range";
    if (parsedEndDate < parsedStartDate)
      return "End date must be on or after start date";
    return `${dateFormatter.format(parsedStartDate)} - ${dateFormatter.format(parsedEndDate)}`;
  }, [parsedStartDate, parsedEndDate]);

  const pivotRows = useMemo(() => rows.map(toPivotDisplayRow), [rows]);

  // Force-style the native <select> elements by writing the `style` attribute
  // directly via setAttribute(). Literal "!important" inside the attribute
  // string has the highest possible CSS priority, even above el.style.setProperty.
  // Using hard-coded hex values (no CSS vars) avoids any variable-resolution
  // issues. We watch childList-only so our own setAttribute writes don't
  // re-trigger the observer and cause an infinite loop.
  useEffect(() => {
    let rafId: ReturnType<typeof requestAnimationFrame> | null = null;

    function isDark() {
      return document.documentElement.getAttribute("data-theme") === "dark";
    }

    function applyStyles() {
      const dark = isDark();
      const bg = dark ? "#3e4758" : "#f5f6f8";
      const fg = dark ? "#d6d7df" : "#17181c";
      const border = dark ? "#0a6481" : "#0a6481";

      document
        .querySelectorAll<HTMLSelectElement>(".overview-pivot-theme select")
        .forEach((el) => {
          el.setAttribute(
            "style",
            [
              `-webkit-appearance: none !important`,
              `appearance: none !important`,
              `forced-color-adjust: none !important`,
              `background: ${bg} !important`,
              `color: ${fg} !important`,
              `border: 1px solid ${border} !important`,
              `border-radius: 7px !important`,
              `padding: 5px 10px !important`,
              `font-size: 0.92rem !important`,
              `font-weight: 600 !important`,
              `min-height: 34px !important`,
              `margin-right: 6px !important`,
              `margin-bottom: 6px !important`,
              `cursor: pointer !important`,
            ].join("; "),
          );
        });
    }

    function schedule() {
      if (rafId !== null) return; // already queued
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyStyles();
      });
    }

    // childList-only: structural changes (new selects) but NOT attribute
    // changes, so our own setAttribute calls don't re-trigger the observer.
    const bodyObserver = new MutationObserver(schedule);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Watch data-theme attribute on <html> for theme toggles
    const themeObserver = new MutationObserver(schedule);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Also watch prefers-color-scheme media query
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", schedule);

    applyStyles();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      bodyObserver.disconnect();
      themeObserver.disconnect();
      mq.removeEventListener("change", schedule);
    };
  }, []);

  useEffect(() => {
    const hasValidRange =
      parsedStartDate && parsedEndDate && parsedEndDate >= parsedStartDate;

    if (!hasValidRange) {
      setRows([]);
      setError("Choose a valid date range.");
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();

    async function loadOverviewRows() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/reports/overview?startDate=${startDate}&endDate=${endDate}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as PivotDataResponse;
        setRows(payload.rows ?? []);
      } catch {
        if (abortController.signal.aborted) return;
        setRows([]);
        setError("Unable to load overview data for this date range.");
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    loadOverviewRows();
    return () => abortController.abort();
  }, [startDate, endDate, parsedStartDate, parsedEndDate]);

  function copyTableToClipboard() {
    const table =
      pivotContainerRef.current?.querySelector<HTMLTableElement>(
        "table.pvtTable",
      );
    if (!table) return;

    const rows = Array.from(table.querySelectorAll("tr"));
    const tsv = rows
      .map((tr) => {
        const cells = Array.from(
          tr.querySelectorAll<HTMLTableCellElement>("th, td"),
        );
        return cells
          .flatMap((cell) => {
            const text = (cell.textContent ?? "").replace(/\t|\n/g, " ").trim();
            // Expand colSpan so merged header cells line up with data columns
            return Array<string>(cell.colSpan || 1).fill(text);
          })
          .join("\t");
      })
      .join("\n");

    navigator.clipboard.writeText(tsv).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy to Clipboard"), 2000);
    });
  }

  function onStartDateChange(value: string) {
    setStartDate(value);
    if (value > endDate) setEndDate(value);
  }

  function onEndDateChange(value: string) {
    if (value < startDate) setStartDate(value);
    setEndDate(value);
  }

  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        padding: "1.5rem 2rem 2rem 2rem",
        marginBottom: 32,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
          color: "var(--foreground)",
        }}
      >
        Reports - Overview Pivot
      </h2>

      <p
        style={{ color: "var(--foreground)", marginTop: 16, marginBottom: 20 }}
      >
        Explore timesheet activity with drag-and-drop pivot controls.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: 16,
        }}
      >
        <label
          htmlFor="overviewStartDate"
          style={{
            fontWeight: 600,
            color: "var(--foreground)",
            fontSize: "0.95rem",
          }}
        >
          Select a timespan:
        </label>
        <input
          id="overviewStartDate"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          style={dateInputStyle}
          aria-label="Start date"
        />
        <span style={{ color: "var(--muted)", fontWeight: 600 }}>to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          style={dateInputStyle}
          aria-label="End date"
        />
        <span
          style={{
            color: "var(--foreground)",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          {displayedTimespan}
        </span>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid rgba(180,70,70,0.35)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: 16,
            background: "rgba(180,70,70,0.08)",
            color: "var(--foreground)",
          }}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div style={{ color: "var(--foreground)" }}>
          Loading overview data...
        </div>
      ) : null}

      {!isLoading && !error && rows.length === 0 ? (
        <div style={{ color: "var(--foreground)" }}>
          No rows found for this date range.
        </div>
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <>
          <div
            ref={pivotContainerRef}
            className="overview-pivot-theme"
            style={{
              overflowX: "auto",
              borderRadius: 12,
              border: "1px solid rgba(128,128,128,0.25)",
              background:
                "color-mix(in srgb, var(--surface) 95%, var(--background))",
              padding: "0.75rem",
            }}
          >
            <PivotTableUI
              data={pivotRows as unknown as string[][]}
              onChange={(state) => setPivotState(state)}
              renderers={renderers}
              unusedOrientationCutoff={Infinity}
              {...pivotState}
              sorters={{ Day: daySort }}
            />
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button onClick={copyTableToClipboard} style={copyButtonStyle}>
              {copyLabel}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

const copyButtonStyle: CSSProperties = {
  border: "1px solid var(--accent, #0a6481)",
  borderRadius: 8,
  padding: "0.45rem 1.1rem",
  fontSize: "0.92rem",
  fontWeight: 600,
  color: "var(--foreground)",
  background: "var(--surface)",
  cursor: "pointer",
};

const dateInputStyle: CSSProperties = {
  border: "1px solid rgba(120,120,120,0.3)",
  borderRadius: 8,
  padding: "0.36rem 0.52rem",
  fontSize: "0.92rem",
  color: "var(--foreground)",
  background: "var(--surface)",
};
