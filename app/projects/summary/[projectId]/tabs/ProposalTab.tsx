"use client";

import { useState } from "react";
import type {
  ProjectDetails,
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
} from "../page";
import { fmtCurrency } from "./shared";

export function ProposalTab({
  project,
  components,
  laborLines: allLaborLines,
  expenseLines: allExpenseLines,
  contingency,
}: {
  project: ProjectDetails;
  components: ComponentBudget[];
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  contingency: number;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [docNumber, setDocNumber] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [includedIds, setIncludedIds] = useState<Set<number>>(
    () => new Set(components.filter((c) => !c.is_closed).map((c) => c.id)),
  );

  function toggleIncluded(id: number) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rows = components
    .filter((c) => !c.is_closed)
    .map((c) => {
      const ll = allLaborLines.filter(
        (l) => l.component_id === c.id && !l.is_header,
      );
      const el = allExpenseLines.filter(
        (l) => l.component_id === c.id && !l.is_header,
      );
      const labor = ll.reduce(
        (s, l) => s + (Number(l.hours) || 0) * (Number(l.rate) || 0),
        0,
      );
      const expenses = el.reduce(
        (s, l) => s + (Number(l.cost) || 0) * (Number(l.multiplier) || 1),
        0,
      );
      const total = (labor + expenses) * (1 + contingency / 100);
      return { component: c, total };
    });

  const grandTotal = rows
    .filter((r) => includedIds.has(r.component.id))
    .reduce((s, r) => s + r.total, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls – hidden when printing */}
      <div className="print:hidden flex flex-wrap items-center gap-4 bg-[--surface] border border-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider">
            Client
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider">
            Document #
          </label>
          <input
            type="text"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            className="w-32 bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <label className="text-xs text-gray-400 uppercase tracking-wider">
            Description
          </label>
          <input
            type="text"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            className="flex-1 min-w-40 bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-2 text-sm bg-[var(--accent)] hover:opacity-90 text-white rounded transition-opacity"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Component include/exclude checkboxes */}
      <div className="print:hidden bg-[--surface] border border-gray-800 rounded-lg p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Include in Proposal
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {components
            .filter((c) => !c.is_closed)
            .map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={includedIds.has(c.id)}
                  onChange={() => toggleIncluded(c.id)}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
                {c.component_name}
              </label>
            ))}
        </div>
      </div>

      {/* ── Printable document ── */}
      <div
        id="proposal-print"
        className="bg-white text-black text-sm print:shadow-none shadow-lg rounded-lg mx-auto w-full max-w-4xl print:max-w-none print:rounded-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div className="px-10 py-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-3xl font-bold tracking-tight leading-none">
                Oxb<span className="font-normal">Ω</span>w
              </div>
              <div className="text-sm font-semibold tracking-wider">
                design<span className="mx-0.5">:</span>build
              </div>
              <div className="mt-3 text-2xl font-light tracking-wide">
                Proposal of Services
              </div>
            </div>
            <div className="text-right text-xs leading-relaxed">
              <div className="font-bold">
                Oxbow Design Build Cooperative, INC
              </div>
              <div>122 Pleasant St Ste 109</div>
              <div>Easthampton, MA 01027</div>
              <div>(413) 527-9000</div>
              <div>admin@oxbowdesignbuild.com</div>
              <div>www.oxbowdesignbuild.com</div>
            </div>
          </div>

          <hr className="border-gray-400 mb-5" />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-x-8 mb-8 text-sm">
            <div>
              <div className="font-bold underline mb-1">Date</div>
              <div>{today}</div>
            </div>
            <div>
              <div className="font-bold underline mb-1">Document #</div>
              <div className="print:hidden">
                {docNumber || <span className="text-gray-400 italic">—</span>}
              </div>
              <div className="hidden print:block">{docNumber}</div>
            </div>
            <div className="mt-4">
              <div className="font-bold underline mb-1">Client</div>
              <div>{clientName || "—"}</div>
            </div>
            <div className="mt-4">
              <div className="font-bold underline mb-1">Description</div>
              <div>{docDescription || "—"}</div>
            </div>
          </div>

          {/* Fixed Costs heading */}
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold underline inline-block">
              Fixed Costs
            </h2>
          </div>

          {/* Boilerplate */}
          <p className="text-xs leading-relaxed text-gray-600 mb-6">
            Fixed Costs are guaranteed once a deposit has been received and an
            agreement has been signed, unless the scope of services changes. If
            a service or product is not explicitly listed below in the itemized
            costs&apos; descriptions, it is not included in the price. Client
            will be notified of any changes in cost prior to them being
            incurred. If this document is more than 30 days old, the client
            should request an updated proposal.
          </p>

          {/* Component rows */}
          <div className="divide-y divide-gray-200">
            {rows
              .filter((r) => includedIds.has(r.component.id))
              .map(({ component: c, total }) => (
                <div key={c.id} className="py-4">
                  <div className="flex justify-between items-baseline">
                    <div className="font-bold text-base">
                      {c.component_name}
                    </div>
                    <div className="font-semibold text-base whitespace-nowrap ml-4">
                      {total > 0 ? fmtCurrency(total) : "$0.00"}
                    </div>
                  </div>
                  {c.description && (
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {c.description}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Total */}
          <div className="flex justify-end mt-6 pt-4 border-t-2 border-black">
            <div className="text-right">
              <div className="font-bold underline text-sm">
                TOTAL FIXED COSTS
              </div>
              <div className="font-bold text-lg mt-0.5">
                {fmtCurrency(grandTotal)}
              </div>
            </div>
          </div>

          {/* Acknowledgment */}
          <div className="mt-10 pt-6 border-t border-gray-300">
            <h3 className="text-center font-bold underline text-base mb-3">
              Acknowledgment of Intent to Proceed
            </h3>
            <p className="text-xs leading-relaxed text-gray-700">
              Agreement to this proposal represents the establishment of a scope
              of work to be executed by Oxbow Design Build for the Client, and
              the acknowledgment that further terms, such as specific
              deliverables, project timelines, a payment schedule, and a process
              for amending the scope of work can be established through further
              negotiation and the execution of subsequent agreements.
            </p>

            <div className="flex justify-between mt-12">
              <div className="w-1/2 pr-8">
                <div
                  className="border-b border-black mb-1"
                  style={{ height: "1.5rem" }}
                />
                <div className="font-bold text-sm">Client</div>
              </div>
              <div className="w-32">
                <div
                  className="border-b border-black mb-1"
                  style={{ height: "1.5rem" }}
                />
                <div className="font-bold text-sm">Date</div>
              </div>
            </div>

            <div className="text-center mt-8 font-bold text-sm">
              Thank you for considering our business.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
