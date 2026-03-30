"use client";

import { useState } from "react";
import { saveOwnerDoc, saveWorkerDoc } from "../actions/save-documents";

interface Props {
  ownerHtml: string;
  workerHtml: string;
  isOwner: boolean;
}

function DocEditor({
  label,
  initialHtml,
  onSave,
}: {
  label: string;
  initialHtml: string;
  onSave: (html: string) => Promise<{ success?: boolean; error?: string }>;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const result = await onSave(html);
    setSaving(false);
    setStatus(result.error ? `Error: ${result.error}` : "Saved successfully.");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <h2 className="text-lg font-semibold text-gray-200 uppercase tracking-wider text-xs">
          {label}
        </h2>
        <div className="flex items-center gap-3">
          {status && (
            <span
              className={`text-xs ${status.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
            >
              {status}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white bg-[#0a6481] hover:bg-[#084e66] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            HTML Source
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={24}
            className="w-full px-3 py-2 bg-[var(--background)] border border-gray-700 text-[var(--foreground)] text-sm font-mono rounded focus:outline-none focus:border-[var(--accent)] resize-y"
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Preview
          </div>
          <div
            className="border border-gray-700 rounded px-3 py-2 min-h-[24rem] overflow-y-auto bg-[var(--background)]"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ lineHeight: 1.6 }}
          />
        </div>
      </div>
    </section>
  );
}

export default function DocumentEditor({
  ownerHtml,
  workerHtml,
  isOwner,
}: Props) {
  return (
    <div className="space-y-10">
      {isOwner && (
        <DocEditor
          label="Member Owner Documents"
          initialHtml={ownerHtml}
          onSave={saveOwnerDoc}
        />
      )}
      <DocEditor
        label="Worker Documents"
        initialHtml={workerHtml}
        onSave={saveWorkerDoc}
      />
    </div>
  );
}
