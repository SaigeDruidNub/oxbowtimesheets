import type { UpdateRow } from "../page";
import { fmtDate } from "./shared";

export function UpdatesTab({ updates }: { updates: UpdateRow[] }) {
  if (updates.length === 0) {
    return <p className="text-gray-500 italic text-sm">No updates recorded.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {updates.map((u) => (
        <div
          key={u.id}
          className="bg-[--surface] border border-gray-800 rounded-lg px-4 py-3 flex gap-4"
        >
          <div className="text-gray-500 text-sm whitespace-nowrap pt-0.5">
            {fmtDate(u.date)}
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed">{u.text}</p>
            <p className="text-xs text-gray-500 mt-1">
              {u.author_first} {u.author_last}
              {u.is_manager_update ? " · Manager update" : ""}
              {u.auto_entry ? " · Auto" : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
