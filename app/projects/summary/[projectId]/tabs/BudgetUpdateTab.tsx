"use client";

import { useState, useTransition } from "react";
import type {
  ProjectDetails,
  ChangeOrderRow,
  BudgetUpdateSettings,
} from "../page";
import { saveBudgetUpdate } from "@/app/projects/actions/save-budget-update";

interface QBExpense {
  id: number;
  date: string | null;
  type: string | null;
  no: string | null;
  memo: string | null;
  amount: number | null;
  status: string | null;
  approved_by: string | null;
  imported_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface AiaGroup {
  description: string;
  amount: number;
}

interface ApprovedLine {
  description: string;
  amount: number;
}

function computeChangeOrderSections(rows: ChangeOrderRow[]): {
  aiaChangeOrders: AiaGroup[];
  approvedChanges: ApprovedLine[];
} {
  const aiaChangeOrders: AiaGroup[] = [];
  const approvedChanges: ApprovedLine[] = [];

  let inLockedGroup = false;
  let lockedGroupDesc = "";
  let lockedGroupSum = 0;

  for (const row of rows) {
    if (row.is_header) {
      if (inLockedGroup) {
        aiaChangeOrders.push({
          description: lockedGroupDesc,
          amount: lockedGroupSum,
        });
      }
      if (row.locked) {
        inLockedGroup = true;
        lockedGroupDesc = row.description ?? "";
        lockedGroupSum = 0;
      } else {
        inLockedGroup = false;
      }
    } else {
      if (row.locked) {
        lockedGroupSum += Number(row.amount) || 0;
      } else if (row.approved) {
        approvedChanges.push({
          description: row.description ?? "",
          amount: Number(row.amount) || 0,
        });
      }
    }
  }

  // Flush last locked group
  if (inLockedGroup) {
    aiaChangeOrders.push({
      description: lockedGroupDesc,
      amount: lockedGroupSum,
    });
  }

  return { aiaChangeOrders, approvedChanges };
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function invoiceLabel(e: QBExpense): string {
  const parts: string[] = [];
  if (e.no) parts.push(e.no);
  if (e.memo) parts.push(`(${e.memo})`);
  return parts.length ? parts.join(" ") : `Invoice ${e.id}`;
}

function _invoiceDate(e: QBExpense): string {
  const raw = e.date;
  if (!raw) return "";
  const dt = typeof raw === "string" ? new Date(raw) : (raw as Date);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  project: ProjectDetails;
  qbExpenses: QBExpense[];
  changeOrders: ChangeOrderRow[];
  budgetUpdateSettings: BudgetUpdateSettings;
  projectId: number;
  estimatesTotal?: number;
}

export function BudgetUpdateTab({
  project,
  qbExpenses,
  changeOrders,
  budgetUpdateSettings,
  projectId,
  estimatesTotal,
}: Props) {
  const [originalContract, setOriginalContract] = useState(
    budgetUpdateSettings.original_contract != null
      ? Number(budgetUpdateSettings.original_contract).toFixed(2)
      : estimatesTotal != null && estimatesTotal > 0
        ? estimatesTotal.toFixed(2)
        : "",
  );
  const [updateNumber, setUpdateNumber] = useState(
    budgetUpdateSettings.update_number ?? "",
  );
  const [updateTitle, setUpdateTitle] = useState(
    budgetUpdateSettings.update_title ?? "",
  );

  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ── Derive paid / unpaid invoices from QB data ──────────────────────────
  // Exclude $0 reconciliation entries (e.g. "August.Rec") by requiring amount > 0
  const invoices = qbExpenses
    .filter(
      (e) => e.type?.trim().toLowerCase() === "invoice" && Number(e.amount) > 0,
    )
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

  // Payments have negative amounts; match by absolute value (within $0.01 tolerance)
  const unusedPaymentAmounts = qbExpenses
    .filter((e) => e.type?.trim().toLowerCase() === "payment")
    .map((e) => Math.abs(Number(e.amount) || 0));

  const paidInvoices: typeof invoices = [];
  const unpaidInvoices: typeof invoices = [];

  for (const inv of invoices) {
    const amt = Number(inv.amount) || 0;
    const idx = unusedPaymentAmounts.findIndex((p) => Math.abs(p - amt) < 0.01);
    if (idx !== -1) {
      unusedPaymentAmounts.splice(idx, 1);
      paidInvoices.push(inv);
    } else {
      unpaidInvoices.push(inv);
    }
  }

  const originalContractNum = parseFloat(originalContract) || 0;
  const totalPaid = paidInvoices.reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0,
  );
  const totalUnpaid = unpaidInvoices.reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0,
  );

