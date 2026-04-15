"use client";

import { useRef, useState } from "react";
import { fmtCurrency, fmtDate } from "./shared";
import {
  importQBExpenses,
  type QBExpenseRow,
} from "@/app/projects/actions/import-qb-expenses";
import { useRouter } from "next/navigation";

interface ParsedRow extends QBExpenseRow {
  _key: number;
  selected: boolean;
  isDuplicate: boolean;
}

interface ImportedExpense {
  id: number;
  date: string | null;
  type: string | null;
  no: string | null;
  memo: string | null;
  amount: number | null;
  status: string | null;
  imported_at: string;
}

interface Props {
  projectId: number;
  existingExpenses: ImportedExpense[];
}

/** Full RFC-4180-style CSV parser that handles newlines inside quoted fields. */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let cur = "";
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        // Peek ahead: "" inside quotes = escaped quote
        if (text[i + 1] === '"') {
          cur += '"';
          i += 2;
        } else {
          inQuote = false;
          i++;
        }
      } else {
        // Newlines inside quotes are part of the field value
        if (ch === "\r" && text[i + 1] === "\n") {
          cur += "\n";
          i += 2;
        } else {
          cur += ch;
          i++;
        }
      }
    } else {
      if (ch === '"') {
        inQuote = true;
        i++;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
        i++;
      } else if (ch === "\r" && text[i + 1] === "\n") {
        fields.push(cur);
        cur = "";
        records.push(fields);
        fields = [];
        i += 2;
      } else if (ch === "\n") {
        fields.push(cur);
        cur = "";
        records.push(fields);
        fields = [];
        i++;
      } else {
        cur += ch;
        i++;
      }
    }
  }

  // Final field/record (file may not end with newline)
  fields.push(cur);
  if (fields.some((f) => f !== "")) {
    records.push(fields);
  }

  return records;
}

function parseCSV(text: string): QBExpenseRow[] {
  // Strip UTF-8 BOM that QuickBooks adds to CSV exports
  const cleanText = text.replace(/^\uFEFF/, "");

  const records = parseCSVRecords(cleanText).filter((r) =>
    r.some((f) => f.trim() !== ""),
  );
  if (records.length < 2) return [];

  // QB CSVs sometimes have preamble rows — find the actual header row
  // by looking for a row that contains at least "date" and "amount"
  const QB_KNOWN_HEADERS = new Set([
    "date",
    "type",
    "no.",
    "memo",
    "amount",
    "status",
  ]);
  const headerRowIdx = records.findIndex((r) => {
    const normalized = r.map((h) =>
      h
        .trim()
        .replace(/^\uFEFF/, "")
        .toLowerCase(),
    );
    const matches = normalized.filter((h) => QB_KNOWN_HEADERS.has(h)).length;
    return matches >= 2;
  });

  if (headerRowIdx === -1) return [];

  const headers = records[headerRowIdx].map((h) =>
    h
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase(),
  );

  const idx = {
    date: headers.findIndex((h) => h === "date"),
    type: headers.findIndex((h) => h === "type"),
    no: headers.findIndex((h) => h === "no."),
    memo: headers.findIndex((h) => h === "memo"),
    amount: headers.findIndex((h) => h === "amount"),
    status: headers.findIndex((h) => h === "status"),
  };

  return records.slice(headerRowIdx + 1).map((cols) => ({
    date: idx.date >= 0 ? (cols[idx.date] ?? "").trim() : "",
    type: idx.type >= 0 ? (cols[idx.type] ?? "").trim() : "",
    no: idx.no >= 0 ? (cols[idx.no] ?? "").trim() : "",
    memo: idx.memo >= 0 ? (cols[idx.memo] ?? "").trim() : "",
    amount: idx.amount >= 0 ? (cols[idx.amount] ?? "").trim() : "",
    status: idx.status >= 0 ? (cols[idx.status] ?? "").trim() : "",
  }));
}

let _keyCounter = 0;
function nextKey() {
  return ++_keyCounter;
}

