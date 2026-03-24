"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: any;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] min-h-screen font-sans">
      <Header
        user={user}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)] relative">
        <div className="flex-1 p-4 md:p-10">{children}</div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar (Dropdown) */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-0 left-0 w-full bg-[var(--background)] border-b border-[var(--muted)]/20 shadow-lg z-40 p-4 max-h-[80vh] overflow-y-auto">
            <Sidebar />
          </div>
        )}
      </div>
    </div>
  );
}
