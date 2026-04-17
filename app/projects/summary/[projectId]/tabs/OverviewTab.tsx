"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveClassRates } from "@/app/projects/actions/save-class-rates";
import { saveContractDetails } from "@/app/projects/actions/save-contract-details";
import type { ProjectDetails, TeamMember, ProjectClassRate } from "../page";
import { CLASS_RATES, LABOR_CLASSES, fmtCurrency } from "./shared";

const CONTRACT_TYPES = ["Billable Fixed", "Billable T&M"];

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "—",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
      <dt className="text-sm text-gray-400 text-right pr-4">{label}</dt>
      <dd>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
        />
      </dd>
    </div>
  );
}

function EditableSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
      <dt className="text-sm text-gray-400 text-right pr-4">{label}</dt>
      <dd>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-gray-900">
              {o}
            </option>
          ))}
        </select>
      </dd>
    </div>
  );
}

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
  const [ratesPending, startRatesTransition] = useTransition();

  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ratesSaveOk, setRatesSaveOk] = useState(false);
  const [ratesSaveError, setRatesSaveError] = useState<string | null>(null);

  // ── Contract fields ──────────────────────────────────────────────────────
  const [fields, setFields] = useState({
    client_name: project.client_name ?? "",
    client_email: project.client_email ?? "",
    client_phone: project.client_phone ?? "",
    client_address: project.client_address ?? "",
    description: project.description ?? "",
    architect_designer_info: project.architect_designer_info ?? "",
    commencement_date: project.commencement_date?.slice(0, 10) ?? "",
    substantial_completion: project.substantial_completion ?? "",
    drawings_reference: project.drawings_reference ?? "",
    default_contract_type: project.default_contract_type ?? "Billable Fixed",
    csl_holder: project.csl_holder ?? "",
    waste_disposal: project.waste_disposal ?? "",
    role_director: project.role_director ?? "",
    role_construction_pm: project.role_construction_pm ?? "",
    role_junior_pm: project.role_junior_pm ?? "",
    role_pm_assistant: project.role_pm_assistant ?? "",
    role_site_supervisor: project.role_site_supervisor ?? "",
    role_designer_name: project.role_designer_name ?? "",
    contract_total:
      project.contract_total != null ? String(project.contract_total) : "0",
    deposit_percent:
      project.deposit_percent != null ? String(project.deposit_percent) : "30",
    contract_signed: project.contract_signed?.slice(0, 10) ?? "",
  });

  function set(key: keyof typeof fields, val: string) {
    setSaveOk(false);
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  const contractTotal = parseFloat(fields.contract_total) || 0;
  const depositPct = parseFloat(fields.deposit_percent) || 0;
  const depositAmount = (contractTotal * depositPct) / 100;

  function handleSaveContract() {
    setSaveError(null);
    setSaveOk(false);
    startTransition(async () => {
      const result = await saveContractDetails(projectId, {
        client_name: fields.client_name || null,
        client_email: fields.client_email || null,
        client_phone: fields.client_phone || null,
        client_address: fields.client_address || null,
        description: fields.description || null,
        architect_designer_info: fields.architect_designer_info || null,
        commencement_date: fields.commencement_date || null,
        substantial_completion: fields.substantial_completion || null,
        drawings_reference: fields.drawings_reference || null,
        default_contract_type: fields.default_contract_type || "Billable Fixed",
        csl_holder: fields.csl_holder || null,
        waste_disposal: fields.waste_disposal || null,
        role_director: fields.role_director || null,
        role_construction_pm: fields.role_construction_pm || null,
        role_junior_pm: fields.role_junior_pm || null,
        role_pm_assistant: fields.role_pm_assistant || null,
        role_site_supervisor: fields.role_site_supervisor || null,
        role_designer_name: fields.role_designer_name || null,
        contract_total: parseFloat(fields.contract_total) || 0,
        deposit_percent: parseFloat(fields.deposit_percent) || 30,
        contract_signed: fields.contract_signed || null,
      });
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveOk(true);
        router.refresh();
      }
    });
  }

  // ── Class Rates ──────────────────────────────────────────────────────────
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
    setRatesSaveOk(false);
    setRates((prev) => ({ ...prev, [cls]: val }));
  }

  function handleSaveRates() {
    setRatesSaveError(null);
    setRatesSaveOk(false);
    const parsed: Record<string, number> = {};
    for (const [cls, val] of Object.entries(rates)) {
      const n = parseFloat(val);
      if (!isNaN(n)) parsed[cls] = n;
    }
    startRatesTransition(async () => {
      const result = await saveClassRates(projectId, parsed);
      if (result.error) {
        setRatesSaveError(result.error);
      } else {
        setRatesSaveOk(true);
        router.refresh();
      }
    });
  }

  const fieldClass =
    "w-full bg-black/20 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500";

  return (
    <div className="flex flex-col gap-6">
      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {saveOk && <span className="text-green-400 text-xs">Saved ✓</span>}
        {saveError && <span className="text-red-400 text-xs">{saveError}</span>}
        <button
          onClick={handleSaveContract}
          disabled={isPending}
          className="px-4 py-1.5 text-xs bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded transition-opacity"
        >
          {isPending ? "Saving…" : "Save Contract Info"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Info Needed for Contracts ─────────────────────────────── */}
        <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Info Needed for Contracts
          </h2>
          <dl className="divide-y divide-gray-800/50 text-sm">
            <EditableField
              label="Client Name"
              value={fields.client_name}
              onChange={(v) => set("client_name", v)}
            />
            <EditableField
              label="Client Email"
              value={fields.client_email}
              onChange={(v) => set("client_email", v)}
              type="email"
            />
            <EditableField
              label="Client Phone"
              value={fields.client_phone}
              onChange={(v) => set("client_phone", v)}
            />
            <EditableField
              label="Client Address"
              value={fields.client_address}
              onChange={(v) => set("client_address", v)}
            />
            <EditableField
              label="Project Description"
              value={fields.description}
              onChange={(v) => set("description", v)}
            />
            <EditableField
              label="Architect/Designer info (if not Oxbow)"
              value={fields.architect_designer_info}
              onChange={(v) => set("architect_designer_info", v)}
            />
            <EditableField
              label="Date of Commencement of Work"
              value={fields.commencement_date}
              onChange={(v) => set("commencement_date", v)}
              type="date"
            />
            <EditableField
              label="Substantial Completion (time frame)"
              value={fields.substantial_completion}
              onChange={(v) => set("substantial_completion", v)}
            />
            <EditableField
              label="Which drawings are we using?"
              value={fields.drawings_reference}
              onChange={(v) => set("drawings_reference", v)}
            />
            <EditableSelect
              label="Default Contract Type"
              value={fields.default_contract_type}
              options={CONTRACT_TYPES}
              onChange={(v) => set("default_contract_type", v)}
            />
          </dl>
        </div>

        {/* ── Right column: Permit + Misc ───────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Info for Permit(s) */}
          <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Info for Permit(s)
            </h2>
            <dl className="divide-y divide-gray-800/50 text-sm">
              <EditableField
                label="CSL holder"
                value={fields.csl_holder}
                onChange={(v) => set("csl_holder", v)}
              />
              <EditableField
                label="Waste disposal company/facility"
                value={fields.waste_disposal}
                onChange={(v) => set("waste_disposal", v)}
              />
            </dl>
          </div>

          {/* Miscellaneous Info */}
          <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Miscellaneous Info
            </h2>
            <dl className="divide-y divide-gray-800/50 text-sm">
              <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
                <dt className="text-sm text-gray-400 text-right pr-4">
                  Contract Total
                </dt>
                <dd>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={fields.contract_total}
                      onChange={(e) => set("contract_total", e.target.value)}
                      className={fieldClass + " text-right"}
                    />
                  </div>
                </dd>
              </div>
              <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
                <dt className="text-sm text-gray-400 text-right pr-4">
                  Deposit Percent
                </dt>
                <dd>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={fields.deposit_percent}
                      onChange={(e) => set("deposit_percent", e.target.value)}
                      className={fieldClass + " text-right"}
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </dd>
              </div>
              <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
                <dt className="text-sm text-gray-400 text-right pr-4">
                  Deposit Amount
                </dt>
                <dd className="text-sm text-gray-300 px-2">
                  {fmtCurrency(depositAmount)}
                </dd>
              </div>
              <div className="grid grid-cols-[200px_1fr] py-1.5 items-center">
                <dt className="text-sm text-gray-400 text-right pr-4">
                  Contract Signed
                </dt>
                <dd>
                  <input
                    type="date"
                    value={fields.contract_signed}
                    onChange={(e) => set("contract_signed", e.target.value)}
                    className={fieldClass + " text-gray-400"}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* ── Roles & Responsibilities ──────────────────────────────────── */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Roles &amp; Responsibilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
          <dl className="divide-y divide-gray-800/50 text-sm">
            <EditableField
              label="Director"
              value={fields.role_director}
              onChange={(v) => set("role_director", v)}
            />
            <EditableField
              label="Construction PM"
              value={fields.role_construction_pm}
              onChange={(v) => set("role_construction_pm", v)}
            />
          </dl>
          <dl className="divide-y divide-gray-800/50 text-sm">
            <EditableField
              label="Junior PM"
              value={fields.role_junior_pm}
              onChange={(v) => set("role_junior_pm", v)}
            />
            <EditableField
              label="PM Assistant"
              value={fields.role_pm_assistant}
              onChange={(v) => set("role_pm_assistant", v)}
            />
          </dl>
          <dl className="divide-y divide-gray-800/50 text-sm">
            <EditableField
              label="Site Supervisor"
              value={fields.role_site_supervisor}
              onChange={(v) => set("role_site_supervisor", v)}
            />
            <EditableField
              label="Designer"
              value={fields.role_designer_name}
              onChange={(v) => set("role_designer_name", v)}
            />
          </dl>
        </div>
      </div>

      {/* ── Class Rates ───────────────────────────────────────────────── */}
      <div className="bg-[--surface] p-6 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Labor Class Rates
          </h2>
          <div className="flex items-center gap-2">
            {ratesSaveOk && (
              <span className="text-green-400 text-xs">Saved ✓</span>
            )}
            {ratesSaveError && (
              <span className="text-red-400 text-xs">{ratesSaveError}</span>
            )}
            <button
              onClick={handleSaveRates}
              disabled={ratesPending}
              className="px-3 py-1.5 text-xs bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded transition-opacity"
            >
              {ratesPending ? "Saving…" : "Save Rates"}
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
