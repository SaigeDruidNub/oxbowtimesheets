"use client";

import { useState, useEffect } from "react";
import { approveTimesheet } from "@/app/projects/actions/approve-timesheet";

interface Component {
  id: number;
  component_name: string;
}

interface TimesheetRowProps {
  entry: any; // Using any for simplicity with the db result structure, define proper interface if needed
  components: Component[];
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
}

export default function UnapprovedTimesheetRow({
  entry,
  components,
  isSelected,
  onSelect,
}: TimesheetRowProps) {
  const [loading, setLoading] = useState(false);
  const [componentId, setComponentId] = useState<number | null>(
    entry.component_id || null,
  );

  useEffect(() => {
    setComponentId(entry.component_id || null);
  }, [entry.component_id]);

  // Function to handle component changes only
  const handleComponentChange = async (newComponentId: number | null) => {
    setLoading(true);
    setComponentId(newComponentId);

    // Call approveTimesheet with approved=false so it only updates fields but doesn't approve it
    const result = await approveTimesheet(entry.log_id, newComponentId, false);

    if (!result.success) {
      console.error("Failed to update timesheet component");
    }
    setLoading(false);
  };

  return (
    <tr
      key={entry.log_id}
      className={`border-b border-gray-800 last:border-0 transition-colors ${isSelected ? "bg-[var(--accent)]/10" : "hover:bg-[var(--accent)]/5"}`}
    >
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="form-checkbox h-4 w-4 text-[var(--accent)] rounded border-[var(--muted)] bg-[var(--background)] focus:ring-offset-[var(--surface)] cursor-pointer"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[var(--foreground)]">
        {new Date(entry.date).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[var(--foreground)]">
        {entry.employee_first} {entry.employee_last}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[var(--foreground)]">
        {entry.task_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={componentId || ""}
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            handleComponentChange(val);
          }}
          disabled={loading}
          className="bg-[var(--background)] border border-[var(--muted)] text-[var(--foreground)] text-xs rounded px-2 py-1 max-w-[150px] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
        >
          <option value="">No Component</option>
          {components.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.component_name}
            </option>
          ))}
        </select>
      </td>
      <td
        className="px-6 py-4 text-[var(--muted)] text-xs max-w-xs truncate"
        title={entry.notes}
      >
        {entry.notes}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap text-[var(--foreground)] font-mono">
        {entry.hours?.toFixed(2)}
      </td>
    </tr>
  );
}
