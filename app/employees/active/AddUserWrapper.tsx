"use client";

import { useState } from "react";
import AddEmployeeModal from "./AddEmployeeModal";

export default function AddUserWrapper() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-[var(--surface)] hover:brightness-110 text-[var(--foreground)] px-4 py-2 rounded border border-[var(--muted)] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap"
      >
        <span className="hidden sm:inline">Add New User</span>
        <span className="sm:hidden">Add +</span>
      </button>

      {isModalOpen && (
        <AddEmployeeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