  const { aiaChangeOrders, approvedChanges } =
    computeChangeOrderSections(changeOrders);
  const totalAIA = aiaChangeOrders.reduce((s, r) => s + r.amount, 0);
  const totalApproved = approvedChanges.reduce((s, r) => s + r.amount, 0);
  const projectTotal = originalContractNum + totalAIA + totalApproved;

  const today = new Date().toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });

  function handleSave() {
    setSaveMsg(null);
    startTransition(async () => {
      const n = parseFloat(originalContract);
      const res = await saveBudgetUpdate(projectId, {
        original_contract: isNaN(n) ? null : n,
        update_number: updateNumber || null,
        update_title: updateTitle || null,
        paid_through_deposit_id: null,
      });
      setSaveMsg(res.error ? `Error: ${res.error}` : "Saved");
      setTimeout(() => setSaveMsg(null), 3000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Print CSS ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              #budget-update-doc, #budget-update-doc * { visibility: visible !important; }
              #budget-update-doc {
                position: fixed;
                inset: 0;
                padding: 28px 36px;
                background: white;
                overflow: visible;
              }
            }
          `,
        }}
      />

      {/* ── Controls (hidden in print) ── */}
      <div className="print:hidden bg-[--surface] border border-gray-800 rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Update #</label>
          <input
            value={updateNumber}
            onChange={(e) => setUpdateNumber(e.target.value)}
            placeholder="e.g. 25-002-606"
            className="bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-gray-400 w-36"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Period / Title
          </label>
          <input
            value={updateTitle}
            onChange={(e) => setUpdateTitle(e.target.value)}
            placeholder="e.g. February 2026"
            className="bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-gray-400 w-48"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Original Contract Amount
          </label>
          <div className="flex items-center gap-1">
            <input
              value={originalContract}
              onChange={(e) => setOriginalContract(e.target.value)}
              onBlur={(e) => {
                const n = parseFloat(e.target.value);
                if (!isNaN(n)) setOriginalContract(n.toFixed(2));
              }}
              placeholder="0.00"
              className="bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-gray-400 w-40 text-right"
            />
            {estimatesTotal != null && estimatesTotal > 0 && (
              <button
                type="button"
                title="Use estimate total"
                onClick={() => setOriginalContract(estimatesTotal.toFixed(2))}
                className="text-xs text-gray-500 hover:text-gray-300 px-1"
              >
                ↑ est.
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 text-xs bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded font-medium"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {saveMsg && (
            <span
              className={`text-xs ${saveMsg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
            >
              {saveMsg}
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── Printable Document ── */}
      <div
        id="budget-update-doc"
        className="bg-white text-gray-900 rounded-lg shadow-lg overflow-hidden"
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px" }}
      >
        {/* Document header */}
        <div className="flex justify-between items-start px-8 pt-6 pb-4 border-b-2 border-gray-800">
          <div>
            <div
              className="font-black leading-tight"
              style={{ fontSize: "20px" }}
            >
              Oxb<span style={{ fontFamily: "Georgia, serif" }}>ω</span>w
            </div>
            <div
              className="tracking-widest text-gray-600 mt-0.5"
              style={{ fontSize: "10px" }}
            >
              design · build
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: "16px" }}
            >
              Budget Update
            </div>
            {updateTitle && (
              <div className="text-gray-600 mt-0.5">{updateTitle}</div>
            )}
          </div>
          <div className="text-right leading-snug text-gray-700">
            <div className="font-bold text-gray-900">
              Oxbow Design Build Cooperative, INC
            </div>
            <div>122 Pleasant St Ste 109</div>
            <div>Easthampton, MA 01027</div>
            <div>(413) 527-9000</div>
            <div>admin@oxbowdesignbuild.com</div>
            <div>www.oxbowdesignbuild.com</div>
          </div>
        </div>

        {/* Project info */}
        <div className="grid grid-cols-2 px-8 py-3 border-b border-gray-300 gap-x-8">
          <div>
            <span className="font-semibold">Project:</span> {project.job_name}
            {project.legacy_id && (
              <span className="text-gray-500 ml-1">(#{project.legacy_id})</span>
            )}
          </div>
          <div className="text-right">
            <span className="font-semibold">Update #:</span> {updateNumber}
          </div>
          <div>
            {project.client_name && (
              <>
                <span className="font-semibold">Client:</span>{" "}
                {project.client_name}
              </>
            )}
          </div>
          <div className="text-right">
            <span className="font-semibold">Date:</span> {today}
          </div>
        </div>

        {/* ── Two-column content ── */}
        <div className="grid grid-cols-2 gap-8 px-8 py-6">
          {/* ── Left: Billing Summary ── */}
          <div>
            <h2
              className="text-center font-bold uppercase tracking-widest border-t border-b border-gray-800 py-1 mb-4"
              style={{ fontSize: "11px" }}
            >
              Billing Summary
            </h2>

            {/* Paid Invoices */}
            <table
              className="w-full mb-5"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="text-left font-semibold px-2 py-1 bg-gray-100"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    Paid Invoices
                  </th>
                </tr>
              </thead>
              <tbody>
                {paidInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="pl-4 py-1 italic text-gray-400"
                      style={{
                        borderLeft: "1px solid #d1d5db",
                        borderRight: "1px solid #d1d5db",
                      }}
                    >
                      None
                    </td>
                  </tr>
                ) : (
                  paidInvoices.map((e) => (
                    <tr key={e.id}>
                      <td
                        className="pl-4 py-0.5"
                        style={{
                          borderLeft: "1px solid #d1d5db",
                          borderRight: "1px solid #d1d5db",
                        }}
                      >
                        {invoiceLabel(e)}
                      </td>
                      <td
                        className="pr-2 py-0.5 text-right"
                        style={{ borderRight: "1px solid #d1d5db" }}
                      >
                        {fmtCurrency(Number(e.amount) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr
                  className="font-semibold"
                  style={{ borderTop: "2px solid #4b5563" }}
                >
                  <td className="py-1 px-2">Total Paid</td>
                  <td className="py-1 pr-2 text-right">
                    {fmtCurrency(totalPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Unpaid Invoices */}
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="text-left font-semibold px-2 py-1 bg-gray-100"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    Unpaid Invoices
                  </th>
                </tr>
              </thead>
              <tbody>
                {unpaidInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="pl-4 py-1 italic text-gray-400"
                      style={{
                        borderLeft: "1px solid #d1d5db",
                        borderRight: "1px solid #d1d5db",
                      }}
                    >
                      None
                    </td>
                  </tr>
                ) : (
                  unpaidInvoices.map((e) => (
                    <tr key={e.id}>
                      <td
                        className="pl-4 py-0.5"
                        style={{
                          borderLeft: "1px solid #d1d5db",
                          borderRight: "1px solid #d1d5db",
                        }}
                      >
                        {invoiceLabel(e)}
                      </td>
                      <td
                        className="pr-2 py-0.5 text-right"
                        style={{ borderRight: "1px solid #d1d5db" }}
                      >
                        {fmtCurrency(Number(e.amount) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr
                  className="font-semibold"
                  style={{ borderTop: "2px solid #4b5563" }}
                >
                  <td className="py-1 px-2">Total Unpaid</td>
                  <td className="py-1 pr-2 text-right">
                    {fmtCurrency(totalUnpaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Right: Project Summary ── */}
          <div>
            <h2
              className="text-center font-bold uppercase tracking-widest border-t border-b border-gray-800 py-1 mb-4"
              style={{ fontSize: "11px" }}
            >
              Project Summary
            </h2>

            {/* Original Contract */}
            <table
              className="w-full mb-5"
              style={{ borderCollapse: "collapse" }}
            >
              <tbody>
                <tr
                  className="font-semibold bg-gray-100"
                  style={{ border: "1px solid #d1d5db" }}
                >
                  <td className="px-2 py-1.5">Original Contract Amount</td>
                  <td className="pr-2 py-1.5 text-right">
                    {fmtCurrency(originalContractNum)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* AIA Change Orders */}
            {aiaChangeOrders.length > 0 && (
              <table
                className="w-full mb-5"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      className="text-left font-semibold px-2 py-1 bg-gray-100"
                      style={{ border: "1px solid #d1d5db" }}
                    >
                      AIA Change Orders
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aiaChangeOrders.map((co, i) => (
                    <tr key={i}>
                      <td
                        className="pl-4 py-0.5"
                        style={{
                          borderLeft: "1px solid #d1d5db",
                          borderRight: "1px solid #d1d5db",
                        }}
                      >
                        {co.description}
                      </td>
                      <td
                        className="pr-2 py-0.5 text-right"
                        style={{ borderRight: "1px solid #d1d5db" }}
                      >
                        {fmtCurrency(co.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    className="font-semibold"
                    style={{ borderTop: "2px solid #4b5563" }}
                  >
                    <td className="py-1 px-2">Total Changes</td>
                    <td className="py-1 pr-2 text-right">
                      {fmtCurrency(totalAIA)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* Approved Changes */}
            {approvedChanges.length > 0 && (
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      className="text-left font-semibold px-2 py-1 bg-gray-100"
                      style={{ border: "1px solid #d1d5db" }}
                    >
                      Approved Changes{" "}
                      <span className="font-normal text-gray-500">
                        (pending incorporation in AIA Change Order)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvedChanges.map((ch, i) => (
                    <tr key={i}>
                      <td
                        className="pl-4 py-0.5"
                        style={{
                          borderLeft: "1px solid #d1d5db",
                          borderRight: "1px solid #d1d5db",
                        }}
                      >
                        {ch.description}
                      </td>
                      <td
                        className="pr-2 py-0.5 text-right"
                        style={{ borderRight: "1px solid #d1d5db" }}
                      >
                        {fmtCurrency(ch.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    className="font-semibold"
                    style={{ borderTop: "2px solid #4b5563" }}
                  >
                    <td className="py-1 px-2">Total Changes</td>
                    <td className="py-1 pr-2 text-right">
                      {fmtCurrency(totalApproved)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* ── Bottom summary ── */}
        <div
          className="grid grid-cols-2 gap-8 px-8 pb-6 pt-4"
          style={{ borderTop: "1px dashed #9ca3af" }}
        >
          {/* Billing totals */}
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  colSpan={2}
                  className="text-left font-bold px-2 py-1 bg-gray-200"
                  style={{ border: "1px solid #9ca3af" }}
                >
                  Billing Summary
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className="px-2 py-0.5"
                  style={{
                    borderLeft: "1px solid #d1d5db",
                    borderRight: "1px solid #d1d5db",
                  }}
                >
                  Total Paid
                </td>
                <td
                  className="pr-2 py-0.5 text-right"
                  style={{ borderRight: "1px solid #d1d5db" }}
                >
                  {fmtCurrency(totalPaid)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 py-0.5"
                  style={{
                    borderLeft: "1px solid #d1d5db",
                    borderRight: "1px solid #d1d5db",
                  }}
                >
                  Total Unpaid
                </td>
                <td
                  className="pr-2 py-0.5 text-right"
                  style={{ borderRight: "1px solid #d1d5db" }}
                >
                  {fmtCurrency(totalUnpaid)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr
                className="font-bold bg-gray-100"
                style={{ borderTop: "2px solid #1f2937" }}
              >
                <td className="px-2 py-1">Project Total</td>
                <td className="pr-2 py-1 text-right">
                  {fmtCurrency(totalPaid + totalUnpaid)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Project totals */}
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  colSpan={2}
                  className="text-left font-bold px-2 py-1 bg-gray-200"
                  style={{ border: "1px solid #9ca3af" }}
                >
                  Project Summary
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  className="px-2 py-0.5"
                  style={{
                    borderLeft: "1px solid #d1d5db",
                    borderRight: "1px solid #d1d5db",
                  }}
                >
                  Original Contract Amount
                </td>
                <td
                  className="pr-2 py-0.5 text-right"
                  style={{ borderRight: "1px solid #d1d5db" }}
                >
                  {fmtCurrency(originalContractNum)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 py-0.5"
                  style={{
                    borderLeft: "1px solid #d1d5db",
                    borderRight: "1px solid #d1d5db",
                  }}
                >
                  AIA Change Orders
                </td>
                <td
                  className="pr-2 py-0.5 text-right"
                  style={{ borderRight: "1px solid #d1d5db" }}
                >
                  {fmtCurrency(totalAIA)}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 py-0.5"
                  style={{
                    borderLeft: "1px solid #d1d5db",
                    borderRight: "1px solid #d1d5db",
                  }}
                >
                  Approved Changes
                </td>
                <td
                  className="pr-2 py-0.5 text-right"
                  style={{ borderRight: "1px solid #d1d5db" }}
                >
                  {fmtCurrency(totalApproved)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr
                className="font-bold bg-gray-100"
                style={{ borderTop: "2px solid #1f2937" }}
              >
                <td className="px-2 py-1">Project Total</td>
                <td className="pr-2 py-1 text-right">
                  {fmtCurrency(projectTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