export function QBImportTab({ projectId, existingExpenses }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<number | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setImportError(null);
    setImportOk(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setParseError(
            "No data rows found. Could not locate a header row with recognizable QB columns (date, type, no., memo, amount, status).",
          );
          setRows([]);
          return;
        }

        // Build a set of keys from already-imported rows for duplicate detection
        // Key: no|normalizedDate|normalizedAmount
        const existingKeys = new Set(
          existingExpenses.map((e) => {
            const d =
              e.date instanceof Date
                ? (e.date as Date).toISOString().slice(0, 10)
                : String(e.date ?? "").slice(0, 10);
            const amt = String(Math.round((Number(e.amount) || 0) * 100));
            return `${(e.no ?? "").trim()}|${d}|${amt}`;
          }),
        );

        function rowKey(r: QBExpenseRow): string {
          // Normalize date MM/DD/YYYY → YYYY-MM-DD for comparison
          let d = r.date.trim();
          const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m)
            d = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
          const amt = String(
            Math.round((parseFloat(r.amount.replace(/[$,]/g, "")) || 0) * 100),
          );
          return `${r.no.trim()}|${d}|${amt}`;
        }

        setRows(
          parsed.map((r) => ({
            ...r,
            _key: nextKey(),
            isDuplicate: existingKeys.has(rowKey(r)),
            selected: !existingKeys.has(rowKey(r)),
          })),
        );
      } catch {
        setParseError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  }

  function toggleRow(key: number) {
    setRows((rs) =>
      rs.map((r) =>
        r._key === key && !r.isDuplicate ? { ...r, selected: !r.selected } : r,
      ),
    );
  }

  function toggleAll() {
    const selectableRows = rows.filter((r) => !r.isDuplicate);
    const allSelected = selectableRows.every((r) => r.selected);
    setRows((rs) =>
      rs.map((r) => (r.isDuplicate ? r : { ...r, selected: !allSelected })),
    );
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return;
    setImporting(true);
    setImportError(null);
    setImportOk(null);

    const result = await importQBExpenses(
      projectId,
      selected.map(({ date, type, no, memo, amount, status }) => ({
        date,
        type,
        no,
        memo,
        amount,
        status,
      })),
    );

    setImporting(false);
    if (result.error) {
      setImportError(result.error);
    } else {
      setImportOk(result.imported ?? 0);
      setRows([]);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }

  const selectedCount = rows.filter((r) => r.selected && !r.isDuplicate).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;
  const totalAmount = rows
    .filter((r) => r.selected && !r.isDuplicate)
    .reduce((s, r) => s + (parseFloat(r.amount.replace(/[$,]/g, "")) || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Upload Card ── */}
      <div className="bg-[--surface] border border-gray-800 rounded-lg p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Upload QB Expense Export
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Export your QuickBooks expenses as CSV and upload here. The file must
          contain columns:{" "}
          <span className="font-mono text-gray-300">
            date, type, no., memo, amount, status
          </span>
          .
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <label
            htmlFor="qb-csv-upload"
            className="cursor-pointer px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Choose CSV File
          </label>
          <input
            id="qb-csv-upload"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="sr-only"
          />
          {fileName && (
            <span className="text-sm text-gray-300 font-mono">{fileName}</span>
          )}
        </div>

        {parseError && (
          <p className="mt-3 text-sm text-red-400">{parseError}</p>
        )}
      </div>

      {/* ── Preview ── */}
      {rows.length > 0 && (
        <div className="bg-[--surface] border border-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Preview — {rows.length} row{rows.length !== 1 ? "s" : ""} parsed
              {duplicateCount > 0 && (
                <span className="ml-2 text-yellow-500 font-normal normal-case">
                  · {duplicateCount} already imported
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {importError && (
                <span className="text-red-400 text-xs">{importError}</span>
              )}
              {importOk !== null && (
                <span className="text-green-400 text-xs">
                  {importOk} row{importOk !== 1 ? "s" : ""} imported ✓
                </span>
              )}
              <span className="text-xs text-gray-400">
                {selectedCount} selected · {fmtCurrency(totalAmount)}
              </span>
              <button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded transition-opacity"
              >
                {importing
                  ? "Importing…"
                  : `Import ${selectedCount} Row${selectedCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={rows
                        .filter((r) => !r.isDuplicate)
                        .every((r) => r.selected)}
                      ref={(el) => {
                        if (el) {
                          const selectable = rows.filter((r) => !r.isDuplicate);
                          el.indeterminate =
                            selectable.some((r) => r.selected) &&
                            !selectable.every((r) => r.selected);
                        }
                      }}
                      onChange={toggleAll}
                      className="accent-[var(--accent)]"
                    />
                  </th>
                  <th className="px-3 py-2 w-32">Date</th>
                  <th className="px-3 py-2 w-24">Type</th>
                  <th className="px-3 py-2">Memo</th>
                  <th className="px-3 py-2 text-right w-28">Amount</th>
                  <th className="px-3 py-2 w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {rows.map((row) => (
                  <tr
                    key={row._key}
                    onClick={() => !row.isDuplicate && toggleRow(row._key)}
                    className={`transition-colors ${
                      row.isDuplicate
                        ? "opacity-40 cursor-default"
                        : row.selected
                          ? "cursor-pointer hover:bg-white/[0.03]"
                          : "opacity-40 cursor-pointer hover:opacity-60"
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      {row.isDuplicate ? (
                        <span className="text-[10px] text-yellow-600 font-medium uppercase tracking-wide">
                          Dup
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row._key)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-[var(--accent)]"
                        />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-gray-300 whitespace-nowrap">
                      {row.date || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400">
                      {row.type || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-gray-200">
                      {[row.no, row.memo].filter(Boolean).join(" — ") || "—"}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right tabular-nums ${
                        parseFloat(row.amount.replace(/[$,]/g, "")) < 0
                          ? "text-red-400"
                          : "text-gray-200"
                      }`}
                    >
                      {row.amount || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400">
                      {row.status || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Previously Imported ── */}

      {rows.length === 0 && !parseError && (
        <p className="text-gray-500 italic text-sm">No file selected yet.</p>
      )}
    </div>
  );
}
