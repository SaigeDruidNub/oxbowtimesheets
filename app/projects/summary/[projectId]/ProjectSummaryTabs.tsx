"use client";

import { useState } from "react";
import type {
  ProjectDetails,
  TeamMember,
  LaborEntry,
  ComponentBudget,
  ComponentLaborLine,
  ComponentExpenseLine,
  TaskOption,
  EstimateRow,
  DepositRow,
  UpdateRow,
  ProjectClassRate,
} from "./page";
import { OverviewTab } from "./tabs/OverviewTab";
import { LaborTab } from "./tabs/LaborTab";
import { ComponentsTab } from "./tabs/ComponentsTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { EstimatesTab } from "./tabs/EstimatesTab";
import { ProposalTab } from "./tabs/ProposalTab";
import { UpdatesTab } from "./tabs/UpdatesTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "labor", label: "Labor" },
  { id: "components", label: "Components" },
  { id: "budget", label: "Budget" },
  { id: "estimates", label: "Estimates" },
  { id: "proposal", label: "Proposal" },
  { id: "updates", label: "Updates" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  project: ProjectDetails;
  team: TeamMember[];
  labor: LaborEntry[];
  components: ComponentBudget[];
  estimates: EstimateRow[];
  deposits: DepositRow[];
  updates: UpdateRow[];
  projectId: number;
  laborLines: ComponentLaborLine[];
  expenseLines: ComponentExpenseLine[];
  tasks: TaskOption[];
  classRates: ProjectClassRate[];
}

export default function ProjectSummaryTabs({
  project,
  team,
  labor,
  components,
  estimates,
  deposits,
  updates,
  projectId,
  laborLines,
  expenseLines,
  tasks,
  classRates,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [contingency, setContingency] = useState(10);

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-800 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          project={project}
          team={team}
          projectId={projectId}
          initialRates={classRates}
        />
      )}
      {activeTab === "labor" && <LaborTab labor={labor} />}
      {activeTab === "components" && (
        <ComponentsTab
          projectId={projectId}
          components={components}
          labor={labor}
          laborLines={laborLines}
          expenseLines={expenseLines}
          tasks={tasks}
          classRates={classRates}
        />
      )}
      {activeTab === "budget" && <BudgetTab components={components} />}
      {activeTab === "estimates" && (
        <EstimatesTab
          components={components}
          laborLines={laborLines}
          expenseLines={expenseLines}
          contingency={contingency}
          setContingency={setContingency}
        />
      )}
      {activeTab === "proposal" && (
        <ProposalTab
          project={project}
          components={components}
          laborLines={laborLines}
          expenseLines={expenseLines}
          contingency={contingency}
        />
      )}
      {activeTab === "updates" && <UpdatesTab updates={updates} />}
    </div>
  );
}
